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
    .usage('node $0 "<niche keyword>" [--region "Wisconsin"] [--limit 80]')
    .demandCommand()
    .option('region', { type:'string', default:'' })
    .option('limit', { type:'number', default:80 })
    .help().argv;

const NICHE = argv._[0];
const REGION = argv.region;
const LIMIT = argv.limit;

(async function main(){
    fs.mkdirSync(path.join(__dirname,'..','out','outreach'), { recursive:true });

    //build some queries - legacy approach
    // const base = [
    //     `${NICHE} "home page" -site:yelp.com -site:facebook.com -site:wordpress.com -site:wix.com -site:squarespace.com filetype:html`,
    //     `"${NICHE}" "welcome to our website" -site:facebook.com -site:wordpress.com -site:wix.com filetype:html`,
    //     `"${NICHE}" inurl:index.html -site:wixsite.com -site:wordpress.com -site:squarespace.com`,
    // ];
    // if (REGION) base.push(`"${NICHE}" "${REGION}" "home page" -site:facebook.com -site:wordpress.com -site:wix.com filetype:html`);

const base = [];

    // Natural language queries that find actual businesses
    if (REGION) {
        base.push(
            `small local ${NICHE} business in ${REGION}`,
            `family owned ${NICHE} services ${REGION}`,
            `${NICHE} near me ${REGION} phone number`,
            `independent ${NICHE} ${REGION} reviews`
        );
    } else {
        base.push(
            `small local ${NICHE} business`,
            `family owned ${NICHE} services`,
            `independent ${NICHE} company phone number`,
            `local ${NICHE} reviews testimonials`
        );
    }

    // Add one technical query to catch old sites
    base.push(`${NICHE} -site:yelp.com -site:facebook.com -site:thumbtack.com -site:angi.com`);
    //end new natural language query


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
    const domains = uniqueDomains(hits).slice(0, LIMIT);

    //pull content
    console.log(`\n Fetching content for ${domains.length} domains..`);
    console.log('Domains:', domains.map(d => d.url).slice(0, 5)); //show first 5

    let contents =[];
    try {
        contents = await youContents(domains.map(d => d.url));
        console.log(`Got content for ${contents.length} pages`);
   } catch (error) {
    console.error('Failed to fetch contents:', error.message);
    contents = [];
   }

   if (!Array.isArray(contents)) {
    console.error('Contents is not an array:', typeof contents);
    contents = []
   }

    const rows = [];
    for (const doc of contents) {
        const domain = safeDomain(doc.url);
        if (!domain) continue;
        const httpOnly = isHttpUrl(doc.url);

        const $ = load(doc.html);
        const cms = detectCMS(doc.html || '');
        if (cms !== 'unknown') continue; //skip website builders

        const contact = detectContactSignals($);
        const legacy = detectLegacy(doc.html || '', $);

        const crust = computeCrust({legacy, httpOnly});
        const cscore = contactWeak(contact);
        const urg = urgency({ crust, contactScore: cscore, cms });

        if (urg < 40) continue; //not crappy enough

        const title = $('title').first().text().trim() || domain;
        rows.push({
            domain, url: doc.url, title, cms, crust, contactScore: cscore, urgency: urg,
            flags: Object.entries(legacy).filter(([k,v]) => !!v).map(([k])=>k).join('|'),
            hasContact: !!(contact.hasContactPath || contact.hasContactWord || contact.hasMailto || contact.hasTel)
        });

        //write an email
        const draft = outreach({ domain, title, crust, cscore, httpOnly, contact, niche:NICHE, region:REGION});
        const outPath = path.join(__dirname,'..','out','outreach', `${domain}.txt`);
        fs.writeFileSync(outPath, draft, 'utf8');
    }

    //rank and write
    rows.sort((a,b)=> b.urgency - a.urgency);
    const outDir = path.join(__dirname,'..','out');
    fs.writeFileSync(path.join(outDir,'prospects.json'), JSON.stringify(rows, null))
    await writeCSV(path.join(outDir,'prospects.csv'), rows);

    console.log(`\nFound ${rows.length} promising hand-rolled sites.`);
    console.log(`->out/prospects.csv, out/prospects.json, out/outreach/*.txt\n`);
})().catch(e => {
    console.error(e);
    process.exit(1);
});

function safeDomain(u) {
    try { return new URL(u).hostname.replace(/^www\./,''); } catch { return null; }

}
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

function outreach({ domain, title, crusrt, cscore, httpOnly, contact, niche, region }) {
    const bits = [];
    if (httpOnly) bits.push('no HTTPS');
    if (cscore >= 60) bits.push('no clear Contact link');
    const flagLine = bits.length ? `I noticed ${bits.join(' and ')}.` : `I noticed a few quick fixes that could help.`;
    const loc = region ? ` in ${region}` : '';
    return [
        `Subject: Quick modern refresh for ${domain}`,
        ``,
        `Hi there - I came across ${title || domain}${loc}. ${flagLine}`,
        `I build ultra-fast, mobile-friendly sites for lcoal ${niche}-with tap-to-call, a simple contact form, map & hours.`,
        `If you're interested, I'll spin up a free live preview using my minimal templateso you can click around before deciding.`,
        `Thanks!`,
        `--Jake Roder`,
    ].join('\n');
}

async function writeCSV(filePath, rows) {
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