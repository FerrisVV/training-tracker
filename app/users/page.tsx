'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocalStorage } from '@/lib/useLocalStorage'
import { User } from '@/lib/types'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

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
      <div className="min-h-screen bg-md-background flex items-center justify-center">
        <div className="text-md-on-background text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-md-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-md-primary mb-2">Training Tracker</h1>
          <p className="text-md-on-surface-variant text-lg">Select your profile or create a new one</p>
        </div>

        {!showCreateForm ? (
          <div className="bg-md-surface rounded-md-xl md-elevation-2 p-8">
            {users.length > 0 && (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-md-on-surface">Select Your Profile</h2>
                  <button
                    onClick={() => setEditMode(!editMode)}
                    className={`px-4 py-2 rounded-md-full text-sm font-medium md-transition md-ripple ${
                      editMode 
                        ? 'bg-md-surface-variant text-md-on-surface-variant' 
                        : 'bg-md-secondary-container text-md-on-primary-container hover:md-elevation-1'
                    }`}
                  >
                    {editMode ? 'Done' : 'Edit Profiles'}
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  {users.map((user) => (
                    <div key={user.id} className="relative">
                      <button
                        onClick={() => handleSelectUser(user)}
                        disabled={editMode}
                        className={`w-full flex flex-col items-center p-6 rounded-md-lg border-2 md-transition md-ripple ${
                          editMode 
                            ? 'border-md-outline/30 cursor-default' 
                            : 'border-md-outline/30 hover:border-md-primary hover:bg-md-primary-container/50 md-elevation-1 hover:md-elevation-2'
                        }`}
                      >
                        <div className="w-20 h-20 mb-3 relative rounded-full overflow-hidden md-elevation-2">
                          <Image 
                            src={isValidImagePath(user.avatar) ? user.avatar : DEFAULT_AVATAR} 
                            alt={user.name}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </div>
                      <span className="font-semibold text-md-on-surface">{user.name}</span>
                    </button>
                    {editMode && (
                      <div className="absolute top-2 right-2 flex gap-1">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="p-2 bg-md-primary text-md-on-primary rounded-md-full hover:md-elevation-2 md-elevation-1 md-transition md-ripple"
                          title="Edit profile"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 bg-md-error text-md-on-error rounded-md-full hover:md-elevation-2 md-elevation-1 md-transition md-ripple"
                          title="Delete profile"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                  ))}
                </div>
                <div className="border-t border-md-outline/20 pt-6">
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="w-full py-4 bg-md-primary text-md-on-primary rounded-md-full font-semibold hover:md-elevation-2 md-elevation-1 md-transition md-ripple"
                  >
                    + Create New Profile
                  </button>
                </div>
              </>
            )}

            {users.length === 0 && (
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-md-on-surface mb-4">Welcome!</h2>
                <p className="text-md-on-surface-variant mb-6">Let's create your first profile</p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-8 py-4 bg-md-primary text-md-on-primary rounded-md-full font-semibold hover:md-elevation-2 md-elevation-1 md-transition md-ripple"
                >
                  Create Profile
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-md-surface rounded-md-xl md-elevation-2 p-8">
            <h2 className="text-2xl font-bold text-md-on-surface mb-6">{editingUser ? 'Edit Profile' : 'Create Your Profile'}</h2>
            <form onSubmit={handleCreateUser} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-md-on-surface-variant mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter your name"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-4 py-3 text-md-on-surface bg-md-surface border-2 border-md-outline/40 rounded-md-md focus:outline-none focus:border-md-primary md-transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-md-on-surface-variant mb-3">
                  Choose Your Avatar
                </label>
                <div className="grid grid-cols-5 md:grid-cols-6 gap-2">
                  {AVATAR_PLACEHOLDERS.map((avatar) => (
                    <button
                      key={avatar}
                      type="button"
                      onClick={() => setSelectedAvatar(avatar)}
                      className={`relative w-16 h-16 p-1 rounded-md-md border-2 md-transition overflow-hidden ${
                        selectedAvatar === avatar
                          ? 'border-md-primary md-elevation-2 scale-110'
                          : 'border-md-outline/30 hover:border-md-primary/50'
                      }`}
                    >
                      <Image 
                        src={avatar} 
                        alt="Avatar option"
                        fill
                        sizes="64px"
                        className="object-cover rounded-md"
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                {users.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { setShowCreateForm(false); setEditingUser(null); }}
                    className="flex-1 py-3 border-2 border-md-outline/40 text-md-on-surface rounded-md-full font-semibold hover:bg-md-surface-variant/30 md-transition md-ripple"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 py-4 bg-md-primary text-md-on-primary rounded-md-full font-semibold hover:md-elevation-2 md-elevation-1 md-transition md-ripple"
                >
                  {editingUser ? 'Save Changes' : 'Create Profile'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
