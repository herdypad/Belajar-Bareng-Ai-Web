# Belajar Bareng AI

Aplikasi latihan soal pilihan ganda yang di-generate AI (OpenAI / Anthropic). Spesifikasi: [`specs/PRD.md`](specs/PRD.md).

## Menjalankan

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start   # production (service worker offline aktif)
```

Buka **Pengaturan**, pilih provider, isi API key, lalu **Buat Kuis**.

## Struktur

```
src/
├── app/                 # routing (App Router)
│   ├── api/generate/    # proxy ke OpenAI/Anthropic + validasi JSON
│   ├── create, quiz, result, review, history, settings
├── modules/             # tampilan per fitur (home, create-quiz, quiz-runner, result, review, history, settings)
├── components/          # UI bersama (tombol, dialog, navigasi, ikon)
└── lib/                 # model data, repository localStorage, parser soal, tema
public/sw.js             # service worker untuk akses offline
```

## Catatan

- Data (kuis, hasil, sesi pengerjaan, pengaturan) tersimpan di `localStorage` browser, tanpa login.
- Sesi pengerjaan disimpan per kuis, jadi refresh tidak mereset timer. Kalau waktu habis, jawaban dikumpulkan otomatis.
- API key dikirim ke `/api/generate` hanya saat generate soal, lalu diteruskan ke provider. Server tidak menyimpan key.
- Endpoint `/api/generate` tidak memakai autentikasi. Kalau di-deploy publik, tambahkan rate limiting.
