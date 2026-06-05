'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/src/utils/supabase/server'

export interface SchoolSettingsPayload {
  school_name: string
  header_line_1: string
  header_line_2: string
  address: string
  phone: string
  email: string
  website: string
  logo_url: string | null
}

export async function updateSchoolSettings(
  payload: SchoolSettingsPayload,
): Promise<{ error?: string }> {
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

  if (!profile || profile.role !== 'admin') {
    return { error: 'Hanya administrator yang dapat mengubah pengaturan sekolah.' }
  }

  const { error } = await supabase
    .from('school_settings')
    .update({
      school_name: payload.school_name.trim(),
      header_line_1: payload.header_line_1.trim(),
      header_line_2: payload.header_line_2.trim(),
      address: payload.address.trim(),
      phone: payload.phone.trim(),
      email: payload.email.trim(),
      website: payload.website.trim(),
      logo_url: payload.logo_url,
    } as never)
    .eq('id', 1)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/admin/pengaturan')
  return {}
}
