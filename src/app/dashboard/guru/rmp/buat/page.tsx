'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Loader2, Save, Send } from 'lucide-react'
import GururSidebar from '@/src/components/dashboard/guru/GururSidebar'
import { createBrowserClient } from '@/src/utils/supabase/client'
import { upsertRmp } from '../actions'
import type { RmpForm, RmpStatus } from '@/src/types/database'

const TEMA_P5 = [
  'Gaya Hidup Berkelanjutan',
  'Kearifan Lokal',
  'Bhinneka Tunggal Ika',
  'Bangunlah Jiwa dan Raganya',
  'Suara Demokrasi',
  'Berekayasa dan Berteknologi untuk Membangun NKRI',
  'Kewirausahaan',
] as const

const FASE = ['Fase A', 'Fase B', 'Fase C', 'Fase D', 'Fase E', 'Fase F'] as const

const STEPS = [
  { id: 1, label: 'Informasi Umum' },
  { id: 2, label: 'Tujuan Projek' },
  { id: 3, label: 'Alur Aktivitas' },
  { id: 4, label: 'Asesmen' },
  { id: 5, label: 'Pratinjau' },
] as const

interface AktivitasGroup {
  pengenalan: string
  kontekstual: string
  aksi: string
  refleksi: string
}

interface AsesmenGroup {
  formatif: string
  sumatif: string
}

interface RmpState {
  id: string | null
  judul: string
  tema: string
  fase: string
  kelas: string
  dimensi_p5_text: string
  elemen_p5_text: string
  aktivitas: AktivitasGroup
  asesmen: AsesmenGroup
}

const INITIAL: RmpState = {
  id: null,
  judul: '',
  tema: '',
  fase: '',
  kelas: '',
  dimensi_p5_text: '',
  elemen_p5_text: '',
  aktivitas: { pengenalan: '', kontekstual: '', aksi: '', refleksi: '' },
  asesmen: { formatif: '', sumatif: '' },
}

function splitLines(value: string): string[] {
  return value
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

export default function RmpWizardPage() {
  const router = useRouter()
  const supabase = useRef(createBrowserClient()).current

  const [currentStep, setCurrentStep] = useState(1)
  const [state, setState] = useState<RmpState>(INITIAL)
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      const { data } = (await supabase
        .from('rmp_forms')
        .select('*')
        .eq('guru_id', user.id)
        .eq('status', 'draft')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()) as unknown as { data: RmpForm | null }

      if (!cancelled && data) {
        setState({
          id: data.id,
          judul: data.judul ?? '',
          tema: data.tema ?? '',
          fase: data.fase ?? '',
          kelas: data.kelas ?? '',
          dimensi_p5_text: (data.dimensi_p5 ?? []).join('\n'),
          elemen_p5_text: (data.elemen_p5 ?? []).join('\n'),
          aktivitas: {
            pengenalan: data.aktivitas_pengenalan ?? '',
            kontekstual: data.aktivitas_kontekstual ?? '',
            aksi: data.aktivitas_aksi ?? '',
            refleksi: data.aktivitas_refleksi ?? '',
          },
          asesmen: {
            formatif: data.asesmen_formatif ?? '',
            sumatif: data.asesmen_sumatif ?? '',
          },
        })
      }
      if (!cancelled) setLoading(false)
    }
    init()
    return () => {
      cancelled = true
    }
  }, [router, supabase])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  function handleNext() {
    if (currentStep < STEPS.length) setCurrentStep((s) => s + 1)
  }

  function handlePrev() {
    if (currentStep > 1) setCurrentStep((s) => s - 1)
  }

  function saveRMP(status: RmpStatus) {
    startTransition(async () => {
      const result = await upsertRmp({
        id: state.id,
        judul: state.judul,
        tema: state.tema,
        fase: state.fase,
        kelas: state.kelas,
        dimensi_p5: splitLines(state.dimensi_p5_text),
        elemen_p5: splitLines(state.elemen_p5_text),
        aktivitas_pengenalan: state.aktivitas.pengenalan,
        aktivitas_kontekstual: state.aktivitas.kontekstual,
        aktivitas_aksi: state.aktivitas.aksi,
        aktivitas_refleksi: state.aktivitas.refleksi,
        asesmen_awal: '',
        asesmen_formatif: state.asesmen.formatif,
        asesmen_sumatif: state.asesmen.sumatif,
        status,
      })

      if (result.error) {
        setToast({ type: 'error', msg: result.error })
        return
      }

      if (result.id && !state.id) {
        setState((prev) => ({ ...prev, id: result.id ?? null }))
      }

      if (status === 'submitted') {
        setToast({ type: 'success', msg: 'RMP terkirim untuk ditinjau.' })
        setTimeout(() => router.push('/dashboard/guru/rmp'), 800)
      } else {
        setToast({ type: 'success', msg: 'Draft tersimpan.' })
        setTimeout(() => router.push('/dashboard/guru/rmp'), 800)
      }
    })
  }

  return (
    <div className="flex h-screen">
      <GururSidebar />

      <div className="flex-1 bg-slate-50 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 pl-16 pr-4 py-4 md:px-8">
          <Link
            href="/dashboard/guru/rmp"
            className="inline-flex items-center gap-1.5 font-body text-xs font-semibold text-slate-500 hover:text-[#002147] transition mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Kembali ke RMP Saya
          </Link>
          <h1 className="font-heading text-lg md:text-xl font-bold text-slate-900">
            Penyusunan RMP
          </h1>
          <p className="font-body text-xs md:text-sm text-slate-500 mt-0.5 truncate">
            {state.id ? 'Melanjutkan draft yang tersimpan' : 'Rencana Modul Projek baru'}
          </p>
        </header>

        <main className="px-4 py-6 md:px-8 md:py-8">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuat...
            </div>
          ) : (
            <div className="max-w-3xl mx-auto">
              <StepIndicator currentStep={currentStep} />

              <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="px-5 py-4 md:px-7 md:py-5 border-b border-slate-100">
                  <p className="font-body text-[11px] font-semibold tracking-widest text-[#D4AF37] uppercase">
                    Step {currentStep} / {STEPS.length}
                  </p>
                  <h2 className="font-heading text-xl md:text-2xl font-bold text-[#002147] mt-1">
                    {STEPS[currentStep - 1].label}
                  </h2>
                </div>

                <div className="px-5 py-6 md:px-7 md:py-7 space-y-5">
                  {currentStep === 1 && (
                    <Step1
                      judul={state.judul}
                      tema={state.tema}
                      fase={state.fase}
                      kelas={state.kelas}
                      onChange={(patch) => setState((s) => ({ ...s, ...patch }))}
                    />
                  )}
                  {currentStep === 2 && (
                    <Step2
                      dimensi={state.dimensi_p5_text}
                      elemen={state.elemen_p5_text}
                      onChange={(patch) => setState((s) => ({ ...s, ...patch }))}
                    />
                  )}
                  {currentStep === 3 && (
                    <Step3
                      value={state.aktivitas}
                      onChange={(aktivitas) => setState((s) => ({ ...s, aktivitas }))}
                    />
                  )}
                  {currentStep === 4 && (
                    <Step4
                      value={state.asesmen}
                      onChange={(asesmen) => setState((s) => ({ ...s, asesmen }))}
                    />
                  )}
                  {currentStep === 5 && (
                    <Step5Preview state={state} onJumpTo={setCurrentStep} />
                  )}
                </div>

                <div className="px-5 py-4 md:px-7 md:py-5 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={currentStep === 1 || isPending}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-body text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Sebelumnya
                  </button>

                  <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => saveRMP('draft')}
                      disabled={isPending}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-body text-sm font-semibold text-[#D4AF37] border border-[#D4AF37] hover:bg-[#D4AF37]/10 disabled:opacity-50 transition"
                    >
                      {isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Simpan Draft
                    </button>

                    {currentStep < STEPS.length ? (
                      <button
                        type="button"
                        onClick={handleNext}
                        disabled={isPending}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-body text-sm font-semibold text-white bg-[#002147] hover:bg-[#0a3370] disabled:opacity-50 transition shadow-sm"
                      >
                        Selanjutnya
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => saveRMP('submitted')}
                        disabled={isPending}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-body text-sm font-semibold text-[#002147] bg-[#D4AF37] hover:bg-[#E5C158] disabled:opacity-50 transition shadow-md shadow-amber-200/50"
                      >
                        {isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        Kirim untuk Ditinjau
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-lg border font-body text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-white border-emerald-200 text-emerald-700'
              : 'bg-white border-red-200 text-red-600'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          />
          {toast.msg}
        </div>
      )}
    </div>
  )
}

const PROGRESS_WIDTH = ['w-1/5', 'w-2/5', 'w-3/5', 'w-4/5', 'w-full'] as const

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div>
      <div className="hidden sm:flex items-center justify-between mb-3">
        {STEPS.map((s, idx) => {
          const isDone = currentStep > s.id
          const isActive = currentStep === s.id
          return (
            <div key={s.id} className="flex items-center flex-1 last:flex-initial">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-body text-xs font-bold shrink-0 transition ${
                    isDone
                      ? 'bg-[#D4AF37] text-[#002147]'
                      : isActive
                        ? 'bg-[#002147] text-white ring-4 ring-[#002147]/15'
                        : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {isDone ? <Check className="w-4 h-4" /> : s.id}
                </span>
                <span
                  className={`font-body text-xs font-medium truncate ${
                    isActive ? 'text-[#002147]' : isDone ? 'text-slate-700' : 'text-slate-400'
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className="flex-1 h-px bg-slate-200 mx-3" />
              )}
            </div>
          )
        })}
      </div>

      <div className="sm:hidden flex items-center justify-between mb-2">
        <span className="font-body text-xs font-semibold text-[#002147]">
          Langkah {currentStep} dari {STEPS.length}
        </span>
        <span className="font-body text-xs font-medium text-slate-500">
          {STEPS[currentStep - 1].label}
        </span>
      </div>

      <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r from-[#D4AF37] to-[#F0CB5C] transition-all duration-300 ${PROGRESS_WIDTH[currentStep - 1]}`}
        />
      </div>
    </div>
  )
}

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-body text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#002147] focus:ring-2 focus:ring-[#002147]/20 focus:outline-none transition'

const labelClass = 'block font-body text-sm font-semibold text-slate-700 mb-1.5'

function Step1({
  judul,
  tema,
  fase,
  kelas,
  onChange,
}: {
  judul: string
  tema: string
  fase: string
  kelas: string
  onChange: (patch: Partial<RmpState>) => void
}) {
  return (
    <>
      <div>
        <label className={labelClass}>Judul Projek</label>
        <input
          type="text"
          value={judul}
          onChange={(e) => onChange({ judul: e.target.value })}
          placeholder="Contoh: Sampah Jadi Emas"
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Tema P5</label>
          <select
            aria-label="Tema P5"
            value={tema}
            onChange={(e) => onChange({ tema: e.target.value })}
            className={inputClass}
          >
            <option value="">Pilih tema...</option>
            {TEMA_P5.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Fase</label>
          <select
            aria-label="Fase"
            value={fase}
            onChange={(e) => onChange({ fase: e.target.value })}
            className={inputClass}
          >
            <option value="">Pilih fase...</option>
            {FASE.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass}>
          Kelas <span className="font-normal text-slate-400">(opsional)</span>
        </label>
        <input
          type="text"
          value={kelas}
          onChange={(e) => onChange({ kelas: e.target.value })}
          placeholder="Contoh: Kelas 10 IPA 2"
          className={inputClass}
        />
      </div>
    </>
  )
}

const textareaClass = `${inputClass} min-h-[120px] resize-y leading-relaxed`

function Step2({
  dimensi,
  elemen,
  onChange,
}: {
  dimensi: string
  elemen: string
  onChange: (patch: Partial<RmpState>) => void
}) {
  return (
    <>
      <div>
        <label className={labelClass}>Dimensi Profil Pelajar Pancasila</label>
        <textarea
          value={dimensi}
          onChange={(e) => onChange({ dimensi_p5_text: e.target.value })}
          placeholder={'Satu dimensi per baris. Contoh:\nBeriman dan Bertakwa\nBernalar Kritis\nGotong Royong'}
          className={textareaClass}
        />
        <p className="mt-1.5 font-body text-xs text-slate-400">
          Tulis satu dimensi per baris.
        </p>
      </div>
      <div>
        <label className={labelClass}>Elemen yang Disasar</label>
        <textarea
          value={elemen}
          onChange={(e) => onChange({ elemen_p5_text: e.target.value })}
          placeholder={'Satu elemen per baris. Contoh:\nAkhlak kepada alam\nMemperoleh dan memproses informasi\nKolaborasi'}
          className={textareaClass}
        />
        <p className="mt-1.5 font-body text-xs text-slate-400">
          Tulis satu elemen per baris.
        </p>
      </div>
    </>
  )
}

function Step3({
  value,
  onChange,
}: {
  value: AktivitasGroup
  onChange: (next: AktivitasGroup) => void
}) {
  const fields: { key: keyof AktivitasGroup; label: string; hint: string }[] = [
    { key: 'pengenalan', label: 'Tahap Pengenalan', hint: 'Aktivitas memantik kesadaran siswa terhadap isu/tema.' },
    { key: 'kontekstual', label: 'Tahap Kontekstualisasi', hint: 'Riset, observasi, atau eksplorasi konteks lokal.' },
    { key: 'aksi', label: 'Tahap Aksi', hint: 'Tindakan nyata yang dilakukan siswa.' },
    { key: 'refleksi', label: 'Tahap Refleksi', hint: 'Evaluasi proses dan dampak pembelajaran.' },
  ]
  return (
    <>
      {fields.map(({ key, label, hint }) => (
        <div key={key}>
          <label className={labelClass}>{label}</label>
          <textarea
            value={value[key]}
            onChange={(e) => onChange({ ...value, [key]: e.target.value })}
            placeholder={hint}
            className={textareaClass}
          />
        </div>
      ))}
    </>
  )
}

function Step4({
  value,
  onChange,
}: {
  value: AsesmenGroup
  onChange: (next: AsesmenGroup) => void
}) {
  return (
    <>
      <div>
        <label className={labelClass}>Asesmen Formatif</label>
        <textarea
          value={value.formatif}
          onChange={(e) => onChange({ ...value, formatif: e.target.value })}
          placeholder="Asesmen yang dilakukan selama proses projek berlangsung..."
          className={textareaClass}
        />
      </div>
      <div>
        <label className={labelClass}>Asesmen Sumatif</label>
        <textarea
          value={value.sumatif}
          onChange={(e) => onChange({ ...value, sumatif: e.target.value })}
          placeholder="Asesmen di akhir projek untuk mengukur ketercapaian tujuan..."
          className={textareaClass}
        />
      </div>
    </>
  )
}

function PreviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-body text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
        {label}
      </p>
      <p
        className={`font-body text-sm mt-1 whitespace-pre-wrap ${
          value ? 'text-slate-800' : 'italic text-slate-400'
        }`}
      >
        {value || 'Belum diisi'}
      </p>
    </div>
  )
}

function PreviewList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="font-body text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
        {label}
      </p>
      {items.length === 0 ? (
        <p className="font-body text-sm italic text-slate-400 mt-1">Belum diisi</p>
      ) : (
        <ul className="mt-1.5 space-y-1">
          {items.map((it, idx) => (
            <li key={idx} className="flex items-start gap-2 font-body text-sm text-slate-800">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] mt-2 shrink-0" />
              <span>{it}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function PreviewSection({
  title,
  stepId,
  onJumpTo,
  children,
}: {
  title: string
  stepId: number
  onJumpTo: (s: number) => void
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-4 md:px-5 md:py-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading text-base font-bold text-[#002147]">{title}</h3>
        <button
          type="button"
          onClick={() => onJumpTo(stepId)}
          className="font-body text-xs font-semibold text-[#D4AF37] hover:text-[#B8941F] transition"
        >
          Edit
        </button>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function Step5Preview({
  state,
  onJumpTo,
}: {
  state: RmpState
  onJumpTo: (s: number) => void
}) {
  const dimensi = splitLines(state.dimensi_p5_text)
  const elemen = splitLines(state.elemen_p5_text)

  return (
    <>
      <div className="rounded-lg bg-[#002147]/5 border border-[#002147]/15 px-4 py-3">
        <p className="font-body text-sm text-slate-700 leading-relaxed">
          Periksa kembali isi RMP di bawah. Setelah dikirim, status akan berubah menjadi{' '}
          <span className="font-semibold text-[#002147]">Menunggu Review</span> dan tidak dapat
          diedit kecuali kepala sekolah meminta revisi.
        </p>
      </div>

      <PreviewSection title="Informasi Umum" stepId={1} onJumpTo={onJumpTo}>
        <PreviewField label="Judul Projek" value={state.judul} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <PreviewField label="Tema P5" value={state.tema} />
          <PreviewField label="Fase" value={state.fase} />
        </div>
        <PreviewField label="Kelas" value={state.kelas} />
      </PreviewSection>

      <PreviewSection title="Tujuan Projek" stepId={2} onJumpTo={onJumpTo}>
        <PreviewList label="Dimensi Profil Pelajar Pancasila" items={dimensi} />
        <PreviewList label="Elemen yang Disasar" items={elemen} />
      </PreviewSection>

      <PreviewSection title="Alur Aktivitas" stepId={3} onJumpTo={onJumpTo}>
        <PreviewField label="Tahap Pengenalan" value={state.aktivitas.pengenalan} />
        <PreviewField label="Tahap Kontekstualisasi" value={state.aktivitas.kontekstual} />
        <PreviewField label="Tahap Aksi" value={state.aktivitas.aksi} />
        <PreviewField label="Tahap Refleksi" value={state.aktivitas.refleksi} />
      </PreviewSection>

      <PreviewSection title="Asesmen" stepId={4} onJumpTo={onJumpTo}>
        <PreviewField label="Asesmen Formatif" value={state.asesmen.formatif} />
        <PreviewField label="Asesmen Sumatif" value={state.asesmen.sumatif} />
      </PreviewSection>
    </>
  )
}
