'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Inbox } from 'lucide-react'
import { toast } from 'sonner'
import { createBrowserClient } from '@/src/utils/supabase/client'
import type { AppNotification } from '@/src/types/database'

const FETCH_LIMIT = 20

function formatRelative(value: string): string {
  const diff = Date.now() - new Date(value).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Baru saja'
  if (minutes < 60) return `${minutes} mnt lalu`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} hari lalu`
  return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

export default function NotificationBell() {
  const router = useRouter()
  const supabase = useRef(createBrowserClient()).current
  const [userId, setUserId] = useState<string | null>(null)
  const [items, setItems] = useState<AppNotification[]>([])
  const [open, setOpen] = useState(false)
  const [isShowingToast, setIsShowingToast] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return
      setUserId(data.user?.id ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [supabase])

  useEffect(() => {
    if (!userId) return
    const uid = userId
    let cancelled = false

    async function loadInitial() {
      const { data } = (await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(FETCH_LIMIT)) as unknown as { data: AppNotification[] | null }

      if (!cancelled) setItems(data ?? [])
    }

    loadInitial()

    const channel = supabase
      .channel(`notifications:${uid}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${uid}`,
        },
        (payload) => {
          const next = payload.new as AppNotification
          setIsShowingToast(true)
          setOpen(false)
          toast.success(next.title, {
            description: next.message,
            duration: 4000,
            onAutoClose: () => setIsShowingToast(false),
            onDismiss: () => setIsShowingToast(false),
          })
          setItems((prev) => [next, ...prev].slice(0, FETCH_LIMIT))
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [supabase, userId])

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  if (!userId) return null

  const unread = items.filter((n) => !n.is_read)
  const unreadCount = unread.length

  async function handleClick(n: AppNotification) {
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)))
    setOpen(false)
    void supabase
      .from('notifications')
      .update({ is_read: true } as never)
      .eq('id', n.id)
    if (n.link) router.push(n.link)
  }

  async function markAllRead() {
    if (!userId || unreadCount === 0) return
    const ids = unread.map((n) => n.id)
    setItems((prev) => prev.map((x) => (ids.includes(x.id) ? { ...x, is_read: true } : x)))
    await supabase
      .from('notifications')
      .update({ is_read: true } as never)
      .in('id', ids)
  }

  return (
    <div
      ref={containerRef}
      className={`fixed bottom-4 right-4 z-30 transition-all duration-300 ease-out ${
        isShowingToast
          ? 'opacity-0 scale-90 translate-y-2 pointer-events-none'
          : 'opacity-100 scale-100 translate-y-0'
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={
          unreadCount > 0
            ? `Notifikasi (${unreadCount} belum dibaca)`
            : 'Notifikasi'
        }
        className="relative inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white border border-slate-200 shadow-md text-slate-700 hover:bg-slate-50 hover:border-amber-300 transition"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 bottom-12 w-80 sm:w-96 max-h-[70vh] bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="font-heading text-sm font-bold text-slate-900">Notifikasi</p>
              <p className="font-body text-[11px] text-slate-500">
                {unreadCount > 0
                  ? `${unreadCount} belum dibaca`
                  : 'Semua sudah dibaca'}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="font-body text-[11px] font-semibold text-amber-600 hover:text-amber-700"
              >
                Tandai semua
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <Inbox className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-body text-sm text-slate-500">Belum ada notifikasi.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleClick(n)}
                      className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition ${
                        !n.is_read ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                            n.is_read ? 'bg-transparent' : 'bg-amber-500'
                          }`}
                          aria-hidden="true"
                        />
                        <div className="flex-1 min-w-0">
                          <p
                            className={`font-body text-sm leading-snug ${
                              n.is_read
                                ? 'text-slate-700'
                                : 'font-semibold text-slate-900'
                            }`}
                          >
                            {n.title}
                          </p>
                          {n.message && (
                            <p className="font-body text-xs text-slate-500 mt-0.5 line-clamp-2">
                              {n.message}
                            </p>
                          )}
                          <p className="font-body text-[10px] text-slate-400 mt-1">
                            {formatRelative(n.created_at)}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
