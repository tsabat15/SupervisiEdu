import { CheckCircle2 } from 'lucide-react'

const points = [
  'Terakreditasi A (Unggul) oleh Badan Akreditasi Nasional',
  'Lebih dari 10.000 alumni yang tersebar di universitas bergengsi',
  'Program peminatan MIPA, IPS, dan Bahasa dengan 20+ ekstrakurikuler',
  'Ratusan prestasi akademik dan non-akademik tingkat provinsi hingga nasional',
]

const stats = [
  { value: '1.080', label: 'Siswa Aktif' },
  { value: '48', label: 'Tenaga Pendidik' },
  { value: '36', label: 'Rombel' },
  { value: '1985', label: 'Tahun Berdiri' },
]

export default function AboutSection() {
  return (
    <section id="tentang" className="bg-white py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Text */}
          <div>
            <p className="font-body text-sm font-semibold text-amber-600 uppercase tracking-widest mb-3">
              Tentang Sekolah
            </p>
            <h2 className="font-heading text-3xl lg:text-4xl font-bold text-slate-900 mb-6 leading-snug">
              SMA Negeri 16 Medan
            </h2>
            <p className="font-body text-slate-600 text-base leading-relaxed mb-4">
              SMA Negeri 16 Medan adalah sekolah menengah atas negeri unggulan yang berkomitmen
              menghasilkan generasi cerdas, berkarakter, dan berprestasi. Berdiri sejak 1985 di
              Medan Marelan, sekolah ini terus berkembang sebagai institusi pendidikan terkemuka
              di Kota Medan.
            </p>
            <p className="font-body text-slate-600 text-base leading-relaxed mb-8 italic border-l-4 border-amber-400 pl-4">
              "Menjadi sekolah menengah atas unggulan yang menghasilkan lulusan berkarakter,
              berprestasi, dan siap bersaing di era global."
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

          {/* Image + Stats */}
          <div>
            <div className="relative h-72 lg:h-96 rounded-2xl overflow-hidden shadow-xl mb-6">
              <img
                src="https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=800&q=80"
                alt="SMA Negeri 16 Medan"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 to-transparent" />
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow">
                <p className="font-body text-xs font-semibold text-amber-600">Akreditasi A</p>
                <p className="font-body text-xs text-slate-500">Unggul — BAN S/M</p>
              </div>
            </div>
            {/* Stats grid */}
            <div className="grid grid-cols-4 gap-3">
              {stats.map(({ value, label }) => (
                <div key={label} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                  <p className="font-heading text-xl font-bold text-[#002147]">{value}</p>
                  <p className="font-body text-[10px] text-slate-500 mt-0.5 leading-tight">{label}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}