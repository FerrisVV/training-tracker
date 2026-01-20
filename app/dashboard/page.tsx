'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useLocalStorage } from '@/lib/useLocalStorage'
import { supabase } from '@/lib/supabase'
import { User, Session, ParticipantData, Exercise, ExerciseSet } from '@/lib/types'

const BODY_PARTS = [
  'Chest',
  'Back',
  'Shoulders',
  'Arms',
  'Legs',
  'Core/Abs',
  'Cardio',
  'Full Body'
]

const EXERCISES_BY_BODY_PART: Record<string, string[]> = {
  'Chest': ['Bench Press', 'Incline Bench Press', 'Dumbbell Press', 'Chest Fly', 'Push-ups', 'Cable Crossover'],
  'Back': ['Deadlift', 'Pull-ups', 'Barbell Row', 'Lat Pulldown', 'Seated Row', 'T-Bar Row'],
  'Shoulders': ['Overhead Press', 'Lateral Raise', 'Front Raise', 'Rear Delt Fly', 'Arnold Press', 'Shrugs'],
  'Arms': ['Barbell Curl', 'Tricep Dips', 'Hammer Curl', 'Skull Crushers', 'Cable Curl', 'Tricep Pushdown'],
  'Legs': ['Squat', 'Leg Press', 'Romanian Deadlift', 'Lunges', 'Leg Curl', 'Calf Raise'],
  'Core/Abs': ['Plank', 'Crunches', 'Russian Twist', 'Leg Raises', 'Ab Wheel', 'Cable Crunch'],
  'Cardio': ['Running', 'Cycling', 'Rowing', 'Elliptical', 'Swimming', 'Jump Rope'],
  'Full Body': ['Burpees', 'Kettlebell Swing', 'Clean and Press', 'Thrusters', 'Mountain Climbers']
}

// Helper function to check if avatar is a valid image path
const isValidImagePath = (src: string): boolean => {
  if (!src) return false
  return src.startsWith('/') || src.startsWith('http://') || src.startsWith('https://')
}

const DEFAULT_AVATAR = '/avatars/02e5ef8fa00e64c8881597fbf765ca2f.jpg'

export default function DashboardPage() {
  const router = useRouter()
  const DEFAULT_SYNC_CODE = 'SHARED'
  const [syncCode] = useLocalStorage<string>('sync_code', DEFAULT_SYNC_CODE)
  const [currentUser, setCurrentUser] = useLocalStorage<User | null>('current_user', null)
  const [users, setUsers] = useLocalStorage<User[]>('users', [])
  const [sessions, setSessions] = useState<Session[]>([])
  
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: '',
  })
  const [participants, setParticipants] = useState<ParticipantData[]>([])
  const [sessionExercises, setSessionExercises] = useState<string[]>([]) // Shared exercises for everyone
  const [customExercises, setCustomExercises] = useLocalStorage<Record<string, string[]>>('custom_exercises', {})

  // Sync users from Supabase
  useEffect(() => {
    if (syncCode) {
      fetchUsers()
    }
  }, [syncCode])

  // Sync custom exercises from Supabase
  useEffect(() => {
    if (syncCode) {
      fetchCustomExercises()
    }
  }, [syncCode])

  // Initialize participants when currentUser is available
  useEffect(() => {
    if (currentUser && participants.length === 0) {
      setParticipants([{
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_avatar: currentUser.avatar,
        exercises: [],
        notes: ''
      }])
    }
  }, [currentUser])

  useEffect(() => {
    if (currentUser) {
      fetchSessions()
      
      // Add small delay to prevent WebSocket connection race conditions
      const timeoutId = setTimeout(() => {
        const channel = supabase
          .channel('sessions_' + syncCode, {
            config: {
              broadcast: { self: true },
            },
          })
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'shared_sessions',
            filter: `sync_code=eq.${syncCode}`
          }, () => {
            fetchSessions()
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('Real-time sync enabled')
            } else if (status === 'CHANNEL_ERROR') {
              console.log('Real-time sync unavailable - using manual refresh')
            }
          })
        
        // Store channel for cleanup
        return () => { 
          supabase.removeChannel(channel).catch(() => {})
        }
      }, 500)
      
      return () => {
        clearTimeout(timeoutId)
      }
    }
  }, [syncCode, currentUser])

  const fetchSessions = async () => {
    const { data } = await supabase
      .from('shared_sessions')
      .select('*')
      .eq('sync_code', syncCode)
      .order('date', { ascending: false })
    if (data) setSessions(data)
  }

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('shared_users')
      .select('*')
      .eq('sync_code', syncCode)
    if (data) {
      setUsers(data as User[])
    }
  }

  const fetchCustomExercises = async () => {
    const { data } = await supabase
      .from('shared_custom_exercises')
      .select('*')
      .eq('sync_code', syncCode)
    if (data) {
      const exercisesByBodyPart: Record<string, string[]> = {}
      data.forEach((item: any) => {
        if (!exercisesByBodyPart[item.body_part]) {
          exercisesByBodyPart[item.body_part] = []
        }
        exercisesByBodyPart[item.body_part].push(item.exercise_name)
      })
      setCustomExercises(exercisesByBodyPart)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) return

    const newSession = {
      id: crypto.randomUUID(),
      sync_code: syncCode,
      created_by: currentUser.id,
      creator_name: currentUser.name,
      creator_avatar: currentUser.avatar,
      date: formData.date,
      type: formData.type,
      participants: participants,
      created_at: new Date().toISOString()
    }

    const { data, error } = await supabase.from('shared_sessions').insert([newSession])
    
    if (error) {
      console.error('Insert error:', error)
      alert(`Error saving session: ${error.message}`)
      return
      return
    }

    setFormData({
      date: new Date().toISOString().split('T')[0],
      type: '',
    })
    setParticipants([{
      user_id: currentUser.id,
      user_name: currentUser.name,
      user_avatar: currentUser.avatar,
      exercises: [],
      notes: ''
    }])
    setShowForm(false)
  }

  const deleteSession = async (id: string) => {
    await supabase.from('shared_sessions').delete().eq('id', id)
  }

  const handleLogout = () => {
    localStorage.removeItem('current_user')
    window.location.href = '/users'
  }

  const addParticipant = () => {
    const newParticipant: ParticipantData = {
      user_id: '',
      user_name: '',
      user_avatar: '/avatars/02e5ef8fa00e64c8881597fbf765ca2f.jpg',
      exercises: sessionExercises.map(name => ({
        exercise_name: name,
        sets: [{ set_number: 1, weight: 0, reps: 0 }]
      })),
      notes: ''
    }
    setParticipants([...participants, newParticipant])
  }

  const removeParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index))
  }

  const updateParticipant = (index: number, field: keyof ParticipantData, value: any) => {
    const newParticipants = [...participants]
    newParticipants[index] = { ...newParticipants[index], [field]: value }
    setParticipants(newParticipants)
  }

  const selectUserForParticipant = (index: number, user: User) => {
    const newParticipants = [...participants]
    newParticipants[index] = { 
      ...newParticipants[index], 
      user_id: user.id,
      user_name: user.name,
      user_avatar: user.avatar
    }
    setParticipants(newParticipants)
  }

  // Add exercise to session (all participants get it)
  const addExerciseToSession = (exerciseName: string) => {
    setSessionExercises([...sessionExercises, exerciseName])
    
    // Add this exercise to all existing participants
    const newParticipants = participants.map(p => ({
      ...p,
      exercises: [...p.exercises, {
        exercise_name: exerciseName,
        sets: [{ set_number: 1, weight: 0, reps: 0 }]
      }]
    }))
    setParticipants(newParticipants)
  }

  // Remove exercise from session (removes from all participants)
  const removeExerciseFromSession = (exerciseName: string) => {
    setSessionExercises(sessionExercises.filter(name => name !== exerciseName))
    
    // Remove from all participants
    const newParticipants = participants.map(p => ({
      ...p,
      exercises: p.exercises.filter(ex => ex.exercise_name !== exerciseName)
    }))
    setParticipants(newParticipants)
  }

  const addSetToExercise = (participantIndex: number, exerciseIndex: number) => {
    const newParticipants = [...participants]
    const sets = newParticipants[participantIndex].exercises[exerciseIndex].sets
    newParticipants[participantIndex].exercises[exerciseIndex].sets.push({
      set_number: sets.length + 1,
      weight: 0,
      reps: 0
    })
    setParticipants(newParticipants)
  }

  const removeSetFromExercise = (participantIndex: number, exerciseIndex: number, setIndex: number) => {
    const newParticipants = [...participants]
    newParticipants[participantIndex].exercises[exerciseIndex].sets.splice(setIndex, 1)
    // Renumber sets
    newParticipants[participantIndex].exercises[exerciseIndex].sets.forEach((set, idx) => {
      set.set_number = idx + 1
    })
    setParticipants(newParticipants)
  }

  const updateSet = (participantIndex: number, exerciseIndex: number, setIndex: number, field: 'weight' | 'reps', value: number) => {
    const newParticipants = [...participants]
    newParticipants[participantIndex].exercises[exerciseIndex].sets[setIndex][field] = value
    setParticipants(newParticipants)
  }

  const addCustomExercise = async (bodyPart: string, exerciseName: string) => {
    const updated = { ...customExercises }
    if (!updated[bodyPart]) {
      updated[bodyPart] = []
    }
    if (!updated[bodyPart].includes(exerciseName)) {
      updated[bodyPart].push(exerciseName)
      setCustomExercises(updated)
      
      // Sync to Supabase
      await supabase.from('shared_custom_exercises').insert([{
        sync_code: syncCode,
        body_part: bodyPart,
        exercise_name: exerciseName
      }])
    }
  }

  const getAvailableExercises = (bodyPart: string): string[] => {
    const base = EXERCISES_BY_BODY_PART[bodyPart] || []
    const custom = customExercises[bodyPart] || []
    return [...base, ...custom]
  }

  if (!currentUser) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gray-900">Training Tracker</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/workouts')}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                View Workouts
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 relative rounded-full overflow-hidden">
                  <Image 
                    src={isValidImagePath(currentUser.avatar) ? currentUser.avatar : DEFAULT_AVATAR} 
                    alt={currentUser.name}
                    fill
                    sizes="32px"
                    className="object-cover"
                  />
                </div>
                <span className="text-sm font-medium text-gray-700">{currentUser.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Switch User
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Training Sessions</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            {showForm ? 'Cancel' : 'Add Session'}
          </button>
        </div>

        {showForm && (
          <div className="mb-8 bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">New Gym Session</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Body Part</label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md"
                  >
                    <option value="">Select body part...</option>
                    {BODY_PARTS.map(part => (
                      <option key={part} value={part}>{part}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Session Exercises - Shared by all participants */}
              {formData.type && (
                <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-800 mb-3">
                    Exercises for this session (everyone does these)
                  </label>
                  
                  <div className="flex gap-2 mb-3">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          addExerciseToSession(e.target.value)
                          e.target.value = ''
                        }
                      }}
                      className="flex-1 text-sm text-gray-900 border border-gray-300 rounded px-3 py-2"
                    >
                      <option value="">+ Add Exercise</option>
                      {getAvailableExercises(formData.type).map(ex => (
                        <option key={ex} value={ex}>{ex}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const name = prompt('Enter custom exercise name:')
                        if (name && name.trim()) {
                          addCustomExercise(formData.type, name.trim())
                          addExerciseToSession(name.trim())
                        }
                      }}
                      className="text-sm px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-medium"
                    >
                      Custom
                    </button>
                  </div>

                  {sessionExercises.length > 0 && (
                    <div className="space-y-2">
                      {sessionExercises.map((exerciseName, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white px-3 py-2 rounded border border-gray-200">
                          <span className="font-medium text-gray-900">{exerciseName}</span>
                          <button
                            type="button"
                            onClick={() => removeExerciseFromSession(exerciseName)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">Participants</label>
                  <button
                    type="button"
                    onClick={addParticipant}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    + Add Person
                  </button>
                </div>
                
                <div className="space-y-6">
                  {participants.map((participant, pIdx) => (
                    <div key={pIdx} className="border-2 border-gray-300 rounded-lg p-4 bg-white">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-10 h-10 relative rounded-full overflow-hidden flex-shrink-0">
                            <Image 
                              src={isValidImagePath(participant.user_avatar) ? participant.user_avatar : DEFAULT_AVATAR} 
                              alt={participant.user_name || 'User'}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          </div>
                          <select
                            value={participant.user_id}
                            onChange={(e) => {
                              const user = users.find(u => u.id === e.target.value)
                              if (user) selectUserForParticipant(pIdx, user)
                            }}
                            required
                            className="text-sm font-medium text-gray-900 border border-gray-300 rounded px-3 py-1 bg-white"
                          >
                            <option value="">Select person...</option>
                            {users.map(user => (
                              <option key={user.id} value={user.id}>{user.name}</option>
                            ))}
                          </select>
                        </div>
                        {participants.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeParticipant(pIdx)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Remove Person
                          </button>
                        )}
                      </div>

                      {/* Exercise List */}
                      <div className="space-y-3 mb-3">
                        {participant.exercises.map((exercise, eIdx) => (
                          <div key={eIdx} className="border border-gray-200 rounded p-3 bg-gray-50">
                            <h4 className="font-semibold text-gray-900 mb-2">{exercise.exercise_name}</h4>
                            
                            {/* Sets */}
                            <div className="space-y-2 mb-2">{exercise.sets.map((set, sIdx) => (
                                <div key={sIdx} className="flex items-center gap-2">
                                  <span className="text-xs text-gray-600 w-12">Set {set.set_number}</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={set.weight || ''}
                                    onChange={(e) => updateSet(pIdx, eIdx, sIdx, 'weight', parseFloat(e.target.value) || 0)}
                                    placeholder="Weight"
                                    className="w-20 px-2 py-1 text-sm text-gray-900 border border-gray-300 rounded"
                                  />
                                  <span className="text-xs text-gray-600">kg x</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={set.reps || ''}
                                    onChange={(e) => updateSet(pIdx, eIdx, sIdx, 'reps', parseInt(e.target.value) || 0)}
                                    placeholder="Reps"
                                    className="w-16 px-2 py-1 text-sm text-gray-900 border border-gray-300 rounded"
                                  />
                                  {exercise.sets.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeSetFromExercise(pIdx, eIdx, sIdx)}
                                      className="text-red-500 hover:text-red-700 text-xs"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => addSetToExercise(pIdx, eIdx)}
                              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                            >
                              + Add Set
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Notes</label>
                        <input
                          type="text"
                          value={participant.notes || ''}
                          onChange={(e) => updateParticipant(pIdx, 'notes', e.target.value)}
                          placeholder="Session notes..."
                          className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full px-4 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-semibold"
              >
                Save Gym Session
              </button>
            </form>
          </div>
        )}

        <div className="space-y-4">
          {sessions.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg">
              <p className="text-gray-500">No gym sessions yet. Add your first one!</p>
            </div>
          ) : (
            sessions.map((session) => (
              <div key={session.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{session.type}</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(session.date).toLocaleDateString()} • Added by{' '}
                      <span className="font-medium inline-flex items-center gap-1">
                        <span className="inline-block w-5 h-5 relative rounded-full overflow-hidden align-middle">
                          <Image 
                            src={session.creator_avatar} 
                            alt={session.creator_name}
                            fill
                            sizes="20px"
                            className="object-cover"
                          />
                        </span>
                        {session.creator_name}
                      </span>
                    </p>
                  </div>
                  {session.created_by === currentUser?.id && (
                    <button
                      onClick={() => deleteSession(session.id)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <p className="text-sm font-medium text-gray-700">Participants:</p>
                  {session.participants?.map((participant, idx) => (
                    <div key={idx} className="bg-gray-50 p-4 rounded-md">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 relative rounded-full overflow-hidden flex-shrink-0">
                          <Image 
                            src={isValidImagePath(participant.user_avatar) ? participant.user_avatar : DEFAULT_AVATAR} 
                            alt={participant.user_name}
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        </div>
                        <p className="font-medium text-gray-900">{participant.user_name}</p>
                      </div>

                      {participant.exercises && participant.exercises.length > 0 ? (
                        <div className="space-y-2 ml-13">
                          {participant.exercises.map((exercise, eIdx) => (
                            <div key={eIdx} className="border-l-2 border-indigo-500 pl-3">
                              <p className="text-sm font-semibold text-gray-900">{exercise.exercise_name}</p>
                              <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                                {exercise.sets.map((set, sIdx) => (
                                  <div key={sIdx}>
                                    Set {set.set_number}: {set.weight}kg × {set.reps} reps
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {participant.notes && (
                        <p className="text-sm text-gray-600 mt-2 ml-13 italic">{participant.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
