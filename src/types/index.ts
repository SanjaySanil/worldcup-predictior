import type { Database } from './database';

export type Profile = Database['public']['Tables']['profiles']['Row'] & {
  reset_code?: string | null;
  reset_requested?: boolean | null;
};
export type Tournament = Database['public']['Tables']['tournaments']['Row'];
export type Competition = Database['public']['Tables']['competitions']['Row'];
export type Team = Database['public']['Tables']['teams']['Row'];
export type MatchDay = Database['public']['Tables']['match_days']['Row'];
export type Match = Database['public']['Tables']['matches']['Row'];
export type Prediction = Database['public']['Tables']['predictions']['Row'];
export type LeaderboardEntry = Database['public']['Tables']['leaderboard']['Row'];
export type PointSettings = Database['public']['Tables']['point_settings']['Row'];
export type Prize = Database['public']['Tables']['prizes']['Row'];
export type Announcement = Database['public']['Tables']['announcements']['Row'];
export type UserNotification = Database['public']['Tables']['user_notifications']['Row'];
export type AuditLog = Database['public']['Tables']['audit_logs']['Row'];

export interface MatchWithTeams extends Match {
  home_team: Team | null;
  away_team: Team | null;
  user_prediction?: Prediction | null;
}

export interface LeaderboardEntryWithProfile extends LeaderboardEntry {
  profiles: Profile;
}

export interface AuthUser {
  id: string;
  email: string;
  profile: Profile;
}

export type UserRole = 'super_admin' | 'admin' | 'user';

export interface PredictionInput {
  matchId: string;
  homeScore: number;
  awayScore: number;
}

export interface MatchFilterOptions {
  date?: string;
  competitionId?: string;
  status?: string;
}

export type TabView = 'bracket' | 'daily';
