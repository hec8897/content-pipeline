// 본 파일은 Supabase 가 자동 생성. schema 에 enum/composite 가 없을 때 일부 union 에 redundant `never` 가 남는데
// 그건 generator 의 산물이라 lint 는 비활성화. schema 변경 시 `mcp__supabase__generate_typescript_types` 로 재생성.
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      drafts: {
        Row: {
          blog_body: string | null;
          blog_tags: string[];
          blog_title: string | null;
          caption: string | null;
          card_news: Json | null;
          created_at: string;
          error_reason: string | null;
          generated_at: string | null;
          id: string;
          model_used: string | null;
          status: string;
          topic_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          blog_body?: string | null;
          blog_tags?: string[];
          blog_title?: string | null;
          caption?: string | null;
          card_news?: Json | null;
          created_at?: string;
          error_reason?: string | null;
          generated_at?: string | null;
          id?: string;
          model_used?: string | null;
          status?: string;
          topic_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          blog_body?: string | null;
          blog_tags?: string[];
          blog_title?: string | null;
          caption?: string | null;
          card_news?: Json | null;
          created_at?: string;
          error_reason?: string | null;
          generated_at?: string | null;
          id?: string;
          model_used?: string | null;
          status?: string;
          topic_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'drafts_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: false;
            referencedRelation: 'topics';
            referencedColumns: ['id'];
          },
        ];
      };
      publish_jobs: {
        Row: {
          attempts: number;
          channel: string;
          created_at: string;
          draft_id: string;
          external_ref: string | null;
          id: string;
          last_error: string | null;
          max_attempts: number;
          published_at: string | null;
          scheduled_at: string;
          status: string;
          triggered_at: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          attempts?: number;
          channel: string;
          created_at?: string;
          draft_id: string;
          external_ref?: string | null;
          id?: string;
          last_error?: string | null;
          max_attempts?: number;
          published_at?: string | null;
          scheduled_at?: string;
          status?: string;
          triggered_at?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          attempts?: number;
          channel?: string;
          created_at?: string;
          draft_id?: string;
          external_ref?: string | null;
          id?: string;
          last_error?: string | null;
          max_attempts?: number;
          published_at?: string | null;
          scheduled_at?: string;
          status?: string;
          triggered_at?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'publish_jobs_draft_id_fkey';
            columns: ['draft_id'];
            isOneToOne: false;
            referencedRelation: 'drafts';
            referencedColumns: ['id'];
          },
        ];
      };
      interview_messages: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          role: string;
          session_id: string;
          turn: number;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          role: string;
          session_id: string;
          turn: number;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          role?: string;
          session_id?: string;
          turn?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'interview_messages_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'interview_sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      interview_sessions: {
        Row: {
          end_reason: string | null;
          ended_at: string | null;
          id: string;
          started_at: string;
          status: string;
          topic_id: string;
          user_id: string;
        };
        Insert: {
          end_reason?: string | null;
          ended_at?: string | null;
          id?: string;
          started_at?: string;
          status?: string;
          topic_id: string;
          user_id: string;
        };
        Update: {
          end_reason?: string | null;
          ended_at?: string | null;
          id?: string;
          started_at?: string;
          status?: string;
          topic_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'interview_sessions_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: false;
            referencedRelation: 'topics';
            referencedColumns: ['id'];
          },
        ];
      };
      topics: {
        Row: {
          created_at: string;
          id: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
