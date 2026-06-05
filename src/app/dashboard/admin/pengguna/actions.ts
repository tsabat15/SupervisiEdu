'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/src/utils/supabase/admin'
import type { UserRole } from '@/src/types/database'

export async function createUser(data: {
  fullName: string
  nip: string
  role: UserRole
}): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const nip = data.nip.trim()
  const email = `${nip}@sistem.lokal`

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: nip,
    email_confirm: true,
  })

  if (authError) return { error: authError.message }

  const { error: profileError } = await supabase.from('profiles').insert({
    id: authData.user.id,
    full_name: data.fullName.trim(),
    email,
    role: data.role,
    nip,
  })

  if (profileError) {
    await supabase.auth.admin.deleteUser(authData.user.id)
    return { error: profileError.message }
  }

  revalidatePath('/dashboard/admin/pengguna')
  return {}
}

export async function bulkCreateUsers(
  users: Array<{ fullName: string; nip: string; role: UserRole }>
): Promise<{ success: number; failed: number; errors: string[] }> {
  const result = { success: 0, failed: 0, errors: [] as string[] }

  for (const user of users) {
    const res = await createUser(user)
    if (res.error) {
      result.failed++
      result.errors.push(`${user.nip}: ${res.error}`)
    } else {
      result.success++
    }
  }

  return result
}

export async function deleteUser(userId: string): Promise<{ error?: string }> {
  const supabase = createAdminClient()

  // Delete profile first to satisfy FK constraint if CASCADE is not configured
  await supabase.from('profiles').delete().eq('id', userId)

  const { error } = await supabase.auth.admin.deleteUser(userId)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/admin/pengguna')
  return {}
}