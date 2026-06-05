import { CheckCircle2 } from 'lucide-react'

const points = [
  'Pemantauan kunjungan kelas secara real-time dan terstruktur',
  'Laporan digital terstandar yang mudah diakses kapan saja',
  'Manajemen jadwal supervisi terintegrasi dalam satu platform',
  'Analisis data berbasis bukti untuk peningkatan mutu berkelanjutan',
]

export default function AboutSection() {
  return (
    <section id="tentang" className="bg-white py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Text */}
          <div>
            <p className="font-body text-sm font-semibold text-amber-600 uppercase tracking-widest mb-3">
              Tentang Platform
            </p>
            <h2 className="font-heading text-3xl lg:text-4xl font-bold text-slate-900 mb-6 leading-snug">
              Platform Digital untuk Supervisi Pendidikan yang Efektif
            </h2>
            <p className="font-body text-slate-600 text-base leading-relaxed mb-4">
              SupervisiEdu adalah sistem manajemen supervisi pendidikan yang dirancang untuk
              membantu kepala sekolah dan pengawas dalam memantau, mengevaluasi, dan
              meningkatkan kualitas proses belajar mengajar secara terstruktur.
            </p>
            <p className="font-body text-slate-600 text-base leading-relaxed mb-8">
              Dengan teknologi berbasis data, setiap keputusan perbaikan didasarkan pada
              fakta lapangan yang akurat — bukan sekadar asumsi.
            </p>
            <ul className="space-y-3">
              {points.map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <span className="font-body text-slate-600 text-sm leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Image */}
          <div className="relative h-80 lg:h-[480px] rounded-2xl overflow-hidden shadow-xl">
            <img
              src="https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=800&q=80"
              alt="Supervisi pendidikan"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent" />

            {/* Floating stat card */}
            <div className="absolute bottom-6 left-6 bg-white rounded-xl p-4 shadow-lg">
              <p className="font-heading text-2xl font-bold text-amber-600">98%</p>
              <p className="font-body text-xs text-slate-500 mt-0.5">Kepuasan pengguna</p>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}