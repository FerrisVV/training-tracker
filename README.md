# Training Tracker

A modern web application for tracking training sessions that syncs across multiple devices. Built with Next.js and Supabase.

## Features

- 🔐 **User Authentication** - Secure signup and login
- 📊 **Training Sessions** - Log and track your workouts
- 👥 **Multi-User Support** - View sessions from you and your friends
- 🔄 **Real-Time Sync** - Instant updates across all devices
- 💰 **100% FREE** - Runs on Supabase and Vercel free tiers

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Wait for the database to initialize (~2 minutes)

### 3. Create Database Tables

In your Supabase project, go to **SQL Editor** and run this SQL:

```sql
-- Create profiles table (optional, for user info)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create training_sessions table
CREATE TABLE training_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  type TEXT NOT NULL,
  duration INTEGER NOT NULL,
  intensity INTEGER CHECK (intensity >= 1 AND intensity <= 10),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for training_sessions
CREATE POLICY "Users can view all training sessions"
  ON training_sessions FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own sessions"
  ON training_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON training_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON training_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to automatically create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

### 4. Get Your Supabase Credentials

1. In your Supabase project, go to **Settings** → **API**
2. Copy the **Project URL** and **anon/public key**

### 5. Configure Environment Variables

1. Copy the example env file:
   ```bash
   copy .env.local.example .env.local
   ```

2. Edit `.env.local` and add your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url-here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser!

## Usage

1. **Sign Up** - Create an account with your email
2. **Add Sessions** - Click "Add Session" to log a training session
3. **View History** - See all your sessions and your friends' sessions
4. **Sync Across Devices** - Login on any device to see your data

## Deployment (FREE)

### Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add your environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy!

Your app will be live with a free `.vercel.app` domain and sync across all devices!

## Database Schema

### training_sessions
- `id` - Unique identifier
- `user_id` - User who created the session
- `date` - Date of training
- `type` - Type of training (e.g., Running, Gym, Cycling)
- `duration` - Duration in minutes
- `intensity` - Intensity level (1-10)
- `notes` - Optional notes
- `created_at` - When the session was logged

### profiles
- `id` - User ID
- `email` - User email
- `full_name` - User's name
- `created_at` - Account creation date

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Hosting**: Vercel (free tier)

## Features Explained

### Real-Time Sync
The app uses Supabase's real-time subscriptions to instantly sync data across all devices. When someone adds a training session, it appears immediately for all users.

### Multi-User Support
All users can see each other's training sessions (great for motivation and accountability!). Each session shows who logged it.

### Security
- Row-level security ensures users can only edit/delete their own sessions
- All data is encrypted in transit and at rest
- Supabase handles authentication securely

## License

MIT
