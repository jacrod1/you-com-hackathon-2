export function detectCMS(html='') {
    const lower = html.toLowerCase();
    if (lower.includes('wp-content') || lower.includes('wp-json') || lower.includes('name="generator" content="wordpress"')) return 'wordpress';
    if (lower.includes('static.parastorage.com') || lower.includes('wixstatic')) return 'wix';
    if (lower.includes('static.squarespace.com') || lower.includes('sqs-')) return 'squarespace';
    if (lower.includes('weeblycloud') || lower.includes('weebly.com')) return 'weebly';
    if (lower.includes('shopify') && lower.includes('cdn.shopify.com')) return 'shopify';
    
    // Catch common site builders
    if (lower.includes('weblium')) return 'weblium';
    if (lower.includes('webflow')) return 'webflow';
    if (lower.includes('godaddy')) return 'godaddy';
    if (lower.includes('duda')) return 'duda';
    if (lower.includes('elementor')) return 'elementor';
    if (lower.includes('hubspot')) return 'hubspot';
    if (lower.includes('site123') || lower.includes('jimdo')) return 'sitebuilder';
    
    // Generic check for any builder in generator tag
    const generatorMatch = lower.match(/name="generator"\s+content="([^"]+)"/);
    if (generatorMatch) {
        const generator = generatorMatch[1];
        // If generator mentions common builder keywords, flag it
        if (/builder|cms|platform|create|website maker/i.test(generator)) {
            return 'sitebuilder';
        }
    }
    
    return 'unknown';
}

export function detectContactSignals($) {
    const anchors = $('a').map((_,a)=>$(a).text().toLowerCase().trim()).get();
    const hrefs = $('a').map((_,a)=>($(a).attr('href')||'').toLowerCase().trim()).get();
    
    const hasContactWord = anchors.some(t => /\bcontact\b/i.test(t));
    const hasContactPath = hrefs.some(h => /\/contact(\/|\.|$)/i.test(h));
    const hasMailto = hrefs.some(h => h.startsWith('mailto:'));
    const hasTel = hrefs.some(h => h.startsWith('tel:'));
    
    return { 
        hasContactWord, 
        hasContactPath, 
        hasMailto, 
        hasTel
    };
}

export function detectLegacy(html='', $) {
    const lower = html.toLowerCase();
    const fontTag = /<\s*font\b/i.test(lower);
    const center = /<\s*center\b/i.test(lower);
    const marquee = /<\s*marquee\b/i.test(lower);
    const lotsOfInlineStyle = (lower.match(/style="/g)||[]).length > 50;
    const manyTables = $('table').length >= 2 && $('td').length >= 10;
    const viewportMissing = $('meta[name="viewport"]').length === 0;
    
    // Check in HTML string directly as fallback for reliability
    const hasOgInHtml = /property=["']og:/i.test(html);
    const hasDescInHtml = /name=["']description["']/i.test(html);
    const ogMissing = !hasOgInHtml && !hasDescInHtml;
    
    const imgNoAlt = $('img').filter((_,i)=>!$(i).attr('alt') || $(i).attr('alt').trim()==='').length;
    
    // Additional legacy signals
    const noCharset = $('meta[charset]').length === 0 && !lower.includes('charset=');
    const oldDoctype = /<!doctype html public/i.test(html);
    const framesetOrFrames = /<\s*(frameset|frame)\b/i.test(lower);
    const flash = /\.swf\b|flash/i.test(lower);
    
    return { 
        fontTag, 
        center, 
        marquee, 
        lotsOfInlineStyle, 
        manyTables, 
        viewportMissing, 
        ogMissing, 
        imgNoAlt,
        noCharset, 
        oldDoctype, 
        framesetOrFrames, 
        flash
    };
}