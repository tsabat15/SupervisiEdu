import { redirect } from 'next/navigation'
import { createServerClient } from '@/src/utils/supabase/server'
import GururSidebar from '@/src/components/dashboard/guru/GururSidebar'
import SignatureUploader from '@/src/components/dashboard/SignatureUploader'
import AvatarInitials from '@/src/components/dashboard/AvatarInitials'
import ProfileEditForm from '@/src/components/dashboard/ProfileEditForm'
import type { Profile } from '@/src/types/database'

export const dynamic = 'force-dynamic'

export default async function GuruProfilPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = (await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()) as unknown as { data: Profile | null }

  if (!profile) redirect('/verify-profile')

  return (
    <div className="flex h-screen">
      <GururSidebar />

      <div className="flex-1 bg-slate-50 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 pl-16 pr-4 py-4 md:px-8">
          <h1 className="font-heading text-lg md:text-xl font-bold text-slate-900">Profil Saya</h1>
          <p className="font-body text-xs md:text-sm text-slate-500 mt-0.5">
            Kelola informasi dan tanda tangan Anda.
          </p>
        </header>

        <main className="px-4 py-6 md:px-8 md:py-8 max-w-3xl mx-auto w-full space-y-5">
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-5 md:px-6 py-4 border-b border-slate-100 flex items-center gap-4">
              <AvatarInitials name={profile.full_name} size="lg" />
              <div>
                <h2 className="font-heading text-base font-bold text-slate-900">
                  {profile.full_name}
                </h2>
                <p className="font-body text-sm text-slate-500">{profile.email}</p>
                <p className="font-body text-xs text-slate-400 mt-0.5">Guru</p>
              </div>
            </div>
            <div className="px-5 md:px-6 py-3 border-b border-slate-100">
              <h3 className="font-heading text-sm font-bold text-[#002147]">Edit Informasi</h3>
            </div>
            <ProfileEditForm initialName={profile.full_name} initialNip={profile.nip} />
          </section>

          <SignatureUploader userId={user.id} initialSignatureUrl={profile.signature_url} />
        </main>
      </div>
    </div>
  )
}
