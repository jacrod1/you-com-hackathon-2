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
    
    const url = `${BASE}/search?${params.toString()}`;
    
    try {
        const r = await fetch(url, {
            method: 'GET',
            headers: { 
                'Content-Type': 'application/json', 
                'x-api-key': KEY 
            },
        });

        // Check if body has already been used (shouldn't happen, but let's be safe)
        if (r.bodyUsed) {
            throw new Error('Response body was already consumed before we could read it');
        }

        const raw = await r.text();

        if (!r.ok) {
            throw new Error(`Search failed ${r.status}: ${raw.slice(0, 200)}`);
        }

        let j;
        try {
            j = JSON.parse(raw);

        } catch (e) {
            throw new Error(`Non-JSON response: ${raw.slice(0, 300)}`);
        }
        //Debug
        console.log('📦 Full API response structure:', Object.keys(j));
        console.log('📦 Full response:', JSON.stringify(j, null, 2).slice(0, 1000));
        //end debug


        const results = (Array.isArray(j?.results?.web) && j.results.web) || [];

        console.log(`✅ Found ${results.length} results`);

        return results.map(x => ({
            url: x.url || x.link || '',
            title: x.title || x.name || '',
            snippet: x.snippet || x.description || ''
        }));

    } catch (error) {
        console.error(`Error fetching ${url}:`, error.message);
        throw error;
    }
}

export async function youContents(urls = []) {
    if (!urls.length) return [];
    
    console.log(`📡 Requesting content for ${urls.length} URLs...`);
    
    // Batch URLs in groups of 10
    const BATCH_SIZE = 10;
    const batches = [];
    for (let i = 0; i < urls.length; i += BATCH_SIZE) {
        batches.push(urls.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`📦 Split into ${batches.length} batches`);
    
    const allResults = [];
    
    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`📡 Fetching batch ${i + 1}/${batches.length} (${batch.length} URLs)...`);
        
        try {
            const r = await fetch(`${BASE}/contents`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'X-API-Key': KEY 
                },
                body: JSON.stringify({ urls: batch, format: 'html' })
            });
            
            const raw = await r.text();
            
            if (!r.ok) {
                console.error(`❌ Batch ${i + 1} failed:`, raw);
                continue; // Skip this batch but continue with others
            }
            
            const result = JSON.parse(raw);
            
            if (Array.isArray(result)) {
                console.log(`✅ Batch ${i + 1}: Got ${result.length} content items`);
                allResults.push(...result);
            } else {
                console.warn(`⚠️ Batch ${i + 1}: Unexpected format`, result);
            }
            
            // Be nice to the API - small delay between batches
            if (i < batches.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
        } catch (error) {
            console.error(`❌ Batch ${i + 1} error:`, error.message);
            continue;
        }
    }
    
    console.log(`✅ Total: Got ${allResults.length} content items`);
    return allResults;
}