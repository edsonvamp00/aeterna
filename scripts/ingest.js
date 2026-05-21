/**
 * AETERNA - BIBLE DATA INGESTION & STUDY NOTE SEED ENGINE
 * Node.js executable script to parse PT Bible datasets from open-source repositories.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Target repositories for PT Bible datasets
const NVI_SOURCE_URL = 'https://raw.githubusercontent.com/thiagobodruk/biblia/master/json/nvi.json';

// Local paths
const OUTPUT_FILE = path.join(__dirname, '../src/bible_pt.json');

// Premium theological study notes mapped to key verses to seed immediately
const STUDY_NOTES_SEED = {
    "Provérbios_1_1": "Introdução literária de Salomão. Provérbios ('mishle') denota frases curtas que condensam grandes verdades de conduta moral e sabedoria divina. O tema central é o desenvolvimento da competência espiritual prática.",
    "Provérbios_1_7": "O 'temor do Senhor' não representa medo servil, mas reverência santa, admiração profunda e reconhecimento voluntário da soberania do Criador. É a fundação absoluta de todo conhecimento real.",
    "Provérbios_3_5": "Confiar ('batah') significa lançar todo o peso sobre um apoio seguro. A instrução proíbe a autossuficiência moral ou intelectual ('estribar-se no próprio entendimento'), exigindo total rendição a Deus.",
    "Filipenses_4_6": "O apóstolo Paulo utiliza termos jurídicos ('petições') e litúrgicos ('súplica com ação de graças'). A cura para o estresse paralisante reside no ato de expor ansiedades diante do Altar, regado com gratidão preventiva.",
    "Filipenses_4_7": "A paz ('shalom') de Deus transcende toda compreensão intelectual humana. Ela atua como um sentinela ('guardará') que patrulha e protege ativamente a fortaleza dos nossos corações contra pensamentos invasores.",
    "Salmos_23_1": "Salmo Davídico. A declaração 'nada me faltará' não promete ausência de provações, mas sim que, sob a tutela ativa e bondosa do Bom Pastor, todas as necessidades essenciais de provisão física e espiritual estão eternamente seguras.",
    "Isaías_41_10": "A promessa tripla de Deus: 'Não temas porque eu sou contigo', 'Não te assombres porque eu sou o teu Deus', e 'Eu te fortaleço, te ajudo e te sustento com a minha destra fiel'. É uma injeção bíblica direta contra pânico e fobias.",
    "2 Timóteo_1_7": "O termo original grego 'sophronismos' (traduzido como moderação/mente sã) denota uma mente sob autocontrole divino, equilibrada e focada, em perfeito contraste com a confusão mental gerada pelo pânico."
};

console.log('--- AETERNA DATA INGESTION SCRIPT ---');

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        console.log(`Buscando dados em: ${url}`);
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Falha na requisição. Código: ${res.statusCode}`));
                return;
            }

            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    // Stripping UTF-8 BOM if present
                    const cleanData = data.replace(/^\uFEFF/, '').trim();
                    resolve(JSON.parse(cleanData));
                } catch (e) {
                    reject(new Error('Falha ao processar o formato JSON de resposta: ' + e.message));
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

// Fallback high-fidelity subset database if user runs offline
const OFFLINE_FALLBACK = [
    {
        "version": "NVI",
        "book_name": "Provérbios",
        "book_number": 20,
        "chapter": 1,
        "verse": 1,
        "text": "Provérbios de Salomão, filho de Davi, rei de Israel:",
        "study_note": STUDY_NOTES_SEED["Provérbios_1_1"]
    },
    {
        "version": "NVI",
        "book_name": "Provérbios",
        "book_number": 20,
        "chapter": 1,
        "verse": 7,
        "text": "O temor do Senhor é o princípio do conhecimento; mas os loucos desprezam a sabedoria e a instrução.",
        "study_note": STUDY_NOTES_SEED["Provérbios_1_7"]
    },
    {
        "version": "NVI",
        "book_name": "Provérbios",
        "book_number": 20,
        "chapter": 3,
        "verse": 5,
        "text": "Confie no Senhor de todo o seu coração e não se apóie em seu próprio entendimento;",
        "study_note": STUDY_NOTES_SEED["Provérbios_3_5"]
    },
    {
        "version": "NVI",
        "book_name": "Provérbios",
        "book_number": 20,
        "chapter": 3,
        "verse": 6,
        "text": "reconheça o Senhor em todos os seus caminhos, e ele endireitará as suas veredas.",
        "study_note": null
    },
    {
        "version": "NVI",
        "book_name": "Filipenses",
        "book_number": 50,
        "chapter": 4,
        "verse": 6,
        "text": "Não andem ansiosos por coisa alguma, mas em tudo, pela oração e súplicas, e com ação de graças, apresentem seus pedidos a Deus.",
        "study_note": STUDY_NOTES_SEED["Filipenses_4_6"]
    },
    {
        "version": "NVI",
        "book_name": "Filipenses",
        "book_number": 50,
        "chapter": 4,
        "verse": 7,
        "text": "E a paz de Deus, que excede todo o entendimento, guardará os seus corações e as suas mentes em Cristo Jesus.",
        "study_note": STUDY_NOTES_SEED["Filipenses_4_7"]
    },
    {
        "version": "NVI",
        "book_name": "Salmos",
        "book_number": 19,
        "chapter": 23,
        "verse": 1,
        "text": "O Senhor é o meu pastor; de nada terei falta.",
        "study_note": STUDY_NOTES_SEED["Salmos_23_1"]
    },
    {
        "version": "NVI",
        "book_name": "Isaías",
        "book_number": 23,
        "chapter": 41,
        "verse": 10,
        "text": "Por isso não tema, pois estou com você; não tenha medo, pois sou o seu Deus. Eu o fortalecerei e o ajudarei; eu o segurarei com a minha mão direita vitoriosa.",
        "study_note": STUDY_NOTES_SEED["Isaías_41_10"]
    },
    {
        "version": "NVI",
        "book_name": "2 Timóteo",
        "book_number": 55,
        "chapter": 1,
        "verse": 7,
        "text": "Pois Deus não nos deu espírito de covardia, mas de poder, de amor e de equilíbrio.",
        "study_note": STUDY_NOTES_SEED["2 Timóteo_1_7"]
    }
];

async function run() {
    try {
        const rawBible = await fetchJson(NVI_SOURCE_URL);
        console.log('Bases obtidas do GitHub com sucesso! Iniciando mapeamento...');

        const parsedVerses = [];

        // NVI format on github: array of books, each having "name", "abbrev", and "chapters" (array of arrays of strings)
        rawBible.forEach((book, bookIdx) => {
            const bookName = book.name;
            const bookNumber = bookIdx + 1;

            book.chapters.forEach((chapter, chapIdx) => {
                const chapterNumber = chapIdx + 1;

                chapter.forEach((verseText, vIdx) => {
                    const verseNumber = vIdx + 1;
                    const studyKey = `${bookName}_${chapterNumber}_${verseNumber}`;
                    const studyNote = STUDY_NOTES_SEED[studyKey] || null;

                    parsedVerses.push({
                        version: 'NVI',
                        book_name: bookName,
                        book_number: bookNumber,
                        chapter: chapterNumber,
                        verse: verseNumber,
                        text: verseText,
                        study_note: studyNote
                    });
                });
            });
        });

        console.log(`Processamento concluído. Total de versículos estruturados: ${parsedVerses.length}`);
        
        // Ensure output folder exists
        const dir = path.dirname(OUTPUT_FILE);
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(parsedVerses, null, 2), 'utf-8');
        console.log(`Sucesso! Banco compactado salvo em: ${OUTPUT_FILE}`);

    } catch (err) {
        console.warn('Alerta: Não foi possível obter ou parsear a base remota do GitHub (provável falta de conectividade externa).');
        console.log('Implementando banco inteligente de fallback offline estruturado com versículos premium e notas de estudo teológico...');
        
        // Ensure output folder exists
        const dir = path.dirname(OUTPUT_FILE);
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(OFFLINE_FALLBACK, null, 2), 'utf-8');
        console.log(`Banco local de fallback criado com sucesso em: ${OUTPUT_FILE}`);
    }
}

run();
