'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useLocalStorage } from '@/lib/useLocalStorage'
import { supabase } from '@/lib/supabase'
import { User, Session, ParticipantData, Exercise, ExerciseSet, Reaction } from '@/lib/types'
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Avatar,
  AppBar,
  Toolbar,
  Chip,
  Stack,
  Paper,
  Tooltip,
} from '@mui/material'
import {
  Add as AddIcon,
  FitnessCenter as FitnessIcon,
  BarChart as BarChartIcon,
  Delete as DeleteIcon,
  AddReaction as AddReactionIcon,
} from '@mui/icons-material'
import ReactionPicker from '@/components/ReactionPicker'

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
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false)
  const [selectedSessionForReaction, setSelectedSessionForReaction] = useState<string | null>(null)
  
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
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" sx={{ bgcolor: 'background.paper', boxShadow: 1 }}>
        <Container maxWidth="lg">
          <Toolbar 
            sx={{ 
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between', 
              minHeight: { xs: 'auto', sm: '64px' },
              py: { xs: 1.5, sm: 1 },
              gap: { xs: 1.5, sm: 0 },
            }}
          >
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 700, 
                color: 'text.primary',
                fontSize: { xs: '1.125rem', sm: '1.25rem' },
                width: { xs: '100%', sm: 'auto' },
                textAlign: { xs: 'center', sm: 'left' },
              }}
            >
              Training Tracker
            </Typography>
            <Stack 
              direction="row" 
              spacing={{ xs: 1, sm: 2 }} 
              alignItems="center"
              sx={{ width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'space-between', sm: 'flex-end' } }}
            >
              <Button
                onClick={() => router.push('/workouts')}
                variant="outlined"
                startIcon={<BarChartIcon sx={{ display: { xs: 'none', sm: 'inline' } }} />}
                size="small"
                sx={{
                  borderRadius: '20px',
                  textTransform: 'none',
                  transition: 'all 0.3s ease',
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  px: { xs: 2, sm: 2 },
                  minHeight: 36,
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 2,
                  },
                }}
              >
                Workouts
              </Button>
              <Stack direction="row" spacing={1} alignItems="center">
                <Avatar 
                  src={isValidImagePath(currentUser.avatar) ? currentUser.avatar : DEFAULT_AVATAR}
                  alt={currentUser.name}
                  sx={{ width: { xs: 28, sm: 32 }, height: { xs: 28, sm: 32 } }}
                />
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 500, 
                    color: 'text.primary',
                    display: { xs: 'none', sm: 'block' },
                  }}
                >
                  {currentUser.name}
                </Typography>
              </Stack>
              <Button
                onClick={handleLogout}
                variant="text"
                sx={{
                  textTransform: 'none',
                  color: 'text.secondary',
                  '&:hover': { color: 'text.primary' },
                }}
              >
                Switch User
              </Button>
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 2, sm: 3 } }}>
        <Stack 
          direction={{ xs: 'column', sm: 'row' }} 
          justifyContent="space-between" 
          alignItems={{ xs: 'stretch', sm: 'center' }} 
          sx={{ mb: { xs: 2, sm: 4 }, gap: { xs: 1.5, sm: 0 } }}
        >
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 700, 
              color: 'text.primary',
              fontSize: { xs: '1.5rem', sm: '2rem' },
              textAlign: { xs: 'center', sm: 'left' },
            }}
          >
            Training Sessions
          </Typography>
          <Button
            onClick={() => setShowForm(!showForm)}
            variant="contained"
            startIcon={showForm ? null : <AddIcon />}
            fullWidth={true}
            sx={{
              borderRadius: '20px',
              textTransform: 'none',
              px: 3,
              py: { xs: 1.5, sm: 1.5 },
              fontWeight: 600,
              minHeight: 44,
              fontSize: { xs: '0.9375rem', sm: '1rem' },
              transition: 'all 0.3s ease',
              display: { xs: 'flex', sm: 'inline-flex' },
              maxWidth: { sm: 'fit-content' },
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 4,
              },
            }}
          >
            {showForm ? 'Cancel' : 'Add Session'}
          </Button>
        </Stack>

        {showForm && (
          <Card 
            sx={{ 
              mb: 4, 
              borderRadius: '20px',
              boxShadow: 3,
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: 6,
              },
            }}
          >
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 600, 
                  mb: { xs: 2, sm: 3 },
                  fontSize: { xs: '1.125rem', sm: '1.25rem' },
                }}
              >
                New Gym Session
              </Typography>
              <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 3 } }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField
                    type="date"
                    label="Date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '20px',
                        minHeight: { xs: 48, sm: 56 },
                      },
                      '& .MuiInputBase-input': {
                        fontSize: { xs: '1rem', sm: '1rem' },
                      },
                    }}
                  />
                  <FormControl fullWidth required>
                    <InputLabel>Body Part</InputLabel>
                    <Select
                      value={formData.type}
                      label="Body Part"
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      sx={{
                        borderRadius: '20px',
                        minHeight: { xs: 48, sm: 56 },
                        '& .MuiSelect-select': {
                          fontSize: { xs: '1rem', sm: '1rem' },
                        },
                      }}
                    >
                      <MenuItem value="">Select body part...</MenuItem>
                      {BODY_PARTS.map(part => (
                        <MenuItem key={part} value={part}>{part}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>

                {/* Session Exercises - Shared by all participants */}
                {formData.type && (
                  <Paper 
                    sx={{ 
                      p: { xs: 2, sm: 2.5 }, 
                      bgcolor: 'primary.50',
                      border: 2,
                      borderColor: 'primary.200',
                      borderRadius: '20px',
                    }}
                  >
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 500, 
                        mb: 2, 
                        color: 'text.primary',
                        fontSize: { xs: '0.875rem', sm: '0.875rem' },
                      }}
                    >
                      Exercises for this session (everyone does these)
                    </Typography>
                    
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
                      <FormControl fullWidth size="small">
                        <Select
                          displayEmpty
                          onChange={(e) => {
                            if (e.target.value) {
                              addExerciseToSession(e.target.value as string)
                              e.target.value = ''
                            }
                          }}
                          sx={{ 
                            borderRadius: '20px', 
                            bgcolor: 'background.paper',
                            minHeight: { xs: 44, sm: 40 },
                            '& .MuiSelect-select': {
                              fontSize: { xs: '0.9375rem', sm: '0.875rem' },
                            },
                          }}
                        >
                          <MenuItem value="">+ Add Exercise</MenuItem>
                          {getAvailableExercises(formData.type).map(ex => (
                            <MenuItem key={ex} value={ex}>{ex}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Button
                        type="button"
                        variant="contained"
                        fullWidth={true}
                        onClick={() => {
                          const name = prompt('Enter custom exercise name:')
                          if (name && name.trim()) {
                            addCustomExercise(formData.type, name.trim())
                            addExerciseToSession(name.trim())
                          }
                        }}
                        sx={{
                          borderRadius: '20px',
                          textTransform: 'none',
                          fontWeight: 600,
                          px: 3,
                          minHeight: { xs: 44, sm: 40 },
                          whiteSpace: 'nowrap',
                          maxWidth: { sm: 'fit-content' },
                        }}
                      >
                        Custom
                      </Button>
                    </Stack>

                    {sessionExercises.length > 0 && (
                      <Stack spacing={1}>
                        {sessionExercises.map((exerciseName, idx) => (
                          <Box 
                            key={idx} 
                            sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between',
                              bgcolor: 'background.paper',
                              px: 2,
                              py: 1.5,
                              borderRadius: '20px',
                              border: 1,
                              borderColor: 'divider',
                            }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {exerciseName}
                            </Typography>
                            <Button
                              type="button"
                              size="small"
                              onClick={() => removeExerciseFromSession(exerciseName)}
                              sx={{
                                color: 'error.main',
                                textTransform: 'none',
                                minWidth: 'auto',
                                '&:hover': { color: 'error.dark' },
                              }}
                            >
                              Remove
                            </Button>
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </Paper>
                )}

                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                      Participants
                    </Typography>
                    <Button
                      type="button"
                      onClick={addParticipant}
                      startIcon={<AddIcon />}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        color: 'primary.main',
                        '&:hover': { color: 'primary.dark' },
                      }}
                    >
                      Add Person
                    </Button>
                  </Stack>
                  
                  <Stack spacing={3}>
                    {participants.map((participant, pIdx) => (
                      <Card 
                        key={pIdx} 
                        sx={{ 
                          border: 2, 
                          borderColor: 'divider',
                          borderRadius: '20px',
                          boxShadow: 1,
                        }}
                      >
                        <CardContent sx={{ p: 2.5 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <Avatar 
                                src={isValidImagePath(participant.user_avatar) ? participant.user_avatar : DEFAULT_AVATAR}
                                alt={participant.user_name || 'User'}
                                sx={{ width: 40, height: 40 }}
                              />
                              <FormControl size="small" required sx={{ minWidth: 180 }}>
                                <Select
                                  value={participant.user_id}
                                  onChange={(e) => {
                                    const user = users.find(u => u.id === e.target.value)
                                    if (user) selectUserForParticipant(pIdx, user)
                                  }}
                                  displayEmpty
                                  sx={{
                                    borderRadius: '20px',
                                    fontWeight: 500,
                                  }}
                                >
                                  <MenuItem value="">Select person...</MenuItem>
                                  {users.map(user => (
                                    <MenuItem key={user.id} value={user.id}>{user.name}</MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Stack>
                            {participants.length > 1 && (
                              <Button
                                type="button"
                                onClick={() => removeParticipant(pIdx)}
                                startIcon={<DeleteIcon />}
                                sx={{
                                  color: 'error.main',
                                  textTransform: 'none',
                                  fontWeight: 600,
                                  '&:hover': { color: 'error.dark' },
                                }}
                              >
                                Remove Person
                              </Button>
                            )}
                          </Stack>

                          {/* Exercise List */}
                          <Stack spacing={2} sx={{ mb: 2 }}>
                            {participant.exercises.map((exercise, eIdx) => (
                              <Paper 
                                key={eIdx} 
                                elevation={0}
                                sx={{ 
                                  border: 1,
                                  borderColor: 'divider',
                                  borderRadius: '20px',
                                  p: 2,
                                  bgcolor: 'grey.50',
                                }}
                              >
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
                                  {exercise.exercise_name}
                                </Typography>
                                
                                {/* Sets */}
                                <Stack spacing={1} sx={{ mb: 1.5 }}>{exercise.sets.map((set, sIdx) => (
                                    <Stack key={sIdx} direction="row" alignItems="center" spacing={1}>
                                      <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 48 }}>
                                        Set {set.set_number}
                                      </Typography>
                                      <TextField
                                        type="number"
                                        size="small"
                                        inputProps={{ min: 0 }}
                                        value={set.weight || ''}
                                        onChange={(e) => updateSet(pIdx, eIdx, sIdx, 'weight', parseFloat(e.target.value) || 0)}
                                        placeholder="Weight"
                                        sx={{
                                          width: 80,
                                          '& .MuiOutlinedInput-root': {
                                            borderRadius: '12px',
                                          },
                                        }}
                                      />
                                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                        kg ×
                                      </Typography>
                                      <TextField
                                        type="number"
                                        size="small"
                                        inputProps={{ min: 0 }}
                                        value={set.reps || ''}
                                        onChange={(e) => updateSet(pIdx, eIdx, sIdx, 'reps', parseInt(e.target.value) || 0)}
                                        placeholder="Reps"
                                        sx={{
                                          width: 64,
                                          '& .MuiOutlinedInput-root': {
                                            borderRadius: '12px',
                                          },
                                        }}
                                      />
                                      {exercise.sets.length > 1 && (
                                        <IconButton
                                          type="button"
                                          size="small"
                                          onClick={() => removeSetFromExercise(pIdx, eIdx, sIdx)}
                                          sx={{
                                            color: 'error.main',
                                            '&:hover': { color: 'error.dark' },
                                          }}
                                        >
                                          <DeleteIcon fontSize="small" />
                                        </IconButton>
                                      )}
                                    </Stack>
                                  ))}
                                </Stack>
                                
                                <Button
                                  type="button"
                                  size="small"
                                  startIcon={<AddIcon />}
                                  onClick={() => addSetToExercise(pIdx, eIdx)}
                                  sx={{
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    fontSize: '0.75rem',
                                  }}
                                >
                                  Add Set
                                </Button>
                              </Paper>
                            ))}
                          </Stack>

                          {/* Notes */}
                          <TextField
                            label="Notes"
                            multiline
                            rows={2}
                            value={participant.notes || ''}
                            onChange={(e) => updateParticipant(pIdx, 'notes', e.target.value)}
                            placeholder="Session notes..."
                            fullWidth
                            size="small"
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: '20px',
                              },
                            }}
                          />
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                </Box>

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="large"
                  sx={{
                    borderRadius: '20px',
                    py: 1.5,
                    fontWeight: 700,
                    textTransform: 'none',
                    fontSize: '1rem',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 6,
                    },
                  }}
                >
                  Save Gym Session
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}

        <Stack spacing={2}>
          {sessions.length === 0 ? (
            <Card 
              sx={{ 
                textAlign: 'center', 
                py: 6,
                borderRadius: '20px',
                boxShadow: 1,
              }}
            >
              <CardContent>
                <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                  No gym sessions yet. Add your first one!
                </Typography>
              </CardContent>
            </Card>
          ) : (
            sessions.map((session) => (
              <Card 
                key={session.id} 
                sx={{ 
                  borderRadius: '20px',
                  boxShadow: 2,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: 4,
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {session.type}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {new Date(session.date).toLocaleDateString()}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          •
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          Added by
                        </Typography>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Avatar 
                            src={session.creator_avatar}
                            alt={session.creator_name}
                            sx={{ width: 20, height: 20 }}
                          />
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {session.creator_name}
                          </Typography>
                        </Stack>
                      </Stack>
                    </Box>
                    <Stack direction="row" spacing={1}>
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
                      {session.created_by === currentUser?.id && (
                        <Button
                          onClick={() => deleteSession(session.id)}
                          startIcon={<DeleteIcon />}
                          sx={{
                            color: 'error.main',
                            textTransform: 'none',
                            '&:hover': { color: 'error.dark' },
                          }}
                        >
                          Delete
                        </Button>
                      )}
                    </Stack>
                  </Stack>

                  <Stack spacing={2}>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                      Participants:
                    </Typography>
                    {session.participants?.map((participant, idx) => (
                      <Box 
                        key={idx} 
                        sx={{ 
                          bgcolor: 'grey.50',
                          p: 2.5,
                          borderRadius: '16px',
                        }}
                      >
                        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                          <Avatar 
                            src={isValidImagePath(participant.user_avatar) ? participant.user_avatar : DEFAULT_AVATAR}
                            alt={participant.user_name}
                            sx={{ width: 40, height: 40 }}
                          />
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {participant.user_name}
                          </Typography>
                        </Stack>

                        {participant.exercises && participant.exercises.length > 0 ? (
                          <Stack spacing={1.5} sx={{ ml: 6.5 }}>
                            {participant.exercises.map((exercise, eIdx) => (
                              <Box 
                                key={eIdx} 
                                sx={{ 
                                  borderLeft: 3,
                                  borderColor: 'primary.main',
                                  pl: 2,
                                }}
                              >
                                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                  {exercise.exercise_name}
                                </Typography>
                                <Stack spacing={0.25}>
                                  {exercise.sets.map((set, sIdx) => (
                                    <Typography key={sIdx} variant="caption" sx={{ color: 'text.secondary' }}>
                                      Set {set.set_number}: {set.weight}kg × {set.reps} reps
                                    </Typography>
                                  ))}
                                </Stack>
                              </Box>
                            ))}
                          </Stack>
                        ) : null}

                        {participant.notes && (
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: 'text.secondary',
                              mt: 1.5,
                              ml: 6.5,
                              fontStyle: 'italic',
                            }}
                          >
                            {participant.notes}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Stack>

                  {/* Reactions */}
                  {session.reactions && session.reactions.length > 0 && (
                    <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 500 }}>
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
                </CardContent>
              </Card>
            ))
          )}
        </Stack>
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
