export type User = {
  id: string
  name: string
  avatar: string
  created_at: string
}

export type ExerciseSet = {
  set_number: number
  weight: number
  reps: number
}

export type Exercise = {
  exercise_name: string
  sets: ExerciseSet[]
}

export type ParticipantData = {
  user_id: string
  user_name: string
  user_avatar: string
  exercises: Exercise[]
  notes?: string
}

export type Reaction = {
  id: string
  session_id: string
  user_id: string
  user_name: string
  user_avatar: string
  category: string
  emoji: string
  gif_url: string
  gif_id: string
  created_at: string
}

export type Session = {
  id: string
  sync_code: string
  created_by: string
  creator_name: string
  creator_avatar: string
  date: string
  type: string
  participants: ParticipantData[]
  reactions?: Reaction[]
  created_at: string
}
