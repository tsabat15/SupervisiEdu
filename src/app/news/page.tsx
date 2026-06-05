import Link from 'next/link'
import { ArrowLeft, Calendar, Tag } from 'lucide-react'
import Navbar from '@/src/components/landing/Navbar'
import Footer from '@/src/components/landing/Footer'
import DeveloperCard from '@/src/components/DeveloperCard'

const news = [
  {
    image: 'https://sman16medan.com/assets/img/olimpiade.jpg',
    category: 'Prestasi',
    date: '18 November 2024',
    title: 'Tim Olimpiade Matematika Raih Medali Emas',
    excerpt:
      'Siswa SMA Negeri 16 Medan berhasil meraih Medali Emas pada Olimpiade Matematika tingkat Provinsi Sumatera Utara, mengharumkan nama sekolah di kancah kompetisi akademik.',
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
  {
    image: 'https://sman16medan.com/assets/img/classmeeting.jpg',
    category: 'Pengumuman',
    date: '10 November 2024',
    title: 'Informasi PPDB Tahun Ajaran 2025/2026',
    excerpt:
      'Pendaftaran Peserta Didik Baru (PPDB) tahun ajaran 2025/2026 akan dibuka mulai 1 Juni 2025 dengan 4 jalur pendaftaran: Zonasi, Afirmasi, Perpindahan Tugas, dan Prestasi.',
  },
  {
    image: 'https://sman16medan.com/assets/img/perpustakaan.jpg',
    category: 'Kegiatan',
    date: '8 November 2024',
    title: 'Launching Perpustakaan Digital',
    excerpt:
      'Perpustakaan sekolah kini dilengkapi sistem digital dengan koleksi e-book lebih dari 5.000 judul, memudahkan siswa mengakses referensi belajar kapan saja dan di mana saja.',
  },
  {
    image: 'https://sman16medan.com/assets/img/timbasket.jpg',
    category: 'Prestasi',
    date: '5 November 2024',
    title: 'Tim Basket Juara DBL Medan Region',
    excerpt:
      'Tim basket putra SMA Negeri 16 Medan meraih gelar juara pada kompetisi Development Basketball League (DBL) Medan Region 2024, melanjutkan tradisi prestasi olahraga sekolah.',
  },
  {
    image: 'https://sman16medan.com/assets/img/studytour.jpg',
    category: 'Kegiatan',
    date: '2 November 2024',
    title: 'Study Tour Kelas XII ke Destinasi Edukatif',
    excerpt:
      'Siswa kelas XII melakukan study tour ke berbagai destinasi edukatif sebagai bagian dari pengayaan wawasan dan penguatan karakter menjelang kelulusan.',
  },
  {
    image: 'https://sman16medan.com/assets/img/olimpiade.jpg',
    category: 'Pengumuman',
    date: '30 Oktober 2024',
    title: 'Jadwal Ulangan Akhir Semester Ganjil',
    excerpt:
      'Ulangan Akhir Semester (UAS) semester ganjil akan dilaksanakan pada tanggal 15–22 Desember 2024 untuk seluruh kelas. Siswa diharapkan mempersiapkan diri dengan baik.',
  },
  {
    image: 'https://sman16medan.com/assets/img/prestasisiswa.jpg',
    category: 'Prestasi',
    date: '28 Oktober 2024',
    title: 'Lolos OSN Tingkat Nasional',
    excerpt:
      '5 siswa SMA Negeri 16 Medan berhasil lolos ke Olimpiade Sains Nasional (OSN) tingkat nasional pada bidang Matematika, Fisika, dan Kimia — prestasi terbaik dalam sejarah sekolah.',
  },
]

const CATEGORY_COLOR: Record<string, string> = {
  Prestasi: 'bg-amber-50 text-amber-700',
  Kegiatan: 'bg-blue-50 text-blue-700',
  Pengumuman: 'bg-emerald-50 text-emerald-700',
}

export default function NewsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="bg-[#002147] pt-28 pb-16 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-body text-sm text-white/60 hover:text-amber-400 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Beranda
          </Link>
          <p className="font-body text-sm font-semibold text-amber-400 uppercase tracking-widest mb-3">
            Berita & Informasi
          </p>
          <h1 className="font-heading text-3xl lg:text-5xl font-bold text-white mb-4">
            Kabar Terkini SMA Negeri 16 Medan
          </h1>
          <p className="font-body text-white/60 text-base max-w-2xl leading-relaxed">
            Ikuti perkembangan terbaru seputar prestasi, kegiatan, dan pengumuman resmi
            dari SMA Negeri 16 Medan.
          </p>
        </div>
      </section>

      {/* News Grid */}
      <section className="py-16 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {news.map((item) => (
              <article
                key={item.title}
                className="group rounded-xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-lg transition-all bg-white"
              >
                <div className="h-52 overflow-hidden bg-slate-100">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className={`inline-flex items-center gap-1 font-body text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_COLOR[item.category] ?? 'bg-slate-100 text-slate-600'}`}
                    >
                      <Tag className="w-3 h-3" />
                      {item.category}
                    </span>
                    <span className="inline-flex items-center gap-1 font-body text-xs text-slate-400">
                      <Calendar className="w-3 h-3" />
                      {item.date}
                    </span>
                  </div>
                  <h2 className="font-heading text-lg font-bold text-slate-900 mb-2 leading-snug group-hover:text-amber-700 transition-colors">
                    {item.title}
                  </h2>
                  <p className="font-body text-sm text-slate-500 leading-relaxed line-clamp-3">
                    {item.excerpt}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <Footer />
      <DeveloperCard />
    </div>
  )
}
