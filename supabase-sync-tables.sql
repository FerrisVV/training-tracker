-- Create users table for syncing profiles
CREATE TABLE IF NOT EXISTS shared_users (
  id TEXT PRIMARY KEY,
  sync_code TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_shared_users_sync_code ON shared_users(sync_code);

-- Enable RLS
ALTER TABLE shared_users ENABLE ROW LEVEL SECURITY;

-- Anyone can read/write users with the sync code
CREATE POLICY "Anyone can view users" ON shared_users FOR SELECT USING (true);
CREATE POLICY "Anyone can insert users" ON shared_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update users" ON shared_users FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete users" ON shared_users FOR DELETE USING (true);

-- Create custom exercises table for syncing
CREATE TABLE IF NOT EXISTS shared_custom_exercises (
  id SERIAL PRIMARY KEY,
  sync_code TEXT NOT NULL,
  body_part TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sync_code, body_part, exercise_name)
);

CREATE INDEX idx_shared_custom_exercises_sync_code ON shared_custom_exercises(sync_code);

-- Enable RLS
ALTER TABLE shared_custom_exercises ENABLE ROW LEVEL SECURITY;

-- Anyone can read/write custom exercises with the sync code
CREATE POLICY "Anyone can view custom exercises" ON shared_custom_exercises FOR SELECT USING (true);
CREATE POLICY "Anyone can insert custom exercises" ON shared_custom_exercises FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update custom exercises" ON shared_custom_exercises FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete custom exercises" ON shared_custom_exercises FOR DELETE USING (true);
