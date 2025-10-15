import fetch from 'node-fetch';
import 'dotenv/config';

const BASE = 'https://api.ydc-index.io/v1';
const KEY = process.env.YOU_API_KEY;

if (!KEY) throw new Error('Missing YOU_API_KEY in .env');

export async function youSearch(query, count = 25) {
    const params = new URLSearchParams({
        query,
        count: String(count)
    });
        
    const r = await fetch(`${BASE}/search?${params.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'x-api-key': KEY },
        
    });

    const raw = await r.text();

    if (!r.ok) {
        throw new Error(`Search failed ${r.status} ${raw.slice(0,200)}`);
    }

    let j;
    try {
        j = JSON.parse(raw);
    } catch (e) {
        throw new Error(`Non-JSON response: ${raw.slice(0,300)}`);
    }

    const results =
        (Array.isArray(j?.results) && j.results) ||
        (Array.isArray(j?.web?.results) && j.web.results) ||
        (Array.isArray(j?.items) && j.items) ||
        [];

    return results.map(x => ({
        url: x.url || x.link || '',
        title: x.title || x.name || '',
        snippet: x.snippet || x.description || ''
    }));
}
export async function youContents(urls = []) {
    if (!urls.length) return [];
    const r = await fetch(`${BASE}/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': KEY },
        body: JSON.stringify({urls, format: 'html' })
    });
    if (!r.ok) throw new Error(`Contents failed ${r.status}`);
    return await r.json();
}