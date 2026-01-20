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
  const [selectedLeaderboardExercise, setSelectedLeaderboardExercise] = useState<string>('')
  const [comparisonExercise, setComparisonExercise] = useState<string>('')
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])

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

  // Body Part Heat Map - Get trained body parts this week
  const getBodyPartHeatMap = () => {
    const allBodyParts = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Cardio']
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    
    const trainedParts = new Set<string>()
    sessions.forEach(session => {
      if (new Date(session.date) >= oneWeekAgo) {
        session.participants?.forEach((p: any) => {
          if (p.user_id === currentUser?.id) {
            p.exercises?.forEach((ex: any) => {
              const exerciseLower = ex.exercise_name.toLowerCase()
              if (exerciseLower.includes('chest') || exerciseLower.includes('bench') || exerciseLower.includes('press')) {
                trainedParts.add('Chest')
              }
              if (exerciseLower.includes('back') || exerciseLower.includes('pull') || exerciseLower.includes('row') || exerciseLower.includes('deadlift')) {
                trainedParts.add('Back')
              }
              if (exerciseLower.includes('shoulder') || exerciseLower.includes('lateral') || exerciseLower.includes('overhead')) {
                trainedParts.add('Shoulders')
              }
              if (exerciseLower.includes('bicep') || exerciseLower.includes('tricep') || exerciseLower.includes('curl') || exerciseLower.includes('arm')) {
                trainedParts.add('Arms')
              }
              if (exerciseLower.includes('squat') || exerciseLower.includes('leg') || exerciseLower.includes('lunge') || exerciseLower.includes('calf')) {
                trainedParts.add('Legs')
              }
              if (exerciseLower.includes('core') || exerciseLower.includes('plank') || exerciseLower.includes('abs') || exerciseLower.includes('crunch')) {
                trainedParts.add('Core')
              }
              if (exerciseLower.includes('cardio') || exerciseLower.includes('run') || exerciseLower.includes('bike')) {
                trainedParts.add('Cardio')
              }
            })
          }
        })
      }
    })
    
    return allBodyParts.map(part => ({
      name: part,
      trained: trainedParts.has(part)
    }))
  }

  // Exercise Balance - Categorize into Push/Pull/Legs
  const getExerciseBalance = () => {
    const categories = { Push: 0, Pull: 0, Legs: 0, Other: 0 }
    
    sessions.forEach(session => {
      session.participants?.forEach((p: any) => {
        if (p.user_id === currentUser?.id) {
          p.exercises?.forEach((ex: any) => {
            const exerciseLower = ex.exercise_name.toLowerCase()
            if (exerciseLower.includes('chest') || exerciseLower.includes('bench') || exerciseLower.includes('press') || 
                exerciseLower.includes('shoulder') || exerciseLower.includes('tricep') || exerciseLower.includes('overhead')) {
              categories.Push++
            } else if (exerciseLower.includes('back') || exerciseLower.includes('pull') || exerciseLower.includes('row') || 
                       exerciseLower.includes('bicep') || exerciseLower.includes('curl') || exerciseLower.includes('deadlift')) {
              categories.Pull++
            } else if (exerciseLower.includes('squat') || exerciseLower.includes('leg') || exerciseLower.includes('lunge') || exerciseLower.includes('calf')) {
              categories.Legs++
            } else {
              categories.Other++
            }
          })
        }
      })
    })
    
    const total = categories.Push + categories.Pull + categories.Legs + categories.Other
    return {
      categories,
      percentages: {
        Push: total > 0 ? Math.round((categories.Push / total) * 100) : 0,
        Pull: total > 0 ? Math.round((categories.Pull / total) * 100) : 0,
        Legs: total > 0 ? Math.round((categories.Legs / total) * 100) : 0,
        Other: total > 0 ? Math.round((categories.Other / total) * 100) : 0,
      }
    }
  }

  // Achievement Badges
  const getAchievements = () => {
    const achievements = []
    
    // Calculate streak
    const sortedDates = sessions
      .filter(s => s.participants?.some((p: any) => p.user_id === currentUser?.id))
      .map(s => s.date)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    
    const uniqueDates = [...new Set(sortedDates)]
    let currentStreak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    for (let i = 0; i < uniqueDates.length; i++) {
      const sessionDate = new Date(uniqueDates[i])
      sessionDate.setHours(0, 0, 0, 0)
      const diffDays = Math.floor((today.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (diffDays === currentStreak || (i === 0 && diffDays <= 1)) {
        currentStreak++
      } else {
        break
      }
    }
    
    if (currentStreak >= 7) achievements.push({ name: '7-Day Streak', icon: '🔥', color: 'orange' })
    if (currentStreak >= 30) achievements.push({ name: '30-Day Streak', icon: '💪', color: 'red' })
    
    // Total workouts
    const totalWorkouts = sessions.filter(s => s.participants?.some((p: any) => p.user_id === currentUser?.id)).length
    if (totalWorkouts >= 10) achievements.push({ name: '10 Workouts', icon: '⭐', color: 'yellow' })
    if (totalWorkouts >= 50) achievements.push({ name: '50 Workouts', icon: '🌟', color: 'yellow' })
    if (totalWorkouts >= 100) achievements.push({ name: '100 Workouts', icon: '💯', color: 'purple' })
    
    // Check for 100kg+ lifts
    let has100kgLift = false
    sessions.forEach(session => {
      session.participants?.forEach((p: any) => {
        if (p.user_id === currentUser?.id) {
          p.exercises?.forEach((ex: any) => {
            ex.sets?.forEach((set: ExerciseSet) => {
              if (set.weight >= 100) has100kgLift = true
            })
          })
        }
      })
    })
    if (has100kgLift) achievements.push({ name: '100kg Club', icon: '🏋️', color: 'blue' })
    
    // Check for variety (10+ different exercises)
    if (allExercises.length >= 10) achievements.push({ name: 'Variety King', icon: '🎯', color: 'green' })
    
    return achievements
  }

  // Leaderboards - Get top lifters for an exercise across all users
  const getLeaderboard = (exerciseName: string) => {
    const userMaxWeights: Record<string, { name: string, avatar: string, maxWeight: number, date: string }> = {}
    
    sessions.forEach(session => {
      session.participants?.forEach((p: any) => {
        const exercise = p.exercises?.find((ex: any) => ex.exercise_name === exerciseName)
        if (exercise) {
          const maxWeight = Math.max(...exercise.sets.map((s: ExerciseSet) => s.weight))
          if (!userMaxWeights[p.user_id] || maxWeight > userMaxWeights[p.user_id].maxWeight) {
            userMaxWeights[p.user_id] = {
              name: p.user_name,
              avatar: p.user_avatar,
              maxWeight,
              date: session.date
            }
          }
        }
      })
    })
    
    return Object.values(userMaxWeights)
      .sort((a, b) => b.maxWeight - a.maxWeight)
      .slice(0, 10)
  }

  // Progress Comparison - Get exercise data for multiple users
  const getComparisonData = (exerciseName: string, userIds: string[]) => {
    const userData: Record<string, { name: string, avatar: string, sessions: { date: string, maxWeight: number }[] }> = {}
    
    sessions.forEach(session => {
      session.participants?.forEach((p: any) => {
        if (userIds.includes(p.user_id)) {
          const exercise = p.exercises?.find((ex: any) => ex.exercise_name === exerciseName)
          if (exercise) {
            if (!userData[p.user_id]) {
              userData[p.user_id] = { name: p.user_name, avatar: p.user_avatar, sessions: [] }
            }
            const maxWeight = Math.max(...exercise.sets.map((s: ExerciseSet) => s.weight))
            userData[p.user_id].sessions.push({ date: session.date, maxWeight })
          }
        }
      })
    })
    
    return userData
  }

  // Personal Records - Get all PRs for current user
  const getPersonalRecords = () => {
    const prs: Record<string, { weight: number, date: string }> = {}
    
    allExercises.forEach(exerciseName => {
      let maxWeight = 0
      let maxDate = ''
      
      sessions.forEach(session => {
        session.participants?.forEach((p: any) => {
          if (p.user_id === currentUser?.id) {
            const exercise = p.exercises?.find((ex: any) => ex.exercise_name === exerciseName)
            if (exercise) {
              const weight = Math.max(...exercise.sets.map((s: ExerciseSet) => s.weight))
              if (weight > maxWeight) {
                maxWeight = weight
                maxDate = session.date
              }
            }
          }
        })
      })
      
      if (maxWeight > 0) {
        prs[exerciseName] = { weight: maxWeight, date: maxDate }
      }
    })
    
    return Object.entries(prs)
      .sort((a, b) => b[1].weight - a[1].weight)
  }

  const allExercises = getAllExercises()
  const topExercises = getTopExercises()
  const exerciseProgress = selectedExercise ? getExerciseProgress(selectedExercise) : null
  const bodyPartHeatMap = getBodyPartHeatMap()
  const exerciseBalance = getExerciseBalance()
  const achievements = getAchievements()
  const leaderboard = selectedLeaderboardExercise ? getLeaderboard(selectedLeaderboardExercise) : []
  const comparisonData = comparisonExercise && selectedFriends.length > 0 && currentUser
    ? getComparisonData(comparisonExercise, [...selectedFriends, currentUser.id])
    : {}
  const personalRecords = getPersonalRecords()

  // Calculate max weight for chart scaling
  const maxWeightInData = exerciseProgress 
    ? Math.max(...exerciseProgress.sessions.map(s => s.max_weight), 0)
    : 0
    
  // Calculate max for comparison chart
  const maxComparisonWeight = Object.values(comparisonData).reduce((max, user) => {
    const userMax = Math.max(...user.sessions.map(s => s.maxWeight), 0)
    return Math.max(max, userMax)
  }, 0)

  const userColors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444']

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

        {/* Achievement Badges */}
        {achievements.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">🏆 Achievements</h2>
            <div className="flex flex-wrap gap-3">
              {achievements.map((achievement, idx) => (
                <div 
                  key={idx}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm ${
                    achievement.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                    achievement.color === 'red' ? 'bg-red-100 text-red-700' :
                    achievement.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                    achievement.color === 'purple' ? 'bg-purple-100 text-purple-700' :
                    achievement.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                    'bg-green-100 text-green-700'
                  }`}
                >
                  <span className="text-xl">{achievement.icon}</span>
                  <span>{achievement.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Body Part Heat Map & Exercise Balance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Body Part Heat Map */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">💪 Body Parts This Week</h2>
            <div className="grid grid-cols-2 gap-3">
              {bodyPartHeatMap.map(part => (
                <div
                  key={part.name}
                  className={`px-4 py-3 rounded-lg text-center font-medium transition-all ${
                    part.trained 
                      ? 'bg-green-100 text-green-700 border-2 border-green-300' 
                      : 'bg-red-50 text-red-400 border-2 border-red-200'
                  }`}
                >
                  {part.name}
                  {part.trained && <span className="ml-2">✓</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Exercise Balance */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">⚖️ Exercise Balance</h2>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-indigo-700">Push</span>
                  <span className="text-sm font-bold text-indigo-700">{exerciseBalance.percentages.Push}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-indigo-600 h-3 rounded-full transition-all" 
                    style={{ width: `${exerciseBalance.percentages.Push}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-green-700">Pull</span>
                  <span className="text-sm font-bold text-green-700">{exerciseBalance.percentages.Pull}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-green-600 h-3 rounded-full transition-all" 
                    style={{ width: `${exerciseBalance.percentages.Pull}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-orange-700">Legs</span>
                  <span className="text-sm font-bold text-orange-700">{exerciseBalance.percentages.Legs}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-orange-600 h-3 rounded-full transition-all" 
                    style={{ width: `${exerciseBalance.percentages.Legs}%` }}
                  />
                </div>
              </div>
              {exerciseBalance.percentages.Other > 0 && (
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">Other</span>
                    <span className="text-sm font-bold text-gray-700">{exerciseBalance.percentages.Other}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gray-600 h-3 rounded-full transition-all" 
                      style={{ width: `${exerciseBalance.percentages.Other}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Personal Records */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">🎯 Personal Records</h2>
          {personalRecords.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {personalRecords.slice(0, 9).map(([name, pr]) => (
                <div key={name} className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors">
                  <div className="text-sm font-medium text-gray-700 mb-1">{name}</div>
                  <div className="text-2xl font-bold text-indigo-600">{pr.weight} kg</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(pr.date).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No personal records yet</p>
          )}
        </div>

        {/* Leaderboards */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">🏅 Leaderboards</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Exercise</label>
            <select
              value={selectedLeaderboardExercise}
              onChange={(e) => setSelectedLeaderboardExercise(e.target.value)}
              className="w-full md:w-1/2 px-3 py-2 text-gray-900 border border-gray-300 rounded-md"
            >
              <option value="">Choose an exercise...</option>
              {allExercises.map(ex => (
                <option key={ex} value={ex}>{ex}</option>
              ))}
            </select>
          </div>
          {leaderboard.length > 0 ? (
            <div className="space-y-2">
              {leaderboard.map((entry, idx) => (
                <div 
                  key={idx}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    idx === 0 ? 'bg-yellow-50 border-2 border-yellow-300' :
                    idx === 1 ? 'bg-gray-50 border-2 border-gray-300' :
                    idx === 2 ? 'bg-orange-50 border-2 border-orange-300' :
                    'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-2xl font-bold ${
                      idx === 0 ? 'text-yellow-600' :
                      idx === 1 ? 'text-gray-600' :
                      idx === 2 ? 'text-orange-600' :
                      'text-gray-400'
                    }`}>
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                    </span>
                    <div className="w-10 h-10 relative rounded-full overflow-hidden">
                      <Image 
                        src={isValidImagePath(entry.avatar) ? entry.avatar : DEFAULT_AVATAR}
                        alt={entry.name}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    </div>
                    <span className="font-medium text-gray-900">{entry.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-indigo-600">{entry.maxWeight} kg</div>
                    <div className="text-xs text-gray-500">{new Date(entry.date).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : selectedLeaderboardExercise ? (
            <p className="text-gray-500 text-center py-4">No data found for this exercise</p>
          ) : (
            <p className="text-gray-500 text-center py-4">Select an exercise to view leaderboard</p>
          )}
        </div>

        {/* Progress Comparison */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📊 Compare with Friends</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Exercise</label>
              <select
                value={comparisonExercise}
                onChange={(e) => setComparisonExercise(e.target.value)}
                className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md"
              >
                <option value="">Choose an exercise...</option>
                {allExercises.map(ex => (
                  <option key={ex} value={ex}>{ex}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Friends to Compare</label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                {users.filter(u => u.id !== currentUser?.id).map(user => (
                  <button
                    key={user.id}
                    onClick={() => {
                      if (selectedFriends.includes(user.id)) {
                        setSelectedFriends(selectedFriends.filter(id => id !== user.id))
                      } else {
                        setSelectedFriends([...selectedFriends, user.id])
                      }
                    }}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                      selectedFriends.includes(user.id)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {user.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {Object.keys(comparisonData).length > 0 ? (
            <div>
              <div className="relative h-64 border-l-2 border-b-2 border-gray-300 mb-4">
                {/* Y-axis labels */}
                <div className="absolute -left-12 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-600">
                  <span>{Math.ceil(maxComparisonWeight)} kg</span>
                  <span>{Math.ceil(maxComparisonWeight * 0.75)} kg</span>
                  <span>{Math.ceil(maxComparisonWeight * 0.5)} kg</span>
                  <span>{Math.ceil(maxComparisonWeight * 0.25)} kg</span>
                  <span>0 kg</span>
                </div>

                {/* Chart area with lines */}
                <div className="absolute inset-0 pl-2">
                  {Object.values(comparisonData).map((userData, userIdx) => {
                    const sortedSessions = userData.sessions.sort((a, b) => 
                      new Date(a.date).getTime() - new Date(b.date).getTime()
                    )
                    return sortedSessions.map((session, idx) => {
                      if (idx === 0) return null
                      const prevSession = sortedSessions[idx - 1]
                      const x1 = (idx - 1) / (sortedSessions.length - 1) * 100
                      const x2 = idx / (sortedSessions.length - 1) * 100
                      const y1 = 100 - (prevSession.maxWeight / maxComparisonWeight * 100)
                      const y2 = 100 - (session.maxWeight / maxComparisonWeight * 100)
                      
                      return (
                        <svg 
                          key={`${userIdx}-${idx}`}
                          className="absolute inset-0 pointer-events-none"
                          style={{ width: '100%', height: '100%' }}
                        >
                          <line
                            x1={`${x1}%`}
                            y1={`${y1}%`}
                            x2={`${x2}%`}
                            y2={`${y2}%`}
                            stroke={userColors[userIdx % userColors.length]}
                            strokeWidth="3"
                          />
                        </svg>
                      )
                    })
                  })}
                  
                  {/* Data points */}
                  {Object.values(comparisonData).map((userData, userIdx) => {
                    const sortedSessions = userData.sessions.sort((a, b) => 
                      new Date(a.date).getTime() - new Date(b.date).getTime()
                    )
                    return sortedSessions.map((session, idx) => {
                      const x = idx / (sortedSessions.length - 1) * 100
                      const y = 100 - (session.maxWeight / maxComparisonWeight * 100)
                      
                      return (
                        <div
                          key={`point-${userIdx}-${idx}`}
                          className="absolute w-3 h-3 rounded-full -translate-x-1/2 -translate-y-1/2 group"
                          style={{
                            left: `${x}%`,
                            top: `${y}%`,
                            backgroundColor: userColors[userIdx % userColors.length]
                          }}
                          title={`${userData.name}: ${session.maxWeight}kg on ${new Date(session.date).toLocaleDateString()}`}
                        >
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                            {userData.name}: {session.maxWeight} kg
                            <div className="text-gray-400">{new Date(session.date).toLocaleDateString()}</div>
                          </div>
                        </div>
                      )
                    })
                  })}
                </div>
              </div>
              
              {/* Legend */}
              <div className="flex flex-wrap gap-3 justify-center">
                {Object.entries(comparisonData).map(([userId, userData], idx) => (
                  <div key={userId} className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: userColors[idx % userColors.length] }}
                    />
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 relative rounded-full overflow-hidden">
                        <Image 
                          src={isValidImagePath(userData.avatar) ? userData.avatar : DEFAULT_AVATAR}
                          alt={userData.name}
                          fill
                          sizes="24px"
                          className="object-cover"
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700">{userData.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : comparisonExercise && selectedFriends.length > 0 ? (
            <p className="text-gray-500 text-center py-4">No comparison data available</p>
          ) : (
            <p className="text-gray-500 text-center py-4">Select an exercise and friends to compare progress</p>
          )}
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
