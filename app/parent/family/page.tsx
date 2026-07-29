'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import NavBar from '../../../components/NavBar'
import ParentGate from '../../../components/ParentGate'
import ParentBackButton from '../../../components/ParentBackButton'
const emojiOptions = [
  '🙂',
  '😀',
  '😎',
  '🤩',
  '👩',
  '👨',
  '👧',
  '👦',
  '🧒',
  '👶',
  '🦄',
  '🦖',
  '🐶',
  '🐱',
  '🐻',
  '🦊',
  '⚽',
  '🎨',
  '🎮',
  '📚',
]


type FamilyMember = {
  id: string
  name: string
  role: string | null
  avatar_emoji: string | null
  favourite_colour: string | null
  pet_type: 'dog' | 'cat' | 'other' | null
}

export default function ParentFamilyPage() {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('🙂')
  const [newRole, setNewRole] = useState('child')
  const [newPetIsDog, setNewPetIsDog] = useState(false)
  const [status, setStatus] = useState('')

  async function loadFamilyMembers() {
    const { data, error } = await supabase
      .from('family_members')
      .select('id, name, role, avatar_emoji, favourite_colour, pet_type')
      .order('display_order')

    if (error) {
      console.error('Load family members error:', error)
      setStatus('Could not load family members')
      return
    }

    setFamilyMembers(data || [])
  }

  async function addFamilyMember() {
    const trimmedName = newName.trim()

    if (!trimmedName) {
      setStatus('Enter a name first')
      return
    }

    const { error } = await supabase
      .from('family_members')
      .insert({
        name: trimmedName,
        avatar_emoji: newEmoji.trim() || '🙂',
        role: newRole,
        pet_type: newRole === 'pet' ? (newPetIsDog ? 'dog' : 'other') : null,
      })

    if (error) {
      console.error('Add family member error:', error)
      setStatus('Could not add family member')
      return
    }

    setNewName('')
    setNewEmoji('🙂')
    setNewRole('child')
    setNewPetIsDog(false)
    setStatus('Family member added')
    await loadFamilyMembers()
  }

  async function updateFamilyMember(
    memberId: string,
    updates: Partial<FamilyMember>
  ) {
    const { error } = await supabase
      .from('family_members')
      .update(updates)
      .eq('id', memberId)

    if (error) {
      console.error('Update family member error:', error)
      setStatus('Could not update family member')
      return
    }

    setStatus('Family member updated')
    await loadFamilyMembers()
  }

  useEffect(() => {
    loadFamilyMembers()
  }, [])

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <NavBar />

        <ParentBackButton />

        <h1 className="mb-6 text-4xl font-bold tracking-tight">
          Parent Zone: Family
        </h1>

        <ParentGate>
          {status && (
            <section className="mb-6 rounded-2xl bg-white p-4 text-sm text-slate-500 shadow-sm">
              {status}
            </section>
          )}

          <section className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-2xl font-semibold">
              Add Family Member
            </h2>

            <div className="grid gap-4 md:grid-cols-[1fr_100px_140px]">
              <input
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                className="rounded-2xl border border-slate-200 p-4 text-lg"
                placeholder="Name"
              />

              <select
  value={newEmoji}
  onChange={(event) => setNewEmoji(event.target.value)}
  className="rounded-2xl border border-slate-200 p-4 text-lg"
>
  {emojiOptions.map((emoji) => (
    <option key={emoji} value={emoji}>
      {emoji}
    </option>
  ))}
</select>

              <select
                value={newRole}
                onChange={(event) => {
                  const role = event.target.value
                  setNewRole(role)
                  if (role === 'pet') {
                    setNewPetIsDog(false)
                    setNewEmoji('🐾')
                  }
                }}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <option value="parent">Parent</option>
                <option value="child">Child</option>
                <option value="pet">Pet</option>
              </select>

            </div>

            {newRole === 'pet' && (
              <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <input
                  type="checkbox"
                  checked={newPetIsDog}
                onChange={(event) => {
                    const isDog = event.target.checked
                    setNewPetIsDog(isDog)
                    setNewEmoji(isDog ? '🐶' : '🐾')
                }}
                  className="h-5 w-5 rounded border-slate-300 accent-blue-600"
                />
                <span>
                  <span className="block font-semibold">This pet is a dog</span>
                  <span className="block text-sm text-slate-500">
                    Used to show dog-walk suggestions on the dashboard.
                  </span>
                </span>
              </label>
            )}

            <button
              onClick={addFamilyMember}
              className="mt-4 rounded-2xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white hover:bg-blue-700"
            >
              Add family member
            </button>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-2xl font-semibold">
              Existing Family Members
            </h2>

            <div className="space-y-4">
              {familyMembers.map((member) => (
                <div
                  key={member.id}
                  className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_100px_140px]"
                >
                  <input
                    value={member.name}
                    onChange={(event) =>
                      updateFamilyMember(member.id, {
                        name: event.target.value,
                      })
                    }
                    className="rounded-xl border border-slate-200 bg-white p-3"
                  />

                  <select
  value={member.avatar_emoji || '🙂'}
  onChange={(event) =>
    updateFamilyMember(member.id, {
      avatar_emoji: event.target.value,
    })
  }
  className="rounded-xl border border-slate-200 bg-white p-3"
>
  {emojiOptions.map((emoji) => (
    <option key={emoji} value={emoji}>
      {emoji}
    </option>
  ))}
</select>

                  <select
                    value={member.role || 'child'}
                    onChange={(event) =>
                      updateFamilyMember(member.id, {
                        role: event.target.value,
                        pet_type:
                          event.target.value === 'pet'
                            ? member.pet_type || 'other'
                            : null,
                      })
                    }
                    className="rounded-xl border border-slate-200 bg-white p-3"
                  >
                    <option value="parent">Parent</option>
                    <option value="child">Child</option>
                    <option value="pet">Pet</option>
                  </select>

                  {member.role === 'pet' && (
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 md:col-start-3">
                      <input
                        type="checkbox"
                        checked={member.pet_type === 'dog'}
                      onChange={(event) =>
                        updateFamilyMember(member.id, {
                            pet_type: event.target.checked ? 'dog' : 'other',
                        })
                      }
                        className="h-5 w-5 rounded border-slate-300 accent-blue-600"
                      />
                      <span className="text-sm font-medium">
                        This pet is a dog
                      </span>
                    </label>
                  )}
                </div>
              ))}
            </div>
          </section>
        </ParentGate>
      </div>
    </main>
  )
}
