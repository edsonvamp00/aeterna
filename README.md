# ✝ AETERNA — Disciplina Espiritual Gamificada

> *"Lâmpada para os meus pés é tua palavra, e luz para o meu caminho."* — Salmos 119:105

Uma plataforma premium de estudo bíblico com gamificação espiritual, leitor bíblico inteligente com anotações teológicas, sistema de streaks e medalhas, e interface celestial glassmorphic.

---

## ✨ Features

- 📖 **Leitor Bíblico Inteligente** — Bíblia completa em português com explicações teológicas integradas ao toque
- 🔍 **Pesquisa Temática** — Busca inteligente por palavras-chave em toda a Bíblia
- 🔥 **Sistema de Streaks** — Gamificação tipo Duolingo para disciplina espiritual
- 🏅 **Medalhas & Rankings** — Comunidade saudável com ranking de XP
- 🗺️ **Mapa de Progresso** — Heatmap visual dos 66 livros bíblicos
- 📋 **Planos de Leitura** — Planos organizados por tema e duração
- 🙏 **Mural de Oração** — Registro de pedidos e respostas
- 📝 **Anotações de Estudo** — Grifo amarelo e notas pessoais por versículo
- 🎨 **Cards Compartilháveis** — Gerador de imagens celestiais para redes sociais
- ✝️ **Revelação Divina** — Experiência imersiva com versículos aleatórios
- 🌗 **Tema Claro/Escuro** — Interface adaptável com transição suave
- 👤 **Perfil com Foto** — Área de usuário personalizada
- 📱 **100% Responsivo** — Desktop, tablet e celular

## 🛠 Stack

| Tecnologia | Uso |
|-----------|-----|
| HTML5 / CSS3 / JS (ES6+) | Frontend SPA puro |
| Supabase | Auth, Database, Storage |
| Canvas API | Gerador de cards compartilháveis |
| LocalStorage | Cache local-first para offline |
| Vercel | Hosting e CDN global |

## 🚀 Deploy

O app está hospedado na Vercel:

**🔗 [aeterna.vercel.app](https://aeterna.vercel.app)**

## 📂 Estrutura

```
├── src/
│   ├── index.html          # Página principal (SPA)
│   ├── app.js              # Lógica do aplicativo (2400+ linhas)
│   ├── supabase.js         # Engine de banco de dados com fallback local
│   ├── styles.css          # Design system celestial (3300+ linhas)
│   └── bible_pt.json       # Bíblia completa em português (~31k versículos)
├── vercel.json             # Configuração de deploy
├── package.json            # Metadados do projeto
└── schema.sql              # Schema do banco Supabase
```

## 🔧 Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Iniciar servidor local
npm run dev

# Abrir no navegador
# http://localhost:3000
```

## 📜 Licença

Desenvolvido com ❤️ e fé.
