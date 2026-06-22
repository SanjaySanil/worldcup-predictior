export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          role: 'super_admin' | 'admin' | 'user';
          is_active: boolean;
          two_fa_secret: string | null;
          two_fa_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          role?: 'super_admin' | 'admin' | 'user';
          is_active?: boolean;
          two_fa_secret?: string | null;
          two_fa_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      tournaments: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          start_date: string | null;
          end_date: string | null;
          logo_url: string | null;
          banner_url: string | null;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          logo_url?: string | null;
          banner_url?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['tournaments']['Insert']>;
      };
      competitions: {
        Row: {
          id: string;
          tournament_id: string | null;
          name: string;
          description: string | null;
          start_date: string | null;
          end_date: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tournament_id?: string | null;
          name: string;
          description?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['competitions']['Insert']>;
      };
      teams: {
        Row: {
          id: string;
          name: string;
          short_code: string | null;
          flag_emoji: string | null;
          flag_url: string | null;
          group_name: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          short_code?: string | null;
          flag_emoji?: string | null;
          flag_url?: string | null;
          group_name?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['teams']['Insert']>;
      };
      match_days: {
        Row: {
          id: string;
          competition_id: string | null;
          name: string;
          date: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          competition_id?: string | null;
          name: string;
          date: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['match_days']['Insert']>;
      };
      matches: {
        Row: {
          id: string;
          match_day_id: string | null;
          competition_id: string | null;
          home_team_id: string | null;
          away_team_id: string | null;
          venue: string | null;
          group_name: string | null;
          kickoff_time: string;
          prediction_lock_time: string;
          status: 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled';
          home_score: number | null;
          away_score: number | null;
          result_published: boolean;
          result_published_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          match_day_id?: string | null;
          competition_id?: string | null;
          home_team_id?: string | null;
          away_team_id?: string | null;
          venue?: string | null;
          group_name?: string | null;
          kickoff_time: string;
          prediction_lock_time: string;
          status?: 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled';
          home_score?: number | null;
          away_score?: number | null;
          result_published?: boolean;
          result_published_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['matches']['Insert']>;
      };
      predictions: {
        Row: {
          id: string;
          user_id: string;
          match_id: string;
          predicted_home_score: number;
          predicted_away_score: number;
          points_earned: number;
          is_correct_result: boolean | null;
          is_exact_score: boolean | null;
          submitted_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          match_id: string;
          predicted_home_score: number;
          predicted_away_score: number;
          points_earned?: number;
          is_correct_result?: boolean | null;
          is_exact_score?: boolean | null;
          submitted_at?: string;
        };
        Update: Partial<Database['public']['Tables']['predictions']['Insert']>;
      };
      leaderboard: {
        Row: {
          id: string;
          user_id: string;
          competition_id: string;
          total_points: number;
          exact_scores: number;
          correct_results: number;
          matches_predicted: number;
          current_streak: number;
          longest_streak: number;
          rank: number | null;
          accuracy: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          competition_id: string;
          total_points?: number;
          exact_scores?: number;
          correct_results?: number;
          matches_predicted?: number;
          current_streak?: number;
          longest_streak?: number;
          rank?: number | null;
          accuracy?: number;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['leaderboard']['Insert']>;
      };
      point_settings: {
        Row: {
          id: string;
          competition_id: string | null;
          exact_score_points: number;
          correct_result_points: number;
          wrong_prediction_points: number;
          streak_bonus_points: number;
          streak_threshold: number;
          daily_winner_points: number;
          weekly_winner_points: number;
          monthly_winner_points: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          competition_id?: string | null;
          exact_score_points?: number;
          correct_result_points?: number;
          wrong_prediction_points?: number;
          streak_bonus_points?: number;
          streak_threshold?: number;
          daily_winner_points?: number;
          weekly_winner_points?: number;
          monthly_winner_points?: number;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['point_settings']['Insert']>;
      };
      prizes: {
        Row: {
          id: string;
          competition_id: string | null;
          prize_type: 'daily' | 'weekly' | 'monthly' | 'overall' | 'special' | null;
          title: string;
          description: string | null;
          image_url: string | null;
          rank: number | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          competition_id?: string | null;
          prize_type?: 'daily' | 'weekly' | 'monthly' | 'overall' | 'special' | null;
          title: string;
          description?: string | null;
          image_url?: string | null;
          rank?: number | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['prizes']['Insert']>;
      };
      announcements: {
        Row: {
          id: string;
          title: string;
          body: string;
          type: 'info' | 'warning' | 'success' | 'error';
          target_role: 'all' | 'user' | 'admin' | 'super_admin';
          is_published: boolean;
          published_at: string | null;
          expires_at: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          body: string;
          type?: 'info' | 'warning' | 'success' | 'error';
          target_role?: 'all' | 'user' | 'admin' | 'super_admin';
          is_published?: boolean;
          published_at?: string | null;
          expires_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['announcements']['Insert']>;
      };
      user_notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          type?: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_notifications']['Insert']>;
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          entity_type: string | null;
          entity_id: string | null;
          old_data: Json | null;
          new_data: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          entity_type?: string | null;
          entity_id?: string | null;
          old_data?: Json | null;
          new_data?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      calculate_match_points: {
        Args: { p_match_id: string };
        Returns: void;
      };
    };
    Enums: Record<string, never>;
  };
}
