/**
 * Definisi formulir SPVC naratif (SUPKL-PRO).
 *
 * Tiap formulir disimpan sebagai satu kolom `jsonb` pada `supervision_reports`,
 * berisi map { fieldKey: isiTeks }. Formulir sengaja dipisah per kode SPVC
 * sesuai desain instrumen penelitian.
 *
 * Formulir lain yang sudah punya UI khusus (tidak memakai definisi ini):
 *  - SPVC-01 : ceklis administrasi modul  → rmp_forms.admin_ceklis
 *  - SPVC-02 : kontrak pra-konferensi     → schedules.kontrak_*
 *  - SPVC-03 : observasi kuantitatif      → supervision_reports.observation_scores
 *  - SPVC-07/08 : RTL                     → supervision_reports.rtl_items
 */

/** Kolom jsonb yang boleh ditulis lewat updateSpvcForm. */
export const SPVC_COLUMNS = ['spvc04', 'spvc05', 'spvc06', 'spvc09'] as const
export type SpvcColumn = (typeof SPVC_COLUMNS)[number]

export interface SpvcField {
  key: string
  label: string
  placeholder?: string
}

export interface SpvcFormDef {
  column: SpvcColumn
  code: string
  title: string
  subtitle: string
  fields: SpvcField[]
}

export const SPVC_FORMS: SpvcFormDef[] = [
  {
    column: 'spvc04',
    code: 'SPVC-04',
    title: 'Catatan Naratif Observasi',
    subtitle: 'Data kualitatif: deskripsi perilaku yang teramati selama pembelajaran.',
    fields: [
      {
        key: 'perilaku_guru',
        label: 'Deskripsi Perilaku Guru yang Teramati',
        placeholder: 'Uraikan tindakan guru selama pembelajaran secara faktual...',
      },
      {
        key: 'perilaku_siswa',
        label: 'Deskripsi Perilaku Siswa yang Teramati',
        placeholder: 'Uraikan respons dan keterlibatan siswa...',
      },
      {
        key: 'kejadian_kunci',
        label: 'Kejadian Kunci (Critical Incident)',
        placeholder: 'Peristiwa penting yang menonjol selama observasi...',
      },
    ],
  },
  {
    column: 'spvc05',
    code: 'SPVC-05',
    title: 'Evaluasi Pelaksanaan Supervisi',
    subtitle: 'Analisis supervisor terhadap kekuatan dan kelemahan guru pasca observasi.',
    fields: [
      {
        key: 'kekuatan',
        label: 'Kekuatan Guru',
        placeholder: 'Hal-hal positif yang ditemukan selama observasi...',
      },
      {
        key: 'kelemahan',
        label: 'Kelemahan / Area yang Perlu Diperbaiki',
        placeholder: 'Aspek yang masih perlu ditingkatkan...',
      },
      {
        key: 'analisis',
        label: 'Analisis Supervisor',
        placeholder: 'Kesimpulan analisis atas data observasi kuantitatif & kualitatif...',
      },
    ],
  },
  {
    column: 'spvc06',
    code: 'SPVC-06',
    title: 'Umpan Balik Konstruktif',
    subtitle: 'Dirumuskan bersama guru saat pasca-konferensi.',
    fields: [
      {
        key: 'umpan_balik',
        label: 'Umpan Balik yang Disampaikan',
        placeholder: 'Umpan balik konstruktif untuk guru...',
      },
      {
        key: 'tanggapan_guru',
        label: 'Tanggapan / Refleksi Guru',
        placeholder: 'Respons dan refleksi guru atas umpan balik...',
      },
      {
        key: 'kesepakatan',
        label: 'Kesepakatan Bersama',
        placeholder: 'Hal-hal yang disepakati bersama untuk ditindaklanjuti...',
      },
    ],
  },
  {
    column: 'spvc09',
    code: 'SPVC-09',
    title: 'Dampak Supervisi Klinis',
    subtitle: 'Dampak keseluruhan dari proses supervisi klinis yang telah dilakukan.',
    fields: [
      {
        key: 'dampak_guru',
        label: 'Dampak terhadap Guru',
        placeholder: 'Perubahan kompetensi/praktik guru setelah supervisi...',
      },
      {
        key: 'dampak_siswa',
        label: 'Dampak terhadap Siswa / Pembelajaran',
        placeholder: 'Perubahan kualitas pembelajaran yang dirasakan siswa...',
      },
      {
        key: 'dampak_sekolah',
        label: 'Dampak terhadap Sekolah',
        placeholder: 'Kontribusi terhadap mutu sekolah secara keseluruhan...',
      },
    ],
  },
]

export function getSpvcForm(column: SpvcColumn): SpvcFormDef | undefined {
  return SPVC_FORMS.find((f) => f.column === column)
}

export function isSpvcColumn(value: string): value is SpvcColumn {
  return (SPVC_COLUMNS as readonly string[]).includes(value)
}

/** True bila formulir punya minimal satu field terisi. */
export function hasSpvcContent(data: Record<string, string> | null | undefined): boolean {
  if (!data) return false
  return Object.values(data).some((v) => (v ?? '').trim().length > 0)
}
