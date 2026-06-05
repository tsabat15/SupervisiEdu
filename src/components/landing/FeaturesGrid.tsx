import {
  Award,
  BookOpen,
  Clock,
  Layers,
  Shield,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react'

const features = [
  {
    icon: Users,
    title: 'Multi Peran',
    description:
      'Mendukung peran Kepala Sekolah, Pengawas, dan Guru dalam satu sistem yang terintegrasi.',
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-50',
  },
  {
    icon: TrendingUp,
    title: 'Peningkatan Terukur',
    description:
      'Lacak kemajuan kualitas mengajar guru dari waktu ke waktu dengan metrik yang jelas dan transparan.',
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-50',
  },
  {
    icon: Target,
    title: 'Tujuan Terstruktur',
    description:
      'Tetapkan target peningkatan spesifik untuk setiap guru berdasarkan hasil observasi yang objektif.',
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-50',
  },
  {
    icon: Award,
    title: 'Pengakuan Prestasi',
    description:
      'Dokumentasikan dan rayakan pencapaian guru sebagai motivasi peningkatan kualitas berkelanjutan.',
    iconColor: 'text-purple-600',
    iconBg: 'bg-purple-50',
  },
  {
    icon: Shield,
    title: 'Data Aman',
    description:
      'Keamanan data berlapis dengan enkripsi dan kontrol akses berbasis peran (RLS) yang ketat.',
    iconColor: 'text-red-600',
    iconBg: 'bg-red-50',
  },
  {
    icon: Clock,
    title: 'Efisiensi Waktu',
    description:
      'Kurangi beban administrasi hingga 60% dengan otomatisasi pelaporan dan penjadwalan otomatis.',
    iconColor: 'text-indigo-600',
    iconBg: 'bg-indigo-50',
  },
  {
    icon: BookOpen,
    title: 'Dokumentasi Lengkap',
    description:
      'Arsip digital seluruh dokumen supervisi yang mudah dicari, difilter, dan diakses kapan saja.',
    iconColor: 'text-teal-600',
    iconBg: 'bg-teal-50',
  },
  {
    icon: Layers,
    title: 'Integrasi Mudah',
    description:
      'Terhubung dengan sistem DAPODIK dan platform pendidikan lain melalui API yang terdokumentasi.',
    iconColor: 'text-orange-600',
    iconBg: 'bg-orange-50',
  },
]

export default function FeaturesGrid() {
  return (
    <section id="fitur" className="bg-white py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">

        <div className="text-center mb-16">
          <p className="font-body text-sm font-semibold text-amber-600 uppercase tracking-widest mb-3">
            Fitur Unggulan
          </p>
          <h2 className="font-heading text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
            Semua yang Anda Butuhkan
          </h2>
          <p className="font-body text-slate-500 max-w-2xl mx-auto text-sm leading-relaxed">
            Dirancang khusus memenuhi kebutuhan sistem supervisi pendidikan Indonesia yang
            modern, efisien, dan berbasis data.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="p-6 rounded-xl border border-slate-100 shadow-md hover:shadow-lg transition-shadow bg-white"
              >
                <div
                  className={`w-11 h-11 rounded-lg ${feature.iconBg} flex items-center justify-center mb-4`}
                >
                  <Icon className={`w-5 h-5 ${feature.iconColor}`} />
                </div>
                <h3 className="font-heading text-base font-semibold text-slate-900 mb-2">
                  {feature.title}
                </h3>
                <p className="font-body text-sm text-slate-500 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>

      </div>
    </section>
  )
}