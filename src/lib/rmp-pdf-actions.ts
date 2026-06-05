'use server'

import { createServerClient } from '@/src/utils/supabase/server'
import type { RmpForm, SchoolSettings } from '@/src/types/database'
import type { PersonInfo, RmpDocumentData } from '@/src/components/dashboard/RmpDocument'

export async function getRmpPdfData(
  rmpId: string,
): Promise<{ data?: RmpDocumentData; error?: string }> {
  const supabase = await createServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Tidak terautentikasi.' }

  const { data: rmp, error: rmpError } = (await supabase
    .from('rmp_forms')
    .select('*')
    .eq('id', rmpId)
    .single()) as unknown as {
    data: RmpForm | null
    error: { message?: string } | null
  }

  if (rmpError || !rmp) return { error: 'Modul tidak ditemukan.' }
  if (rmp.status !== 'approved') {
    return { error: 'Hanya RMP yang disetujui yang dapat diunduh sebagai PDF.' }
  }

  const personIds = [rmp.guru_id, rmp.reviewed_by].filter(
    (id): id is string => typeof id === 'string',
  )

  const { data: people } = (await supabase
    .from('profiles')
    .select('id, full_name, nip, signature_url')
    .in('id', personIds)) as unknown as {
    data: { id: string; full_name: string; nip: string | null; signature_url: string | null }[] | null
  }

  const peopleMap = new Map((people ?? []).map((p) => [p.id, p]))
  const emptyPerson: PersonInfo = { full_name: null, nip: null, signature_url: null }

  const guruRow = peopleMap.get(rmp.guru_id)
  const kepsekRow = rmp.reviewed_by ? peopleMap.get(rmp.reviewed_by) : undefined

  const guru: PersonInfo = guruRow
    ? { full_name: guruRow.full_name, nip: guruRow.nip, signature_url: guruRow.signature_url }
    : emptyPerson
  const kepsek: PersonInfo = kepsekRow
    ? { full_name: kepsekRow.full_name, nip: kepsekRow.nip, signature_url: kepsekRow.signature_url }
    : emptyPerson

  const { data: school } = (await supabase
    .from('school_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle()) as unknown as { data: SchoolSettings | null }

  return {
    data: { school, rmp, guru, kepsek },
  }
}
