# Dokumentasi Teknis SupervisiEdu

Dokumen ini menjelaskan sistem **SupervisiEdu** (aplikasi supervisi klinis sekolah) untuk developer yang baru bergabung: fitur, fungsi, logika, hubungan antar fitur, dan alur kodenya. Sumber kebenarannya adalah kode di repo ini; bagian yang tidak bisa dipastikan dari kode ditandai "(belum terverifikasi)".

**Cara membaca:** mulai dari bagian 1-3 (gambaran dan arsitektur), lanjut ke bagian 8 (alur antar fitur) untuk melihat gambaran utuh, lalu buka bagian panel sesuai area yang akan dikerjakan. Semua path file relatif terhadap `src/` kecuali disebut lain.

## Daftar Isi

1. [Ringkasan Sistem](#1-ringkasan-sistem)
2. [Tech Stack](#2-tech-stack)
3. [Arsitektur dan Pola Kode](#3-arsitektur-dan-pola-kode)
4. [Model Data](#4-model-data)
5. [Autentikasi dan Akun](#5-autentikasi-dan-akun)
6. [Notifikasi](#6-notifikasi)
7. [Konfigurasi dan Menjalankan](#7-konfigurasi-dan-menjalankan)
8. [Alur Antar Fitur](#8-alur-antar-fitur-bagaimana-semuanya-terhubung)
9. [Catatan Teknis, Risiko, dan Utang Teknis](#9-catatan-teknis-risiko-dan-utang-teknis)
10. [Panduan Menambah Fitur](#10-panduan-menambah-fitur)
11. [Glosarium](#11-glosarium)
12. [Rincian: Landing Page, Login, dan Panel Admin](#12-rincian-landing-page-login-dan-panel-admin)
13. [Rincian: Panel Guru](#13-rincian-panel-guru)
14. [Rincian: Panel Kepala Sekolah](#14-rincian-panel-kepala-sekolah)
15. [Rincian: Fitur Lintas Peran (Pesan, Profil, Notifikasi, Sidebar)](#15-rincian-fitur-lintas-peran-pesan-profil-notifikasi-sidebar)

---

## 1. Ringkasan Sistem

**SupervisiEdu** adalah aplikasi web untuk mengelola **supervisi klinis** di sekolah secara digital. Alurnya mengikuti siklus supervisi klinis: perencanaan (RMP dan jadwal), pra-konferensi (kontrak fokus observasi), observasi (rubrik penilaian), pasca-konferensi (umpan balik, RTL), sampai dampak supervisi. Formulirnya dipetakan ke kode instrumen **SPVC-01 s.d. SPVC-09**.

Tiga peran pengguna:

| Peran | Nilai `role` | Tugas utama |
|---|---|---|
| Guru | `guru` | Menyusun RMP, melihat jadwal dan laporan supervisi, mengirim video mengajar, berkirim pesan dengan kepsek |
| Kepala Sekolah | `kepsek` | Meninjau RMP dan video, membuat jadwal, mengisi laporan observasi dan formulir SPVC, melihat statistik |
| Administrator | `admin` | Mengelola akun pengguna, pengaturan sekolah (kop dokumen), mengawasi dan menghapus RMP |

## 2. Tech Stack

| Lapisan | Teknologi |
|---|---|
| Framework | Next.js 16.2.6 (App Router), React 19.2.4, TypeScript 5 |
| Backend / DB | Supabase (PostgreSQL + Auth + Storage + Realtime) via `@supabase/ssr` dan `@supabase/supabase-js` |
| UI | Tailwind CSS 4, lucide-react, framer-motion, sonner (toast), recharts (grafik) |
| Dokumen | `html2canvas-pro` + `jspdf` (PDF RMP), `xlsx` (impor pengguna massal), `react-signature-canvas` (tanda tangan) |
| Deploy | Vercel; `vercel.json` memuat cron harian `/api/keep-alive` |

> Catatan penting: proyek ini memakai Next.js versi baru dengan perubahan API. `AGENTS.md` mewajibkan membaca `node_modules/next/dist/docs/` sebelum menulis kode. Misalnya, `middleware` di sini bernama `src/proxy.ts` dengan fungsi `proxy`.

Alias impor: `@/*` menunjuk ke akar repo, jadi import ditulis `@/src/...`.

Tema visual (lihat `CLAUDE.md`): Deep Navy `#002147`, aksen emas gradasi `#FFC600` ke `#F7A800`, kartu putih dengan border tipis, dan efek hover bayangan lebih dalam dengan border emas. Font judul Playfair Display, isi Inter (`src/app/layout.tsx`).

## 3. Arsitektur dan Pola Kode

### 3.1 Tiga klien Supabase (`src/utils/supabase/`)

| File | Fungsi | Kunci | Dipakai di | Keterangan |
|---|---|---|---|---|
| `client.ts` | `createBrowserClient()` | anon | Client Component | Tunduk pada RLS; dipakai untuk realtime, upload storage, query ringan |
| `server.ts` | `createServerClient()` | anon + cookie sesi | Server Component dan Server Action | Bertindak sebagai pengguna yang login, tunduk pada RLS |
| `admin.ts` | `createAdminClient()` | **service role** | Hanya server | **Melewati RLS.** Dipakai untuk membuat akun auth, menulis notifikasi untuk pengguna lain, menghapus RMP oleh admin, dan membaca profil orang lain |

Kunci service role tidak boleh sampai ke browser. `SUPABASE_SERVICE_ROLE_KEY` tidak berawalan `NEXT_PUBLIC_`, dan `admin.ts` hanya diimpor dari file `'use server'` atau Server Component.

### 3.2 Gerbang akses (`src/proxy.ts`)

Berjalan di setiap request (kecuali `/api`, aset statis, dan file berekstensi):

1. Path berawalan `/dashboard`, `/laporan`, `/jadwal`, `/profil` tanpa sesi: redirect ke `/login`.
2. Sudah login membuka `/login`: ke `/dashboard` bila `profiles.is_verified`, selain itu ke `/verify-profile`.
3. Sudah terverifikasi membuka `/verify-profile`: ke `/dashboard`.

Proxy **hanya mengecek sudah login atau belum.** Pemeriksaan peran dilakukan di dua tempat: `src/app/dashboard/page.tsx` (router peran, lihat 3.3) dan di setiap Server Action lewat fungsi `requireKepsek()`, `requireAdmin()`, `requireGuru()`, `requireUser()` yang ditulis ulang di tiap `actions.ts`. Halaman di bawah `/dashboard/{peran}/` tidak otomatis menolak peran lain di level proxy; perlindungan data bertumpu pada RLS dan pemeriksaan di action.

### 3.3 Router peran (`src/app/dashboard/page.tsx`)

Membaca `profiles` milik pengguna. Tanpa baris profil atau `is_verified=false`: `/verify-profile`. Selain itu `switch(role)` ke `/dashboard/admin`, `/dashboard/kepsek`, atau `/dashboard/guru`.

### 3.4 Pola Server Action

Semua mutasi data ada di file `actions.ts` berdirektif `'use server'`, dengan pola yang seragam:

1. Ambil user: `supabase.auth.getUser()`.
2. Cek peran lewat tabel `profiles`.
3. Validasi input dan **cek kepemilikan atau status** (misalnya "hanya draft yang boleh dihapus").
4. Tulis ke DB dengan klien server (RLS ikut berlaku), atau `createAdminClient()` bila perlu melewati RLS.
5. Kirim notifikasi dengan menyisipkan baris ke tabel `notifications` memakai klien admin.
6. `revalidatePath(...)` untuk semua halaman yang datanya berubah.
7. Mengembalikan `{ error?: string, ... }`. Server Action tidak melempar exception ke UI.

Banyak `as never` / `as unknown as {...}` di kode. Itu akibat tipe generik Supabase yang tidak cocok dengan `Database` buatan tangan di `src/types/database.ts`, bukan bug logika.

### 3.5 Layout dashboard

`src/app/dashboard/layout.tsx` membungkus semua halaman dashboard dengan `<NotificationBell />` (lonceng melayang di pojok kanan bawah). Setiap peran punya sidebar sendiri (`AdminSidebar`, `GururSidebar`, `KepsekSidebar`) yang dirender oleh halaman masing-masing.

## 4. Model Data

> **Penting:** repo ini **tidak menyimpan migrasi SQL**. Skema tabel inti (`profiles`, `schedules`, `supervision_reports`, `rmp_forms`, `school_settings`, `rmp_deletion_requests`, `notifications`) dan kebijakan RLS-nya dibuat langsung di Supabase Dashboard. Sumber kebenaran tipe kolom di sisi kode adalah `src/types/database.ts`. Skema fitur yang lebih baru (pesan, video, foto profil, link Zoom) terdokumentasi sebagai SQL di `docs/superpowers/plans/*.md`. Orang yang menyiapkan Supabase baru harus mengambil skema dari dashboard proyek yang berjalan atau dari file plan tersebut.

### 4.1 Tabel

| Tabel | Isi | Kolom penting |
|---|---|---|
| `profiles` | Profil, satu baris per akun auth (`id` = `auth.users.id`) | `full_name`, `email` (`NIP@sistem.lokal`), `role`, `nip`, `avatar_url`, `signature_url`, `is_verified` |
| `schedules` | Jadwal supervisi | `supervisor_id`, `teacher_id`, `scheduled_date/time`, `subject`, `class_name`, `status` (`dijadwalkan`/`selesai`/`dibatalkan`), `zoom_link_pra/pengamatan/pasca`, `kontrak_fokus[]`, `kontrak_catatan` (SPVC-02) |
| `supervision_reports` | Laporan observasi | `supervisor_id`, `teacher_id`, `schedule_id`, `visit_date`, `instrument_type`, `observation_scores` (jsonb, SPVC-03), `score`, `status` (`draft`/`submitted`/`approved`), `rtl_items` (SPVC-07/08), `documentation_urls`, `spvc04/05/06/09` (jsonb naratif) |
| `rmp_forms` | Rencana Modul Projek | `guru_id`, `judul`, `tema`, `fase`, `kelas`, `dimensi_p5[]`, `elemen_p5[]`, 4 kolom `aktivitas_*`, 3 kolom `asesmen_*`, `status` (`draft`/`submitted`/`approved`/`revision`), `catatan_kepsek`, `admin_ceklis[]` (SPVC-01), `reviewed_by/at` |
| `rmp_deletion_requests` | Permintaan guru menghapus RMP yang sudah dikirim | `rmp_id`, `guru_id`, `reason`, `status` (`pending`/`approved`/`rejected`), `admin_note` |
| `teaching_videos` | Video mengajar (hanya tautan eksternal) | `teacher_id`, `schedule_id`, `title`, `video_url`, `status` (`belum_ditinjau`/`sudah_ditinjau`), `kepsek_note` |
| `conversations` | Satu percakapan per pasangan guru-kepsek | `guru_id`, `kepsek_id`; `unique(guru_id, kepsek_id)` |
| `messages` | Isi pesan | `conversation_id`, `sender_id`, `body`, `edited_at`, `deleted_at` (soft delete) |
| `notifications` | Notifikasi dalam aplikasi | `user_id`, `title`, `message`, `link`, `is_read` |
| `school_settings` | Satu baris (`id = 1`) berisi kop surat dan identitas sekolah | `school_name`, `header_line_1/2`, `address`, `phone`, `email`, `website`, `logo_url` |

### 4.2 Relasi (ringkas)

```
auth.users 1─1 profiles
profiles(guru)   1─* schedules(teacher_id)  *─1 profiles(kepsek, supervisor_id)
schedules        1─* supervision_reports(schedule_id, opsional)
profiles(guru)   1─* rmp_forms(guru_id)     1─* rmp_deletion_requests(rmp_id)
profiles(guru)   1─* teaching_videos(teacher_id) ─ schedules(schedule_id, opsional)
profiles(guru) 1─* conversations *─1 profiles(kepsek) 1─* messages(sender_id)
profiles         1─* notifications(user_id)
```

### 4.3 Storage (bucket Supabase)

| Bucket | Dipakai oleh | Isi dan path | Akses |
|---|---|---|---|
| `avatars` | `AvatarUploader.tsx` | Foto profil, `{userId}/avatar.{ext}` | publik baca; tulis dibatasi folder milik `auth.uid()` |
| `signatures` | `SignatureUploader.tsx` | Tanda tangan, folder per `userId` | lihat kode |
| `supervisi-dokumentasi` | `LaporanDokumentasi.tsx` | Foto/berkas dokumentasi laporan (maks 12) | lihat kode |
| `school-assets` | `SchoolSettingsForm.tsx` | Logo sekolah, folder `logo/` | lihat kode |

URL publik disimpan di kolom DB (`avatar_url`, `signature_url`, `logo_url`, `documentation_urls`).

### 4.4 Row Level Security (yang terdokumentasi di repo)

- `conversations`: hanya peserta (`guru_id` atau `kepsek_id`) yang dapat melihat, membuat, dan mengubah.
- `messages`: peserta percakapan dapat membaca; hanya peserta yang menyisipkan dengan `sender_id = auth.uid()`; hanya pengirim yang dapat update (dipakai edit dan soft-delete). Tidak ada policy delete, sehingga penghapusan selalu soft delete. Tabel ini masuk publikasi `supabase_realtime`.
- `teaching_videos`: guru melihat, menyisipkan, mengubah, dan menghapus miliknya; kepsek dan admin melihat dan mengubah semua.
- Aturan bisnis yang tidak bisa diekspresikan RLS (mis. "hanya draft yang bisa dihapus") dijaga di Server Action.

## 5. Autentikasi dan Akun

1. **Identitas login adalah NIP.** Supabase Auth hanya mengenal email, jadi aplikasi memakai email sintetis `{NIP}@sistem.lokal` (`src/app/login/page.tsx`, `createUser` di `admin/pengguna/actions.ts`).
2. **Pembuatan akun hanya lewat panel admin** (`createUser`): `auth.admin.createUser({ email, password: nip, email_confirm: true })`, lalu menyisipkan baris `profiles`. **Kata sandi awal = NIP.** Bila insert profil gagal, user auth dihapus (rollback manual). Tidak ada kolom password di formulir admin.
3. **Login pertama wajib ganti sandi.** `/verify-profile` memaksa kata sandi baru minimal 8 karakter dan nama lengkap, lalu meng-upsert `profiles` dengan `is_verified = true`. Bila akun auth ada tanpa baris profil, halaman ini juga menyediakan pilihan peran (kepsek atau guru).
4. **Ubah NIP atau sandi setelahnya** lewat `updateLoginCredentials` (`dashboard/profil/actions.ts`). Karena NIP adalah bagian dari email login di `auth.users`, perubahan wajib memakai admin API (`auth.admin.updateUserById`), setelah memverifikasi ulang sandi lama. Hasilnya `requiresRelogin: true`.
5. Peran `admin` tidak bisa dipilih di `/verify-profile`; admin dibuat lewat panel pengguna atau langsung di database.

## 6. Notifikasi

Semua notifikasi adalah baris di `notifications`, ditulis lewat klien admin dari Server Action. Di browser, `NotificationBell.tsx` memuat 20 terbaru dan berlangganan **Realtime INSERT** pada tabel itu dengan filter `user_id=eq.{uid}`. Baris baru memunculkan toast dan menambah badge. Klik notifikasi menandainya terbaca lalu `router.push(link)`. Tabel lengkap pemicu notifikasi ada di bagian "Matriks Notifikasi".

## 7. Konfigurasi dan Menjalankan

Variabel lingkungan (`.env.local`):

| Variabel | Dipakai di | Keterangan |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | browser, server, proxy | URL proyek Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser, server, proxy | Kunci anon (tunduk RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | hanya `utils/supabase/admin.ts` | Rahasia. Jangan di-commit atau diekspos |

Perintah: `npm install`, `npm run dev` (port 3000), `npm run build`, `npm run lint`. Bila dev server menolak start dengan pesan "Another next dev server is already running" padahal tidak ada yang berjalan, hapus file `.next/dev/lock` yang basi.

> Peringatan: `.env.local` di mesin pengembang saat ini menunjuk ke proyek Supabase yang sama dengan produksi. Tindakan saat pengujian (kirim pesan, buat akun) berdampak ke data nyata.

`GET /api/keep-alive` (`src/app/api/keep-alive/route.ts`) melakukan query ringan ke `profiles` dan dipanggil cron Vercel tiap hari pukul 00:00 UTC agar proyek Supabase tier gratis tidak di-pause karena tidak aktif.

## 8. Alur Antar Fitur (Bagaimana Semuanya Terhubung)

### 8.1 Siklus supervisi dari awal sampai akhir

```
ADMIN                      GURU                                KEPALA SEKOLAH
-----                      ----                                --------------
Buat akun (sandi = NIP) ─► Login pertama
                           /verify-profile: ganti sandi
                           (is_verified = true)
Atur kop sekolah ─────────────────────────────────────────────────┐ (dipakai PDF RMP dan cetak laporan)
(school_settings)                                                  │
                           Isi RMP (wizard 5 langkah)              │
                           status: draft                           │
                           Kirim ─► submitted ─── notifikasi ────► Tinjau RMP + ceklis SPVC-01
                                                                   Setujui (approved) / Revisi (revision)
                           ◄── notifikasi + catatan ───────────────┘
                           approved ─► Unduh PDF resmi (tanda tangan guru + kepsek, kop sekolah)
                           (draft dapat dihapus sendiri; yang sudah dikirim harus
                            minta hapus ─► notifikasi ─► Admin setujui/tolak)

                                                                   Buat jadwal (3 link Zoom + kontrak SPVC-02)
                           ◄── notifikasi "Anda dijadwalkan" ──────┘
                           Lihat jadwal, kontrak fokus, buka Zoom
                                                                   Pra-konferensi → observasi → pasca-konferensi
                                                                   Tandai jadwal "selesai"
                                                                   Buat Laporan (opsional terhubung ke jadwal selesai)
                                                                     SPVC-03 skor 36 indikator → NA → predikat
                                                                     SPVC-04/05/06 narasi, SPVC-07/08 RTL,
                                                                     SPVC-09 dampak, dokumentasi (maks 12 berkas)
                                                                   Publish (draft → submitted)
                           ◄── notifikasi "Laporan tersedia" ──────┘
                           Lihat laporan (read-only, hanya yang submitted)

                           Kirim link video mengajar ────────────► Tinjau video, beri catatan
                           ◄── notifikasi "sudah ditinjau" ────────┘ (setelah itu guru tidak bisa edit/hapus)

                           Pesan 1:1 (real-time) ◄────────────────► Pesan 1:1 (real-time)
Pantau semua RMP (per tahun ajaran) dan data laporan (read-only)
```

### 8.2 Matriks fitur ke data

| Fitur | Tabel utama | Bucket | Server action | Notifikasi keluar | Dipakai fitur lain |
|---|---|---|---|---|---|
| Akun dan login | `profiles`, `auth.users` | - | `admin/pengguna/actions.ts`, `profil/actions.ts` | - | Semua fitur (identitas, peran) |
| RMP | `rmp_forms` | - | `guru/rmp`, `kepsek/rmp`, `admin/rmp` | ke kepsek, guru, admin | PDF RMP, beranda guru, dasbor kepsek |
| Permintaan hapus RMP | `rmp_deletion_requests` | - | `guru/rmp`, `admin/rmp` | ke admin, guru | Daftar RMP guru (lencana), antrean admin |
| Ceklis administrasi (SPVC-01) | `rmp_forms.admin_ceklis` | - | `kepsek/rmp` | (ikut notifikasi review) | Detail RMP guru |
| Jadwal + Zoom + kontrak (SPVC-02) | `schedules` | - | `kepsek/jadwal` | ke guru | Laporan (opsi jadwal selesai), Video (hubungkan jadwal) |
| Laporan (SPVC-03..09) | `supervision_reports` | `supervisi-dokumentasi` | `kepsek/laporan` | ke guru saat publish | Dasbor kepsek (grafik), Data Supervisi admin, cetak |
| Video mengajar | `teaching_videos` | - | `guru/video`, `kepsek/video` | ke kepsek, guru | - |
| Pesan | `conversations`, `messages` | - | `pesan/actions.ts` | ke lawan bicara (dedupe) | - |
| Foto profil | `profiles.avatar_url` | `avatars` | `profil/actions.ts` | - | `Avatar` di sidebar dan semua daftar |
| Tanda tangan | `profiles.signature_url` | `signatures` | `profil/actions.ts` | - | PDF RMP |
| Pengaturan sekolah | `school_settings` | `school-assets` | `admin/pengaturan` | - | PDF RMP, cetak laporan |
| Notifikasi | `notifications` | - | (ditulis oleh action lain) | - | Lonceng di semua halaman dashboard |

### 8.3 Langganan Realtime

| Komponen | Channel | Tabel dan event | Efek |
|---|---|---|---|
| `NotificationBell` | `notifications:{uid}` | `notifications` INSERT, filter `user_id` | Toast, tambah item, naikkan badge |
| `RmpRealtimeWatcher` (detail RMP guru) | `rmp-watch:{rmpId}` | `rmp_forms` UPDATE, filter `id` | `router.refresh()` agar status dan catatan kepsek muncul |
| `PesanThread` | `messages-watch:{conversationId}` | `messages` INSERT dan UPDATE | Sisipkan atau ganti pesan di state lokal (scroll tidak terganggu) |
| `PesanThread` (hanya bila belum ada percakapan) | `conversations-watch:{me}:{lawan}` | `conversations` INSERT | Mengaktifkan langganan pesan begitu lawan mengirim pesan pertama |

Semua tabel ini harus ada di publikasi `supabase_realtime` di proyek Supabase.

### 8.4 Komponen dan modul bersama (titik reuse)

| Modul | Dipakai oleh |
|---|---|
| `LaporanForm`, `SpvcNarrativeForm`, `LaporanRtlForm`, `LaporanDokumentasi`, `LaporanRadarChart` | Panel kepsek (edit) dan panel guru (`readOnly`) |
| `RmpPdfDownloadButton`, `RmpDocument`, `lib/rmp-pdf-actions.ts` | Daftar RMP guru dan daftar RMP kepsek |
| `AvatarUploader`, `ProfileEditForm`, `SignatureUploader`, `profil/actions.ts` | Halaman profil tiga peran |
| `Avatar`, `SidebarUserFooter` | Semua sidebar dan daftar pengguna |
| `PesanListClient`, `PesanThread`, `pesan/actions.ts` | Halaman Pesan guru dan kepsek |
| `lib/laporan-rubrik.ts` | Form laporan, radar, cetak, form jadwal (opsi fokus kontrak), halaman Data Supervisi |
| `lib/spvc-forms.ts` | `updateSpvcForm` (whitelist kolom), form naratif, cetak |
| `lib/profil-lulusan.ts` | Wizard RMP, tampilan RMP |
| `lib/rmp-ceklis.ts` | Panel review kepsek, detail RMP guru |

### 8.5 Konstanta domain (`src/lib/`)

- `laporan-rubrik.ts`: `SECTIONS` (7 seksi, 36 indikator), `MAX_TOTAL = 144`, `REKAPITULASI`, `getPredikat(na)` (SB ≥ 91, B ≥ 76, C ≥ 61, K di bawahnya), `calcSectionSums`, `calcSectionPercentages` (untuk radar).
- `spvc-forms.ts`: `SPVC_FORMS`, `SPVC_COLUMNS`, `isSpvcColumn`, `getSpvcForm`, `hasSpvcContent`.
- `rmp-ceklis.ts`: `ADMIN_CEKLIS_ITEMS` (8 butir), `ADMIN_CEKLIS_TOTAL`.
- `profil-lulusan.ts`: 8 dimensi Profil Lulusan (pengganti P5), `TEMA_PROJEK`, `FASE`.

## 9. Catatan Teknis, Risiko, dan Utang Teknis

Temuan dari pembacaan kode. Yang bertanda "(terverifikasi)" sudah dicek langsung di kode; sisanya dari pembacaan komponen dan perlu dipastikan sebelum dijadikan dasar keputusan.

**Keamanan**
1. `createUser`, `bulkCreateUsers`, `deleteUser` (`admin/pengguna/actions.ts`) memakai service role **tanpa memeriksa peran pemanggil** (terverifikasi). Server Action bisa dipanggil langsung oleh pengguna login mana pun. Tambahkan `requireAdmin()` seperti di `admin/rmp/actions.ts`.
2. Proxy hanya mengecek status login, bukan peran. Halaman admin `pengguna`, `supervisi`, `profil`, dan beranda hanya mengecek login; perlindungan datanya bergantung pada RLS yang tidak ada di repo.
3. `admin/pengguna/page.tsx` memiliki `console.log('Daftar User:', users)` yang mencetak data pribadi ke log server.
4. Upload ke Storage (avatar, tanda tangan, logo, dokumentasi) dilakukan dari browser, jadi keamanannya sepenuhnya bergantung pada policy bucket yang tidak ada di repo.
5. `.env.local` mengarah ke proyek Supabase produksi; tidak ada lingkungan staging.

**Logika dan alur**
6. Status laporan `approved` **tidak pernah diset oleh kode mana pun** (terverifikasi: hanya `publishLaporan` dan `unpublishLaporan` yang mengubah status). Kartu dasbor kepsek "Total Laporan Selesai" menghitung `approved`, sehingga selalu 0 kecuali diubah manual di database. Kartu "Menunggu Review" admin menghitung `draft` dan `submitted` sekaligus.
7. RMP berstatus `revision` tidak punya jalur edit di UI guru (terverifikasi: wizard hanya memuat draft terbaru; detail hanya menampilkan tombol edit untuk `draft`). Banner menyuruh guru merevisi tetapi tidak ada tombolnya.
8. Wizard RMP hanya memuat satu draft terbaru (`limit 1`), jadi guru praktis punya satu slot draft aktif. Tidak ada autosave, dan tidak ada validasi isi wajib sebelum kirim.
9. "Hari ini" di beranda guru dan halaman jadwal dihitung dengan `toISOString()` (UTC), sedangkan pager admin dan Pesan memakai zona Jakarta. Di dini hari WIB bisa selisih satu hari.
10. Kepsek hanya bisa melihat dan mengubah laporan miliknya sendiri; admin tidak melewati pemeriksaan kepemilikan ini.
11. `approveDeletionRequest` menghapus RMP lebih dulu lalu menandai permintaan; tidak atomik.
12. `bulkCreateUsers` berjalan berurutan tanpa transaksi; baris yang sudah sukses tidak di-rollback bila baris lain gagal. Pesan validasi Excel menyebut peran "Pengawas", padahal kode hanya menerima guru dan kepsek.
13. `updateProfile` mengabaikan parameter `nip` (hanya `full_name` yang diperbarui); perubahan NIP harus lewat `updateLoginCredentials`.

**Duplikasi dan kode sisa**
14. Dua sumber rubrik terpisah: `lib/laporan-rubrik.ts` (dipakai menilai) dan data hardcoded di `kepsek/instrumen/page.tsx` (hanya referensi bacaan). Bisa tidak sinkron.
15. `getPredikat` ada di `lib/laporan-rubrik.ts` dan ada versi lokal di beberapa halaman dengan ambang yang sama.
16. `components/landing/FeaturesGrid.tsx` tidak dipakai; tautan navbar `#kontak` tidak punya target; `VideoSection` tidak menampilkan video selama `VIDEO_EMBED_URL` kosong.
17. Kolom DB masih bernama `dimensi_p5` dan `elemen_p5` walaupun isinya kini Profil Lulusan (warisan P5). `asesmen_awal` ada di DB tetapi tidak ada di wizard.
18. Nama berkas sidebar guru `GururSidebar.tsx` (huruf r ganda) memang demikian di repo.

**Belum ada di repo**
19. Tidak ada migrasi SQL, seed (`school_settings` harus punya baris `id = 1`), RLS tabel inti, konfigurasi bucket `signatures`, `supervisi-dokumentasi`, `school-assets`, maupun daftar tabel di publikasi realtime. Sebelum onboarding developer atau lingkungan baru, ekspor skema dari Supabase (`supabase db dump`) dan simpan di repo.
20. Tidak ada pengujian otomatis.

## 10. Panduan Menambah Fitur

Mengikuti pola yang sudah ada:

1. **Tabel baru:** buat di Supabase (SQL + RLS + index), tambahkan tipe `Row/Insert/Update` di `src/types/database.ts` dan alias di bagian bawahnya. Bila perlu realtime: `alter publication supabase_realtime add table ...`. Simpan SQL-nya di repo.
2. **Halaman baru:** `src/app/dashboard/{peran}/{fitur}/page.tsx` sebagai Server Component (`export const dynamic = 'force-dynamic'`), ambil user, cek peran, query dengan `createServerClient()`, kirim data ke Client Component di `src/components/dashboard/{peran}/`.
3. **Mutasi:** tambahkan `actions.ts` berdirektif `'use server'` di folder halaman: cek login dan peran, validasi, cek kepemilikan dan status, tulis, kirim notifikasi lewat `createAdminClient()` bila perlu, `revalidatePath` semua halaman terdampak, kembalikan `{ error? }`.
4. **Menu:** tambahkan item di sidebar peran terkait (`navItems` pada `GururSidebar`/`KepsekSidebar`, atau array menu di `AdminSidebar`).
5. **Notifikasi:** sisipkan baris `notifications` dengan `link` ke halaman tujuan; lonceng akan menampilkannya otomatis lewat realtime.
6. **Gaya:** ikuti tema di `CLAUDE.md` (navy `#002147`, emas `#FFC600` ke `#F7A800`, kartu putih border tipis, hover bayangan dan border emas).
7. Sebelum menulis kode Next.js, baca panduan di `node_modules/next/dist/docs/` (versi ini punya perubahan API).

## 11. Glosarium

| Istilah | Arti |
|---|---|
| Supervisi klinis | Siklus pembinaan guru: pra-konferensi, observasi kelas, analisis, pasca-konferensi, refleksi |
| RMP | Rencana Modul Projek (modul kokurikuler yang disusun guru) |
| Profil Lulusan | 8 dimensi kompetensi lulusan (Kurikulum 2025), pengganti 6 dimensi Profil Pelajar Pancasila (P5) |
| Kepsek | Kepala Sekolah, bertindak sebagai supervisor |
| SPVC-01..09 | Kode formulir instrumen supervisi (lihat peta di bagian Panel Kepala Sekolah) |
| RTL | Rencana Tindak Lanjut (SPVC-07/08: temuan masalah, aksi, target waktu) |
| NA | Nilai Akhir: total skor ÷ 144 × 100 |
| Predikat | SB (Sangat Baik) ≥ 91, B (Baik) ≥ 76, C (Cukup) ≥ 61, K (Kurang) di bawahnya |
| Kontrak pra-konferensi | Kesepakatan fokus observasi antara kepsek dan guru sebelum observasi (SPVC-02) |
| Published | Istilah UI untuk laporan berstatus `submitted` (terlihat oleh guru) |
| Service role | Kunci Supabase yang melewati RLS; hanya boleh dipakai di server |

---

## 12. Rincian: Landing Page, Login, dan Panel Admin

> Semua path relatif terhadap `src/`. Aksi server (`'use server'`) berada di `actions.ts` di samping halamannya.

---

### 1. Landing Page (publik, tanpa login)

Rute `/` (`app/page.tsx`) dan `/news` (`app/news/page.tsx`). Seluruh konten **statis (hard-coded)**; tidak ada query Supabase di halaman publik. `proxy.ts` tidak memproteksi rute ini (daftar prefiks terproteksi: `/dashboard`, `/laporan`, `/jadwal`, `/profil`).

`LandingPage` merangkai komponen dari `components/landing/` berurutan:

| Komponen | Anchor / peran | Isi & perilaku | Data |
|---|---|---|---|
| `Navbar.tsx` (client) | fixed top | Transparan, jadi putih + bayangan setelah `scrollY > 80` (listener `scroll`). Tautan `#tentang`, `#alur`, `#berita`, `#kontak`, tombol **Masuk** → `/login`. | statis |
| `HeroCarousel.tsx` (client) | hero | 3 slide (gambar dari `sman16medan.com/assets/img/...`), auto-geser tiap 6 detik (`setInterval`), tombol prev/next, titik indikator, transisi fade 300 ms (`transitioning` mencegah klik beruntun). CTA "Mulai Sekarang" → `/login`, "Pelajari Lebih Lanjut" → `#tentang`. | array `slides` |
| `AboutSection.tsx` | `#tentang` | Profil SMA Negeri 16 Medan, 4 poin keunggulan, 4 statistik (siswa 1.080, guru 48, rombel 36, berdiri 1985). | array `points`, `stats` (angka manual, bukan dari DB) |
| `TimelineSection.tsx` | `#alur` | 5 langkah supervisi klinis: Pra Konferensi → Observasi Kelas → Analisis & Strategi → Post Konferensi → Refleksi. Stepper horizontal (desktop) / vertikal (mobile). | array `steps` |
| `NewsSection.tsx` | `#berita` | 3 kartu berita teratas + tautan ke `/news`. | array `news` |
| `VideoSection.tsx` (client) | `#demo` | Thumbnail 16:9 + tombol play. Iframe YouTube hanya muncul jika konstanta `VIDEO_EMBED_URL` diisi (saat ini `''` → klik play tidak menampilkan video). | konstanta `VIDEO_EMBED_URL` |
| `SupervisiTabSection.tsx` (client) | `id="fitur"` | Tab **Peran / Keuntungan / Tujuan / Manfaat**, masing-masing 5 kartu (state `active`). | objek `content` |
| `Footer.tsx` | footer | Kontak sekolah, tautan cepat, iframe Google Maps lokasi sekolah. | statis |
| `DeveloperCard.tsx` (di `components/`, client) | badge melayang | Tombol "Built by Tsabat" membuka modal kartu nama developer (WhatsApp `wa.me/...`, email). | konstanta `DEV` |

`/news` memakai `Navbar`, `Footer`, `DeveloperCard` yang sama, dengan 9 berita statis (kategori Prestasi/Kegiatan/Pengumuman diberi warna lewat `CATEGORY_COLOR`).

Catatan untuk developer:
- `components/landing/FeaturesGrid.tsx` **tidak dipakai** di `app/page.tsx` (kode sisa; 8 kartu fitur dengan ikon lucide). `SupervisiTabSection` yang justru memakai `id="fitur"`.
- Tautan navbar `#kontak` tidak punya elemen target (footer tidak ber-`id="kontak"`) — tidak akan menggulir ke mana pun (dari pembacaan kode, belum dicoba di browser).
- Berita/statistik adalah data contoh; untuk menjadikannya dinamis perlu tabel baru.
- Branding warna: navy `#002147` + emas (`amber-400/500`) sesuai `CLAUDE.md`.

---

### 2. Alur Login → Verifikasi Profil → Dashboard

```
/login ──signInWithPassword──► /verify-profile ──upsert profil + ganti sandi──► /dashboard ──switch(role)──► /dashboard/{admin|kepsek|guru}
```

1. **Login** — `app/login/page.tsx` (client). Pengguna mengisi **NIP** + kata sandi. NIP diubah menjadi email internal `` `${nip.trim()}@sistem.lokal` `` lalu `supabase.auth.signInWithPassword({ email, password })` (browser client, `utils/supabase/client.ts`). Tidak ada email asli; domain `sistem.lokal` hanyalah identitas buatan. Berhasil → `router.push('/verify-profile')`. Gagal → pesan "NIP atau kata sandi salah". Tombol submit nonaktif bila NIP/sandi kosong.
2. **Pembuatan akun** (oleh admin) — `createUser()` di `app/dashboard/admin/pengguna/actions.ts`: `auth.admin.createUser({ email: nip@sistem.lokal, password: nip, email_confirm: true })` memakai **service-role** (`createAdminClient()`, `utils/supabase/admin.ts`), lalu insert baris `profiles` (`id` = id auth, `full_name`, `email`, `role`, `nip`). **Kata sandi awal = NIP.** Jika insert profil gagal, user auth dihapus kembali (rollback manual). `is_verified` tidak diisi di insert (nilai default berasal dari DB, diasumsikan `false` — belum terverifikasi karena skema SQL tidak ada di repo).
3. **Verifikasi profil** — `app/verify-profile/page.tsx` (client). Memuat `auth.getUser()` dan baris `profiles`. Wajib **mengganti kata sandi default** (min. 8 karakter, meter kekuatan) via `supabase.auth.updateUser({ password })`, kemudian `upsert` ke `profiles` dengan `is_verified: true` (`onConflict: 'id'`). Jika akun auth ada tetapi baris `profiles` belum ada, form juga menampilkan pilihan **peran** (Kepala Sekolah / Guru) dan membuat profilnya (`hasExistingProfile === false`). Selesai → `router.refresh()` + `router.push('/dashboard')`.
4. **Router dashboard** — `app/dashboard/page.tsx` (server): tanpa user → `/login`; profil tidak ada atau `!is_verified` → `/verify-profile`; selain itu `redirect` berdasarkan `role` ke `/dashboard/admin`, `/dashboard/kepsek`, `/dashboard/guru`.
5. **Proteksi rute** — `proxy.ts` (middleware Next.js 16 bernama `proxy`), jalan di semua rute kecuali `api`, aset statis, dan file berekstensi:
   - Rute terproteksi tanpa sesi → redirect `/login`.
   - Sudah login membuka `/login` → `/dashboard` bila `is_verified`, selain itu `/verify-profile`.
   - Sudah terverifikasi membuka `/verify-profile` → `/dashboard`.
   - Sesi Supabase disegarkan lewat `createServerClient` + cookie `getAll/setAll`.
   - **Catatan:** proxy hanya mengecek *login*, bukan *peran*, dan **tidak memaksa** pengguna yang belum terverifikasi keluar dari `/dashboard/...` (yang memaksa hanya `app/dashboard/page.tsx`, yaitu saat membuka `/dashboard` persis). Pembatasan peran dilakukan per halaman/aksi (mis. `profile.role !== 'admin'` → `redirect('/dashboard')`). Halaman admin `pengguna`, `supervisi`, `profil`, dan beranda hanya memeriksa `if (!user) redirect('/login')` tanpa cek peran; perlindungan datanya bergantung pada RLS Supabase (tidak terlihat di repo — belum terverifikasi).
6. **Ubah NIP / sandi sesudahnya** — `updateLoginCredentials()` di `app/dashboard/profil/actions.ts`: verifikasi ulang sandi lama (`signInWithPassword`), cek NIP unik di `profiles`, lalu `admin.auth.admin.updateUserById` (email baru + sandi) dan update `profiles`. Mengembalikan `requiresRelogin: true`; `ProfileEditForm` (`components/dashboard/ProfileEditForm.tsx`) lalu `signOut()` dan ke `/login`.
7. **Keep-alive** — `app/api/keep-alive/route.ts` (`GET`, `force-dynamic`) membaca 1 baris `profiles`; dijadwalkan harian (`0 0 * * *`) di `vercel.json` agar proyek Supabase tier gratis tidak tidur.

---

### 3. Panel Admin (`/dashboard/admin/*`)

Layout setiap halaman: `<AdminSidebar />` + konten (`flex h-screen`). Halaman server memakai `createServerClient()` (`utils/supabase/server.ts`, sesi pengguna + RLS); aksi yang perlu melewati RLS memakai `createAdminClient()` (service role).

#### 3.1 Sidebar — `components/dashboard/AdminSidebar.tsx`
Menu: Beranda, Kelola Pengguna, Kelola RMP, Data Supervisi, Pengaturan, Profil Saya (aktif bila `pathname === href`). Responsif: drawer di mobile. Footer memakai `SidebarUserFooter` (mengambil `full_name`+`avatar_url` dari `profiles`, mendengarkan event window `avatar-updated` agar foto langsung berganti setelah unggah) dan tombol **Keluar** (`supabase.auth.signOut()` → `/login`). Admin **tidak** punya menu Pesan (Pesan hanya guru↔kepsek, lihat `resolveConversation` di `dashboard/pesan/actions.ts`).

#### 3.2 Beranda — `app/dashboard/admin/page.tsx`
Server component. `Promise.all` empat query:
- `profiles` (nama user login),
- `profiles` count `role = 'guru'` → **Total Guru**,
- `supervision_reports` count semua → **Total Laporan**,
- `supervision_reports` count `status IN ('draft','submitted')` → **Menunggu Review** (label "belum ditinjau" mencakup draft).

Menampilkan 3 kartu metrik + 2 aksi cepat (Kelola Pengguna, Pengaturan Sekolah) + tombol "Tambah Pengguna Baru".

#### 3.3 Kelola Pengguna — `app/dashboard/admin/pengguna/page.tsx`
- Server: `profiles.select('*').order('created_at', desc)`, `dynamic = 'force-dynamic'`. (Ada `console.log('Daftar User:', users)` di server — sebaiknya dihapus karena mencetak data pribadi ke log.)
- Client: `components/dashboard/admin/PenggunaClient.tsx` → `UserTable`, `AddUserModal`, `BulkUploadModal`; toast 4 detik; setelah sukses `router.refresh()`.
- **Tambah pengguna** (`AddUserModal.tsx` → `createUser`): field Nama, NIP, Peran (Guru/Kepala Sekolah; admin tidak bisa dibuat dari UI). Menampilkan pratinjau email `nip@sistem.lokal` dan catatan "kata sandi default = NIP".
- **Upload Excel** (`BulkUploadModal.tsx`, pustaka `xlsx`): berkas `.xlsx/.xls`, **lembar pertama**, header kolom: `Nama Lengkap` (alias `nama_lengkap`, `nama`), `NIP`/`nip`, `Peran`/`Role`/`role`. Peran valid (tak peka huruf besar-kecil): `guru`, `kepala sekolah`, `kepala_sekolah`, `kepsek` → `kepsek`. Validasi di klien **berhenti pada kesalahan pertama** dan menampilkan nomor baris Excel (`i + 2`): kolom wajib kosong atau peran tidak valid. Catatan: pesan error menyebut "Pengawas" sebagai peran valid, tetapi `VALID_ROLES` **tidak** memuat `pengawas` → baris berperan Pengawas akan ditolak (teks tidak sesuai kode). Setelah parsing, ditampilkan pratinjau baris; tombol Upload memanggil `bulkCreateUsers(rows)`.
- **`bulkCreateUsers`**: iterasi **berurutan** memanggil `createUser` per baris (bukan transaksi). Mengembalikan `{ success, failed, errors[] }` dengan error berformat `"{nip}: {pesan}"`. UI: semua sukses → toast sukses; sebagian → toast ringkas dengan 2 error pertama; semua gagal → toast error. Baris yang berhasil **tidak** di-rollback bila baris lain gagal.
- **Hapus pengguna** (`UserTable.tsx` → `deleteUser`): `confirm()` browser; aksi menghapus baris `profiles` dulu (menghindari FK bila tak CASCADE) lalu `auth.admin.deleteUser`. Tidak ada pencegahan menghapus diri sendiri/admin lain di kode (level DB belum terverifikasi). Tabel menampilkan `Avatar`, NIP, badge peran, tanggal daftar.
- `createUser/deleteUser/bulkCreateUsers` **tidak memeriksa peran pemanggil** (langsung memakai service-role). Keamanan bergantung pada hanya halaman admin yang memanggilnya — padahal Server Action dapat dipanggil langsung; pertimbangkan menambah `requireAdmin()` seperti di `admin/rmp/actions.ts`.

#### 3.4 Kelola RMP — `app/dashboard/admin/rmp/page.tsx` + `components/dashboard/admin/AdminRmpClient.tsx`
Tujuan: admin melihat **semua RMP**, menghapus langsung, dan menangani **permintaan hapus** dari guru.

Server page:
- Wajib `role === 'admin'` (selain itu `redirect('/dashboard')`).
- **Pager tahun ajaran** lewat query `?tahun=<tahunMulai>`:
  - `getTahunAjaranStartYear(date)`: geser waktu +7 jam (WIB/Asia/Jakarta, UTC+7, dihitung manual) lalu `month >= 6` (Juli) → tahun berjalan, selain itu tahun−1. Tahun ajaran = **1 Juli – 30 Juni**.
  - `getTahunAjaranRange(startYear)`: `start = Date.UTC(startYear, 6, 1) − 7 jam`, `end = Date.UTC(startYear+1, 6, 1) − 7 jam` → batas Jakarta dalam ISO UTC; label `"2025/2026"`.
  - **Clamp**: `tahun` hanya dipakai bila bilangan, `>= 2000` dan `<= currentStartYear`; jika tidak valid → tahun ajaran berjalan. Tidak bisa menjelajah ke masa depan; `nextHref` bernilai `null` saat `viewedStartYear === currentStartYear` (tombol "Berikutnya" nonaktif).
  - `prevHref` selalu `?tahun=${viewedStartYear-1}`; tidak ada batas bawah di tombol (di bawah 2000 jatuh ke tahun berjalan karena clamp).
- Dua query paralel: `rmp_forms` (`id, judul, tema, status, guru_id, created_at, updated_at`) difilter `created_at >= startIso AND < endIso`, urut terbaru; dan `rmp_deletion_requests` (`id, rmp_id, guru_id, reason, created_at`) `status = 'pending'` — **tanpa filter tahun ajaran** (antrean hapus selalu lintas tahun ajaran).
- Nama/foto guru: satu query `profiles.in('id', semua guru_id dari RMP + permintaan)`.
- **Pencarian judul tanpa filter**: permintaan hapus bisa merujuk RMP dari tahun ajaran lain (tidak ikut daftar terfilter), jadi `judulMap` diisi dulu dari RMP yang dimuat, lalu query tambahan `rmp_forms.select('id, judul').in('id', reqRmpIds)` (tanpa filter tanggal) melengkapi judul yang belum ada. Tanpa langkah ini judul permintaan lintas tahun akan kosong.
- `pendingByRmp: Record<rmp_id, request_id>` dipakai untuk badge "Hapus diminta" pada baris RMP.

Client (`AdminRmpClient`):
- Seksi **Permintaan Hapus dari Guru**: daftar (judul, nama guru, tanggal, alasan) dengan tombol **Tolak** (modal catatan opsional → `rejectDeletionRequest(id, note)`) dan **Setujui & Hapus** (`confirm()` → `approveDeletionRequest(id)`).
- Seksi **Semua RMP**: tabel Judul/Tema, Guru (+`Avatar`), Status (badge draft/submitted/approved/revision), Dibuat, tombol **Hapus** (modal konfirmasi → `adminDeleteRmp(id)`). Header tabel berisi pager `Sebelumnya • Tahun Ajaran X/Y • Berikutnya` (komponen `Link` biasa → navigasi server).
- Memakai `useTransition` (`isPending` menonaktifkan tombol) dan `router.refresh()` setelah sukses.

Server Actions — `app/dashboard/admin/rmp/actions.ts`:
- `requireAdmin()` — `auth.getUser()` + cek `profiles.role === 'admin'`.
- `adminDeleteRmp(rmpId)` — baca `guru_id, judul` (service role), `DELETE rmp_forms`, notifikasi ke guru ("Modul RMP dihapus", link `/dashboard/guru/rmp`), `revalidatePath` admin/guru/kepsek `rmp`.
- `approveDeletionRequest(requestId)` — pastikan permintaan `pending`; hapus RMP **dulu**, lalu set permintaan `approved` (+`reviewed_by`, `reviewed_at`), notifikasi "Permintaan hapus disetujui". Tidak atomik; apakah baris permintaan ikut terhapus saat RMP dihapus (FK cascade) belum terverifikasi.
- `rejectDeletionRequest(requestId, adminNote)` — set `rejected` + `admin_note` (opsional) + notifikasi "Permintaan hapus ditolak" (menyertakan catatan bila ada).
- Hulu alur: guru memanggil `requestRmpDeletion` di `dashboard/guru/rmp/actions.ts` (alasan ≥5 karakter, hanya RMP non-draft, satu permintaan pending per RMP) yang menotifikasi semua admin (link `/dashboard/admin/rmp`).

#### 3.5 Data Supervisi — `app/dashboard/admin/supervisi/page.tsx`
Server, read-only. Query: `supervision_reports.select('*').order('visit_date', desc)` dan `profiles.select('id, full_name, role')` → peta nama untuk kolom Kepala Sekolah (`supervisor_id`) dan Guru (`teacher_id`). Metrik dihitung di memori: total laporan, `approved`, `submitted`, rata-rata `score` (hanya `score > 0`). Tabel: Kepala Sekolah, Guru, Mapel, Kelas, Tanggal, Skor, Predikat, Status.
- Predikat lokal `getPredikat(score)`: ≥91 SB, ≥76 B, ≥61 C, selain itu K (ambang sama dengan `getPredikat` di `lib/laporan-rubrik.ts`, tetapi versi lokal hanya label ringkas + kelas CSS).
- `ReportStatus` di tipe DB adalah `draft | submitted | approved`, tetapi `kepsek/laporan/actions.ts` hanya mengatur `draft` dan `submitted` (`publishLaporan`/`unpublishLaporan`); `approved` kemungkinan tidak pernah diset aplikasi saat ini.

#### 3.6 Pengaturan Sekolah — `app/dashboard/admin/pengaturan/page.tsx` + `components/dashboard/admin/SchoolSettingsForm.tsx`
- Server: wajib admin; baca `school_settings` baris tunggal `id = 1` (`maybeSingle`). Jika tidak ada → `DEFAULT_SETTINGS` + peringatan "jalankan migrasi SQL (tabel + seed 1 baris)". Tabel **harus punya seed baris `id=1`** karena `updateSchoolSettings` memakai `UPDATE ... WHERE id = 1` (bukan upsert).
- Form: `school_name`, `header_line_1`, `header_line_2`, `address`, `phone`, `email`, `website`, `logo_url`. Data ini dipakai sebagai **kop** PDF RMP (`lib/rmp-pdf-actions.ts` membaca `school_settings` id 1 → `RmpDocument`) dan dokumen cetak lain.
- **Logo**: diunggah langsung dari browser ke **Supabase Storage bucket `school-assets`**, path tetap `logo/school.<ext>` (`upsert: true`), tipe `png/jpeg/webp/svg+xml`, maks **2 MB**. URL publik + `?t=Date.now()` (cache-busting) disimpan di state; **baru tersimpan ke DB saat klik "Simpan Pengaturan"** (`updateSchoolSettings`). Hapus logo: menghapus semua berkas di folder `logo/` bucket lalu mengosongkan `logo_url` (juga butuh klik simpan).
- Aksi `updateSchoolSettings(payload)` — `app/dashboard/admin/pengaturan/actions.ts`: cek login + `role === 'admin'`, `trim()` semua field, `UPDATE school_settings ... eq('id', 1)`, `revalidatePath('/dashboard/admin/pengaturan')`.

#### 3.7 Profil Saya — `app/dashboard/admin/profil/page.tsx`
Menampilkan `AvatarUploader` dan `ProfileEditForm` (komponen bersama dengan guru/kepsek).
- `AvatarUploader.tsx`: bucket **`avatars`**, path `{userId}/avatar.<ext>`, tipe `image/*`, maks **5 MB**, `upsert: true`. Berkas lama dengan ekstensi berbeda dihapus **setelah** unggahan baru sukses (agar unggahan gagal tidak menghilangkan foto lama). URL publik + `?t=` disimpan lewat `updateAvatarUrl()` (`dashboard/profil/actions.ts`), lalu `window.dispatchEvent('avatar-updated')` agar `SidebarUserFooter` memperbarui foto tanpa reload.
- `ProfileEditForm.tsx`: jika hanya nama berubah → `updateProfile`; jika NIP atau sandi berubah → wajib sandi saat ini, konfirmasi sandi baru, memanggil `updateLoginCredentials` (lihat §2 butir 6) lalu logout paksa.
- Admin tidak punya `SignatureUploader` (tanda tangan hanya guru/kepsek — dibahas di bagian 15).

#### 3.8 Tabel ringkas: aksi server milik admin

| Aksi | File | Klien Supabase | Cek peran | Efek |
|---|---|---|---|---|
| `createUser` | `admin/pengguna/actions.ts` | service-role | tidak ada (lihat catatan) | buat auth user (sandi=NIP) + `profiles`; rollback auth bila profil gagal |
| `bulkCreateUsers` | idem | service-role | tidak ada | loop `createUser`, kumpulkan error per baris |
| `deleteUser` | idem | service-role | tidak ada | hapus `profiles` lalu auth user |
| `updateSchoolSettings` | `admin/pengaturan/actions.ts` | sesi + RLS | ya (`admin`) | update `school_settings` id=1 |
| `adminDeleteRmp` | `admin/rmp/actions.ts` | service-role | ya (`requireAdmin`) | hapus RMP + notif guru |
| `approveDeletionRequest` | idem | service-role | ya | hapus RMP, status `approved`, notif |
| `rejectDeletionRequest` | idem | service-role | ya | status `rejected` + catatan, notif |

#### 3.9 Tabel Supabase yang disentuh area ini
`profiles`, `supervision_reports` (baca), `rmp_forms`, `rmp_deletion_requests`, `school_settings`, `notifications` (insert via service-role), bucket Storage `school-assets` dan `avatars`. Skema SQL/RLS/trigger **tidak ada di repositori** (tidak ada berkas `.sql`); definisi tipe hanya di `types/database.ts`.

---

## 13. Rincian: Panel Guru

Semua halaman guru adalah **Server Component** (`export const dynamic = 'force-dynamic'`) yang memakai `createServerClient()` (`src/utils/supabase/server.ts`, anon key + cookie sesi, jadi tunduk pada RLS). Tiap halaman memanggil `supabase.auth.getUser()` dan `redirect('/login')` bila tidak ada sesi. Layout bersama: `<GururSidebar />` di kiri dan konten di kanan. `NotificationBell` dipasang sekali di `src/app/dashboard/layout.tsx`, bukan per halaman.

Peran dicek di level halaman hanya pada sebagian rute: `laporan/page.tsx`, `laporan/[id]/page.tsx` (wajib `role === 'guru'`, selain itu `redirect('/dashboard')`) dan `pesan/*` (guru atau admin). Halaman lain (beranda, jadwal, rmp, video, profil) hanya mengandalkan sesi + filter `guru_id`/`teacher_id = user.id` dan RLS (policy RLS tidak ada di repo, belum terverifikasi).

### Peta rute

| Rute | File | Ringkas |
|---|---|---|
| `/dashboard/guru` | `guru/page.tsx` | Beranda: hitung status RMP, jadwal terdekat, aktivitas terbaru |
| `/dashboard/guru/rmp` | `guru/rmp/page.tsx` + `RmpListClient` | Daftar RMP milik guru |
| `/dashboard/guru/rmp/buat` | `guru/rmp/buat/page.tsx` (client) | Wizard 5 langkah |
| `/dashboard/guru/rmp/[id]` | `guru/rmp/[id]/page.tsx` | Detail read-only + catatan kepsek + realtime |
| `/dashboard/guru/jadwal` | `guru/jadwal/page.tsx` | Jadwal supervisi + tautan Zoom + kontrak |
| `/dashboard/guru/laporan` & `[id]` | `guru/laporan/...` | Laporan supervisi berstatus `submitted` |
| `/dashboard/guru/video` (+ `buat`, `[id]`) | `guru/video/...` + `VideoForm`, `VideoListClient` | Kirim/ubah/hapus link video mengajar |
| `/dashboard/guru/pesan` & `[kepsekId]` | `guru/pesan/...` | Pesan ke kepsek (detail di bagian 15) |
| `/dashboard/guru/profil` | `guru/profil/page.tsx` | Avatar, edit nama/NIP/sandi, tanda tangan digital |

Sidebar (`src/components/dashboard/guru/GururSidebar.tsx`): 7 menu (`navItems`: Beranda, RMP Saya, Jadwal Supervisi, Video Mengajar, Laporan Saya, Pesan, Profil Saya); item aktif bila `pathname === href` atau diawali `href + '/'`. Drawer mobile via state `open`. Logout memanggil `supabase.auth.signOut()` lalu `router.push('/login')`. Footer identitas memakai `SidebarUserFooter`.

---

### 1. Beranda — `guru/page.tsx` (`GuruBerandaPage`)

Query (paralel lewat `Promise.all`):
- `rmp_forms.select('status').eq('guru_id', user.id)` — dihitung di memori menjadi kartu **Draft / Menunggu Review (`submitted`) / Disetujui (`approved`)**. Status `revision` tidak punya kartu sendiri.
- `schedules.select('*').eq('teacher_id', user.id).eq('status','dijadwalkan').gte('scheduled_date', today)` urut tanggal+jam, `limit(3)`. `today = new Date().toISOString().slice(0,10)` (UTC, bukan Jakarta — potensi selisih hari di dini hari WIB).
- `rmp_forms.select('id, judul, status, updated_at').in('status',['approved','revision','submitted']).order('updated_at' desc).limit(4)` → daftar "Aktivitas Terbaru" dengan titik warna (hijau approved, merah revision, kuning submitted).
- `profiles.select('*')` untuk sapaan nama.

Tombol "Buat RMP Baru" → `/dashboard/guru/rmp/buat`.

---

### 2. RMP — state machine & aturan

Tipe: `RmpStatus = 'draft' | 'submitted' | 'approved' | 'revision'` (`src/types/database.ts`). Tabel `rmp_forms` (kolom: `guru_id, judul, tema, fase, kelas, dimensi_p5[], elemen_p5[], aktivitas_pengenalan/kontekstual/aksi/refleksi, asesmen_awal/formatif/sumatif, status, catatan_kepsek, admin_ceklis[], reviewed_by, reviewed_at`).

```
            upsertRmp(status='draft')                 upsertRmp(status='submitted')
 (baru) ───────────────────────────► draft ─────────────────────────────────► submitted
                                       │  deleteRmp (hanya draft, oleh guru)      │
                                       ▼                                          │ reviewRmp (kepsek/admin)
                                    (terhapus)                          ┌─────────┴─────────┐
                                                                        ▼                   ▼
                                                                    approved            revision
```

| Aksi | Siapa | Server action | Aturan |
|---|---|---|---|
| Simpan draft / kirim | Guru | `upsertRmp` (`guru/rmp/actions.ts`) | `upsert` dengan `onConflict: 'id'`; `guru_id` selalu dipaksa `user.id`; `updated_at` diisi manual. Jika `status === 'submitted'` → `notifyKepsekOfSubmission` |
| Hapus langsung | Guru | `deleteRmp` | Hanya milik sendiri **dan** `status === 'draft'` |
| Minta hapus | Guru | `requestRmpDeletion(rmpId, reason)` | Bukan draft, milik sendiri, alasan ≥ 5 karakter, tidak boleh ada permintaan `pending` untuk RMP yang sama (dicek lewat admin client). Insert ke `rmp_deletion_requests`, notifikasi ke semua `admin` (link `/dashboard/admin/rmp`) |
| Setujui/revisi | Kepsek (atau admin) | `reviewRmp` (`kepsek/rmp/actions.ts`) | Catatan wajib bila `revision`; menyimpan `admin_ceklis` (SPVC-01) dan notifikasi ke guru |
| Hapus oleh admin | Admin | `adminDeleteRmp`, `approveDeletionRequest`, `rejectDeletionRequest` (`admin/rmp/actions.ts`) | Lihat bagian 12 |

`notifyKepsekOfSubmission` memakai **admin client** (service role) untuk mengambil nama guru dan semua `profiles.role = 'kepsek'`, lalu insert satu notifikasi per kepsek: judul "RMP baru menunggu review", link `/dashboard/kepsek/rmp/{id}`. Error hanya di-`console.error`, tidak menggagalkan penyimpanan.

Catatan penting (perilaku nyata, perlu diketahui developer):
- Wizard `/rmp/buat` hanya memuat **draft terbaru milik guru** (`status = 'draft'`, `order updated_at desc`, `limit 1`), bukan RMP berdasarkan `id`. Artinya guru hanya punya satu "slot" draft yang dilanjutkan; membuat RMP kedua saat masih ada draft akan melanjutkan draft itu.
- Halaman detail menampilkan tombol "Lanjutkan Edit Draft" **hanya saat `draft`**. Untuk status `revision`, banner menyuruh guru "menyunting kembali", tetapi tidak ada tombol edit dan wizard tidak memuat RMP berstatus `revision` (belum terverifikasi apakah ada jalur lain; dari kode yang dibaca tidak ada). Ini kandidat celah alur yang layak dicek.
- Tidak ada autosave. Penyimpanan hanya saat klik "Simpan Draft" atau "Kirim untuk Ditinjau"; keduanya `router.push('/dashboard/guru/rmp')` setelah ±800 ms.
- `asesmen_awal` selalu dikirim `''` oleh wizard (field ada di DB dan ditampilkan di detail bila terisi, tetapi UI wizard tidak memilikinya).

#### Daftar RMP — `guru/rmp/page.tsx` + `components/dashboard/guru/RmpListClient.tsx`

Server: `rmp_forms.select('id, judul, tema, status, created_at').eq('guru_id', user.id)` urut `created_at` desc, lalu `rmp_deletion_requests.select('rmp_id').in('rmp_id', ids).eq('status','pending')` untuk menandai `has_pending_deletion`.

Client (`RmpListClient`), aksi per baris:
- Klik baris → `/dashboard/guru/rmp/{id}`.
- `canDelete = status === 'draft'` → ikon tong sampah + `ConfirmModal` → `deleteRmp`.
- `canDownload = status === 'approved'` → `RmpPdfDownloadButton`.
- `canRequest = status !== 'draft' && !has_pending_deletion` → tombol "Minta Hapus" + `RequestModal` (alasan min. 5 karakter) → `requestRmpDeletion`.
- `has_pending_deletion` → lencana "Permintaan diajukan".
- Setelah aksi sukses: `router.refresh()` + toast 3,5 detik.

#### Detail RMP — `guru/rmp/[id]/page.tsx` (`GuruRmpDetailPage`)

- Query `rmp_forms.select('*').eq('id', id).single()`; `notFound()` bila tidak ada; `redirect` ke daftar bila `guru_id !== user.id`.
- Nama peninjau dari `profiles` memakai `reviewed_by`.
- Komponen: `StatusBanner` (teks per status), `CatatanKepsekCard` (ditampilkan bila ada catatan, atau status `revision`/`approved`; modal "Buka Penuh" bila teks panjang > 280 karakter), seksi Informasi Umum / Tujuan Projek / Alur Aktivitas / Asesmen, dan `CeklisAdminCard` (SPVC-01, **hanya muncul setelah `reviewed_at` terisi**, menampilkan centang dari `admin_ceklis` terhadap `ADMIN_CEKLIS_ITEMS` di `src/lib/rmp-ceklis.ts`, 8 butir).
- Tidak ada tombol unduh PDF di halaman detail; unduh hanya di daftar.

#### Realtime — `components/dashboard/guru/RmpRealtimeWatcher.tsx`

Dipasang di halaman detail. Subscribe channel `rmp-watch:{rmpId}` pada `postgres_changes` event `UPDATE`, tabel `public.rmp_forms`, filter `id=eq.{rmpId}`. Setiap update memanggil `router.refresh()` sehingga status/catatan dari kepsek muncul tanpa reload manual. Channel dibersihkan (`removeChannel`) saat unmount. Prasyarat: tabel `rmp_forms` harus ada di publikasi realtime Supabase (konfigurasi DB, tidak ada di repo; belum terverifikasi).

#### Wizard — `guru/rmp/buat/page.tsx` (`RmpWizardPage`, client component)

`STEPS`: 1 Informasi Umum, 2 Tujuan Projek, 3 Alur Aktivitas, 4 Asesmen, 5 Pratinjau. State tunggal `RmpState`; `StepIndicator` + progress bar.

| Langkah | Field | Catatan |
|---|---|---|
| 1 | `judul` (teks), `tema` (`ComboSelect` dari `TEMA_PROJEK`, 7 opsi), `fase` (`ComboSelect` dari `FASE`: Fase A–F), `kelas` (opsional) | `ComboSelect` punya opsi "Ketik sendiri…"; bila nilai tersimpan tidak ada di daftar, otomatis mode kustom |
| 2 | `dimensi_p5_text` (checkbox dari `PROFIL_LULUSAN`, 8 dimensi, urutan mengikuti daftar), `elemen_p5_text` (textarea, satu per baris, opsional) | Saran maks. 2–3 dimensi (hanya teks anjuran, tidak divalidasi). Disimpan sebagai array lewat `splitLines` (trim + buang baris kosong) |
| 3 | `aktivitas.pengenalan / kontekstual / aksi / refleksi` | Empat textarea |
| 4 | `asesmen.formatif`, `asesmen.sumatif` | `asesmen_awal` tidak ada di UI |
| 5 | Pratinjau read-only dengan tombol "Edit" per seksi (`onJumpTo`) | Tombol akhir "Kirim untuk Ditinjau" |

Validasi isi: **tidak ada** validasi wajib-isi di wizard maupun `upsertRmp` (semua field boleh kosong, termasuk saat dikirim). Satu-satunya pagar ada di sisi kepsek (review).
Konstanta: `src/lib/profil-lulusan.ts` — `PROFIL_LULUSAN` (id: keimanan, kewargaan, penalaran_kritis, kreativitas, kolaborasi, kemandirian, kesehatan, komunikasi; disimpan ke DB sebagai **label**, bukan id), `TEMA_PROJEK`, `FASE`. Nama kolom DB masih `dimensi_p5`/`elemen_p5` (warisan P5) walau isinya kini Profil Lulusan.

#### PDF resmi — `RmpPdfDownloadButton.tsx`, `RmpDocument.tsx`, `src/lib/rmp-pdf-actions.ts`

Alur klik "Unduh PDF Resmi":
1. `getRmpPdfData(rmpId)` (server action, `rmp-pdf-actions.ts`): wajib login; baca `rmp_forms`; **tolak bila `status !== 'approved'`** ("Hanya RMP yang disetujui…"); ambil `profiles` (nama, NIP, `signature_url`) untuk `guru_id` dan `reviewed_by`; ambil `school_settings` (id = 1) untuk kop. Mengembalikan `{ school, rmp, guru, kepsek }`.
2. Client menaruh `<RmpDocument>` di luar layar (`position: fixed; left: -99999px`), menunggu semua `<img>` selesai/gagal dimuat.
3. `html2canvas-pro` (scale 2, `useCORS`, lebar 794 px) → canvas → `jsPDF` A4 (`unit: 'pt'`), gambar JPEG kualitas 0,92, dipecah ke beberapa halaman dengan menggeser posisi gambar (`heightLeft`). Library dimuat dinamis (`import()`).
4. `pdf.save('{judul-bersih}.pdf')` (karakter selain `a-zA-Z0-9-_ ` dibuang, maks. 80).

`RmpDocument` (`forwardRef`, gaya inline, font Times New Roman): kop dari `school_settings` (logo, `header_line_1/2`, `school_name`, alamat/telp/email/website), judul, tabel isi, lalu dua kolom tanda tangan **Guru** dan **Kepala Sekolah** (`SignatureCell`: gambar `signature_url` atau teks "(tanda tangan belum tersedia)", nama, NIP). Baris tanggal = `"{kota}, {tanggal}"` dengan kota = potongan terakhir `school.address` setelah koma dan tanggal = `reviewed_at ?? updated_at`. Tanda tangan berasal dari bucket `signatures` (lihat Profil). Gambar lintas-origin butuh CORS pada bucket publik Supabase.

---

### 3. Jadwal — `guru/jadwal/page.tsx` (`GuruJadwalPage`)

Hanya baca. Query: `schedules.select('*').eq('teacher_id', user.id)` urut tanggal + jam, lalu `profiles.select('id, full_name').in('id', supervisorIds)` untuk nama supervisor. Pemisahan:
- **Akan Datang** = `status === 'dijadwalkan' && scheduled_date >= todayIso` → `ScheduleCard` (grid 2 kolom).
- **Riwayat** = sisanya (selesai, dibatalkan, atau dijadwalkan yang sudah lewat tanggal), urut tanggal menurun → tabel dengan kolom Meeting (`ZoomLinksCell`) dan Status.

Fitur di kartu:
- **Tiga tautan Zoom** per tahap: `zoom_link_pra`, `zoom_link_pengamatan`, `zoom_link_pasca` (Pra-Konferensi, Pengamatan, Pasca-Konferensi). `safeHttpUrl` hanya meloloskan `http:`/`https:`; tombol dibuka `target="_blank" rel="noopener noreferrer"`. Diisi oleh kepsek (lihat `kepsek/jadwal/actions.ts`; guru tidak mengisi).
- **Timeline fase** (`getActivePhase`): `selesai` → `pasca`; `scheduled_date === todayIso` → `saat`; selain itu `pra`. Tombol Zoom fase aktif disorot emas.
- **Kontrak pra-konferensi (SPVC-02)** — `KontrakBlock`: tampil bila `kontrak_fokus` (array) atau `kontrak_catatan` ada; menampilkan chip fokus + catatan. Diisi kepsek pada `updateSchedule`; saat fokus baru/berubah kepsek-action mengirim notifikasi "Kontrak pra-konferensi ditetapkan" ke guru.
- Kartu hari ini diberi banner "Supervisi Hari Ini".

Catatan: `todayIso` dihitung dengan `toISOString()` (UTC), bukan zona Jakarta (belum terverifikasi dampaknya di dini hari WIB).

---

### 4. Laporan — `guru/laporan/page.tsx` & `[id]/page.tsx`

- **Hanya laporan `status = 'submitted'`** milik guru (`teacher_id = user.id`) yang tampil. Laporan `draft` tidak terlihat oleh guru. (`approved` ada di tipe `ReportStatus` tetapi tidak dipakai di panel ini.)
- Daftar: `supervision_reports.select('id, supervisor_id, subject, class_name, visit_date, score')`; nama supervisor dari `profiles`; `ScoreBadge` hijau ≥ 80, kuning ≥ 60, merah di bawahnya.
- Detail: `select('*').eq('id', id).single()`; `notFound()` bila tidak ada; **redirect ke daftar bila `teacher_id !== user.id` atau status bukan `submitted`** (guard sisi aplikasi selain RLS).
- Konten detail (semua komponen dipakai ulang dari panel kepsek dengan `readOnly`):
  - Header: mata pelajaran, kelas, tanggal, nama supervisor, jenis instrumen (`pelaksanaan` / `administrasi` / `modul_ajar`), jam ke-, materi.
  - Kartu nilai + predikat (`getPredikat` lokal: SB ≥ 91, B ≥ 76, C ≥ 61, K di bawahnya; sama dengan `getPredikat` di `src/lib/laporan-rubrik.ts`).
  - `LaporanRadarChart` hanya untuk `instrument_type === 'pelaksanaan'` (SPVC-03, dari `observation_scores`).
  - Urutan formulir mengikuti buku: SPVC-04, 05, 06 (`SpvcNarrativeForm` readOnly) → RTL SPVC-07/08 (`LaporanRtlForm` readOnly, dengan `legacyRecommendation` dari `recommendations`) → SPVC-09 → `LaporanDokumentasi` readOnly.
  - `spvcInitial()`: untuk `spvc05`, bila kolom jsonb kosong, **jatuh balik ke kolom lama** `strengths`/`improvements` (`{kekuatan, kelemahan}`) agar laporan lama tetap tampil.
- Notifikasi ke guru dibuat saat kepsek `publishLaporan` ("Laporan Supervisi Tersedia", link `/dashboard/guru/laporan/{id}`).

---

### 5. Video Mengajar

Tabel `teaching_videos` (`teacher_id, schedule_id, title, subject, class_name, video_url, teacher_note, status, kepsek_note, reviewed_by, reviewed_at`). `VideoStatus = 'belum_ditinjau' | 'sudah_ditinjau'`.

- **Bukan unggah file**: guru menempel **link eksternal** (YouTube unlisted / Google Drive) pada `VideoForm` (`<input type="url">`). Server menormalkan lewat `validateHttpUrl` (hanya `http(s)`), menolak lainnya.
- Daftar `guru/video/page.tsx`: `teaching_videos.select('id, title, subject, class_name, status, created_at').eq('teacher_id', user.id)` → `VideoListClient` (klik baris → detail).
- `buat/page.tsx`: memuat opsi jadwal (`schedules` milik guru, urut tanggal desc) untuk dropdown "Hubungkan ke Jadwal Supervisi" (opsional; field `schedule_id`).
- Detail `[id]/page.tsx`: `notFound()` bila bukan milik guru. **`isEditable = status === 'belum_ditinjau'`**: bila ya → `VideoForm mode="edit"` (ubah/hapus); bila `sudah_ditinjau` → tampilan read-only + tombol "Buka Video". Catatan kepsek (`kepsek_note`) + nama peninjau ditampilkan bila ada.
- Server actions (`guru/video/actions.ts`): `createVideo` (validasi judul/mapel/kelas/URL, `status: 'belum_ditinjau'`, lalu `notifyKepsekOfVideo` ke semua kepsek, link `/dashboard/kepsek/video/{id}`), `updateVideo` dan `deleteVideo` (cek pemilik dan **hanya bila masih `belum_ditinjau`**).
- Peninjauan: `kepsek/video/actions.ts:reviewVideo` (kepsek/admin) mengubah status, menyimpan `kepsek_note`, dan **hanya saat transisi menjadi `sudah_ditinjau`** mengirim notifikasi ke guru (link `/dashboard/guru/video/{id}`).

---

### 6. Profil — `guru/profil/page.tsx` (`GuruProfilPage`)

Query `profiles.select('*').eq('id', user.id).single()`; bila tidak ada → `redirect('/verify-profile')`. Tiga komponen (dipakai juga oleh kepsek/admin, tersebar di `src/components/dashboard/`):
- **`AvatarUploader`** (bucket Storage `avatars`, maks. 5 MB, `accept="image/*"`, `upload(..., { upsert: true })`, lalu hapus berkas lama dengan ekstensi berbeda **setelah** upload baru sukses, `getPublicUrl`) → menyimpan URL lewat `updateAvatarUrl` (`dashboard/profil/actions.ts`).
- **`ProfileEditForm`**: nama + NIP. Bila NIP atau sandi baru berubah (`credentialsChanging`) memakai `updateLoginCredentials`; bila tidak, `updateProfile`. `updateLoginCredentials` memverifikasi sandi saat ini lewat `signInWithPassword`, memeriksa NIP unik, mengubah email auth (`{nip}@sistem.lokal`) dan sandi (min. 8 karakter) lewat **service role** `auth.admin.updateUserById`, lalu menyinkronkan `profiles` (nama, nip, email); mengembalikan `requiresRelogin: true`.
- **`SignatureUploader`** (bucket `signatures`): kanvas `react-signature-canvas`, `toBlob('image/png')`, `upload(path, blob, { upsert: true })`, URL publik disimpan via `updateSignatureUrl` ke `profiles.signature_url`. Tanda tangan ini yang dipakai di PDF RMP (sisi guru) dan dokumen kepsek.

---

### 7. Ringkasan notifikasi yang terkait guru

| Pemicu | Penerima | Judul | Link | Sumber |
|---|---|---|---|---|
| Guru kirim RMP | Semua kepsek | RMP baru menunggu review | `/dashboard/kepsek/rmp/{id}` | `guru/rmp/actions.ts:notifyKepsekOfSubmission` |
| Guru minta hapus RMP | Semua admin | Permintaan hapus RMP | `/dashboard/admin/rmp` | `requestRmpDeletion` |
| Guru kirim video | Semua kepsek | Video mengajar baru menunggu review | `/dashboard/kepsek/video/{id}` | `notifyKepsekOfVideo` |
| Kepsek setujui/revisi RMP | Guru pemilik | RMP Anda disetujui / perlu direvisi | `/dashboard/guru/rmp` | `kepsek/rmp/actions.ts:reviewRmp` |
| Kepsek tinjau video | Guru pemilik | Video mengajar Anda sudah ditinjau | `/dashboard/guru/video/{id}` | `kepsek/video/actions.ts:reviewVideo` |
| Kepsek buat/ubah/batal jadwal | Guru terkait | Anda dijadwalkan supervisi / Jadwal diperbarui / dibatalkan / Kontrak ditetapkan | `/dashboard/guru/jadwal` | `kepsek/jadwal/actions.ts` |
| Kepsek publikasi laporan | Guru | Laporan Supervisi Tersedia | `/dashboard/guru/laporan/{id}` | `kepsek/laporan/actions.ts:publishLaporan` |
| Admin hapus / setujui / tolak permintaan hapus | Guru | Modul RMP dihapus / Permintaan hapus disetujui / ditolak | `/dashboard/guru/rmp` | `admin/rmp/actions.ts` |

Semua insert notifikasi memakai `createAdminClient()` (service role, melewati RLS) karena pengirim tidak punya hak menulis ke baris milik user lain. Penerima melihatnya lewat `NotificationBell` (realtime INSERT pada `notifications` dengan filter `user_id`).

### 8. Hal yang belum terverifikasi / perlu dicek developer berikutnya

- Policy RLS dan publikasi realtime Supabase tidak ada di repo (tidak ada berkas `.sql`).
- Jalur edit RMP berstatus `revision` oleh guru (lihat catatan di bagian 2).
- Perhitungan "hari ini" memakai UTC di beranda dan jadwal.
- Satu draft RMP aktif per guru karena wizard hanya memuat draft terbaru.

---

## 14. Rincian: Panel Kepala Sekolah

Semua halaman panel ini adalah **Server Component** (`export const dynamic = 'force-dynamic'`) yang mengambil data lewat `createServerClient()` (`src/utils/supabase/server.ts`, memakai cookie sesi + RLS), lalu menyerahkan data ke **Client Component** di `src/components/dashboard/kepsek/`. Semua mutasi lewat **Server Action** (`'use server'`) di `actions.ts` pada folder halaman masing-masing.

Pola yang berulang di semua halaman:

1. `supabase.auth.getUser()`; bila tidak ada user, `redirect('/login')`.
2. Cek peran: `profiles.role` harus `kepsek` atau `admin`, bila tidak `redirect('/dashboard')`. (Dasbor `page.tsx`, daftar/detail RMP, dan profil hanya mengecek login; perlindungan datanya bergantung RLS dan server action.)
3. Query paralel dengan `Promise.all`, hasil di-cast `as unknown as {...}`.
4. Nama guru/avatar tidak di-join: halaman mengambil `teacher_id` unik lalu query `profiles` kedua (`.in('id', ids)`) dan membuat `Map` (lihat `laporan/page.tsx`, `rmp/page.tsx`, `video/page.tsx`).
5. Layout: `<KepsekSidebar />` + header sticky + `<main>`.

Setiap server action kepsek memanggil `requireKepsek()` lokal (cek `profiles.role` ∈ {`kepsek`,`admin`}). Notifikasi ke guru ditulis ke tabel `notifications` memakai `createAdminClient()` (service role) agar melewati RLS.

### Navigasi: `KepsekSidebar.tsx`

`components/dashboard/kepsek/KepsekSidebar.tsx` (client). Menu: Dasbor, Pengelolaan Jadwal, RMP Guru, Video Mengajar, Bank Instrumen, Laporan Supervisi, Pesan, Profil Saya. Drawer mobile (state `open`, menutup saat `pathname` berubah). Logout: `supabase.auth.signOut()` lalu `router.push('/login')`. Footer pengguna: `SidebarUserFooter`.

### 1. Dasbor: `kepsek/page.tsx`

Tujuan: ringkasan statistik dan analitik supervisi (gaya "Supervision Statistics grid" sesuai `CLAUDE.md` proyek).

Query (satu `Promise.all`):

| Metrik / data | Tabel & filter |
|---|---|
| Nama sapaan | `profiles.full_name` where `id = user.id` |
| **RMP Perlu Ditinjau** | `rmp_forms` count (`head: true`) where `status = 'submitted'` (semua guru) |
| **Jadwal Minggu Ini** | `schedules` count where `supervisor_id = user.id` dan `scheduled_date` antara hari ini s.d. +7 hari |
| **Total Laporan Selesai** | `supervision_reports` count where `status = 'approved'` dan `supervisor_id = user.id` |
| RMP Terbaru (5) | `rmp_forms` `status in (submitted, revision, approved)` urut `updated_at desc` limit 5; nama guru via query `profiles` kedua |
| Data grafik | `supervision_reports` (`visit_date`, `score`) where `supervisor_id = user.id`, `score is not null`, `visit_date >= awal bulan 5 bulan lalu` |

Pengolahan di server:

- `monthlyTrend`: loop 6 bulan terakhir (`i = 5..0`), key `YYYY-MM`, rata-rata skor dibulatkan 1 desimal; bulan tanpa data bernilai `avg: 0`.
- `predikatData`: hitung jumlah laporan per predikat dari `score`: SB ≥ 91, B 76–90, C 61–75, K < 61 (warna `#10b981`, `#3b82f6`, `#f59e0b`, `#ef4444`).
- Dikirim ke `SupervisiCharts` (client, Recharts): `BarChart` rata-rata skor per bulan (batang `#FFC600`, tooltip menampilkan predikat) dan `PieChart` donat distribusi predikat. Bila tidak ada data skor, tampil pesan kosong.

Catatan: kartu "Total Laporan Selesai" menghitung `status = 'approved'`, tetapi **tidak ada server action di repo yang mengubah laporan menjadi `approved`** (alur kepsek hanya `draft` ⇄ `submitted`, lihat bagian Laporan). Selama tidak ada proses lain (mis. SQL manual), angka ini akan selalu 0 (belum terverifikasi di luar kode repo).

### 2. Pengelolaan Jadwal: `kepsek/jadwal/page.tsx`, `KepsekJadwalClient.tsx`, `jadwal/actions.ts`

Tujuan: kepsek membuat/mengubah/membatalkan/menyelesaikan jadwal supervisi per guru. Guru melihat jadwal yang sama di `guru/jadwal`.

Page: guard peran; ambil **semua** `schedules` (urut tanggal & jam desc) dan daftar guru (`profiles` where `role='guru'`, urut `full_name`); gabungkan `teacher_name` lewat `Map`.

Komponen `KepsekJadwalClient`:

- Filter status (`semua | dijadwalkan | selesai | dibatalkan`) + pencarian teks (guru, mapel, kelas), keduanya client-side via `useMemo`.
- Tabel: tanggal/waktu, guru, mapel, kelas, status (badge), **Meeting** (`ZoomLinkButtons`), aksi.
- `ZoomLinkButtons` menampilkan hingga 3 tombol (Pra, Pengamatan, Pasca) dari `zoom_link_pra`, `zoom_link_pengamatan`, `zoom_link_pasca`; URL dilewatkan `safeHttpUrl()` (hanya `http/https`), dibuka `target="_blank" rel="noopener noreferrer"`.
- Aksi per baris (`RowActions`, hanya bila status `dijadwalkan`): Edit (membuka `ScheduleFormModal`), Tandai Selesai (`completeSchedule`), Batalkan (`cancelSchedule`), keduanya dengan `ConfirmDialog`.
- `ScheduleFormModal`: guru, tanggal, waktu (dikirim `HH:MM:00`), mapel, kelas, 3 link meeting (opsional), catatan, dan blok **Kontrak Pra-Konferensi (SPVC-02)**: checkbox "Fokus Observasi" yang opsinya dibuat dari `SECTIONS` di `lib/laporan-rubrik.ts` (label dari `SECTION_SHORT_LABEL`: Pendahuluan, Penguasaan Materi, Strategi & Metode, Media Belajar, Pengelolaan Kelas, Interaksi, Penutup) + textarea `kontrak_catatan`.

Server action (`kepsek/jadwal/actions.ts`):

| Fungsi | Perilaku |
|---|---|
| `createSchedule(payload)` | `requireKepsek`; wajib guru/tanggal/waktu/mapel/kelas; insert `schedules` dengan `supervisor_id = user`, `status = 'dijadwalkan'`; link meeting divalidasi `validateHttpUrl` (non-http menjadi `null`); `kontrak_fokus` dibersihkan `sanitizeKontrakFokus` (trim, buang kosong, `null` bila kosong); notifikasi guru "Anda dijadwalkan supervisi" (link `/dashboard/guru/jadwal`) |
| `updateSchedule(payload)` | Hanya bila status saat ini `dijadwalkan`. Notifikasi guru bila tanggal/waktu/guru berubah ("Jadwal supervisi diperbarui"; bila guru diganti, guru lama diberi "Jadwal supervisi dipindahkan"). Notifikasi "Kontrak pra-konferensi ditetapkan" bila `kontrak_fokus` baru/berubah (dibanding via `JSON.stringify`). |
| `cancelSchedule(id)` | Hanya dari `dijadwalkan` menjadi `dibatalkan`; notifikasi guru |
| `completeSchedule(id)` | Set `selesai` (tidak mengecek status asal, tanpa notifikasi). Jadwal `selesai` inilah yang muncul sebagai opsi "Hubungkan ke Jadwal" di form laporan. |

Keputusan desain Zoom (memori proyek): link Zoom diinput kepsek di form jadwal.

### 3. RMP Guru (tinjau): `kepsek/rmp/page.tsx`, `kepsek/rmp/[id]/page.tsx`, `RmpReviewPanel.tsx`, `rmp/actions.ts`

**Daftar** (`rmp/page.tsx`): `rmp_forms` dengan `status in ('submitted','revision','approved')` (draft tidak tampil), urut `updated_at desc`; tabel judul, pengirim (+`Avatar`), tema, status, tanggal. Tombol "Tinjau RMP" ke `/dashboard/kepsek/rmp/[id]`; bila `approved` juga ada `RmpPdfDownloadButton` (unduh PDF; data dari `lib/rmp-pdf-actions.ts:getRmpPdfData`, hanya RMP `approved`).

**Detail** (`rmp/[id]/page.tsx`): `rmp_forms.*` + `profiles(full_name, nip)` guru. Menampilkan MetaCard, Informasi Umum, Tujuan Projek (`dimensi_p5`, `elemen_p5`), Alur Aktivitas (pengenalan, kontekstual, aksi, refleksi), Asesmen (awal opsional, formatif, sumatif), dan "Catatan Sebelumnya" bila `catatan_kepsek` ada dan status bukan `submitted`. Panel kanan: `RmpReviewPanel` bila status ≠ `draft`.

**`RmpReviewPanel`** (client): state `catatan`, `ceklis` (array id), dua tombol keputusan (setujui / kembalikan untuk revisi). Memanggil `reviewRmp({ id, decision, catatan, admin_ceklis })`, lalu `router.push('/dashboard/kepsek/rmp')` + `refresh()`.

- **SPVC-01 (Ceklis Administrasi Modul)**: 8 item di `lib/rmp-ceklis.ts` (`ADMIN_CEKLIS_ITEMS`: identitas, tujuan, alur, asesmen, materi, media, alokasi, lampiran). Disimpan di `rmp_forms.admin_ceklis` (array id yang dicentang); `ADMIN_CEKLIS_TOTAL = 8` untuk penghitung "n/8".

**`reviewRmp`** (`kepsek/rmp/actions.ts`): cek role `kepsek`/`admin`; keputusan `approved | revision`; **catatan wajib** bila `revision`; `admin_ceklis` di-trim, `null` bila kosong; update `rmp_forms` (`status`, `catatan_kepsek`, `admin_ceklis`, `reviewed_by`, `reviewed_at`, `updated_at`) memakai client sesi (tunduk RLS); lalu baca `guru_id, judul` dan insert notifikasi guru ("RMP Anda disetujui" / "RMP Anda perlu direvisi", link `/dashboard/guru/rmp`); `revalidatePath` kepsek & guru.

Alur status RMP: `draft` (guru) menjadi `submitted` (guru kirim; kepsek diberi notifikasi) menjadi `approved` atau `revision` (kepsek). Dari `approved`, kepsek masih boleh mengembalikan ke `revision`.

### 4. Video Mengajar: `kepsek/video/page.tsx`, `kepsek/video/[id]/page.tsx`, `KepsekVideoListClient.tsx`, `VideoReviewForm.tsx`, `video/actions.ts`

- **Daftar**: guard peran; `teaching_videos` (semua guru) urut `created_at desc`; nama guru via query `profiles` kedua. `KepsekVideoListClient` menyaring `semua | belum_ditinjau | sudah_ditinjau` (client-side).
- **Detail**: video + nama guru; mapel/kelas, catatan pengantar guru, tombol "Tonton Video" (link eksternal `video_url`; sistem hanya menyimpan URL, tidak mengunggah video). Panel kanan: `VideoReviewForm`.
- **`VideoReviewForm`**: textarea catatan + tombol "Tandai Sudah Ditinjau" (saat `belum_ditinjau`), "Kembalikan ke Belum Ditinjau", dan "Simpan Catatan" (saat sudah ditinjau). Memanggil `reviewVideo({ id, status, kepsek_note })`.
- **`reviewVideo`**: `requireKepsek`; update `status`, `kepsek_note`, `reviewed_by`, `reviewed_at`, `updated_at`. Notifikasi ke guru **hanya** pada transisi baru ke `sudah_ditinjau` (`existing.status !== 'sudah_ditinjau'`), link `/dashboard/guru/video/[id]`. Guru tidak bisa edit/hapus video setelah `sudah_ditinjau` (`guru/video/actions.ts`).

### 5. Bank Instrumen: `kepsek/instrumen/page.tsx`

Halaman **client statis** (`'use client'`, tanpa query database). Konstanta `instruments` berisi 3 instrumen, ditampilkan sebagai kartu accordion (`expanded` = id yang terbuka) dengan tabel Aspek/Indikator:

1. `pra`, Pra Konferensi: Instrumen Penilaian RPP / Modul Ajar (7 aspek)
2. `pengamatan`, Pengamatan Kelas: Instrumen Observasi Pembelajaran (8 aspek)
3. `pasca`, Pasca Konferensi: Instrumen Pasca Observasi & Refleksi

Ini hanya referensi bacaan. Instrumen yang dipakai menilai sungguhan ada di `lib/laporan-rubrik.ts`. Keduanya hardcoded terpisah sehingga bisa tidak sinkron.

### 6. Laporan Supervisi

Tabel utama: `supervision_reports` (`src/types/database.ts`). Status: `draft` → `submitted` (di UI disebut **Published**) dan sebaliknya; nilai `approved` ada di tipe dan badge UI tetapi tidak ditulis kode mana pun (lihat catatan dasbor).

#### 6.1 Daftar: `laporan/page.tsx` + `KepsekLaporanClient.tsx`
Hanya laporan milik kepsek yang login (`supervisor_id = user.id`), urut `visit_date desc`; nama/avatar guru via query `profiles` kedua. Filter client: Semua / Draft / Published. Kolom: guru, jenis instrumen (`pelaksanaan` | `administrasi` | `modul_ajar`), mapel/kelas, tanggal, `ScoreBadge` (SB/B/C/K), status. Klik baris menuju detail. Tombol "Buat Laporan" menuju `/laporan/buat`.

#### 6.2 Buat: `laporan/buat/page.tsx`
Menyiapkan opsi guru (`id, full_name, nip`), nama supervisor, dan **opsi jadwal** (`schedules` milik kepsek berstatus `selesai`), merender `<LaporanForm mode="create">`. Setelah `createLaporan` sukses, `router.push('/dashboard/kepsek/laporan/{id}')` supaya SPVC lain bisa diisi.

#### 6.3 Detail/Edit: `laporan/[id]/page.tsx`
Guard: peran kepsek/admin; laporan harus ada (`notFound()`); **`laporan.supervisor_id !== user.id` mengalihkan ke daftar** (kepsek hanya melihat laporannya sendiri). Juga mengambil `school_settings` (kop cetak) dan jadwal selesai. Susunan kartu (urutan sesuai buku):

1. `LaporanForm mode="edit"` (identitas + rubrik/nilai, SPVC-03)
2. `LaporanRadarChart` (hanya `instrument_type === 'pelaksanaan'`)
3. `SpvcNarrativeForm` SPVC-04, 05, 06 (`SPVC_FORMS` tanpa `spvc09`)
4. `LaporanRtlForm` (SPVC-07/08)
5. `SpvcNarrativeForm` SPVC-09
6. `LaporanDokumentasi`
7. `LaporanDetailActions` (Publish / Batalkan Publish / Hapus)

`spvcInitial()` memberi prefill SPVC-05: bila `spvc05` kosong tetapi kolom lama `strengths`/`improvements` terisi, dipakai sebagai `{kekuatan, kelemahan}`. Kolom lama `recommendations` dipakai sebagai prefill RTL.

Dokumen dirender dua kali dalam satu page: `div.print:hidden` (UI layar) dan `div.hidden.print:block` (`LaporanPrintView`). Tombol **Cetak / Export PDF** (`PrintButton`) memanggil `window.print()`, sehingga PDF dihasilkan lewat dialog cetak browser (bukan jsPDF).

#### 6.4 `LaporanForm.tsx`: identitas, rubrik, skor
- Field identitas: guru (select; NIP terisi otomatis, readonly), mapel, kelas/semester, tanggal, jam ke, materi, **jenis instrumen** (`pelaksanaan`, `administrasi` "Telaah Administrasi Pembelajaran", `modul_ajar` "Telaah Modul Ajar"), dan opsional "Hubungkan ke Jadwal" (`schedule_id`, hanya bila ada jadwal selesai).
- **Jenis `pelaksanaan` (SPVC-03)**: rubrik `SECTIONS` di `lib/laporan-rubrik.ts`: 7 seksi, 36 indikator (pendahuluan 6; penguasaan materi, strategi, media, pengelolaan kelas, interaksi, penutup masing-masing 5), tiap indikator diberi skor **1–4** lewat `ScoreButton` (klik ulang skor yang sama mereset ke 0). `observation_scores` disimpan `{ "<no indikator>": skor }` hanya bila ada skor > 0.
- Rumus: jumlah seksi = Σ skor item (`calcSectionSums`); total = Σ seksi; **`MAX_TOTAL = 144`** (36 × 4); **NA = round(total / 144 × 100, 2 desimal)**; `score` yang disimpan = NA (`null` bila total 0). Predikat `getPredikat(na)`: ≥91 Sangat Baik (SB), ≥76 Baik (B), ≥61 Cukup (C), sisanya Kurang (K). Rekap per seksi memakai `REKAPITULASI` (maks 24/20/20/20/20/20/20).
- **Jenis lain** (`administrasi`, `modul_ajar`): tanpa rubrik; skor manual 0–100, `observation_scores = null`.
- Submit: `create` memanggil `createLaporan`; `edit` memanggil `updateLaporan` dan menampilkan "Laporan berhasil disimpan."

#### 6.5 `laporan/actions.ts` (server)

| Fungsi | Aturan |
|---|---|
| `createLaporan` | Wajib guru/tanggal/mapel/kelas; skor 0–100 bila ada; insert dengan `supervisor_id = user`, `status = 'draft'`, `instrument_type` default `pelaksanaan` |
| `updateLaporan` | Hanya bila `existing.supervisor_id === userId` (admin pun harus pemilik) |
| `publishLaporan` | Pemilik saja; bila sudah `submitted` tidak berbuat apa-apa; set `submitted` + notifikasi guru "Laporan Supervisi Tersedia" (link `/dashboard/guru/laporan/{id}`) |
| `unpublishLaporan` | Pemilik saja; kembali ke `draft` (tanpa notifikasi) |
| `deleteLaporan` | Pemilik saja **dan** hanya status `draft` |
| `updateLaporanRtl(reportId, items)` | Pemilik; `sanitizeRtl` (trim, buang entri kosong, `null` bila kosong) ke `rtl_items` |
| `updateSpvcForm(reportId, column, data)` | Pemilik; kolom divalidasi whitelist `isSpvcColumn` (`spvc04/05/06/09`); hanya field terdaftar di `SPVC_FORMS[...].fields` yang disimpan, di-trim; kosong menjadi `null` |
| `updateLaporanDokumentasi(reportId, docs)` | Pemilik; `sanitizeDocs`: hanya URL `^https?://`, type `image|video|file`, nama dipotong 200 karakter, **maks 12 item** |

Semua mutasi me-`revalidatePath` halaman laporan kepsek dan guru.

#### 6.6 Formulir SPVC naratif: `lib/spvc-forms.ts` + `SpvcNarrativeForm.tsx`
`SPVC_FORMS` mendefinisikan 4 formulir, masing-masing satu kolom `jsonb` (`{ fieldKey: teks }`) di `supervision_reports`:

| Kode | Kolom | Field (key) |
|---|---|---|
| SPVC-04 Catatan Naratif Observasi | `spvc04` | `perilaku_guru`, `perilaku_siswa`, `kejadian_kunci` |
| SPVC-05 Evaluasi Pelaksanaan Supervisi | `spvc05` | `kekuatan`, `kelemahan`, `analisis` |
| SPVC-06 Umpan Balik Konstruktif | `spvc06` | `umpan_balik`, `tanggapan_guru`, `kesepakatan` |
| SPVC-09 Dampak Supervisi Klinis | `spvc09` | `dampak_guru`, `dampak_siswa`, `dampak_sekolah` |

`SpvcNarrativeForm` bersifat generik: mode edit (kepsek) merender textarea per field + tombol Simpan (`updateSpvcForm`), lencana "Terisi" via `hasSpvcContent`; mode `readOnly` (dipakai sisi guru) hanya menampilkan field terisi dan tidak merender apa pun bila kosong.

#### 6.7 RTL: `LaporanRtlForm.tsx`
Daftar dinamis `{ masalah, aksi, target }` (tambah/hapus/ubah), disimpan ke `rtl_items` (jsonb array). Masalah = SPVC-07 (identifikasi temuan); aksi + target = SPVC-08 (rencana aksi/coaching, target waktu). `normalize()` membuat satu item dari `recommendations` lama bila `rtl_items` kosong. Ada mode `readOnly` untuk guru.

#### 6.8 Dokumentasi: `LaporanDokumentasi.tsx`
Upload langsung dari browser ke **Supabase Storage bucket `supervisi-dokumentasi`** (`createBrowserClient`), path `{reportId}/{Date.now()}-{namaAman}`, `upsert: false`, URL publik via `getPublicUrl`. Batas **12 berkas per laporan** dan **50 MB per berkas**; tipe dideteksi dari MIME (`image`/`video`/`file`). Hapus berkas = `storage.remove` (best-effort) lalu simpan ulang daftar via `updateLaporanDokumentasi`. Metadata `DocItem { url, name, type }` di `documentation_urls`. Mode `readOnly` untuk guru.

#### 6.9 Radar: `LaporanRadarChart.tsx`
Hanya untuk `pelaksanaan` dan bila ada skor. `calcSectionPercentages(observation_scores)` (persentase seksi = jumlah ÷ skor maks seksi × 100, dibulatkan) menjadi `RadarChart` Recharts (domain 0–100). Menampilkan ringkasan area terkuat/terlemah (persentase min/maks); bila semua seksi sama, label terkuat/terlemah tidak ditampilkan.

#### 6.10 Cetak: `LaporanPrintView.tsx`
Komponen cetak formal (font `pt`; kop dari `school_settings`: logo, `header_line_1/2`, nama sekolah, alamat, telp, website). Isi: identitas, rubrik 36 indikator + rekap + NA + predikat (`pelaksanaan`) atau nilai manual, seksi SPVC 04/05/06/09 yang terisi (huruf seksi berurutan), tabel RTL (atau teks `recommendations` lama), dan blok Pengesahan (ruang tanda tangan supervisor & guru + nama; tidak terlihat memuat gambar `signature_url`, belum terverifikasi sepenuhnya).

### 7. Profil: `kepsek/profil/page.tsx`
Cek login saja, ambil `profiles.*` (tidak ada menuju `/verify-profile`). Menampilkan `AvatarUploader`, `ProfileEditForm` (ubah nama/NIP/sandi lewat `updateLoginCredentials`) dan `SignatureUploader` (`updateSignatureUrl`; dipakai di PDF RMP). Komponen dan action ini dipakai bersama guru/admin (`app/dashboard/profil/actions.ts`).

### 8. Pesan: `kepsek/pesan/page.tsx`, `kepsek/pesan/[guruId]/page.tsx`
Lihat bagian Pesan (fitur lintas peran).

### Peta SPVC-01 sampai SPVC-09 ke lokasi data

| Kode | Instrumen | Tempat input (UI) | Penyimpanan |
|---|---|---|---|
| SPVC-01 | Ceklis administrasi modul | `RmpReviewPanel` (kepsek) | `rmp_forms.admin_ceklis` |
| SPVC-02 | Kontrak pra-konferensi | Modal jadwal (`KepsekJadwalClient`) | `schedules.kontrak_fokus`, `schedules.kontrak_catatan` |
| SPVC-03 | Observasi kuantitatif (36 indikator) | `LaporanForm` (jenis `pelaksanaan`) | `supervision_reports.observation_scores`, `.score` |
| SPVC-04 | Catatan naratif observasi | `SpvcNarrativeForm` | `supervision_reports.spvc04` (jsonb) |
| SPVC-05 | Evaluasi pelaksanaan | `SpvcNarrativeForm` | `supervision_reports.spvc05` (jsonb; fallback `strengths`/`improvements`) |
| SPVC-06 | Umpan balik konstruktif | `SpvcNarrativeForm` | `supervision_reports.spvc06` (jsonb) |
| SPVC-07/08 | Temuan masalah + rencana aksi (RTL) | `LaporanRtlForm` | `supervision_reports.rtl_items` (jsonb array) |
| SPVC-09 | Dampak supervisi klinis | `SpvcNarrativeForm` | `supervision_reports.spvc09` (jsonb) |

### Hal yang perlu diwaspadai
- Status laporan `approved` tidak pernah di-set kode; kartu dasbor "Total Laporan Selesai" bergantung padanya.
- Kepsek hanya dapat mengubah/melihat detail laporan miliknya (`supervisor_id`); `role = admin` tidak melewati cek kepemilikan ini.
- `kepsek/page.tsx`, `rmp/page.tsx`, `rmp/[id]/page.tsx` tidak mengecek `role` di level halaman (bergantung RLS dan `reviewRmp`).
- Konten Bank Instrumen dan rubrik laporan adalah dua sumber hardcoded terpisah.
- Tidak ada file SQL/migrasi/RLS di repo; kebijakan RLS dan konfigurasi bucket `supervisi-dokumentasi` hanya ada di proyek Supabase (belum terverifikasi).

---

## 15. Rincian: Fitur Lintas Peran (Pesan, Profil, Notifikasi, Sidebar)

Bagian ini mencakup fitur yang dipakai lebih dari satu peran: **Pesan**, **Profil (foto, tanda tangan, kredensial login)**, **Notifikasi**, **Sidebar**, dan **Root Layout**.

---

### 1. Pesan (Guru ↔ Kepala Sekolah)

Percakapan privat satu-lawan-satu, real-time. Hanya antara peran `guru` dan `kepsek` (admin tidak bisa mengirim; lihat `resolveConversation`).

#### 1.1 Routing dan berkas

| Route | Berkas | Peran |
|---|---|---|
| `/dashboard/guru/pesan` | `src/app/dashboard/guru/pesan/page.tsx` | guru (admin lolos guard, tapi tidak bisa kirim) |
| `/dashboard/guru/pesan/[kepsekId]` | `src/app/dashboard/guru/pesan/[kepsekId]/page.tsx` | guru |
| `/dashboard/kepsek/pesan` | `src/app/dashboard/kepsek/pesan/page.tsx` | kepsek |
| `/dashboard/kepsek/pesan/[guruId]` | `src/app/dashboard/kepsek/pesan/[guruId]/page.tsx` | kepsek |
| (logika server) | `src/app/dashboard/pesan/actions.ts` | keduanya |
| (UI bersama) | `src/components/dashboard/PesanListClient.tsx`, `PesanThread.tsx` | keduanya |

Semua halaman memakai `export const dynamic = 'force-dynamic'` dan guard peran di server (`redirect('/dashboard')` bila peran tidak cocok). Parameter dinamis `[kepsekId]`/`[guruId]` adalah **id lawan bicara (profiles.id)**, bukan id percakapan. Halaman thread memanggil `notFound()` bila profil lawan tidak ada atau rolenya salah.

#### 1.2 Daftar kontak (halaman list)

`GuruPesanPage` / `KepsekPesanPage`:
1. Ambil semua profil lawan peran (`profiles` where `role='kepsek'` untuk guru, `role='guru'` untuk kepsek), urut `full_name`. Artinya **semua** kepsek/guru tampil sebagai kontak, meski belum pernah chat.
2. Ambil `conversations` milik user (`guru_id = user.id` atau `kepsek_id = user.id`) untuk kontak-kontak tsb.
3. Ambil `messages` terbaru per percakapan (satu query, `order created_at desc`, lalu pilih yang pertama per `conversation_id` di JS). Bila `deleted_at` terisi, preview diganti `"Pesan telah dihapus"`.
4. Susun `PesanListItem[]` (`id`, `name`, `lastMessage`, `lastMessageAt`), urut: pesan terbaru di atas, yang belum pernah chat urut abjad.
5. `PesanListClient` merender daftar (link ke `${basePath}/${item.id}`), avatar bulat berisi huruf pertama nama (bukan komponen `Avatar`), dan waktu: jam bila hari ini, tanggal pendek bila bukan (zona `Asia/Jakarta`, pembanding hari memakai locale `en-CA`).

#### 1.3 Halaman thread

Di server: ambil percakapan (`conversations` where `guru_id` & `kepsek_id` cocok, `maybeSingle`), lalu semua pesan urut naik. Percakapan **belum tentu ada** (dibuat lazily saat pesan pertama), sehingga `conversationId` bisa `null`.

**Redaksi:** pesan ber-`deleted_at` dikirim ke client dengan `body: ''` (`initialMessages` di kedua page.tsx), sehingga isi asli tidak ikut ke browser pada render awal. Catatan: `resyncMessages()` dan payload realtime di client mengambil baris mentah, jadi `body` pesan terhapus tetap ada di memori client pada jalur itu; UI tetap menampilkan "Pesan telah dihapus" karena render memeriksa `deleted_at`. Perlindungan di level database (RLS) tidak ada di repo (belum terverifikasi).

#### 1.4 `PesanThread` (client component)

Props: `conversationId | null`, `currentUserId`, `counterpartId`, `counterpartName`, `initialMessages`.

- **Pembeda gelembung:** `isMine = m.sender_id === currentUserId`. Milik sendiri: rata kanan, gradasi emas `#FFC600 → #F7A800`. Lawan: rata kiri, putih bergaris slate.
- **Pembagi tanggal:** label `weekday, tanggal bulan tahun` (`id-ID`, `Asia/Jakarta`) muncul saat label berubah. Jam per pesan `HH:mm` `Asia/Jakarta`. Penanda `· diedit` bila `edited_at` terisi dan tidak dihapus.
- **Kirim:** Enter = kirim, Shift+Enter = baris baru. `handleSend` mengosongkan draft lebih dulu, memanggil `sendMessage(counterpartId, text)` dalam `useTransition`; hasil `message` ditambahkan ke state bila belum ada (dedupe berdasarkan `id`, karena realtime INSERT bisa datang lebih dulu). Jika `conversationId` baru dikembalikan, state diperbarui sehingga langganan realtime pesan aktif.
- **Edit:** tombol pensil (hanya pesan sendiri yang belum dihapus) membuka textarea inline; `editMessage` lalu pembaruan optimistik `body` dan `edited_at`. Tombol edit/hapus muncul saat hover di desktop, selalu terlihat di mobile.
- **Hapus:** `confirm()` lalu `deleteMessage`; state ditandai `deleted_at` (soft delete, baris tidak dihapus). Pesan terhapus tampil "Pesan telah dihapus" untuk kedua pihak.
- **Auto-scroll:** `bottomRef.scrollIntoView` setiap `messages.length` berubah.

#### 1.5 Realtime (Supabase `postgres_changes`)

Tiga mekanisme di `PesanThread.tsx`:

1. **Channel `messages-watch:{conversationId}`** (jika percakapan sudah ada): listen `INSERT` dan `UPDATE` pada `public.messages` dengan filter `conversation_id=eq.{id}`. INSERT menambah pesan (dedupe id); UPDATE mengganti pesan (dipakai untuk edit dan soft delete dari sisi lawan). Setiap status `SUBSCRIBED` (termasuk setelah reconnect) memanggil `resyncMessages()` yang mengambil ulang semua pesan, agar pesan yang terlewat saat socket putus tidak hilang.
2. **Channel `conversations-watch:{currentUserId}:{counterpartId}`** (hanya selama `conversationId == null`): listen `INSERT` pada `public.conversations` dengan dua filter (`guru_id=eq.{me}` dan `kepsek_id=eq.{me}`); bila baris baru melibatkan `counterpartId`, `setConversationId(row.id)`. Halaman yang terbuka langsung "tersambung" ketika lawan mengirim pesan pertama. Channel dibongkar sendiri saat `conversationId` terisi.
3. **`visibilitychange`**: saat tab kembali terlihat, `resyncMessages()` dipanggil (mengatasi laptop sleep/tab di latar belakang).

Prasyarat (belum terverifikasi dari repo): tabel `messages`, `conversations`, `notifications` harus ada di publikasi `supabase_realtime`, dan RLS harus mengizinkan peserta membaca baris tsb.

#### 1.6 Server actions (`src/app/dashboard/pesan/actions.ts`)

| Fungsi | Peran |
|---|---|
| `requireUser()` | Ambil user dari sesi + `role` dari `profiles`. |
| `resolveConversation(userId, role, counterpartId)` | Tolak jika role bukan guru/kepsek. Tentukan `guruId`/`kepsekId` dari peran pemanggil. **Validasi lawan bicara:** profil lawan harus ada dan berperan kebalikan (guru→kepsek, kepsek→guru), jika tidak `"Penerima pesan tidak valid."`. Cari percakapan existing (`guru_id`+`kepsek_id`); jika tidak ada, insert baru. Satu pasangan guru–kepsek = satu percakapan (constraint UNIQUE di DB belum terverifikasi). |
| `sendMessage(counterpartId, body)` | Trim, tolak kosong. Insert ke `messages` (klien user, tunduk RLS), update `conversations.updated_at`, lalu kirim notifikasi (1.7). Mengembalikan `{conversationId, message}`. `revalidatePath` untuk kedua list. |
| `editMessage(id, body)` | Hanya pengirim; tolak bila sudah dihapus. Set `body` dan `edited_at`. |
| `deleteMessage(id)` | Hanya pengirim. Set `deleted_at` (soft delete). |

#### 1.7 Notifikasi pesan dan dedupe

Setelah pesan terkirim, `sendMessage` memakai **admin client** (service role) untuk insert ke `notifications`: penerima = lawan bicara, judul `Pesan baru`, pesan `"{nama pengirim} mengirim pesan baru."`, link `/dashboard/{peran penerima}/pesan/{id pengirim}`. **Dedupe:** sebelum insert dicek apakah sudah ada notifikasi **belum dibaca** dengan `user_id` + `link` yang sama; bila ada, tidak dibuat yang baru. Jadi 10 pesan beruntun hanya menghasilkan satu notifikasi sampai penerima mengkliknya (klik menandai `is_read`).

---

### 2. Profil

Halaman profil ada untuk ketiga peran dan hampir identik (komponen bersama):

| Route | Berkas | Isi |
|---|---|---|
| `/dashboard/guru/profil` | `src/app/dashboard/guru/profil/page.tsx` | AvatarUploader, ProfileEditForm, **SignatureUploader** |
| `/dashboard/kepsek/profil` | `src/app/dashboard/kepsek/profil/page.tsx` | sama dengan guru |
| `/dashboard/admin/profil` | `src/app/dashboard/admin/profil/page.tsx` | AvatarUploader, ProfileEditForm (tanpa tanda tangan) |

Server component: `getUser()` → `profiles.select('*')` → bila profil tidak ada, `redirect('/verify-profile')`.

#### 2.1 `Avatar` (`src/components/dashboard/Avatar.tsx`)
Komponen presentasi. Jika `avatarUrl` ada, tampil `<img>` bulat. Jika tidak, lingkaran berwarna berisi inisial (huruf pertama + huruf pertama kata terakhir). Warna dipilih deterministik dari hash nama (8 pilihan kelas Tailwind). Ukuran `sm` (32px), `md` (56px), `lg` (80px). Dipakai di: `SidebarUserFooter`, `UserTable` (admin), `AdminRmpClient`, `kepsek/rmp/page.tsx`, `KepsekLaporanClient`, `KepsekVideoListClient`.

#### 2.2 `AvatarUploader` (`src/components/dashboard/AvatarUploader.tsx`)
- Bucket Supabase Storage **`avatars`** (URL publik via `getPublicUrl`), path `{userId}/avatar.{ext}`, `upsert: true`.
- Validasi di client: `file.type` harus diawali `image/`, ukuran maks **5 MB**. (Teks bantuan menulis "JPG/PNG", tetapi kode menerima semua `image/*`.)
- Urutan: upload file baru → baru hapus file lama berekstensi lain di folder user (agar upload gagal tidak merusak foto lama) → `getPublicUrl` + `?t={Date.now()}` untuk cache-busting → server action `updateAvatarUrl(url)` menyimpan ke `profiles.avatar_url` → `window.dispatchEvent('avatar-updated')` → `router.refresh()`.
- Hapus: hapus semua file di folder user, `updateAvatarUrl(null)`, event `avatar-updated` dengan `avatarUrl: null`.
- Upload langsung dari browser ke Storage (bukan lewat server action), sehingga keamanan bergantung pada **policy Storage** (tidak ada di repo; belum terverifikasi).

#### 2.3 `SidebarUserFooter` (`src/components/dashboard/SidebarUserFooter.tsx`)
Client component di dasar semua sidebar. Mengambil `full_name` dan `avatar_url` saat mount, menampilkan `Avatar` kecil + nama + label peran (`roleLabel`). Mendengarkan event DOM `avatar-updated` agar foto sidebar berubah seketika setelah upload tanpa reload.

#### 2.4 `SignatureUploader` (`src/components/dashboard/SignatureUploader.tsx`)
Hanya guru dan kepsek. **Menggambar di kanvas** (`react-signature-canvas`, 400×200, pena `#0F172A`, latar putih), bukan upload berkas. Simpan: `canvas.toBlob('image/png')` → bucket **`signatures`**, path `{userId}/signature.png` (`upsert`) → URL publik + `?t=` → `updateSignatureUrl(url)` → `profiles.signature_url`. Tanda tangan dipakai pada dokumen RMP PDF (`getRmpPdfData` di `src/lib/rmp-pdf-actions.ts` membaca `signature_url` guru dan kepsek pereview); pemakaian pada cetak laporan (`LaporanPrintView`) belum terverifikasi.

#### 2.5 `ProfileEditForm` dan `profil/actions.ts`
Form tunggal untuk nama, NIP login, dan ganti kata sandi opsional.
- `credentialsChanging = NIP berubah || ada kata sandi baru`.
- Jika **tidak** mengubah kredensial → `updateProfile({full_name, nip})`. Catatan: fungsi ini hanya memperbarui `full_name` (parameter `nip` diabaikan).
- Jika mengubah kredensial → wajib isi kata sandi saat ini; konfirmasi kata sandi baru dicek di client; `updateLoginCredentials(...)`.
- Setelah sukses `requiresRelogin: true` → `supabase.auth.signOut()` + `router.push('/login')`.

**Mengapa `updateLoginCredentials` memakai admin API (`src/app/dashboard/profil/actions.ts`):** identitas login sebenarnya adalah `auth.users.email` (`{nip}@sistem.lokal`), bukan kolom `profiles.nip`. Mengubah NIP hanya di tabel `profiles` membuat NIP yang tampil tidak sinkron dengan kredensial login. Mengubah email Auth tanpa alur konfirmasi email membutuhkan `auth.admin.updateUserById` (service role, `email_confirm: true`). Langkahnya: (1) autentikasi sesi; (2) **verifikasi ulang kata sandi** via `signInWithPassword` (mencegah sesi terbuka yang dibajak mengunci pemilik asli); (3) bila email baru berbeda, cek `profiles.nip` belum dipakai user lain; (4) `admin.auth.admin.updateUserById` (email + opsional password, minimal 8 karakter); (5) update `profiles` (`full_name`, `nip`, `email`).

---

### 3. Notifikasi

#### 3.1 `NotificationBell` (`src/components/NotificationBell.tsx`)
Dipasang sekali di `src/app/dashboard/layout.tsx`, sehingga tampil di seluruh `/dashboard/**` sebagai tombol lonceng melayang kanan-bawah (`fixed bottom-4 right-4`).
- Mount: `getUser()` → muat 20 notifikasi terbaru (`notifications` where `user_id`, `created_at desc`).
- **Realtime:** channel `notifications:{uid}` listen `INSERT` pada `public.notifications` dengan filter `user_id=eq.{uid}`. Saat masuk: toast sonner (`toast.success(title, {description})`, 4 dtk), lonceng disembunyikan sementara selama toast (`isShowingToast`), item ditambah di depan daftar (maks 20).
- Badge merah = jumlah `is_read=false` (maks "99+").
- Klik item: optimistik tandai terbaca, `update is_read=true` (klien user), lalu `router.push(link)`. "Tandai semua" memperbarui semua id yang belum dibaca. Tutup dengan klik luar atau Esc.
- Hanya INSERT yang didengarkan; tidak ada realtime untuk perubahan `is_read` lintas tab.

Semua notifikasi **ditulis lewat admin client** (service role) di server action, bukan oleh browser.

#### 3.2 Tabel semua titik pembuatan notifikasi

| # | Berkas : fungsi | Pemicu | Pengirim → Penerima | Judul | Link |
|---|---|---|---|---|---|
| 1 | `guru/rmp/actions.ts` : `notifyKepsekOfSubmission` (dari `upsertRmp` saat `status='submitted'`) | Guru mengirim RMP | guru → **semua kepsek** | RMP baru menunggu review | `/dashboard/kepsek/rmp/{rmpId}` |
| 2 | `guru/rmp/actions.ts` : `requestRmpDeletion` | Guru minta hapus RMP | guru → **semua admin** | Permintaan hapus RMP | `/dashboard/admin/rmp` |
| 3 | `kepsek/rmp/actions.ts` : `reviewRmp` | Kepsek menyetujui / minta revisi | kepsek → guru pemilik | RMP Anda disetujui / RMP Anda perlu direvisi | `/dashboard/guru/rmp` |
| 4 | `admin/rmp/actions.ts` : `adminDeleteRmp` | Admin hapus RMP langsung | admin → guru pemilik | Modul RMP dihapus | `/dashboard/guru/rmp` |
| 5 | `admin/rmp/actions.ts` : `approveDeletionRequest` | Admin setujui permintaan hapus | admin → guru pemohon | Permintaan hapus disetujui | `/dashboard/guru/rmp` |
| 6 | `admin/rmp/actions.ts` : `rejectDeletionRequest` | Admin tolak permintaan hapus | admin → guru pemohon | Permintaan hapus ditolak | `/dashboard/guru/rmp` |
| 7 | `kepsek/jadwal/actions.ts` : `notifyGuru` via `createSchedule` | Jadwal dibuat | kepsek → guru | Anda dijadwalkan supervisi | `/dashboard/guru/jadwal` |
| 8 | idem via `updateSchedule` | Tanggal/jam/guru berubah | kepsek → guru baru (dan guru lama bila dipindah) | Jadwal supervisi diperbarui / dipindahkan | `/dashboard/guru/jadwal` |
| 9 | idem via `updateSchedule` | Fokus kontrak pra-konferensi baru/berubah | kepsek → guru | Kontrak pra-konferensi ditetapkan | `/dashboard/guru/jadwal` |
| 10 | idem via `cancelSchedule` | Jadwal dibatalkan | kepsek → guru | Jadwal supervisi dibatalkan | `/dashboard/guru/jadwal` |
| 11 | `kepsek/laporan/actions.ts` : `publishLaporan` | Laporan dipublikasikan (`submitted`) | kepsek → guru | Laporan Supervisi Tersedia | `/dashboard/guru/laporan/{id}` |
| 12 | `guru/video/actions.ts` : `notifyKepsekOfVideo` (dari `createVideo`) | Guru mengirim video | guru → **semua kepsek** | Video mengajar baru menunggu review | `/dashboard/kepsek/video/{id}` |
| 13 | `kepsek/video/actions.ts` : `reviewVideo` | Status berubah ke `sudah_ditinjau` (hanya transisi pertama) | kepsek → guru | Video mengajar Anda sudah ditinjau | `/dashboard/guru/video/{id}` |
| 14 | `pesan/actions.ts` : `sendMessage` | Pesan baru (dengan dedupe, lihat 1.7) | pengirim → lawan | Pesan baru | `/dashboard/{peran penerima}/pesan/{id pengirim}` |

Tidak ada notifikasi untuk: `completeSchedule`, `unpublishLaporan`, `updateVideo`, `deleteVideo`, edit/hapus pesan. (Hasil grep `from('notifications')` pada `src/`; selain `NotificationBell`, hanya berkas di atas yang menulis.)

---

### 4. Sidebar tiga peran

Ketiganya client component dengan pola sama: tombol hamburger di mobile (drawer, menutup otomatis saat `pathname` berubah), logo/judul, daftar menu, tombol **Keluar** (`supabase.auth.signOut()` → `router.push('/login')` + `router.refresh()`), dan `SidebarUserFooter` di bawah. Menu aktif ditandai emas.

| Peran | Berkas | Menu → route |
|---|---|---|
| Admin | `components/dashboard/AdminSidebar.tsx` | Beranda `/dashboard/admin` · Kelola Pengguna `/dashboard/admin/pengguna` · Kelola RMP `/dashboard/admin/rmp` · Data Supervisi `/dashboard/admin/supervisi` · Pengaturan `/dashboard/admin/pengaturan` · Profil Saya `/dashboard/admin/profil` |
| Guru | `components/dashboard/guru/GururSidebar.tsx` (nama berkas memang `Gurur`) | Beranda `/dashboard/guru` · RMP Saya `/dashboard/guru/rmp` · Jadwal Supervisi `/dashboard/guru/jadwal` · Video Mengajar `/dashboard/guru/video` · Laporan Saya `/dashboard/guru/laporan` · Pesan `/dashboard/guru/pesan` · Profil Saya `/dashboard/guru/profil` |
| Kepsek | `components/dashboard/kepsek/KepsekSidebar.tsx` | Dasbor `/dashboard/kepsek` · Pengelolaan Jadwal `/dashboard/kepsek/jadwal` · RMP Guru `/dashboard/kepsek/rmp` · Video Mengajar `/dashboard/kepsek/video` · Bank Instrumen `/dashboard/kepsek/instrumen` · Laporan Supervisi `/dashboard/kepsek/laporan` · Pesan `/dashboard/kepsek/pesan` · Profil Saya `/dashboard/kepsek/profil` |

Detail: `AdminSidebar` menandai aktif dengan kesamaan persis (`pathname === href`), sedangkan guru/kepsek memakai `pathname === href || pathname.startsWith(href + '/')` agar halaman detail tetap menyorot menunya. Admin tidak punya menu Pesan.

Setiap halaman memasang sidebarnya sendiri (layout `flex h-screen` di tiap `page.tsx`), bukan lewat `layout.tsx` bersama; `dashboard/layout.tsx` hanya menambahkan `NotificationBell`.

---

### 5. Root layout (`src/app/layout.tsx`)

- Font via `next/font/google`: **Playfair Display** (variabel CSS `--font-playfair`, untuk `font-heading`) dan **Inter** (`--font-inter`, untuk `font-body`). Pemetaan variabel ke kelas Tailwind ada di `globals.css` (belum dibaca).
- `<html lang="id" suppressHydrationWarning>`, `<body>` bergaya `bg-slate-950 text-slate-50 antialiased` (halaman dashboard menimpa dengan `bg-slate-50`).
- `<Toaster position="bottom-right" richColors />` dari **sonner**: dipakai `NotificationBell` untuk toast notifikasi baru.
- Metadata: judul "Sistem Supervisi Pendidikan Terpadu".
- Guard autentikasi bukan di layout, melainkan di `src/proxy.ts` (redirect ke `/login` untuk prefiks `/dashboard`, `/laporan`, `/jadwal`, `/profil`) dan di tiap `page.tsx`.

### 6. Storage bucket yang ditemukan di kode

| Bucket | Dipakai oleh | Path |
|---|---|---|
| `avatars` | `AvatarUploader` | `{userId}/avatar.{ext}` |
| `signatures` | `SignatureUploader` | `{userId}/signature.png` |
| `school-assets` | `SchoolSettingsForm` (logo sekolah) | `logo/...` |
| `supervisi-dokumentasi` | `LaporanDokumentasi` (dokumentasi laporan) | `{reportId}/{timestamp}-{nama}` (lihat bagian 14) |

Kebijakan akses bucket dan RLS tabel tidak ada di repo (tidak ada berkas `.sql`); verifikasi langsung di dashboard Supabase.
