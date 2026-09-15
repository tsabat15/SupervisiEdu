import { redirect } from 'next/navigation'
import { createServerClient } from '@/src/utils/supabase/server'
import GururSidebar from '@/src/components/dashboard/guru/GururSidebar'
import PesanListClient, { type PesanListItem } from '@/src/components/dashboard/PesanListClient'

export const dynamic = 'force-dynamic'

export default async function GuruPesanPage() {
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

  if (!profile || (profile.role !== 'guru' && profile.role !== 'admin')) {
    redirect('/dashboard')
  }

  const { data: kepseks } = (await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'kepsek')
    .order('full_name')) as unknown as { data: { id: string; full_name: string }[] | null }

  const kepsekList = kepseks ?? []
  const kepsekIds = kepsekList.map((k) => k.id)

  let convByKepsek = new Map<string, { id: string; updated_at: string }>()
  if (kepsekIds.length > 0) {
    const { data: conversations } = (await supabase
      .from('conversations')
      .select('id, kepsek_id, updated_at')
      .eq('guru_id', user.id)
      .in('kepsek_id', kepsekIds)) as unknown as {
      data: { id: string; kepsek_id: string; updated_at: string }[] | null
    }
    convByKepsek = new Map(
      (conversations ?? []).map((c) => [c.kepsek_id, { id: c.id, updated_at: c.updated_at }]),
    )
  }

  const conversationIds = Array.from(convByKepsek.values()).map((c) => c.id)
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

  const items: PesanListItem[] = kepsekList
    .map((k) => {
      const conv = convByKepsek.get(k.id)
      const last = conv ? lastMessageByConversation.get(conv.id) : undefined
      return {
        id: k.id,
        name: k.full_name,
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
      <GururSidebar />

      <div className="flex-1 bg-slate-50 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 pl-16 pr-4 py-4 md:px-8">
          <h1 className="font-heading text-lg md:text-xl font-bold text-slate-900">Pesan</h1>
          <p className="font-body text-xs md:text-sm text-slate-500 mt-0.5">
            Kirim pesan langsung ke kepala sekolah.
          </p>
        </header>

        <main className="px-4 py-6 md:px-8 md:py-8 max-w-2xl mx-auto w-full">
          <PesanListClient items={items} basePath="/dashboard/guru/pesan" />
        </main>
      </div>
    </div>
  )
}
