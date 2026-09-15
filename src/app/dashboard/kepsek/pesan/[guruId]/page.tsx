import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createServerClient } from '@/src/utils/supabase/server'
import KepsekSidebar from '@/src/components/dashboard/kepsek/KepsekSidebar'
import PesanThread from '@/src/components/dashboard/PesanThread'
import type { Message } from '@/src/types/database'

export const dynamic = 'force-dynamic'

export default async function KepsekPesanThreadPage({
  params,
}: {
  params: Promise<{ guruId: string }>
}) {
  const { guruId } = await params
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

  const { data: guru } = (await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', guruId)
    .maybeSingle()) as unknown as { data: { full_name: string; role: string } | null }

  if (!guru || guru.role !== 'guru') notFound()

  const { data: conversation } = (await supabase
    .from('conversations')
    .select('id')
    .eq('kepsek_id', user.id)
    .eq('guru_id', guruId)
    .maybeSingle()) as unknown as { data: { id: string } | null }

  let initialMessages: Message[] = []
  if (conversation) {
    const { data: messages } = (await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })) as unknown as { data: Message[] | null }
    initialMessages = messages ?? []
  }

  return (
    <div className="flex h-screen">
      <KepsekSidebar />

      <div className="flex-1 flex flex-col bg-slate-50 min-w-0">
        <div className="pl-16 pr-4 py-2 md:px-8 bg-white border-b border-slate-200">
          <Link
            href="/dashboard/kepsek/pesan"
            className="inline-flex items-center gap-1.5 font-body text-xs font-semibold text-slate-500 hover:text-[#002147] transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Kembali ke Pesan
          </Link>
        </div>

        <div className="flex-1 min-h-0">
          <PesanThread
            conversationId={conversation?.id ?? null}
            currentUserId={user.id}
            counterpartId={guruId}
            counterpartName={guru.full_name}
            initialMessages={initialMessages}
          />
        </div>
      </div>
    </div>
  )
}
