'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useLocalStorage } from '@/lib/useLocalStorage'
import { supabase } from '@/lib/supabase'
import { User, Session, ExerciseSet, Reaction } from '@/lib/types'
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Avatar,
  AppBar,
  Toolbar,
  Chip,
  Stack,
  Paper,
  Tooltip,
  IconButton,
} from '@mui/material'
import { 
  ArrowBack as ArrowBackIcon,
  AddReaction as AddReactionIcon,
} from '@mui/icons-material'
import ReactionPicker from '@/components/ReactionPicker'

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
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false)
  const [selectedSessionForReaction, setSelectedSessionForReaction] = useState<string | null>(null)

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

    // Real-time subscriptions
    const timeoutId = setTimeout(() => {
      const sessionsChannel = supabase
        .channel('workout_sessions_' + syncCode, {
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
            console.log('Real-time sync enabled for sessions')
          }
        })

      const reactionsChannel = supabase
        .channel('workout_reactions_' + syncCode, {
          config: {
            broadcast: { self: true },
          },
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'session_reactions',
          filter: `sync_code=eq.${syncCode}`
        }, () => {
          fetchSessions()
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Real-time sync enabled for reactions')
          }
        })
      
      return () => { 
        supabase.removeChannel(sessionsChannel).catch(() => {})
        supabase.removeChannel(reactionsChannel).catch(() => {})
      }
    }, 500)
    
    return () => {
      clearTimeout(timeoutId)
    }
  }, [currentUser, router, mounted])

  const fetchSessions = async () => {
    // Fetch sessions
    const { data: sessionsData } = await supabase
      .from('shared_sessions')
      .select('*')
      .eq('sync_code', syncCode)
      .order('date', { ascending: false })
    
    if (sessionsData) {
      // Fetch reactions for all sessions
      const { data: reactionsData } = await supabase
        .from('session_reactions')
        .select('*')
        .eq('sync_code', syncCode)
        .order('created_at', { ascending: true })
      
      // Merge reactions into sessions
      const sessionsWithReactions = sessionsData.map(session => ({
        ...session,
        reactions: reactionsData?.filter(r => r.session_id === session.id) || []
      }))
      
      setSessions(sessionsWithReactions)
    }
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

  const handleAddReaction = (sessionId: string) => {
    setSelectedSessionForReaction(sessionId)
    setReactionPickerOpen(true)
  }

  const handleReactionSelect = async (category: string, emoji: string, gifUrl: string, gifId: string) => {
    if (!currentUser || !selectedSessionForReaction) return

    const newReaction: Omit<Reaction, 'id' | 'created_at'> = {
      session_id: selectedSessionForReaction,
      user_id: currentUser.id,
      user_name: currentUser.name,
      user_avatar: currentUser.avatar,
      category,
      emoji,
      gif_url: gifUrl,
      gif_id: gifId,
    }

    // Add to Supabase
    const { data, error } = await supabase
      .from('session_reactions')
      .insert([{ ...newReaction, sync_code: syncCode }])
      .select()
      .single()

    if (!error && data) {
      // Update local state
      setSessions(prevSessions => 
        prevSessions.map(session => {
          if (session.id === selectedSessionForReaction) {
            return {
              ...session,
              reactions: [...(session.reactions || []), data as Reaction]
            }
          }
          return session
        })
      )
    }

    setSelectedSessionForReaction(null)
  }

  // Body Part Heat Map - Get trained body parts this week
  const getBodyPartHeatMap = () => {
    const allBodyParts = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Cardio']
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    
    const bodyPartCounts: Record<string, number> = {}
    allBodyParts.forEach(part => bodyPartCounts[part] = 0)
    
    sessions.forEach(session => {
      if (new Date(session.date) >= oneWeekAgo) {
        session.participants?.forEach((p: any) => {
          if (p.user_id === currentUser?.id) {
            p.exercises?.forEach((ex: any) => {
              const exerciseLower = ex.exercise_name.toLowerCase()
              if (exerciseLower.includes('chest') || exerciseLower.includes('bench') || exerciseLower.includes('press')) {
                bodyPartCounts['Chest']++
              }
              if (exerciseLower.includes('back') || exerciseLower.includes('pull') || exerciseLower.includes('row') || exerciseLower.includes('deadlift')) {
                bodyPartCounts['Back']++
              }
              if (exerciseLower.includes('shoulder') || exerciseLower.includes('lateral') || exerciseLower.includes('overhead')) {
                bodyPartCounts['Shoulders']++
              }
              if (exerciseLower.includes('bicep') || exerciseLower.includes('tricep') || exerciseLower.includes('curl') || exerciseLower.includes('arm')) {
                bodyPartCounts['Arms']++
              }
              if (exerciseLower.includes('squat') || exerciseLower.includes('leg') || exerciseLower.includes('lunge') || exerciseLower.includes('calf')) {
                bodyPartCounts['Legs']++
              }
              if (exerciseLower.includes('core') || exerciseLower.includes('plank') || exerciseLower.includes('abs') || exerciseLower.includes('crunch')) {
                bodyPartCounts['Core']++
              }
              if (exerciseLower.includes('cardio') || exerciseLower.includes('run') || exerciseLower.includes('bike')) {
                bodyPartCounts['Cardio']++
              }
            })
          }
        })
      }
    })
    
    const maxCount = Math.max(...Object.values(bodyPartCounts), 1)
    
    return allBodyParts.map(part => ({
      name: part,
      count: bodyPartCounts[part],
      intensity: bodyPartCounts[part] / maxCount // 0 to 1
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
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar 
        position="sticky" 
        elevation={1}
        sx={{ 
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Container maxWidth="lg">
          <Toolbar 
            sx={{ 
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between', 
              py: { xs: 1.5, sm: 1 },
              gap: { xs: 1, sm: 0 },
              minHeight: { xs: 'auto', sm: 64 },
            }}
          >
            <Stack 
              direction="row" 
              spacing={{ xs: 1, sm: 2 }} 
              alignItems="center"
              sx={{ width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'space-between', sm: 'flex-start' } }}
            >
              <Button
                onClick={() => router.push('/dashboard')}
                sx={{ 
                  color: 'text.secondary',
                  '&:hover': { color: 'text.primary' },
                  minWidth: { xs: 'auto', sm: 'auto' },
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                }}
              >
                <ArrowBackIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
              </Button>
              <Typography 
                variant="h5" 
                fontWeight="bold" 
                color="text.primary"
                sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
              >
                Workout Tracker
              </Typography>
            </Stack>
            <Stack 
              direction="row" 
              spacing={{ xs: 1, sm: 2 }} 
              alignItems="center"
              sx={{ width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'space-between', sm: 'flex-end' } }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Avatar 
                  src={isValidImagePath(currentUser.avatar) ? currentUser.avatar : DEFAULT_AVATAR}
                  alt={currentUser.name}
                  sx={{ width: { xs: 28, sm: 32 }, height: { xs: 28, sm: 32 } }}
                />
                <Typography 
                  variant="body2" 
                  fontWeight="medium" 
                  color="text.primary"
                  sx={{ display: { xs: 'none', sm: 'block' } }}
                >
                  {currentUser.name}
                </Typography>
              </Stack>
              <Button
                onClick={handleLogout}
                size="small"
                sx={{ 
                  color: 'text.secondary',
                  '&:hover': { color: 'text.primary' },
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  minHeight: 36,
                }}
              >
                Switch
              </Button>
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 2, sm: 3 } }}>
        {/* Stats Cards */}
        <Box 
          sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: { xs: 1.5, sm: 2 },
            mb: { xs: 3, sm: 4 },
          }}
        >
          <Card>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Typography 
                variant="body2" 
                color="text.secondary" 
                gutterBottom
                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
              >
                Days in Last 30
              </Typography>
              <Typography 
                variant="h3" 
                fontWeight="bold" 
                color="primary"
                sx={{ fontSize: { xs: '2rem', sm: '3rem' } }}
              >
                {getGymDaysLast30()}
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Typography 
                variant="body2" 
                color="text.secondary" 
                gutterBottom
                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
              >
                Total Workouts
              </Typography>
              <Typography 
                variant="h3" 
                fontWeight="bold" 
                color="text.primary"
                sx={{ fontSize: { xs: '2rem', sm: '3rem' } }}
              >
                {sessions.filter(s => s.participants?.some((p: any) => p.user_id === currentUser?.id)).length}
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Typography 
                variant="body2" 
                color="text.secondary" 
                gutterBottom
                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
              >
                Exercises Tracked
              </Typography>
              <Typography 
                variant="h3" 
                fontWeight="bold" 
                color="text.primary"
                sx={{ fontSize: { xs: '2rem', sm: '3rem' } }}
              >
                {allExercises.length}
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Typography 
                variant="body2" 
                color="text.secondary" 
                gutterBottom
                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
              >
                This Month
              </Typography>
              <Typography 
                variant="h3" 
                fontWeight="bold" 
                color="text.primary"
                sx={{ fontSize: { xs: '2rem', sm: '3rem' } }}
              >
                {sessions.filter(s => {
                  const sessionDate = new Date(s.date)
                  const now = new Date()
                  return sessionDate.getMonth() === now.getMonth() && 
                         sessionDate.getFullYear() === now.getFullYear() &&
                         s.participants?.some((p: any) => p.user_id === currentUser?.id)
                }).length}
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {/* Achievement Badges */}
        {achievements.length > 0 && (
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                🏆 Achievements
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1.5}>
                {achievements.map((achievement, idx) => (
                  <Chip
                    key={idx}
                    icon={<span style={{ fontSize: '1.25rem' }}>{achievement.icon}</span>}
                    label={achievement.name}
                    sx={{
                      bgcolor: 
                        achievement.color === 'orange' ? '#FFF4E6' :
                        achievement.color === 'red' ? '#FFE5E5' :
                        achievement.color === 'yellow' ? '#FFFBEB' :
                        achievement.color === 'purple' ? '#F3E8FF' :
                        achievement.color === 'blue' ? '#EBF5FF' :
                        '#DCFCE7',
                      color:
                        achievement.color === 'orange' ? '#C2410C' :
                        achievement.color === 'red' ? '#DC2626' :
                        achievement.color === 'yellow' ? '#CA8A04' :
                        achievement.color === 'purple' ? '#7C3AED' :
                        achievement.color === 'blue' ? '#2563EB' :
                        '#16A34A',
                      fontWeight: 500,
                      '& .MuiChip-icon': {
                        ml: 1,
                      },
                    }}
                  />
                ))}
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Body Part Heat Map & Exercise Balance */}
        <Box 
          sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
            gap: 3,
            mb: 4,
          }}
        >
          {/* Body Part Heat Map */}
          <Card>
            <CardContent>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                💪 Body Parts This Week
              </Typography>
              <Box 
                sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 1.5,
                }}
              >
                {bodyPartHeatMap.map(part => {
                  const getHeatMapColor = (intensity: number) => {
                    if (intensity === 0) return { bgcolor: '#F3F4F6', color: '#9CA3AF', border: '#E5E7EB' }
                    if (intensity < 0.33) return { bgcolor: '#FEF3C7', color: '#B45309', border: '#FCD34D' }
                    if (intensity < 0.66) return { bgcolor: '#FFEDD5', color: '#C2410C', border: '#FDBA74' }
                    return { bgcolor: '#FEE2E2', color: '#DC2626', border: '#FCA5A5' }
                  }
                  
                  const colors = getHeatMapColor(part.intensity)
                  
                  return (
                    <Paper
                      key={part.name}
                      elevation={0}
                      sx={{
                        px: 2,
                        py: 1.5,
                        textAlign: 'center',
                        fontWeight: 500,
                        transition: 'all 0.2s',
                        bgcolor: colors.bgcolor,
                        color: colors.color,
                        border: '2px solid',
                        borderColor: colors.border,
                        borderRadius: 2,
                      }}
                    >
                      <Typography variant="body2" fontWeight="medium">
                        {part.name}
                      </Typography>
                      {part.count > 0 && (
                        <Typography variant="caption" sx={{ opacity: 0.75, display: 'block', mt: 0.5 }}>
                          {part.count} exercise{part.count !== 1 ? 's' : ''}
                        </Typography>
                      )}
                    </Paper>
                  )
                })}
              </Box>
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">Less</Typography>
                <Stack direction="row" spacing={0.5}>
                  <Box sx={{ width: 24, height: 24, borderRadius: 1, bgcolor: '#F3F4F6', border: '1px solid #E5E7EB' }} />
                  <Box sx={{ width: 24, height: 24, borderRadius: 1, bgcolor: '#FEF3C7', border: '1px solid #FCD34D' }} />
                  <Box sx={{ width: 24, height: 24, borderRadius: 1, bgcolor: '#FFEDD5', border: '1px solid #FDBA74' }} />
                  <Box sx={{ width: 24, height: 24, borderRadius: 1, bgcolor: '#FEE2E2', border: '1px solid #FCA5A5' }} />
                </Stack>
                <Typography variant="caption" color="text.secondary">More</Typography>
              </Stack>
            </CardContent>
          </Card>

          {/* Exercise Balance */}
          <Card>
            <CardContent>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                ⚖️ Exercise Balance
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography variant="body2" fontWeight="medium" sx={{ color: '#6366F1' }}>
                      Push
                    </Typography>
                    <Typography variant="body2" fontWeight="bold" sx={{ color: '#6366F1' }}>
                      {exerciseBalance.percentages.Push}%
                    </Typography>
                  </Stack>
                  <Box sx={{ width: '100%', bgcolor: '#E5E7EB', borderRadius: 999, height: 12 }}>
                    <Box 
                      sx={{ 
                        bgcolor: '#6366F1', 
                        height: 12, 
                        borderRadius: 999,
                        transition: 'width 0.3s',
                        width: `${exerciseBalance.percentages.Push}%`,
                      }}
                    />
                  </Box>
                </Box>
                <Box>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography variant="body2" fontWeight="medium" sx={{ color: '#10B981' }}>
                      Pull
                    </Typography>
                    <Typography variant="body2" fontWeight="bold" sx={{ color: '#10B981' }}>
                      {exerciseBalance.percentages.Pull}%
                    </Typography>
                  </Stack>
                  <Box sx={{ width: '100%', bgcolor: '#E5E7EB', borderRadius: 999, height: 12 }}>
                    <Box 
                      sx={{ 
                        bgcolor: '#10B981', 
                        height: 12, 
                        borderRadius: 999,
                        transition: 'width 0.3s',
                        width: `${exerciseBalance.percentages.Pull}%`,
                      }}
                    />
                  </Box>
                </Box>
                <Box>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography variant="body2" fontWeight="medium" sx={{ color: '#F59E0B' }}>
                      Legs
                    </Typography>
                    <Typography variant="body2" fontWeight="bold" sx={{ color: '#F59E0B' }}>
                      {exerciseBalance.percentages.Legs}%
                    </Typography>
                  </Stack>
                  <Box sx={{ width: '100%', bgcolor: '#E5E7EB', borderRadius: 999, height: 12 }}>
                    <Box 
                      sx={{ 
                        bgcolor: '#F59E0B', 
                        height: 12, 
                        borderRadius: 999,
                        transition: 'width 0.3s',
                        width: `${exerciseBalance.percentages.Legs}%`,
                      }}
                    />
                  </Box>
                </Box>
                {exerciseBalance.percentages.Other > 0 && (
                  <Box>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                      <Typography variant="body2" fontWeight="medium" color="text.secondary">
                        Other
                      </Typography>
                      <Typography variant="body2" fontWeight="bold" color="text.secondary">
                        {exerciseBalance.percentages.Other}%
                      </Typography>
                    </Stack>
                    <Box sx={{ width: '100%', bgcolor: '#E5E7EB', borderRadius: 999, height: 12 }}>
                      <Box 
                        sx={{ 
                          bgcolor: '#6B7280', 
                          height: 12, 
                          borderRadius: 999,
                          transition: 'width 0.3s',
                          width: `${exerciseBalance.percentages.Other}%`,
                        }}
                      />
                    </Box>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Box>

        {/* Personal Records */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              🎯 Personal Records
            </Typography>
            {personalRecords.length > 0 ? (
              <Box 
                sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
                  gap: 2,
                }}
              >
                {personalRecords.slice(0, 9).map(([name, pr]) => (
                  <Paper
                    key={name}
                    elevation={0}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      p: 2,
                      transition: 'border-color 0.2s',
                      '&:hover': {
                        borderColor: 'primary.main',
                      },
                    }}
                  >
                    <Typography variant="body2" fontWeight="medium" color="text.secondary" gutterBottom>
                      {name}
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="primary">
                      {pr.weight} kg
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      {new Date(pr.date).toLocaleDateString()}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            ) : (
              <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
                No personal records yet
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Leaderboards */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              🏅 Leaderboards
            </Typography>
            <Box sx={{ mb: 3 }}>
              <FormControl fullWidth sx={{ maxWidth: { md: '50%' } }}>
                <InputLabel>Select Exercise</InputLabel>
                <Select
                  value={selectedLeaderboardExercise}
                  onChange={(e) => setSelectedLeaderboardExercise(e.target.value)}
                  label="Select Exercise"
                >
                  <MenuItem value="">Choose an exercise...</MenuItem>
                  {allExercises.map(ex => (
                    <MenuItem key={ex} value={ex}>{ex}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            {leaderboard.length > 0 ? (
              <Stack spacing={1}>
                {leaderboard.map((entry, idx) => (
                  <Paper
                    key={idx}
                    elevation={0}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: 
                        idx === 0 ? '#FFFBEB' :
                        idx === 1 ? '#F9FAFB' :
                        idx === 2 ? '#FFF7ED' :
                        '#F9FAFB',
                      border: '2px solid',
                      borderColor:
                        idx === 0 ? '#FCD34D' :
                        idx === 1 ? '#D1D5DB' :
                        idx === 2 ? '#FDBA74' :
                        'transparent',
                    }}
                  >
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Typography 
                        variant="h5" 
                        fontWeight="bold"
                        sx={{
                          color:
                            idx === 0 ? '#D97706' :
                            idx === 1 ? '#6B7280' :
                            idx === 2 ? '#EA580C' :
                            '#9CA3AF',
                        }}
                      >
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </Typography>
                      <Avatar 
                        src={isValidImagePath(entry.avatar) ? entry.avatar : DEFAULT_AVATAR}
                        alt={entry.name}
                        sx={{ width: 40, height: 40 }}
                      />
                      <Typography fontWeight="medium" color="text.primary">
                        {entry.name}
                      </Typography>
                    </Stack>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="h6" fontWeight="bold" color="primary">
                        {entry.maxWeight} kg
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(entry.date).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Paper>
                ))}
              </Stack>
            ) : selectedLeaderboardExercise ? (
              <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
                No data found for this exercise
              </Typography>
            ) : (
              <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
                Select an exercise to view leaderboard
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Progress Comparison */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              📊 Compare with Friends
            </Typography>
            <Box 
              sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                gap: 2,
                mb: 3,
              }}
            >
              <FormControl fullWidth>
                <InputLabel>Select Exercise</InputLabel>
                <Select
                  value={comparisonExercise}
                  onChange={(e) => setComparisonExercise(e.target.value)}
                  label="Select Exercise"
                >
                  <MenuItem value="">Choose an exercise...</MenuItem>
                  {allExercises.map(ex => (
                    <MenuItem key={ex} value={ex}>{ex}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Box>
                <Typography variant="body2" fontWeight="medium" color="text.secondary" gutterBottom>
                  Select Friends to Compare
                </Typography>
                <Box 
                  sx={{ 
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 1,
                    maxHeight: 128,
                    overflowY: 'auto',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 1,
                  }}
                >
                  {users.filter(u => u.id !== currentUser?.id).map(user => (
                    <Chip
                      key={user.id}
                      label={user.name}
                      onClick={() => {
                        if (selectedFriends.includes(user.id)) {
                          setSelectedFriends(selectedFriends.filter(id => id !== user.id))
                        } else {
                          setSelectedFriends([...selectedFriends, user.id])
                        }
                      }}
                      color={selectedFriends.includes(user.id) ? 'primary' : 'default'}
                      sx={{
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    />
                  ))}
                </Box>
              </Box>
            </Box>
            {Object.keys(comparisonData).length > 0 ? (
              <Box>
                <Box 
                  sx={{ 
                    position: 'relative',
                    height: 256,
                    borderLeft: '2px solid',
                    borderBottom: '2px solid',
                    borderColor: 'divider',
                    mb: 2,
                  }}
                >
                  {/* Y-axis labels */}
                  <Box 
                    sx={{ 
                      position: 'absolute',
                      left: -48,
                      top: 0,
                      bottom: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      fontSize: '0.75rem',
                      color: 'text.secondary',
                    }}
                  >
                    <span>{Math.ceil(maxComparisonWeight)} kg</span>
                    <span>{Math.ceil(maxComparisonWeight * 0.75)} kg</span>
                    <span>{Math.ceil(maxComparisonWeight * 0.5)} kg</span>
                    <span>{Math.ceil(maxComparisonWeight * 0.25)} kg</span>
                    <span>0 kg</span>
                  </Box>

                  {/* Chart area with lines */}
                  <Box sx={{ position: 'absolute', inset: 0, pl: 1 }}>
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
                            style={{ 
                              position: 'absolute',
                              inset: 0,
                              pointerEvents: 'none',
                              width: '100%',
                              height: '100%',
                            }}
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
                          <Box
                            key={`point-${userIdx}-${idx}`}
                            sx={{
                              position: 'absolute',
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              transform: 'translate(-50%, -50%)',
                              left: `${x}%`,
                              top: `${y}%`,
                              bgcolor: userColors[userIdx % userColors.length],
                              '&:hover .tooltip': {
                                display: 'block',
                              },
                            }}
                            title={`${userData.name}: ${session.maxWeight}kg on ${new Date(session.date).toLocaleDateString()}`}
                          >
                            <Box
                              className="tooltip"
                              sx={{
                                position: 'absolute',
                                bottom: '100%',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                mb: 1,
                                display: 'none',
                                bgcolor: '#111827',
                                color: 'white',
                                fontSize: '0.75rem',
                                borderRadius: 1,
                                px: 1,
                                py: 0.5,
                                whiteSpace: 'nowrap',
                                zIndex: 10,
                              }}
                            >
                              {userData.name}: {session.maxWeight} kg
                              <Box sx={{ color: '#9CA3AF' }}>
                                {new Date(session.date).toLocaleDateString()}
                              </Box>
                            </Box>
                          </Box>
                        )
                      })
                    })}
                  </Box>
                </Box>
                
                {/* Legend */}
                <Stack direction="row" flexWrap="wrap" spacing={2} justifyContent="center">
                  {Object.entries(comparisonData).map(([userId, userData], idx) => (
                    <Stack key={userId} direction="row" spacing={1} alignItems="center">
                      <Box 
                        sx={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          bgcolor: userColors[idx % userColors.length],
                        }}
                      />
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar 
                          src={isValidImagePath(userData.avatar) ? userData.avatar : DEFAULT_AVATAR}
                          alt={userData.name}
                          sx={{ width: 24, height: 24 }}
                        />
                        <Typography variant="body2" fontWeight="medium" color="text.secondary">
                          {userData.name}
                        </Typography>
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            ) : comparisonExercise && selectedFriends.length > 0 ? (
              <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
                No comparison data available
              </Typography>
            ) : (
              <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
                Select an exercise and friends to compare progress
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Top Exercises */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Top 5 Exercises
            </Typography>
            <Stack spacing={2}>
              {topExercises.map(([name, count], idx) => (
                <Stack key={name} direction="row" alignItems="center" justifyContent="space-between">
                  <Stack direction="row" alignItems="center" spacing={2} sx={{ flex: 1 }}>
                    <Typography variant="h6" fontWeight="bold" color="text.disabled">
                      #{idx + 1}
                    </Typography>
                    <Typography fontWeight="medium" color="text.primary">
                      {name}
                    </Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Box sx={{ width: 128, bgcolor: '#E5E7EB', borderRadius: 999, height: 8 }}>
                      <Box 
                        sx={{ 
                          bgcolor: 'primary.main',
                          height: 8,
                          borderRadius: 999,
                          width: `${(count / topExercises[0][1]) * 100}%`,
                        }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ width: 80, textAlign: 'right' }}>
                      {count} sessions
                    </Typography>
                  </Stack>
                </Stack>
              ))}
              {topExercises.length === 0 && (
                <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
                  No exercise data yet
                </Typography>
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* Exercise Progress Chart */}
        <Card>
          <CardContent>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Exercise Progress Tracker
            </Typography>
            
            {/* Exercise Selector and Options */}
            <Box 
              sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                gap: 2,
                mb: 3,
              }}
            >
              <FormControl fullWidth>
                <InputLabel>Select Exercise</InputLabel>
                <Select
                  value={selectedExercise}
                  onChange={(e) => setSelectedExercise(e.target.value)}
                  label="Select Exercise"
                >
                  <MenuItem value="">Choose an exercise...</MenuItem>
                  {allExercises.map(ex => (
                    <MenuItem key={ex} value={ex}>{ex}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Box>
                <Typography variant="body2" fontWeight="medium" color="text.secondary" gutterBottom>
                  View Mode
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    onClick={() => setShowAllTime(true)}
                    variant={showAllTime ? 'contained' : 'outlined'}
                    fullWidth
                    sx={{ textTransform: 'none' }}
                  >
                    All Time
                  </Button>
                  <Button
                    onClick={() => setShowAllTime(false)}
                    variant={!showAllTime ? 'contained' : 'outlined'}
                    fullWidth
                    sx={{ textTransform: 'none' }}
                  >
                    Limited
                  </Button>
                </Stack>
              </Box>
              {!showAllTime && (
                <FormControl fullWidth>
                  <InputLabel>Sessions to Show</InputLabel>
                  <Select
                    value={sessionLimit}
                    onChange={(e) => setSessionLimit(Number(e.target.value))}
                    label="Sessions to Show"
                  >
                    <MenuItem value={5}>5</MenuItem>
                    <MenuItem value={10}>10</MenuItem>
                    <MenuItem value={20}>20</MenuItem>
                    <MenuItem value={50}>50</MenuItem>
                    <MenuItem value={100}>100</MenuItem>
                  </Select>
                </FormControl>
              )}
            </Box>

            {/* Chart */}
            {exerciseProgress && exerciseProgress.sessions.length > 0 ? (
              <Stack spacing={3}>
                <Box>
                  <Typography variant="body2" fontWeight="bold" color="text.secondary" gutterBottom>
                    Max Weight Progress
                  </Typography>
                  <Box 
                    sx={{ 
                      position: 'relative',
                      height: 256,
                      borderLeft: '2px solid',
                      borderBottom: '2px solid',
                      borderColor: 'divider',
                    }}
                  >
                    {/* Y-axis labels */}
                    <Box 
                      sx={{ 
                        position: 'absolute',
                        left: -48,
                        top: 0,
                        bottom: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        fontSize: '0.75rem',
                        color: 'text.secondary',
                      }}
                    >
                      <span>{Math.ceil(maxWeightInData)} kg</span>
                      <span>{Math.ceil(maxWeightInData * 0.75)} kg</span>
                      <span>{Math.ceil(maxWeightInData * 0.5)} kg</span>
                      <span>{Math.ceil(maxWeightInData * 0.25)} kg</span>
                      <span>0 kg</span>
                    </Box>

                    {/* Chart area */}
                    <Box 
                      sx={{ 
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'space-around',
                        px: 1,
                      }}
                    >
                      {exerciseProgress.sessions.slice().reverse().map((session, idx) => {
                        const heightPercent = maxWeightInData > 0 ? (session.max_weight / maxWeightInData) * 100 : 0
                        return (
                          <Box 
                            key={idx} 
                            sx={{ 
                              flex: 1,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              mx: 0.125,
                              position: 'relative',
                              '&:hover .tooltip': {
                                display: 'block',
                              },
                            }}
                          >
                            <Box sx={{ position: 'relative', width: '100%' }}>
                              <Box 
                                sx={{
                                  width: '100%',
                                  bgcolor: 'primary.main',
                                  transition: 'all 0.2s',
                                  borderTopLeftRadius: 1,
                                  borderTopRightRadius: 1,
                                  cursor: 'pointer',
                                  height: `${Math.max(heightPercent * 2.4, 4)}px`,
                                  '&:hover': {
                                    bgcolor: 'primary.dark',
                                  },
                                }}
                                title={`${session.max_weight} kg on ${new Date(session.date).toLocaleDateString()}`}
                              />
                              {/* Tooltip */}
                              <Box
                                className="tooltip"
                                sx={{
                                  position: 'absolute',
                                  bottom: '100%',
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  mb: 1,
                                  display: 'none',
                                  bgcolor: '#111827',
                                  color: 'white',
                                  fontSize: '0.75rem',
                                  borderRadius: 1,
                                  px: 1,
                                  py: 0.5,
                                  whiteSpace: 'nowrap',
                                  zIndex: 10,
                                }}
                              >
                                {session.max_weight} kg
                                <Box sx={{ color: '#9CA3AF' }}>
                                  {new Date(session.date).toLocaleDateString()}
                                </Box>
                              </Box>
                            </Box>
                          </Box>
                        )
                      })}
                    </Box>
                  </Box>
                  {/* X-axis - simplified */}
                  <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(exerciseProgress.sessions[exerciseProgress.sessions.length - 1]?.date).toLocaleDateString()}
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      ← Time →
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(exerciseProgress.sessions[0]?.date).toLocaleDateString()}
                    </Typography>
                  </Stack>
                </Box>

                {/* Session Details Table */}
                <Box>
                  <Typography variant="body2" fontWeight="bold" color="text.secondary" gutterBottom>
                    Session Details
                  </Typography>
                  <Box sx={{ overflowX: 'auto' }}>
                    <Box
                      component="table"
                      sx={{
                        minWidth: '100%',
                        borderCollapse: 'separate',
                        borderSpacing: 0,
                      }}
                    >
                      <Box component="thead" sx={{ bgcolor: 'background.paper' }}>
                        <Box component="tr">
                          <Box 
                            component="th" 
                            sx={{ 
                              px: 2,
                              py: 1,
                              textAlign: 'left',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              color: 'text.secondary',
                            }}
                          >
                            Date
                          </Box>
                          <Box 
                            component="th" 
                            sx={{ 
                              px: 2,
                              py: 1,
                              textAlign: 'left',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              color: 'text.secondary',
                            }}
                          >
                            Max Weight
                          </Box>
                          <Box 
                            component="th" 
                            sx={{ 
                              px: 2,
                              py: 1,
                              textAlign: 'left',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              color: 'text.secondary',
                            }}
                          >
                            Total Volume
                          </Box>
                        </Box>
                      </Box>
                      <Box component="tbody" sx={{ bgcolor: 'background.default' }}>
                        {exerciseProgress.sessions.map((session, idx) => (
                          <Box 
                            component="tr" 
                            key={idx}
                            sx={{
                              '&:hover': {
                                bgcolor: 'background.paper',
                              },
                            }}
                          >
                            <Box 
                              component="td" 
                              sx={{ 
                                px: 2,
                                py: 1,
                                fontSize: '0.875rem',
                                color: 'text.primary',
                                borderTop: '1px solid',
                                borderColor: 'divider',
                              }}
                            >
                              {new Date(session.date).toLocaleDateString()}
                            </Box>
                            <Box 
                              component="td" 
                              sx={{ 
                                px: 2,
                                py: 1,
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                color: 'primary.main',
                                borderTop: '1px solid',
                                borderColor: 'divider',
                              }}
                            >
                              {session.max_weight} kg
                            </Box>
                            <Box 
                              component="td" 
                              sx={{ 
                                px: 2,
                                py: 1,
                                fontSize: '0.875rem',
                                color: 'text.secondary',
                                borderTop: '1px solid',
                                borderColor: 'divider',
                              }}
                            >
                              {session.total_volume.toLocaleString()} kg
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Stack>
            ) : selectedExercise ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography color="text.secondary">
                  No data found for this exercise
                </Typography>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography color="text.secondary">
                  Select an exercise to view progress
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Recent Sessions with Reactions */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
              💬 Recent Sessions
            </Typography>
            {sessions.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" py={4}>
                No sessions yet
              </Typography>
            ) : (
              <Stack spacing={3}>
                {sessions.slice(0, 5).map((session) => (
                  <Paper
                    key={session.id}
                    elevation={0}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: '20px',
                      p: { xs: 2, sm: 3 },
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: 'primary.main',
                        boxShadow: 2,
                      },
                    }}
                  >
                    {/* Session Header */}
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                      <Box>
                        <Typography variant="h6" fontWeight="600" sx={{ mb: 0.5 }}>
                          {session.type}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <Typography variant="body2" color="text.secondary">
                            {new Date(session.date).toLocaleDateString()}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">•</Typography>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Avatar 
                              src={isValidImagePath(session.creator_avatar) ? session.creator_avatar : DEFAULT_AVATAR}
                              alt={session.creator_name}
                              sx={{ width: 20, height: 20 }}
                            />
                            <Typography variant="body2" fontWeight="500">
                              {session.creator_name}
                            </Typography>
                          </Stack>
                        </Stack>
                      </Box>
                      <Tooltip title="Add Reaction">
                        <IconButton 
                          onClick={() => handleAddReaction(session.id)}
                          sx={{
                            color: 'primary.main',
                            '&:hover': {
                              bgcolor: 'primary.light',
                            },
                          }}
                        >
                          <AddReactionIcon />
                        </IconButton>
                      </Tooltip>
                    </Stack>

                    {/* Participants Summary */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Participants: {session.participants?.length || 0}
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                        {session.participants?.map((p: any, idx: number) => (
                          <Chip
                            key={idx}
                            avatar={<Avatar src={isValidImagePath(p.user_avatar) ? p.user_avatar : DEFAULT_AVATAR} alt={p.user_name} />}
                            label={p.user_name}
                            size="small"
                            sx={{ borderRadius: '12px' }}
                          />
                        ))}
                      </Stack>
                    </Box>

                    {/* Reactions */}
                    {session.reactions && session.reactions.length > 0 && (
                      <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                          Reactions
                        </Typography>
                        <Box sx={{ 
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                          gap: 2,
                        }}>
                          {session.reactions.map((reaction) => (
                            <Box
                              key={reaction.id}
                              sx={{
                                position: 'relative',
                                borderRadius: '16px',
                                overflow: 'hidden',
                                height: 150,
                                border: '2px solid',
                                borderColor: 'divider',
                              }}
                            >
                              <Box
                                component="img"
                                src={reaction.gif_url}
                                alt={reaction.category}
                                sx={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                }}
                              />
                              <Box
                                sx={{
                                  position: 'absolute',
                                  bottom: 0,
                                  left: 0,
                                  right: 0,
                                  bgcolor: 'rgba(0, 0, 0, 0.7)',
                                  backdropFilter: 'blur(4px)',
                                  p: 1,
                                }}
                              >
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Avatar 
                                    src={isValidImagePath(reaction.user_avatar) ? reaction.user_avatar : DEFAULT_AVATAR}
                                    alt={reaction.user_name}
                                    sx={{ width: 24, height: 24 }}
                                  />
                                  <Typography variant="caption" color="white" fontWeight="500">
                                    {reaction.user_name}
                                  </Typography>
                                  <Typography variant="caption" color="white">
                                    {reaction.emoji} {reaction.category}
                                  </Typography>
                                </Stack>
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Paper>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Container>

      {/* Reaction Picker Dialog */}
      <ReactionPicker
        open={reactionPickerOpen}
        onClose={() => {
          setReactionPickerOpen(false)
          setSelectedSessionForReaction(null)
        }}
        onSelectReaction={handleReactionSelect}
      />
    </Box>
  )
}
