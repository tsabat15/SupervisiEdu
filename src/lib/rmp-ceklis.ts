/**
 * SPVC-01 — Ceklis Administrasi Perangkat / Modul Ajar.
 * Diisi kepala sekolah saat meninjau RMP untuk memverifikasi kelengkapan
 * administrasi modul sebelum observasi pembelajaran.
 *
 * Nilai yang disimpan (`admin_ceklis`) adalah daftar `id` item yang tercentang
 * (= dinyatakan lengkap/tersedia).
 */

export interface CeklisItem {
  id: string
  label: string
}

export const ADMIN_CEKLIS_ITEMS: CeklisItem[] = [
  { id: 'identitas', label: 'Identitas modul lengkap (judul, tema, fase, kelas)' },
  { id: 'tujuan', label: 'Tujuan pembelajaran & dimensi Profil Lulusan jelas' },
  { id: 'alur', label: 'Alur aktivitas lengkap (pengenalan – kontekstualisasi – aksi – refleksi)' },
  { id: 'asesmen', label: 'Asesmen formatif & sumatif dirancang' },
  { id: 'materi', label: 'Materi relevan dan kontekstual' },
  { id: 'media', label: 'Media & sumber belajar dicantumkan' },
  { id: 'alokasi', label: 'Alokasi waktu proporsional' },
  { id: 'lampiran', label: 'Lampiran/rubrik pendukung tersedia' },
]

export const ADMIN_CEKLIS_TOTAL = ADMIN_CEKLIS_ITEMS.length

export function ceklisLabel(id: string): string {
  return ADMIN_CEKLIS_ITEMS.find((it) => it.id === id)?.label ?? id
}
