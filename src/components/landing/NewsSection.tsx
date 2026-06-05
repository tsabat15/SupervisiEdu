import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

const news = [
  {
    image: 'https://sman16medan.com/assets/img/olimpiade.jpg',
    category: 'Prestasi',
    date: '18 November 2024',
    title: 'Tim Olimpiade Matematika Raih Medali Emas Provinsi',
    excerpt:
      'Siswa SMA Negeri 16 Medan berhasil meraih Medali Emas pada ajang Olimpiade Matematika tingkat Provinsi Sumatera Utara, mengharumkan nama sekolah di kancah kompetisi akademik.',
  },
  {
    image: 'https://sman16medan.com/assets/img/kunjunganindustri.jpg',
    category: 'Kegiatan',
    date: '15 November 2024',
    title: 'Kunjungan Industri ke Perusahaan Teknologi',
    excerpt:
      'Siswa kelas XI program MIPA dan IPS mengikuti kunjungan industri ke perusahaan teknologi terkemuka sebagai bagian dari penguatan wawasan dunia kerja dan industri.',
  },
  {
    image: 'https://sman16medan.com/assets/img/lombadebat.jpg',
    category: 'Prestasi',
    date: '12 November 2024',
    title: 'Juara 1 Lomba Debat Bahasa Inggris',
    excerpt:
      'Tim debat SMA Negeri 16 Medan meraih Juara 1 pada Lomba Debat Bahasa Inggris tingkat kabupaten, membuktikan kualitas pembinaan akademik dan ekstrakurikuler sekolah.',
  },
]

export default function NewsSection() {
  return (
    <section id="berita" className="bg-white py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">

        {/* Header */}
        <div className="flex items-end justify-between mb-12">
          <div>
            <p className="font-body text-sm font-semibold text-amber-600 uppercase tracking-widest mb-3">
              Berita & Update
            </p>
            <h2 className="font-heading text-3xl lg:text-4xl font-bold text-slate-900">
              Informasi Terkini
            </h2>
          </div>
          <Link
            href="/news"
            className="hidden sm:flex items-center gap-2 font-body text-sm font-semibold text-amber-600 border border-amber-500 px-5 py-2.5 rounded-lg hover:bg-amber-500 hover:text-white transition-all"
          >
            Lihat Semua Berita
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {news.map((item) => (
            <article
              key={item.title}
              className="group rounded-xl overflow-hidden border border-slate-100 shadow-md hover:shadow-lg transition-shadow bg-white"
            >
              <div className="h-48 overflow-hidden">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-body text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                    {item.category}
                  </span>
                  <span className="font-body text-xs text-slate-400">{item.date}</span>
                </div>
                <h3 className="font-heading text-lg font-semibold text-slate-900 mb-2 leading-snug">
                  {item.title}
                </h3>
                <p className="font-body text-sm text-slate-500 leading-relaxed mb-4 line-clamp-3">
                  {item.excerpt}
                </p>
                <Link
                  href="/news"
                  className="inline-flex items-center gap-1.5 font-body text-sm font-semibold text-amber-600 hover:text-amber-500 transition-colors"
                >
                  Baca Selengkapnya
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </article>
          ))}
        </div>

        {/* Mobile CTA */}
        <div className="mt-10 sm:hidden text-center">
          <Link
            href="/news"
            className="inline-flex items-center gap-2 font-body text-sm font-semibold text-amber-600 border border-amber-500 px-5 py-2.5 rounded-lg hover:bg-amber-500 hover:text-white transition-all"
          >
            Lihat Semua Berita
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </section>
  )
}