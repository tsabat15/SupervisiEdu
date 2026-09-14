'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save, Send, Trash2 } from 'lucide-react'
import { createVideo, updateVideo, deleteVideo, type VideoPayload } from '@/src/app/dashboard/guru/video/actions'
import type { TeachingVideo } from '@/src/types/database'

interface JadwalOption {
  id: string
  label: string
}

interface Props {
  mode: 'create' | 'edit'
  initialData?: TeachingVideo
  jadwalOptions: JadwalOption[]
}

export default function VideoForm({ mode, initialData, jadwalOptions }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState(initialData?.title ?? '')
  const [subject, setSubject] = useState(initialData?.subject ?? '')
  const [className, setClassName] = useState(initialData?.class_name ?? '')
  const [videoUrl, setVideoUrl] = useState(initialData?.video_url ?? '')
  const [teacherNote, setTeacherNote] = useState(initialData?.teacher_note ?? '')
  const [scheduleId, setScheduleId] = useState(initialData?.schedule_id ?? '')

  function buildPayload(): VideoPayload {
    return {
      title,
      subject,
      class_name: className,
      video_url: videoUrl,
      teacher_note: teacherNote.trim() || null,
      schedule_id: scheduleId || null,
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      if (mode === 'create') {
        const result = await createVideo(buildPayload())
        if (result.error) {
          setError(result.error)
          return
        }
        router.push('/dashboard/guru/video')
        router.refresh()
      } else {
        if (!initialData?.id) {
          setError('Video tidak ditemukan.')
          return
        }
        const result = await updateVideo({ ...buildPayload(), id: initialData.id })
        if (result.error) {
          setError(result.error)
          return
        }
        router.push('/dashboard/guru/video')
        router.refresh()
      }
    })
  }

  function handleDelete() {
    if (!initialData?.id) return
    if (!confirm('Hapus video ini? Tindakan ini tidak dapat dibatalkan.')) return
    startDeleteTransition(async () => {
      const result = await deleteVideo(initialData.id)
      if (result.error) {
        setError(result.error)
        return
      }
      router.push('/dashboard/guru/video')
      router.refresh()
    })
  }

  const inputCls =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-body text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#002147] focus:ring-2 focus:ring-[#002147]/20 focus:outline-none transition'
  const labelCls = 'block font-body text-sm font-semibold text-slate-700 mb-1.5'
  const textareaCls = `${inputCls} min-h-[100px] resize-y leading-relaxed`

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="font-body text-sm text-red-700">{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="vf-title" className={labelCls}>
          Judul Video <span className="text-red-500">*</span>
        </label>
        <input
          id="vf-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Contoh: Pembelajaran IPA - Fotosintesis"
          required
          className={inputCls}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="vf-subject" className={labelCls}>
            Mata Pelajaran <span className="text-red-500">*</span>
          </label>
          <input
            id="vf-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Contoh: IPA"
            required
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="vf-class" className={labelCls}>
            Kelas <span className="text-red-500">*</span>
          </label>
          <input
            id="vf-class"
            type="text"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            placeholder="Contoh: VII-A"
            required
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label htmlFor="vf-url" className={labelCls}>
          Link Video <span className="text-red-500">*</span>
        </label>
        <input
          id="vf-url"
          type="url"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://youtu.be/... atau https://drive.google.com/..."
          required
          className={inputCls}
        />
        <p className="mt-1.5 font-body text-xs text-slate-400">
          Unggah video ke YouTube (unlisted) atau Google Drive terlebih dahulu, lalu tempel link-nya di sini.
        </p>
      </div>

      {jadwalOptions.length > 0 && (
        <div>
          <label htmlFor="vf-jadwal" className={labelCls}>
            Hubungkan ke Jadwal Supervisi{' '}
            <span className="font-normal text-slate-400">(opsional)</span>
          </label>
          <select
            id="vf-jadwal"
            value={scheduleId}
            onChange={(e) => setScheduleId(e.target.value)}
            className={inputCls}
          >
            <option value="">— Tidak dihubungkan —</option>
            {jadwalOptions.map((j) => (
              <option key={j.id} value={j.id}>
                {j.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="vf-note" className={labelCls}>
          Catatan Pengantar <span className="font-normal text-slate-400">(opsional)</span>
        </label>
        <textarea
          id="vf-note"
          value={teacherNote}
          onChange={(e) => setTeacherNote(e.target.value)}
          placeholder="Konteks singkat tentang video ini untuk kepala sekolah..."
          className={textareaCls}
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2 border-t border-slate-200">
        <button
          type="submit"
          disabled={
            isPending ||
            isDeleting ||
            !title.trim() ||
            !subject.trim() ||
            !className.trim() ||
            !videoUrl.trim()
          }
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-body text-sm font-semibold text-[#002147] bg-gradient-to-r from-[#FFC600] to-[#F7A800] hover:brightness-105 shadow-md shadow-amber-500/20 disabled:opacity-50 transition"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : mode === 'create' ? (
            <Send className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {mode === 'create' ? 'Kirim Video' : 'Simpan Perubahan'}
        </button>

        {mode === 'edit' && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending || isDeleting}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-body text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50 transition"
          >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Hapus Video
          </button>
        )}
      </div>
    </form>
  )
}
