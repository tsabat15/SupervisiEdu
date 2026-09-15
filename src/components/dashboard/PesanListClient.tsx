'use client'

import Link from 'next/link'
import { MessageCircle } from 'lucide-react'

export interface PesanListItem {
  id: string
  name: string
  lastMessage: string | null
  lastMessageAt: string | null
}

function formatRelative(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  if (isToday) {
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

interface Props {
  items: PesanListItem[]
  basePath: string
}

export default function PesanListClient({ items, basePath }: Props) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 px-6 py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-amber-50 mx-auto flex items-center justify-center mb-4">
          <MessageCircle className="w-6 h-6 text-[#D4AF37]" />
        </div>
        <h2 className="font-heading text-lg font-bold text-slate-800 mb-1">Belum ada kontak</h2>
        <p className="font-body text-sm text-slate-500 max-w-sm mx-auto">
          Belum ada pengguna yang bisa diajak berkirim pesan.
        </p>
      </div>
    )
  }

  return (
    <ul className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={`${basePath}/${item.id}`}
            className="flex items-center gap-3 px-5 md:px-6 py-4 hover:bg-amber-50/40 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-[#002147]/10 flex items-center justify-center shrink-0">
              <span className="font-body text-sm font-bold text-[#002147]">
                {item.name.trim().charAt(0).toUpperCase() || '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-body font-semibold text-slate-900 truncate">{item.name}</p>
              <p className="font-body text-xs text-slate-500 truncate mt-0.5">
                {item.lastMessage || <span className="italic text-slate-400">Belum ada pesan</span>}
              </p>
            </div>
            {item.lastMessageAt && (
              <span className="font-body text-[11px] text-slate-400 shrink-0">
                {formatRelative(item.lastMessageAt)}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  )
}
