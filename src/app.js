/**
 * AETERNA - FRONTEND CORE ENGINE
 * Orchestrates SPA routing, Duolingo-style streaks, anti-accumulation schedules,
 * interactive theological reader sheets, prayer retention notifications, and leagues.
 */

import { db } from './supabase.js';

class AeternaApp {
    constructor() {
        this.currentScreen = 'screen-home';
        this.currentUser = null;
        this.activePlan = null;
        this.selectedBook = 'Gênesis';
        this.selectedChapter = 1;
        
        // Target dates for local testing (simulating metadata current date)
        this.todayStr = new Date().toISOString().split('T')[0];

        // Initialize Theme preference and session variables
        this.theme = localStorage.getItem('ae_theme') || 'dark';
        this.currentUserSession = null;

        // Audio Devotional State variables
        this.audioState = 'stopped'; // 'stopped' | 'playing' | 'paused'
    }

    async init() {
        console.log('Inicializando Aeterna Engine...');
        
        // Apply initial theme immediately
        this.applyTheme(this.theme);
        
        try {
            // Wait for database initialization
            await db.initializeLocalStorage();
        } catch (e) {
            console.warn('Alerta: initializeLocalStorage falhou, continuando:', e);
        }
        
        // Setup Auth Listeners first
        this.setupAuthListeners();
        
        // Check Auth Status (loads profile, handles screens visibility, starts login canvas particles)
        await this.checkAuthStatus();

        // Bind SPA Navigation Click events
        this.setupNavigation();

        // Bind Action Listeners
        this.setupActionListeners();

        // Setup Photo Upload trigger and listeners
        this.setupPhotoUploadListeners();

        // Setup Theme toggle click listener
        this.setupThemeToggle();

        // Setup Revelação Divina (Surprise Feature)
        this.setupRevelacaoDivina();

        // Setup Devotional Audio Narration
        this.setupDevotionalAudio();

        // Setup Bússola Espiritual (Surprise Feature)
        this.setupBussolaEspiritual();

        // Initial Screen render (if logged in, the auth check handles screen, otherwise we render)
        if (this.currentUser) {
            await this.renderCurrentScreen();
        }

        // Check and trigger local retention notifications simulation
        this.setupLocalNotificationsCheck();
        
        console.log('Aeterna Engine inicializada com sucesso!');
    }

    // --- USER PROFILE LOAD ---
    async loadUserProfile() {
        if (this.currentUserSession) {
            this.currentUser = await db.getProfile(this.currentUserSession.id);
        } else {
            this.currentUser = await db.getProfile();
        }
        this.updateHeaderUI();
        this.updateProfileUI();
    }

    updateHeaderUI() {
        if (!this.currentUser) return;

        // Update streak counters
        const streakCounter = document.getElementById('streak-counter');
        const streakLargeNum = document.getElementById('streak-large-num');
        const xpText = document.getElementById('xp-text');
        const xpProgressBar = document.getElementById('xp-progress-bar');

        if (streakCounter) streakCounter.textContent = this.currentUser.current_streak;
        if (streakLargeNum) streakLargeNum.textContent = this.currentUser.current_streak;
        if (xpText) xpText.textContent = this.currentUser.xp_points;

        // Gamification Level calculations (e.g. 100 XP per Level)
        const nextLevelXp = 100;
        const xpInCurrentLevel = this.currentUser.xp_points % nextLevelXp;
        const progressPercent = Math.min((xpInCurrentLevel / nextLevelXp) * 100, 100);
        
        if (xpProgressBar) {
            xpProgressBar.style.width = `${progressPercent}%`;
        }

        // Dynamically alter streak motivation card description
        const streakMotivateText = document.getElementById('streak-motivate-text');
        if (streakMotivateText) {
            if (this.currentUser.current_streak === 0) {
                streakMotivateText.textContent = "Inicie sua jornada espiritual hoje! Faça o seu devocional diário para marcar sua primeira sequência.";
            } else if (this.currentUser.current_streak < 7) {
                const daysRemaining = 7 - this.currentUser.current_streak;
                streakMotivateText.textContent = `Que constância inspiradora! Continue firme por mais ${daysRemaining} dias para desbloquear a Medalha de Bronze Guerreiro da Fé.`;
            } else {
                streakMotivateText.textContent = `Sequência incrível de ${this.currentUser.current_streak} dias! Você está protegendo ativamente seu coração através da comunhão diária.`;
            }
        }
    }

    // =========================================================================
    //  ✨ SISTEMA DE TEMAS (Modo Claro & Escuro Celestial)
    // =========================================================================
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('ae_theme', theme);
        
        // Atualiza ícone/visual do toggle de tema
        const thumb = document.querySelector('.theme-toggle-thumb');
        if (thumb) {
            thumb.textContent = theme === 'light' ? '☀️' : '🌙';
        }
    }

    setupThemeToggle() {
        const toggle = document.getElementById('theme-toggle');
        if (toggle) {
            // Remove listeners antigos clonando o elemento
            const newToggle = toggle.cloneNode(true);
            toggle.parentNode.replaceChild(newToggle, toggle);
            
            newToggle.addEventListener('click', () => {
                this.theme = this.theme === 'dark' ? 'light' : 'dark';
                this.applyTheme(this.theme);
            });
        }
    }

    // =========================================================================
    //  ✨ SISTEMA DE AUTENTICAÇÃO CELESTIAL (Supabase + Local-First Fallback)
    // =========================================================================
    async checkAuthStatus() {
        const loggedInUserStr = localStorage.getItem('ae_logged_in_user');
        const authScreen = document.getElementById('auth-screen');
        
        if (loggedInUserStr) {
            try {
                const session = JSON.parse(loggedInUserStr);
                this.currentUserSession = session;
                
                // Carrega o perfil do usuário
                this.currentUser = await db.getProfile(session.id);
                
                if (this.currentUser) {
                    this.updateHeaderUI();
                    this.updateProfileUI();
                    
                    if (authScreen) {
                        authScreen.classList.add('hidden');
                    }
                    this.stopAuthParticles();
                    return;
                }
            } catch (e) {
                console.error('Falha ao ler sessão de login local:', e);
            }
        }
        
        // Se não houver usuário ativo, exibe a tela celestial de login
        if (authScreen) {
            authScreen.classList.remove('hidden');
            this.startAuthParticles();
        }
    }

    setupAuthListeners() {
        const btnShowRegister = document.getElementById('btn-show-register');
        const btnShowLogin = document.getElementById('btn-show-login');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const authError = document.getElementById('auth-error');
        const registerError = document.getElementById('register-error');
        
        if (btnShowRegister) {
            btnShowRegister.addEventListener('click', () => {
                if (loginForm) loginForm.style.display = 'none';
                if (registerForm) registerForm.style.display = 'block';
                if (authError) {
                    authError.textContent = '';
                    authError.classList.remove('visible');
                }
            });
        }
        
        if (btnShowLogin) {
            btnShowLogin.addEventListener('click', () => {
                if (registerForm) registerForm.style.display = 'none';
                if (loginForm) loginForm.style.display = 'block';
                if (registerError) {
                    registerError.textContent = '';
                    registerError.classList.remove('visible');
                }
            });
        }
        
        // Form de Login
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('login-email').value.trim();
                const password = document.getElementById('login-password').value;
                
                if (authError) {
                    authError.textContent = '';
                    authError.classList.remove('visible');
                }
                
                const submitBtn = loginForm.querySelector('.auth-submit-btn');
                const originalText = submitBtn ? submitBtn.textContent : 'ENTRAR';
                if (submitBtn) {
                    submitBtn.textContent = 'AUTENTICANDO...';
                    submitBtn.disabled = true;
                }
                
                try {
                    let session = null;
                    let profile = null;
                    
                    // 1. Tentar Autenticar com o Supabase Real
                    const supabase = window.supabase;
                    if (supabase) {
                        try {
                            const client = supabase.createClient(
                                "https://czxgkiunpdpjflqqgthd.supabase.co", 
                                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6eGdraXVucGRwamZscXFndGhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNzMxNjQsImV4cCI6MjA5NDk0OTE2NH0.P_Lt5MNci9PsXJWOcc7A0fEVOpW27cbybd5RSv9Z4uw"
                            );
                            const { data, error } = await client.auth.signInWithPassword({ email, password });
                            if (!error && data.user) {
                                session = {
                                    id: data.user.id,
                                    email: data.user.email,
                                    authType: 'supabase'
                                };
                                profile = await db.getProfile(data.user.id);
                            }
                        } catch (err) {
                            console.warn("Conexão ao Supabase falhou, usando autenticação local:", err);
                        }
                    }
                    
                    // 2. Fallback Local-First (Offline)
                    if (!session) {
                        const localAccounts = JSON.parse(localStorage.getItem('ae_local_accounts') || '[]');
                        const account = localAccounts.find(a => a.email.toLowerCase() === email.toLowerCase() && a.password === password);
                        
                        if (account) {
                            session = {
                                id: account.id,
                                email: account.email,
                                authType: 'local'
                            };
                            profile = await db.getProfile(account.id);
                            if (!profile) {
                                const profiles = JSON.parse(localStorage.getItem('ae_profiles') || '[]');
                                profile = {
                                    id: account.id,
                                    username: account.username || email.split('@')[0],
                                    current_streak: 0,
                                    longest_streak: 0,
                                    last_reading_date: null,
                                    xp_points: 0
                                };
                                profiles.push(profile);
                                localStorage.setItem('ae_profiles', JSON.stringify(profiles));
                            }
                        }
                    }
                    
                    if (session && profile) {
                        localStorage.setItem('ae_logged_in_user', JSON.stringify(session));
                        this.currentUserSession = session;
                        this.currentUser = profile;
                        
                        this.updateHeaderUI();
                        this.updateProfileUI();
                        
                        loginForm.reset();
                        const authScreen = document.getElementById('auth-screen');
                        if (authScreen) authScreen.classList.add('hidden');
                        this.stopAuthParticles();
                        
                        // Recarrega telas
                        await this.renderCurrentScreen();
                    } else {
                        if (authError) {
                            authError.textContent = 'E-mail ou senha incorretos.';
                            authError.classList.add('visible');
                        }
                    }
                } catch (err) {
                    console.error("Erro ao fazer login:", err);
                    if (authError) {
                        authError.textContent = 'Erro de rede. Tente novamente.';
                        authError.classList.add('visible');
                    }
                } finally {
                    if (submitBtn) {
                        submitBtn.textContent = originalText;
                        submitBtn.disabled = false;
                    }
                }
            });
        }
        
        // Form de Registro
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const name = document.getElementById('register-name').value.trim();
                const email = document.getElementById('register-email').value.trim();
                const password = document.getElementById('register-password').value;
                
                if (registerError) {
                    registerError.textContent = '';
                    registerError.classList.remove('visible');
                }
                
                const submitBtn = registerForm.querySelector('.auth-submit-btn');
                const originalText = submitBtn ? submitBtn.textContent : 'CRIAR MINHA CONTA';
                if (submitBtn) {
                    submitBtn.textContent = 'CRIANDO CONTA...';
                    submitBtn.disabled = true;
                }
                
                try {
                    let session = null;
                    let profile = null;
                    
                    // 1. Tentar Cadastro no Supabase Real
                    const supabase = window.supabase;
                    if (supabase) {
                        try {
                            const client = supabase.createClient(
                                "https://czxgkiunpdpjflqqgthd.supabase.co", 
                                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6eGdraXVucGRwamZscXFndGhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNzMxNjQsImV4cCI6MjA5NDk0OTE2NH0.P_Lt5MNci9PsXJWOcc7A0fEVOpW27cbybd5RSv9Z4uw"
                            );
                            const { data, error } = await client.auth.signUp({
                                email,
                                password,
                                options: { data: { full_name: name } }
                            });
                            
                            if (error) {
                                if (error.message.includes("already registered") || error.status === 422) {
                                    if (registerError) {
                                        registerError.textContent = 'Este e-mail já está em uso no servidor.';
                                        registerError.classList.add('visible');
                                    }
                                    return;
                                }
                            }
                            
                            if (!error && data.user) {
                                session = {
                                    id: data.user.id,
                                    email: data.user.email,
                                    authType: 'supabase'
                                };
                                
                                const defaultProfile = {
                                    id: data.user.id,
                                    username: name,
                                    current_streak: 0,
                                    longest_streak: 0,
                                    last_reading_date: null,
                                    xp_points: 0
                                };
                                
                                try {
                                    await client.from('profiles').insert(defaultProfile);
                                } catch (pErr) {
                                    console.warn("Erro ao registrar perfil no Supabase:", pErr);
                                }
                                profile = defaultProfile;
                            }
                        } catch (err) {
                            console.warn("Falha de rede Supabase, cadastrando localmente:", err);
                        }
                    }
                    
                    // 2. Fallback Local-First (Offline)
                    if (!session) {
                        const localAccounts = JSON.parse(localStorage.getItem('ae_local_accounts') || '[]');
                        
                        if (localAccounts.some(a => a.email.toLowerCase() === email.toLowerCase())) {
                            if (registerError) {
                                registerError.textContent = 'Este e-mail já está em uso localmente.';
                                registerError.classList.add('visible');
                            }
                            return;
                        }
                        
                        const newId = 'usr-' + Math.random().toString(36).substr(2, 9);
                        const newAccount = {
                            id: newId,
                            username: name,
                            email,
                            password
                        };
                        
                        localAccounts.push(newAccount);
                        localStorage.setItem('ae_local_accounts', JSON.stringify(localAccounts));
                        
                        session = {
                            id: newId,
                            email,
                            authType: 'local'
                        };
                        
                        const profiles = JSON.parse(localStorage.getItem('ae_profiles') || '[]');
                        profile = {
                            id: newId,
                            username: name,
                            current_streak: 0,
                            longest_streak: 0,
                            last_reading_date: null,
                            xp_points: 0
                        };
                        profiles.push(profile);
                        localStorage.setItem('ae_profiles', JSON.stringify(profiles));
                    }
                    
                    if (session && profile) {
                        localStorage.setItem('ae_logged_in_user', JSON.stringify(session));
                        this.currentUserSession = session;
                        this.currentUser = profile;
                        
                        this.updateHeaderUI();
                        this.updateProfileUI();
                        
                        registerForm.reset();
                        const authScreen = document.getElementById('auth-screen');
                        if (authScreen) authScreen.classList.add('hidden');
                        this.stopAuthParticles();
                        
                        await this.renderCurrentScreen();
                    }
                } catch (err) {
                    console.error("Erro no cadastro:", err);
                    if (registerError) {
                        registerError.textContent = 'Erro ao criar conta. Tente novamente.';
                        registerError.classList.add('visible');
                    }
                } finally {
                    if (submitBtn) {
                        submitBtn.textContent = originalText;
                        submitBtn.disabled = false;
                    }
                }
            });
        }

        // Ação de Logout
        const btnLogout = document.getElementById('btn-logout');
        if (btnLogout) {
            btnLogout.addEventListener('click', async () => {
                const confirmLogout = confirm("Deseja realmente sair da sua conta?");
                if (!confirmLogout) return;
                
                this.stopAudioDevotional();
                
                try {
                    if (this.currentUserSession && this.currentUserSession.authType === 'supabase') {
                        const supabase = window.supabase;
                        if (supabase) {
                            try {
                                const client = supabase.createClient(
                                    "https://czxgkiunpdpjflqqgthd.supabase.co", 
                                    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6eGdraXVucGRwamZscXFndGhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNzMxNjQsImV4cCI6MjA5NDk0OTE2NH0.P_Lt5MNci9PsXJWOcc7A0fEVOpW27cbybd5RSv9Z4uw"
                                );
                                await client.auth.signOut();
                            } catch (e) {
                                console.warn("Erro ao fazer signout no Supabase:", e);
                            }
                        }
                    }
                } catch (e) {
                    console.error("Erro no logout:", e);
                }
                
                // Limpar sessão local
                localStorage.removeItem('ae_logged_in_user');
                this.currentUserSession = null;
                this.currentUser = null;
                
                // Exibir tela de login
                const authScreen = document.getElementById('auth-screen');
                if (authScreen) authScreen.classList.remove('hidden');
                this.startAuthParticles();
                
                // Resetar aba visível do app para home
                const homeBtn = document.querySelector('.nav-item[data-target="screen-home"]');
                if (homeBtn) homeBtn.click();
            });
        }
    }

    // =========================================================================
    //  ✨ ÁREA DE USUÁRIO & FOTO DE PERFIL (Base64 com persistência e XP)
    // =========================================================================
    updateProfileUI() {
        if (!this.currentUser) return;
        
        const displayNameEl = document.getElementById('profile-display-name');
        const emailEl = document.getElementById('profile-email');
        const avatarDisplay = document.getElementById('profile-avatar-display');
        const headerAvatar = document.getElementById('header-avatar');
        
        if (displayNameEl) {
            displayNameEl.textContent = this.currentUser.username || 'Guerreiro da Fé';
        }
        
        if (emailEl) {
            emailEl.textContent = this.currentUserSession ? this.currentUserSession.email : 'email@aeterna.app';
        }
        
        const photoUrl = this.currentUser.profile_photo || '';
        
        if (photoUrl) {
            if (avatarDisplay) {
                avatarDisplay.innerHTML = `<img src="${photoUrl}" alt="Avatar" class="profile-avatar-img" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            }
            if (headerAvatar) {
                headerAvatar.src = photoUrl;
                headerAvatar.style.display = 'block';
            }
        } else {
            if (avatarDisplay) {
                avatarDisplay.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="36" height="36"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
            }
            if (headerAvatar) {
                headerAvatar.src = '';
                headerAvatar.style.display = 'none';
            }
        }
    }

    setupPhotoUploadListeners() {
        const avatarTrigger = document.getElementById('profile-avatar-trigger');
        
        if (avatarTrigger) {
            // Remove event listeners antigos clonando o elemento
            const newTrigger = avatarTrigger.cloneNode(true);
            avatarTrigger.parentNode.replaceChild(newTrigger, avatarTrigger);
            
            // Re-fetch input do novo DOM
            const newPhotoInput = document.getElementById('profile-photo-input');
            
            newTrigger.addEventListener('click', () => {
                if (newPhotoInput) newPhotoInput.click();
            });
            
            if (newPhotoInput) {
                // Remove listener anterior para evitar duplicações
                const oldInput = newPhotoInput.cloneNode(true);
                newPhotoInput.parentNode.replaceChild(oldInput, newPhotoInput);
                
                oldInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    
                    if (!file.type.startsWith('image/')) {
                        alert("Por favor, selecione uma imagem válida.");
                        return;
                    }
                    
                    if (file.size > 1.5 * 1024 * 1024) {
                        alert("A imagem selecionada é muito grande. Escolha uma foto de até 1.5MB.");
                        return;
                    }
                    
                    const reader = new FileReader();
                    reader.onload = async (event) => {
                        const base64Image = event.target.result;
                        
                        try {
                            // Atualiza foto no perfil
                            this.currentUser = await db.updateProfile(this.currentUser.id, {
                                profile_photo: base64Image
                            });
                            
                            this.updateProfileUI();
                            
                            // Bônus gamificado: +15 XP por completar o perfil espiritual!
                            await this.awardXpPoints(15);
                            alert("Foto de perfil atualizada com sucesso! Você conquistou +15 XP pela personalização celestial!");
                        } catch (err) {
                            console.error("Erro ao atualizar foto de perfil:", err);
                            alert("Erro ao salvar a foto de perfil.");
                        }
                    };
                    
                    reader.readAsDataURL(file);
                });
            }
        }
    }

    // =========================================================================
    //  ✨ EFEITOS CELESTIAIS CONTÍNUOS NA TELA DE LOGIN (Partículas Ouro-Estelar)
    // =========================================================================
    startAuthParticles() {
        const canvas = document.getElementById('auth-particles');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        const resizeCanvas = () => {
            if (canvas) {
                canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
                canvas.height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;
            }
        };
        
        window.removeEventListener('resize', resizeCanvas);
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        this._authParticles = [];
        this._authParticleAnimId = null;

        for (let i = 0; i < 40; i++) {
            this._authParticles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2 + 0.5,
                speedX: (Math.random() - 0.5) * 0.3,
                speedY: (Math.random() - 0.5) * 0.3 - 0.15,
                opacity: Math.random() * 0.5 + 0.1,
                fadeDir: Math.random() > 0.5 ? 1 : -1
            });
        }

        const animate = () => {
            if (!canvas || !ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            for (const p of this._authParticles) {
                p.x += p.speedX;
                p.y += p.speedY;
                p.opacity += p.fadeDir * 0.003;
                
                if (p.opacity > 0.6) p.fadeDir = -1;
                if (p.opacity < 0.05) p.fadeDir = 1;
                
                if (p.y < -10) p.y = canvas.height + 10;
                if (p.x < -10) p.x = canvas.width + 10;
                if (p.x > canvas.width + 10) p.x = -10;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = this.theme === 'light' ? `rgba(184, 134, 11, ${p.opacity})` : `rgba(227, 167, 91, ${p.opacity})`;
                ctx.fill();
            }
            
            this._authParticleAnimId = requestAnimationFrame(animate);
        };

        animate();
    }

    stopAuthParticles() {
        if (this._authParticleAnimId) {
            cancelAnimationFrame(this._authParticleAnimId);
            this._authParticleAnimId = null;
        }
    }

    // --- NAVIGATION SYSTEM (SPA) ---
    setupNavigation() {
        const navItems = document.querySelectorAll('.app-nav-bar .nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const button = e.currentTarget;
                const target = button.getAttribute('data-target');
                
                // Toggle active state in nav menu
                navItems.forEach(i => i.classList.remove('active'));
                button.classList.add('active');

                // Switch visible screen
                this.switchScreen(target);
            });
        });

        // Hub plan subscription redirects
        document.querySelectorAll('.link-to-hub').forEach(btn => {
            btn.addEventListener('click', () => {
                const hubBtn = document.querySelector('.nav-item[data-target="screen-hub"]');
                if (hubBtn) hubBtn.click();
            });
        });
    }

    switchScreen(screenId) {
        // Remove active class from all screens
        document.querySelectorAll('.app-screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // Add to targeted screen
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.currentScreen = screenId;
            this.renderCurrentScreen();
        }
    }

    // --- SCREEN INITIALIZATION RENDERING ---
    async renderCurrentScreen() {
        if (this.currentScreen !== 'screen-home') {
            this.stopAudioDevotional();
        }

        switch (this.currentScreen) {
            case 'screen-home':
                await this.renderHomeScreen();
                break;
            case 'screen-hub':
                await this.renderHubScreen();
                break;
            case 'screen-reader':
                await this.renderReaderScreen();
                break;
            case 'screen-prayers':
                await this.renderPrayersScreen();
                break;
            case 'screen-profile':
                await this.renderProfileScreen();
                break;
        }
    }

    // --- TELA 1: HOME & DEVOCIONAL AUTOMÁTICO ---
    async renderHomeScreen() {
        // 1. Load Daily Devotional
        const devotional = await db.getDailyDevotional(this.todayStr);
        if (devotional) {
            document.getElementById('devocional-date').textContent = this.formatDevotionalDate(this.todayStr);
            document.getElementById('devocional-verse-text').innerHTML = `“${devotional.verse_text}”`;
            document.getElementById('devocional-verse-ref').textContent = devotional.verse_reference;
            document.getElementById('devocional-reflection').textContent = devotional.reflection;
            document.getElementById('devocional-prayer').textContent = devotional.prayer_text;
            document.getElementById('devocional-challenge').textContent = devotional.challenge_of_the_day;
            
            // Check if already completed today to prevent duplicate streak increments
            const btnComplete = document.getElementById('btn-complete-devotional');
            if (this.currentUser.last_reading_date === this.todayStr) {
                btnComplete.disabled = true;
                btnComplete.innerHTML = '<span>DEVOCIONAL CONCLUÍDO HOJE!</span>';
                btnComplete.style.opacity = '0.5';
                btnComplete.style.cursor = 'not-allowed';
            } else {
                btnComplete.disabled = false;
                btnComplete.innerHTML = '<span>CONCLUIR DEVOCIONAL</span><span class="badge-xp">+10 XP</span>';
                btnComplete.style.opacity = '1';
                btnComplete.style.cursor = 'pointer';
            }
        }

        // 2. Load Current User Plan
        this.activePlan = await db.getActiveUserPlan();
        const noPlanMsg = document.getElementById('no-active-plan-msg');
        const planContainer = document.getElementById('active-plan-container');

        if (!this.activePlan) {
            noPlanMsg.classList.remove('hidden');
            planContainer.classList.add('hidden');
        } else {
            noPlanMsg.classList.add('hidden');
            planContainer.classList.remove('hidden');

            const planDetails = await db.getReadingPlans();
            const planMeta = planDetails.find(p => p.id === this.activePlan.plan_id);
            const planDays = await db.getReadingPlanDays(this.activePlan.plan_id);
            
            // Calculate progress stats
            const totalDays = planDays.length;
            const currentDayNum = Math.min(this.activePlan.current_day, totalDays);
            const percent = Math.round(( (currentDayNum - 1) / totalDays ) * 100);

            document.getElementById('active-plan-title').textContent = planMeta.title;
            document.getElementById('active-plan-day-info').textContent = `Dia ${currentDayNum} de ${totalDays}`;
            document.getElementById('active-plan-percent').textContent = `${percent}%`;
            document.getElementById('active-plan-progress-bar').style.width = `${percent}%`;
            
            const currentDayData = planDays.find(d => d.day_number === currentDayNum);
            if (currentDayData) {
                document.getElementById('active-plan-day-target').textContent = currentDayData.target_chapters;
            }
        }
    }

    // --- TELA 2: HUB DE TRILHAS E REAGENDAMENTO ---
    async renderHubScreen() {
        const plansGrid = document.getElementById('plans-grid');
        plansGrid.innerHTML = '';

        const plans = await db.getReadingPlans();
        const userPlans = db._get('ae_user_plans'); // fetch locally directly for rendering speed

        // Category filter active tab
        const activeFilterEl = document.querySelector('.filter-tab.active');
        const activeFilter = activeFilterEl ? activeFilterEl.getAttribute('data-category') : 'todos';
        const filteredPlans = activeFilter === 'todos' ? plans : plans.filter(p => p.category === activeFilter);

        for (const plan of filteredPlans) {
            const planDays = await db.getReadingPlanDays(plan.id);
            const userPlan = userPlans.find(up => up.plan_id === plan.id);
            
            let buttonHtml = '';
            let progressHtml = '';

            if (userPlan) {
                const total = planDays.length;
                const progressPercent = Math.round(( (userPlan.current_day - 1) / total ) * 100);

                progressHtml = `
                    <div style="margin: 15px 0 10px 0;">
                        <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--color-secondary); margin-bottom:5px;">
                            <span>Progresso</span>
                            <span>Dia ${Math.min(userPlan.current_day, total)} de ${total} (${progressPercent}%)</span>
                        </div>
                        <div class="plan-progress-track-small" style="margin:0;">
                            <div class="plan-progress-fill" style="width: ${progressPercent}%"></div>
                        </div>
                    </div>
                `;

                if (userPlan.status === 'completed') {
                    buttonHtml = `<button class="btn-secondary w-full" disabled style="color:#90EE90; border-color:#90EE90">CONCLUÍDO</button>`;
                } else {
                    buttonHtml = `<button class="btn-primary w-full btn-resume-plan" data-plan-id="${plan.id}">RETOMAR LEITURA</button>`;
                }
            } else {
                buttonHtml = `<button class="btn-secondary w-full btn-enroll-plan" data-plan-id="${plan.id}">INSCREVER-SE</button>`;
            }

            const card = document.createElement('div');
            card.className = 'glass-card plan-card animate-card';
            card.innerHTML = `
                <div class="plan-card-body">
                    <span class="card-tag">${plan.category}</span>
                    <h3>${plan.title}</h3>
                    <p>${plan.description}</p>
                    ${progressHtml}
                </div>
                <div class="plan-meta-stats">
                    <span>
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        ${planDays.length * 5} min
                    </span>
                    <span>${planDays.length} dias</span>
                </div>
                <div class="plan-card-actions">
                    ${buttonHtml}
                </div>
            `;
            plansGrid.appendChild(card);
        }

        // Bind Enroll / Resume buttons
        document.querySelectorAll('.btn-enroll-plan').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const planId = e.currentTarget.getAttribute('data-plan-id');
                await db.enrollInPlan(this.currentUser.id, planId);
                await this.renderHubScreen();
                // Redirect straight to Bible Reader
                const planDays = await db.getReadingPlanDays(planId);
                if (planDays.length > 0) {
                    this.openPlanReader(planDays[0].target_chapters);
                }
            });
        });

        document.querySelectorAll('.btn-resume-plan').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const planId = e.currentTarget.getAttribute('data-plan-id');
                
                // --- ANTI-ACCUMULATION RESCHEDULE ENGINE ---
                // Retrieve user plans records to check dates
                const userPlan = await db.getUserPlan(this.currentUser.id, planId);
                if (userPlan && userPlan.last_interaction_date) {
                    const lastDate = new Date(userPlan.last_interaction_date);
                    const todayDate = new Date(this.todayStr);
                    const diffTime = Math.abs(todayDate - lastDate);
                    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

                    // If missed reading by more than 1 day, shift enrollment forward automatically
                    if (diffDays > 1) {
                        await db.updateEnrollmentDate(this.currentUser.id, planId, diffDays);
                        // Alert user of the anti-guilt re-scheduling
                        this.triggerAntiAccumulationNotification();
                    }
                }
                
                // Redirect user plan target to Bible Reader
                await db.enrollInPlan(this.currentUser.id, planId); // Re-activate
                const planDays = await db.getReadingPlanDays(planId);
                const currentDayNum = Math.min(userPlan.current_day, planDays.length);
                const dayData = planDays.find(d => d.day_number === currentDayNum);
                
                if (dayData) {
                    this.openPlanReader(dayData.target_chapters);
                }
            });
        });
    }

    openPlanReader(targetChapters) {
        // Parses strings like "Provérbios 1" or "Filipenses 4"
        const lastSpaceIdx = targetChapters.lastIndexOf(' ');
        const bookName = lastSpaceIdx > 0 ? targetChapters.substring(0, lastSpaceIdx) : targetChapters;
        const chapter = lastSpaceIdx > 0 ? (parseInt(targetChapters.substring(lastSpaceIdx + 1)) || 1) : 1;

        this.selectedBook = bookName;
        this.selectedChapter = chapter;

        // Trigger switch to Reader Screen
        const readerBtn = document.querySelector('.nav-item[data-target="screen-reader"]');
        if (readerBtn) readerBtn.click();
    }

    triggerAntiAccumulationNotification() {
        const body = document.body;
        const banner = document.createElement('div');
        banner.className = 'glass-card animate-scale';
        banner.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1000;
            max-width: 500px;
            width: calc(100% - 40px);
            border-color: rgba(227, 167, 91, 0.4);
            background: linear-gradient(135deg, rgba(227, 167, 91, 0.15) 0%, rgba(13, 13, 17, 0.95) 100%);
            padding: 20px;
            box-shadow: 0 15px 40px rgba(0,0,0,0.6);
        `;

        banner.innerHTML = `
            <div style="display:flex; gap:12px; align-items:flex-start;">
                <span style="font-size:2rem;">✨</span>
                <div>
                    <h4 style="font-family:var(--font-heading); color:var(--color-accent); font-weight:700; margin-bottom:4px;">EVOLUÇÃO SEM CULPA!</h4>
                    <p style="font-size:0.8rem; line-height:1.4; color:var(--color-secondary);">Percebemos que você ficou alguns dias sem acessar. Não se preocupe! Reprogramamos seu cronograma para frente para que você avance sem acúmulo de tarefas e sem pressa.</p>
                </div>
            </div>
            <div style="text-align:right; margin-top:15px;">
                <button class="btn-primary-small btn-close-reschedule" style="width:auto; padding:6px 16px;">Entendido</button>
            </div>
        `;

        body.appendChild(banner);
        
        banner.querySelector('.btn-close-reschedule').addEventListener('click', () => {
            banner.remove();
        });
    }

    // --- TELA 3: LEITOR BÍBLICO INTELIGENTE ---
    async renderReaderScreen() {
        const selectBook = document.getElementById('select-book');
        const selectChapter = document.getElementById('select-chapter');
        const versesList = document.getElementById('bible-text-content');

        // Show loading state while Bible data loads
        if (versesList) versesList.innerHTML = '<span class="verse-item" style="color: var(--color-accent); font-style: italic;">Carregando Bíblia completa... Por favor aguarde.</span>';

        try {
            // Populate Book select dropdown
            const books = await db.getBibleBooks();
            
            if (books.length === 0) {
                if (versesList) versesList.innerHTML = '<span class="verse-item" style="color: #ff6b6b;">Erro: Não foi possível carregar os livros da Bíblia. Recarregue a página.</span>';
                return;
            }
            
            selectBook.innerHTML = '';
            books.forEach(b => {
                const opt = document.createElement('option');
                opt.value = b.name;
                opt.textContent = b.name;
                if (b.name === this.selectedBook) opt.selected = true;
                selectBook.appendChild(opt);
            });

            // If selectedBook doesn't exist in the list, default to first book
            if (!books.find(b => b.name === this.selectedBook)) {
                this.selectedBook = books[0].name;
                selectBook.value = this.selectedBook;
            }

            // Populate Chapter dropdown based on book
            await this.populateChaptersDropdown();

            // Load Chapter text and render
            await this.renderBibleText();
        } catch (e) {
            console.error('Erro ao renderizar leitor bíblico:', e);
            if (versesList) versesList.innerHTML = '<span class="verse-item" style="color: #ff6b6b;">Erro ao carregar. Recarregue a página.</span>';
        }
    }

    async populateChaptersDropdown() {
        const selectChapter = document.getElementById('select-chapter');
        const chapters = await db.getBibleChapters(this.selectedBook);
        
        selectChapter.innerHTML = '';
        chapters.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            if (c === this.selectedChapter) opt.selected = true;
            selectChapter.appendChild(opt);
        });
    }

    getHighlights() {
        if (!this.currentUser) return [];
        try {
            const key = `ae_highlights_${this.currentUser.id}`;
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Erro ao ler grifos do localStorage:', e);
            return [];
        }
    }

    saveHighlights(highlights) {
        if (!this.currentUser) return;
        try {
            const key = `ae_highlights_${this.currentUser.id}`;
            localStorage.setItem(key, JSON.stringify(highlights));
        } catch (e) {
            console.error('Erro ao salvar grifos no localStorage:', e);
        }
    }

    async renderBibleText() {
        const versesList = document.getElementById('bible-text-content');
        const chapterTitle = document.getElementById('bible-chapter-title');
        
        versesList.innerHTML = '';
        chapterTitle.textContent = `${this.selectedBook} ${this.selectedChapter}`;

        // Track this chapter as read in the progress map
        this.markChapterInProgressMap(this.selectedBook, this.selectedChapter);

        const verses = await db.getBibleVerses(this.selectedBook, this.selectedChapter);
        const highlights = this.getHighlights();
        
        verses.forEach(v => {
            const span = document.createElement('span');
            span.className = 'verse-item';
            
            const verseRefKey = `${this.selectedBook} ${this.selectedChapter}:${v.verse}`;
            if (highlights.includes(verseRefKey)) {
                span.classList.add('highlighted');
            }
            
            if (v.study_note) {
                span.classList.add('has-note');
                span.setAttribute('data-note', v.study_note);
            }
            span.setAttribute('data-verse', v.verse);
            span.innerHTML = `<span class="verse-num">${v.verse}</span>${v.text} `;
            
            // Active Study Action Sheet Trigger for all verses
            span.addEventListener('click', (e) => {
                const target = e.currentTarget;
                const verseNum = target.getAttribute('data-verse');
                const note = target.getAttribute('data-note') || 'Nenhuma nota teológica disponível para este versículo.';
                this.openActiveStudyDrawer(`${this.selectedBook} ${this.selectedChapter}:${verseNum}`, target.innerText, note);
            });

            versesList.appendChild(span);
        });

        // Toggle FAB state based on log records
        const btnMarkRead = document.getElementById('btn-mark-chapter-read');
        const userLogs = await db.getReadingLogs(this.currentUser.id);
        
        const isLogged = userLogs.some(l => 
            this.activePlan && 
            l.plan_id === this.activePlan.plan_id && 
            l.day_number === this.activePlan.current_day
        );

        if (!this.activePlan) {
            btnMarkRead.disabled = true;
            btnMarkRead.innerHTML = '<span>INSCREVA-SE EM UM PLANO PARA MARCAR PROGRESSO</span>';
            btnMarkRead.style.opacity = '0.5';
        } else if (isLogged) {
            btnMarkRead.disabled = true;
            btnMarkRead.innerHTML = '<span>CAPÍTULO DO PLANO CONCLUÍDO!</span>';
            btnMarkRead.style.opacity = '0.7';
        } else {
            btnMarkRead.disabled = false;
            btnMarkRead.innerHTML = '<span>MARCAR CAPÍTULO COMO LIDO</span><span class="badge-xp">+10 XP</span>';
            btnMarkRead.style.opacity = '1';
        }
    }

    getOriginalLanguageInsight(bookName, verseRef) {
        // List of OT books (in Portuguese)
        const otBooks = [
            'Gênesis', 'Êxodo', 'Levítico', 'Números', 'Deuteronômio', 'Josué', 'Juízes', 'Rute',
            '1 Samuel', '2 Samuel', '1 Reis', '2 Reis', '1 Crônicas', '2 Crônicas', 'Esdras',
            'Neemias', 'Ester', 'Jó', 'Salmos', 'Provérbios', 'Eclesiastes', 'Cânticos',
            'Isaías', 'Jeremias', 'Lamentações', 'Ezequiel', 'Daniel', 'Oséias', 'Joel',
            'Amós', 'Obadias', 'Jonas', 'Miquéias', 'Naum', 'Habacuque', 'Sofonias', 'Ageu',
            'Zacarias', 'Malaquias'
        ];

        const isOT = otBooks.includes(bookName);

        const hebrewWords = [
            { word: 'Hokhmah (חָכְמָה)', desc: 'Significa "Sabedoria Divina" — a habilidade prática de viver em harmonia com os princípios celestiais de Deus.' },
            { word: 'Hesed (חֶסֶד)', desc: 'Significa "Amor Fiel e Aliança" — o amor inabalável, misericordioso e eterno de Deus que nunca desiste de Seu povo.' },
            { word: 'Shalom (שָׁלוֹם)', desc: 'Significa "Paz Completa" — mais do que ausência de conflito; denota integridade, saúde e harmonia plena com o Criador.' },
            { word: 'Elohim (אֱלֹהִים)', desc: 'Significa "Criador Supremo" — descreve a majestade, soberania e o poder transcendente de Deus sobre toda a criação.' },
            { word: 'Kadosh (קָדוֹשׁ)', desc: 'Significa "Santo ou Consagrado" — a separação absoluta de Deus do pecado; a pureza perfeita de Sua essência majestosa.' },
            { word: 'Shema (שְׁמַע)', desc: 'Significa "Ouça e Obedeça" — a audição ativa das palavras de Deus que se traduz em uma resposta de amor prático.' },
            { word: 'Ruah (רוּחַ)', desc: 'Significa "Sopro, Vento ou Espírito" — a energia invisível e divina que gera vida física e renovação espiritual.' }
        ];

        const greekWords = [
            { word: 'Logos (Λόγος)', desc: 'Significa "A Palavra Viva" — a revelação da mente e propósito de Deus encarnada perfeitamente em Jesus Cristo.' },
            { word: 'Agape (Ἀγάπη)', desc: 'Significa "Amor Sacrificial e Incondicional" — o amor divino que escolhe doar-se inteiramente pelo bem do outro imerecidamente.' },
            { word: 'Charis (Χάρις)', desc: 'Significa "Graça" — o favor imerecido e a força capacitadora de Deus que nos resgata e nos transforma diariamente.' },
            { word: 'Pneuma (Πneῦμα)', desc: 'Significa "Espírito" — refere-se ao Espírito Santo que habita no crente, ensinando-nos e guiando-nos em toda a verdade.' },
            { word: 'Koinonia (Κοινωνία)', desc: 'Significa "Comunhão Íntima" — a parceria espiritual e o compartilhamento profundo da vida comum baseada na fé.' },
            { word: 'Zoe (Ζωή)', desc: 'Significa "Vida Abundante e Eterna" — a essência inabalável da vida ressuscitada que nos une a Deus para sempre.' },
            { word: 'Eirene (Εἰρήνη)', desc: 'Significa "Paz Celestial" — o descanso interior e a tranquilidade da alma fundamentados na salvação em Cristo.' }
        ];

        const words = isOT ? hebrewWords : greekWords;

        // Generate a simple deterministic hash code from the verse reference
        let hash = 0;
        for (let i = 0; i < verseRef.length; i++) {
            hash = verseRef.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        const index = Math.abs(hash) % words.length;
        const selected = words[index];

        return {
            title: (isOT ? 'Hebraico: ' : 'Grego: ') + selected.word,
            desc: selected.desc
        };
    }

    openActiveStudyDrawer(verseTitle, text, note) {
        document.getElementById('drawer-verse-title').textContent = verseTitle;
        document.getElementById('drawer-verse-text-copy').innerHTML = `“${text.substring(text.indexOf(' ')+1)}”`;
        document.getElementById('drawer-study-note-content').textContent = note;

        // Extract book name safely from verseTitle (e.g. "Provérbios 1:1" -> "Provérbios")
        let bookName = 'Provérbios';
        const lastColonIdx = verseTitle.lastIndexOf(':');
        if (lastColonIdx !== -1) {
            const upToChapter = verseTitle.substring(0, lastColonIdx);
            const lastSpaceIdx = upToChapter.lastIndexOf(' ');
            if (lastSpaceIdx !== -1) {
                bookName = upToChapter.substring(0, lastSpaceIdx).trim();
            }
        }

        // Update Dynamic Original Languages Insight
        const originalInsight = this.getOriginalLanguageInsight(bookName, verseTitle);
        const originalWordTitle = document.getElementById('drawer-original-word-title');
        const originalWordDesc = document.getElementById('drawer-original-word-desc');
        if (originalWordTitle && originalWordDesc) {
            originalWordTitle.textContent = originalInsight.title;
            originalWordDesc.textContent = originalInsight.desc;
        }

        // Load personal notes if they exist
        const notesInput = document.getElementById('drawer-personal-notes-input');
        if (notesInput) {
            if (this.currentUser) {
                const userId = this.currentUser.id;
                const notesKey = `ae_personal_notes_${userId}_${verseTitle}`;
                const savedNote = localStorage.getItem(notesKey);
                notesInput.value = savedNote || '';
            } else {
                notesInput.value = '';
            }
        }

        // Check highlight state and update button
        const highlights = this.getHighlights();
        const btnHighlight = document.getElementById('btn-toggle-highlight');
        const btnText = document.getElementById('btn-highlight-text');
        
        if (highlights.includes(verseTitle)) {
            btnHighlight.classList.add('active');
            btnText.textContent = 'Remover Grifo';
        } else {
            btnHighlight.classList.remove('active');
            btnText.textContent = 'Grifar Versículo';
        }

        document.getElementById('study-drawer-overlay').classList.add('open');
        document.getElementById('study-drawer').classList.add('open');
    }

    closeActiveStudyDrawer() {
        document.getElementById('study-drawer-overlay').classList.remove('open');
        document.getElementById('study-drawer').classList.remove('open');
    }

    // --- TELA 4: DIÁRIO DE ORAÇÃO ---
    async renderPrayersScreen() {
        // 1. Run Faith Memories (Retention trigger) query
        const memories = await db.getFaithMemories(this.currentUser.id);
        const memContainer = document.getElementById('faith-memories-container');
        
        if (memories.length === 0) {
            memContainer.classList.add('hidden');
        } else {
            memContainer.classList.remove('hidden');
            memContainer.innerHTML = '';
            
            memories.forEach(m => {
                const card = document.createElement('div');
                card.className = 'glass-card faith-memories-card animate-scale';
                card.innerHTML = `
                    <div class="faith-memories-header">MEMÓRIAS DE FÉ</div>
                    <div class="faith-memories-body">
                        <h4>Você orou por este motivo há ${m.daysAgo} dias:</h4>
                        <p>“${m.prayer.title} — ${m.prayer.description}”</p>
                        <div style="font-weight:700; font-size:0.85rem; color:var(--color-accent)">
                            Veja como a sua constância diária tem gerado frutos e paz interior!
                        </div>
                    </div>
                `;
                memContainer.appendChild(card);
            });
        }

        // 2. Render prayer list
        await this.renderPrayersList();
    }

    async renderPrayersList() {
        const prayersList = document.getElementById('prayers-list');
        prayersList.innerHTML = '';

        const activeTabEl = document.querySelector('.prayer-tab.active');
        const activeTab = activeTabEl ? activeTabEl.getAttribute('data-tab') : 'pedido';
        const list = await db.getPrayers(this.currentUser.id, activeTab);

        if (list.length === 0) {
            prayersList.innerHTML = `
                <div class="glass-card" style="text-align:center; padding:30px; color:var(--color-muted); font-size:0.85rem;">
                    Nenhum registro encontrado nesta aba. Comece expressando sua fé no diário!
                </div>
            `;
            return;
        }

        list.forEach(p => {
            const formattedDate = new Date(p.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
            
            let footerHtml = '';
            if (p.is_answered) {
                const answerDate = new Date(p.answered_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                footerHtml = `
                    <div class="prayer-answered-badge">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
                        <span>Respondida em ${answerDate}</span>
                    </div>
                `;
            } else {
                footerHtml = `
                    <button class="btn-action-small btn-answer-prayer" data-prayer-id="${p.id}">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        <span>Marcar como Respondida</span>
                    </button>
                `;
            }

            const item = document.createElement('div');
            item.className = 'glass-card prayer-item animate-card';
            item.innerHTML = `
                <div class="prayer-item-header">
                    <h4 class="prayer-item-title">${p.title}</h4>
                    <span class="prayer-type-tag ${p.type.toLowerCase()}">${p.type}</span>
                </div>
                <p class="prayer-item-desc">${p.description || ''}</p>
                <div class="prayer-item-meta">
                    <span>Criado em ${formattedDate}</span>
                    ${footerHtml}
                </div>
            `;
            prayersList.appendChild(item);
        });

        // Bind answer buttons
        document.querySelectorAll('.btn-answer-prayer').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const prayerId = e.currentTarget.getAttribute('data-prayer-id');
                await db.markPrayerAsAnswered(prayerId);
                // Give user XP for tracking gratitude updates!
                await this.awardXpPoints(5);
                await this.renderPrayersScreen();
            });
        });
    }

    // --- TELA 5: PERFIL, MEDALHAS & LEADERBOARD ---
    async renderProfileScreen() {
        // 1. Mural de Medalhas Check
        const badges = await db.getBadges(this.currentUser.id);
        const badgeTypesEarned = badges.map(b => b.badge_type);

        const toggleBadgeUI = (badgeId, earned) => {
            const badgeEl = document.getElementById(`badge-${badgeId}`);
            if (badgeEl) {
                if (earned) {
                    badgeEl.classList.remove('locked');
                    badgeEl.classList.add('active');
                } else {
                    badgeEl.classList.remove('active');
                    badgeEl.classList.add('locked');
                }
            }
        };

        toggleBadgeUI('altar_bronze', badgeTypesEarned.includes('altar_bronze'));
        toggleBadgeUI('guerreiro_fe', badgeTypesEarned.includes('guerreiro_fe'));
        toggleBadgeUI('perseveranca', badgeTypesEarned.includes('perseveranca'));

        // 2. Rankings Compilations
        const rankingList = document.getElementById('community-ranking-list');
        rankingList.innerHTML = '';

        const board = await db.getCommunityLeaderboard(this.currentUser);
        
        board.forEach((user, idx) => {
            const isMe = user.id === this.currentUser.id;
            const rankItem = document.createElement('div');
            rankItem.className = `ranking-item ${isMe ? 'me' : ''}`;
            rankItem.innerHTML = `
                <span class="rank-position">#${idx + 1}</span>
                <div class="rank-avatar">${user.username.charAt(0).toUpperCase()}</div>
                <span class="rank-username">${user.username}</span>
                <span class="rank-xp">${user.xp_points} XP</span>
            `;
            rankingList.appendChild(rankItem);
        });

        // Render Bible Progress Map
        this.renderBibleProgressMap();
    }

    // --- SYSTEM DDL MECHANICS & BUSINESS TRIGGERS ---
    
    // Streak increment mathematics & celebratory displays
    async triggerStreakActivity() {
        const today = this.todayStr;
        const lastDate = this.currentUser.last_reading_date;

        let newStreak = this.currentUser.current_streak;

        if (!lastDate) {
            // First time ever
            newStreak = 1;
        } else {
            // Calculate differences
            const last = new Date(lastDate);
            const current = new Date(today);
            const diffTime = Math.abs(current - last);
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                // Streak incremented (consecutive yesterday action)
                newStreak += 1;
            } else if (diffDays > 1) {
                // Missed day. Reset streak to 1
                newStreak = 1;
            }
            // If diffDays === 0, user already completed today, streak remains preserved.
        }

        // Award +10 XP
        const newXp = this.currentUser.xp_points + 10;
        
        // Update user profile inside localStorage (triggers longest_streak DB rules)
        this.currentUser = await db.updateProfile(this.currentUser.id, {
            current_streak: newStreak,
            last_reading_date: today,
            xp_points: newXp
        });

        this.updateHeaderUI();

        // Check and evaluate dynamic achievements triggers
        await this.checkBadgesEvaluation();

        // Trigger state-of-the-art celebration modal (Duolingo satisfaction retention focus)
        this.triggerCelebrationModal(newStreak);
    }

    async checkBadgesEvaluation() {
        // Badge 1: Altar de Bronze (First logged action)
        await db.earnBadge(this.currentUser.id, 'altar_bronze');

        // Badge 2: Guerreiro da Fé (7 days streak)
        if (this.currentUser.current_streak >= 7) {
            await db.earnBadge(this.currentUser.id, 'guerreiro_fe');
        }

        // Badge 3: Perseverança (30 days streak)
        if (this.currentUser.current_streak >= 30) {
            await db.earnBadge(this.currentUser.id, 'perseveranca');
        }
    }

    async awardXpPoints(pts) {
        const newXp = this.currentUser.xp_points + pts;
        this.currentUser = await db.updateProfile(this.currentUser.id, { xp_points: newXp });
        this.updateHeaderUI();
    }

    triggerCelebrationModal(streakCount) {
        document.getElementById('modal-streak-num').textContent = streakCount;
        
        const label = document.querySelector('.streak-huge-number .label');
        if (label) {
            label.textContent = streakCount === 1 ? 'DIA CONSECUTIVO' : 'DIAS SEGUIDOS';
        }

        const msg = document.getElementById('modal-celebration-message');
        if (streakCount === 1) {
            msg.textContent = "Excelente início! A constância espiritual começa com um único passo. Faça disso um hábito sagrado.";
        } else if (streakCount === 7) {
            msg.textContent = "Incrível! Sequência de 7 dias de leitura e devocionais. Você acaba de desbloquear a Medalha de Bronze Guerreiro da Fé!";
        } else {
            msg.textContent = "A chama está acesa! Proteger sua mente e espírito com a disciplina diária gera frutos inabaláveis. Continue forte!";
        }

        document.getElementById('streak-modal').classList.remove('hidden');
    }

    // --- RETENTION ACTIONS LISTENERS SETUP ---
    setupActionListeners() {
        // Complete Devotional click listener
        const elBtnDevotional = document.getElementById('btn-complete-devotional');
        if (elBtnDevotional) elBtnDevotional.addEventListener('click', async () => {
            await this.triggerStreakActivity();
            await this.renderHomeScreen();
        });

        // Mark Chapter Read listener
        const elBtnMarkRead = document.getElementById('btn-mark-chapter-read');
        if (elBtnMarkRead) elBtnMarkRead.addEventListener('click', async () => {
            if (!this.activePlan) return;

            const dayNum = this.activePlan.current_day;
            const planDays = await db.getReadingPlanDays(this.activePlan.plan_id);
            
            // Write to database log
            await db.addReadingLog(this.currentUser.id, this.activePlan.plan_id, dayNum);

            // Increment plan day
            const nextDay = dayNum + 1;
            const isCompleted = nextDay > planDays.length;
            
            await db.updateUserPlanProgress(this.currentUser.id, this.activePlan.plan_id, nextDay, isCompleted);
            
            // Execute streak logic
            await this.triggerStreakActivity();
            
            // Reload Reader
            await this.renderBibleText();
        });

        // Sidebar active plan click listener
        const elBtnReadPlan = document.getElementById('btn-read-today-plan');
        if (elBtnReadPlan) elBtnReadPlan.addEventListener('click', () => {
            if (this.activePlan) {
                db.getReadingPlanDays(this.activePlan.plan_id).then(days => {
                    const dayData = days.find(d => d.day_number === this.activePlan.current_day);
                    if (dayData) {
                        this.openPlanReader(dayData.target_chapters);
                    }
                });
            }
        });

        // Ingest new prayer record
        const elPrayerForm = document.getElementById('prayer-form');
        if (elPrayerForm) elPrayerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('prayer-title').value;
            const desc = document.getElementById('prayer-desc').value;
            const type = document.querySelector('input[name="prayer-type"]:checked').value;

            await db.addPrayer(this.currentUser.id, title, desc, type);
            
            // First prayer triggers Bronze Altar Badge
            await db.earnBadge(this.currentUser.id, 'altar_bronze');
            await this.awardXpPoints(10); // XP rewards

            // Reset form and reload
            document.getElementById('prayer-form').reset();
            await this.renderPrayersScreen();
        });

        // Prayer list tab selectors
        document.querySelectorAll('.prayer-tab').forEach(tab => {
            tab.addEventListener('click', async (e) => {
                document.querySelectorAll('.prayer-tab').forEach(t => t.classList.remove('active'));
                e.currentTarget.classList.add('active');
                await this.renderPrayersList();
            });
        });

        // Reader books & chapters dropdown change actions
        const elSelectBook = document.getElementById('select-book');
        if (elSelectBook) elSelectBook.addEventListener('change', async (e) => {
            this.selectedBook = e.target.value;
            this.selectedChapter = 1;
            await this.populateChaptersDropdown();
            await this.renderBibleText();
        });

        const elSelectChapter = document.getElementById('select-chapter');
        if (elSelectChapter) elSelectChapter.addEventListener('change', async (e) => {
            this.selectedChapter = parseInt(e.target.value) || 1;
            await this.renderBibleText();
        });

        // Bottom theological study drawer close triggers
        const elBtnCloseDrawer = document.getElementById('btn-close-drawer');
        if (elBtnCloseDrawer) elBtnCloseDrawer.addEventListener('click', () => this.closeActiveStudyDrawer());
        const elDrawerOverlay = document.getElementById('study-drawer-overlay');
        if (elDrawerOverlay) elDrawerOverlay.addEventListener('click', () => this.closeActiveStudyDrawer());

        // Toggle Highlight listener
        const elBtnHighlight = document.getElementById('btn-toggle-highlight');
        if (elBtnHighlight) elBtnHighlight.addEventListener('click', () => {
            const verseTitle = document.getElementById('drawer-verse-title').textContent;
            let highlights = this.getHighlights();
            const btnHighlight = document.getElementById('btn-toggle-highlight');
            const btnText = document.getElementById('btn-highlight-text');
            
            // Extract the verse number from title (e.g., Gênesis 1:4 -> 4)
            const verseNum = parseInt(verseTitle.substring(verseTitle.lastIndexOf(':') + 1)) || 1;
            
            if (highlights.includes(verseTitle)) {
                // Remove highlight
                highlights = highlights.filter(h => h !== verseTitle);
                btnHighlight.classList.remove('active');
                btnText.textContent = 'Grifar Versículo';
                
                // Remove visual highlight from reader in real-time
                const verseEl = document.querySelector(`#bible-text-content .verse-item[data-verse="${verseNum}"]`);
                if (verseEl) {
                    verseEl.classList.remove('highlighted');
                }
            } else {
                // Add highlight
                highlights.push(verseTitle);
                btnHighlight.classList.add('active');
                btnText.textContent = 'Remover Grifo';
                
                // Add visual highlight to reader in real-time
                const verseEl = document.querySelector(`#bible-text-content .verse-item[data-verse="${verseNum}"]`);
                if (verseEl) {
                    verseEl.classList.add('highlighted');
                }
            }
            
            this.saveHighlights(highlights);
        });

        // Save Personal Notes listener
        const btnSaveNotes = document.getElementById('btn-save-personal-notes');
        if (btnSaveNotes) {
            btnSaveNotes.addEventListener('click', () => {
                const verseTitle = document.getElementById('drawer-verse-title').textContent;
                const notesInput = document.getElementById('drawer-personal-notes-input');
                if (notesInput && this.currentUser) {
                    const userId = this.currentUser.id;
                    const notesKey = `ae_personal_notes_${userId}_${verseTitle}`;
                    const noteValue = notesInput.value.trim();
                    
                    if (noteValue) {
                        localStorage.setItem(notesKey, noteValue);
                    } else {
                        localStorage.removeItem(notesKey);
                    }
                    
                    // Trigger beautiful success micro-interaction on the button
                    btnSaveNotes.classList.add('success');
                    const btnSaveSpan = btnSaveNotes.querySelector('span');
                    const originalText = btnSaveSpan ? btnSaveSpan.textContent : 'SALVAR REVELAÇÃO PESSOAL';
                    if (btnSaveSpan) {
                        btnSaveSpan.textContent = 'REVELAÇÃO SALVA! ✔';
                    }
                    
                    setTimeout(() => {
                        btnSaveNotes.classList.remove('success');
                        if (btnSaveSpan) {
                            btnSaveSpan.textContent = originalText;
                        }
                    }, 2000);
                }
            });
        }

        // Celebration Modal dismissal trigger
        const elBtnCloseModal = document.getElementById('btn-close-modal');
        if (elBtnCloseModal) elBtnCloseModal.addEventListener('click', () => {
            document.getElementById('streak-modal').classList.add('hidden');
        });

        // Category filter in plans hub click triggers
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', async (e) => {
                document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
                e.currentTarget.classList.add('active');
                await this.renderHubScreen();
            });
        });

        // Initialize Bible Search and Sub-tabs event listeners
        this.setupBibleSearchAndTabs();

        // SHARE VERSE CARD — listeners
        const elBtnShareVerse = document.getElementById('btn-share-verse');
        if (elBtnShareVerse) elBtnShareVerse.addEventListener('click', () => this.openShareVerseCard());

        const elBtnCloseShare = document.getElementById('btn-close-share');
        if (elBtnCloseShare) elBtnCloseShare.addEventListener('click', () => this.closeShareVerseCard());

        const elShareModal = document.getElementById('share-card-modal');
        if (elShareModal) elShareModal.addEventListener('click', (e) => {
            if (e.target === elShareModal) this.closeShareVerseCard();
        });

        const elBtnDownload = document.getElementById('btn-download-card');
        if (elBtnDownload) elBtnDownload.addEventListener('click', () => this.downloadVerseCard());

        const elBtnCopy = document.getElementById('btn-copy-card');
        if (elBtnCopy) elBtnCopy.addEventListener('click', () => this.copyVerseCard());
    }

    // --- BIBLE SEARCH & SUB-TABS INTERACTIVE LOGIC ---
    setupBibleSearchAndTabs() {
        // 1. Sub-Tab Switcher
        const tabBtns = document.querySelectorAll('.reader-tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetTab = e.currentTarget.getAttribute('data-reader-tab');
                
                tabBtns.forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                
                document.getElementById('panel-read').classList.remove('active');
                document.getElementById('panel-search').classList.remove('active');
                
                if (targetTab === 'tab-read') {
                    document.getElementById('panel-read').classList.add('active');
                } else if (targetTab === 'tab-search') {
                    document.getElementById('panel-search').classList.add('active');
                }
            });
        });

        // 2. Thematic Pills Clicks
        const pills = document.querySelectorAll('.theme-pill');
        pills.forEach(pill => {
            pill.addEventListener('click', (e) => {
                const theme = e.currentTarget.getAttribute('data-theme');
                const searchInput = document.getElementById('bible-search-input');
                if (searchInput) {
                    searchInput.value = theme;
                    this.executeBibleSearch(theme);
                }
            });
        });

        // 3. Search Actions (Click and Enter Key)
        const searchBtn = document.getElementById('btn-bible-search');
        const searchInput = document.getElementById('bible-search-input');
        
        if (searchBtn && searchInput) {
            searchBtn.addEventListener('click', () => {
                this.executeBibleSearch(searchInput.value);
            });
            
            searchInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    this.executeBibleSearch(searchInput.value);
                }
            });
        }
    }

    async executeBibleSearch(query) {
        const resultsBox = document.getElementById('bible-search-results-box');
        const emptyState = document.getElementById('search-empty-state');
        const countEl = document.getElementById('search-results-count');
        const resultsList = document.getElementById('bible-search-results');

        if (!query || query.trim() === '') {
            if (resultsBox) resultsBox.classList.add('hidden');
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }
        
        const cleanQuery = query.trim();
        const results = await db.searchBibleVerses(cleanQuery);
        
        if (countEl) countEl.textContent = results.length;
        if (resultsList) resultsList.innerHTML = '';
        
        if (results.length === 0) {
            if (resultsBox) resultsBox.classList.remove('hidden');
            if (emptyState) emptyState.classList.add('hidden');
            if (resultsList) {
                resultsList.innerHTML = `
                    <div class="glass-card" style="text-align:center; padding:30px; color:var(--color-muted); font-size:0.85rem;">
                        Nenhum versículo encontrado para "${cleanQuery}". Tente outros termos como "paz", "fé" ou "amor".
                    </div>
                `;
            }
            return;
        }
        
        if (resultsBox) resultsBox.classList.remove('hidden');
        if (emptyState) emptyState.classList.add('hidden');
        
        // Helper to escape HTML safely to prevent XSS
        const escapeHtml = (text) => {
            return text
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        };
        
        results.forEach(v => {
            let highlightedText = escapeHtml(v.text);
            if (cleanQuery) {
                // Escape special characters to prevent regex breaking
                const escapedQuery = cleanQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                const regex = new RegExp(`(${escapedQuery})`, 'gi');
                highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
            }
            
            const card = document.createElement('div');
            card.className = `search-result-card ${v.study_note ? 'has-note' : ''}`;
            
            let studyTag = v.study_note ? `<span class="search-result-study-tag">Estudo</span>` : '';
            
            card.innerHTML = `
               <div class="search-result-header-card">
                   <span class="search-result-ref">${v.book_name} ${v.chapter}:${v.verse}</span>
                   ${studyTag}
               </div>
               <p class="search-result-text">${highlightedText}</p>
            `;
            
            // Interaction: Navigate to the passage on click
            card.addEventListener('click', async () => {
                this.selectedBook = v.book_name;
                this.selectedChapter = v.chapter;
                
                // Programmatically switch sub-tab to "Leitura Livre"
                const readTabBtn = document.querySelector('.reader-tab-btn[data-reader-tab="tab-read"]');
                if (readTabBtn) {
                    readTabBtn.click();
                } else {
                    // Fallback to manual class toggles if button is not found
                    document.querySelectorAll('.reader-tab-btn').forEach(b => b.classList.remove('active'));
                    const manualReadBtn = document.querySelector('[data-reader-tab="tab-read"]');
                    if (manualReadBtn) manualReadBtn.classList.add('active');
                    document.getElementById('panel-read').classList.add('active');
                    document.getElementById('panel-search').classList.remove('active');
                }
                
                // Update dropdown selectors in Leitura Livre screen
                const selectBook = document.getElementById('select-book');
                const selectChapter = document.getElementById('select-chapter');
                if (selectBook) selectBook.value = v.book_name;
                
                await this.populateChaptersDropdown();
                if (selectChapter) selectChapter.value = v.chapter;
                
                await this.renderBibleText();
                
                // Allow DOM elements to completely mount, then scroll, glow, and open study commentary
                setTimeout(() => {
                    const verseEl = document.querySelector(`.verse-item[data-verse="${v.verse}"]`);
                    if (verseEl) {
                        verseEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        verseEl.classList.add('highlighted-glow');
                        
                        // Automatically open commentary drawer if study notes exist
                        if (v.study_note) {
                            this.openActiveStudyDrawer(`${v.book_name} ${v.chapter}:${v.verse}`, verseEl.innerText, v.study_note);
                        }
                    }
                }, 120);
            });
            
            if (resultsList) resultsList.appendChild(card);
        });
    }

    // --- TIMED NOTIFICATION RETENTION ENGINE ---
    setupLocalNotificationsCheck() {
        // Periodically verify if user is about to lose streak (mock scheduler logic)
        setInterval(() => {
            const toggle = document.getElementById('toggle-notifications');
            if (toggle && toggle.checked) {
                // If user hasn't logged action today, raise local in-app custom notification banner
                if (this.currentUser && this.currentUser.last_reading_date !== this.todayStr) {
                    this.showLocalReminderNotification();
                }
            }
        }, 60000); // Verify every 60s
    }

    showLocalReminderNotification() {
        // Standard check to avoid duplicate displays
        if (document.getElementById('retention-push-banner')) return;

        const body = document.body;
        const banner = document.createElement('div');
        banner.id = 'retention-push-banner';
        banner.className = 'glass-card animate-scale';
        banner.style.cssText = `
            position: fixed;
            bottom: 100px;
            right: 20px;
            z-index: 1000;
            max-width: 380px;
            border-color: rgba(227, 167, 91, 0.4);
            background: linear-gradient(135deg, rgba(227, 167, 91, 0.12) 0%, rgba(13, 13, 17, 0.98) 100%);
            padding: 15px 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        `;

        const streakVal = this.currentUser.current_streak;
        const alertMsg = streakVal > 0 
            ? `Está na hora do seu devocional! Não perca sua sequência de ${streakVal} dias.` 
            : `Está na hora do seu devocional! Dê o seu primeiro passo na constância de hoje.`;

        banner.innerHTML = `
            <div style="display:flex; gap:10px; align-items:center;">
                <span style="font-size:1.5rem; animation: bounceFire 1s infinite;">🔥</span>
                <div style="flex:1;">
                    <strong style="font-family:var(--font-heading); font-size:0.85rem; color:var(--color-accent); display:block; margin-bottom:2px;">HORA DO ALTAR</strong>
                    <p style="font-size:0.78rem; line-height:1.3; color:var(--color-secondary);">${alertMsg}</p>
                </div>
                <button class="btn-close-push" style="background:none; border:none; color:white; cursor:pointer; font-weight:700;">×</button>
            </div>
        `;

        body.appendChild(banner);

        banner.querySelector('.btn-close-push').addEventListener('click', () => banner.remove());

        // Auto remove in 10s
        setTimeout(() => {
            if (banner) banner.remove();
        }, 10000);
    }

    // --- HELPER FORMATTING FUNCTIONS ---
    formatDevotionalDate(dateStr) {
        const parts = dateStr.split('-');
        const date = new Date(parts[0], parts[1]-1, parts[2]);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
    }

    // =========================================================================
    //  ✨ REVELAÇÃO DIVINA — Random Verse with Golden Particles
    // =========================================================================

    setupRevelacaoDivina() {
        const fab = document.getElementById('fab-revelacao');
        const overlay = document.getElementById('revelacao-overlay');
        const btnNew = document.getElementById('btn-revelacao-new');
        const btnShare = document.getElementById('btn-revelacao-share');
        const btnClose = document.getElementById('btn-revelacao-close');

        if (!fab || !overlay) return;

        fab.addEventListener('click', () => this.openRevelacao());
        btnNew.addEventListener('click', () => this.refreshRevelacao());
        btnClose.addEventListener('click', () => this.closeRevelacao());
        btnShare.addEventListener('click', () => this.shareRevelacao());

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !overlay.classList.contains('hidden')) {
                this.closeRevelacao();
            }
        });
    }

    async openRevelacao() {
        const overlay = document.getElementById('revelacao-overlay');
        overlay.classList.remove('hidden');
        
        // Start particle animation
        this.startParticles();
        
        // Pick and display a random verse
        await this.displayRandomVerse();
    }

    async refreshRevelacao() {
        const content = document.querySelector('.revelacao-content');
        // Quick fade out
        content.style.opacity = '0';
        content.style.transform = 'translateY(10px)';
        
        await this.displayRandomVerse();
        
        // Animate back in
        setTimeout(() => {
            content.style.transition = 'all 0.6s ease-out';
            content.style.opacity = '1';
            content.style.transform = 'translateY(0)';
        }, 100);
    }

    closeRevelacao() {
        const overlay = document.getElementById('revelacao-overlay');
        overlay.style.transition = 'opacity 0.4s ease-out';
        overlay.style.opacity = '0';
        
        setTimeout(() => {
            overlay.classList.add('hidden');
            overlay.style.transition = '';
            overlay.style.opacity = '';
            this.stopParticles();
        }, 400);
    }

    async displayRandomVerse() {
        await db.ensureBibleCache();
        const bibles = window.AETERNA_BIBLE_CACHE || db.bibleCache || [];
        
        if (bibles.length === 0) return;
        
        const randomIndex = Math.floor(Math.random() * bibles.length);
        const verse = bibles[randomIndex];
        
        this._currentRevelacao = verse;
        
        const verseText = document.getElementById('revelacao-verse-text');
        const verseRef = document.getElementById('revelacao-verse-ref');
        
        verseText.textContent = verse.text;
        verseRef.textContent = `${verse.book_name} ${verse.chapter}:${verse.verse}`;
    }

    async shareRevelacao() {
        if (!this._currentRevelacao) return;
        const v = this._currentRevelacao;
        const text = `"${v.text}"\n\n— ${v.book_name} ${v.chapter}:${v.verse}\n\n✝️ Enviado via Aeterna`;
        
        if (navigator.share) {
            try {
                await navigator.share({ title: 'Revelação Divina — Aeterna', text });
            } catch (e) { /* User cancelled */ }
        } else {
            // Fallback: copy to clipboard
            try {
                await navigator.clipboard.writeText(text);
                this.showShareCopiedNotification();
            } catch (e) { /* Clipboard blocked */ }
        }
    }

    showShareCopiedNotification() {
        const banner = document.createElement('div');
        banner.style.cssText = `
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
            z-index: 600; padding: 12px 24px; border-radius: 50px;
            background: rgba(227, 167, 91, 0.15); border: 1px solid rgba(227, 167, 91, 0.3);
            color: var(--color-accent); font-size: 0.82rem; font-family: var(--font-body);
            backdrop-filter: blur(20px); animation: revelacaoContentIn 0.4s ease-out;
        `;
        banner.textContent = '✨ Versículo copiado!';
        document.body.appendChild(banner);
        setTimeout(() => banner.remove(), 2500);
    }

    // --- GOLDEN PARTICLE SYSTEM ---
    startParticles() {
        const canvas = document.getElementById('revelacao-particles');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        this._particles = [];
        this._particleAnimId = null;

        for (let i = 0; i < 80; i++) {
            this._particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 3 + 0.5,
                speedX: (Math.random() - 0.5) * 0.5,
                speedY: (Math.random() - 0.5) * 0.5 - 0.3,
                opacity: Math.random() * 0.6 + 0.1,
                fadeDir: Math.random() > 0.5 ? 1 : -1
            });
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            for (const p of this._particles) {
                p.x += p.speedX;
                p.y += p.speedY;
                p.opacity += p.fadeDir * 0.005;
                
                if (p.opacity > 0.7) p.fadeDir = -1;
                if (p.opacity < 0.05) p.fadeDir = 1;
                
                // Wrap around
                if (p.y < -10) p.y = canvas.height + 10;
                if (p.x < -10) p.x = canvas.width + 10;
                if (p.x > canvas.width + 10) p.x = -10;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(227, 167, 91, ${p.opacity})`;
                ctx.fill();
                
                // Glow effect
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(227, 167, 91, ${p.opacity * 0.15})`;
                ctx.fill();
            }
            
            this._particleAnimId = requestAnimationFrame(animate);
        };

        animate();
    }

    stopParticles() {
        if (this._particleAnimId) {
            cancelAnimationFrame(this._particleAnimId);
            this._particleAnimId = null;
        }
    }

    // ==========================================================================
    //  📖 MAPA DE PROGRESSO BÍBLICO — HEATMAP INTERATIVO
    //  Mostra todos os 66 livros como um grid de blocos coloridos
    //  com progresso de leitura e navegação ao toque.
    // ==========================================================================
    renderBibleProgressMap() {
        const gridOT = document.getElementById('progress-grid-ot');
        const gridNT = document.getElementById('progress-grid-nt');
        const booksReadEl = document.getElementById('progress-books-read');
        if (!gridOT || !gridNT) return;

        // All 66 books with abbreviations and chapter counts
        const OT_BOOKS = [
            {name:'Gênesis',abbr:'Gn',chapters:50},{name:'Êxodo',abbr:'Êx',chapters:40},
            {name:'Levítico',abbr:'Lv',chapters:27},{name:'Números',abbr:'Nm',chapters:36},
            {name:'Deuteronômio',abbr:'Dt',chapters:34},{name:'Josué',abbr:'Js',chapters:24},
            {name:'Juízes',abbr:'Jz',chapters:21},{name:'Rute',abbr:'Rt',chapters:4},
            {name:'1 Samuel',abbr:'1Sm',chapters:31},{name:'2 Samuel',abbr:'2Sm',chapters:24},
            {name:'1 Reis',abbr:'1Rs',chapters:22},{name:'2 Reis',abbr:'2Rs',chapters:25},
            {name:'1 Crônicas',abbr:'1Cr',chapters:29},{name:'2 Crônicas',abbr:'2Cr',chapters:36},
            {name:'Esdras',abbr:'Ed',chapters:10},{name:'Neemias',abbr:'Ne',chapters:13},
            {name:'Ester',abbr:'Et',chapters:10},{name:'Jó',abbr:'Jó',chapters:42},
            {name:'Salmos',abbr:'Sl',chapters:150},{name:'Provérbios',abbr:'Pv',chapters:31},
            {name:'Eclesiastes',abbr:'Ec',chapters:12},{name:'Cânticos',abbr:'Ct',chapters:8},
            {name:'Isaías',abbr:'Is',chapters:66},{name:'Jeremias',abbr:'Jr',chapters:52},
            {name:'Lamentações',abbr:'Lm',chapters:5},{name:'Ezequiel',abbr:'Ez',chapters:48},
            {name:'Daniel',abbr:'Dn',chapters:12},{name:'Oséias',abbr:'Os',chapters:14},
            {name:'Joel',abbr:'Jl',chapters:3},{name:'Amós',abbr:'Am',chapters:9},
            {name:'Obadias',abbr:'Ob',chapters:1},{name:'Jonas',abbr:'Jn',chapters:4},
            {name:'Miquéias',abbr:'Mq',chapters:7},{name:'Naum',abbr:'Na',chapters:3},
            {name:'Habacuque',abbr:'Hc',chapters:3},{name:'Sofonias',abbr:'Sf',chapters:3},
            {name:'Ageu',abbr:'Ag',chapters:2},{name:'Zacarias',abbr:'Zc',chapters:14},
            {name:'Malaquias',abbr:'Ml',chapters:4}
        ];

        const NT_BOOKS = [
            {name:'Mateus',abbr:'Mt',chapters:28},{name:'Marcos',abbr:'Mc',chapters:16},
            {name:'Lucas',abbr:'Lc',chapters:24},{name:'João',abbr:'Jo',chapters:21},
            {name:'Atos',abbr:'At',chapters:28},{name:'Romanos',abbr:'Rm',chapters:16},
            {name:'1 Coríntios',abbr:'1Co',chapters:16},{name:'2 Coríntios',abbr:'2Co',chapters:13},
            {name:'Gálatas',abbr:'Gl',chapters:6},{name:'Efésios',abbr:'Ef',chapters:6},
            {name:'Filipenses',abbr:'Fp',chapters:4},{name:'Colossenses',abbr:'Cl',chapters:4},
            {name:'1 Tessalonicenses',abbr:'1Ts',chapters:5},{name:'2 Tessalonicenses',abbr:'2Ts',chapters:3},
            {name:'1 Timóteo',abbr:'1Tm',chapters:6},{name:'2 Timóteo',abbr:'2Tm',chapters:4},
            {name:'Tito',abbr:'Tt',chapters:3},{name:'Filemom',abbr:'Fm',chapters:1},
            {name:'Hebreus',abbr:'Hb',chapters:13},{name:'Tiago',abbr:'Tg',chapters:5},
            {name:'1 Pedro',abbr:'1Pe',chapters:5},{name:'2 Pedro',abbr:'2Pe',chapters:3},
            {name:'1 João',abbr:'1Jo',chapters:5},{name:'2 João',abbr:'2Jo',chapters:1},
            {name:'3 João',abbr:'3Jo',chapters:1},{name:'Judas',abbr:'Jd',chapters:1},
            {name:'Apocalipse',abbr:'Ap',chapters:22}
        ];

        // Get reading progress from localStorage
        const readChapters = JSON.parse(localStorage.getItem('ae_bible_progress') || '{}');

        let totalBooksRead = 0;

        const renderGrid = (books, container) => {
            container.innerHTML = '';
            books.forEach(book => {
                const chaptersRead = readChapters[book.name] ? readChapters[book.name].length : 0;
                const totalChapters = book.chapters;
                const percent = totalChapters > 0 ? Math.round((chaptersRead / totalChapters) * 100) : 0;

                let status = 'status-none';
                if (percent >= 100) {
                    status = 'status-complete';
                    totalBooksRead++;
                } else if (percent > 0) {
                    status = 'status-partial';
                }

                const cell = document.createElement('div');
                cell.className = `progress-book-cell ${status}`;
                cell.textContent = book.abbr;
                cell.setAttribute('data-tooltip', `${book.name} — ${chaptersRead}/${totalChapters} (${percent}%)`);
                cell.setAttribute('data-book', book.name);

                cell.addEventListener('click', () => {
                    this.selectedBook = book.name;
                    this.selectedChapter = 1;
                    this.switchScreen('screen-reader');
                });

                container.appendChild(cell);
            });
        };

        renderGrid(OT_BOOKS, gridOT);
        renderGrid(NT_BOOKS, gridNT);

        if (booksReadEl) {
            booksReadEl.textContent = `${totalBooksRead}/66`;
        }
    }

    // Track chapter as read in the progress map
    markChapterInProgressMap(bookName, chapter) {
        const progress = JSON.parse(localStorage.getItem('ae_bible_progress') || '{}');
        if (!progress[bookName]) progress[bookName] = [];
        if (!progress[bookName].includes(chapter)) {
            progress[bookName].push(chapter);
            localStorage.setItem('ae_bible_progress', JSON.stringify(progress));
        }
    }

    // ==========================================================================
    //  ✨ SHARE VERSE CARD — GERADOR DE CARDS CELESTIAIS
    //  Gera uma imagem 1080x1080 com gradiente celestial, tipografia elegante
    //  e marca d'água Aeterna para compartilhamento em redes sociais.
    // ==========================================================================
    openShareVerseCard() {
        const verseTitle = document.getElementById('drawer-verse-title');
        const verseText = document.getElementById('drawer-verse-text-copy');
        if (!verseTitle || !verseText) return;

        const reference = verseTitle.textContent || 'Versículo';
        const text = verseText.textContent || '';

        // Generate the canvas card
        this.renderShareCanvas(text, reference);

        // Show modal
        const modal = document.getElementById('share-card-modal');
        if (modal) modal.classList.remove('hidden');
    }

    closeShareVerseCard() {
        const modal = document.getElementById('share-card-modal');
        if (modal) modal.classList.add('hidden');
    }

    renderShareCanvas(verseText, reference) {
        const canvas = document.getElementById('share-verse-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const W = 1080;
        const H = 1080;
        canvas.width = W;
        canvas.height = H;

        // === BACKGROUND: Deep celestial gradient ===
        const bgGrad = ctx.createLinearGradient(0, 0, W, H);
        bgGrad.addColorStop(0, '#0a0a14');
        bgGrad.addColorStop(0.3, '#0d0d1a');
        bgGrad.addColorStop(0.7, '#12101e');
        bgGrad.addColorStop(1, '#0a0a14');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        // === AMBIENT GOLDEN GLOW — Top right ===
        const glow1 = ctx.createRadialGradient(W * 0.75, H * 0.15, 50, W * 0.75, H * 0.15, 350);
        glow1.addColorStop(0, 'rgba(227, 167, 91, 0.12)');
        glow1.addColorStop(0.5, 'rgba(227, 167, 91, 0.04)');
        glow1.addColorStop(1, 'transparent');
        ctx.fillStyle = glow1;
        ctx.fillRect(0, 0, W, H);

        // === AMBIENT GOLDEN GLOW — Bottom left ===
        const glow2 = ctx.createRadialGradient(W * 0.2, H * 0.85, 30, W * 0.2, H * 0.85, 280);
        glow2.addColorStop(0, 'rgba(227, 167, 91, 0.08)');
        glow2.addColorStop(0.6, 'rgba(227, 167, 91, 0.02)');
        glow2.addColorStop(1, 'transparent');
        ctx.fillStyle = glow2;
        ctx.fillRect(0, 0, W, H);

        // === DECORATIVE PARTICLES (static) ===
        ctx.fillStyle = 'rgba(227, 167, 91, 0.15)';
        for (let i = 0; i < 40; i++) {
            const x = Math.random() * W;
            const y = Math.random() * H;
            const r = Math.random() * 2.5 + 0.5;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }

        // === DECORATIVE CROSS — top center ===
        ctx.save();
        ctx.fillStyle = 'rgba(227, 167, 91, 0.6)';
        ctx.font = '72px serif';
        ctx.textAlign = 'center';
        ctx.fillText('✝', W / 2, 120);
        ctx.restore();

        // === DECORATIVE HORIZONTAL LINE ===
        const lineGrad = ctx.createLinearGradient(W * 0.2, 0, W * 0.8, 0);
        lineGrad.addColorStop(0, 'transparent');
        lineGrad.addColorStop(0.3, 'rgba(227, 167, 91, 0.3)');
        lineGrad.addColorStop(0.5, 'rgba(227, 167, 91, 0.5)');
        lineGrad.addColorStop(0.7, 'rgba(227, 167, 91, 0.3)');
        lineGrad.addColorStop(1, 'transparent');
        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(W * 0.15, 165);
        ctx.lineTo(W * 0.85, 165);
        ctx.stroke();

        // === OPENING QUOTE MARK ===
        ctx.save();
        ctx.fillStyle = 'rgba(227, 167, 91, 0.12)';
        ctx.font = 'italic 200px "Cormorant Garamond", serif';
        ctx.textAlign = 'left';
        ctx.fillText('"', 60, 350);
        ctx.restore();

        // === VERSE TEXT — word-wrapped ===
        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.font = 'italic 42px "Cormorant Garamond", serif';
        ctx.textAlign = 'center';

        const maxWidth = W - 180;
        const lineHeight = 60;
        const words = verseText.split(' ');
        let lines = [];
        let currentLine = '';

        for (const word of words) {
            const testLine = currentLine ? currentLine + ' ' + word : word;
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) lines.push(currentLine);

        // Limit to 10 lines max, add ellipsis if truncated
        if (lines.length > 10) {
            lines = lines.slice(0, 10);
            lines[9] = lines[9] + '...';
        }

        // Center the text block vertically
        const totalTextHeight = lines.length * lineHeight;
        const textStartY = (H / 2) - (totalTextHeight / 2) + 40;

        lines.forEach((line, i) => {
            ctx.fillText(line, W / 2, textStartY + (i * lineHeight));
        });

        // === CLOSING QUOTE MARK ===
        ctx.save();
        ctx.fillStyle = 'rgba(227, 167, 91, 0.12)';
        ctx.font = 'italic 200px "Cormorant Garamond", serif';
        ctx.textAlign = 'right';
        ctx.fillText('"', W - 60, textStartY + totalTextHeight + 60);
        ctx.restore();

        // === REFERENCE ===
        const refY = Math.max(textStartY + totalTextHeight + 80, H * 0.72);
        ctx.save();
        ctx.fillStyle = 'rgba(227, 167, 91, 0.85)';
        ctx.font = '700 28px "Cinzel", serif';
        ctx.textAlign = 'center';
        ctx.letterSpacing = '4px';
        ctx.fillText('— ' + reference + ' —', W / 2, refY);
        ctx.restore();

        // === BOTTOM DECORATIVE LINE ===
        ctx.strokeStyle = lineGrad;
        ctx.beginPath();
        ctx.moveTo(W * 0.25, H - 130);
        ctx.lineTo(W * 0.75, H - 130);
        ctx.stroke();

        // === BRAND WATERMARK ===
        ctx.save();
        ctx.fillStyle = 'rgba(227, 167, 91, 0.35)';
        ctx.font = '700 22px "Cinzel", serif';
        ctx.textAlign = 'center';
        ctx.fillText('A E T E R N A', W / 2, H - 85);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.font = '13px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('Disciplina Espiritual Gamificada', W / 2, H - 55);
        ctx.restore();
    }

    downloadVerseCard() {
        const canvas = document.getElementById('share-verse-canvas');
        if (!canvas) return;

        const verseTitle = document.getElementById('drawer-verse-title');
        const fileName = verseTitle ? verseTitle.textContent.replace(/[^a-zA-Z0-9À-ú]/g, '_') : 'versiculo';

        const link = document.createElement('a');
        link.download = `Aeterna_${fileName}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    async copyVerseCard() {
        const canvas = document.getElementById('share-verse-canvas');
        const btnCopy = document.getElementById('btn-copy-card');
        if (!canvas) return;

        try {
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);

            // Success feedback
            if (btnCopy) {
                btnCopy.classList.add('copied');
                const span = btnCopy.querySelector('span');
                const originalText = span ? span.textContent : 'COPIAR';
                if (span) span.textContent = 'COPIADO! ✔';
                setTimeout(() => {
                    btnCopy.classList.remove('copied');
                    if (span) span.textContent = originalText;
                }, 2000);
            }
        } catch (err) {
            console.warn('Clipboard write falhou:', err);
            // Fallback: download instead
            this.downloadVerseCard();
        }
    }

    setupDevotionalAudio() {
        const btnDevotional = document.getElementById('btn-audio-devotional');
        const btnStop = document.getElementById('btn-audio-stop');

        if (!btnDevotional || !btnStop) return;

        btnDevotional.addEventListener('click', () => {
            if (this.audioState === 'stopped') {
                this.playAudioDevotional();
            } else if (this.audioState === 'playing') {
                this.pauseAudioDevotional();
            } else if (this.audioState === 'paused') {
                this.resumeAudioDevotional();
            }
        });

        btnStop.addEventListener('click', () => {
            this.stopAudioDevotional();
        });

        // Warm up voices
        if (window.speechSynthesis) {
            window.speechSynthesis.getVoices();
        }
    }

    async playAudioDevotional() {
        const dateText = document.getElementById('devocional-date')?.textContent || '';
        const verseText = document.getElementById('devocional-verse-text')?.textContent || '';
        const verseRef = document.getElementById('devocional-verse-ref')?.textContent || '';
        const reflection = document.getElementById('devocional-reflection')?.textContent || '';
        const prayer = document.getElementById('devocional-prayer')?.textContent || '';
        const challenge = document.getElementById('devocional-challenge')?.textContent || '';

        if (!verseText) return;

        const cleanVerse = verseText.replace(/[\"“”]/g, '').trim();
        const cleanReflection = reflection.trim();
        const cleanPrayer = prayer.trim();
        const cleanChallenge = challenge.trim();

        // Construct a premium narrative
        const textToRead = `Devocional de ${dateText}. 
        Versículo bíblico em ${verseRef}: ${cleanVerse}. 
        Reflexão do dia: ${cleanReflection}. 
        Oração: ${cleanPrayer}. 
        Desafio de hoje: ${cleanChallenge}.`;

        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }

        this.utterance = new SpeechSynthesisUtterance(textToRead);
        this.utterance.lang = 'pt-BR';
        
        // Find pt-BR voice
        const voices = window.speechSynthesis.getVoices();
        const ptVoice = voices.find(voice => voice.lang.includes('pt-BR') || voice.lang.includes('pt_BR'));
        if (ptVoice) {
            this.utterance.voice = ptVoice;
        }

        this.utterance.rate = 1.0;
        this.utterance.pitch = 1.0;

        this.utterance.onend = () => {
            this.stopAudioDevotional();
        };

        this.utterance.onerror = (e) => {
            console.warn('SpeechSynthesis error:', e);
            if (e.error !== 'interrupted') {
                this.stopAudioDevotional();
            }
        };

        this.audioState = 'playing';
        this.updateAudioButtonState('playing');

        window.speechSynthesis.speak(this.utterance);
    }

    pauseAudioDevotional() {
        if (window.speechSynthesis && window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
            this.audioState = 'paused';
            this.updateAudioButtonState('paused');
        }
    }

    resumeAudioDevotional() {
        if (window.speechSynthesis && window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
            this.audioState = 'playing';
            this.updateAudioButtonState('playing');
        } else {
            this.playAudioDevotional();
        }
    }

    stopAudioDevotional() {
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        this.audioState = 'stopped';
        this.updateAudioButtonState('stopped');
    }

    updateAudioButtonState(state) {
        const btnDevotional = document.getElementById('btn-audio-devotional');
        const btnStop = document.getElementById('btn-audio-stop');
        
        if (!btnDevotional || !btnStop) return;

        if (state === 'stopped') {
            btnStop.classList.add('hidden');
            btnDevotional.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-audio-play">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                <span id="btn-audio-text">Ouvir Áudio</span>
            `;
        } else if (state === 'playing') {
            btnStop.classList.remove('hidden');
            btnDevotional.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-audio-pause" style="fill: currentColor;">
                    <rect x="6" y="4" width="4" height="16"></rect>
                    <rect x="14" y="4" width="4" height="16"></rect>
                </svg>
                <span id="btn-audio-text">Pausar</span>
                <div class="audio-visualizer-mini animating">
                    <span></span><span></span><span></span>
                </div>
            `;
        } else if (state === 'paused') {
            btnStop.classList.remove('hidden');
            btnDevotional.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-audio-play">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                <span id="btn-audio-text">Continuar</span>
                <div class="audio-visualizer-mini">
                    <span></span><span></span><span></span>
                </div>
            `;
        }
    }
    // ==========================================================================
    //  🧭 BÚSSOLA ESPIRITUAL — SPIRITUAL COMPASS
    //  Selects personalized Bible verses based on the user's current
    //  emotional state, providing comfort, guidance, and wisdom.
    // ==========================================================================
    
    setupBussolaEspiritual() {
        const fab = document.getElementById('fab-bussola');
        const overlay = document.getElementById('bussola-overlay');
        const btnClose = document.getElementById('btn-bussola-close');
        const btnNew = document.getElementById('btn-bussola-new');
        const btnShare = document.getElementById('btn-bussola-share');
        
        if (!fab || !overlay) return;
        
        fab.addEventListener('click', () => this.openBussola());
        
        if (btnClose) btnClose.addEventListener('click', () => this.closeBussola());
        if (btnNew) btnNew.addEventListener('click', () => {
            const result = document.getElementById('bussola-result');
            if (result) result.classList.remove('visible');
            document.querySelectorAll('.bussola-emotion-btn').forEach(b => b.classList.remove('active'));
        });
        if (btnShare) btnShare.addEventListener('click', () => this.shareBussola());
        
        // Emotion button listeners
        document.querySelectorAll('.bussola-emotion-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const emotion = e.currentTarget.getAttribute('data-emotion');
                document.querySelectorAll('.bussola-emotion-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.displayBussolaVerse(emotion);
            });
        });
        
        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay.classList.contains('visible')) {
                this.closeBussola();
            }
        });
    }
    
    openBussola() {
        const overlay = document.getElementById('bussola-overlay');
        if (overlay) {
            overlay.classList.add('visible');
            const result = document.getElementById('bussola-result');
            if (result) result.classList.remove('visible');
            document.querySelectorAll('.bussola-emotion-btn').forEach(b => b.classList.remove('active'));
        }
    }
    
    closeBussola() {
        const overlay = document.getElementById('bussola-overlay');
        if (overlay) {
            overlay.style.transition = 'all 0.3s ease';
            overlay.classList.remove('visible');
        }
    }
    
    getBussolaVerses() {
        return {
            ansiedade: [
                { ref: 'Filipenses 4:6-7', text: 'Não andeis ansiosos de coisa alguma; em tudo, porém, sejam conhecidas, diante de Deus, as vossas petições, pela oração e pela súplica, com ações de graças. E a paz de Deus, que excede todo o entendimento, guardará o vosso coração e a vossa mente em Cristo Jesus.', devotional: 'A ansiedade é real, mas Deus nos convida a trocar a preocupação pela oração. Cada vez que a mente quiser correr para o pior cenário, redirecione-a para uma conversa com o Pai. Ele não ignora o que você sente — Ele guarda o que você entrega.' },
                { ref: '1 Pedro 5:7', text: 'Lançando sobre ele toda a vossa ansiedade, porque ele tem cuidado de vós.', devotional: 'Lançar significa soltar de verdade. Não é segurar a corda enquanto finge confiar. Deus cuida de você com a mesma intensidade que criou o universo — com propósito, detalhe e amor inabalável.' },
                { ref: 'Mateus 6:34', text: 'Portanto, não vos inquieteis com o dia de amanhã, pois o amanhã trará os seus cuidados; basta ao dia o seu próprio mal.', devotional: 'Jesus nos liberta da tirania do amanhã. Viva o hoje com presença e gratidão. O futuro pertence a quem já o conhece — e Ele prometeu estar lá quando você chegar.' },
                { ref: 'Salmos 55:22', text: 'Entrega o teu caminho ao Senhor, e ele te susterá; não permitirá jamais que o justo seja abalado.', devotional: 'Entregar não é fraqueza — é a maior demonstração de confiança. Quando você solta o controle, descobre que sempre houve Alguém segurando tudo com firmeza.' }
            ],
            tristeza: [
                { ref: 'Salmos 34:18', text: 'Perto está o Senhor dos que têm o coração quebrantado e salva os de espírito oprimido.', devotional: 'Deus não foge da sua dor. Ele se aproxima. Nos momentos mais difíceis, Sua presença é mais real do que nunca. Permita-se sentir e, ao mesmo tempo, permita-se ser abraçado.' },
                { ref: 'Isaías 41:10', text: 'Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus; eu te fortaleço, e te ajudo, e te sustento com a minha destra fiel.', devotional: 'A tristeza pode parecer um oceano sem fim, mas existe um Deus que caminha sobre as águas. Ele não prometeu remover a tempestade, mas prometeu segurar você durante ela.' },
                { ref: 'Apocalipse 21:4', text: 'E lhes enxugará dos olhos toda lágrima, e a morte já não existirá, já não haverá luto, nem pranto, nem dor, porque as primeiras coisas passaram.', devotional: 'A tristeza é temporária. A eternidade com Deus é permanente. Cada lágrima que você derrama hoje será pessoalmente enxugada pelo Criador do universo.' }
            ],
            medo: [
                { ref: 'Josué 1:9', text: 'Não to mandei eu? Esforça-te e tem bom ânimo; não pasmes, nem te espantes, porque o Senhor, teu Deus, é contigo, por onde quer que andares.', devotional: 'O medo grita que você está sozinho. A verdade sussurra que o Deus do universo está ao seu lado. Coragem não é ausência de medo — é avançar sabendo que Ele vai na frente.' },
                { ref: '2 Timóteo 1:7', text: 'Porque Deus não nos deu o espírito de covardia, mas de poder, de amor e de moderação.', devotional: 'O medo não vem de Deus. O que Ele coloca dentro de você é poder para enfrentar, amor para perseverar e equilíbrio para discernir. Recuse o que não foi plantado pelo Pai.' },
                { ref: 'Salmos 23:4', text: 'Ainda que eu ande pelo vale da sombra da morte, não temerei mal nenhum, porque tu estás comigo; o teu bordão e o teu cajado me consolam.', devotional: 'Os vales existem, mas nunca são destinos finais — são passagens. E nenhuma sombra resiste à luz de quem caminha com o Pastor.' }
            ],
            gratidao: [
                { ref: '1 Tessalonicenses 5:18', text: 'Em tudo dai graças, porque esta é a vontade de Deus em Cristo Jesus para convosco.', devotional: 'Gratidão não depende de circunstâncias perfeitas. É uma decisão poderosa que transforma o olhar. Quando você agradece, declara que Deus é maior que qualquer problema.' },
                { ref: 'Salmos 107:1', text: 'Rendei graças ao Senhor, porque ele é bom; porque a sua misericórdia dura para sempre.', devotional: 'A bondade de Deus não tem prazo de validade. Cada manhã é uma prova viva de Sua fidelidade. Agradecer é reconhecer o óbvio que o mundo tenta esconder.' },
                { ref: 'Colossenses 3:15', text: 'E a paz de Cristo, para a qual também fostes chamados em um corpo, domine em vossos corações; e sede agradecidos.', devotional: 'Paz e gratidão caminham juntas. Quando o coração agradece, a mente descansa. Você foi chamado para viver nessa harmonia.' }
            ],
            raiva: [
                { ref: 'Efésios 4:26-27', text: 'Irai-vos e não pequeis; não se ponha o sol sobre a vossa ira, nem deis lugar ao diabo.', devotional: 'Sentir raiva é humano. O que você faz com ela define seu caráter. Não permita que a frustração de hoje se torne a amargura de amanhã. Processe, ore e libere.' },
                { ref: 'Provérbios 15:1', text: 'A resposta branda desvia o furor, mas a palavra dura suscita a ira.', devotional: 'A gentileza não é fraqueza — é estratégia divina. Uma palavra mansa desarma mais do que mil argumentos. Escolha a sabedoria antes da reação.' },
                { ref: 'Tiago 1:19-20', text: 'Todo homem seja pronto para ouvir, tardio para falar, tardio para se irar. Porque a ira do homem não produz a justiça de Deus.', devotional: 'Ouvir mais e reagir menos é um superpoder espiritual. A justiça de Deus flui através da paciência, não da explosão.' }
            ],
            sabedoria: [
                { ref: 'Tiago 1:5', text: 'Se algum de vós tem falta de sabedoria, peça-a a Deus, que a todos dá liberalmente e não censura; e ser-lhe-á concedida.', devotional: 'Deus não julga sua pergunta — Ele honra sua humildade. Pedir sabedoria é o primeiro ato sábio. Ele dá sem medir, sem cobrar e sem criticar.' },
                { ref: 'Provérbios 3:5-6', text: 'Confia no Senhor de todo o teu coração e não te estribes no teu próprio entendimento. Reconhece-o em todos os teus caminhos, e ele endireitará as tuas veredas.', devotional: 'A verdadeira sabedoria começa quando paramos de confiar apenas em nossas conclusões. Render o controle ao Pai é a decisão mais inteligente que existe.' },
                { ref: 'Provérbios 4:7', text: 'O princípio da sabedoria é: Adquire a sabedoria; sim, com tudo o que possuis, adquire o entendimento.', devotional: 'Sabedoria não é apenas conhecimento — é aplicação divina do conhecimento. Busque-a como tesouro, porque ela ilumina cada decisão da vida.' }
            ],
            solidao: [
                { ref: 'Deuteronômio 31:6', text: 'Esforçai-vos, e tende bom ânimo; não temais, nem vos espanteis por causa deles, porque o Senhor, vosso Deus, é o que vai convosco; não vos deixará, nem vos desamparará.', devotional: 'Solidão é um sentimento, não uma realidade espiritual. O Deus que nunca dorme está sempre ao seu lado. Mesmo quando o mundo silencia, Ele continua falando ao seu coração.' },
                { ref: 'Salmos 139:7-10', text: 'Para onde me irei do teu Espírito ou para onde fugirei da tua face? Se subir ao céu, tu aí estás; se fizer a minha cama no mais profundo abismo, lá tu estás também.', devotional: 'Não existe lugar no universo onde você esteja fora do alcance de Deus. No pico mais alto ou no vale mais fundo, Ele já está lá esperando por você.' },
                { ref: 'Mateus 28:20', text: 'Eis que eu estou convosco todos os dias, até a consumação dos séculos.', devotional: 'Jesus não disse "às vezes" ou "quando for conveniente". Ele disse TODOS os dias. Essa promessa não tem exceção, não tem limite e não tem fim.' }
            ],
            esperanca: [
                { ref: 'Jeremias 29:11', text: 'Pois eu sei os planos que tenho para vocês, diz o Senhor, planos de fazê-los prosperar e não de causar dano, planos de dar a vocês esperança e um futuro.', devotional: 'O futuro não é caos — é projeto divino. Cada dia que você vive faz parte de um plano maior que seus olhos ainda não enxergam. Confie no Arquiteto.' },
                { ref: 'Romanos 8:28', text: 'E sabemos que todas as coisas cooperam para o bem daqueles que amam a Deus, daqueles que são chamados segundo o seu propósito.', devotional: 'Nem tudo que acontece é bom, mas tudo que acontece pode ser transformado em bem nas mãos de Deus. Ele é o Mestre em transformar dor em propósito.' },
                { ref: 'Isaías 40:31', text: 'Mas os que esperam no Senhor renovarão as suas forças, subirão com asas como águias, correrão e não se cansarão, caminharão e não se fatigarão.', devotional: 'Esperar em Deus não é passividade — é renovação ativa. Enquanto você espera, Ele fortalece. Quando chegar a hora de voar, suas asas estarão prontas.' }
            ]
        };
    }
    
    displayBussolaVerse(emotion) {
        const versesDB = this.getBussolaVerses();
        const verses = versesDB[emotion];
        if (!verses || verses.length === 0) return;
        
        const randomIdx = Math.floor(Math.random() * verses.length);
        const selected = verses[randomIdx];
        
        this._currentBussola = selected;
        
        const verseText = document.getElementById('bussola-verse-text');
        const verseRef = document.getElementById('bussola-verse-ref');
        const devotionalText = document.getElementById('bussola-devotional-text');
        const result = document.getElementById('bussola-result');
        
        if (verseText) verseText.textContent = '"' + selected.text + '"';
        if (verseRef) verseRef.textContent = '— ' + selected.ref;
        if (devotionalText) devotionalText.textContent = selected.devotional;
        if (result) result.classList.add('visible');
    }
    
    async shareBussola() {
        if (!this._currentBussola) return;
        const v = this._currentBussola;
        const text = `"${v.text}"\n\n— ${v.ref}\n\n💬 ${v.devotional}\n\n🧭 Bússola Espiritual — Aeterna`;
        
        if (navigator.share) {
            try {
                await navigator.share({ title: 'Bússola Espiritual — Aeterna', text });
            } catch (e) { /* User cancelled */ }
        } else {
            try {
                await navigator.clipboard.writeText(text);
                this.showShareCopiedNotification();
            } catch (e) { /* Clipboard blocked */ }
        }
    }
}

// Instantiate and attach global window launch listeners
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const app = new AeternaApp();
        await app.init();
    } catch (e) {
        console.error('ERRO FATAL na inicialização do Aeterna:', e);
    }
});

// Global error catcher — prevents silent failures
window.addEventListener('error', (e) => {
    console.error('Erro global capturado:', e.message, e.filename, e.lineno);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Promise não tratada:', e.reason);
});
