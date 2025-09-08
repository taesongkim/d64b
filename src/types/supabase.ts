export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      commitments: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          color: string
          target_days: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          color?: string
          target_days?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          color?: string
          target_days?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commitments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      commitment_records: {
        Row: {
          id: string
          commitment_id: string
          completed_at: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          commitment_id: string
          completed_at: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          commitment_id?: string
          completed_at?: string
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commitment_records_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["id"]
          }
        ]
      }
      offline_queue: {
        Row: {
          id: string
          operation_type: 'INSERT' | 'UPDATE' | 'DELETE'
          table_name: string
          record_id: string | null
          data: Json | null
          created_at: string
          retry_count: number
          last_error: string | null
        }
        Insert: {
          id?: string
          operation_type: 'INSERT' | 'UPDATE' | 'DELETE'
          table_name: string
          record_id?: string | null
          data?: Json | null
          created_at?: string
          retry_count?: number
          last_error?: string | null
        }
        Update: {
          id?: string
          operation_type?: 'INSERT' | 'UPDATE' | 'DELETE'
          table_name?: string
          record_id?: string | null
          data?: Json | null
          created_at?: string
          retry_count?: number
          last_error?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}