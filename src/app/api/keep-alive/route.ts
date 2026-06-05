import { NextResponse } from 'next/server'
import { createServerClient } from '@/src/utils/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const supabase = await createServerClient()

  const { error } = await supabase.from('profiles').select('id').limit(1)

  if (error) {
    return NextResponse.json(
      { status: 'error', message: error.message, timestamp: new Date().toISOString() },
      { status: 500 },
    )
  }

  return NextResponse.json(
    { status: 'online', timestamp: new Date().toISOString() },
    { status: 200 },
  )
}
