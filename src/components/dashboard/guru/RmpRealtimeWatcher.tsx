'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/src/utils/supabase/client'

interface Props {
  rmpId: string
}

export default function RmpRealtimeWatcher({ rmpId }: Props) {
  const router = useRouter()
  const supabase = useRef(createBrowserClient()).current

  useEffect(() => {
    const channel = supabase
      .channel(`rmp-watch:${rmpId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rmp_forms',
          filter: `id=eq.${rmpId}`,
        },
        () => {
          router.refresh()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, rmpId, router])

  return null
}
