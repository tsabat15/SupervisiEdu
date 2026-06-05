'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, ClipboardList, Eye, MessageSquare, Star } from 'lucide-react'
import KepsekSidebar from '@/src/components/dashboard/kepsek/KepsekSidebar'

const instruments = [
  {
    id: 'pra',
    phase: 'Pra Konferensi',
    title: 'Instrumen Penilaian RPP / Modul Ajar',
    description:
      'Digunakan sebelum observasi kelas untuk menilai kualitas perencanaan pembelajaran guru. Mencakup kelengkapan, kesesuaian, dan relevansi dokumen perencanaan.',
    icon: MessageSquare,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    phaseBadge: 'bg-blue-100 text-blue-700',
    aspects: [
      {
        no: 1,
        aspect: 'Identitas dan Kelengkapan Dokumen',
        indicator:
          'Memuat identitas lengkap (nama guru, kelas, mata pelajaran, semester, alokasi waktu).',
      },
      {
        no: 2,
        aspect: 'Kesesuaian Tujuan dengan CP/TP',
        indicator:
          'Tujuan pembelajaran selaras dengan Capaian Pembelajaran dan Tujuan Pembelajaran yang ditetapkan.',
      },
      {
        no: 3,
        aspect: 'Relevansi dan Kontekstualisasi Materi',
        indicator:
          'Materi ajar relevan, kontekstual, dan sesuai dengan tingkat perkembangan peserta didik.',
      },
      {
        no: 4,
        aspect: 'Pemilihan Model/Metode Pembelajaran',
        indicator:
          'Model atau metode yang dipilih mendukung ketercapaian tujuan dan berpusat pada peserta didik.',
      },
      {
        no: 5,
        aspect: 'Perencanaan Asesmen',
        indicator:
          'Instrumen asesmen (diagnostik, formatif, sumatif) dirancang dengan jelas dan beragam.',
      },
      {
        no: 6,
        aspect: 'Media dan Sumber Belajar',
        indicator:
          'Media dan sumber belajar yang direncanakan sesuai materi dan mendukung pembelajaran bermakna.',
      },
      {
        no: 7,
        aspect: 'Alokasi Waktu',
        indicator:
          'Pembagian alokasi waktu per kegiatan (pendahuluan, inti, penutup) proporsional dan realistis.',
      },
    ],
  },
  {
    id: 'pengamatan',
    phase: 'Pengamatan Kelas',
    title: 'Instrumen Observasi Pembelajaran',
    description:
      'Digunakan saat observasi kelas berlangsung untuk mengamati secara objektif pelaksanaan proses belajar mengajar guru di dalam kelas.',
    icon: Eye,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    phaseBadge: 'bg-amber-100 text-amber-700',
    aspects: [
      {
        no: 1,
        aspect: 'Kegiatan Pendahuluan',
        indicator:
          'Guru membuka pelajaran dengan apersepsi, motivasi, dan penyampaian tujuan pembelajaran yang jelas.',
      },
      {
        no: 2,
        aspect: 'Penguasaan Materi',
        indicator:
          'Guru menguasai materi dengan baik, menyampaikan secara sistematis, dan memberikan contoh relevan.',
      },
      {
        no: 3,
        aspect: 'Penerapan Model Pembelajaran',
        indicator:
          'Guru menerapkan model/metode sesuai rencana dan kondisi kelas secara efektif dan variatif.',
      },
      {
        no: 4,
        aspect: 'Pelibatan Aktif Peserta Didik',
        indicator:
          'Peserta didik terlibat aktif dalam diskusi, tanya jawab, atau kegiatan pembelajaran lainnya.',
      },
      {
        no: 5,
        aspect: 'Pemanfaatan Media dan Sumber Belajar',
        indicator:
          'Media dan sumber belajar digunakan secara tepat untuk memperjelas dan memperkuat pemahaman.',
      },
      {
        no: 6,
        aspect: 'Pelaksanaan Asesmen Proses',
        indicator:
          'Guru melaksanakan asesmen formatif selama pembelajaran untuk memantau pemahaman peserta didik.',
      },
      {
        no: 7,
        aspect: 'Komunikasi dan Pengelolaan Kelas',
        indicator:
          'Guru berkomunikasi dengan bahasa yang jelas, komunikatif, dan mengelola kelas secara kondusif.',
      },
      {
        no: 8,
        aspect: 'Kegiatan Penutup',
        indicator:
          'Guru mengakhiri pembelajaran dengan refleksi, simpulan, dan informasi tindak lanjut yang jelas.',
      },
    ],
  },
  {
    id: 'pasca',
    phase: 'Pasca Konferensi',
    title: 'Instrumen Pasca Observasi & Refleksi',
    description:
      'Digunakan setelah observasi untuk menggali refleksi guru, memberikan umpan balik konstruktif, dan menyusun rencana tindak lanjut pengembangan profesional.',
    icon: Star,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    phaseBadge: 'bg-emerald-100 text-emerald-700',
    aspects: [
      {
        no: 1,
        aspect: 'Refleksi Proses Pembelajaran',
        indicator:
          'Guru mampu merefleksikan jalannya pembelajaran secara jujur dan kritis berdasarkan fakta.',
      },
      {
        no: 2,
        aspect: 'Identifikasi Keberhasilan',
        indicator:
          'Guru dapat mengidentifikasi aspek-aspek yang berjalan baik beserta alasan keberhasilannya.',
      },
      {
        no: 3,
        aspect: 'Identifikasi Hambatan',
        indicator:
          'Guru mampu mengidentifikasi hambatan atau kelemahan dalam proses pembelajaran secara objektif.',
      },
      {
        no: 4,
        aspect: 'Rencana Tindak Lanjut',
        indicator:
          'Guru merumuskan rencana perbaikan yang konkret, terukur, dan dapat dilaksanakan pada pertemuan berikutnya.',
      },
      {
        no: 5,
        aspect: 'Komitmen Pengembangan Profesional',
        indicator:
          'Guru menunjukkan komitmen untuk terus meningkatkan kompetensi pedagogik dan profesionalnya.',
      },
    ],
  },
]

const SCORE_LABELS = [
  { value: 4, label: 'Sangat Baik', color: 'bg-emerald-100 text-emerald-700' },
  { value: 3, label: 'Baik', color: 'bg-blue-100 text-blue-700' },
  { value: 2, label: 'Cukup', color: 'bg-amber-100 text-amber-700' },
  { value: 1, label: 'Kurang', color: 'bg-red-100 text-red-700' },
]

export default function BankInstrumenPage() {
  const [expanded, setExpanded] = useState<string | null>(null)

  function toggle(id: string) {
    setExpanded((prev) => (prev === id ? null : id))
  }

  return (
    <div className="flex h-screen">
      <KepsekSidebar />

      <div className="flex-1 bg-slate-50 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 pl-16 pr-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <ClipboardList className="w-5 h-5 text-amber-500" />
            <div>
              <h1 className="font-heading text-lg md:text-xl font-bold text-slate-900">
                Bank Instrumen Supervisi
              </h1>
              <p className="font-body text-xs md:text-sm text-slate-500 mt-0.5">
                Instrumen standar Kemendikbud untuk 3 fase supervisi klinis
              </p>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 md:px-8 md:py-8 max-w-4xl mx-auto w-full space-y-4">

          {/* Skala penilaian info */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
            <p className="font-body text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
              Skala Penilaian
            </p>
            <div className="flex flex-wrap gap-2">
              {SCORE_LABELS.map((s) => (
                <span
                  key={s.value}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-xs font-semibold ${s.color}`}
                >
                  <span className="font-bold">{s.value}</span>— {s.label}
                </span>
              ))}
            </div>
          </div>

          {/* Instrument cards */}
          {instruments.map((inst, idx) => {
            const Icon = inst.icon
            const isOpen = expanded === inst.id
            return (
              <div
                key={inst.id}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${
                  isOpen ? inst.border : 'border-slate-200'
                }`}
              >
                {/* Header */}
                <button
                  onClick={() => toggle(inst.id)}
                  className="w-full flex items-center gap-4 px-5 md:px-6 py-5 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className={`w-11 h-11 rounded-xl ${inst.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${inst.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-body text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Format {idx + 1}
                      </span>
                      <span className={`font-body text-[10px] font-semibold px-2 py-0.5 rounded-full ${inst.phaseBadge}`}>
                        {inst.phase}
                      </span>
                    </div>
                    <h2 className="font-heading text-base font-bold text-slate-900 leading-snug">
                      {inst.title}
                    </h2>
                    <p className="font-body text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                      {inst.description}
                    </p>
                  </div>
                  <div className="shrink-0 ml-2">
                    {isOpen
                      ? <ChevronUp className="w-5 h-5 text-slate-400" />
                      : <ChevronDown className="w-5 h-5 text-slate-400" />
                    }
                  </div>
                </button>

                {/* Expanded content */}
                {isOpen && (
                  <div className="border-t border-slate-100 px-5 md:px-6 py-5">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="font-body text-xs font-semibold text-slate-400 text-left pb-3 w-8">No</th>
                            <th className="font-body text-xs font-semibold text-slate-400 text-left pb-3 pr-4">Aspek yang Dinilai</th>
                            <th className="font-body text-xs font-semibold text-slate-400 text-left pb-3 pr-4">Indikator</th>
                            <th className="font-body text-xs font-semibold text-slate-400 text-center pb-3 w-24">Skor (1–4)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {inst.aspects.map((item) => (
                            <tr key={item.no} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 pr-3">
                                <span className="font-body text-xs font-bold text-slate-400">
                                  {item.no}
                                </span>
                              </td>
                              <td className="py-3 pr-4 align-top">
                                <p className="font-body text-sm font-semibold text-slate-800 leading-snug">
                                  {item.aspect}
                                </p>
                              </td>
                              <td className="py-3 pr-4 align-top">
                                <p className="font-body text-xs text-slate-500 leading-relaxed">
                                  {item.indicator}
                                </p>
                              </td>
                              <td className="py-3 text-center align-top">
                                <div className="flex justify-center gap-1 flex-wrap">
                                  {[1, 2, 3, 4].map((s) => (
                                    <span
                                      key={s}
                                      className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center font-body text-xs font-semibold text-slate-400"
                                    >
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-slate-200">
                            <td colSpan={3} className="pt-3 font-body text-xs font-semibold text-slate-600 text-right pr-4">
                              Total Skor
                            </td>
                            <td className="pt-3 text-center">
                              <span className="font-body text-xs font-bold text-[#002147]">
                                — / {inst.aspects.length * 4}
                              </span>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    <p className="font-body text-xs text-slate-400 mt-4 italic">
                      * Gunakan instrumen ini sebagai panduan saat melaksanakan supervisi. Skor diisi pada formulir laporan supervisi.
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </main>
      </div>
    </div>
  )
}
