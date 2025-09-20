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
          // Phase 0: New optional fields for future features
          lineage_id: string | null
          tracking_mode: string | null
          display_order: number | null
          is_archived: boolean | null
          is_deleted: boolean | null
          deleted_at: string | null
          created_by: string | null
          change_note: string | null
          effective_from: string | null
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
          // Phase 0: New optional fields for future features
          lineage_id?: string | null
          tracking_mode?: string | null
          display_order?: number | null
          is_archived?: boolean | null
          is_deleted?: boolean | null
          deleted_at?: string | null
          created_by?: string | null
          change_note?: string | null
          effective_from?: string | null
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
          // Phase 0: New optional fields for future features
          lineage_id?: string | null
          tracking_mode?: string | null
          display_order?: number | null
          is_archived?: boolean | null
          is_deleted?: boolean | null
          deleted_at?: string | null
          created_by?: string | null
          change_note?: string | null
          effective_from?: string | null
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
          // Phase 0: New optional fields for future features
          user_id: string | null
          status: string | null
          is_future_prefill: boolean | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          commitment_id: string
          completed_at: string
          notes?: string | null
          created_at?: string
          // Phase 0: New optional fields for future features
          user_id?: string | null
          status?: string | null
          is_future_prefill?: boolean | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          commitment_id?: string
          completed_at?: string
          notes?: string | null
          created_at?: string
          // Phase 0: New optional fields for future features
          user_id?: string | null
          status?: string | null
          is_future_prefill?: boolean | null
          updated_at?: string | null
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
      // Phase 0: New tables for future features (not used yet)
      commitment_success_criteria: {
        Row: {
          id: string
          commitment_id: string
          criteria_type: string
          operator: string | null
          value: number | null
          value_max: number | null
          unit_label: string | null
          numeric_type: string | null
          duration_unit: string | null
          total_conditions: number | null
          required_conditions: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          commitment_id: string
          criteria_type: string
          operator?: string | null
          value?: number | null
          value_max?: number | null
          unit_label?: string | null
          numeric_type?: string | null
          duration_unit?: string | null
          total_conditions?: number | null
          required_conditions?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          commitment_id?: string
          criteria_type?: string
          operator?: string | null
          value?: number | null
          value_max?: number | null
          unit_label?: string | null
          numeric_type?: string | null
          duration_unit?: string | null
          total_conditions?: number | null
          required_conditions?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      commitment_conditions: {
        Row: {
          id: string
          commitment_id: string
          order_index: number
          label: string
          created_at: string
        }
        Insert: {
          id?: string
          commitment_id: string
          order_index: number
          label: string
          created_at?: string
        }
        Update: {
          id?: string
          commitment_id?: string
          order_index?: number
          label?: string
          created_at?: string
        }
        Relationships: []
      }
      commitment_day_data: {
        Row: {
          id: string
          commitment_record_id: string
          data_type: string
          binary_value: boolean | null
          measured_value: number | null
          unit_label: string | null
          completed_conditions: Json | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          commitment_record_id: string
          data_type: string
          binary_value?: boolean | null
          measured_value?: number | null
          unit_label?: string | null
          completed_conditions?: Json | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          commitment_record_id?: string
          data_type?: string
          binary_value?: boolean | null
          measured_value?: number | null
          unit_label?: string | null
          completed_conditions?: Json | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      commitment_comments: {
        Row: {
          id: string
          commitment_record_id: string
          user_id: string
          content: string
          is_edited: boolean
          is_deleted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          commitment_record_id: string
          user_id: string
          content: string
          is_edited?: boolean
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          commitment_record_id?: string
          user_id?: string
          content?: string
          is_edited?: boolean
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      commitment_comment_history: {
        Row: {
          id: string
          comment_id: string
          content: string
          edited_at: string
        }
        Insert: {
          id?: string
          comment_id: string
          content: string
          edited_at?: string
        }
        Update: {
          id?: string
          comment_id?: string
          content?: string
          edited_at?: string
        }
        Relationships: []
      }
      commitment_comment_mentions: {
        Row: {
          id: string
          comment_id: string
          mentioned_user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          comment_id: string
          mentioned_user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          comment_id?: string
          mentioned_user_id?: string
          created_at?: string
        }
        Relationships: []
      }
      commitment_permissions: {
        Row: {
          id: string
          commitment_id: string
          permission_type: string
          can_view: boolean
          can_comment: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          commitment_id: string
          permission_type: string
          can_view?: boolean
          can_comment?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          commitment_id?: string
          permission_type?: string
          can_view?: boolean
          can_comment?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      commitment_permission_users: {
        Row: {
          id: string
          permission_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          permission_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          permission_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: []
      }
      commitment_permission_groups: {
        Row: {
          id: string
          permission_id: string
          group_id: string
          created_at: string
        }
        Insert: {
          id?: string
          permission_id: string
          group_id: string
          created_at?: string
        }
        Update: {
          id?: string
          permission_id?: string
          group_id?: string
          created_at?: string
        }
        Relationships: []
      }
      commitment_streaks: {
        Row: {
          id: string
          commitment_id: string
          user_id: string
          current_streak: number
          best_streak: number
          last_success_date: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          commitment_id: string
          user_id: string
          current_streak?: number
          best_streak?: number
          last_success_date?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          commitment_id?: string
          user_id?: string
          current_streak?: number
          best_streak?: number
          last_success_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      friend_requests: {
        Row: {
          id: string
          sender_id: string
          receiver_id: string
          status: string
          message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          receiver_id: string
          status?: string
          message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          receiver_id?: string
          status?: string
          message?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          id: string
          user1_id: string
          user2_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user1_id: string
          user2_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user1_id?: string
          user2_id?: string
          created_at?: string
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