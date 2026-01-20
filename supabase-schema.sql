-- Create shared_sessions table for multi-participant training sessions (no authentication required)
CREATE TABLE shared_sessions (
  id UUID PRIMARY KEY,
  sync_code TEXT NOT NULL,
  created_by TEXT NOT NULL,
  creator_name TEXT NOT NULL,
  creator_avatar TEXT NOT NULL,
  date DATE NOT NULL,
  type TEXT NOT NULL,
  participants JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create index for faster lookups by sync_code
CREATE INDEX idx_shared_sessions_sync_code ON shared_sessions(sync_code);

-- Enable Row Level Security
ALTER TABLE shared_sessions ENABLE ROW LEVEL SECURITY;

-- Anyone can read sessions with a sync_code
CREATE POLICY "Anyone can view sessions with sync code"
  ON shared_sessions FOR SELECT
  USING (true);

-- Anyone can insert sessions
CREATE POLICY "Anyone can insert sessions"
  ON shared_sessions FOR INSERT
  WITH CHECK (true);

-- Anyone can update sessions with the same sync_code
CREATE POLICY "Anyone can update sessions"
  ON shared_sessions FOR UPDATE
  USING (true);

-- Anyone can delete sessions
CREATE POLICY "Anyone can delete sessions"
  ON shared_sessions FOR DELETE
  USING (true);
