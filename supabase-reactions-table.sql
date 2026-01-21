-- Run this SQL in your Supabase SQL Editor
-- Dashboard > SQL Editor > New Query > Paste and Run

-- Create session_reactions table
CREATE TABLE IF NOT EXISTS session_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_code TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_avatar TEXT NOT NULL,
  category TEXT NOT NULL,
  emoji TEXT NOT NULL,
  gif_url TEXT NOT NULL,
  gif_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS session_reactions_sync_code_idx ON session_reactions(sync_code);
CREATE INDEX IF NOT EXISTS session_reactions_session_id_idx ON session_reactions(session_id);
CREATE INDEX IF NOT EXISTS session_reactions_created_at_idx ON session_reactions(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE session_reactions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations
CREATE POLICY "Enable all access for session_reactions" ON session_reactions
  FOR ALL
  USING (true)
  WITH CHECK (true);
