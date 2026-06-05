'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/src/utils/supabase/server'
import { createAdminClient } from '@/src/utils/supabase/admin'
import type { RmpStatus } from '@/src/types/database'

export interface RmpPayload {
  id?: string | null
  judul: string
  tema: string
  fase: string
  kelas: string
  dimensi_p5: string[]
  elemen_p5: string[]
  aktivitas_pengenalan: string
  aktivitas_kontekstual: string
  aktivitas_aksi: string
  aktivitas_refleksi: string
  asesmen_awal: string
  asesmen_formatif: string
  asesmen_sumatif: string
  status?: RmpStatus
}

export async function upsertRmp(
  payload: RmpPayload
): Promise<{ id?: string; error?: string }> {
  const supabase = await createServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Tidak terautentikasi.' }

  const { id, status = 'draft', ...fields } = payload

  const row = {
    ...(id ? { id } : {}),
    guru_id: user.id,
    ...fields,
    status,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = (await supabase
    .from('rmp_forms')
    .upsert(row as never, { onConflict: 'id' })
    .select('id')
    .single()) as unknown as {
    data: { id: string } | null
    error: { message: string } | null
  }

  if (error || !data) return { error: error?.message ?? 'Gagal menyimpan modul.' }

  if (status === 'submitted') {
    await notifyKepsekOfSubmission({
      rmpId: data.id,
      guruId: user.id,
      judul: payload.judul,
    })
  }

  revalidatePath('/dashboard/guru/rmp')
  return { id: data.id }
}

async function notifyKepsekOfSubmission(args: {
  rmpId: string
  guruId: string
  judul: string
}) {
  const admin = createAdminClient()

  const { data: guru, error: guruErr } = (await admin
    .from('profiles')
    .select('full_name')
    .eq('id', args.guruId)
    .single()) as unknown as {
    data: { full_name: string } | null
    error: { message?: string } | null
  }
  if (guruErr) {
    console.error(
      '[notifyKepsek] fetch guru failed:',
      JSON.stringify(guruErr, Object.getOwnPropertyNames(guruErr)),
    )
  }

  const { data: kepseks, error: kepsekErr } = (await admin
    .from('profiles')
    .select('id')
    .eq('role', 'kepsek')) as unknown as {
    data: { id: string }[] | null
    error: { message?: string } | null
  }
  if (kepsekErr) {
    console.error(
      '[notifyKepsek] fetch kepsek list failed:',
      JSON.stringify(kepsekErr, Object.getOwnPropertyNames(kepsekErr)),
    )
    return
  }

  if (!kepseks || kepseks.length === 0) {
    console.warn('[notifyKepsek] no kepsek user found — skipping notification')
    return
  }

  const guruName = guru?.full_name ?? 'Seorang guru'
  const judul = args.judul.trim() || 'Tanpa Judul'

  const rows = kepseks.map((k) => ({
    user_id: k.id,
    title: 'RMP baru menunggu review',
    message: `${guruName} mengirim modul "${judul}" untuk ditinjau.`,
    link: `/dashboard/kepsek/rmp/${args.rmpId}`,
  }))

  const { error: notifError } = await admin.from('notifications').insert(rows as never)
  if (notifError) {
    console.error(
      '[notifyKepsek] insert failed:',
      JSON.stringify(notifError, Object.getOwnPropertyNames(notifError)),
    )
  }
}

export async function deleteRmp(id: string): Promise<{ error?: string }> {
  const supabase = await createServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Tidak terautentikasi.' }

  const { data: existing, error: fetchError } = (await supabase
    .from('rmp_forms')
    .select('guru_id, status')
    .eq('id', id)
    .single()) as unknown as {
    data: { guru_id: string; status: RmpStatus } | null
    error: { message: string } | null
  }

  if (fetchError || !existing) return { error: 'Modul tidak ditemukan.' }
  if (existing.guru_id !== user.id) return { error: 'Tidak diizinkan menghapus modul milik orang lain.' }
  if (existing.status !== 'draft') return { error: 'Hanya draft yang dapat dihapus.' }

  const { error } = await supabase.from('rmp_forms').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/guru/rmp')
  return {}
}

export async function requestRmpDeletion(
  rmpId: string,
  reason: string,
): Promise<{ error?: string }> {
  const supabase = await createServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Tidak terautentikasi.' }

  const trimmed = reason.trim()
  if (trimmed.length < 5) return { error: 'Alasan minimal 5 karakter.' }

  const { data: rmp } = (await supabase
    .from('rmp_forms')
    .select('guru_id, status')
    .eq('id', rmpId)
    .single()) as unknown as { data: { guru_id: string; status: RmpStatus } | null }

  if (!rmp) return { error: 'Modul tidak ditemukan.' }
  if (rmp.guru_id !== user.id) return { error: 'Bukan modul milik Anda.' }
  if (rmp.status === 'draft') {
    return { error: 'Draft dapat dihapus langsung, tidak perlu permintaan.' }
  }

  const admin = createAdminClient()
  const { data: existing } = (await admin
    .from('rmp_deletion_requests')
    .select('id')
    .eq('rmp_id', rmpId)
    .eq('status', 'pending')
    .maybeSingle()) as unknown as { data: { id: string } | null }

  if (existing) return { error: 'Permintaan hapus untuk modul ini sudah diajukan.' }

  const { error: insertErr } = await admin
    .from('rmp_deletion_requests')
    .insert({
      rmp_id: rmpId,
      guru_id: user.id,
      reason: trimmed,
    } as never)

  if (insertErr) return { error: insertErr.message }

  // Notify admin(s)
  const { data: admins } = (await admin
    .from('profiles')
    .select('id')
    .eq('role', 'admin')) as unknown as { data: { id: string }[] | null }

  if (admins && admins.length > 0) {
    const { data: profile } = (await admin
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()) as unknown as { data: { full_name: string } | null }

    const guruName = profile?.full_name ?? 'Guru'
    const rows = admins.map((a) => ({
      user_id: a.id,
      title: 'Permintaan hapus RMP',
      message: `${guruName} meminta penghapusan modul. Alasan: ${trimmed.slice(0, 80)}${trimmed.length > 80 ? '…' : ''}`,
      link: '/dashboard/admin/rmp',
    }))
    await admin.from('notifications').insert(rows as never)
  }

  revalidatePath('/dashboard/guru/rmp')
  revalidatePath('/dashboard/admin/rmp')
  return {}
}