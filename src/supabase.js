/**
 * AETERNA - DATABASE AND CLIENT CONECTOR
 * Exposes a robust API for Profiles, Bibles, Reading Plans, Prayers, and Leaderboards.
 * Includes a premium "Local-First Fallback" engine that mirrors all SQL relationships
 * and triggers using LocalStorage, enabling immediate high-fidelity testing inside Google IDX.
 */

const SUPABASE_URL = "https://czxgkiunpdpjflqqgthd.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6eGdraXVucGRwamZscXFndGhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNzMxNjQsImV4cCI6MjA5NDk0OTE2NH0.P_Lt5MNci9PsXJWOcc7A0fEVOpW27cbybd5RSv9Z4uw";

// Lazy-initializing Supabase client to handle CDN script loading timing
export let supabaseClient = null;

function getSupabaseClient() {
    if (supabaseClient) return supabaseClient;
    if (typeof window !== 'undefined' && window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase client inicializado com sucesso.');
    }
    return supabaseClient;
}

// Try to init immediately
getSupabaseClient();

class AeternaDatabaseEngine {
    constructor() {
        this.bibleCache = [];
        this.bibleCacheLoading = null; // promise guard for concurrent calls
        this.initializeLocalStorage();
    }

    /**
     * Set up all relational data structures inside localStorage if they are absent.
     * Seeds initial values from local seed datasets.
     */
    async initializeLocalStorage() {
        // We always initialize localStorage so that the high-fidelity offline fallback is ready if Supabase queries fail.

        // Initialize table representations
        const initTable = (key, defaultVal) => {
            if (!localStorage.getItem(key)) {
                localStorage.setItem(key, JSON.stringify(defaultVal));
            }
        };

        // Create initial default user profile if absent
        initTable('ae_profiles', [{
            id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
            username: 'Você (Guerreiro da Fé)',
            current_streak: 0,
            longest_streak: 0,
            last_reading_date: null,
            xp_points: 0
        }]);

        initTable('ae_user_plans', []);
        initTable('ae_reading_logs', []);
        initTable('ae_prayers', []);
        initTable('ae_badges_earned', []);

        // Load pre-seeded data
        try {
            // Load seed_data (Devotionals, Plans)
            const seedResponse = await fetch('seed_data.json');
            const seedData = await seedResponse.json();
            
            initTable('ae_reading_plans', seedData.reading_plans);
            initTable('ae_reading_plan_days', seedData.reading_plan_days);
            initTable('ae_daily_devotionals', seedData.daily_devotionals);
        } catch (e) {
            console.warn('Alerta de Ingestão: Usando base estática interna de planos e devocionais.');
            // Hard fallback if fetch is blocked
            initTable('ae_reading_plans', [
                { id: "1", title: "Provérbios em 25 Dias", description: "Sabedoria diária para vida prática.", category: "Constância" },
                { id: "2", title: "Bíblia em 1 Ano Sem Ansiedade", description: "Jornada com reajuste automático anti-acúmulo.", category: "Constância" },
                { id: "3", title: "Vencendo a Ansiedade e o Medo", description: "Paz mental e descanso bíblico.", category: "Apoio Emocional" }
            ]);
            initTable('ae_reading_plan_days', [
                { plan_id: "1", day_number: 1, target_chapters: "Provérbios 1", estimated_time_minutes: 5 },
                { plan_id: "1", day_number: 2, target_chapters: "Provérbios 2", estimated_time_minutes: 5 },
                { plan_id: "1", day_number: 3, target_chapters: "Provérbios 3", estimated_time_minutes: 6 },
                { plan_id: "3", day_number: 1, target_chapters: "Filipenses 4", estimated_time_minutes: 6 },
                { plan_id: "3", day_number: 2, target_chapters: "Salmos 23", estimated_time_minutes: 4 }
            ]);
            initTable('ae_daily_devotionals', [
                {
                    id: "2026-05-21",
                    verse_reference: "Provérbios 3:5-6",
                    verse_text: "Confia no Senhor de todo o teu coração, e não te estribes no teu próprio entendimento. Reconhece-o em todos os teus caminhos, e ele endireitará as tuas veredas.",
                    reflection: "Viver dependente de nossas próprias conclusões gera estresse e cansaço. A verdade da fé envolve render o volante da nossa trajetória a Alguém que enxerga o panorama completo.",
                    prayer_text: "Pai querido, decido não confiar em minha inteligência limitada. Guia-me em cada escolha hoje. Direciona meus passos. Amém.",
                    challenge_of_the_day: "Envie uma mensagem elegante de incentivo e bênção para alguém que você não conversa há algum tempo."
                }
            ]);
        }
    }

    /**
     * Lazily loads the complete Bible from bible_pt.json (31,105 verses).
     * This is the ONLY data source for all Bible reading.
     * Uses a promise guard to prevent concurrent duplicate loads.
     */
    async ensureBibleCache() {
        // Already loaded
        if (window.AETERNA_BIBLE_CACHE && window.AETERNA_BIBLE_CACHE.length > 100) {
            this.bibleCache = window.AETERNA_BIBLE_CACHE;
            return;
        }
        // Guard against concurrent calls
        if (this.bibleCacheLoading) {
            await this.bibleCacheLoading;
            this.bibleCache = window.AETERNA_BIBLE_CACHE || [];
            return;
        }
        this.bibleCacheLoading = this._loadBibleCache();
        await this.bibleCacheLoading;
        this.bibleCacheLoading = null;
    }

    async _loadBibleCache() {
        try {
            console.log('Carregando Bíblia completa (bible_pt.json)...');
            const bibleResponse = await fetch('bible_pt.json');
            if (!bibleResponse.ok) throw new Error('HTTP ' + bibleResponse.status);
            const bibleData = await bibleResponse.json();
            this.bibleCache = bibleData;
            window.AETERNA_BIBLE_CACHE = bibleData;
            console.log('Bíblia carregada com sucesso: ' + bibleData.length + ' versículos, ' + this._countBooks(bibleData) + ' livros.');
        } catch (e) {
            console.error('ERRO CRÍTICO: Falha ao carregar bible_pt.json!', e);
            this.bibleCache = [];
            window.AETERNA_BIBLE_CACHE = [];
        }
    }

    _countBooks(data) {
        const s = new Set();
        for (let i = 0; i < data.length; i++) s.add(data[i].book_name);
        return s.size;
    }

    // =========================================================================
    //  BIBLE API — 100% LOCAL (bible_pt.json)
    //  No Supabase dependency — fast and reliable on any device.
    // =========================================================================

    async getBibleBooks() {
        await this.ensureBibleCache();
        const bibles = window.AETERNA_BIBLE_CACHE || this.bibleCache || [];
        const booksMap = {};
        for (let i = 0; i < bibles.length; i++) {
            const v = bibles[i];
            if (!booksMap[v.book_name]) {
                booksMap[v.book_name] = v.book_number;
            }
        }
        return Object.keys(booksMap)
            .map(name => ({ name, number: booksMap[name] }))
            .sort((a, b) => a.number - b.number);
    }

    async getBibleChapters(bookName) {
        await this.ensureBibleCache();
        const bibles = window.AETERNA_BIBLE_CACHE || this.bibleCache || [];
        const chapters = new Set();
        for (let i = 0; i < bibles.length; i++) {
            if (bibles[i].book_name === bookName) {
                chapters.add(bibles[i].chapter);
            }
        }
        return [...chapters].sort((a, b) => a - b);
    }

    async getBibleVerses(bookName, chapter) {
        await this.ensureBibleCache();
        const bibles = window.AETERNA_BIBLE_CACHE || this.bibleCache || [];
        const chapterNum = parseInt(chapter);
        const verses = [];
        for (let i = 0; i < bibles.length; i++) {
            const v = bibles[i];
            if (v.book_name === bookName && v.chapter === chapterNum) {
                verses.push(v);
            }
        }
        return verses.sort((a, b) => a.verse - b.verse);
    }

    async searchBibleVerses(query) {
        if (!query || query.trim() === '') return [];
        await this.ensureBibleCache();
        const bibles = window.AETERNA_BIBLE_CACHE || this.bibleCache || [];
        const lowerQuery = query.trim().toLowerCase();
        const results = [];
        for (let i = 0; i < bibles.length && results.length < 100; i++) {
            const v = bibles[i];
            if (v.text.toLowerCase().includes(lowerQuery) ||
                v.book_name.toLowerCase().includes(lowerQuery)) {
                results.push(v);
            }
        }
        return results;
    }


    // --- GENERIC TABLE READ/WRITE ENGINE ---
    _get(key) {
        return JSON.parse(localStorage.getItem(key)) || [];
    }

    _set(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    // --- PROFILES API ---
    async getProfile(userId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479') {
        if (getSupabaseClient()) {
            try {
                let { data, error } = await supabaseClient.from('profiles').select('*').eq('id', userId).maybeSingle();
                if (data) return data;
                
                if (!data) {
                    const defaultProfile = {
                        id: userId,
                        username: 'Você (Guerreiro da Fé)',
                        current_streak: 0,
                        longest_streak: 0,
                        last_reading_date: null,
                        xp_points: 0
                    };
                    let { data: newProfile } = await supabaseClient.from('profiles').insert(defaultProfile).select().single();
                    if (newProfile) return newProfile;
                }
            } catch (err) {
                console.warn("Supabase getProfile falhou, usando fallback local:", err);
            }
        }
        const profiles = this._get('ae_profiles');
        return profiles.find(p => p.id === userId) || profiles[0];
    }

    async updateProfile(userId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479', updates) {
        if (getSupabaseClient()) {
            try {
                let { data, error } = await supabaseClient.from('profiles').update(updates).eq('id', userId).select().single();
                if (data) return data;
            } catch (err) {
                console.warn("Supabase updateProfile falhou, usando fallback local:", err);
            }
        }
        const profiles = this._get('ae_profiles');
        const idx = profiles.findIndex(p => p.id === userId);
        if (idx !== -1) {
            const updated = { ...profiles[idx], ...updates };
            if (updated.current_streak > updated.longest_streak) {
                updated.longest_streak = updated.current_streak;
            }
            profiles[idx] = updated;
            this._set('ae_profiles', profiles);
            return updated;
        }
        return null;
    }

    // --- READING PLANS API ---
    async getReadingPlans() {
        if (getSupabaseClient()) {
            try {
                let { data, error } = await supabaseClient.from('reading_plans').select('*');
                if (data && data.length > 0) return data;
            } catch (err) {
                console.warn("Supabase getReadingPlans falhou, usando fallback local:", err);
            }
        }
        return this._get('ae_reading_plans');
    }

    async getReadingPlanDays(planId) {
        if (getSupabaseClient()) {
            try {
                let { data, error } = await supabaseClient.from('reading_plan_days').select('*').eq('plan_id', planId).order('day_number');
                if (data && data.length > 0) return data;
            } catch (err) {
                console.warn("Supabase getReadingPlanDays falhou, usando fallback local:", err);
            }
        }
        const days = this._get('ae_reading_plan_days');
        return days.filter(d => d.plan_id === planId).sort((a,b) => a.day_number - b.day_number);
    }

    async getUserPlan(userId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479', planId) {
        if (getSupabaseClient()) {
            try {
                let { data, error } = await supabaseClient.from('user_plans').select('*').eq('user_id', userId).eq('plan_id', planId).maybeSingle();
                if (data) return data;
            } catch (err) {
                console.warn("Supabase getUserPlan falhou, usando fallback local:", err);
            }
        }
        const up = this._get('ae_user_plans');
        return up.find(p => p.user_id === userId && p.plan_id === planId);
    }

    async getActiveUserPlan(userId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479') {
        if (getSupabaseClient()) {
            try {
                let { data, error } = await supabaseClient.from('user_plans').select('*').eq('user_id', userId).eq('status', 'active').maybeSingle();
                if (data) return data;
            } catch (err) {
                console.warn("Supabase getActiveUserPlan falhou, usando fallback local:", err);
            }
        }
        const up = this._get('ae_user_plans');
        return up.find(p => p.user_id === userId && p.status === 'active');
    }

    async enrollInPlan(userId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479', planId) {
        if (getSupabaseClient()) {
            try {
                // Pause all other active plans to keep user single-focused (Duolingo discipline focus)
                await supabaseClient.from('user_plans').update({ status: 'paused' }).eq('user_id', userId).eq('status', 'active');
                
                // Check if enrollment exists
                let { data: existing } = await supabaseClient.from('user_plans').select('*').eq('user_id', userId).eq('plan_id', planId).maybeSingle();
                let data;
                if (existing) {
                    let res = await supabaseClient.from('user_plans').update({ status: 'active' }).eq('user_id', userId).eq('plan_id', planId).select().single();
                    data = res.data;
                } else {
                    let res = await supabaseClient.from('user_plans').insert({
                        user_id: userId,
                        plan_id: planId,
                        current_day: 1,
                        status: 'active',
                        enrolled_at: new Date().toISOString()
                    }).select().single();
                    data = res.data;
                }
                if (data) return data;
            } catch (err) {
                console.warn("Supabase enrollInPlan falhou, usando fallback local:", err);
            }
        }
        const userPlans = this._get('ae_user_plans');
        
        // Pause all other active plans to keep user single-focused (Duolingo discipline focus)
        userPlans.forEach(p => {
            if (p.user_id === userId && p.status === 'active') {
                p.status = 'paused';
            }
        });

        // Check if enrollment already exists
        const existingIdx = userPlans.findIndex(p => p.user_id === userId && p.plan_id === planId);
        let enrollment;
        
        if (existingIdx !== -1) {
            userPlans[existingIdx].status = 'active';
            enrollment = userPlans[existingIdx];
        } else {
            enrollment = {
                id: 'up-' + Math.random().toString(36).substr(2, 9),
                user_id: userId,
                plan_id: planId,
                current_day: 1,
                enrolled_at: new Date().toISOString(),
                status: 'active',
                last_interaction_date: null
            };
            userPlans.push(enrollment);
        }
        
        this._set('ae_user_plans', userPlans);
        return enrollment;
    }

    async updateUserPlanProgress(userId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479', planId, nextDay, isCompleted = false) {
        if (getSupabaseClient()) {
            try {
                const updates = {
                    current_day: nextDay,
                    last_interaction_date: new Date().toISOString().split('T')[0]
                };
                if (isCompleted) {
                    updates.status = 'completed';
                }
                let { data } = await supabaseClient.from('user_plans').update(updates).eq('user_id', userId).eq('plan_id', planId).select().single();
                if (data) return data;
            } catch (err) {
                console.warn("Supabase updateUserPlanProgress falhou, usando fallback local:", err);
            }
        }
        const userPlans = this._get('ae_user_plans');
        const idx = userPlans.findIndex(p => p.user_id === userId && p.plan_id === planId);
        if (idx !== -1) {
            userPlans[idx].current_day = nextDay;
            userPlans[idx].last_interaction_date = new Date().toISOString().split('T')[0];
            if (isCompleted) {
                userPlans[idx].status = 'completed';
            }
            this._set('ae_user_plans', userPlans);
            return userPlans[idx];
        }
        return null;
    }

    // Update user plan enrollment dates dynamically (Anti-accumulation engine)
    async updateEnrollmentDate(userId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479', planId, offsetDays) {
        if (getSupabaseClient()) {
            try {
                let { data: currentPlan } = await supabaseClient.from('user_plans').select('enrolled_at').eq('user_id', userId).eq('plan_id', planId).single();
                if (currentPlan) {
                    const date = new Date(currentPlan.enrolled_at);
                    date.setDate(date.getDate() + offsetDays);
                    let { data } = await supabaseClient.from('user_plans').update({ enrolled_at: date.toISOString() }).eq('user_id', userId).eq('plan_id', planId).select().single();
                    if (data) return data;
                }
            } catch (err) {
                console.warn("Supabase updateEnrollmentDate falhou, usando fallback local:", err);
            }
        }
        const userPlans = this._get('ae_user_plans');
        const idx = userPlans.findIndex(p => p.user_id === userId && p.plan_id === planId);
        if (idx !== -1) {
            const date = new Date(userPlans[idx].enrolled_at);
            date.setDate(date.getDate() + offsetDays);
            userPlans[idx].enrolled_at = date.toISOString();
            this._set('ae_user_plans', userPlans);
            return userPlans[idx];
        }
        return null;
    }

    // --- READING LOGS API ---
    async getReadingLogs(userId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479') {
        if (getSupabaseClient()) {
            try {
                let { data } = await supabaseClient.from('reading_logs').select('*').eq('user_id', userId);
                if (data && data.length > 0) return data;
            } catch (err) {
                console.warn("Supabase getReadingLogs falhou, usando fallback local:", err);
            }
        }
        return this._get('ae_reading_logs');
    }

    async addReadingLog(userId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479', planId, dayNumber) {
        if (getSupabaseClient()) {
            try {
                // Prevent duplicates
                let { data: existing } = await supabaseClient.from('reading_logs').select('*').eq('user_id', userId).eq('plan_id', planId).eq('day_number', dayNumber).maybeSingle();
                if (existing) return existing;
                let { data } = await supabaseClient.from('reading_logs').insert({
                    user_id: userId,
                    plan_id: planId,
                    day_number: dayNumber,
                    read_at: new Date().toISOString()
                }).select().single();
                if (data) return data;
            } catch (err) {
                console.warn("Supabase addReadingLog falhou, usando fallback local:", err);
            }
        }
        const logs = this._get('ae_reading_logs');
        
        // Prevent duplicates for the same day logging
        const exists = logs.some(l => l.user_id === userId && l.plan_id === planId && l.day_number === dayNumber);
        if (exists) return null;

        const newLog = {
            id: 'log-' + Math.random().toString(36).substr(2, 9),
            user_id: userId,
            plan_id: planId,
            day_number: dayNumber,
            read_at: new Date().toISOString()
        };
        logs.push(newLog);
        this._set('ae_reading_logs', logs);
        return newLog;
    }

    // --- PRAYERS DIARY API ---
    async getPrayers(userId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479', filter = 'clamor') {
        if (getSupabaseClient()) {
            try {
                let query = supabaseClient.from('prayers').select('*').eq('user_id', userId);
                if (filter === 'clamor') {
                    query = query.eq('is_answered', false).order('created_at', { ascending: false });
                } else if (filter === 'respondidas') {
                    query = query.eq('is_answered', true).order('answered_at', { ascending: false });
                }
                let { data } = await query;
                if (data && data.length > 0) return data;
            } catch (err) {
                console.warn("Supabase getPrayers falhou, usando fallback local:", err);
            }
        }
        const prayers = this._get('ae_prayers');
        const userPrayers = prayers.filter(p => p.user_id === userId);
        
        if (filter === 'clamor') {
            return userPrayers.filter(p => !p.is_answered).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
        } else if (filter === 'respondidas') {
            return userPrayers.filter(p => p.is_answered).sort((a,b) => new Date(b.answered_at) - new Date(a.answered_at));
        }
        return userPrayers;
    }

    async addPrayer(userId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479', title, description, type) {
        if (getSupabaseClient()) {
            try {
                let { data } = await supabaseClient.from('prayers').insert({
                    user_id: userId,
                    title,
                    description,
                    type,
                    is_answered: false,
                    created_at: new Date().toISOString()
                }).select().single();
                if (data) return data;
            } catch (err) {
                console.warn("Supabase addPrayer falhou, usando fallback local:", err);
            }
        }
        const prayers = this._get('ae_prayers');
        const newPrayer = {
            id: 'pr-' + Math.random().toString(36).substr(2, 9),
            user_id: userId,
            title,
            description,
            type, // 'Pedido' | 'Agradecimento'
            is_answered: false,
            created_at: new Date().toISOString(),
            answered_at: null
        };
        prayers.push(newPrayer);
        this._set('ae_prayers', prayers);
        return newPrayer;
    }

    async markPrayerAsAnswered(prayerId) {
        if (getSupabaseClient()) {
            try {
                let { data } = await supabaseClient.from('prayers').update({
                    is_answered: true,
                    answered_at: new Date().toISOString()
                }).eq('id', prayerId).select().single();
                if (data) return data;
            } catch (err) {
                console.warn("Supabase markPrayerAsAnswered falhou, usando fallback local:", err);
            }
        }
        const prayers = this._get('ae_prayers');
        const idx = prayers.findIndex(p => p.id === prayerId);
        if (idx !== -1) {
            prayers[idx].is_answered = true;
            prayers[idx].answered_at = new Date().toISOString();
            this._set('ae_prayers', prayers);
            return prayers[idx];
        }
        return null;
    }

    // Queries local/remote prayers generated exactly 7, 30, or 90 days ago for retention hook
    async getFaithMemories(userId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479') {
        if (getSupabaseClient()) {
            try {
                let { data } = await supabaseClient.from('prayers').select('*').eq('user_id', userId);
                if (data) {
                    const today = new Date();
                    const targets = [7, 30, 90];
                    const matches = [];
                    data.forEach(p => {
                        const created = new Date(p.created_at);
                        const diffTime = Math.abs(today - created);
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) - 1;
                        if (targets.includes(diffDays)) {
                            matches.push({
                                prayer: p,
                                daysAgo: diffDays
                            });
                        }
                    });
                    return matches;
                }
            } catch (err) {
                console.warn("Supabase getFaithMemories falhou, usando fallback local:", err);
            }
        }
        const prayers = this._get('ae_prayers').filter(p => p.user_id === userId);
        const today = new Date();
        const targets = [7, 30, 90];
        
        const matches = [];
        
        prayers.forEach(p => {
            const created = new Date(p.created_at);
            const diffTime = Math.abs(today - created);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) - 1; // get exact integer days
            
            if (targets.includes(diffDays)) {
                matches.push({
                    prayer: p,
                    daysAgo: diffDays
                });
            }
        });

        return matches;
    }

    // --- DAILY DEVOTIONALS API ---
    async getDailyDevotional(dateString) {
        if (getSupabaseClient()) {
            try {
                let { data } = await supabaseClient.from('daily_devotionals').select('*').eq('id', dateString).maybeSingle();
                if (data) return data;
            } catch (err) {
                console.warn("Supabase getDailyDevotional falhou, usando fallback local:", err);
            }
        }
        const devotionals = this._get('ae_daily_devotionals');
        return devotionals.find(d => d.id === dateString) || devotionals[devotionals.length - 1];
    }

    // --- BADGES EARNED API ---
    async getBadges(userId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479') {
        if (getSupabaseClient()) {
            try {
                let { data } = await supabaseClient.from('badges_earned').select('*').eq('user_id', userId);
                if (data && data.length > 0) return data;
            } catch (err) {
                console.warn("Supabase getBadges falhou, usando fallback local:", err);
            }
        }
        return this._get('ae_badges_earned').filter(b => b.user_id === userId);
    }

    async earnBadge(userId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479', badgeType) {
        if (getSupabaseClient()) {
            try {
                let { data: existing } = await supabaseClient.from('badges_earned').select('*').eq('user_id', userId).eq('badge_type', badgeType).maybeSingle();
                if (existing) return null;
                let { data } = await supabaseClient.from('badges_earned').insert({
                    user_id: userId,
                    badge_type: badgeType,
                    earned_at: new Date().toISOString()
                }).select().single();
                if (data) return data;
            } catch (err) {
                console.warn("Supabase earnBadge falhou, usando fallback local:", err);
            }
        }
        const earned = this._get('ae_badges_earned');
        const exists = earned.some(b => b.user_id === userId && b.badge_type === badgeType);
        
        if (exists) return null;

        const newBadge = {
            id: 'bd-' + Math.random().toString(36).substr(2, 9),
            user_id: userId,
            badge_type: badgeType,
            earned_at: new Date().toISOString()
        };
        
        earned.push(newBadge);
        this._set('ae_badges_earned', earned);
        return newBadge;
    }

    // --- COMMUNITY HEALTHY LEADERBOARD ---
    async getCommunityLeaderboard(myProfile) {
        if (getSupabaseClient()) {
            try {
                let { data } = await supabaseClient.from('profiles').select('id, username, xp_points').order('xp_points', { ascending: false }).limit(10);
                if (data && data.length > 0) {
                    const meIdx = data.findIndex(p => p.id === myProfile.id);
                    if (meIdx === -1) {
                        data.push({
                            id: myProfile.id,
                            username: myProfile.username,
                            xp_points: myProfile.xp_points
                        });
                    } else {
                        data[meIdx].xp_points = myProfile.xp_points;
                    }
                    return data.sort((a,b) => b.xp_points - a.xp_points).slice(0, 10);
                }
            } catch (err) {
                console.warn("Supabase getCommunityLeaderboard falhou, usando fallback local:", err);
            }
        }
        // High fidelity mock database profiles to make the league look real instantly
        const mockPeers = [
            { id: 'p1', username: 'Ana Clara (Perseverança)', xp_points: 480 },
            { id: 'p2', username: 'Pastor Lucas', xp_points: 390 },
            { id: 'p3', username: 'Gabriel_Cruz', xp_points: 310 },
            { id: 'p4', username: 'Débora M. (Guerreira)', xp_points: 290 },
            { id: 'p5', username: 'Mateus_Fé', xp_points: 210 },
            { id: 'p6', username: 'Sara_EstudoAtivo', xp_points: 180 },
            { id: 'p7', username: 'Tiago Oliveira', xp_points: 120 },
            { id: 'p8', username: 'Beatriz Santos', xp_points: 90 },
            { id: 'p9', username: 'Carla Dias', xp_points: 50 }
        ];

        // Inject active profile to compile rankings
        const allProfiles = [...mockPeers];
        const meIdx = allProfiles.findIndex(p => p.id === myProfile.id);
        
        if (meIdx === -1) {
            allProfiles.push({
                id: myProfile.id,
                username: myProfile.username,
                xp_points: myProfile.xp_points
            });
        } else {
            allProfiles[meIdx].xp_points = myProfile.xp_points;
        }

        // Sort by XP
        return allProfiles.sort((a,b) => b.xp_points - a.xp_points).slice(0, 10);
    }
}

export const db = new AeternaDatabaseEngine();
export default db;
