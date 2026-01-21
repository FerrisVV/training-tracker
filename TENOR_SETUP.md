# Tenor GIF Reaction System Setup

## Overview
Your gym tracker now includes a fun Tenor GIF reaction system! Users can react to workout sessions with animated GIFs from categories like Fire 🔥, Strong 💪, Celebration 🎉, and more.

## Setup Instructions

### 1. Get a Tenor API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Tenor API v2**
4. Go to **Credentials** and create an API key
5. Copy your API key

### 2. Add API Key to Environment
1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Add your Tenor API key to `.env.local`:
   ```
   NEXT_PUBLIC_TENOR_API_KEY=your-tenor-api-key-here
   ```

### 3. Create Supabase Table
Run this SQL in your Supabase SQL editor to create the reactions table:

```sql
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

-- Create policy to allow all operations (adjust based on your security needs)
CREATE POLICY "Enable all access for session_reactions" ON session_reactions
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

### 4. Run the App
```bash
npm run dev
```

## Features

### Reaction Categories
- 🔥 **Fire** - For impressive workouts
- 💪 **Strong** - Show strength appreciation
- 🎉 **Celebration** - Celebrate achievements
- 👏 **Clap** - Applaud good effort
- 😮 **Impressive** - Wow factor
- 😤 **Beast Mode** - Intense workouts
- 🤯 **Mind Blown** - Shocking performance
- 😅 **Fail** - Funny fails
- 😎 **Nice** - Cool and smooth
- 😂 **Funny** - Hilarious moments

### How to Use
1. Go to the **Workouts** page
2. Scroll to **Recent Sessions**
3. Click the **Add Reaction** button (➕ icon) on any session
4. Select a reaction category
5. Choose a GIF from the results
6. Your reaction appears with your avatar and name

### Display
- Reactions show as animated GIFs in a grid
- Each reaction displays the user's avatar, name, emoji, and category
- Multiple users can react to the same session

## Customization

### Add New Categories
Edit `lib/tenor.ts` to add more reaction categories:

```typescript
export const REACTION_CATEGORIES = [
  { label: 'Your Label', emoji: '🎯', query: 'search terms' },
  // ... more categories
]
```

### Adjust GIF Quality
Change the size parameter when getting GIF URLs:
- `'small'` - Faster loading, lower quality
- `'medium'` - Balanced (default)
- `'original'` - Best quality, slower loading

## API Rate Limits
Tenor API has rate limits. For production use:
- Monitor your API usage in Google Cloud Console
- Consider implementing caching
- Add error handling for rate limit exceeded

## Troubleshooting

### GIFs Not Loading
1. Check your Tenor API key is correct in `.env.local`
2. Verify the API key is enabled in Google Cloud Console
3. Check browser console for API errors

### Reactions Not Saving
1. Verify the Supabase table was created correctly
2. Check RLS policies allow inserts
3. Ensure `sync_code` matches your app's sync code

### Slow Performance
1. Use smaller GIF sizes (edit `getGifUrl` calls)
2. Limit number of reactions displayed per session
3. Implement pagination for sessions

## Technologies Used
- **Tenor API v2** - GIF search and delivery
- **Material UI** - UI components
- **Supabase** - Database and storage
- **Next.js** - React framework

Enjoy reacting to workouts with GIFs! 🎉
