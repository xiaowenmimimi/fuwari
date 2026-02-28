# 🍥 Fuwari (Customized Version)

![Node.js >= 20](https://img.shields.io/badge/node.js-%3E%3D20-brightgreen)
![pnpm >= 9](https://img.shields.io/badge/pnpm-%3E%3D9-blue)

📖 README: [English](./README.en.md) | [简体中文](../README.md) | [日本語](./README.ja.md) | [Español](./README.es.md) | [Indonesia](./README.id.md) | [한국어](./README.ko.md) | [ภาษาไทย](./README.th.md) | [Tiếng Việt](./README.vi.md)

Versi kustomisasi dari template blog statis [Fuwari](https://github.com/saicaca/fuwari) yang dibangun dengan [Astro](https://astro.build).

Sambil mempertahankan animasi halus dan desain bersih dari versi aslinya, ini mengintegrasikan fitur praktis seperti **Pelacakan Bangumi**, **Komentar Waline**, **Statistik Umami**, dll. Pada saat yang sama, **detail UI** telah dioptimalkan secara mendalam.

[**🖥️ Pratinjau Blog Saya**](https://blog.xhwen.cn)

## ✨ Fitur Baru

Dibandingkan dengan Fuwari asli, proyek ini terutama menambahkan fitur-fitur berikut:

- 📺 **Halaman Pelacakan Bangumi**
  - Integrasi API Bangumi, secara otomatis menampilkan kemajuan menonton.
  - Mendukung penyaringan dan paginasi anime.
  - Halaman detail menampilkan sampul anime, peringkat, ringkasan, dan informasi lainnya.

- 💬 **Sistem Komentar Waline**
  - Komponen komentar Waline bawaan, mendukung interaksi komentar pada halaman artikel.
  - Mendukung adaptasi otomatis mode gelap.
  - Konfigurasi alamat server yang fleksibel di `src/config.ts`.

- 📊 **Integrasi Statistik Umami**
  - Skrip statistik Umami bawaan, tidak perlu memodifikasi HTML secara manual.
  - Mendukung tampilan statistik PV/UV halaman.
  - Penanganan otomatis pelaporan statistik saat beralih rute (kompatibel dengan Swup).

## 🛠️ Panduan Konfigurasi

Semua item konfigurasi proyek ini terletak di file `src/config.ts` dan menyertakan komentar penjelasan yang rinci.

## 📝 Sintaks Ekstensi Markdown

Selain sintaks Markdown yang didukung secara default oleh Astro, proyek ini memperluas komponen kartu tautan `::link-card`.

**Sintaks:**

```markdown
::link-card{title="Judul" url="Alamat Tautan" desc="Deskripsi(Opsional)" image="Tautan Gambar(Opsional)" badge="Lencana(Opsional)" target="Target (`_blank`, `_self`, default `_blank`)(Opsional)"}
```

## 🚀 Menjalankan Secara Lokal

1. Klon repositori:
   ```bash
   git clone https://github.com/xiaowenmimimi/fuwari.git
   cd fuwari
   ```

2. Instal dependensi:
   ```bash
   pnpm install
   ```

3. Jalankan server pengembangan:
   ```bash
   pnpm dev
   ```

4. Build versi produksi:
   ```bash
   pnpm build
   ```

## ⚡ Perintah Umum

| Perintah | Deskripsi |
|:---|:---|
| `pnpm install` | Instal dependensi |
| `pnpm dev` | Jalankan server pengembangan lokal (`localhost:4321`) |
| `pnpm build` | Build situs produksi ke `./dist/` |
| `pnpm preview` | Pratinjau hasil build |
| `pnpm new-post <filename>` | Buat postingan baru |

## 🤝 Ucapan Terima Kasih

- Penulis tema asli: [Saicaca/fuwari](https://github.com/saicaca/fuwari)
- Referensi fitur Bangumi: [Kasuha](https://kasuha.com/posts/fuwari-enhance-ep2/)

## 📄 Lisensi

Proyek ini mengikuti protokol open source [MIT License](./LICENSE), lihat file LICENSE untuk detailnya.

Awalnya di-fork dari [saicaca/fuwari](https://github.com/saicaca/fuwari), terima kasih kepada penulis asli.
