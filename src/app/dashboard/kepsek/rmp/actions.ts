'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/src/utils/supabase/server'
import { createAdminClient } from '@/src/utils/supabase/admin'

export type ReviewDecision = 'approved' | 'revision'

export async function reviewRmp(params: {
  id: string
  decision: ReviewDecision
  catatan: string
}): Promise<{ error?: string }> {
  const supabase = await createServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Tidak terautentikasi.' }

  const { data: profile } = (await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()) as unknown as { data: { role: string } | null }

  if (!profile || (profile.role !== 'kepsek' && profile.role !== 'admin')) {
    return { error: 'Hanya kepala sekolah yang dapat meninjau RMP.' }
  }

  const catatan = params.catatan.trim()
  if (params.decision === 'revision' && catatan.length === 0) {
    return { error: 'Catatan wajib diisi saat mengembalikan untuk revisi.' }
  }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('rmp_forms')
    .update({
      status: params.decision,
      catatan_kepsek: catatan || null,
      reviewed_by: user.id,
      reviewed_at: now,
      updated_at: now,
    } as never)
    .eq('id', params.id)

  if (error) return { error: error.message }

  const { data: rmpRow, error: rmpFetchErr } = (await supabase
    .from('rmp_forms')
    .select('guru_id, judul')
    .eq('id', params.id)
    .single()) as unknown as {
    data: { guru_id: string; judul: string } | null
    error: { message?: string } | null
  }

  if (rmpFetchErr) {
    console.error(
      '[reviewRmp] fetch rmp for notif failed:',
      JSON.stringify(rmpFetchErr, Object.getOwnPropertyNames(rmpFetchErr)),
    )
  }

  if (rmpRow) {
    const admin = createAdminClient()
    const judul = (rmpRow.judul ?? '').trim() || 'Tanpa Judul'
    const isApproved = params.decision === 'approved'
    const notifRow = {
      user_id: rmpRow.guru_id,
      title: isApproved ? 'RMP Anda disetujui' : 'RMP Anda perlu direvisi',
      message: isApproved
        ? `Modul "${judul}" telah disetujui oleh kepala sekolah.`
        : `Modul "${judul}" dikembalikan untuk revisi. ${catatan ? 'Lihat catatan untuk detail.' : ''}`.trim(),
      link: '/dashboard/guru/rmp',
    }
    const { error: notifError } = await admin
      .from('notifications')
      .insert(notifRow as never)
    if (notifError) {
      console.error(
        '[reviewRmp] notify guru failed:',
        JSON.stringify(notifError, Object.getOwnPropertyNames(notifError)),
      )
    }
  }

  revalidatePath('/dashboard/kepsek/rmp')
  revalidatePath(`/dashboard/kepsek/rmp/${params.id}`)
  revalidatePath('/dashboard/guru/rmp')
  return {}
}
