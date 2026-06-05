'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Upload, Users } from 'lucide-react'
import type { Profile } from '@/src/types/database'
import AddUserModal from './AddUserModal'
import BulkUploadModal from './BulkUploadModal'
import UserTable from './UserTable'

interface Toast {
  type: 'success' | 'error'
  message: string
}

interface Props {
  users: Profile[]
}

export default function PenggunaClient({ users }: Props) {
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  function handleSuccess(message: string) {
    setToast({ type: 'success', message })
    router.refresh()
  }

  function handleError(message: string) {
    setToast({ type: 'error', message })
  }

  return (
    <>
      <div className="flex-1 bg-slate-50 overflow-y-auto">
        {/* Top bar */}
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 pl-16 pr-4 py-4 md:px-8 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-heading text-lg md:text-xl font-bold text-slate-900">Kelola Pengguna</h1>
            <p className="font-body text-xs md:text-sm text-slate-500 mt-0.5">
              {users.length} pengguna terdaftar
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <button
              type="button"
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center gap-2 px-3 md:px-4 py-2.5 rounded-lg font-body text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-all"
            >
              <Upload className="w-4 h-4" />
              Upload Excel
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-2 px-4 md:px-5 py-2.5 rounded-lg font-body text-sm font-semibold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-md shadow-amber-100 transition-all"
            >
              <Plus className="w-4 h-4" />
              Tambah Pengguna
            </button>
          </div>
        </header>

        {/* Page body */}
        <main className="px-4 py-6 md:px-8 md:py-8">
          <section>
            <div className="flex items-center gap-2 mb-5">
              <Users className="w-5 h-5 text-amber-500" />
              <h2 className="font-heading text-lg font-semibold text-slate-900">Daftar Pengguna</h2>
            </div>
            <UserTable
              users={users}
              onToast={(type, message) => {
                setToast({ type, message })
                if (type === 'success') router.refresh()
              }}
            />
          </section>
        </main>
      </div>

      {showAdd && (
        <AddUserModal
          onClose={() => setShowAdd(false)}
          onSuccess={handleSuccess}
          onError={handleError}
        />
      )}

      {showUpload && (
        <BulkUploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={handleSuccess}
          onError={handleError}
        />
      )}

      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-lg border font-body text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-white border-emerald-200 text-emerald-700'
              : 'bg-white border-red-200 text-red-600'
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full shrink-0 ${
              toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          />
          {toast.message}
        </div>
      )}
    </>
  )
}