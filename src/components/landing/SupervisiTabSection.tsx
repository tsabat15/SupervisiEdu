'use client'

import { useState } from 'react'
import {
  BookOpen,
  Brain,
  Eye,
  Lightbulb,
  Star,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react'

const tabs = [
  { key: 'peran', label: 'Peran' },
  { key: 'keuntungan', label: 'Keuntungan' },
  { key: 'tujuan', label: 'Tujuan' },
  { key: 'manfaat', label: 'Manfaat' },
] as const

type TabKey = (typeof tabs)[number]['key']

const content: Record<TabKey, { icon: React.ElementType; title: string; description: string }[]> = {
  peran: [
    {
      icon: Users,
      title: 'Fasilitator Pemahaman',
      description:
        'Supervisor membantu guru memahami konsep supervisi secara mendalam dan mengklarifikasi pendekatan pembelajaran yang efektif.',
    },
    {
      icon: BookOpen,
      title: 'Pendamping Perencanaan',
      description:
        'Bertindak sebagai mitra strategis dalam merumuskan tujuan pembelajaran yang sesuai kebutuhan siswa dan lingkungan sekolah.',
    },
    {
      icon: Eye,
      title: 'Pengamat & Pemberi Umpan Balik',
      description:
        'Melakukan observasi kelas untuk mengamati proses pembelajaran dan memberikan masukan konstruktif bagi perbaikan guru.',
    },
    {
      icon: Star,
      title: 'Mentor Pengembangan',
      description:
        'Membimbing guru mengembangkan kemampuan memfasilitasi pembelajaran, mengelola kelas, dan menerapkan strategi mengajar yang efektif.',
    },
    {
      icon: Brain,
      title: 'Pendorong Refleksi Diri',
      description:
        'Mendorong guru untuk merefleksikan praktik pembelajaran secara kritis guna mengidentifikasi area pengembangan profesional berkelanjutan.',
    },
  ],
  keuntungan: [
    {
      icon: TrendingUp,
      title: 'Peningkatan Kompetensi Guru',
      description:
        'Guru mendapatkan pengetahuan dan keterampilan baru yang dibutuhkan, meningkatkan kepercayaan diri dalam proses pembelajaran.',
    },
    {
      icon: BookOpen,
      title: 'Kualitas Pembelajaran Meningkat',
      description:
        'Bimbingan supervisor membantu guru memperbaiki pembelajaran yang berpusat pada siswa dan relevan secara kontekstual.',
    },
    {
      icon: Star,
      title: 'Hasil Belajar Siswa Lebih Baik',
      description:
        'Ketika guru lebih kompeten, siswa terlibat dalam pembelajaran bermakna dan mencapai hasil akademik yang lebih optimal.',
    },
    {
      icon: Brain,
      title: 'Pengembangan Profesional Berkelanjutan',
      description:
        'Supervisi bukan kegiatan sesaat, melainkan proses berkelanjutan yang mendukung pertumbuhan karir guru sepanjang hayat.',
    },
    {
      icon: Users,
      title: 'Budaya Kolaborasi',
      description:
        'Mendorong terciptanya budaya kolaborasi antara guru dan pimpinan sekolah dalam mencapai tujuan pembelajaran bersama.',
    },
  ],
  tujuan: [
    {
      icon: Target,
      title: 'Memberikan Umpan Balik Objektif',
      description:
        'Supervisor memberikan evaluasi jujur dan konstruktif tentang kinerja guru di kelas untuk peningkatan yang berkelanjutan.',
    },
    {
      icon: Lightbulb,
      title: 'Mendiagnosis dan Mengatasi Masalah',
      description:
        'Membantu guru mengidentifikasi tantangan mengajar dan menemukan solusi praktis yang sesuai konteks pembelajaran.',
    },
    {
      icon: TrendingUp,
      title: 'Mengembangkan Keterampilan Mengajar',
      description:
        'Membantu guru meningkatkan kemampuan menggunakan berbagai strategi pengajaran yang variatif dan inovatif.',
    },
    {
      icon: Star,
      title: 'Evaluasi Kinerja Terstruktur',
      description:
        'Hasil supervisi klinis menjadi dasar evaluasi kinerja guru yang objektif, terstandar, dan dapat dipertanggungjawabkan.',
    },
    {
      icon: Brain,
      title: 'Membudayakan Pengembangan Profesional',
      description:
        'Mendorong guru untuk terus belajar dan mengembangkan diri secara profesional sepanjang karir pendidikan mereka.',
    },
  ],
  manfaat: [
    {
      icon: BookOpen,
      title: 'Pemahaman Mendalam',
      description:
        'Guru memperoleh wawasan mendalam tentang konsep dan implementasi pembelajaran sesuai kurikulum yang terkini dan relevan.',
    },
    {
      icon: TrendingUp,
      title: 'Desain Pembelajaran Lebih Baik',
      description:
        'Guru meningkatkan kemampuan merancang rencana pembelajaran yang efektif dan melaksanakannya dengan metodologi yang tepat.',
    },
    {
      icon: Users,
      title: 'Fasilitasi Pembelajaran Optimal',
      description:
        'Guru lebih terampil mengelola dinamika kelas, membimbing siswa, dan menciptakan lingkungan pembelajaran yang kolaboratif.',
    },
    {
      icon: Brain,
      title: 'Refleksi Diri yang Kritis',
      description:
        'Guru terdorong untuk introspeksi terhadap praktik mengajar, mengidentifikasi keberhasilan dan area yang perlu diperbaiki.',
    },
    {
      icon: Star,
      title: 'Kualitas Pembelajaran Meningkat',
      description:
        'Hasil akhir adalah peningkatan signifikan kualitas pembelajaran di SMA Negeri 16 Medan secara menyeluruh dan terukur.',
    },
  ],
}

export default function SupervisiTabSection() {
  const [active, setActive] = useState<TabKey>('peran')
  const items = content[active]

  return (
    <section id="fitur" className="bg-white py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="text-center mb-12">
          <p className="font-body text-sm font-semibold text-amber-600 uppercase tracking-widest mb-3">
            Supervisi Klinis
          </p>
          <h2 className="font-heading text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
            Peran, Keuntungan, Tujuan & Manfaat
          </h2>
          <p className="font-body text-slate-500 max-w-2xl mx-auto text-sm leading-relaxed">
            Supervisi klinis yang terstruktur memberikan dampak nyata bagi guru, siswa,
            dan kualitas pendidikan SMA Negeri 16 Medan secara keseluruhan.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActive(tab.key)}
                className={`font-body text-sm font-semibold px-5 py-2.5 rounded-lg transition-all ${
                  active === tab.key
                    ? 'bg-[#002147] text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {items.map((item, i) => {
            const Icon = item.icon
            return (
              <div
                key={item.title}
                className="group bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-amber-300 p-5 transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center mb-4 group-hover:bg-amber-100 transition-colors">
                  <Icon className="w-5 h-5 text-amber-600" />
                </div>
                <span className="font-body text-[10px] font-semibold text-amber-500 uppercase tracking-wider mb-1 block">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="font-heading text-sm font-bold text-slate-900 mb-2 leading-snug">
                  {item.title}
                </h3>
                <p className="font-body text-xs text-slate-500 leading-relaxed">
                  {item.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
