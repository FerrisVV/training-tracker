'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocalStorage } from '@/lib/useLocalStorage'
import { User } from '@/lib/types'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  CardActionArea,
  Avatar,
  TextField,
  IconButton,
  CircularProgress,
  Stack,
} from '@mui/material'
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'

const AVATAR_PLACEHOLDERS = [
  '/avatars/02e5ef8fa00e64c8881597fbf765ca2f.jpg',
  '/avatars/299fc28ae92e1e843e4319083363e825.jpg',
  '/avatars/2a5f4eaede1285174c0cb0b249df1c98.jpg',
  '/avatars/3cf0aa86f56b7bcfddc362644d4ef210.jpg',
  '/avatars/40cff3ed-476f-4ce6-b872-fd1b30f45069.png',
  '/avatars/40f998422473229a7c81b590e807c92c.jpg',
  '/avatars/628c3490149109d308a446e326af4383.jpg',
  '/avatars/73189e5aa31ee8c27a4f8fc9797d1169.jpg',
  '/avatars/77f4329db91657a6bee5f5b7f1219abd.jpg',
  '/avatars/942159ec2ebd07dc6b8c9b9322087769.jpg',
  '/avatars/af11e634321a9c85671bc1fd0d55da60.jpg',
]

const DEFAULT_AVATAR = '/avatars/02e5ef8fa00e64c8881597fbf765ca2f.jpg'

const isValidImagePath = (path: string): boolean => {
  return path.startsWith('/') || path.startsWith('http://') || path.startsWith('https://')
}

export default function UserSelectionPage() {
  const router = useRouter()
  const DEFAULT_SYNC_CODE = 'SHARED'
  const [syncCode] = useLocalStorage<string>('sync_code', DEFAULT_SYNC_CODE)
  const [users, setUsers] = useLocalStorage<User[]>('users', [])
  const [currentUser, setCurrentUser] = useLocalStorage<User | null>('current_user', null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_PLACEHOLDERS[0])
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  // Load users from Supabase on mount
  useEffect(() => {
    const loadUsers = async () => {
      const { data, error } = await supabase
        .from('shared_users')
        .select('*')
        .eq('sync_code', syncCode)
        .order('created_at', { ascending: true })

      if (data && !error) {
        setUsers(data as User[])
      }
    }

    loadUsers()
  }, [syncCode])

  // No auto-redirect - user is here to select/switch profiles

  const handleSelectUser = (user: User) => {
    if (editMode) return // Prevent selection in edit mode
    setIsRedirecting(true)
    // Update localStorage first
    localStorage.setItem('current_user', JSON.stringify(user))
    // Navigate after ensuring localStorage is updated
    setTimeout(() => {
      window.location.href = '/dashboard'
    }, 150)
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this profile?')) return

    // Delete from Supabase
    await supabase.from('shared_users').delete().eq('id', userId)

    // Update local storage
    const updatedUsers = users.filter(u => u.id !== userId)
    setUsers(updatedUsers)
    
    // If deleting current user, clear it
    if (currentUser?.id === userId) {
      localStorage.removeItem('current_user')
      setCurrentUser(null)
    }
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setNewUserName(user.name)
    setSelectedAvatar(user.avatar)
    setShowCreateForm(true)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser || !newUserName.trim()) return

    const updatedUser: User = {
      ...editingUser,
      name: newUserName.trim(),
      avatar: selectedAvatar,
    }

    // Update in Supabase
    await supabase.from('shared_users')
      .update({ name: updatedUser.name, avatar: updatedUser.avatar })
      .eq('id', editingUser.id)

    // Update local storage
    const updatedUsers = users.map(u => u.id === editingUser.id ? updatedUser : u)
    setUsers(updatedUsers)

    // Update current user if it's the one being edited
    if (currentUser?.id === editingUser.id) {
      setCurrentUser(updatedUser)
    }

    // Reset form
    setEditingUser(null)
    setNewUserName('')
    setSelectedAvatar(AVATAR_PLACEHOLDERS[0])
    setShowCreateForm(false)
    setEditMode(false)
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // If editing, use save edit function instead
    if (editingUser) {
      return handleSaveEdit(e)
    }

    if (!newUserName.trim()) return

    const newUser: User = {
      id: crypto.randomUUID(),
      name: newUserName.trim(),
      avatar: selectedAvatar,
      created_at: new Date().toISOString(),
    }

    // Sync to Supabase
    await supabase.from('shared_users').insert([{
      id: newUser.id,
      sync_code: syncCode,
      name: newUser.name,
      avatar: newUser.avatar,
      created_at: newUser.created_at
    }])

    setIsRedirecting(true)
    // Update localStorage first
    const updatedUsers = [...users, newUser]
    localStorage.setItem('users', JSON.stringify(updatedUsers))
    localStorage.setItem('current_user', JSON.stringify(newUser))
    // Navigate after ensuring localStorage is updated
    setTimeout(() => {
      window.location.href = '/dashboard'
    }, 150)
  }

  if (isRedirecting) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Container maxWidth="md">
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h2" color="primary" gutterBottom>
            Training Tracker
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Select your profile or create a new one
          </Typography>
        </Box>

        {!showCreateForm ? (
          <Card>
            <CardContent sx={{ p: 4 }}>
              {users.length > 0 && (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h5" fontWeight="bold">
                      Select Your Profile
                    </Typography>
                    <Button
                      variant={editMode ? 'outlined' : 'contained'}
                      onClick={() => setEditMode(!editMode)}
                      size="small"
                    >
                      {editMode ? 'Done' : 'Edit Profiles'}
                    </Button>
                  </Box>

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' },
                      gap: 2,
                      mb: 3,
                    }}
                  >
                    {users.map((user) => (
                      <Card
                        key={user.id}
                        sx={{
                          position: 'relative',
                          cursor: editMode ? 'default' : 'pointer',
                        }}
                      >
                          <CardActionArea
                            onClick={() => !editMode && handleSelectUser(user)}
                            disabled={editMode}
                          >
                            <CardContent sx={{ textAlign: 'center', py: 3 }}>
                              <Avatar
                                src={isValidImagePath(user.avatar) ? user.avatar : DEFAULT_AVATAR}
                                alt={user.name}
                                sx={{ width: 80, height: 80, mx: 'auto', mb: 2 }}
                              />
                              <Typography variant="body1" fontWeight="600">
                                {user.name}
                              </Typography>
                            </CardContent>
                          </CardActionArea>
                          {editMode && (
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                display: 'flex',
                                gap: 0.5,
                              }}
                            >
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleEditUser(user)}
                                sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteUser(user.id)}
                                sx={{ bgcolor: 'error.main', color: 'white', '&:hover': { bgcolor: 'error.dark' } }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          )}
                        </Card>
                    ))}
                  </Box>

                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    onClick={() => setShowCreateForm(true)}
                  >
                    + Create New Profile
                  </Button>
                </>
              )}

              {users.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Typography variant="h5" gutterBottom fontWeight="bold">
                    Welcome!
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    Let's create your first profile
                  </Typography>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => setShowCreateForm(true)}
                  >
                    Create Profile
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
                {editingUser ? 'Edit Profile' : 'Create Your Profile'}
              </Typography>

              <Box component="form" onSubmit={handleCreateUser} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField
                  label="Your Name"
                  required
                  fullWidth
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Enter your name"
                />

                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 2 }} color="text.secondary">
                    Choose Your Avatar
                  </Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(5, 1fr)',
                      gap: 1,
                    }}
                  >
                    {AVATAR_PLACEHOLDERS.map((avatar) => (
                      <Box
                        key={avatar}
                        onClick={() => setSelectedAvatar(avatar)}
                        sx={{
                          position: 'relative',
                          cursor: 'pointer',
                          borderRadius: 2,
                          overflow: 'hidden',
                          border: 2,
                          borderColor: selectedAvatar === avatar ? 'primary.main' : 'transparent',
                          transform: selectedAvatar === avatar ? 'scale(1.1)' : 'scale(1)',
                          transition: 'all 200ms cubic-bezier(0.2, 0, 0, 1)',
                          '&:hover': {
                            borderColor: 'primary.light',
                          },
                        }}
                      >
                        <Avatar
                          src={avatar}
                          alt="Avatar option"
                          sx={{ width: '100%', height: 'auto', aspectRatio: '1/1' }}
                          variant="rounded"
                        />
                      </Box>
                    ))}
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  {users.length > 0 && (
                    <Button
                      variant="outlined"
                      fullWidth
                      size="large"
                      onClick={() => { 
                        setShowCreateForm(false); 
                        setEditingUser(null);
                        setNewUserName('');
                        setSelectedAvatar(AVATAR_PLACEHOLDERS[0]);
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    size="large"
                  >
                    {editingUser ? 'Save Changes' : 'Create Profile'}
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}
      </Container>
    </Box>
  )
}
