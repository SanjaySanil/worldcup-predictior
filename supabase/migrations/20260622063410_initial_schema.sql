
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PROFILES TABLE (extends auth.users)
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('super_admin', 'admin', 'user')),
  is_active BOOLEAN DEFAULT true,
  two_fa_secret TEXT,
  two_fa_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_profiles" ON profiles FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_profiles" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "delete_profiles" ON profiles FOR DELETE
  TO authenticated USING (
    auth.uid() = id OR
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- ============================================================
-- TOURNAMENTS TABLE
-- ============================================================
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  logo_url TEXT,
  banner_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_tournaments" ON tournaments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_tournaments" ON tournaments FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'admin'));
CREATE POLICY "update_tournaments" ON tournaments FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'admin'));
CREATE POLICY "delete_tournaments" ON tournaments FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin');

-- ============================================================
-- COMPETITIONS TABLE
-- ============================================================
CREATE TABLE competitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_competitions" ON competitions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_competitions" ON competitions FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'admin'));
CREATE POLICY "update_competitions" ON competitions FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'admin'));
CREATE POLICY "delete_competitions" ON competitions FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'admin'));

-- ============================================================
-- TEAMS TABLE
-- ============================================================
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  short_code TEXT,
  flag_emoji TEXT,
  flag_url TEXT,
  group_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_teams" ON teams FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_teams" ON teams FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'admin'));
CREATE POLICY "update_teams" ON teams FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'admin'));
CREATE POLICY "delete_teams" ON teams FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'admin'));

-- ============================================================
-- MATCH DAYS TABLE
-- ============================================================
CREATE TABLE match_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE match_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_match_days" ON match_days FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_match_days" ON match_days FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'admin'));
CREATE POLICY "update_match_days" ON match_days FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'admin'));
CREATE POLICY "delete_match_days" ON match_days FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'admin'));

-- ============================================================
-- MATCHES TABLE
-- ============================================================
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_day_id UUID REFERENCES match_days(id) ON DELETE SET NULL,
  competition_id UUID REFERENCES competitions(id) ON DELETE SET NULL,
  home_team_id UUID REFERENCES teams(id),
  away_team_id UUID REFERENCES teams(id),
  venue TEXT,
  group_name TEXT,
  kickoff_time TIMESTAMPTZ NOT NULL,
  prediction_lock_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'finished', 'postponed', 'cancelled')),
  home_score INTEGER,
  away_score INTEGER,
  result_published BOOLEAN DEFAULT false,
  result_published_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_matches" ON matches FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_matches" ON matches FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'admin'));
CREATE POLICY "update_matches" ON matches FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'admin'));
CREATE POLICY "delete_matches" ON matches FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'admin'));

-- ============================================================
-- PREDICTION ROUNDS TABLE
-- ============================================================
CREATE TABLE prediction_rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_day_id UUID REFERENCES match_days(id),
  competition_id UUID REFERENCES competitions(id),
  name TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'locked', 'closed', 'results_published')),
  starts_at TIMESTAMPTZ,
  locks_at TIMESTAMPTZ,
  closes_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE prediction_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_rounds" ON prediction_rounds FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_rounds" ON prediction_rounds FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'admin'));
CREATE POLICY "update_rounds" ON prediction_rounds FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'admin'));
CREATE POLICY "delete_rounds" ON prediction_rounds FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'admin'));

-- ============================================================
-- PREDICTIONS TABLE
-- ============================================================
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  predicted_home_score INTEGER NOT NULL DEFAULT 0,
  predicted_away_score INTEGER NOT NULL DEFAULT 0,
  points_earned INTEGER DEFAULT 0,
  is_correct_result BOOLEAN,
  is_exact_score BOOLEAN,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, match_id)
);

ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_predictions" ON predictions FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id OR
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );
CREATE POLICY "insert_own_predictions" ON predictions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_predictions" ON predictions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_predictions" ON predictions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- LEADERBOARD TABLE
-- ============================================================
CREATE TABLE leaderboard (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
  total_points INTEGER DEFAULT 0,
  exact_scores INTEGER DEFAULT 0,
  correct_results INTEGER DEFAULT 0,
  matches_predicted INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  rank INTEGER,
  accuracy DECIMAL(5,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, competition_id)
);

ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_leaderboard" ON leaderboard FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_leaderboard" ON leaderboard FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_leaderboard" ON leaderboard FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'admin'));
CREATE POLICY "delete_leaderboard" ON leaderboard FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'admin'));

-- ============================================================
-- POINT SETTINGS TABLE
-- ============================================================
CREATE TABLE point_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
  exact_score_points INTEGER DEFAULT 3,
  correct_result_points INTEGER DEFAULT 1,
  wrong_prediction_points INTEGER DEFAULT 0,
  streak_bonus_points INTEGER DEFAULT 5,
  streak_threshold INTEGER DEFAULT 3,
  daily_winner_points INTEGER DEFAULT 10,
  weekly_winner_points INTEGER DEFAULT 25,
  monthly_winner_points INTEGER DEFAULT 100,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE point_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_point_settings" ON point_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_point_settings" ON point_settings FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'admin'));
CREATE POLICY "update_point_settings" ON point_settings FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'admin'));
CREATE POLICY "delete_point_settings" ON point_settings FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'admin'));

-- ============================================================
-- PRIZES TABLE
-- ============================================================
CREATE TABLE prizes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
  prize_type TEXT CHECK (prize_type IN ('daily', 'weekly', 'monthly', 'overall', 'special')),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  rank INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE prizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_prizes" ON prizes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_prizes" ON prizes FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'admin'));
CREATE POLICY "update_prizes" ON prizes FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'admin'));
CREATE POLICY "delete_prizes" ON prizes FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'admin'));

-- ============================================================
-- ANNOUNCEMENTS / NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
  target_role TEXT DEFAULT 'all' CHECK (target_role IN ('all', 'user', 'admin', 'super_admin')),
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_announcements" ON announcements FOR SELECT TO anon, authenticated USING (is_published = true);
CREATE POLICY "select_all_announcements" ON announcements FOR SELECT TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'admin'));
CREATE POLICY "insert_announcements" ON announcements FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'admin'));
CREATE POLICY "update_announcements" ON announcements FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'admin'));
CREATE POLICY "delete_announcements" ON announcements FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'admin'));

-- ============================================================
-- USER NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE user_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_notifications" ON user_notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_notifications" ON user_notifications FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id OR
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );
CREATE POLICY "update_own_notifications" ON user_notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_notifications" ON user_notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- AUDIT LOGS TABLE
-- ============================================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_audit_logs" ON audit_logs FOR SELECT TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'admin'));
CREATE POLICY "insert_audit_logs" ON audit_logs FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "update_audit_logs" ON audit_logs FOR UPDATE TO authenticated
  USING (false);
CREATE POLICY "delete_audit_logs" ON audit_logs FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin');

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to calculate points after result published
CREATE OR REPLACE FUNCTION calculate_match_points(p_match_id UUID)
RETURNS VOID AS $$
DECLARE
  v_match matches%ROWTYPE;
  v_settings point_settings%ROWTYPE;
  v_pred predictions%ROWTYPE;
  v_points INTEGER;
  v_is_exact BOOLEAN;
  v_is_correct BOOLEAN;
BEGIN
  SELECT * INTO v_match FROM matches WHERE id = p_match_id;
  
  IF v_match.home_score IS NULL OR v_match.away_score IS NULL THEN
    RETURN;
  END IF;
  
  -- Get point settings for competition
  SELECT ps.* INTO v_settings 
  FROM point_settings ps
  JOIN match_days md ON md.competition_id = ps.competition_id
  WHERE md.id = v_match.match_day_id
  LIMIT 1;
  
  -- Default settings if none found
  IF NOT FOUND THEN
    v_settings.exact_score_points := 3;
    v_settings.correct_result_points := 1;
    v_settings.wrong_prediction_points := 0;
  END IF;
  
  FOR v_pred IN SELECT * FROM predictions WHERE match_id = p_match_id LOOP
    v_is_exact := (v_pred.predicted_home_score = v_match.home_score AND v_pred.predicted_away_score = v_match.away_score);
    v_is_correct := (
      SIGN(v_pred.predicted_home_score - v_pred.predicted_away_score) = 
      SIGN(v_match.home_score - v_match.away_score)
    );
    
    IF v_is_exact THEN
      v_points := v_settings.exact_score_points;
    ELSIF v_is_correct THEN
      v_points := v_settings.correct_result_points;
    ELSE
      v_points := v_settings.wrong_prediction_points;
    END IF;
    
    UPDATE predictions 
    SET points_earned = v_points, is_exact_score = v_is_exact, is_correct_result = v_is_correct
    WHERE id = v_pred.id;
    
    -- Update leaderboard
    INSERT INTO leaderboard (user_id, competition_id, total_points, exact_scores, correct_results, matches_predicted, accuracy)
    SELECT 
      v_pred.user_id,
      md.competition_id,
      v_points,
      CASE WHEN v_is_exact THEN 1 ELSE 0 END,
      CASE WHEN v_is_correct THEN 1 ELSE 0 END,
      1,
      0
    FROM match_days md WHERE md.id = v_match.match_day_id
    ON CONFLICT (user_id, competition_id) DO UPDATE SET
      total_points = leaderboard.total_points + EXCLUDED.total_points,
      exact_scores = leaderboard.exact_scores + EXCLUDED.exact_scores,
      correct_results = leaderboard.correct_results + EXCLUDED.correct_results,
      matches_predicted = leaderboard.matches_predicted + 1,
      accuracy = CASE WHEN (leaderboard.matches_predicted + 1) > 0 
        THEN ROUND(((leaderboard.correct_results + EXCLUDED.correct_results)::DECIMAL / (leaderboard.matches_predicted + 1)) * 100, 2)
        ELSE 0 END,
      updated_at = NOW();
  END LOOP;
  
  -- Update ranks
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY competition_id ORDER BY total_points DESC, exact_scores DESC, accuracy DESC
    ) as new_rank
    FROM leaderboard
    WHERE competition_id IN (
      SELECT competition_id FROM match_days WHERE id = v_match.match_day_id
    )
  )
  UPDATE leaderboard SET rank = ranked.new_rank
  FROM ranked WHERE leaderboard.id = ranked.id;
  
  UPDATE matches SET result_published = true, result_published_at = NOW() WHERE id = p_match_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime for leaderboard
ALTER PUBLICATION supabase_realtime ADD TABLE leaderboard;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE predictions;
ALTER PUBLICATION supabase_realtime ADD TABLE user_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE announcements;
