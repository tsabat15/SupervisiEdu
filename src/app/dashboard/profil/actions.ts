'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/src/utils/supabase/server'
import { createAdminClient } from '@/src/utils/supabase/admin'

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
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/guru/profil')
  revalidatePath('/dashboard/kepsek/profil')
  revalidatePath('/dashboard/admin/profil')
  return {}
}

/**
 * Changes the account's login identity (NIP -> internal email) and/or
 * password. Both live in Supabase Auth (auth.users.email), not just the
 * profiles table, so this requires the service-role admin API — a plain
 * `profiles` update would desync the displayed NIP from the actual login
 * credential. Re-verifies the current password first since this can lock
 * the account's real owner out if changed by anyone else with an open session.
 */
export async function updateLoginCredentials(payload: {
  full_name: string
  nip: string
  current_password: string
  new_password?: string
}): Promise<{ error?: string; requiresRelogin?: boolean }> {
  const fullName = payload.full_name.trim()
  const newNip = payload.nip.trim()
  if (!fullName) return { error: 'Nama lengkap wajib diisi.' }
  if (!newNip) return { error: 'NIP wajib diisi.' }
  if (!payload.current_password) return { error: 'Kata sandi saat ini wajib diisi untuk verifikasi.' }
  if (payload.new_password && payload.new_password.length < 8) {
    return { error: 'Kata sandi baru minimal 8 karakter.' }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user || !user.email) return { error: 'Tidak terautentikasi.' }

  // Verify the current password before touching login credentials.
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: payload.current_password,
  })
  if (reauthError) return { error: 'Kata sandi saat ini salah.' }

  const admin = createAdminClient()
  const newEmail = `${newNip}@sistem.lokal`

  if (newEmail !== user.email) {
    const { data: existing } = await admin
      .from('profiles')
      .select('id')
      .eq('nip', newNip)
      .neq('id', user.id)
      .maybeSingle()
    if (existing) return { error: 'NIP tersebut sudah digunakan oleh pengguna lain.' }
  }

  const { error: adminError } = await admin.auth.admin.updateUserById(user.id, {
    email: newEmail,
    email_confirm: true,
    ...(payload.new_password ? { password: payload.new_password } : {}),
  })
  if (adminError) return { error: adminError.message }

  const { error: profileError } = await admin
    .from('profiles')
    .update({
      full_name: fullName,
      nip: newNip,
      email: newEmail,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', user.id)
  if (profileError) return { error: profileError.message }

  revalidatePath('/dashboard/guru/profil')
  revalidatePath('/dashboard/kepsek/profil')
  revalidatePath('/dashboard/admin/profil')
  return { requiresRelogin: true }
}
