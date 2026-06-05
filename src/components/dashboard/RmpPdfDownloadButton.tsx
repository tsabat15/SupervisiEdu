'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { getRmpPdfData } from '@/src/lib/rmp-pdf-actions'
import RmpDocument, { type RmpDocumentData } from './RmpDocument'

interface Props {
  rmpId: string
  judul: string
  variant?: 'pill' | 'icon'
}

export default function RmpPdfDownloadButton({ rmpId, judul, variant = 'pill' }: Props) {
  const [docData, setDocData] = useState<RmpDocumentData | null>(null)
  const [isPending, startTransition] = useTransition()
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const docRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!docData || !docRef.current) return
    let cancelled = false
    const node = docRef.current

    async function run() {
      setGenerating(true)
      try {
        // Wait an extra tick so images get a chance to start loading
        await new Promise((r) => setTimeout(r, 50))
        // Wait for all images inside the doc to finish loading
        const imgs = Array.from(node.querySelectorAll('img'))
        await Promise.all(
          imgs.map(
            (img) =>
              new Promise<void>((resolve) => {
                if (img.complete && img.naturalWidth > 0) return resolve()
                img.addEventListener('load', () => resolve(), { once: true })
                img.addEventListener('error', () => resolve(), { once: true })
              }),
          ),
        )

        const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
          import('html2canvas-pro'),
          import('jspdf'),
        ])

        const canvas = await html2canvas(node, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          width: 794,
          height: node.scrollHeight,
          windowWidth: 794,
          windowHeight: node.scrollHeight,
        })

        if (cancelled) return

        const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true })
        const pageWidth = pdf.internal.pageSize.getWidth()
        const pageHeight = pdf.internal.pageSize.getHeight()
        const imgWidth = pageWidth
        const imgHeight = (canvas.height * imgWidth) / canvas.width

        const imgData = canvas.toDataURL('image/jpeg', 0.92)
        let heightLeft = imgHeight
        let position = 0

        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight

        while (heightLeft > 0) {
          position = heightLeft - imgHeight
          pdf.addPage()
          pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
          heightLeft -= pageHeight
        }

        const safeName =
          (judul || 'RMP').replace(/[^a-zA-Z0-9-_ ]/g, '').trim().slice(0, 80) || 'RMP'
        pdf.save(`${safeName}.pdf`)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Gagal membuat PDF.')
        }
      } finally {
        if (!cancelled) {
          setGenerating(false)
          setDocData(null)
        }
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [docData, judul])

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const result = await getRmpPdfData(rmpId)
      if (result.error || !result.data) {
        setError(result.error ?? 'Data tidak ditemukan.')
        return
      }
      setDocData(result.data)
    })
  }

  const busy = isPending || generating

  const pillClass =
    'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-body text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition whitespace-nowrap'
  const iconClass =
    'inline-flex items-center justify-center p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 transition'

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        title={error ?? 'Unduh PDF Resmi'}
        aria-label="Unduh PDF Resmi"
        className={variant === 'icon' ? iconClass : pillClass}
      >
        {busy ? (
          <Loader2 className={variant === 'icon' ? 'w-4 h-4 animate-spin' : 'w-3.5 h-3.5 animate-spin'} />
        ) : (
          <Download className={variant === 'icon' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
        )}
        {variant === 'pill' && <span>Unduh PDF Resmi</span>}
      </button>

      {docData && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            top: 0,
            left: '-99999px',
            zIndex: -1,
            pointerEvents: 'none',
          }}
        >
          <RmpDocument ref={docRef} data={docData} />
        </div>
      )}
    </>
  )
}
