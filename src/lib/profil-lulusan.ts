/**
 * 8 Dimensi Profil Lulusan — kerangka Pembelajaran Mendalam (Kurikulum 2025),
 * pengganti 6 Dimensi Profil Pelajar Pancasila (P5).
 * Digunakan pada penyusunan RMP (Rencana Modul Projek) Kokurikuler.
 */

export interface ProfilLulusan {
  id: string
  label: string
  deskripsi: string
}

export const PROFIL_LULUSAN: ProfilLulusan[] = [
  {
    id: 'keimanan',
    label: 'Keimanan dan Ketakwaan terhadap Tuhan YME',
    deskripsi: 'Menghayati nilai keagamaan dan akhlak mulia dalam kehidupan sehari-hari.',
  },
  {
    id: 'kewargaan',
    label: 'Kewargaan',
    deskripsi: 'Menjunjung nilai kebangsaan, demokrasi, dan tanggung jawab sebagai warga negara.',
  },
  {
    id: 'penalaran_kritis',
    label: 'Penalaran Kritis',
    deskripsi: 'Menganalisis informasi secara objektif untuk mengambil keputusan yang tepat.',
  },
  {
    id: 'kreativitas',
    label: 'Kreativitas',
    deskripsi: 'Menghasilkan gagasan dan karya orisinal serta bermakna.',
  },
  {
    id: 'kolaborasi',
    label: 'Kolaborasi',
    deskripsi: 'Bekerja sama secara efektif untuk mencapai tujuan bersama.',
  },
  {
    id: 'kemandirian',
    label: 'Kemandirian',
    deskripsi: 'Bertanggung jawab atas proses dan hasil belajarnya sendiri.',
  },
  {
    id: 'kesehatan',
    label: 'Kesehatan',
    deskripsi: 'Menjaga kesehatan fisik, mental, dan sosial secara seimbang.',
  },
  {
    id: 'komunikasi',
    label: 'Komunikasi',
    deskripsi: 'Menyampaikan gagasan secara jelas, santun, dan efektif.',
  },
]

/** Daftar label saja — untuk validasi & rendering cepat. */
export const PROFIL_LULUSAN_LABELS = PROFIL_LULUSAN.map((p) => p.label)

/**
 * Tema Projek Kokurikuler (Kurikulum Merdeka).
 * Tetap dipertahankan pada kerangka Pembelajaran Mendalam.
 */
export const TEMA_PROJEK = [
  'Gaya Hidup Berkelanjutan',
  'Kearifan Lokal',
  'Bhinneka Tunggal Ika',
  'Bangunlah Jiwa dan Raganya',
  'Suara Demokrasi',
  'Berekayasa dan Berteknologi untuk Membangun NKRI',
  'Kewirausahaan',
] as const

export const FASE = ['Fase A', 'Fase B', 'Fase C', 'Fase D', 'Fase E', 'Fase F'] as const
