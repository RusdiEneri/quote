# Spec Desain: Quote API Monorepo (Hugging Face Backend + Vercel Frontend)

Tanggal: 2026-10-08  
Status: Approved  

---

## 1. Ringkasan & Tujuan Proyek

Proyek ini mentransformasi repositori generator fake chat quote Telegram (`DikaArdnt/quote`) menjadi arsitektur monorepo terpadu:
1. **Backend Engine**: Dijalankan di Hugging Face Spaces (`https://huggingface.co/spaces/ilhamdev/quote-api`) berbasis Docker (Bun + Hono + Cairo/Canvas + Sharp), dengan dukungan CORS penuh dan port 7860.
2. **Frontend Web**: Dideploy di Vercel (target custom domain `qc.mangrusdi.my.id`) di direktori `frontend/`, dibangun menggunakan Vite + Vanilla JS + Modern CSS (dark mode, glassmorphism, responsive, zero-framework overhead).
3. **Preservasi Git**: Seluruh riwayat commit asli dari `DikaArdnt/quote` dipertahankan secara utuh tanpa git fork terpisah (seperti import repo), remote `hf` diset ke Space Hugging Face, dan remote `origin` diarahkan ke repositori GitHub `quote` milik pengguna.

---

## 2. Arsitektur Sistem

```
+-------------------------------------------------------------+
|                      User Browser                           |
|         (qc.mangrusdi.my.id / Vercel Web App)               |
+-------------------------------------------------------------+
                               |
               +---------------+---------------+
               |                               |
       Direct HTTP POST                Vercel Rewrite Proxy
  (https://ilhamdev-quote-api.hf.space)      (/api/* -> HF)
               |                               |
               +---------------+---------------+
                               |
                               v
+-------------------------------------------------------------+
|               Hugging Face Space (Docker)                  |
|                 ilhamdev/quote-api (Port 7860)              |
|                                                             |
|   +-------------------+       +-------------------------+   |
|   |  Hono Web Server  | ----> | Inflight Queue + Cache  |   |
|   +-------------------+       +-------------------------+   |
|             |                                               |
|             v                                               |
|   +-------------------+       +-------------------------+   |
|   |  Cairo / Canvas   | ----> | Sharp (PNG/WebP Export) |   |
|   +-------------------+       +-------------------------+   |
+-------------------------------------------------------------+
```

---

## 3. Komponen Backend (Hugging Face Spaces)

### 3.1 Lokasi & Runtime
- **Path**: Root repositori (`/`).
- **Runtime**: Bun di dalam container Docker Alpine.
- **Port**: Default `7860` (standar Hugging Face Docker Spaces) dengan fallback `process.env.PORT`.

### 3.2 Metadata Hugging Face (`README.md`)
Menambahkan YAML frontmatter pada bagian paling atas `README.md`:
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

### 3.3 Penyesuaian `Dockerfile`
- Menyesuaikan dependensi sistem Alpine (`font-noto`, `font-noto-cjk`, `vips-dev`, `cairo-dev`, `pango-dev`, `libjpeg-turbo-dev`, `imagemagick`, `libstdc++`, `gcompat`).
- Menambahkan user non-root (UID 1000) dan hak kepemilikan direktori `/app` untuk memenuhi kepatuhan keamanan Hugging Face Spaces.
- `ENV PORT=7860` dan `EXPOSE 7860`.
- Menjalankan perintah startup `CMD ["bun", "start"]`.

### 3.4 Penyesuaian Server (`src/index.js`)
- Menambahkan `import { cors } from 'hono/cors';`.
- Menerapkan middleware CORS:
  ```javascript
  app.use('*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }));
  ```
- Memastikan `port: process.env.PORT || 7860` aktif di export default server.
- Mempertahankan fungsionalitas caching (`cache-manager`), in-flight deduplication (`fastq`), serta endpoint status `/status`.

---

## 4. Komponen Frontend (`frontend/`)

### 4.1 Stack & Prinsip Desain
- **Stack**: Vite + Vanilla JavaScript + CSS Modern.
- **Prinsip Anti-Slop**: Tidak ada dummy text ("Lorem ipsum"), tidak ada tombol dekoratif yang mati, semua event handler fungsional, micro-animations yang halus dan performan.
- **Tema Visual**: Dark glassmorphic interface, palet warna slate (`#090d16`, `#111827`, `#1f2937`), accent gradient indigo & cyan (`#6366f1` -> `#06b6d4`), tipografi Outfit / Inter.

### 4.2 Struktur File Frontend
```
frontend/
├── index.html              # Struktur markup semantik, SEO meta tag, form & preview container
├── package.json            # Scripts: dev, build, preview (Vite)
├── vercel.json             # Konfigurasi Vercel: rewrite proxy ke Hugging Face & headers
├── vite.config.js          # Konfigurasi build Vite
├── public/                 # Favicon dan aset statis
└── src/
    ├── styles/
    │   ├── base.css        # CSS reset, typography, variable tokens
    │   ├── components.css  # Komponen form, buttons, tabs, modal, switch
    │   └── preview.css     # Telegram chat preview card & code syntax display
    └── main.js             # Logic state, live preview renderer, API caller, download & copy
```

### 4.3 Fitur Antarmuka
1. **Form Builder Telegram Quote**:
   - **Sender Info**: Nama pengirim (wajib), username (opsional), first/last name, Telegram badge/title ("Admin", "Owner", dsb.).
   - **Avatar Manager**: Input URL gambar langsung atau tombol Upload Avatar lokal (file picker mengonversi gambar ke base64 data URL).
   - **Pesan Chat**: Teks multiline, toggle format entities otomatis (`entities: "auto"`).
   - **Reply Quote (Kutipan Balasan)**: Toggle on/off untuk mensimulasikan pesan yang dibalas (nama yang dibalas dan cuplikan teks balasan).
   - **Media Attachment**: Input URL gambar/media opsional di dalam balon chat.
   - **Kustomisasi Gaya**:
     - Format: `quote` (balon chat klasik), `stories` (ukuran cerita 9:16 vertikal), atau `image` (background canvas dengan watermark).
     - Warna Background: Color picker interaktif + preset palette warna gelap Telegram.
     - Watermark input (khusus untuk tipe `stories` dan `image`).
     - Scale slider (1x, 2x, 3x).
2. **Interactive Live Preview**:
   - Preview visual balon chat Telegram yang langsung ter-update saat user mengetik.
   - Status badge indikator koneksi backend HF (`Online` / `Checking...`).
3. **Aksi & Ekspor**:
   - Tombol **Generate via API**: Mengirim payload ke HF Space Backend.
   - Preview hasil render asli dari server.
   - Tombol **Download PNG/WebP** otomatis.
   - Tombol **Copy to Clipboard**.
4. **Developer Playground**:
   - Tab interaktif menampilkan payload JSON request.
   - Snippet cURL, JavaScript `fetch`, dan Python `requests` yang ter-update otomatis sesuai data form.

### 4.4 Konfigurasi Vercel (`frontend/vercel.json`)
```json
{
  "rewrites": [
    {
      "source": "/api/generate",
      "destination": "https://ilhamdev-quote-api.hf.space/"
    },
    {
      "source": "/api/status",
      "destination": "https://ilhamdev-quote-api.hf.space/status"
    }
  ]
}
```

---

## 5. Alur Data & Error Handling

1. **Client Request**: Frontend mengirim `POST /` (atau via `/api/generate`) dengan `Content-Type: application/json`.
2. **Cold-start & Timeout Handling**:
   - Free tier Hugging Face Spaces dapat mengalami sleep/cold-start.
   - Frontend mengimplementasikan timeout guard (30 detik) dan tampilan status user-friendly: *"Menghubungkan ke API Space... (membangunkan server jika sedang idle)"*.
   - Tombol retry instan jika terjadi kegagalan jaringan.
3. **Validasi Frontend**:
   - Memastikan field `text` dan `from.name` tidak kosong sebelum request dikirim.

---

## 6. Git & Remote Management

1. **Remote Origin**: `https://github.com/RusdiEneri/quote.git` (menyimpan seluruh commit history lama DikaArdnt + commit baru monorepo).
2. **Remote Hugging Face**: `https://ilhamdev:<token>@huggingface.co/spaces/ilhamdev/quote-api` branch `main`.
3. **Aturan Commit**: Commit rapi per komponen tanpa rebase/force-push yang merusak riwayat masa lalu.

---

## 7. Rencana Verifikasi & Testing

1. **Backend Verification**:
   - Jalankan build Docker lokal atau uji server `bun run src/index.js`.
   - Uji endpoint `GET /status` dan request `POST /` dengan payload JSON.
   - Verifikasi header CORS `Access-Control-Allow-Origin: *`.
2. **Frontend Verification**:
   - Jalankan `npm run build` di folder `frontend` untuk memvalidasi zero bundling error.
   - Buka aplikasi web lokal via Vite, verifikasi DOM dan console log bebas error.
   - Uji interaktivitas: perubahan input nama/pesan/avatar/background, toggle reply, generate gambar, download gambar.
   - Uji verifikasi runtime via Chrome DevTools MCP.
