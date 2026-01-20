import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type TrainingSession = {
  id: string
  user_id: string
  date: string
  type: string
  duration: number
  notes?: string
  intensity?: number
  created_at: string
  user_email?: string
}

export type Profile = {
  id: string
  email: string
  full_name?: string
  created_at: string
}
