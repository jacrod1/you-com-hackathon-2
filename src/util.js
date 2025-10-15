import * as cheerio from 'cheerio';
import { URL } from 'url';

export function uniqueDomains(urls) {
    const seen = new Set();
    const out = [];
    for (const u of urls) {
        try {
            const d = new URL(u).hostname.replace(/^www\./,'');
            if (!seen.has(d)) { seen.add(d); out.push({ url: u, domain: d }); }
        } catch {}
    }
    return out;
}

export function load(html) {
    return cheerio.load(html || '', { decodeURIComponent: true, scriptingenabled: false});
}

export function toSlug(s='') {
    return s.toLowerCase().replace(/[^\w]+/g,'-').replace(/^-+|-+$/g,'');
}

export function isHttpUrl(u) {
    try { return new URL(u).protocol === 'http:'; } catch { return false; }
}