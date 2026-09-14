'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/src/utils/supabase/server'
import { createAdminClient } from '@/src/utils/supabase/admin'
import type { VideoStatus } from '@/src/types/database'

async function requireKepsek(): Promise<{ userId?: string; error?: string }> {
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

  if (!profile || (profile.role !== 'kepsek' && profile.role !== 'admin')) {
    return { error: 'Hanya kepala sekolah yang dapat meninjau video.' }
  }
  return { userId: user.id }
}

export async function reviewVideo(params: {
  id: string
  status: VideoStatus
  kepsek_note: string
}): Promise<{ error?: string }> {
  const { userId, error: authErr } = await requireKepsek()
  if (authErr || !userId) return { error: authErr ?? 'Tidak terautentikasi.' }

  const supabase = await createServerClient()
  const now = new Date().toISOString()
  const catatan = params.kepsek_note.trim()

  const { error } = await supabase
    .from('teaching_videos')
    .update({
      status: params.status,
      kepsek_note: catatan || null,
      reviewed_by: userId,
      reviewed_at: now,
      updated_at: now,
    } as never)
    .eq('id', params.id)

  if (error) return { error: error.message }

  if (params.status === 'sudah_ditinjau') {
    const { data: videoRow } = (await supabase
      .from('teaching_videos')
      .select('teacher_id, title')
      .eq('id', params.id)
      .single()) as unknown as { data: { teacher_id: string; title: string } | null }

    if (videoRow) {
      const admin = createAdminClient()
      await admin.from('notifications').insert({
        user_id: videoRow.teacher_id,
        title: 'Video mengajar Anda sudah ditinjau',
        message: `Video "${videoRow.title}" sudah ditinjau oleh kepala sekolah.`,
        link: `/dashboard/guru/video/${params.id}`,
      } as never)
    }
  }

  revalidatePath('/dashboard/kepsek/video')
  revalidatePath(`/dashboard/kepsek/video/${params.id}`)
  revalidatePath('/dashboard/guru/video')
  revalidatePath(`/dashboard/guru/video/${params.id}`)
  return {}
}
