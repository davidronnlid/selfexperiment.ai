
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      apple_health_tokens: {
        Row: {
          access_token: string
          created_at: string | null
          expires_at: string | null
          id: number
          refresh_token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          expires_at?: string | null
          id?: number
          refresh_token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          expires_at?: string | null
          id?: number
          refresh_token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      apple_health_variable_data_points: {
        Row: {
          created_at: string | null
          date: string
          id: string
          raw: Json | null
          updated_at: string | null
          user_id: string
          value: number
          variable_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          raw?: Json | null
          updated_at?: string | null
          user_id: string
          value: number
          variable_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          raw?: Json | null
          updated_at?: string | null
          user_id?: string
          value?: number
          variable_id?: string
        }
        Relationships: []
      }
      cron_job_logs: {
        Row: {
          details: Json | null
          executed_at: string | null
          execution_time_ms: number | null
          id: string
          job_name: string
          status: string | null
        }
        Insert: {
          details?: Json | null
          executed_at?: string | null
          execution_time_ms?: number | null
          id?: string
          job_name: string
          status?: string | null
        }
        Update: {
          details?: Json | null
          executed_at?: string | null
          execution_time_ms?: number | null
          id?: string
          job_name?: string
          status?: string | null
        }
        Relationships: []
      }
      data_point_likes: {
        Row: {
          created_at: string | null
          data_point_id: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data_point_id?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          data_point_id?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "log_likes_data_point_id_fkey"
            columns: ["data_point_id"]
            isOneToOne: false
            referencedRelation: "data_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      data_points: {
        Row: {
          created_at: string | null
          date: string | null
          display_unit: string | null
          id: string
          notes: string | null
          routine_id: string | null
          source: string[] | null
          user_id: string | null
          value: string
          variable_id: string | null
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          display_unit?: string | null
          id?: string
          notes?: string | null
          routine_id?: string | null
          source?: string[] | null
          user_id?: string | null
          value: string
          variable_id?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string | null
          display_unit?: string | null
          id?: string
          notes?: string | null
          routine_id?: string | null
          source?: string[] | null
          user_id?: string | null
          value?: string
          variable_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_points_variable_id_fkey"
            columns: ["variable_id"]
            isOneToOne: false
            referencedRelation: "variables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_logs_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      experiments: {
        Row: {
          created_at: string | null
          dependent_variable: string | null
          end_date: string
          frequency: number
          id: number
          missing_data_strategy: string | null
          sort_order: number | null
          start_date: string
          time_intervals: string[] | null
          user_id: string | null
          variable: string
        }
        Insert: {
          created_at?: string | null
          dependent_variable?: string | null
          end_date: string
          frequency: number
          id?: number
          missing_data_strategy?: string | null
          sort_order?: number | null
          start_date: string
          time_intervals?: string[] | null
          user_id?: string | null
          variable: string
        }
        Update: {
          created_at?: string | null
          dependent_variable?: string | null
          end_date?: string
          frequency?: number
          id?: number
          missing_data_strategy?: string | null
          sort_order?: number | null
          start_date?: string
          time_intervals?: string[] | null
          user_id?: string | null
          variable?: string
        }
        Relationships: []
      }
      notification_history: {
        Row: {
          body: string | null
          context: Json | null
          created_at: string | null
          delivery_details: Json | null
          delivery_method: string | null
          delivery_status: string
          id: string
          notification_type: string
          push_subscription_id: string | null
          routine_id: string | null
          sent_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          context?: Json | null
          created_at?: string | null
          delivery_details?: Json | null
          delivery_method?: string | null
          delivery_status?: string
          id?: string
          notification_type?: string
          push_subscription_id?: string | null
          routine_id?: string | null
          sent_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          context?: Json | null
          created_at?: string | null
          delivery_details?: Json | null
          delivery_method?: string | null
          delivery_status?: string
          id?: string
          notification_type?: string
          push_subscription_id?: string | null
          routine_id?: string | null
          sent_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_history_push_subscription_id_fkey"
            columns: ["push_subscription_id"]
            isOneToOne: false
            referencedRelation: "push_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          id: string
          routine_notification_timing: string | null
          routine_reminder_enabled: boolean | null
          routine_reminder_minutes: number | null
          test_notification_enabled: boolean | null
          test_notification_time: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          routine_notification_timing?: string | null
          routine_reminder_enabled?: boolean | null
          routine_reminder_minutes?: number | null
          test_notification_enabled?: boolean | null
          test_notification_time?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          routine_notification_timing?: string | null
          routine_reminder_enabled?: boolean | null
          routine_reminder_minutes?: number | null
          test_notification_enabled?: boolean | null
          test_notification_time?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      oura_tokens: {
        Row: {
          access_token: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          refresh_token: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          access_token?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          access_token?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      oura_variable_data_points: {
        Row: {
          created_at: string | null
          date: string
          id: string
          notes: string | null
          updated_at: string | null
          user_id: string | null
          value: number
          variable_id: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          notes?: string | null
          updated_at?: string | null
          user_id?: string | null
          value: number
          variable_id?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          updated_at?: string | null
          user_id?: string | null
          value?: number
          variable_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oura_variable_data_points_variable_id_fkey"
            columns: ["variable_id"]
            isOneToOne: false
            referencedRelation: "variables"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          date_of_birth: string | null
          email: string | null
          id: string
          name: string | null
          timezone: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          date_of_birth?: string | null
          email?: string | null
          id: string
          name?: string | null
          timezone?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          date_of_birth?: string | null
          email?: string | null
          id?: string
          name?: string | null
          timezone?: string | null
          username?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          browser: string | null
          created_at: string | null
          device_type: string | null
          endpoint: string
          id: string
          is_active: boolean
          last_used_at: string | null
          p256dh_key: string
          platform: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          browser?: string | null
          created_at?: string | null
          device_type?: string | null
          endpoint: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          p256dh_key: string
          platform?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          browser?: string | null
          created_at?: string | null
          device_type?: string | null
          endpoint?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          p256dh_key?: string
          platform?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      roadmap_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          post_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          post_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "roadmap_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_edit_history: {
        Row: {
          change_reason: string | null
          created_at: string | null
          edited_by: string | null
          field_changed: string
          id: string
          new_value: string | null
          old_value: string | null
          post_id: string | null
        }
        Insert: {
          change_reason?: string | null
          created_at?: string | null
          edited_by?: string | null
          field_changed: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          post_id?: string | null
        }
        Update: {
          change_reason?: string | null
          created_at?: string | null
          edited_by?: string | null
          field_changed?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          post_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_edit_history_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "roadmap_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "roadmap_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_posts: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          last_edited_by: string | null
          priority: string | null
          status: string | null
          tag: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          last_edited_by?: string | null
          priority?: string | null
          status?: string | null
          tag: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          last_edited_by?: string | null
          priority?: string | null
          status?: string | null
          tag?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      routine_variables: {
        Row: {
          created_at: string | null
          default_unit: string | null
          default_value: Json | null
          id: string
          routine_id: string
          times: Json[] | null
          updated_at: string | null
          variable_id: string
          weekdays: number[] | null
        }
        Insert: {
          created_at?: string | null
          default_unit?: string | null
          default_value?: Json | null
          id?: string
          routine_id: string
          times?: Json[] | null
          updated_at?: string | null
          variable_id: string
          weekdays?: number[] | null
        }
        Update: {
          created_at?: string | null
          default_unit?: string | null
          default_value?: Json | null
          id?: string
          routine_id?: string
          times?: Json[] | null
          updated_at?: string | null
          variable_id?: string
          weekdays?: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: "routine_variables_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_variables_variable_id_fkey"
            columns: ["variable_id"]
            isOneToOne: false
            referencedRelation: "variables"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          routine_name: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          routine_name: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          routine_name?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      units: {
        Row: {
          conversion_factor: number | null
          conversion_to: string | null
          created_by: string | null
          id: string
          is_base: boolean | null
          label: string
          symbol: string
          unit_group: string
        }
        Insert: {
          conversion_factor?: number | null
          conversion_to?: string | null
          created_by?: string | null
          id: string
          is_base?: boolean | null
          label: string
          symbol: string
          unit_group: string
        }
        Update: {
          conversion_factor?: number | null
          conversion_to?: string | null
          created_by?: string | null
          id?: string
          is_base?: boolean | null
          label?: string
          symbol?: string
          unit_group?: string
        }
        Relationships: []
      }
      user_variable_preferences: {
        Row: {
          created_at: string | null
          display_unit: Json | null
          id: number
          is_shared: boolean | null
          updated_at: string | null
          user_id: string | null
          variable_id: string | null
        }
        Insert: {
          created_at?: string | null
          display_unit?: Json | null
          id?: number
          is_shared?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          variable_id?: string | null
        }
        Update: {
          created_at?: string | null
          display_unit?: Json | null
          id?: number
          is_shared?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          variable_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_variable_preferences_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_variable_preferences_variable_id_fkey"
            columns: ["variable_id"]
            isOneToOne: false
            referencedRelation: "variables"
            referencedColumns: ["id"]
          },
        ]
      }
      variable_units: {
        Row: {
          note: string | null
          priority: number | null
          unit_id: string
          variable_id: string
        }
        Insert: {
          note?: string | null
          priority?: number | null
          unit_id: string
          variable_id: string
        }
        Update: {
          note?: string | null
          priority?: number | null
          unit_id?: string
          variable_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "variable_units_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variable_units_variable_id_fkey"
            columns: ["variable_id"]
            isOneToOne: false
            referencedRelation: "variables"
            referencedColumns: ["id"]
          },
        ]
      }
      variables: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          data_type: string
          default_display_unit: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_public: boolean | null
          label: string
          slug: string
          source_type: string | null
          updated_at: string | null
          validation_rules: Json | null
          variable_type: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          data_type: string
          default_display_unit?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          label: string
          slug: string
          source_type?: string | null
          updated_at?: string | null
          validation_rules?: Json | null
          variable_type?: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          data_type?: string
          default_display_unit?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          label?: string
          slug?: string
          source_type?: string | null
          updated_at?: string | null
          validation_rules?: Json | null
          variable_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_variables_default_display_unit"
            columns: ["default_display_unit"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      withings_tokens: {
        Row: {
          access_token: string
          created_at: string | null
          expires_at: string
          refresh_token: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          expires_at: string
          refresh_token: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          expires_at?: string
          refresh_token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withings_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      withings_variable_data_points: {
        Row: {
          created_at: string | null
          date: string | null
          id: string
          notes: string | null
          updated_at: string | null
          user_id: string | null
          value: number | null
          variable_id: string | null
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          id: string
          notes?: string | null
          updated_at?: string | null
          user_id?: string | null
          value?: number | null
          variable_id?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string | null
          id?: string
          notes?: string | null
          updated_at?: string | null
          user_id?: string | null
          value?: number | null
          variable_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "withings_variable_data_points_variable_id_fkey"
            columns: ["variable_id"]
            isOneToOne: false
            referencedRelation: "variables"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      convert_unit: {
        Args: { value: number; from_unit: string; to_unit: string }
        Returns: number
      }
      create_routine: {
        Args: { p_routine_data: Json }
        Returns: string
      }
      create_routine_auto_logs: {
        Args: { target_date?: string }
        Returns: {
          routine_id: string
          routine_name: string
          variable_name: string
          auto_logged: boolean
          error_message: string
        }[]
      }
      create_simple_routine_auto_logs: {
        Args:
          | { p_user_id: string; target_date?: string }
          | { target_date?: string }
        Returns: {
          variable_id: string
          variable_name: string
          routine_time: string
          auto_logged: boolean
          error_message: string
        }[]
      }
      delete_routine: {
        Args: { p_routine_id: string }
        Returns: undefined
      }
      get_cron_job_status: {
        Args: { p_job_name: string }
        Returns: {
          job_name: string
          last_run: string
          status: string
        }[]
      }
      get_oura_variable_id: {
        Args: { variable_name: string }
        Returns: string
      }
      get_shared_variables: {
        Args: { target_user_id: string }
        Returns: {
          variable_name: string
          variable_type: string
          category: string
        }[]
      }
      get_unit_display_info: {
        Args: { unit_id: string }
        Returns: {
          id: string
          label: string
          symbol: string
          unit_group: string
        }[]
      }
      get_user_preferred_unit: {
        Args: { user_id_param: string; variable_id_param: string }
        Returns: {
          unit_id: string
          label: string
          symbol: string
          unit_group: string
        }[]
      }
      get_user_routines: {
        Args: { p_user_id: string }
        Returns: {
          id: string
          routine_name: string
          notes: string
          is_active: boolean
          weekdays: number[]
          last_auto_logged: string
          created_at: string
          times: Json
        }[]
      }
      get_user_timezone: {
        Args: { user_uuid: string }
        Returns: string
      }
      get_variable_units: {
        Args: { var_id: string }
        Returns: {
          unit_id: string
          label: string
          symbol: string
          unit_group: string
          is_base: boolean
          is_default_group: boolean
        }[]
      }
      handle_routine_override: {
        Args: { p_user_id: string; p_variable_id: string; p_log_date: string }
        Returns: undefined
      }
      is_unit_valid_for_variable: {
        Args: { variable_uuid: string; unit_id: string }
        Returns: boolean
      }
      seed_variable_units: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      set_user_unit_preference: {
        Args:
          | { p_user_uuid: string; p_variable_uuid: string; p_unit_id: string }
          | {
              user_id_param: string
              variable_id_param: string
              unit_id_param: string
              unit_group_param?: string
            }
        Returns: boolean
      }
      test_unit_validation_for_variable: {
        Args:
          | { p_variable_uuid: string; p_unit_id: string }
          | { variable_slug_param: string; test_unit_id: string }
        Returns: {
          is_valid: boolean
          error_message: string
        }[]
      }
      toggle_routine_active: {
        Args:
          | { p_routine_id: string }
          | { p_routine_id: string; p_is_active: boolean }
        Returns: undefined
      }
      trigger_routine_notifications: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_routine: {
        Args: { p_routine_id: string; p_routine_data: Json }
        Returns: undefined
      }
      validate_routine_variable_value: {
        Args:
          | { p_routine_id: string; p_variable_id: string; p_value: string }
          | {
              p_variable_id: string
              p_default_value: string
              p_default_unit: string
            }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
