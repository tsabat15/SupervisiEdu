export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'guru' | 'kepsek'
export type ScheduleStatus = 'dijadwalkan' | 'selesai' | 'dibatalkan'
export type ReportStatus = 'draft' | 'submitted' | 'approved'
export type RmpStatus = 'draft' | 'submitted' | 'approved' | 'revision'
export type DeletionRequestStatus = 'pending' | 'approved' | 'rejected'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          email: string
          role: UserRole
          nip: string | null
          avatar_url: string | null
          signature_url: string | null
          is_verified: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          email: string
          role: UserRole
          nip?: string | null
          avatar_url?: string | null
          signature_url?: string | null
          is_verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          role?: UserRole
          nip?: string | null
          avatar_url?: string | null
          signature_url?: string | null
          is_verified?: boolean
          updated_at?: string
        }
      }
      schedules: {
        Row: {
          id: string
          supervisor_id: string
          teacher_id: string
          scheduled_date: string
          scheduled_time: string
          subject: string
          class_name: string
          status: ScheduleStatus
          notes: string | null
          zoom_link_pra: string | null
          zoom_link_pengamatan: string | null
          zoom_link_pasca: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          supervisor_id: string
          teacher_id: string
          scheduled_date: string
          scheduled_time: string
          subject: string
          class_name: string
          status?: ScheduleStatus
          notes?: string | null
          zoom_link_pra?: string | null
          zoom_link_pengamatan?: string | null
          zoom_link_pasca?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          supervisor_id?: string
          teacher_id?: string
          scheduled_date?: string
          scheduled_time?: string
          subject?: string
          class_name?: string
          status?: ScheduleStatus
          notes?: string | null
          zoom_link_pra?: string | null
          zoom_link_pengamatan?: string | null
          zoom_link_pasca?: string | null
          updated_at?: string
        }
      }
      supervision_reports: {
        Row: {
          id: string
          schedule_id: string | null
          supervisor_id: string
          teacher_id: string
          visit_date: string
          subject: string
          class_name: string
          strengths: string | null
          improvements: string | null
          recommendations: string | null
          score: number | null
          status: ReportStatus
          instrument_type: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          schedule_id?: string | null
          supervisor_id: string
          teacher_id: string
          visit_date: string
          subject: string
          class_name: string
          strengths?: string | null
          improvements?: string | null
          recommendations?: string | null
          score?: number | null
          status?: ReportStatus
          instrument_type?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          schedule_id?: string | null
          supervisor_id?: string
          teacher_id?: string
          visit_date?: string
          subject?: string
          class_name?: string
          strengths?: string | null
          improvements?: string | null
          recommendations?: string | null
          score?: number | null
          status?: ReportStatus
          instrument_type?: string
          updated_at?: string
        }
      }
      rmp_forms: {
        Row: {
          id: string
          guru_id: string
          judul: string
          tema: string
          fase: string
          kelas: string
          dimensi_p5: string[]
          elemen_p5: string[]
          aktivitas_pengenalan: string
          aktivitas_kontekstual: string
          aktivitas_aksi: string
          aktivitas_refleksi: string
          asesmen_awal: string
          asesmen_formatif: string
          asesmen_sumatif: string
          status: RmpStatus
          catatan_kepsek: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          guru_id: string
          judul?: string
          tema?: string
          fase?: string
          kelas?: string
          dimensi_p5?: string[]
          elemen_p5?: string[]
          aktivitas_pengenalan?: string
          aktivitas_kontekstual?: string
          aktivitas_aksi?: string
          aktivitas_refleksi?: string
          asesmen_awal?: string
          asesmen_formatif?: string
          asesmen_sumatif?: string
          status?: RmpStatus
          catatan_kepsek?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          judul?: string
          tema?: string
          fase?: string
          kelas?: string
          dimensi_p5?: string[]
          elemen_p5?: string[]
          aktivitas_pengenalan?: string
          aktivitas_kontekstual?: string
          aktivitas_aksi?: string
          aktivitas_refleksi?: string
          asesmen_awal?: string
          asesmen_formatif?: string
          asesmen_sumatif?: string
          status?: RmpStatus
          catatan_kepsek?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          updated_at?: string
        }
      }
      school_settings: {
        Row: {
          id: number
          school_name: string
          header_line_1: string
          header_line_2: string
          address: string
          phone: string
          email: string
          website: string
          logo_url: string | null
          updated_at: string
        }
        Insert: {
          id?: number
          school_name?: string
          header_line_1?: string
          header_line_2?: string
          address?: string
          phone?: string
          email?: string
          website?: string
          logo_url?: string | null
          updated_at?: string
        }
        Update: {
          school_name?: string
          header_line_1?: string
          header_line_2?: string
          address?: string
          phone?: string
          email?: string
          website?: string
          logo_url?: string | null
          updated_at?: string
        }
      }
      rmp_deletion_requests: {
        Row: {
          id: string
          rmp_id: string
          guru_id: string
          reason: string
          status: DeletionRequestStatus
          admin_note: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          rmp_id: string
          guru_id: string
          reason?: string
          status?: DeletionRequestStatus
          admin_note?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Update: {
          status?: DeletionRequestStatus
          admin_note?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          link: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          link?: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          title?: string
          message?: string
          link?: string
          is_read?: boolean
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: UserRole
      schedule_status: ScheduleStatus
      report_status: ReportStatus
      rmp_status: RmpStatus
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Schedule = Database['public']['Tables']['schedules']['Row']
export type SupervisionReport = Database['public']['Tables']['supervision_reports']['Row']
export type RmpForm = Database['public']['Tables']['rmp_forms']['Row']
export type SchoolSettings = Database['public']['Tables']['school_settings']['Row']
export type AppNotification = Database['public']['Tables']['notifications']['Row']
export type RmpDeletionRequest = Database['public']['Tables']['rmp_deletion_requests']['Row']
