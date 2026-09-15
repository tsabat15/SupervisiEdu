'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Loader2, Pencil, Send, Trash2, X } from 'lucide-react'
import { createBrowserClient } from '@/src/utils/supabase/client'
import { sendMessage, editMessage, deleteMessage } from '@/src/app/dashboard/pesan/actions'
import type { Message } from '@/src/types/database'

interface Props {
  conversationId: string | null
  currentUserId: string
  counterpartId: string
  counterpartName: string
  initialMessages: Message[]
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateDivider(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function PesanThread({
  conversationId: initialConversationId,
  currentUserId,
  counterpartId,
  counterpartName,
  initialMessages,
}: Props) {
  const supabase = useRef(createBrowserClient()).current
  const [conversationId, setConversationId] = useState(initialConversationId)
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  useEffect(() => {
    if (!conversationId) return

    const channel = supabase
      .channel(`messages-watch:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const incoming = payload.new as Message
          setMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev
            return [...prev, incoming]
          })
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as Message
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, conversationId])

  function handleSend() {
    const text = draft.trim()
    if (!text) return
    setError(null)
    setDraft('')
    startTransition(async () => {
      const result = await sendMessage(counterpartId, text)
      if (result.error) {
        setError(result.error)
        return
      }
      if (result.conversationId && result.conversationId !== conversationId) {
        setConversationId(result.conversationId)
      }
      if (result.message) {
        const sent = result.message
        setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]))
      }
    })
  }

  function startEdit(m: Message) {
    setEditingId(m.id)
    setEditDraft(m.body)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditDraft('')
  }

  function submitEdit() {
    if (!editingId) return
    const text = editDraft.trim()
    if (!text) return
    const id = editingId
    startTransition(async () => {
      const result = await editMessage(id, text)
      if (result.error) {
        setError(result.error)
        return
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, body: text, edited_at: new Date().toISOString() } : m)),
      )
      setEditingId(null)
      setEditDraft('')
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Hapus pesan ini?')) return
    startTransition(async () => {
      const result = await deleteMessage(id)
      if (result.error) {
        setError(result.error)
        return
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, deleted_at: new Date().toISOString() } : m)),
      )
    })
  }

  let lastDateLabel = ''

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="px-4 md:px-6 py-3 border-b border-slate-200 bg-white">
        <p className="font-heading text-base font-bold text-[#002147]">{counterpartName}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-3">
        {messages.length === 0 && (
          <p className="font-body text-sm text-slate-400 text-center py-10">
            Belum ada pesan. Mulai percakapan di bawah.
          </p>
        )}

        {messages.map((m) => {
          const isMine = m.sender_id === currentUserId
          const dateLabel = formatDateDivider(m.created_at)
          const showDivider = dateLabel !== lastDateLabel
          lastDateLabel = dateLabel
          const isEditing = editingId === m.id
          const isDeleted = !!m.deleted_at

          return (
            <div key={m.id}>
              {showDivider && (
                <div className="flex items-center justify-center my-4">
                  <span className="font-body text-[11px] font-semibold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                    {dateLabel}
                  </span>
                </div>
              )}
              <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`group max-w-[75%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                  {isEditing ? (
                    <div className="w-64 rounded-xl border border-[#002147]/30 bg-white p-2 space-y-2">
                      <textarea
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        disabled={isPending}
                        className="w-full min-h-[60px] rounded-md border border-slate-200 px-2 py-1.5 font-body text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#002147]/20 resize-y"
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={isPending}
                          className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 transition"
                          aria-label="Batal edit"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={submitEdit}
                          disabled={isPending}
                          className="p-1.5 rounded-md text-white bg-[#002147] hover:bg-[#0a3370] transition"
                          aria-label="Simpan edit"
                        >
                          {isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`rounded-xl px-3.5 py-2.5 ${
                        isMine
                          ? 'bg-gradient-to-r from-[#FFC600] to-[#F7A800] text-slate-900'
                          : 'bg-white border border-slate-200 text-slate-800'
                      }`}
                    >
                      {isDeleted ? (
                        <p className="font-body text-sm italic opacity-60">Pesan telah dihapus</p>
                      ) : (
                        <p className="font-body text-sm whitespace-pre-wrap break-words">{m.body}</p>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1 px-1">
                    <span className="font-body text-[10px] text-slate-400">
                      {formatTime(m.created_at)}
                      {m.edited_at && !isDeleted && ' · diedit'}
                    </span>
                    {isMine && !isDeleted && !isEditing && (
                      <span className="hidden group-hover:flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(m)}
                          aria-label="Edit pesan"
                          className="p-1 rounded text-slate-400 hover:text-[#002147] hover:bg-slate-100 transition"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(m.id)}
                          aria-label="Hapus pesan"
                          className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="px-4 md:px-6 py-2 bg-red-50 border-t border-red-200">
          <p className="font-body text-xs text-red-700">{error}</p>
        </div>
      )}

      <div className="px-4 md:px-6 py-3 border-t border-slate-200 bg-white flex items-end gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder="Tulis pesan..."
          rows={1}
          className="flex-1 min-h-[42px] max-h-32 rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-body text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#002147] focus:ring-2 focus:ring-[#002147]/20 focus:outline-none resize-y transition"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={isPending || !draft.trim()}
          className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-white bg-[#002147] hover:bg-[#0a3370] disabled:opacity-40 transition shrink-0"
          aria-label="Kirim pesan"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
