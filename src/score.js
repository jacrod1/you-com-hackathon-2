export function computeCrust({ legacy, httpOnly }) {
    let score = 0;
    if (httpOnly) score += 25;
    if (legacy.fontTag || legacy.center || legacy.marquee) score += 20;
    if (legacy.manyTables) score += 20;
    if (legacy.viewportMissing) score += 15;
    if (legacy.lotsOfInlineStyle) score += 10;
    if (legacy.ogMissing) score += 10;
    if (legacy.imgNoAlt > 5) score += 5;
    
    // 🆕 New legacy signals
    if (legacy.oldDoctype) score += 15;
    if (legacy.framesetOrFrames) score += 25;
    if (legacy.flash) score += 20;
    if (legacy.noCharset) score += 5;
    
    return Math.min(100, score);
}

export function contactWeak(contact) {
    // Higher is worse
    let s = 0;
    if (!contact.hasContactWord) s += 40;
    if (!contact.hasContactPath) s += 40;
    if (!contact.hasMailto && !contact.hasTel) s += 20;
    return Math.min(100, s);  // 🔧 Cap at 100
}

export function urgency({ crust, contactScore, cms }) {
    const cmsUnknown = cms === 'unknown' ? 100 : 0;
    const u = 0.5 * crust + 0.3 * contactScore + 0.2 * cmsUnknown;
    return Math.round(u);
}