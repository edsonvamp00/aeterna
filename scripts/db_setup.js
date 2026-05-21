const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
    console.error("Erro: DATABASE_URL não definida em .env.local!");
    process.exit(1);
}

console.log("Conectando ao banco de dados Supabase PostgreSQL...");
const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false } // Required for secure connection to Supabase
});

async function run() {
    try {
        await client.connect();
        console.log("Conexão estabelecida com sucesso!");

        // 1. Execute schema.sql
        console.log("Carregando schema.sql...");
        const schemaSql = fs.readFileSync(path.join(__dirname, '../schema.sql'), 'utf-8');
        console.log("Executando DDL Schema no banco de dados...");
        await client.query(schemaSql);
        console.log("Schema criado com sucesso!");

        // 2. Load seed_data.json
        console.log("Carregando seed_data.json...");
        const seedData = JSON.parse(fs.readFileSync(path.join(__dirname, './seed_data.json'), 'utf-8'));

        // Seed reading_plans
        console.log("Semeando planos de leitura (reading_plans)...");
        for (const plan of seedData.reading_plans) {
            await client.query(
                `INSERT INTO public.reading_plans (id, title, description, category) 
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, category = EXCLUDED.category`,
                [plan.id, plan.title, plan.description, plan.category]
            );
        }

        // Seed reading_plan_days
        console.log("Semeando dias dos planos de leitura (reading_plan_days)...");
        for (const day of seedData.reading_plan_days) {
            await client.query(
                `INSERT INTO public.reading_plan_days (plan_id, day_number, target_chapters, estimated_time_minutes)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (plan_id, day_number) DO UPDATE SET target_chapters = EXCLUDED.target_chapters, estimated_time_minutes = EXCLUDED.estimated_time_minutes`,
                [day.plan_id, day.day_number, day.target_chapters, day.estimated_time_minutes]
            );
        }

        // Seed daily_devotionals
        console.log("Semeando devocionais diários (daily_devotionals)...");
        for (const dev of seedData.daily_devotionals) {
            await client.query(
                `INSERT INTO public.daily_devotionals (id, verse_reference, verse_text, reflection, prayer_text, challenge_of_the_day)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (id) DO UPDATE SET verse_reference = EXCLUDED.verse_reference, verse_text = EXCLUDED.verse_text, reflection = EXCLUDED.reflection, prayer_text = EXCLUDED.prayer_text, challenge_of_the_day = EXCLUDED.challenge_of_the_day`,
                [dev.id, dev.verse_reference, dev.verse_text, dev.reflection, dev.prayer_text, dev.challenge_of_the_day]
            );
        }

        // 3. Load Bible verses from bible_pt.json
        console.log("Carregando bible_pt.json...");
        const bibleData = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/bible_pt.json'), 'utf-8'));
        console.log(`Semeando ${bibleData.length} versículos bíblicos (bibles)...`);
        
        const BATCH_SIZE = 1000;
        for (let i = 0; i < bibleData.length; i += BATCH_SIZE) {
            const batch = bibleData.slice(i, i + BATCH_SIZE);
            const valuePlaceholders = [];
            const queryParams = [];
            
            batch.forEach((verse, index) => {
                const offset = index * 7;
                valuePlaceholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`);
                queryParams.push(
                    verse.version,
                    verse.book_name,
                    verse.book_number,
                    verse.chapter,
                    verse.verse,
                    verse.text,
                    verse.study_note
                );
            });
            
            const batchSql = `
                INSERT INTO public.bibles (version, book_name, book_number, chapter, verse, text, study_note)
                VALUES ${valuePlaceholders.join(',')}
                ON CONFLICT (version, book_number, chapter, verse) 
                DO UPDATE SET text = EXCLUDED.text, study_note = EXCLUDED.study_note
            `;
            
            console.log(`Semeando lote ${Math.floor(i / BATCH_SIZE) + 1} de ${Math.ceil(bibleData.length / BATCH_SIZE)} (${batch.length} versículos)...`);
            await client.query(batchSql, queryParams);
        }

        console.log("Semeação de dados concluída com absoluto sucesso!");
    } catch (err) {
        console.error("Erro durante a execução do setup do banco de dados:", err);
    } finally {
        await client.end();
        console.log("Conexão encerrada.");
    }
}

run();
