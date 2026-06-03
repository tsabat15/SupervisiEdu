# Laporan Supervisi Implementation Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Membangun fitur Laporan Supervisi yang memungkinkan kepsek membuat laporan observasi guru (mandiri atau terhubung jadwal), dan guru dapat membaca laporan yang ditujukan kepada mereka.

**Architecture:** Kepsek memiliki halaman daftar + form buat/edit laporan. Guru memiliki halaman read-only untuk melihat laporan yang sudah dipublish. Laporan menggunakan tabel `supervision_reports` yang sudah ada di DB. Status flow: draft → submitted (publish). Notifikasi otomatis dikirim ke guru saat laporan dipublish.

**Tech Stack:** Next.js 16 App Router, Supabase (PostgreSQL + RLS), TypeScript, Tailwind CSS, Eikra design system (Deep Navy #002147, Gold gradient #FFC600→#F7A800), Lucide React icons.

---

## Database

Tabel `supervision_reports` sudah ada dengan kolom:
- `id` — UUID
- `schedule_id` — nullable, FK ke `schedules.id`
- `supervisor_id` — UUID, FK ke `profiles.id` (kepsek)
- `teacher_id` — UUID, FK ke `profiles.id` (guru)
- `visit_date` — date string (YYYY-MM-DD)
- `subject` — string (mata pelajaran)
- `class_name` — string (kelas)
- `strengths` — text nullable
- `improvements` — text nullable
- `recommendations` — text nullable
- `score` — number nullable (0–100)
- `status` — `'draft' | 'submitted' | 'approved'` (hanya pakai draft + submitted)
- `created_at`, `updated_at`

Status `approved` ada di DB tapi tidak dipakai di UI ini.

---

## Halaman & Routes

| Route | Role | Fungsi |
|---|---|---|
| `/dashboard/kepsek/laporan` | Kepsek | Daftar semua laporan, filter status |
| `/dashboard/kepsek/laporan/buat` | Kepsek | Form buat laporan baru |
| `/dashboard/kepsek/laporan/[id]` | Kepsek | Detail + edit laporan |
| `/dashboard/guru/laporan` | Guru | Daftar laporan diterima (status submitted) |
| `/dashboard/guru/laporan/[id]` | Guru | Detail laporan read-only |

---

## Form Fields (Kepsek)

| Field | Tipe | Validasi |
|---|---|---|
| Guru | Dropdown pilih dari daftar guru aktif | Wajib |
| Tanggal Kunjungan (`visit_date`) | Date input | Wajib, default today |
| Mata Pelajaran (`subject`) | Text input | Wajib |
| Kelas (`class_name`) | Text input | Wajib |
| Kekuatan (`strengths`) | Textarea | Opsional |
| Area Perbaikan (`improvements`) | Textarea | Opsional |
| Rekomendasi (`recommendations`) | Textarea | Opsional |
| Nilai (`score`) | Number 0–100 | Opsional |
| Hubungkan ke Jadwal (`schedule_id`) | Dropdown jadwal selesai milik kepsek | Opsional |

---

## Status Flow

```
[Draft] --"Publish"--> [Submitted]
   ^                        |
   |____ kepsek bisa edit kapan saja (draft maupun submitted) __|
```

- **Draft**: hanya kepsek yang bisa lihat, guru tidak bisa akses
- **Submitted**: guru bisa lihat di halaman "Laporan Saya"
- Kepsek bisa edit laporan di status apapun (tidak ada lock)
- Saat status berubah draft → submitted: kirim notifikasi ke guru

---

## Komponen Baru

### Server
- `src/app/dashboard/kepsek/laporan/page.tsx` — halaman daftar kepsek (server component)
- `src/app/dashboard/kepsek/laporan/buat/page.tsx` — halaman form buat (server component)
- `src/app/dashboard/kepsek/laporan/[id]/page.tsx` — halaman detail/edit (server component)
- `src/app/dashboard/kepsek/laporan/actions.ts` — server actions: createLaporan, updateLaporan, publishLaporan, deleteLaporan
- `src/app/dashboard/guru/laporan/page.tsx` — halaman daftar guru (server component)
- `src/app/dashboard/guru/laporan/[id]/page.tsx` — halaman detail read-only guru (server component)

### Client
- `src/components/dashboard/kepsek/KepsekLaporanClient.tsx` — tabel laporan + filter status
- `src/components/dashboard/kepsek/LaporanForm.tsx` — form buat/edit laporan (client component)

### Sidebar Update
- `src/components/dashboard/kepsek/KepsekSidebar.tsx` — tambah item "Laporan Supervisi" dengan icon `FileText`
- `src/components/dashboard/guru/GururSidebar.tsx` — tambah item "Laporan Saya" dengan icon `FileText`

---

## UX Details

### Kepsek — Halaman Daftar (`/dashboard/kepsek/laporan`)
- Header: "Laporan Supervisi" + tombol "Buat Laporan" (gold gradient) di kanan atas
- Filter tab: Semua / Draft / Submitted
- Tabel: kolom Guru, Mata Pelajaran, Kelas, Tanggal, Nilai (badge warna), Status badge
- Nilai badge: ≥80 = emerald, 60–79 = amber, <60 = red, kosong = slate
- Klik baris → navigasi ke `/dashboard/kepsek/laporan/[id]`
- Empty state jika belum ada laporan

### Kepsek — Halaman Detail/Edit (`/dashboard/kepsek/laporan/[id]`)
- Tampil semua field dalam form yang bisa diedit
- Tombol "Simpan Draft" (simpan tanpa publish)
- Tombol "Publish" (simpan + ubah status ke submitted + kirim notifikasi)
- Jika sudah submitted: tombol "Batalkan Publish" (kembalikan ke draft) + tombol "Edit"

### Guru — Halaman Daftar (`/dashboard/guru/laporan`)
- Hanya tampil laporan status `submitted`
- Card per laporan: tanggal, mapel, kelas, nama kepsek, nilai badge
- Klik card → detail read-only
- Empty state jika belum ada laporan

### Guru — Halaman Detail (`/dashboard/guru/laporan/[id]`)
- Read-only: tampil semua field laporan
- Header dengan nama guru, kepsek, tanggal, mapel, kelas
- Nilai ditampilkan besar dan dengan warna badge
- Tiga section terpisah: Kekuatan / Area Perbaikan / Rekomendasi

---

## Notifikasi

Saat kepsek publish laporan (status draft → submitted):
- Insert ke tabel `notifications`:
  - `user_id` = `teacher_id` (guru yang bersangkutan)
  - `title` = `"Laporan Supervisi Tersedia"`
  - `message` = `"Laporan supervisi Anda untuk [subject] [class_name] sudah tersedia"`
  - `link` = `/dashboard/guru/laporan/[id]`
  - `is_read` = false

---

## Tidak Dibangun (YAGNI)

- Export PDF laporan supervisi
- Filter per rentang tanggal di halaman guru
- Pagination (load semua dulu)
- Status `approved` tidak dipakai di UI
- Guru tidak bisa memberikan respons/tanggapan balik
