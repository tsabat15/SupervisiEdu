'use client'

import { useMemo } from 'react'
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { calcSectionPercentages, type SectionPercentage } from '@/src/lib/laporan-rubrik'

interface Props {
  observationScores: Record<string, number> | null | undefined
}

function RadarTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload: { label: string; percentage: number; sum: number; max: number } }[]
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
      <p className="font-body text-xs font-semibold text-slate-700">{d.label}</p>
      <p className="font-body text-xs text-slate-500">
        Capaian: <span className="font-semibold text-slate-800">{d.percentage}%</span>
      </p>
      <p className="font-body text-[11px] text-slate-400">
        Skor {d.sum} dari {d.max}
      </p>
    </div>
  )
}

export default function LaporanRadarChart({ observationScores }: Props) {
  const data = useMemo(() => {
    if (!observationScores || Object.keys(observationScores).length === 0) return null
    const hasScore = Object.values(observationScores).some((v) => v > 0)
    if (!hasScore) return null
    return calcSectionPercentages(observationScores)
  }, [observationScores])

  if (!data) return null

  const pcts = data.map((d) => d.percentage)
  const minPct = Math.min(...pcts)
  const maxPct = Math.max(...pcts)
  // Semua aspek seri → "terkuat/terlemah" tidak bermakna (mis. semua 100%).
  const allEqual = minPct === maxPct
  const weakest = data.filter((d) => d.percentage === minPct)
  const strongest = data.filter((d) => d.percentage === maxPct)

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 md:px-6 py-5">
      <h2 className="font-heading text-sm font-bold text-[#002147] mb-1">
        Analisis Capaian per Aspek
      </h2>
      <p className="font-body text-xs text-slate-500 mb-4">
        Persentase skor tiap aspek pembelajaran untuk memetakan area terkuat dan terlemah.
      </p>

      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis
            dataKey="label"
            tick={{ fontSize: 10, fontFamily: 'inherit', fill: '#475569' }}
          />
          <PolarRadiusAxis
            domain={[0, 100]}
            tick={{ fontSize: 9, fill: '#94a3b8' }}
            axisLine={false}
          />
          <Radar
            dataKey="percentage"
            stroke="#002147"
            fill="#FFC600"
            fillOpacity={0.45}
            strokeWidth={2}
          />
          <Tooltip content={<RadarTooltip />} />
        </RadarChart>
      </ResponsiveContainer>

      {allEqual ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 mt-4">
          <Minus className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-body text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
              Capaian Merata
            </p>
            <p className="font-body text-sm font-semibold text-slate-800 leading-snug mt-0.5">
              Semua aspek berada di {minPct}%
            </p>
            <p className="font-body text-xs text-slate-500 mt-0.5">
              Tidak ada aspek yang menonjol maupun tertinggal.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <AspectCard
            tone="strong"
            title="Aspek Terkuat"
            items={strongest}
            percentage={maxPct}
          />
          <AspectCard
            tone="weak"
            title="Perlu Ditingkatkan"
            items={weakest}
            percentage={minPct}
          />
        </div>
      )}
    </div>
  )
}

/** Ringkas daftar aspek; saat seri tampilkan semuanya (dipangkas bila banyak). */
function labelList(items: SectionPercentage[]): string {
  if (items.length === 1) return items[0].label
  if (items.length === 2) return `${items[0].label} & ${items[1].label}`
  return `${items[0].label}, ${items[1].label} +${items.length - 2} lainnya`
}

function AspectCard({
  tone,
  title,
  items,
  percentage,
}: {
  tone: 'strong' | 'weak'
  title: string
  items: SectionPercentage[]
  percentage: number
}) {
  const strong = tone === 'strong'
  const Icon = strong ? TrendingUp : TrendingDown
  return (
    <div
      className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-3 ${
        strong ? 'border-emerald-100 bg-emerald-50/60' : 'border-amber-100 bg-amber-50/60'
      }`}
    >
      <Icon
        className={`w-4 h-4 shrink-0 mt-0.5 ${strong ? 'text-emerald-600' : 'text-amber-600'}`}
      />
      <div className="min-w-0">
        <p
          className={`font-body text-[10px] font-semibold uppercase tracking-wide ${
            strong ? 'text-emerald-700' : 'text-amber-700'
          }`}
        >
          {title}
          {items.length > 1 && <span className="normal-case"> ({items.length} aspek seri)</span>}
        </p>
        <p className="font-body text-sm font-semibold text-slate-800 leading-snug mt-0.5">
          {labelList(items)}
        </p>
        <p
          className={`font-body text-xs mt-0.5 ${strong ? 'text-emerald-600' : 'text-amber-600'}`}
        >
          {percentage}%
        </p>
      </div>
    </div>
  )
}
