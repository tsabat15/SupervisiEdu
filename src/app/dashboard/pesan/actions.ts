'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/src/utils/supabase/server'
import { createAdminClient } from '@/src/utils/supabase/admin'
import type { Message } from '@/src/types/database'

async function requireUser(): Promise<{ userId?: string; role?: string; error?: string }> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi.' }

  const { data: profile } = (await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()) as unknown as { data: { role: string } | null }

  if (!profile) return { error: 'Profil tidak ditemukan.' }
  return { userId: user.id, role: profile.role }
}

async function resolveConversation(
  userId: string,
  userRole: string,
  counterpartId: string,
): Promise<{ conversationId?: string; guruId?: string; kepsekId?: string; error?: string }> {
  if (userRole !== 'guru' && userRole !== 'kepsek') {
    return { error: 'Hanya guru dan kepala sekolah yang dapat mengirim pesan.' }
  }

  const guruId = userRole === 'guru' ? userId : counterpartId
  const kepsekId = userRole === 'kepsek' ? userId : counterpartId

  const supabase = await createServerClient()

  const { data: existing } = (await supabase
    .from('conversations')
    .select('id')
    .eq('guru_id', guruId)
    .eq('kepsek_id', kepsekId)
    .maybeSingle()) as unknown as { data: { id: string } | null }

  if (existing) return { conversationId: existing.id, guruId, kepsekId }

  const { data: created, error } = (await supabase
    .from('conversations')
    .insert({ guru_id: guruId, kepsek_id: kepsekId } as never)
    .select('id')
    .single()) as unknown as { data: { id: string } | null; error: { message: string } | null }

  if (error || !created) return { error: error?.message ?? 'Gagal membuat percakapan.' }
  return { conversationId: created.id, guruId, kepsekId }
}

export async function sendMessage(
  counterpartId: string,
  body: string,
): Promise<{ conversationId?: string; message?: Message; error?: string }> {
  const { userId, role, error: authErr } = await requireUser()
  if (authErr || !userId || !role) return { error: authErr ?? 'Tidak terautentikasi.' }

  const text = body.trim()
  if (!text) return { error: 'Pesan tidak boleh kosong.' }

  const {
    conversationId,
    guruId,
    kepsekId,
    error: convErr,
  } = await resolveConversation(userId, role, counterpartId)
  if (convErr || !conversationId || !guruId || !kepsekId) {
    return { error: convErr ?? 'Gagal membuka percakapan.' }
  }

  const supabase = await createServerClient()
  const now = new Date().toISOString()

  const { data: insertedMessage, error: msgErr } = (await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: userId,
      body: text,
    } as never)
    .select('*')
    .single()) as unknown as { data: Message | null; error: { message: string } | null }
  if (msgErr || !insertedMessage) return { error: msgErr?.message ?? 'Gagal mengirim pesan.' }

  await supabase
    .from('conversations')
    .update({ updated_at: now } as never)
    .eq('id', conversationId)

  const admin = createAdminClient()
  const { data: senderProfile } = (await admin
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .single()) as unknown as { data: { full_name: string } | null }

  const senderName = senderProfile?.full_name ?? 'Seseorang'
  const recipientId = role === 'guru' ? kepsekId : guruId
  const recipientRole = role === 'guru' ? 'kepsek' : 'guru'

  await admin.from('notifications').insert({
    user_id: recipientId,
    title: 'Pesan baru',
    message: `${senderName} mengirim pesan baru.`,
    link: `/dashboard/${recipientRole}/pesan/${userId}`,
  } as never)

  revalidatePath('/dashboard/guru/pesan')
  revalidatePath('/dashboard/kepsek/pesan')
  return { conversationId, message: insertedMessage }
}

export async function editMessage(messageId: string, body: string): Promise<{ error?: string }> {
  const { userId, error: authErr } = await requireUser()
  if (authErr || !userId) return { error: authErr ?? 'Tidak terautentikasi.' }

  const text = body.trim()
  if (!text) return { error: 'Pesan tidak boleh kosong.' }

  const supabase = await createServerClient()

  const { data: existing } = (await supabase
    .from('messages')
    .select('sender_id, deleted_at')
    .eq('id', messageId)
    .single()) as unknown as { data: { sender_id: string; deleted_at: string | null } | null }

  if (!existing) return { error: 'Pesan tidak ditemukan.' }
  if (existing.sender_id !== userId) return { error: 'Anda hanya dapat mengedit pesan sendiri.' }
  if (existing.deleted_at) return { error: 'Pesan yang sudah dihapus tidak dapat diedit.' }

  const { error } = await supabase
    .from('messages')
    .update({ body: text, edited_at: new Date().toISOString() } as never)
    .eq('id', messageId)

  if (error) return { error: error.message }
  return {}
}

export async function deleteMessage(messageId: string): Promise<{ error?: string }> {
  const { userId, error: authErr } = await requireUser()
  if (authErr || !userId) return { error: authErr ?? 'Tidak terautentikasi.' }

  const supabase = await createServerClient()

  const { data: existing } = (await supabase
    .from('messages')
    .select('sender_id')
    .eq('id', messageId)
    .single()) as unknown as { data: { sender_id: string } | null }

  if (!existing) return { error: 'Pesan tidak ditemukan.' }
  if (existing.sender_id !== userId) return { error: 'Anda hanya dapat menghapus pesan sendiri.' }

  const { error } = await supabase
    .from('messages')
    .update({ deleted_at: new Date().toISOString() } as never)
    .eq('id', messageId)

  if (error) return { error: error.message }
  return {}
}
