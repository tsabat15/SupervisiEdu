'use client'

import { useRef, useState } from 'react'
import { FileSpreadsheet, Loader2, Upload, X } from 'lucide-react'
import * as XLSX from 'xlsx'
import { bulkCreateUsers } from '@/src/app/dashboard/admin/pengguna/actions'
import type { UserRole } from '@/src/types/database'

interface Props {
  onClose: () => void
  onSuccess: (message: string) => void
  onError: (message: string) => void
}

interface ParsedRow {
  fullName: string
  nip: string
  role: UserRole
}

const VALID_ROLES: Record<string, UserRole> = {
  guru: 'guru',
  'kepala sekolah': 'kepsek',
  kepala_sekolah: 'kepsek',
  kepsek: 'kepsek',
}

export default function BulkUploadModal({ onClose, onSuccess, onError }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setParseError(null)
    setRows([])

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const workbook = XLSX.read(evt.target?.result, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' })

        const parsed: ParsedRow[] = []
        for (let i = 0; i < raw.length; i++) {
          const row = raw[i]
          const fullName = String(
            row['Nama Lengkap'] ?? row['nama_lengkap'] ?? row['nama'] ?? ''
          ).trim()
          const nip = String(row['NIP'] ?? row['nip'] ?? '').trim()
          const roleRaw = String(
            row['Peran'] ?? row['Role'] ?? row['role'] ?? ''
          )
            .trim()
            .toLowerCase()
          const role = VALID_ROLES[roleRaw]

          if (!fullName || !nip) {
            setParseError(`Baris ${i + 2}: Kolom "Nama Lengkap" dan "NIP" wajib diisi.`)
            setRows([])
            return
          }
          if (!role) {
            setParseError(
              `Baris ${i + 2}: Peran "${row['Peran'] ?? row['Role'] ?? row['role']}" tidak valid. Gunakan: Guru, Kepala Sekolah, atau Pengawas.`
            )
            setRows([])
            return
          }
          parsed.push({ fullName, nip, role })
        }

        if (parsed.length === 0) {
          setParseError('File tidak memiliki baris data yang valid.')
          return
        }
        setRows(parsed)
      } catch {
        setParseError('Gagal membaca file. Pastikan format file adalah .xlsx yang valid.')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  async function handleUpload() {
    if (rows.length === 0) return
    setSubmitting(true)
    const result = await bulkCreateUsers(rows)
    setSubmitting(false)

    if (result.failed === 0) {
      onSuccess(`${result.success} pengguna berhasil ditambahkan.`)
      onClose()
    } else if (result.success > 0) {
      onSuccess(
        `${result.success} berhasil, ${result.failed} gagal. ${result.errors.slice(0, 2).join('; ')}`
      )
      onClose()
    } else {
      onError(`Semua gagal: ${result.errors.slice(0, 2).join('; ')}`)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-heading text-xl font-bold text-slate-900">Upload Excel</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format guide */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
          <p className="font-body text-xs font-semibold text-amber-700 mb-1">Format Kolom Excel:</p>
          <p className="font-body text-xs text-amber-700">
            <span className="font-mono bg-amber-100 px-1 rounded">Nama Lengkap</span>{' '}
            <span className="mx-1">|</span>
            <span className="font-mono bg-amber-100 px-1 rounded">NIP</span>{' '}
            <span className="mx-1">|</span>
            <span className="font-mono bg-amber-100 px-1 rounded">Peran</span>{' '}
            <span className="text-amber-600">(Guru / Kepala Sekolah / Pengawas)</span>
          </p>
        </div>

        {/* Drop zone */}
        <div
          className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-amber-300 hover:bg-amber-50/30 transition-all"
          onClick={() => fileRef.current?.click()}
        >
          <FileSpreadsheet className="w-8 h-8 text-amber-400 mx-auto mb-2" />
          {fileName ? (
            <p className="font-body text-sm font-medium text-slate-700">{fileName}</p>
          ) : (
            <>
              <p className="font-body text-sm font-medium text-slate-600">
                Klik untuk memilih file .xlsx
              </p>
              <p className="font-body text-xs text-slate-400 mt-1">Format: .xlsx / .xls</p>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFile}
            aria-label="Upload file Excel"
            title="Upload file Excel"
            className="hidden"
          />
        </div>

        {parseError && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <p className="font-body text-sm text-red-600">{parseError}</p>
          </div>
        )}

        {rows.length > 0 && (
          <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
            <p className="font-body text-sm font-semibold text-emerald-700 mb-2">
              {rows.length} baris data siap diunggah
            </p>
            <div className="max-h-28 overflow-y-auto space-y-0.5">
              {rows.map((r, i) => (
                <p key={i} className="font-body text-xs text-emerald-600 font-mono">
                  {r.nip} — {r.fullName} ({r.role})
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-lg font-body text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={submitting || rows.length === 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-body text-sm font-semibold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-md shadow-amber-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {submitting
              ? 'Memproses...'
              : rows.length > 0
              ? `Upload (${rows.length} pengguna)`
              : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  )
}