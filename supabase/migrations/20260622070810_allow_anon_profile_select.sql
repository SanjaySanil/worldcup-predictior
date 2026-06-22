
-- Allow anonymous users to read profile usernames (for public leaderboard)
CREATE POLICY "anon_select_profiles" ON profiles FOR SELECT
  TO anon USING (true);
