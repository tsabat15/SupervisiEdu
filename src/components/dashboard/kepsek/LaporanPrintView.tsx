import React from 'react'
import type {
  SupervisionReport,
  SchoolSettings,
  SpvcData,
} from '@/src/types/database'
import { SPVC_FORMS, hasSpvcContent, type SpvcColumn } from '@/src/lib/spvc-forms'
import {
  SECTIONS,
  REKAPITULASI,
  MAX_TOTAL,
  getPredikat,
  calcSectionSums,
} from '@/src/lib/laporan-rubrik'

interface Props {
  laporan: SupervisionReport
  teacherName: string
  teacherNip: string | null
  supervisorName: string
  schoolSettings: SchoolSettings | null
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const tdLabel: React.CSSProperties = { padding: '3px 6px', width: '36%', verticalAlign: 'top' }
const tdColon: React.CSSProperties = { padding: '3px 2px', width: '2%', verticalAlign: 'top' }
const tdValue: React.CSSProperties = { padding: '3px 6px', verticalAlign: 'top' }

const thStyle: React.CSSProperties = {
  border: '1px solid #000',
  padding: '5px 6px',
  backgroundColor: '#002147',
  color: '#fff',
  textAlign: 'center',
  fontSize: '10pt',
}

const tdItem: React.CSSProperties = { border: '1px solid #ccc', padding: '4px 6px' }
const tdCheck: React.CSSProperties = { border: '1px solid #ccc', padding: '4px', textAlign: 'center', width: '6%' }
const tdScore: React.CSSProperties = { border: '1px solid #ccc', padding: '4px', textAlign: 'center', width: '8%', fontWeight: 'bold' }

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/** Isi formulir SPVC; SPVC-05 jatuh balik ke catatan lama bila belum diisi ulang. */
function resolveSpvcData(laporan: SupervisionReport, column: SpvcColumn): SpvcData | null {
  const current = laporan[column]
  if (current && Object.keys(current).length > 0) return current

  if (column === 'spvc05') {
    const kekuatan = (laporan.strengths ?? '').trim()
    const kelemahan = (laporan.improvements ?? '').trim()
    if (kekuatan || kelemahan) return { kekuatan, kelemahan }
  }
  return null
}

export default function LaporanPrintView({
  laporan,
  teacherName,
  teacherNip,
  supervisorName,
  schoolSettings,
}: Props) {
  const raw = laporan.observation_scores ?? {}
  const obsScores: Record<string, number> = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [String(k), v]),
  )
  const sectionSums = calcSectionSums(obsScores)
  const totalObsScore = Object.values(sectionSums).reduce((a, b) => a + b, 0)
  const isPelaksanaan = laporan.instrument_type === 'pelaksanaan'

  const nilaiAkhir =
    isPelaksanaan && totalObsScore > 0
      ? Math.round((totalObsScore / MAX_TOTAL) * 10000) / 100
      : laporan.score

  const predikat = nilaiAkhir !== null && nilaiAkhir !== undefined ? getPredikat(nilaiAkhir) : null

  // Formulir SPVC naratif yang terisi, diberi huruf seksi berurutan.
  // Seksi tetap sebelumnya: pelaksanaan = A,B,C,D → lanjut 'E'; lainnya = A,B,C → lanjut 'D'.
  const spvcSections = SPVC_FORMS.map((def) => ({
    def,
    data: resolveSpvcData(laporan, def.column),
  })).filter((s) => hasSpvcContent(s.data))

  const baseIdx = isPelaksanaan ? 4 : 3
  const spvcLettered = spvcSections.map((s, i) => ({ ...s, letter: LETTERS[baseIdx + i] }))
  const sectionLetterRtl = LETTERS[baseIdx + spvcLettered.length]
  const sectionLetterPengesahan = LETTERS[baseIdx + spvcLettered.length + 1]

  const rtlList = Array.isArray(laporan.rtl_items)
    ? laporan.rtl_items.filter((it) => it.masalah || it.aksi || it.target)
    : []
  const legacyRecommendation = (laporan.recommendations ?? '').trim()

  return (
    <div
      style={{
        fontFamily: '"Times New Roman", Times, serif',
        fontSize: '11pt',
        lineHeight: '1.5',
        color: '#000',
        backgroundColor: '#fff',
        padding: '1.5cm 2cm',
        maxWidth: '21cm',
        margin: '0 auto',
        boxSizing: 'border-box',
      }}
    >
      {/* ── Kop Sekolah ───────────────────────────────────────────────────────── */}
      {schoolSettings && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            borderBottom: '3px double #000',
            paddingBottom: '10px',
            marginBottom: '12px',
          }}
        >
          {schoolSettings.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={schoolSettings.logo_url}
              alt="Logo Sekolah"
              style={{ width: 72, height: 72, objectFit: 'contain', flexShrink: 0 }}
            />
          )}
          <div style={{ flex: 1, textAlign: 'center' }}>
            {schoolSettings.header_line_1 && (
              <p style={{ margin: '0', fontSize: '10pt', textTransform: 'uppercase' }}>
                {schoolSettings.header_line_1}
              </p>
            )}
            {schoolSettings.header_line_2 && (
              <p style={{ margin: '0', fontSize: '10pt', textTransform: 'uppercase' }}>
                {schoolSettings.header_line_2}
              </p>
            )}
            <p
              style={{
                margin: '2px 0',
                fontSize: '15pt',
                fontWeight: 'bold',
                textTransform: 'uppercase',
              }}
            >
              {schoolSettings.school_name}
            </p>
            <p style={{ margin: '0', fontSize: '9.5pt' }}>
              {schoolSettings.address}
            </p>
            <p style={{ margin: '0', fontSize: '9.5pt' }}>
              Telp. {schoolSettings.phone}
              {schoolSettings.website ? ` · ${schoolSettings.website}` : ''}
            </p>
          </div>
        </div>
      )}

      {/* ── Judul Dokumen ─────────────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', margin: '14px 0 16px' }}>
        <p
          style={{
            margin: '0',
            fontSize: '13pt',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Lembar Observasi Pembelajaran Guru
        </p>
        <p style={{ margin: '0', fontSize: '10.5pt' }}>Dalam Supervisi Akademik</p>
      </div>

      {/* ── A. Identitas ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '14px' }}>
        <p style={{ fontWeight: 'bold', borderBottom: '1.5px solid #000', marginBottom: '6px', paddingBottom: '2px' }}>
          A. IDENTITAS
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5pt' }}>
          <tbody>
            {[
              ['Nama Guru', teacherName],
              ['NIP', teacherNip ?? '—'],
              ['Mata Pelajaran', laporan.subject],
              ['Kelas / Semester', laporan.class_name],
              ['Hari / Tanggal', formatDate(laporan.visit_date)],
              ['Jam Ke', laporan.jam_ke ?? '—'],
              ['Materi Pembelajaran', laporan.materi ?? '—'],
              ['Nama Supervisor', supervisorName],
            ].map(([label, value]) => (
              <tr key={label}>
                <td style={tdLabel}>{label}</td>
                <td style={tdColon}>:</td>
                <td style={tdValue}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── B. Petunjuk ──────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '14px' }}>
        <p style={{ fontWeight: 'bold', borderBottom: '1.5px solid #000', marginBottom: '6px', paddingBottom: '2px' }}>
          B. PETUNJUK PENGISIAN
        </p>
        <p style={{ margin: '0 0 4px', fontSize: '10pt' }}>
          Berilah tanda (✓) pada kolom skor sesuai hasil pengamatan selama proses pembelajaran berlangsung.
        </p>
        <table style={{ borderCollapse: 'collapse', fontSize: '10pt' }}>
          <tbody>
            <tr>
              {[
                { s: 4, k: 'Sangat Baik' },
                { s: 3, k: 'Baik' },
                { s: 2, k: 'Cukup' },
                { s: 1, k: 'Kurang' },
              ].map(({ s, k }) => (
                <td key={s} style={{ padding: '0 12px 0 0', whiteSpace: 'nowrap' }}>
                  <strong>{s}</strong> = {k}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── C. Instrumen Observasi (pelaksanaan only) ─────────────────────────── */}
      {isPelaksanaan && (
        <div style={{ marginBottom: '14px' }}>
          <p style={{ fontWeight: 'bold', borderBottom: '1.5px solid #000', marginBottom: '6px', paddingBottom: '2px' }}>
            C. INSTRUMEN OBSERVASI PEMBELAJARAN
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: '5%' }}>No</th>
                <th style={{ ...thStyle, textAlign: 'left' }}>Aspek yang Diamati</th>
                <th style={{ ...thStyle, width: '6%' }}>1</th>
                <th style={{ ...thStyle, width: '6%' }}>2</th>
                <th style={{ ...thStyle, width: '6%' }}>3</th>
                <th style={{ ...thStyle, width: '6%' }}>4</th>
                <th style={{ ...thStyle, width: '8%' }}>Skor</th>
              </tr>
            </thead>
            <tbody>
              {SECTIONS.map((section) => (
                <React.Fragment key={section.id}>
                  {/* Main section header */}
                  {section.groupTitle && (
                    <tr key={`gh-${section.id}`}>
                      <td
                        colSpan={7}
                        style={{
                          border: '1px solid #000',
                          padding: '5px 8px',
                          backgroundColor: '#002147',
                          color: '#fff',
                          fontWeight: 'bold',
                          fontSize: '10pt',
                        }}
                      >
                        {section.groupTitle}
                      </td>
                    </tr>
                  )}
                  {/* Subsection header */}
                  {section.subtitle && (
                    <tr key={`sh-${section.id}`}>
                      <td
                        colSpan={7}
                        style={{
                          border: '1px solid #333',
                          padding: '4px 8px',
                          backgroundColor: '#2d4a72',
                          color: '#fff',
                          fontStyle: 'italic',
                          fontSize: '10pt',
                        }}
                      >
                        {section.subtitle}
                      </td>
                    </tr>
                  )}
                  {/* Item rows */}
                  {section.items.map((item, idx) => {
                    const score = obsScores[String(item.no)] ?? 0
                    return (
                      <tr
                        key={item.no}
                        style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fb' }}
                      >
                        <td style={{ ...tdItem, textAlign: 'center' }}>{item.no}</td>
                        <td style={tdItem}>{item.text}</td>
                        {[1, 2, 3, 4].map((col) => (
                          <td key={col} style={tdCheck}>
                            {score === col ? '✓' : ''}
                          </td>
                        ))}
                        <td style={tdScore}>{score > 0 ? score : ''}</td>
                      </tr>
                    )
                  })}
                  {/* Section subtotal */}
                  <tr key={`sub-${section.id}`} style={{ backgroundColor: '#e8edf5' }}>
                    <td
                      colSpan={6}
                      style={{
                        border: '1px solid #ccc',
                        padding: '4px 8px',
                        textAlign: 'right',
                        fontWeight: 'bold',
                        fontSize: '9.5pt',
                      }}
                    >
                      Jumlah Skor{' '}
                      {section.subtitle
                        ? section.subtitle.replace(/^[A-E]\.\s/, '')
                        : section.groupTitle?.replace(/^\d+\.\s/, '')}
                      {' '}= ......
                    </td>
                    <td
                      style={{
                        border: '1px solid #ccc',
                        padding: '4px',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        backgroundColor: '#dbe2f0',
                      }}
                    >
                      {sectionSums[section.id]} / {section.maxScore}
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── D. Rekapitulasi (pelaksanaan only) ───────────────────────────────── */}
      {isPelaksanaan && (
        <div style={{ marginBottom: '14px' }}>
          <p style={{ fontWeight: 'bold', borderBottom: '1.5px solid #000', marginBottom: '6px', paddingBottom: '2px' }}>
            D. REKAPITULASI HASIL PENILAIAN
          </p>

          <table
            style={{ width: '65%', borderCollapse: 'collapse', fontSize: '10pt', marginBottom: '10px' }}
          >
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: 'left', width: '55%' }}>Komponen</th>
                <th style={{ ...thStyle, width: '22%' }}>Skor Maks.</th>
                <th style={{ ...thStyle, width: '23%' }}>Skor Perolehan</th>
              </tr>
            </thead>
            <tbody>
              {REKAPITULASI.map((r, idx) => (
                <tr key={r.key} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fb' }}>
                  <td style={tdItem}>{r.label}</td>
                  <td style={{ ...tdItem, textAlign: 'center' }}>{r.max}</td>
                  <td style={{ ...tdItem, textAlign: 'center', fontWeight: 'bold' }}>
                    {sectionSums[r.key] ?? 0}
                  </td>
                </tr>
              ))}
              <tr
                style={{
                  backgroundColor: '#002147',
                  color: '#fff',
                  fontWeight: 'bold',
                }}
              >
                <td style={{ border: '1px solid #000', padding: '5px 6px' }}>Total</td>
                <td style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'center' }}>
                  {MAX_TOTAL}
                </td>
                <td style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'center', fontSize: '12pt' }}>
                  {totalObsScore}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Nilai Akhir */}
          <div style={{ fontSize: '10.5pt', lineHeight: '1.8' }}>
            <p style={{ margin: '0' }}>
              <strong>Nilai Akhir (NA)</strong> ={' '}
              <span style={{ fontFamily: 'Arial, sans-serif' }}>
                ({totalObsScore} / {MAX_TOTAL}) × 100
              </span>{' '}
              ={' '}
              <strong style={{ fontSize: '13pt' }}>{nilaiAkhir?.toFixed(2) ?? '—'}</strong>
            </p>
            {predikat && (
              <p style={{ margin: '0' }}>
                <strong>Kategori:</strong> {predikat.label} ({predikat.singkat})
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Nilai for non-pelaksanaan ─────────────────────────────────────────── */}
      {!isPelaksanaan && laporan.score !== null && (
        <div style={{ marginBottom: '14px' }}>
          <p style={{ fontWeight: 'bold', borderBottom: '1.5px solid #000', marginBottom: '6px', paddingBottom: '2px' }}>
            C. PENILAIAN
          </p>
          <p style={{ margin: '0', fontSize: '11pt' }}>
            Nilai:{' '}
            <strong style={{ fontSize: '14pt' }}>{laporan.score}</strong>
            {predikat && ` — ${predikat.label} (${predikat.singkat})`}
          </p>
        </div>
      )}

      {/* ── Formulir SPVC naratif (SPVC-04/05/06/09) ──────────────────────────── */}
      {spvcLettered.map(({ def, data, letter }) => (
        <div key={def.column} style={{ marginBottom: '14px' }}>
          <p style={{ fontWeight: 'bold', borderBottom: '1.5px solid #000', marginBottom: '8px', paddingBottom: '2px' }}>
            {letter}. {def.title.toUpperCase()} ({def.code})
          </p>

          {def.fields.map((field) => {
            const content = (data?.[field.key] ?? '').trim()
            if (!content) return null
            return (
              <div key={field.key} style={{ marginBottom: '8px' }}>
                <p style={{ margin: '0 0 2px', fontWeight: 'bold', fontSize: '10.5pt' }}>
                  {field.label}:
                </p>
                <p
                  style={{
                    margin: '0',
                    paddingLeft: '14px',
                    whiteSpace: 'pre-wrap',
                    fontSize: '10.5pt',
                  }}
                >
                  {content}
                </p>
              </div>
            )
          })}
        </div>
      ))}

      {/* ── H. Rencana Tindak Lanjut (RTL) ────────────────────────────────────── */}
      {(rtlList.length > 0 || legacyRecommendation) && (
        <div style={{ marginBottom: '14px' }}>
          <p style={{ fontWeight: 'bold', borderBottom: '1.5px solid #000', marginBottom: '8px', paddingBottom: '2px' }}>
            {sectionLetterRtl}. RENCANA TINDAK LANJUT (RTL)
          </p>

          {rtlList.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: '5%' }}>No</th>
                  <th style={{ ...thStyle, textAlign: 'left' }}>Temuan Masalah</th>
                  <th style={{ ...thStyle, textAlign: 'left' }}>Rencana Aksi / Coaching</th>
                  <th style={{ ...thStyle, width: '20%', textAlign: 'left' }}>Target Waktu</th>
                </tr>
              </thead>
              <tbody>
                {rtlList.map((item, i) => (
                  <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f8f9fb' }}>
                    <td style={{ ...tdItem, textAlign: 'center' }}>{i + 1}</td>
                    <td style={{ ...tdItem, whiteSpace: 'pre-wrap' }}>{item.masalah || '—'}</td>
                    <td style={{ ...tdItem, whiteSpace: 'pre-wrap' }}>{item.aksi || '—'}</td>
                    <td style={{ ...tdItem, whiteSpace: 'pre-wrap' }}>{item.target || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ margin: '0', paddingLeft: '14px', whiteSpace: 'pre-wrap', fontSize: '10.5pt' }}>
              {legacyRecommendation}
            </p>
          )}
        </div>
      )}

      {/* ── I. Pengesahan ─────────────────────────────────────────────────────── */}
      <div style={{ marginTop: '20px' }}>
        <p style={{ fontWeight: 'bold', borderBottom: '1.5px solid #000', marginBottom: '14px', paddingBottom: '2px' }}>
          {sectionLetterPengesahan}. PENGESAHAN
        </p>

        <table style={{ width: '100%', fontSize: '10.5pt', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ textAlign: 'center', verticalAlign: 'top', width: '50%', padding: '0 20px' }}>
                <p style={{ margin: '0 0 4px' }}>Supervisor Akademik,</p>
                {/* Signature space */}
                <div style={{ height: '60px' }} />
                <div
                  style={{
                    borderTop: '1px solid #000',
                    paddingTop: '4px',
                    display: 'inline-block',
                    minWidth: '160px',
                  }}
                >
                  ({supervisorName})
                </div>
              </td>
              <td style={{ textAlign: 'center', verticalAlign: 'top', width: '50%', padding: '0 20px' }}>
                <p style={{ margin: '0 0 4px' }}>Guru yang Disupervisi,</p>
                {/* Signature space */}
                <div style={{ height: '60px' }} />
                <div
                  style={{
                    borderTop: '1px solid #000',
                    paddingTop: '4px',
                    display: 'inline-block',
                    minWidth: '160px',
                  }}
                >
                  ({teacherName})
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
