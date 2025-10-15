export function detectCMS(html='') {
    const lower = html.toLowerCase();
    if (lower.includes('wp-content') || lower.includes('wp-json') || lower.includes('name="generator" content="wordpress"')) return 'wordpress';
    if (lower.includes('static.parastorage.com') || lower.includes('wixstatic')) return 'wix';
    if (lower.includes('static.squarespace.com') || lower.includes('sqs-')) return 'squarespace';
    if (lower.includes('weeblycloud') || lower.includes('weebly.com')) return 'weebly';
    if (lower.includes('shopify') && lower.includes('cdn.shopify.com')) return 'shopify';
    return 'unknown';
}

export function detectContactSignals($) {
    const anchors = $('a').map((_,a)=>$(a).text().toLowerCase().trim()).get();
    const hrefs = $('a').map((_,a)=>$(a).attr('href')||'').get();
    const hasContactWord = anchors.some(t => /\bcontact\b/.test(t));
    const hasContactPath = hrefs.some(h => /\/contact(\/|\.|$)/i.test(h));
    const hasMailto = hrefs.some(h => /^mailto:/i.test(h));
    const hasTel = hrefs.some(h => /^tel:/i.test(h));
    return { hasContactWord, hasContactPath, hasMailto, hasTel};
}

export function detectLegacy(html='', $) {
    const lower = html.toLowerCase();
    const fontTag = /<\s*font\b/i.test(lower);
    const center = /<\s*center\b/i.test(lower);
    const marquee = /<\s*marquee\b/i.test(lower);
    const lotsOfInlineStyle = (lower.match(/style="/g)||[]).length > 20;
    const manyTables = $('table').length >= 4 && $('td').length >=20;
    const viewportMissing = $('meta[name="viewport"]').length === 0;
    const ogMissing = $('meta[property^="og:"]').length === 0 && $('meta[name="description"]').length === 0;
    const imgNoAlt = $('img').filter((_,i)=>!$(i).attr('alt') || $(i).attr('alt').trim()==='').length;
    return { fontTag, center, marquee, lotsOfInlineStyle, manyTables, viewportMissing, ogMissing, imgNoAlt};
}