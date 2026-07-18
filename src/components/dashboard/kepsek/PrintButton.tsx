'use client'

import { Printer } from 'lucide-react'

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 font-body text-sm font-semibold hover:bg-slate-50 hover:border-[#002147] transition shadow-sm"
    >
      <Printer className="w-4 h-4" />
      Cetak / Export PDF
    </button>
  )
}
