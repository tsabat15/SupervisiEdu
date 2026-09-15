import { redirect } from 'next/navigation'
import { createServerClient } from '@/src/utils/supabase/server'
import KepsekSidebar from '@/src/components/dashboard/kepsek/KepsekSidebar'
import PesanListClient, { type PesanListItem } from '@/src/components/dashboard/PesanListClient'

export const dynamic = 'force-dynamic'

export default async function KepsekPesanPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = (await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()) as unknown as { data: { role: string } | null }

  if (!profile || (profile.role !== 'kepsek' && profile.role !== 'admin')) {
    redirect('/dashboard')
  }

  const { data: gurus } = (await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'guru')
    .order('full_name')) as unknown as { data: { id: string; full_name: string }[] | null }

  const guruList = gurus ?? []
  const guruIds = guruList.map((g) => g.id)

  let convByGuru = new Map<string, { id: string; updated_at: string }>()
  if (guruIds.length > 0) {
    const { data: conversations } = (await supabase
      .from('conversations')
      .select('id, guru_id, updated_at')
      .eq('kepsek_id', user.id)
      .in('guru_id', guruIds)) as unknown as {
      data: { id: string; guru_id: string; updated_at: string }[] | null
    }
    convByGuru = new Map(
      (conversations ?? []).map((c) => [c.guru_id, { id: c.id, updated_at: c.updated_at }]),
    )
  }

  const conversationIds = Array.from(convByGuru.values()).map((c) => c.id)
  let lastMessageByConversation = new Map<string, { body: string; created_at: string }>()
  if (conversationIds.length > 0) {
    const { data: recentMessages } = (await supabase
      .from('messages')
      .select('conversation_id, body, deleted_at, created_at')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false })) as unknown as {
      data: { conversation_id: string; body: string; deleted_at: string | null; created_at: string }[] | null
    }
    for (const m of recentMessages ?? []) {
      if (!lastMessageByConversation.has(m.conversation_id)) {
        lastMessageByConversation.set(m.conversation_id, {
          body: m.deleted_at ? 'Pesan telah dihapus' : m.body,
          created_at: m.created_at,
        })
      }
    }
  }

  const items: PesanListItem[] = guruList
    .map((g) => {
      const conv = convByGuru.get(g.id)
      const last = conv ? lastMessageByConversation.get(conv.id) : undefined
      return {
        id: g.id,
        name: g.full_name,
        lastMessage: last?.body ?? null,
        lastMessageAt: last?.created_at ?? conv?.updated_at ?? null,
      }
    })
    .sort((a, b) => {
      if (!a.lastMessageAt && !b.lastMessageAt) return a.name.localeCompare(b.name)
      if (!a.lastMessageAt) return 1
      if (!b.lastMessageAt) return -1
      return b.lastMessageAt.localeCompare(a.lastMessageAt)
    })

  return (
    <div className="flex h-screen">
      <KepsekSidebar />

      <div className="flex-1 bg-slate-50 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 pl-16 pr-4 py-4 md:px-8">
          <h1 className="font-heading text-lg md:text-xl font-bold text-slate-900">Pesan</h1>
          <p className="font-body text-xs md:text-sm text-slate-500 mt-0.5">
            Kirim pesan langsung ke guru.
          </p>
        </header>

        <main className="px-4 py-6 md:px-8 md:py-8 max-w-2xl mx-auto w-full">
          <PesanListClient items={items} basePath="/dashboard/kepsek/pesan" />
        </main>
      </div>
    </div>
  )
}
