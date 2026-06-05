import { BarChart2, Eye, MessageCircle, MessageSquare, Star } from 'lucide-react'

const steps = [
  {
    icon: MessageSquare,
    title: 'Pra Konferensi',
    description:
      'Diskusi awal antara supervisor dan guru mengenai rencana pembelajaran yang akan diobservasi.',
  },
  {
    icon: Eye,
    title: 'Observasi Kelas',
    description:
      'Pengamatan langsung proses belajar mengajar di kelas dengan instrumen penilaian terstandar.',
  },
  {
    icon: BarChart2,
    title: 'Analisis & Strategi',
    description:
      'Analisis data hasil observasi untuk merumuskan strategi peningkatan yang tepat sasaran.',
  },
  {
    icon: MessageCircle,
    title: 'Post Konferensi',
    description:
      'Pembahasan hasil observasi bersama guru untuk memberikan umpan balik yang konstruktif.',
  },
  {
    icon: Star,
    title: 'Refleksi',
    description:
      'Evaluasi menyeluruh dan perencanaan tindak lanjut untuk peningkatan kualitas berkelanjutan.',
  },
]

export default function TimelineSection() {
  return (
    <section id="alur" className="bg-slate-50 py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">

        <div className="text-center mb-16">
          <p className="font-body text-sm font-semibold text-amber-600 uppercase tracking-widest mb-3">
            Alur Proses
          </p>
          <h2 className="font-heading text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
            Langkah-langkah Supervisi
          </h2>
          <p className="font-body text-slate-500 max-w-xl mx-auto text-sm leading-relaxed">
            Lima tahap supervisi klinis yang terstruktur untuk memastikan peningkatan mutu
            mengajar yang berkelanjutan dan terukur.
          </p>
        </div>

        {/* Desktop horizontal stepper */}
        <div className="hidden lg:flex items-start">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <div key={step.title} className="flex-1 flex flex-col items-center relative">
                {/* Connector line (right half) */}
                {index < steps.length - 1 && (
                  <div className="absolute top-6 left-1/2 w-full h-0.5 bg-amber-200" />
                )}
                {/* Icon circle */}
                <div className="relative z-10 w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center shadow-md mb-4">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                {/* Step number */}
                <span className="font-body text-xs font-semibold text-amber-600 mb-2">
                  Langkah {index + 1}
                </span>
                {/* Content */}
                <div className="px-3 text-center">
                  <h3 className="font-heading text-sm font-semibold text-slate-900 mb-2">
                    {step.title}
                  </h3>
                  <p className="font-body text-xs text-slate-500 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Mobile vertical stepper */}
        <div className="lg:hidden space-y-0">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <div key={step.title} className="flex gap-5">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center shadow-md shrink-0">
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  {index < steps.length - 1 && (
                    <div className="w-0.5 flex-1 bg-amber-200 my-2" />
                  )}
                </div>
                <div className="pb-8 pt-1">
                  <span className="font-body text-xs font-semibold text-amber-600 block mb-0.5">
                    Langkah {index + 1}
                  </span>
                  <h3 className="font-heading text-base font-semibold text-slate-900 mb-1">
                    {step.title}
                  </h3>
                  <p className="font-body text-sm text-slate-500 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </section>
  )
}