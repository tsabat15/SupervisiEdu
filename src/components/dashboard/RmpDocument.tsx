'use client'

import { forwardRef, type CSSProperties } from 'react'
import type { RmpForm, SchoolSettings } from '@/src/types/database'

export interface PersonInfo {
  full_name: string | null
  nip: string | null
  signature_url: string | null
}

export interface RmpDocumentData {
  school: SchoolSettings | null
  rmp: RmpForm
  guru: PersonInfo
  kepsek: PersonInfo
}

const FONT_STACK = '"Times New Roman", Times, serif'

const COLORS = {
  ink: '#000000',
  muted: '#444444',
  divider: '#444444',
  cellBg: '#F4F4F4',
}

const styles: Record<string, CSSProperties> = {
  page: {
    width: '794px',
    minHeight: '1123px',
    backgroundColor: '#FFFFFF',
    color: COLORS.ink,
    fontFamily: FONT_STACK,
    fontSize: '12pt',
    lineHeight: 1.4,
    padding: '48px 56px',
    boxSizing: 'border-box',
    textAlign: 'left',
    direction: 'ltr',
  },
  headerTable: {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: '4px',
  },
  headerLogoCell: {
    width: '110px',
    verticalAlign: 'middle',
    padding: 0,
    textAlign: 'center',
  },
  headerTextCell: {
    verticalAlign: 'middle',
    padding: 0,
    textAlign: 'center',
  },
  headerSpacer: {
    width: '110px',
    padding: 0,
  },
  logoImg: {
    maxWidth: '96px',
    maxHeight: '96px',
    objectFit: 'contain',
    display: 'inline-block',
  },
  headerLine1: {
    fontSize: '14pt',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    margin: 0,
  },
  headerLine2: {
    fontSize: '13pt',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    margin: '2px 0 0 0',
  },
  schoolName: {
    fontSize: '16pt',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    margin: '4px 0 0 0',
  },
  schoolMeta: {
    fontSize: '10pt',
    color: COLORS.muted,
    margin: '4px 0 0 0',
  },
  dividerThick: {
    borderBottom: `3px solid ${COLORS.ink}`,
    margin: '8px 0 2px 0',
  },
  dividerThin: {
    borderBottom: `1px solid ${COLORS.ink}`,
    marginBottom: '24px',
  },
  title: {
    textAlign: 'center',
    fontSize: '14pt',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    margin: '0 0 18px 0',
    textDecoration: 'underline',
  },
  contentTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '12pt',
    marginBottom: '12px',
    textAlign: 'left',
  },
  tdLabel: {
    width: '32%',
    border: `1px solid ${COLORS.divider}`,
    padding: '6px 10px',
    backgroundColor: COLORS.cellBg,
    verticalAlign: 'top',
    fontWeight: 700,
    textAlign: 'left',
  },
  tdValue: {
    border: `1px solid ${COLORS.divider}`,
    padding: '6px 10px',
    verticalAlign: 'top',
    whiteSpace: 'pre-wrap',
    textAlign: 'left',
    textAlignLast: 'left',
  },
  sectionTitle: {
    fontSize: '12pt',
    fontWeight: 700,
    margin: '14px 0 6px 0',
    paddingBottom: '4px',
    borderBottom: `1.5px solid ${COLORS.ink}`,
    textAlign: 'left',
  },
  listItem: {
    margin: 0,
    padding: 0,
    lineHeight: 1.35,
  },
  dateLine: {
    textAlign: 'right',
    margin: '28px 0 12px 0',
    fontSize: '12pt',
  },
  signatureTable: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '6px',
  },
  signatureCell: {
    width: '50%',
    verticalAlign: 'top',
    textAlign: 'center',
    padding: '0 12px',
    fontSize: '12pt',
  },
  signatureRole: {
    margin: '0 0 6px 0',
    fontWeight: 400,
  },
  signatureImageBox: {
    height: '96px',
    display: 'block',
    margin: '4px auto',
  },
  signatureImg: {
    maxHeight: '96px',
    maxWidth: '200px',
    objectFit: 'contain',
    display: 'inline-block',
  },
  signaturePlaceholder: {
    display: 'inline-block',
    fontSize: '10pt',
    color: COLORS.muted,
    fontStyle: 'italic',
    lineHeight: '96px',
  },
  signatureName: {
    fontWeight: 700,
    textDecoration: 'underline',
    margin: '4px 0 2px 0',
  },
  signatureNip: {
    color: COLORS.muted,
    fontSize: '11pt',
    margin: 0,
  },
}

function formatLongDate(value: string | null | undefined): string {
  const d = value ? new Date(value) : new Date()
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const RmpDocument = forwardRef<HTMLDivElement, { data: RmpDocumentData }>(function RmpDocument(
  { data },
  ref,
) {
  const { school, rmp, guru, kepsek } = data
  const dimensi = rmp.dimensi_p5 ?? []
  const elemen = rmp.elemen_p5 ?? []

  const headerMeta = [
    school?.address,
    school?.phone ? `Telp: ${school.phone}` : null,
    school?.email,
    school?.website,
  ]
    .filter(Boolean)
    .join(' · ')

  const cityPrefix = (school?.address ?? '').split(',').pop()?.trim() || 'Tempat'
  const dateText = `${cityPrefix}, ${formatLongDate(rmp.reviewed_at ?? rmp.updated_at)}`

  return (
    <div ref={ref} style={styles.page} dir="ltr">
      <table style={styles.headerTable}>
        <tbody>
          <tr>
            <td style={styles.headerLogoCell}>
              {school?.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={school.logo_url}
                  alt="Logo sekolah"
                  style={styles.logoImg}
                  crossOrigin="anonymous"
                />
              ) : null}
            </td>
            <td style={styles.headerTextCell}>
              <p style={styles.headerLine1}>
                {school?.header_line_1 || 'PEMERINTAH'}
              </p>
              <p style={styles.headerLine2}>
                {school?.header_line_2 || 'DINAS PENDIDIKAN'}
              </p>
              <p style={styles.schoolName}>
                {school?.school_name || 'NAMA SEKOLAH'}
              </p>
              {headerMeta && <p style={styles.schoolMeta}>{headerMeta}</p>}
            </td>
            <td style={styles.headerSpacer} />
          </tr>
        </tbody>
      </table>

      <div style={styles.dividerThick} />
      <div style={styles.dividerThin} />

      <p style={styles.title}>Rencana Modul Projek Profil Pelajar Pancasila</p>

      <table style={styles.contentTable}>
        <tbody>
          <tr>
            <td style={styles.tdLabel}>Judul Projek</td>
            <td style={styles.tdValue}>{rmp.judul || '-'}</td>
          </tr>
          <tr>
            <td style={styles.tdLabel}>Tema</td>
            <td style={styles.tdValue}>{rmp.tema || '-'}</td>
          </tr>
          <tr>
            <td style={styles.tdLabel}>Fase</td>
            <td style={styles.tdValue}>{rmp.fase || '-'}</td>
          </tr>
          <tr>
            <td style={styles.tdLabel}>Kelas</td>
            <td style={styles.tdValue}>{rmp.kelas || '-'}</td>
          </tr>
        </tbody>
      </table>

      <p style={styles.sectionTitle}>Tujuan Projek</p>
      <table style={styles.contentTable}>
        <tbody>
          <tr>
            <td style={styles.tdLabel}>Dimensi P5</td>
            <td style={styles.tdValue}>
              {dimensi.length > 0
                ? dimensi.map((d, i) => (
                    <div key={i} style={styles.listItem}>
                      {d}
                    </div>
                  ))
                : '-'}
            </td>
          </tr>
          <tr>
            <td style={styles.tdLabel}>Elemen yang Disasar</td>
            <td style={styles.tdValue}>
              {elemen.length > 0
                ? elemen.map((e, i) => (
                    <div key={i} style={styles.listItem}>
                      {e}
                    </div>
                  ))
                : '-'}
            </td>
          </tr>
        </tbody>
      </table>

      <p style={styles.sectionTitle}>Alur Aktivitas</p>
      <table style={styles.contentTable}>
        <tbody>
          <tr>
            <td style={styles.tdLabel}>Tahap Pengenalan</td>
            <td style={styles.tdValue}>{rmp.aktivitas_pengenalan || '-'}</td>
          </tr>
          <tr>
            <td style={styles.tdLabel}>Tahap Kontekstualisasi</td>
            <td style={styles.tdValue}>{rmp.aktivitas_kontekstual || '-'}</td>
          </tr>
          <tr>
            <td style={styles.tdLabel}>Tahap Aksi</td>
            <td style={styles.tdValue}>{rmp.aktivitas_aksi || '-'}</td>
          </tr>
          <tr>
            <td style={styles.tdLabel}>Tahap Refleksi</td>
            <td style={styles.tdValue}>{rmp.aktivitas_refleksi || '-'}</td>
          </tr>
        </tbody>
      </table>

      <p style={styles.sectionTitle}>Asesmen</p>
      <table style={styles.contentTable}>
        <tbody>
          {rmp.asesmen_awal ? (
            <tr>
              <td style={styles.tdLabel}>Asesmen Awal</td>
              <td style={styles.tdValue}>{rmp.asesmen_awal}</td>
            </tr>
          ) : null}
          <tr>
            <td style={styles.tdLabel}>Asesmen Formatif</td>
            <td style={styles.tdValue}>{rmp.asesmen_formatif || '-'}</td>
          </tr>
          <tr>
            <td style={styles.tdLabel}>Asesmen Sumatif</td>
            <td style={styles.tdValue}>{rmp.asesmen_sumatif || '-'}</td>
          </tr>
        </tbody>
      </table>

      <p style={styles.dateLine}>{dateText}</p>

      <table style={styles.signatureTable}>
        <tbody>
          <tr>
            <SignatureCell role="Guru Mata Pelajaran" person={guru} />
            <SignatureCell role="Kepala Sekolah" person={kepsek} />
          </tr>
        </tbody>
      </table>
    </div>
  )
})

function SignatureCell({ role, person }: { role: string; person: PersonInfo }) {
  return (
    <td style={styles.signatureCell}>
      <p style={styles.signatureRole}>{role}</p>
      <div style={styles.signatureImageBox}>
        {person.signature_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={person.signature_url}
            alt={`Tanda tangan ${role}`}
            style={styles.signatureImg}
            crossOrigin="anonymous"
          />
        ) : (
          <span style={styles.signaturePlaceholder}>(tanda tangan belum tersedia)</span>
        )}
      </div>
      <p style={styles.signatureName}>{person.full_name || '-'}</p>
      <p style={styles.signatureNip}>NIP: {person.nip || '-'}</p>
    </td>
  )
}

export default RmpDocument
