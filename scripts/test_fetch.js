const fs = require('fs');
const path = require('path');
const https = require('https');

const URL = 'https://raw.githubusercontent.com/thiagobodruk/biblia/master/json/nvi.json';
const OUTPUT = path.join(__dirname, '../src/bible_full_test.json');

console.log('Testando download de:', URL);

function download() {
    https.get(URL, (res) => {
        console.log('Status Code:', res.statusCode);
        
        let body = '';
        res.on('data', (chunk) => {
            body += chunk;
        });
        
        res.on('end', () => {
            console.log('Download completo. Tamanho dos dados:', body.length);
            if (res.statusCode === 200) {
                try {
                    // Remove UTF-8 BOM if present
                    const cleanBody = body.replace(/^\uFEFF/, '').trim();
                    const parsed = JSON.parse(cleanBody);
                    console.log('Parsed com sucesso. Livros encontrados:', parsed.length);
                    // Save first book (Gênesis) to inspect
                    fs.writeFileSync(OUTPUT, JSON.stringify(parsed.slice(0, 1), null, 2), 'utf-8');
                    console.log('Salvo com sucesso em:', OUTPUT);
                } catch (e) {
                    console.error('Erro de parse JSON:', e.message);
                }
            }
        });
    }).on('error', (err) => {
        console.error('Erro na requisição:', err.message);
    });
}

download();
