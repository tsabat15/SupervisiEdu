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
