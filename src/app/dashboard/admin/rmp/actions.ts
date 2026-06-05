'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/src/utils/supabase/server'
import { createAdminClient } from '@/src/utils/supabase/admin'

async function requireAdmin(): Promise<{ userId?: string; error?: string }> {
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

  if (!profile || profile.role !== 'admin') {
    return { error: 'Hanya administrator yang dapat melakukan tindakan ini.' }
  }
  return { userId: user.id }
}

export async function adminDeleteRmp(rmpId: string): Promise<{ error?: string }> {
  const { userId, error: authErr } = await requireAdmin()
  if (authErr || !userId) return { error: authErr ?? 'Tidak terautentikasi.' }

  const admin = createAdminClient()

  const { data: rmp } = (await admin
    .from('rmp_forms')
    .select('guru_id, judul')
    .eq('id', rmpId)
    .single()) as unknown as { data: { guru_id: string; judul: string } | null }

  const { error: delErr } = await admin.from('rmp_forms').delete().eq('id', rmpId)
  if (delErr) return { error: delErr.message }

  if (rmp) {
    const judul = (rmp.judul ?? '').trim() || 'Tanpa Judul'
    await admin.from('notifications').insert({
      user_id: rmp.guru_id,
      title: 'Modul RMP dihapus',
      message: `Modul "${judul}" telah dihapus oleh administrator.`,
      link: '/dashboard/guru/rmp',
    } as never)
  }

  revalidatePath('/dashboard/admin/rmp')
  revalidatePath('/dashboard/guru/rmp')
  revalidatePath('/dashboard/kepsek/rmp')
  return {}
}

export async function approveDeletionRequest(
  requestId: string,
): Promise<{ error?: string }> {
  const { userId, error: authErr } = await requireAdmin()
  if (authErr || !userId) return { error: authErr ?? 'Tidak terautentikasi.' }

  const admin = createAdminClient()

  const { data: req } = (await admin
    .from('rmp_deletion_requests')
    .select('rmp_id, guru_id, status')
    .eq('id', requestId)
    .single()) as unknown as {
    data: { rmp_id: string; guru_id: string; status: string } | null
  }

  if (!req) return { error: 'Permintaan tidak ditemukan.' }
  if (req.status !== 'pending') return { error: 'Permintaan sudah ditangani.' }

  const { data: rmp } = (await admin
    .from('rmp_forms')
    .select('judul')
    .eq('id', req.rmp_id)
    .single()) as unknown as { data: { judul: string } | null }

  // Delete the RMP first
  const { error: delErr } = await admin.from('rmp_forms').delete().eq('id', req.rmp_id)
  if (delErr) return { error: delErr.message }

  // Mark request as approved
  const now = new Date().toISOString()
  await admin
    .from('rmp_deletion_requests')
    .update({
      status: 'approved',
      reviewed_by: userId,
      reviewed_at: now,
    } as never)
    .eq('id', requestId)

  // Notify guru
  const judul = (rmp?.judul ?? '').trim() || 'Tanpa Judul'
  await admin.from('notifications').insert({
    user_id: req.guru_id,
    title: 'Permintaan hapus disetujui',
    message: `Modul "${judul}" telah dihapus sesuai permintaan Anda.`,
    link: '/dashboard/guru/rmp',
  } as never)

  revalidatePath('/dashboard/admin/rmp')
  revalidatePath('/dashboard/guru/rmp')
  revalidatePath('/dashboard/kepsek/rmp')
  return {}
}

export async function rejectDeletionRequest(
  requestId: string,
  adminNote: string,
): Promise<{ error?: string }> {
  const { userId, error: authErr } = await requireAdmin()
  if (authErr || !userId) return { error: authErr ?? 'Tidak terautentikasi.' }

  const note = adminNote.trim()
  const admin = createAdminClient()

  const { data: req } = (await admin
    .from('rmp_deletion_requests')
    .select('rmp_id, guru_id, status')
    .eq('id', requestId)
    .single()) as unknown as {
    data: { rmp_id: string; guru_id: string; status: string } | null
  }

  if (!req) return { error: 'Permintaan tidak ditemukan.' }
  if (req.status !== 'pending') return { error: 'Permintaan sudah ditangani.' }

  const { data: rmp } = (await admin
    .from('rmp_forms')
    .select('judul')
    .eq('id', req.rmp_id)
    .single()) as unknown as { data: { judul: string } | null }

  const now = new Date().toISOString()
  const { error: updErr } = await admin
    .from('rmp_deletion_requests')
    .update({
      status: 'rejected',
      admin_note: note || null,
      reviewed_by: userId,
      reviewed_at: now,
    } as never)
    .eq('id', requestId)

  if (updErr) return { error: updErr.message }

  const judul = (rmp?.judul ?? '').trim() || 'Tanpa Judul'
  await admin.from('notifications').insert({
    user_id: req.guru_id,
    title: 'Permintaan hapus ditolak',
    message: note
      ? `Permintaan hapus modul "${judul}" ditolak. Catatan: ${note}`
      : `Permintaan hapus modul "${judul}" ditolak oleh administrator.`,
    link: '/dashboard/guru/rmp',
  } as never)

  revalidatePath('/dashboard/admin/rmp')
  revalidatePath('/dashboard/guru/rmp')
  return {}
}
