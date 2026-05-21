/**
 * Quick test to verify Supabase bible views work correctly.
 */
const https = require('https');

const SUPABASE_URL = 'czxgkiunpdpjflqqgthd.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6eGdraXVucGRwamZscXFndGhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNzMxNjQsImV4cCI6MjA5NDk0OTE2NH0.P_Lt5MNci9PsXJWOcc7A0fEVOpW27cbybd5RSv9Z4uw';

function supabaseFetch(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: SUPABASE_URL,
            path: `/rest/v1/${path}`,
            headers: {
                'apikey': ANON_KEY,
                'Authorization': `Bearer ${ANON_KEY}`,
                'Accept': 'application/json'
            }
        };
        https.get(options, (res) => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    console.error(`HTTP ${res.statusCode}: ${body}`);
                    reject(new Error(`HTTP ${res.statusCode}`));
                    return;
                }
                resolve(JSON.parse(body));
            });
        }).on('error', reject);
    });
}

async function main() {
    console.log('=== TEST 1: bible_books view ===');
    try {
        const books = await supabaseFetch('bible_books?select=book_name,book_number&order=book_number');
        console.log(`Books found: ${books.length}`);
        books.forEach(b => console.log(`  ${b.book_number}. ${b.book_name}`));
    } catch(e) {
        console.error('bible_books FAILED:', e.message);
    }

    console.log('\n=== TEST 2: bible_chapters for Gênesis ===');
    try {
        const ch = await supabaseFetch('bible_chapters?select=chapter&book_name=eq.G%C3%AAnesis&order=chapter');
        console.log(`Chapters in Gênesis: ${ch.length}`);
        console.log(`Chapters: ${ch.map(c => c.chapter).join(', ')}`);
    } catch(e) {
        console.error('bible_chapters FAILED:', e.message);
    }

    console.log('\n=== TEST 3: Verses for Gênesis 1 (first 5) ===');
    try {
        const v = await supabaseFetch('bibles?select=verse,text&book_name=eq.G%C3%AAnesis&chapter=eq.1&order=verse&limit=5');
        console.log(`Verses found: ${v.length}`);
        v.forEach(x => console.log(`  ${x.verse}. ${x.text.substring(0, 80)}...`));
    } catch(e) {
        console.error('bibles verses FAILED:', e.message);
    }

    console.log('\n=== TEST 4: Verses for Apocalipse 22 (last chapter) ===');
    try {
        const v = await supabaseFetch('bibles?select=verse,text&book_name=eq.Apocalipse&chapter=eq.22&order=verse');
        console.log(`Verses found: ${v.length}`);
        v.forEach(x => console.log(`  ${x.verse}. ${x.text.substring(0, 80)}`));
    } catch(e) {
        console.error('Apocalipse FAILED:', e.message);
    }

    console.log('\n=== TEST 5: Total verse count ===');
    try {
        // Check raw bibles count via HEAD
        const v = await supabaseFetch('bibles?select=id&limit=1');
        console.log(`First verse id: ${v[0]?.id || 'N/A'}`);
    } catch(e) {
        console.error('Count FAILED:', e.message);
    }
}

main();
