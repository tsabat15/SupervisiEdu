# Grafik Supervisi Kepsek Implementation Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Menambahkan dua grafik analitik supervisi di dashboard kepsek — bar chart tren nilai rata-rata bulanan dan donut chart distribusi predikat SB/B/C/K.

**Architecture:** Data diambil di server component (`/dashboard/kepsek/page.tsx`), lalu diteruskan sebagai props ke `SupervisiCharts` client component yang merender chart menggunakan Recharts. Dua chart ditampilkan berdampingan di antara section "Ringkasan" dan "RMP Terbaru".

**Tech Stack:** Next.js 16 App Router, Recharts (npm), TypeScript, Tailwind CSS, Eikra design system (Deep Navy #002147, Gold #FFC600).

---

## Posisi di Dashboard

```
[Header: Dasbor]
[Section: Ringkasan] ← 3 kartu metrik (sudah ada)
[Section: Analitik Supervisi] ← BARU (bar + donut)
[Section: RMP Terbaru] ← sudah ada
```

---

## Data

Semua query difilter `supervisor_id = user.id` dan `score IS NOT NULL`.

### Bar Chart — Tren Nilai Rata-rata
- Query: `supervision_reports` grouped by bulan (6 bulan terakhir)
- Agregasi: `AVG(score)` per bulan
- Format hasil yang dikirim ke client:
```typescript
interface MonthlyTrend {
  month: string   // "Jan", "Feb", ..., "Jun" (id-ID locale)
  avg: number     // nilai rata-rata, dibulatkan 1 desimal
  count: number   // jumlah laporan bulan itu
}
```

### Donut Chart — Distribusi Predikat
- Query: `supervision_reports` count per predikat berdasarkan score
- Threshold resmi Kemendikbud: SB ≥91, B ≥81, C ≥71, K <71
- Format hasil yang dikirim ke client:
```typescript
interface PredikatCount {
  name: string    // "SB" | "B" | "C" | "K"
  label: string   // "Sangat Baik" | "Baik" | "Cukup" | "Kurang"
  value: number   // jumlah laporan
  color: string   // warna hex
}
```

---

## Komponen Baru

### `src/components/dashboard/kepsek/SupervisiCharts.tsx`
- `'use client'` component
- Props:
  ```typescript
  interface Props {
    monthlyTrend: MonthlyTrend[]
    predikatData: PredikatCount[]
  }
  ```
- Import dari Recharts: `BarChart`, `Bar`, `XAxis`, `YAxis`, `Tooltip`, `ReferenceLine`, `ResponsiveContainer`, `PieChart`, `Pie`, `Cell`, `Legend`
- Render dua chart berdampingan: `grid grid-cols-1 md:grid-cols-3 gap-4`
  - Bar chart: `md:col-span-2`
  - Donut chart: `md:col-span-1`

---

## Visual Detail

### Bar Chart
- Wrapper: `<ResponsiveContainer width="100%" height={220}>`
- Bar color: `#FFC600` (gold)
- Garis referensi:
  - `y=71` label "C" warna amber
  - `y=81` label "B" warna blue
- Tooltip: tampil `Rata-rata: ${avg} · ${count} laporan`
- Sumbu X: label bulan, sumbu Y: domain [0, 100]

### Donut Chart
- `<PieChart width={200} height={200}>` di dalam ResponsiveContainer
- `<Pie innerRadius={55} outerRadius={80} dataKey="value">`
- Di tengah donut: teks total laporan dinilai
- Warna: SB=#10b981, B=#3b82f6, C=#f59e0b, K=#ef4444
- Legend bawah: "SB 40% (4) · B 30% (3)" dst

### Empty State
Jika `monthlyTrend.length === 0` dan `predikatData` semua value=0:
```tsx
<div className="bg-white rounded-xl border border-slate-200 px-6 py-10 text-center">
  <p className="font-body text-sm text-slate-500">
    Belum ada data laporan dengan nilai. Tambahkan nilai di laporan supervisi.
  </p>
</div>
```

---

## Modifikasi `src/app/dashboard/kepsek/page.tsx`

Tambah dua query ke dalam `Promise.all` yang sudah ada:

```typescript
// Query 1: laporan per bulan (6 bulan terakhir)
const sixMonthsAgo = new Date()
sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

supabase
  .from('supervision_reports')
  .select('visit_date, score')
  .eq('supervisor_id', user.id)
  .not('score', 'is', null)
  .gte('visit_date', isoDate(sixMonthsAgo))

// Query 2: semua laporan dengan score (untuk predikat)
supabase
  .from('supervision_reports')
  .select('score')
  .eq('supervisor_id', user.id)
  .not('score', 'is', null)
```

Data diproses di server sebelum dikirim ke client:
- Monthly trend: group by `YYYY-MM`, hitung avg + count per bulan, format label bulan
- Predikat: hitung count per threshold, siapkan array PredikatCount

---

## Tidak Dibangun (YAGNI)

- Filter rentang tanggal kustom
- Export chart sebagai gambar
- Perbandingan antar kepsek
- Animasi chart (Recharts punya default, tidak perlu kustom)
