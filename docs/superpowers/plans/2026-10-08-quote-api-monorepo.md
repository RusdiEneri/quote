# Quote API Monorepo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengonfigurasi backend Hugging Face Spaces (Docker + CORS + port 7860), membangun frontend web interaktif (Vite + Vanilla JS + modern CSS) di `frontend/` untuk deploy ke Vercel, serta menghubungkan remote Git ke Hugging Face dan GitHub dengan riwayat commit tetap utuh.

**Architecture:** Monorepo dengan root directory sebagai backend Hugging Face Space Docker engine (Bun + Hono + Cairo/Canvas + Sharp) dan sub-directory `frontend/` sebagai aplikasi web Vercel dengan live preview, image generator, code exporter, dan proxy routing.

**Tech Stack:** Bun, Hono, Node-Canvas, Sharp, Docker, Vite, Vanilla JavaScript, Modern CSS (Dark glassmorphism).

**Spec:** [`docs/superpowers/specs/2026-10-08-quote-api-monorepo-design.md`](file:///c:/Users/Administrator/Documents/PROJECT-GITHUB/quote-api/docs/superpowers/specs/2026-10-08-quote-api-monorepo-design.md)

## Global Constraints

- Backend harus mendengarkan di port `7860` (standar Hugging Face Docker Spaces) melalui `process.env.PORT || 7860`.
- CORS harus diizinkan (`origin: '*'`) agar browser di domain mana saja dapat melakukan request ke endpoint backend.
- Riwayat commit dari repositori `DikaArdnt/quote` harus tetap utuh (tidak ada rebase/squash yang menghilangkan commit terdahulu).
- Frontend menggunakan Vite + Vanilla JS + CSS murni (tanpa framework React/Vue/Tailwind yang berlebih), menerapkan prinsip Anti-Slop (tanpa placeholder text, semua tombol/event fungsional).
- Menjalankan verifikasi DOM dan console via Chrome DevTools MCP sebelum menyatakan selesai.

## Review Focus

- Cold-start Hugging Face Spaces: Frontend harus menangani timeout dan menampilkan status koneksi yang ramah saat backend baru bangun.
- CORS preflight `OPTIONS` request: Endpoint backend harus merespons header CORS dengan benar.
- File upload avatar: Avatar lokal harus otomatis dikonversi ke Base64 Data URL tanpa crash pada gambar berukuran besar.
- Validasi form quote: Mencegah pengiriman request jika teks pesan kosong atau nama pengirim tidak diisi.
- Preservasi git remote: Memastikan remote `hf` terotentikasi dan branch `main` sinkron tanpa merusak commit asli.

---

### Task 1: Backend Hugging Face Docker & CORS Setup

**Files:**
- Modify: `README.md:1-10`
- Modify: `Dockerfile:1-12`
- Modify: `src/index.js:1-25, 140-157`

**Interfaces:**
- Produces: API HTTP server dengan header CORS aktif di port `7860` (`POST /` dan `GET /status`).

- [ ] **Step 1: Tambahkan metadata YAML Hugging Face di bagian atas `README.md`**
```yaml
---
title: Quote API
emoji: 💬
colorFrom: indigo
colorTo: purple
sdk: docker
app_port: 7860
---
```

- [ ] **Step 2: Update `src/index.js` untuk menambahkan middleware CORS dan default port 7860**
Tambahkan `import { cors } from 'hono/cors';` dan aktifkan `app.use('*', cors())`. Atur `port: process.env.PORT || 7860`.

- [ ] **Step 3: Update `Dockerfile` untuk kompatibilitas Hugging Face Spaces**
Pastikan user non-root (UID 1000) diset jika diperlukan, atur `ENV PORT=7860` dan `EXPOSE 7860`.

- [ ] **Step 4: Verifikasi backend syntax dan start script**
Jalankan pengecekan file index dan package.

- [ ] **Step 5: Commit perubahan backend**
```bash
git add README.md Dockerfile src/index.js
git commit -m "feat(backend): configure Hugging Face space metadata, port 7860, and CORS"
```

---

### Task 2: Frontend Scaffolding & Configuration

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.js`
- Create: `frontend/vercel.json`
- Create: `frontend/index.html`

**Interfaces:**
- Produces: Project Vite siap pakai di direktori `frontend/` dengan konfigurasi Vercel rewrite proxy ke Hugging Face backend.

- [ ] **Step 1: Buat `frontend/package.json`**
Definisikan project Vite dengan script `dev`, `build`, dan `preview`.

- [ ] **Step 2: Buat `frontend/vite.config.js`**
Konfigurasikan Vite dev server dan proxy lokal ke backend.

- [ ] **Step 3: Buat `frontend/vercel.json`**
Konfigurasikan rewrite rules ke `https://ilhamdev-quote-api.hf.space` dan header cache.

- [ ] **Step 4: Buat semantic `frontend/index.html`**
Siapkan struktur HTML lengkap: meta tags, SEO tags, link font Outfit & Inter, container App dengan sidebar form builder, preview panel Telegram, dan code playground.

- [ ] **Step 5: Install dependensi Vite di `frontend/`**
Jalankan `npm install` di dalam direktori `frontend`.

- [ ] **Step 6: Commit konfigurasi frontend**
```bash
git add frontend/package.json frontend/vite.config.js frontend/vercel.json frontend/index.html
git commit -m "chore(frontend): scaffold Vite project and Vercel configuration"
```

---

### Task 3: Frontend Modern CSS Design System

**Files:**
- Create: `frontend/src/styles/base.css`
- Create: `frontend/src/styles/components.css`
- Create: `frontend/src/styles/preview.css`

**Interfaces:**
- Consumes: Semantic classes di `frontend/index.html`.
- Produces: Visual styling dark glassmorphism, responsive grid layout (desktop & mobile reflow), form controls, dan telegram quote preview bubble.

- [ ] **Step 1: Buat `frontend/src/styles/base.css`**
Terapkan CSS reset, CSS custom properties (color tokens, gradients, typography, shadows, borders).

- [ ] **Step 2: Buat `frontend/src/styles/components.css`**
Styling untuk inputs, buttons, switches/toggles, tabs, badge status backend, toast notification, dan copy buttons.

- [ ] **Step 3: Buat `frontend/src/styles/preview.css`**
Styling khusus untuk Telegram Chat Card simulation (avatar, author name, verified/admin badge, message bubble, quoted reply preview, timestamp, status ticks, action toolbar).

- [ ] **Step 4: Commit styling system**
```bash
git add frontend/src/styles/
git commit -m "feat(frontend): implement dark glassmorphism design system"
```

---

### Task 4: Frontend Application Logic & Telegram Quote Builder

**Files:**
- Create: `frontend/src/main.js`

**Interfaces:**
- Consumes: Input form data dari DOM.
- Produces:
  - Real-time SVG/DOM preview synchronization.
  - Image generator client yang memanggil backend HF (`https://ilhamdev-quote-api.hf.space` atau `/api/generate`).
  - File picker avatar to Base64 reader.
  - Image download trigger (PNG) & clipboard copy.
  - Dynamic code snippet generator (cURL, JS Fetch, Python requests).

- [ ] **Step 1: Implementasikan State Management & DOM Event Handlers**
Sinkronisasi real-time antara form inputs (nama, username, teks, avatar URL/upload, toggle reply, background) dan live preview.

- [ ] **Step 2: Implementasikan Avatar File Picker & Image Reader**
FileReader API untuk membaca upload gambar lokal dan menghasilkan Data URL base64.

- [ ] **Step 3: Implementasikan Backend API Caller & Error Handling**
Fungsi `generateQuoteImage()` dengan status loading indicator, cold-start alert, dan render hasil image base64 ke preview result modal/container.

- [ ] **Step 4: Implementasikan Exporter (Download & Copy to Clipboard)**
Handler untuk mendownload gambar PNG dan menyalin gambar ke clipboard browser (`navigator.clipboard.write`).

- [ ] **Step 5: Implementasikan Code Snippets Generator**
Sinkronisasi data payload ke tampilan tab cURL, JS Fetch, dan Python.

- [ ] **Step 6: Commit modul logika frontend**
```bash
git add frontend/src/main.js
git commit -m "feat(frontend): implement quote generator logic, live preview, and export tools"
```

---

### Task 5: Build & Runtime Verification

**Files:**
- Test / Verify: `frontend/dist/`
- Runtime verification: Chrome DevTools MCP / local preview

- [ ] **Step 1: Jalankan build frontend**
Jalankan `npm run build` di direktori `frontend` untuk memverifikasi tidak ada error sintaks atau bundling.

- [ ] **Step 2: Jalankan preview server lokal**
Jalankan `npm run preview` atau `npm run dev` pada Vite.

- [ ] **Step 3: Verifikasi via Chrome DevTools MCP**
Buka URL lokal di browser, cek console logs (pastikan zero error), cek rendering DOM form, preview, dan event listener interaktif.

- [ ] **Step 4: Tangkap snapshot atau screenshot sebagai bukti runtime**
Dokumentasikan verifikasi runtime.

- [ ] **Step 5: Commit build output verification if applicable**
```bash
git status
```

---

### Task 6: Git Remote Synchronization (Hugging Face & GitHub)

**Files:**
- Git remotes & commit log

- [ ] **Step 1: Periksa riwayat commit lengkap**
Pastikan commit asli `DikaArdnt/quote` tetap ada di posisi awal.

- [ ] **Step 2: Atur git remote `origin` ke GitHub user**
Set URL remote `origin` ke `https://github.com/RusdiEneri/quote.git`.

- [ ] **Step 3: Push commit ke Hugging Face Space `hf/main`**
Jalankan `git push hf master:main` menggunakan kredensial token HF yang telah disediakan.

- [ ] **Step 4: Verifikasi status Space di Hugging Face**
Pastikan push berhasil diterima oleh remote Hugging Face.

- [ ] **Step 5: Dokumentasi instruksi setup Vercel & Subdomain**
Update panduan singkat untuk langkah deploy Vercel dan menghubungkan custom domain `qc.mangrusdi.my.id`.
