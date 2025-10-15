import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { youSearch, youContents} from './you.js';
import { uniqueDomains, load, isHttpUrl, toSlug } from './util.js';
import { detectCMS, detectContactSignals, detectLegacy } from './detector.js';
import { computeCrust, contactWeak, urgency } from './score.js';
import { stringify } from 'csv-stringify';
import { hasUncaughtExceptionCaptureCallback } from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const argv = yargs(hideBin(process.argv))
    .usage('node $0 "<niche keyword>" [--region "Wisconsin"] [--limit 150]')
    .demandCommand()
    .option('region', { type:'string', default:'' })
    .option('limit', { type:'number', default:80 })
    .help().argv;

const NICHE = argv._[0];
const REGION = argv.region;
const LIMIT = argv.limit;

// Add this function after the imports, before main()
function isAggregator(url) {
    const aggregators = [
        'yelp.com',
        'facebook.com',
        'thumbtack.com',
        'angi.com',
        'angieslist.com',
        'homeadvisor.com',
        'houzz.com',
        'bbb.org',
        'yellowpages.com',
        'superpages.com',
        'manta.com',
        'expertise.com',
        'zoominfo.com',
        'indeed.com',
        'linkedin.com',
        'glassdoor.com',
        'mapquest.com',
        'foursquare.com',
        'nextdoor.com',
        'porch.com',
        'bark.com',
        'trustpilot.com',
        'google.com',
        'bing.com',
        'craigslist.org',
        'reddit.com',
        'youtube.com',
        'instagram.com',
        'twitter.com',
        'pinterest.com',
        'amazon.com',
        'ebay.com',
        'wikipedia.org',
        'apple.com/maps',
        'tripadvisor.com',
        'urbanspoon.com',
        'opentable.com'
    ];
    
    try {
        const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
        return aggregators.some(agg => hostname.includes(agg));
    } catch {
        return false;
    }
}

(async function main(){
    fs.mkdirSync(path.join(__dirname,'..','out','outreach'), { recursive:true });
    fs.mkdirSync(path.join(__dirname,'..','out','html'), { recursive:true });  // 🆕 Create html directory

    // Natural language queries that find actual businesses
    const base = [];

    if (REGION) {
        base.push(
            `small local ${NICHE} business in ${REGION}`,
            `family owned ${NICHE} services ${REGION}`,
            `${NICHE} near me ${REGION} phone number`,
            `independent ${NICHE} ${REGION} reviews`,
            `${REGION} ${NICHE} emergency service`,
            `best ${NICHE} in ${REGION}`,
            `affordable ${NICHE} ${REGION}`,
            `${NICHE} company ${REGION} hours`,
            `${REGION} area ${NICHE} local`,
            `trusted ${NICHE} ${REGION}`
        );
    } else {
        base.push(
            `small local ${NICHE} business`,
            `family owned ${NICHE} services`,
            `independent ${NICHE} company phone number`,
            `local ${NICHE} reviews testimonials`,
            `${NICHE} emergency service near me`,
            `affordable ${NICHE} company`,
            `trusted local ${NICHE}`,
            `${NICHE} business hours location`
        );
    }

    // Technical query to catch old sites
    base.push(`${NICHE} -site:yelp.com -site:facebook.com -site:thumbtack.com -site:angi.com -site:homeadvisor.com`);

    console.log('\n - Running you.com queries:\n');
    base.forEach((q, i) => console.log(`${i + 1}. ${q}`));
    console.log('');

    //search and dedupe
    const hits = [];
    for (const q of base) {
        const r = await youSearch(q, Math.ceil(LIMIT / base.length));
        hits.push(...r.map(x => x.url));
        await sleep(250); //gentle against the API
    }

    //filter out aggregators before deduping
    const filtered = hits.filter(url => {
        if (isAggregator(url)) {
            console.log(`Filtering aggregator: ${url}`);
            return false;
        }
        return true;
    })

    const domains = uniqueDomains(filtered).slice(0, LIMIT);

    //pull content
    console.log(`\n📥 Fetching content for ${domains.length} domains...`);
    console.log('Domains:', domains.map(d => d.url).slice(0, 5)); //show first 5

    let contents = [];
    try {
        contents = await youContents(domains.map(d => d.url));
        console.log(`✅ Got content for ${contents.length} pages`);
    } catch (error) {
        console.error('❌ Failed to fetch contents:', error.message);
        contents = [];
    }

    if (!Array.isArray(contents)) {
        console.error('⚠️ Contents is not an array:', typeof contents);
        contents = [];
    }

    // 🆕 Save HTML content for review
    console.log(`\n💾 Saving HTML content for ${contents.length} pages...`);
    const htmlDir = path.join(__dirname, '..', 'out', 'html');

    const rows = [];
    for (const doc of contents) {
        const domain = safeDomain(doc.url);
        if (!domain) continue;
        
        const httpOnly = isHttpUrl(doc.url);
        const $ = load(doc.html);
        const cms = detectCMS(doc.html || '');
        const contact = detectContactSignals($);
        const legacy = detectLegacy(doc.html || '', $);
        const crust = computeCrust({legacy, httpOnly});
        const cscore = contactWeak(contact);
        const urg = urgency({ crust, contactScore: cscore, cms });
        const title = $('title').first().text().trim() || domain;

        // 🆕 Save the raw HTML with analysis metadata
        const htmlPath = path.join(htmlDir, `${domain.replace(/\./g, '_')}.html`);
        const analysis = `<!--
URL: ${doc.url}
Domain: ${domain}
Title: ${title}
CMS Detected: ${cms}
HTTP Only: ${httpOnly}
Crust Score: ${crust}
Contact Score: ${cscore}
Urgency Score: ${urg}
Legacy Flags: ${Object.entries(legacy).filter(([k,v]) => !!v).map(([k])=>k).join(', ')}
Contact Signals: hasContactWord=${contact.hasContactWord}, hasContactPath=${contact.hasContactPath}, hasMailto=${contact.hasMailto}, hasTel=${contact.hasTel}
-->

${doc.html || ''}`;
        fs.writeFileSync(htmlPath, analysis, 'utf8');

        if (cms !== 'unknown') {
            console.log(`⏭️  Skipping ${domain} - CMS: ${cms}`);
            continue;
        }

        if (urg < 40) {
            console.log(`⏭️  Skipping ${domain} - urgency too low: ${urg}`);
            continue;
        }

        console.log(`✅ ${domain} - urgency: ${urg}, contact: ${cscore}, crust: ${crust}`);
        
        rows.push({
            domain, url: doc.url, title, cms, crust, contactScore: cscore, urgency: urg,
            flags: Object.entries(legacy).filter(([k,v]) => !!v).map(([k])=>k).join('|'),
            hasContact: !!(contact.hasContactPath || contact.hasContactWord || contact.hasMailto || contact.hasTel)
        });

        // write an email
        const draft = outreach({ domain, title, crust, cscore: cscore, httpOnly, contact, niche:NICHE, region:REGION});
        const outPath = path.join(__dirname,'..','out','outreach', `${domain}.txt`);
        fs.writeFileSync(outPath, draft, 'utf8');
    }

    //rank and write
    rows.sort((a,b)=> b.urgency - a.urgency);
    const outDir = path.join(__dirname,'..','out');
    fs.writeFileSync(path.join(outDir,'prospects.json'), JSON.stringify(rows, null, 2));
    await writeCSV(path.join(outDir,'prospects.csv'), rows);

    console.log(`\n✅ Found ${rows.length} promising hand-rolled sites.`);
    console.log(`📂 Outputs:`);
    console.log(`   - out/prospects.csv (ranked list)`);
    console.log(`   - out/prospects.json (structured data)`);
    console.log(`   - out/outreach/*.txt (email drafts)`);
    console.log(`   - out/html/*.html (saved pages with analysis)\n`);
})().catch(e => {
    console.error(e);
    process.exit(1);
});

function safeDomain(u) {
    try { return new URL(u).hostname.replace(/^www\./,''); } catch { return null; }
}

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

function outreach({ domain, title, crust, cscore, httpOnly, contact, niche, region }) {
    const bits = [];
    if (httpOnly) bits.push('no HTTPS');
    if (cscore >= 60) bits.push('no clear Contact link');
    const flagLine = bits.length ? `I noticed ${bits.join(' and ')}.` : `I noticed a few quick fixes that could help.`;
    const loc = region ? ` in ${region}` : '';
    return [
        `Subject: Quick modern refresh for ${domain}`,
        ``,
        `Hi there - I came across ${title || domain}${loc}. ${flagLine}`,
        `I build ultra-fast, mobile-friendly sites for local ${niche} - with tap-to-call, a simple contact form, map & hours.`,
        `If you're interested, I'll spin up a free live preview using my minimal templates so you can click around before deciding.`,
        `Thanks!`,
        `--Jake Roder`,
    ].join('\n');
}

async function writeCSV(filePath, rows) {
    if (rows.length === 0) {
        console.warn('⚠️ No rows to write to CSV');
        return;
    }
    
    return new Promise((resolve, reject) => {
        const stringifier = stringify({
            header: true,
            columns: Object.keys(rows[0] || {})
        });

        const writable = fs.createWriteStream(filePath);
        stringifier.on('error', reject);
        writable.on('error', reject);
        writable.on('finish', resolve);

        rows.forEach(r => stringifier.write(r));
        stringifier.end();
        stringifier.pipe(writable);
    });
}