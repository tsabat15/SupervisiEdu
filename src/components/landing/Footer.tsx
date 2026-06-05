import Link from 'next/link'
import { Globe, Mail, MapPin, Phone } from 'lucide-react'

const quickLinks = [
  { label: 'Tentang Platform', href: '#tentang' },
  { label: 'Langkah Supervisi', href: '#alur' },
  { label: 'Fitur Unggulan', href: '#fitur' },
  { label: 'Berita & Update', href: '#berita' },
  { label: 'Demo Video', href: '#demo' },
  { label: 'Masuk / Login', href: '/login' },
]

const contacts = [
  { Icon: MapPin, text: 'Jl. Pendidikan No. 1, Jakarta Pusat, DKI Jakarta 10110' },
  { Icon: Phone, text: '+62 21 1234 5678' },
  { Icon: Mail, text: 'info@supervisi.edu.id' },
  { Icon: Globe, text: 'www.supervisi.edu.id' },
]

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">

          {/* Brand & Contact */}
          <div>
            <p className="font-heading text-xl font-bold text-white mb-2">SupervisiEdu</p>
            <p className="font-body text-sm text-slate-400 leading-relaxed mb-6">
              Platform digital supervisi pendidikan yang membantu meningkatkan kualitas
              belajar mengajar secara terstruktur, transparan, dan berbasis data.
            </p>
            <ul className="space-y-3">
              {contacts.map(({ Icon, text }) => (
                <li key={text} className="flex items-start gap-3">
                  <Icon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span className="font-body text-sm text-slate-400">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-heading text-lg font-semibold text-white mb-6">
              Tautan Cepat
            </h3>
            <ul className="space-y-3">
              {quickLinks.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="font-body text-sm text-slate-400 hover:text-amber-400 transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Google Maps */}
          <div>
            <h3 className="font-heading text-lg font-semibold text-white mb-6">
              Lokasi Kami
            </h3>
            <div className="rounded-xl overflow-hidden h-52 shadow-lg ring-1 ring-slate-700">
              <iframe
                src="https://maps.google.com/maps?q=Jakarta+Pusat,+DKI+Jakarta,+Indonesia&output=embed&z=13"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Lokasi SupervisiEdu di Jakarta Pusat"
              />
            </div>
          </div>

        </div>

        <div className="mt-12 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-body text-xs text-slate-500">
            © 2026 SupervisiEdu. Hak Cipta Dilindungi.
          </p>
          <p className="font-body text-xs text-slate-500">
            Dikembangkan untuk kemajuan pendidikan Indonesia
          </p>
        </div>
      </div>
    </footer>
  )
}