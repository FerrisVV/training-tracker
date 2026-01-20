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

  // No auto-redirect - user is here to select/switch profiles

  const handleSelectUser = (user: User) => {
    setIsRedirecting(true)
    // Update localStorage first
    localStorage.setItem('current_user', JSON.stringify(user))
    // Navigate after ensuring localStorage is updated
    setTimeout(() => {
      window.location.href = '/dashboard'
    }, 150)
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
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
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">Training Tracker</h1>
          <p className="text-indigo-100 text-lg">Select your profile or create a new one</p>
        </div>

        {!showCreateForm ? (
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            {users.length > 0 && (
              <>
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Select Your Profile</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  {users.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleSelectUser(user)}
                      className="flex flex-col items-center p-6 rounded-xl border-2 border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all"
                    >
                      <div className="w-20 h-20 mb-3 relative rounded-full overflow-hidden">
                        <Image 
                          src={isValidImagePath(user.avatar) ? user.avatar : DEFAULT_AVATAR} 
                          alt={user.name}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </div>
                      <span className="font-semibold text-gray-800">{user.name}</span>
                    </button>
                  ))}
                </div>
                <div className="border-t pt-6">
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                  >
                    + Create New Profile
                  </button>
                </div>
              </>
            )}

            {users.length === 0 && (
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Welcome!</h2>
                <p className="text-gray-600 mb-6">Let's create your first profile</p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Create Profile
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Create Your Profile</h2>
            <form onSubmit={handleCreateUser} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter your name"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Choose Your Avatar
                </label>
                <div className="grid grid-cols-5 md:grid-cols-6 gap-2">
                  {AVATAR_PLACEHOLDERS.map((avatar) => (
                    <button
                      key={avatar}
                      type="button"
                      onClick={() => setSelectedAvatar(avatar)}
                      className={`relative w-16 h-16 p-1 rounded-lg border-2 transition-all overflow-hidden ${
                        selectedAvatar === avatar
                          ? 'border-indigo-500 bg-indigo-50 scale-110'
                          : 'border-gray-200 hover:border-indigo-300'
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
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Create Profile
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
