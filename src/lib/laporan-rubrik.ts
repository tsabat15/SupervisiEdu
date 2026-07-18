export interface RubricItem {
  no: number
  text: string
}

export interface RubricSection {
  id: string
  groupTitle?: string
  subtitle?: string
  items: RubricItem[]
  maxScore: number
}

/** Label ringkas per seksi — untuk sumbu grafik radar/analisis. */
export const SECTION_SHORT_LABEL: Record<string, string> = {
  pendahuluan: 'Pendahuluan',
  penguasaan: 'Penguasaan Materi',
  strategi: 'Strategi & Metode',
  media: 'Media Belajar',
  kelas: 'Pengelolaan Kelas',
  interaksi: 'Interaksi',
  penutup: 'Penutup',
}

export const SECTIONS: RubricSection[] = [
  {
    id: 'pendahuluan',
    groupTitle: '1. KEGIATAN PENDAHULUAN',
    items: [
      { no: 1, text: 'Membuka pelajaran dengan salam dan doa' },
      { no: 2, text: 'Memeriksa kehadiran siswa' },
      { no: 3, text: 'Menyiapkan kondisi belajar siswa' },
      { no: 4, text: 'Melakukan apersepsi' },
      { no: 5, text: 'Menyampaikan tujuan pembelajaran' },
      { no: 6, text: 'Memberikan motivasi kepada siswa' },
    ],
    maxScore: 24,
  },
  {
    id: 'penguasaan',
    groupTitle: '2. KEGIATAN INTI',
    subtitle: 'A. Penguasaan Materi',
    items: [
      { no: 7, text: 'Menguasai materi pembelajaran' },
      { no: 8, text: 'Menjelaskan materi secara sistematis' },
      { no: 9, text: 'Mengaitkan materi dengan kehidupan nyata' },
      { no: 10, text: 'Menjawab pertanyaan siswa dengan tepat' },
      { no: 11, text: 'Menyampaikan materi sesuai tujuan pembelajaran' },
    ],
    maxScore: 20,
  },
  {
    id: 'strategi',
    subtitle: 'B. Strategi dan Metode Pembelajaran',
    items: [
      { no: 12, text: 'Metode pembelajaran sesuai tujuan' },
      { no: 13, text: 'Menerapkan model pembelajaran yang tepat' },
      { no: 14, text: 'Melibatkan siswa secara aktif' },
      { no: 15, text: 'Memberikan kesempatan bertanya' },
      { no: 16, text: 'Mendorong siswa berpikir kritis' },
    ],
    maxScore: 20,
  },
  {
    id: 'media',
    subtitle: 'C. Penggunaan Media dan Sumber Belajar',
    items: [
      { no: 17, text: 'Menggunakan media pembelajaran yang relevan' },
      { no: 18, text: 'Memanfaatkan teknologi pembelajaran' },
      { no: 19, text: 'Menggunakan sumber belajar yang bervariasi' },
      { no: 20, text: 'Media membantu pemahaman siswa' },
      { no: 21, text: 'Media menarik perhatian siswa' },
    ],
    maxScore: 20,
  },
  {
    id: 'kelas',
    subtitle: 'D. Pengelolaan Kelas',
    items: [
      { no: 22, text: 'Mengatur tempat duduk secara efektif' },
      { no: 23, text: 'Menjaga ketertiban kelas' },
      { no: 24, text: 'Memberikan perhatian kepada seluruh siswa' },
      { no: 25, text: 'Mengelola waktu pembelajaran dengan baik' },
      { no: 26, text: 'Menangani gangguan kelas secara tepat' },
    ],
    maxScore: 20,
  },
  {
    id: 'interaksi',
    subtitle: 'E. Interaksi dan Komunikasi',
    items: [
      { no: 27, text: 'Menggunakan bahasa yang jelas dan santun' },
      { no: 28, text: 'Memberikan umpan balik kepada siswa' },
      { no: 29, text: 'Menghargai pendapat siswa' },
      { no: 30, text: 'Menjalin komunikasi dua arah' },
      { no: 31, text: 'Memberikan penguatan kepada siswa' },
    ],
    maxScore: 20,
  },
  {
    id: 'penutup',
    groupTitle: '3. KEGIATAN PENUTUP',
    items: [
      { no: 32, text: 'Membimbing siswa membuat kesimpulan' },
      { no: 33, text: 'Melakukan refleksi pembelajaran' },
      { no: 34, text: 'Melaksanakan evaluasi pembelajaran' },
      { no: 35, text: 'Memberikan tindak lanjut/tugas' },
      { no: 36, text: 'Menutup pembelajaran dengan baik' },
    ],
    maxScore: 20,
  },
]

export const REKAPITULASI = [
  { label: 'Kegiatan Pendahuluan (6 × 4)', key: 'pendahuluan', max: 24 },
  { label: 'Penguasaan Materi (5 × 4)', key: 'penguasaan', max: 20 },
  { label: 'Strategi dan Metode (5 × 4)', key: 'strategi', max: 20 },
  { label: 'Media dan Sumber Belajar (5 × 4)', key: 'media', max: 20 },
  { label: 'Pengelolaan Kelas (5 × 4)', key: 'kelas', max: 20 },
  { label: 'Interaksi dan Komunikasi (5 × 4)', key: 'interaksi', max: 20 },
  { label: 'Kegiatan Penutup (5 × 4)', key: 'penutup', max: 20 },
]

export const MAX_TOTAL = 144

export function getPredikat(na: number): { label: string; singkat: string } {
  if (na >= 91) return { label: 'Sangat Baik', singkat: 'SB' }
  if (na >= 76) return { label: 'Baik', singkat: 'B' }
  if (na >= 61) return { label: 'Cukup', singkat: 'C' }
  return { label: 'Kurang', singkat: 'K' }
}

export function calcSectionSums(obsScores: Record<string, number>): Record<string, number> {
  const result: Record<string, number> = {}
  for (const section of SECTIONS) {
    result[section.id] = section.items.reduce(
      (sum, item) => sum + (obsScores[String(item.no)] ?? 0),
      0,
    )
  }
  return result
}

export interface SectionPercentage {
  id: string
  label: string
  percentage: number
  sum: number
  max: number
}

/**
 * Persentase capaian per seksi (0–100) dari observation_scores.
 * Dipakai untuk grafik radar analisis area terkuat/terlemah guru.
 */
export function calcSectionPercentages(
  obsScores: Record<string, number>,
): SectionPercentage[] {
  const sums = calcSectionSums(obsScores)
  return SECTIONS.map((section) => {
    const sum = sums[section.id] ?? 0
    return {
      id: section.id,
      label: SECTION_SHORT_LABEL[section.id] ?? section.id,
      percentage: section.maxScore > 0 ? Math.round((sum / section.maxScore) * 100) : 0,
      sum,
      max: section.maxScore,
    }
  })
}
