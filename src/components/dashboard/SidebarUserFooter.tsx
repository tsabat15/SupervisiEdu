'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/src/utils/supabase/client'
import Avatar from '@/src/components/dashboard/Avatar'
import NotificationBell from '@/src/components/NotificationBell'

interface Props {
  roleLabel: string
}

interface MiniProfile {
  full_name: string
  avatar_url: string | null
}

export default function SidebarUserFooter({ roleLabel }: Props) {
  const [profile, setProfile] = useState<MiniProfile | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const supabase = createBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const { data } = (await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single()) as unknown as { data: MiniProfile | null }
      if (!cancelled && data) setProfile(data)
    }
    load()

    function handleAvatarUpdated(e: Event) {
      const detail = (e as CustomEvent<{ avatarUrl: string | null }>).detail
      if (!cancelled) {
        setProfile((prev) => (prev ? { ...prev, avatar_url: detail.avatarUrl } : prev))
      }
    }
    window.addEventListener('avatar-updated', handleAvatarUpdated)

    return () => {
      cancelled = true
      window.removeEventListener('avatar-updated', handleAvatarUpdated)
    }
  }, [])

  if (!profile) return null

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <Avatar name={profile.full_name} avatarUrl={profile.avatar_url} size="sm" />
        <div className="min-w-0">
          <p className="font-body text-xs font-semibold text-white/90 truncate">
            {profile.full_name}
          </p>
          <p className="font-body text-[10px] text-white/40">{roleLabel}</p>
        </div>
      </div>
      <NotificationBell />
    </div>
  )
}
