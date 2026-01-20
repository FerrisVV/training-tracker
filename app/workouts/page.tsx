'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useLocalStorage } from '@/lib/useLocalStorage'
import { supabase } from '@/lib/supabase'
import { User, Session, ExerciseSet } from '@/lib/types'

// Helper function to check if avatar is a valid image path
const isValidImagePath = (src: string): boolean => {
  if (!src) return false
  return src.startsWith('/') || src.startsWith('http://') || src.startsWith('https://')
}

const DEFAULT_AVATAR = '/avatars/02e5ef8fa00e64c8881597fbf765ca2f.jpg'

interface ExerciseProgress {
  exercise_name: string
  sessions: {
    date: string
    max_weight: number
    total_volume: number // weight * reps across all sets
  }[]
}

export default function WorkoutsPage() {
  const router = useRouter()
  const DEFAULT_SYNC_CODE = 'SHARED'
  const [syncCode] = useLocalStorage<string>('sync_code', DEFAULT_SYNC_CODE)
  const [currentUser] = useLocalStorage<User | null>('current_user', null)
  const [users] = useLocalStorage<User[]>('users', [])
  const [sessions, setSessions] = useState<Session[]>([])
  const [mounted, setMounted] = useState(false)
  
  const [selectedExercise, setSelectedExercise] = useState<string>('')
  const [sessionLimit, setSessionLimit] = useState<number>(20)
  const [showAllTime, setShowAllTime] = useState<boolean>(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (!currentUser) {
      router.push('/users')
      return
    }
    fetchSessions()
  }, [currentUser, router, mounted])

  const fetchSessions = async () => {
    const { data } = await supabase
      .from('shared_sessions')
      .select('*')
      .eq('sync_code', syncCode)
      .order('date', { ascending: false })
    if (data) setSessions(data)
  }

  // Calculate gym days in last 30 days
  const getGymDaysLast30 = () => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const uniqueDays = new Set(
      sessions
        .filter(s => new Date(s.date) >= thirtyDaysAgo)
        .filter(s => s.participants?.some((p: any) => p.user_id === currentUser?.id))
        .map(s => s.date)
    )
    return uniqueDays.size
  }

  // Get all exercises performed by current user
  const getAllExercises = (): string[] => {
    const exerciseSet = new Set<string>()
    sessions.forEach(session => {
      session.participants?.forEach((p: any) => {
        if (p.user_id === currentUser?.id) {
          p.exercises?.forEach((ex: any) => {
            exerciseSet.add(ex.exercise_name)
          })
        }
      })
    })
    return Array.from(exerciseSet).sort()
  }

  // Get top 5 most performed exercises
  const getTopExercises = () => {
    const exerciseCount: Record<string, number> = {}
    sessions.forEach(session => {
      session.participants?.forEach((p: any) => {
        if (p.user_id === currentUser?.id) {
          p.exercises?.forEach((ex: any) => {
            exerciseCount[ex.exercise_name] = (exerciseCount[ex.exercise_name] || 0) + 1
          })
        }
      })
    })
    return Object.entries(exerciseCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  }

  // Get exercise progress data for graphs
  const getExerciseProgress = (exerciseName: string): ExerciseProgress => {
    const progressData: ExerciseProgress = {
      exercise_name: exerciseName,
      sessions: []
    }

    sessions.forEach(session => {
      session.participants?.forEach((p: any) => {
        if (p.user_id === currentUser?.id) {
          const exercise = p.exercises?.find((ex: any) => ex.exercise_name === exerciseName)
          if (exercise) {
            const maxWeight = Math.max(...exercise.sets.map((s: ExerciseSet) => s.weight))
            const totalVolume = exercise.sets.reduce((sum: number, s: ExerciseSet) => sum + (s.weight * s.reps), 0)
            progressData.sessions.push({
              date: session.date,
              max_weight: maxWeight,
              total_volume: totalVolume
            })
          }
        }
      })
    })

    // Limit sessions if not showing all time
    if (!showAllTime && progressData.sessions.length > sessionLimit) {
      progressData.sessions = progressData.sessions.slice(0, sessionLimit)
    }

    return progressData
  }

  const handleLogout = () => {
    localStorage.removeItem('current_user')
    window.location.href = '/users'
  }

  const allExercises = getAllExercises()
  const topExercises = getTopExercises()
  const exerciseProgress = selectedExercise ? getExerciseProgress(selectedExercise) : null

  // Calculate max weight for chart scaling
  const maxWeightInData = exerciseProgress 
    ? Math.max(...exerciseProgress.sessions.map(s => s.max_weight), 0)
    : 0

  if (!currentUser || !mounted) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Workout Tracker</h1>
          </div>
          <div className="flex items-center space-x-4">
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
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Switch Profile
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm text-gray-600 mb-1">Days in Last 30</h3>
            <p className="text-4xl font-bold text-indigo-600">{getGymDaysLast30()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm text-gray-600 mb-1">Total Workouts</h3>
            <p className="text-4xl font-bold text-gray-900">
              {sessions.filter(s => s.participants?.some((p: any) => p.user_id === currentUser?.id)).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm text-gray-600 mb-1">Exercises Tracked</h3>
            <p className="text-4xl font-bold text-gray-900">{allExercises.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm text-gray-600 mb-1">This Month</h3>
            <p className="text-4xl font-bold text-gray-900">
              {sessions.filter(s => {
                const sessionDate = new Date(s.date)
                const now = new Date()
                return sessionDate.getMonth() === now.getMonth() && 
                       sessionDate.getFullYear() === now.getFullYear() &&
                       s.participants?.some((p: any) => p.user_id === currentUser?.id)
              }).length}
            </p>
          </div>
        </div>

        {/* Top Exercises */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Top 5 Exercises</h2>
          <div className="space-y-3">
            {topExercises.map(([name, count], idx) => (
              <div key={name} className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-lg font-bold text-gray-400">#{idx + 1}</span>
                  <span className="font-medium text-gray-900">{name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full" 
                      style={{ width: `${(count / topExercises[0][1]) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-16 text-right">{count} sessions</span>
                </div>
              </div>
            ))}
            {topExercises.length === 0 && (
              <p className="text-gray-500 text-center py-4">No exercise data yet</p>
            )}
          </div>
        </div>

        {/* Exercise Progress Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Exercise Progress Tracker</h2>
          
          {/* Exercise Selector and Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Exercise</label>
              <select
                value={selectedExercise}
                onChange={(e) => setSelectedExercise(e.target.value)}
                className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md"
              >
                <option value="">Choose an exercise...</option>
                {allExercises.map(ex => (
                  <option key={ex} value={ex}>{ex}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">View Mode</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAllTime(true)}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium ${
                    showAllTime 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Time
                </button>
                <button
                  onClick={() => setShowAllTime(false)}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium ${
                    !showAllTime 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Limited
                </button>
              </div>
            </div>
            {!showAllTime && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sessions to Show</label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={sessionLimit}
                  onChange={(e) => setSessionLimit(parseInt(e.target.value) || 20)}
                  className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md"
                />
              </div>
            )}
          </div>

          {/* Chart */}
          {exerciseProgress && exerciseProgress.sessions.length > 0 ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Max Weight Progress</h3>
                <div className="relative h-64 border-l-2 border-b-2 border-gray-300">
                  {/* Y-axis labels */}
                  <div className="absolute -left-12 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-600">
                    <span>{Math.ceil(maxWeightInData)} kg</span>
                    <span>{Math.ceil(maxWeightInData * 0.75)} kg</span>
                    <span>{Math.ceil(maxWeightInData * 0.5)} kg</span>
                    <span>{Math.ceil(maxWeightInData * 0.25)} kg</span>
                    <span>0 kg</span>
                  </div>

                  {/* Chart area */}
                  <div className="absolute inset-0 flex items-end justify-around px-2">
                    {exerciseProgress.sessions.slice().reverse().map((session, idx) => {
                      const heightPercent = maxWeightInData > 0 ? (session.max_weight / maxWeightInData) * 100 : 0
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center justify-end mx-0.5 group">
                          <div className="relative w-full">
                            <div 
                              className="w-full bg-indigo-500 hover:bg-indigo-600 transition-all rounded-t cursor-pointer"
                              style={{ height: `${Math.max(heightPercent * 2.4, 4)}px` }}
                              title={`${session.max_weight} kg on ${new Date(session.date).toLocaleDateString()}`}
                            />
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                              {session.max_weight} kg
                              <div className="text-gray-400">{new Date(session.date).toLocaleDateString()}</div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                {/* X-axis - simplified */}
                <div className="mt-2 flex justify-between text-xs text-gray-600">
                  <span>
                    {new Date(exerciseProgress.sessions[exerciseProgress.sessions.length - 1]?.date).toLocaleDateString()}
                  </span>
                  <span className="text-gray-400">← Time →</span>
                  <span>
                    {new Date(exerciseProgress.sessions[0]?.date).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Session Details Table */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Session Details</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Max Weight</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Total Volume</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {exerciseProgress.sessions.map((session, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {new Date(session.date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-2 text-sm font-semibold text-indigo-600">
                            {session.max_weight} kg
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600">
                            {session.total_volume.toLocaleString()} kg
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : selectedExercise ? (
            <div className="text-center py-12 text-gray-500">
              No data found for this exercise
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Select an exercise to view progress
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
