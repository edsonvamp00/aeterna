const https = require('https');
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6eGdraXVucGRwamZscXFndGhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNzMxNjQsImV4cCI6MjA5NDk0OTE2NH0.P_Lt5MNci9PsXJWOcc7A0fEVOpW27cbybd5RSv9Z4uw';

function q(path) {
    return new Promise((resolve, reject) => {
        https.get({
            hostname: 'czxgkiunpdpjflqqgthd.supabase.co',
            path: '/rest/v1/' + path,
            headers: { apikey: key, Authorization: 'Bearer ' + key, Accept: 'application/json' }
        }, r => {
            let d = '';
            r.on('data', c => d += c);
            r.on('end', () => resolve(JSON.parse(d)));
        }).on('error', reject);
    });
}

async function main() {
    // Test with exact book_name from Supabase JS client (no manual encoding)
    console.log('--- Gênesis chapters ---');
    const ch = await q('bible_chapters?select=chapter&book_name=eq.G%C3%AAnesis&order=chapter');
    console.log('Total:', ch.length);
    
    console.log('\n--- Gênesis 1 verses (first 3) ---');
    const v = await q('bibles?select=verse,text&book_name=eq.G%C3%AAnesis&chapter=eq.1&order=verse&limit=3');
    v.forEach(x => console.log(x.verse + '. ' + x.text));
    
    console.log('\n--- Apocalipse 22 verse count ---');
    const v2 = await q('bibles?select=verse&book_name=eq.Apocalipse&chapter=eq.22');
    console.log('Total verses in Apocalipse 22:', v2.length);
    
    console.log('\n--- Salmos chapters (should be 150) ---');
    const sch = await q('bible_chapters?select=chapter&book_name=eq.Salmos&order=chapter');
    console.log('Total chapters in Salmos:', sch.length);
}

main().catch(console.error);
