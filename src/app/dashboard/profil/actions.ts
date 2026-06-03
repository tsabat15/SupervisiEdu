'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/src/utils/supabase/server'

export async function updateSignatureUrl(
  signatureUrl: string | null,
): Promise<{ error?: string }> {
  const supabase = await createServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Tidak terautentikasi.' }

  const { error } = await supabase
    .from('profiles')
    .update({
      signature_url: signatureUrl,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/guru/profil')
  revalidatePath('/dashboard/kepsek/profil')
  return {}
}

export async function updateProfile(payload: {
  full_name: string
  nip: string | null
}): Promise<{ error?: string }> {
  if (!payload.full_name.trim()) return { error: 'Nama lengkap wajib diisi.' }

  const supabase = await createServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Tidak terautentikasi.' }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: payload.full_name.trim(),
      nip: payload.nip?.trim() || null,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/guru/profil')
  revalidatePath('/dashboard/kepsek/profil')
  revalidatePath('/dashboard/admin/profil')
  return {}
}
