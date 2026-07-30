# 🕷️ SPIDERZ — Monster Catcher aus New-Arachne

**A neon-drenched monster-catching arena game where mutated arachnids collide in three factions — scan them, build your team, dose the steroid-vial, and break the RNG-swarm in the arena.**

---

## 🌐 Live Demo

**[View Live Demo →](https://777danielpaul-droid.github.io/SpiderZ/)**

---

## 🛠️ Tech Stack

![React](https://img.shields.io/badge/React-19.2.7-61DAFB?logo=react&logoColor=black&style=for-the-badge)
![Vite](https://img.shields.io/badge/Vite-8.1.1-646CFF?logo=vite&logoColor=white&style=for-the-badge)
![GSAP](https://img.shields.io/badge/GSAP-3.15.0-0AE448?logo=greensock&logoColor=white&style=for-the-badge)
![Supabase](https://img.shields.io/badge/Supabase-2.110.8-3ECF8E?logo=supabase&logoColor=white&style=for-the-badge)
![Oxlint](https://img.shields.io/badge/Oxlint-1.71.0-000000?style=for-the-badge)

---

## ✨ Key Features

### 📡 **Scan & Catch System**
Scroll-driven capture of 18 arachnid species from the cloud-backed `nasamon` database. Each catch feeds your active team of three — with smooth scroll-linked reveals and holo-glass card effects.

### ⚗️ **Steroid-Vial Mechanic**
After the team-reveal, a single vial can be administered to one spider, granting **+100 strength** before the arena. One dose per run — a high-stakes power spike.

### 🏟️ **Arena vs RNG-Swarm**
Your team of three faces three random opponents 1:1. Type advantage (**GIFT / STÄRKE / VERTEIDIGUNG**) grants a bonus; the majority of wins takes the match.

### 🎁 **Booster Pack Reveal**
On victory, scroll through the results, hit **"BOOSTER ÖFFNEN"**, and watch a TCG-pocket-style pack burst open — three cards deal in with holo-shimmer (new spider · steroid-vial · PSA-10 collectible). Mobile-first: tap-to-open + haptic feedback.

### 📜 **Living Lore**
A cinematic "Chronik von Paaway Kaka" modal — dark manuscript glass, gold serif, embedded field footage — telling the origin of the TaschenMonster.

### 🌌 **Holo-Glass Visual System**
GPU-composited neon (cyan / magenta / lime) over a starfield of 42 drifting sparks. Fully respects `prefers-reduced-motion`. Optimized to stay at 55+ FPS.

---

## 🏗️ Architecture & Workflow

Built with a **modern React 19 + Vite** stack, GSAP for scroll-orchestration, and Supabase as the cloud data layer.

- **`App.jsx`** — Central game state, arena resolution, booster & lore flows
- **`useMonData.js`** — Supabase fetch + seeded RNG opponent generation
- **`MonCard.jsx`** / **`ScrubSection.jsx`** — Scroll-pinned catch cards + hint pills
- **`typeBattle.js`** — Type-advantage resolver (GIFT / STÄRKE / VERTEIDIGUNG)
- **`storage.js`** — localStorage persistence (Dex, best-team, records)
- **`BoosterOpen.jsx`** — Tap-to-open pack animation (mobile-first)
- **`supabase/schema.sql`** — `nasamon` table + RLS + public storage bucket

Data lives in **Supabase** (`nasamon` table, public read, service-role write). Apply `supabase/schema.sql` in the Supabase SQL editor, then seed via `scripts/seed.mjs`.

The app follows a **component-driven pattern** with strict separation between scroll orchestration (GSAP ScrollTrigger), data (Supabase), and React UI.

---

## 📊 Performance & Metrics

- **Core Web Vitals**: Optimized for LCP & CLS
- **Animations**: CSS GPU-composited (`transform` / `opacity`), no per-card JS
- **Target FPS**: 55–58 stable on desktop & mobile
- **Accessibility**: `prefers-reduced-motion` honored
- **Deployment**: GitHub Pages
- **Framework**: Vite + React 19

---

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

---

## 📅 Development

```bash
npm install
npm run dev      # local dev server (http://localhost:5173)
npm run build    # production build
npm run preview  # preview the build
npm run lint     # oxlint
```

### Supabase setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Add your keys to `.env` (never commit it):
   ```env
   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
   ```
4. Seed the `nasamon` table via `scripts/seed.mjs`.

---

## 📄 License

MIT — See [LICENSE](LICENSE) file for details.
