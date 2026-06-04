# Grafik Supervisi Kepsek Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan dua grafik analitik supervisi (bar chart tren nilai bulanan + donut chart distribusi predikat) di dashboard kepsek, ditempatkan di antara section Ringkasan dan RMP Terbaru.

**Architecture:** Data diambil di server component (`page.tsx`) dari satu query `supervision_reports`, diproses menjadi `MonthlyTrend[]` dan `PredikatCount[]` di server, lalu diteruskan sebagai props ke `SupervisiCharts` client component yang merender chart dengan Recharts.

**Tech Stack:** Next.js 16 App Router, Recharts (npm install required), TypeScript, Tailwind CSS, Lucide React.

---

## File Structure

**Baru dibuat:**
- `src/components/dashboard/kepsek/SupervisiCharts.tsx` — client component berisi bar chart + donut chart

**Dimodifikasi:**
- `src/app/dashboard/kepsek/page.tsx` — tambah query laporan, proses data chart, render SupervisiCharts

---

## Task 1: Install Recharts

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Install recharts**

```bash
cd "d:\My Project\supervisi-sekolah"
npm install recharts
```

Expected output: `added N packages` tanpa error.

- [ ] **Step 2: Verifikasi TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 error baru (2 pre-existing errors di pengguna/actions.ts dan verify-profile/page.tsx adalah normal).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install recharts for supervision charts"
```

---

## Task 2: SupervisiCharts Component

**Files:**
- Create: `src/components/dashboard/kepsek/SupervisiCharts.tsx`

- [ ] **Step 1: Buat file SupervisiCharts.tsx**

```typescript
'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

export interface MonthlyTrend {
  month: string
  avg: number
  count: number
}

export interface PredikatCount {
  name: string
  label: string
  value: number
  color: string
}

interface Props {
  monthlyTrend: MonthlyTrend[]
  predikatData: PredikatCount[]
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { payload: MonthlyTrend }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
      <p className="font-body text-xs font-semibold text-slate-700">{label}</p>
      <p className="font-body text-xs text-slate-500">
        Rata-rata:{' '}
        <span className="font-semibold text-slate-800">{d.avg > 0 ? d.avg : '—'}</span>
      </p>
      {d.count > 0 && (
        <p className="font-body text-xs text-slate-400">{d.count} laporan</p>
      )}
    </div>
  )
}

export default function SupervisiCharts({ monthlyTrend, predikatData }: Props) {
  const totalNilai = predikatData.reduce((s, p) => s + p.value, 0)

  if (totalNilai === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-10 text-center">
        <p className="font-body text-sm text-slate-500">
          Belum ada data laporan dengan nilai. Tambahkan nilai di laporan supervisi.
        </p>
      </div>
    )
  }

  const filledPredikat = predikatData.filter((p) => p.value > 0)

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Bar Chart — 2/3 lebar */}
      <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-5">
        <h3 className="font-heading text-sm font-bold text-[#002147] mb-4">
          Tren Nilai Rata-rata (6 Bulan Terakhir)
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={monthlyTrend}
            margin={{ top: 8, right: 20, left: -20, bottom: 0 }}
          >
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fontFamily: 'inherit', fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fontFamily: 'inherit', fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
            <ReferenceLine
              y={81}
              stroke="#3b82f6"
              strokeDasharray="4 2"
              label={{ value: 'B', fontSize: 10, fill: '#3b82f6', position: 'insideRight' }}
            />
            <ReferenceLine
              y={71}
              stroke="#f59e0b"
              strokeDasharray="4 2"
              label={{ value: 'C', fontSize: 10, fill: '#f59e0b', position: 'insideRight' }}
            />
            <Bar dataKey="avg" fill="#FFC600" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Donut Chart — 1/3 lebar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-5">
        <h3 className="font-heading text-sm font-bold text-[#002147] mb-4">
          Distribusi Predikat
        </h3>
        <div className="relative">
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={filledPredikat}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                dataKey="value"
                paddingAngle={2}
                startAngle={90}
                endAngle={-270}
              >
                {filledPredikat.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="font-heading text-xl font-bold text-slate-900">{totalNilai}</p>
              <p className="font-body text-[10px] text-slate-400">laporan</p>
            </div>
          </div>
        </div>
        <div className="mt-3 space-y-1.5">
          {predikatData.map((p) => (
            <div key={p.name} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: p.value > 0 ? p.color : '#e2e8f0' }}
                />
                <span className="font-body text-xs text-slate-600">
                  {p.name} — {p.label}
                </span>
              </div>
              <span className="font-body text-xs font-semibold text-slate-700">{p.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verifikasi TypeScript**

```bash
cd "d:\My Project\supervisi-sekolah"
npx tsc --noEmit
```

Expected: 0 error baru.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/kepsek/SupervisiCharts.tsx
git commit -m "feat: add SupervisiCharts component with bar and donut charts"
```

---

## Task 3: Integrasi ke Dashboard Kepsek

**Files:**
- Modify: `src/app/dashboard/kepsek/page.tsx`

Halaman ini saat ini memiliki `Promise.all` dengan 5 query dan 2 section: "Ringkasan" dan "RMP Terbaru". Kita tambah satu query laporan dan satu section baru di antara keduanya.

- [ ] **Step 1: Tambah import SupervisiCharts dan types**

Di bagian atas file, setelah import yang sudah ada, tambah:

```typescript
import SupervisiCharts, {
  type MonthlyTrend,
  type PredikatCount,
} from '@/src/components/dashboard/kepsek/SupervisiCharts'
```

- [ ] **Step 2: Tambah query laporan ke Promise.all**

Cari bagian `const today = new Date()` dan tambahkan kalkulasi `sixMonthsAgo`:

```typescript
const today = new Date()
const weekAhead = new Date()
weekAhead.setDate(today.getDate() + 7)
const sixMonthsAgo = new Date()
sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
```

Kemudian di dalam `Promise.all`, tambahkan query ke-6 setelah `recentRmp`:

```typescript
const [
  { data: profile },
  { count: rmpPerluTinjau },
  { count: jadwalMingguIni },
  { count: laporanSelesai },
  { data: recentRmp },
  { data: rawLaporanChart },
] = (await Promise.all([
  supabase.from('profiles').select('full_name').eq('id', user.id).single(),
  supabase
    .from('rmp_forms')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'submitted'),
  supabase
    .from('schedules')
    .select('*', { count: 'exact', head: true })
    .eq('supervisor_id', user.id)
    .gte('scheduled_date', isoDate(today))
    .lte('scheduled_date', isoDate(weekAhead)),
  supabase
    .from('supervision_reports')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved'),
  supabase
    .from('rmp_forms')
    .select('id, judul, status, updated_at, guru_id')
    .in('status', ['submitted', 'revision', 'approved'])
    .order('updated_at', { ascending: false })
    .limit(5),
  supabase
    .from('supervision_reports')
    .select('visit_date, score')
    .eq('supervisor_id', user.id)
    .not('score', 'is', null),
])) as unknown as [
  { data: { full_name: string } | null },
  { count: number | null },
  { count: number | null },
  { count: number | null },
  { data: RecentRmpBase[] | null },
  { data: { visit_date: string; score: number }[] | null },
]
```

- [ ] **Step 3: Proses data chart di server (setelah Promise.all, sebelum return)**

Tambahkan blok pemrosesan setelah `const recent: RecentRmpRow[] = ...`:

```typescript
// Proses MonthlyTrend — 6 bulan terakhir
const scored = rawLaporanChart ?? []
const sixMonthsAgoStr = isoDate(sixMonthsAgo)

const monthMap = new Map<string, { total: number; count: number }>()
for (const r of scored) {
  if (r.visit_date < sixMonthsAgoStr) continue
  const key = r.visit_date.slice(0, 7) // YYYY-MM
  const entry = monthMap.get(key) ?? { total: 0, count: 0 }
  entry.total += r.score
  entry.count += 1
  monthMap.set(key, entry)
}

const monthlyTrend: MonthlyTrend[] = []
for (let i = 5; i >= 0; i--) {
  const d = new Date()
  d.setMonth(d.getMonth() - i)
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  const label = d.toLocaleDateString('id-ID', { month: 'short' })
  const entry = monthMap.get(key)
  monthlyTrend.push({
    month: label,
    avg: entry ? Math.round((entry.total / entry.count) * 10) / 10 : 0,
    count: entry?.count ?? 0,
  })
}

// Proses PredikatCount — semua laporan dengan score
const predikatData: PredikatCount[] = [
  {
    name: 'SB',
    label: 'Sangat Baik',
    value: scored.filter((r) => r.score >= 91).length,
    color: '#10b981',
  },
  {
    name: 'B',
    label: 'Baik',
    value: scored.filter((r) => r.score >= 81 && r.score < 91).length,
    color: '#3b82f6',
  },
  {
    name: 'C',
    label: 'Cukup',
    value: scored.filter((r) => r.score >= 71 && r.score < 81).length,
    color: '#f59e0b',
  },
  {
    name: 'K',
    label: 'Kurang',
    value: scored.filter((r) => r.score < 71).length,
    color: '#ef4444',
  },
]
```

- [ ] **Step 4: Tambah section Analitik Supervisi di JSX**

Di dalam `<main>`, di antara section "Ringkasan" dan section "RMP Terbaru", tambah section baru:

```tsx
<section>
  <h2 className="font-heading text-base md:text-lg font-semibold text-slate-900 mb-4">
    Analitik Supervisi
  </h2>
  <SupervisiCharts monthlyTrend={monthlyTrend} predikatData={predikatData} />
</section>
```

JSX lengkap `<main>` setelah perubahan:

```tsx
<main className="px-4 py-6 md:px-8 md:py-8 space-y-6 md:space-y-8">
  <section>
    <h2 className="font-heading text-base md:text-lg font-semibold text-slate-900 mb-4">
      Ringkasan
    </h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
      {metrics.map(({ label, value, hint, icon: Icon, iconColor, iconBg, accent }) => (
        <div
          key={label}
          className={`bg-white rounded-xl border border-slate-200 border-l-4 ${accent} px-5 py-5 shadow-sm hover:shadow-md hover:border-amber-300 transition`}
        >
          <div className="flex items-center justify-between">
            <span className="font-body text-sm font-medium text-slate-500">{label}</span>
            <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
          </div>
          <p className="font-heading text-3xl font-bold text-slate-900 mt-3">
            {value.toLocaleString('id-ID')}
          </p>
          <p className="font-body text-xs text-slate-400 mt-1">{hint}</p>
        </div>
      ))}
    </div>
  </section>

  <section>
    <h2 className="font-heading text-base md:text-lg font-semibold text-slate-900 mb-4">
      Analitik Supervisi
    </h2>
    <SupervisiCharts monthlyTrend={monthlyTrend} predikatData={predikatData} />
  </section>

  <section className="bg-white rounded-xl border border-slate-200">
    <div className="px-5 md:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-amber-500" />
        <h3 className="font-heading text-base font-bold text-slate-900">
          RMP Terbaru
        </h3>
      </div>
      <Link
        href="/dashboard/kepsek/rmp"
        className="font-body text-xs font-semibold text-amber-600 hover:text-amber-700"
      >
        Lihat semua
      </Link>
    </div>

    {recent.length === 0 ? (
      <div className="px-6 py-10 text-center">
        <p className="font-body text-sm text-slate-500">
          Belum ada modul yang dikirim oleh guru.
        </p>
      </div>
    ) : (
      <ul className="divide-y divide-slate-100">
        {recent.map((item) => {
          const badge = STATUS_BADGE[item.status] ?? STATUS_BADGE.draft
          return (
            <li key={item.id}>
              <Link
                href={`/dashboard/kepsek/rmp/${item.id}`}
                className="flex items-center gap-3 px-5 md:px-6 py-3.5 hover:bg-slate-50/60 transition"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm font-semibold text-slate-800 truncate">
                    {item.judul || 'Tanpa Judul'}
                  </p>
                  <p className="font-body text-xs text-slate-500 mt-0.5 truncate">
                    {item.guru_name ?? 'Guru tidak diketahui'} ·{' '}
                    {formatDate(item.updated_at)}
                  </p>
                </div>
                <span
                  className={`font-body text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${badge.className}`}
                >
                  {badge.label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    )}
  </section>
</main>
```

- [ ] **Step 5: Verifikasi TypeScript**

```bash
cd "d:\My Project\supervisi-sekolah"
npx tsc --noEmit
```

Expected: 0 error baru.

- [ ] **Step 6: Verifikasi manual**

Jalankan dev server:
```bash
npm run dev
```

Buka `http://localhost:3000/dashboard/kepsek` (atau port yang aktif). Verifikasi:
- Section "Analitik Supervisi" muncul di antara Ringkasan dan RMP Terbaru
- Bar chart tampil dengan data bulanan (jika ada laporan dengan nilai)
- Donut chart tampil distribusi SB/B/C/K
- Jika tidak ada laporan dengan nilai → empty state "Belum ada data laporan dengan nilai..."
- Responsive: mobile (stack vertikal), desktop (bar 2/3 + donut 1/3)

- [ ] **Step 7: Commit**

```bash
git add src/app/dashboard/kepsek/page.tsx
git commit -m "feat: add analitik supervisi section with bar and donut charts to kepsek dashboard"
```
