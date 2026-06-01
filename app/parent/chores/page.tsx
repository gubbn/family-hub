'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import NavBar from '../../../components/NavBar'
import ParentGate from '../../../components/ParentGate'
import ParentBackButton from '../../../components/ParentBackButton'

type FamilyMember = {
  id: string
  name: string
  avatar_emoji: string | null
}

type Chore = {
  id: string
  title: string
  points: number
  frequency: string | null
  shared_completion: boolean | null
}

type ChoreAssignment = {
  id: string
  chore_id: string
  family_member_id: string
}

export default function ParentChoresPage() {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [chores, setChores] = useState<Chore[]>([])
  const [assignments, setAssignments] = useState<ChoreAssignment[]>([])
  const [newChoreTitle, setNewChoreTitle] = useState('')
  const [newChorePoints, setNewChorePoints] = useState('1')
  const [newFrequency, setNewFrequency] = useState('daily')
  const [newSharedCompletion, setNewSharedCompletion] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [status, setStatus] = useState('')

  async function loadData() {
    const { data: membersData } = await supabase
      .from('family_members')
      .select('id, name, avatar_emoji')
      .order('display_order')

    const { data: choresData } = await supabase
      .from('chores')
      .select('id, title, points, frequency, shared_completion')
      .order('title')

    const { data: assignmentData } = await supabase
      .from('chore_assignments')
      .select('id, chore_id, family_member_id')

    setFamilyMembers(membersData || [])
    setChores(choresData || [])
    setAssignments(assignmentData || [])
  }

  function toggleSelectedMember(memberId: string) {
    setSelectedMembers((current) => {
      if (current.includes(memberId)) {
        return current.filter((id) => id !== memberId)
      }

      return [...current, memberId]
    })
  }

  function isAssigned(choreId: string, memberId: string) {
    return assignments.some(
      (assignment) =>
        assignment.chore_id === choreId &&
        assignment.family_member_id === memberId
    )
  }

  async function addChore() {
    const trimmedTitle = newChoreTitle.trim()

    if (!trimmedTitle) {
      setStatus('Enter a chore title first')
      return
    }

    const { data: newChore, error: choreError } = await supabase
      .from('chores')
      .insert({
        title: trimmedTitle,
        points: Number(newChorePoints) || 1,
        frequency: newFrequency,
        shared_completion: newSharedCompletion,
        active: true,
      })
      .select('id')
      .single()

    if (choreError || !newChore) {
      console.error('Add chore error:', choreError)
      setStatus('Could not add chore')
      return
    }

    if (selectedMembers.length > 0) {
      const rows = selectedMembers.map((memberId) => ({
        chore_id: newChore.id,
        family_member_id: memberId,
      }))

      const { error: assignmentError } = await supabase
        .from('chore_assignments')
        .insert(rows)

      if (assignmentError) {
        console.error('Add assignments error:', assignmentError)
        setStatus('Chore added, but assignments failed')
        await loadData()
        return
      }
    }

    setNewChoreTitle('')
    setNewChorePoints('1')
    setNewFrequency('daily')
    setNewSharedCompletion(false)
    setSelectedMembers([])
    setStatus('Chore added')
    await loadData()
  }

  async function updateChore(
    choreId: string,
    updates: Partial<Chore>
  ) {
    const { error } = await supabase
      .from('chores')
      .update(updates)
      .eq('id', choreId)

    if (error) {
      console.error('Update chore error:', error)
      setStatus('Could not update chore')
      return
    }

    setChores((current) =>
      current.map((chore) =>
        chore.id === choreId ? { ...chore, ...updates } : chore
      )
    )

    setStatus('Chore updated')
  }

  async function toggleAssignment(choreId: string, memberId: string) {
    const existing = assignments.find(
      (assignment) =>
        assignment.chore_id === choreId &&
        assignment.family_member_id === memberId
    )

    if (existing) {
      const { error } = await supabase
        .from('chore_assignments')
        .delete()
        .eq('id', existing.id)

      if (error) {
        console.error('Remove assignment error:', error)
        setStatus('Could not remove assignment')
        return
      }

      setStatus('Assignment removed')
      await loadData()
      return
    }

    const { error } = await supabase
      .from('chore_assignments')
      .insert({
        chore_id: choreId,
        family_member_id: memberId,
      })

    if (error) {
      console.error('Add assignment error:', error)
      setStatus('Could not add assignment')
      return
    }

    setStatus('Assignment added')
    await loadData()
  }

  async function deleteChore(choreId: string) {
    const { error } = await supabase
      .from('chores')
      .delete()
      .eq('id', choreId)

    if (error) {
      console.error('Delete chore error:', error)
      setStatus('Could not delete chore')
      return
    }

    setStatus('Chore deleted')
    await loadData()
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <NavBar />

        <ParentBackButton />

        <h1 className="mb-6 text-4xl font-bold tracking-tight">
          Parent Zone: Chores
        </h1>

        <ParentGate>
          {status && (
            <section className="mb-6 rounded-2xl bg-white p-4 text-sm text-slate-500 shadow-sm">
              {status}
            </section>
          )}

          <section className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-2xl font-semibold">
              Add Chore
            </h2>

            <div className="grid gap-4">
              <input
                value={newChoreTitle}
                onChange={(event) => setNewChoreTitle(event.target.value)}
                className="rounded-2xl border border-slate-200 p-4 text-lg"
                placeholder="Chore title"
              />

              <div className="grid gap-4 md:grid-cols-3">
                <input
                  type="number"
                  min="1"
                  value={newChorePoints}
                  onChange={(event) => setNewChorePoints(event.target.value)}
                  className="rounded-2xl border border-slate-200 p-4 text-lg"
                  placeholder="Points"
                />

                <select
                  value={newFrequency}
                  onChange={(event) => setNewFrequency(event.target.value)}
                  className="rounded-2xl border border-slate-200 p-4 text-lg"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="ad-hoc">Ad-hoc</option>
                </select>

                <button
                  onClick={() =>
                    setNewSharedCompletion((current) => !current)
                  }
                  className={`rounded-2xl border p-4 text-left text-lg transition ${
                    newSharedCompletion
                      ? 'border-green-500 bg-green-100 text-green-800'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  {newSharedCompletion ? '✅' : '⬜'} Shared
                </button>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-600">
                  Assign to
                </h3>

                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {familyMembers.map((member) => {
                    const selected = selectedMembers.includes(member.id)

                    return (
                      <button
                        key={member.id}
                        onClick={() => toggleSelectedMember(member.id)}
                        className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                          selected
                            ? 'border-blue-500 bg-blue-100 text-blue-800'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        {selected ? '✅' : '⬜'} {member.avatar_emoji || '🙂'}{' '}
                        {member.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              <button
                onClick={addChore}
                className="rounded-2xl bg-blue-600 p-4 text-lg font-semibold text-white hover:bg-blue-700"
              >
                Add chore
              </button>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-2xl font-semibold">
              Existing Chores
            </h2>

            <div className="space-y-4">
              {chores.map((chore) => (
                <div
                  key={chore.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="mb-4 grid gap-3 md:grid-cols-[1fr_120px_160px_160px_auto]">
                    <input
                      value={chore.title}
                      onChange={(event) =>
                        updateChore(chore.id, {
                          title: event.target.value,
                        })
                      }
                      className="rounded-xl border border-slate-200 bg-white p-3"
                    />

                    <input
                      type="number"
                      min="1"
                      value={chore.points}
                      onChange={(event) =>
                        updateChore(chore.id, {
                          points: Number(event.target.value) || 1,
                        })
                      }
                      className="rounded-xl border border-slate-200 bg-white p-3"
                    />

                    <select
                      value={chore.frequency || 'daily'}
                      onChange={(event) =>
                        updateChore(chore.id, {
                          frequency: event.target.value,
                        })
                      }
                      className="rounded-xl border border-slate-200 bg-white p-3"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="ad-hoc">Ad-hoc</option>
                    </select>

                    <button
                      onClick={() =>
                        updateChore(chore.id, {
                          shared_completion: !chore.shared_completion,
                        })
                      }
                      className={`rounded-xl border px-4 py-2 text-sm transition ${
                        chore.shared_completion
                          ? 'border-green-500 bg-green-100 text-green-800'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      {chore.shared_completion ? '✅ Shared' : '⬜ Personal'}
                    </button>

                    <button
                      onClick={() => deleteChore(chore.id)}
                      className="rounded-xl border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    {familyMembers.map((member) => {
                      const assigned = isAssigned(chore.id, member.id)

                      return (
                        <button
                          key={member.id}
                          onClick={() => toggleAssignment(chore.id, member.id)}
                          className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                            assigned
                              ? 'border-green-500 bg-green-100 text-green-800'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          {assigned ? '✅' : '⬜'} {member.avatar_emoji || '🙂'}{' '}
                          {member.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </ParentGate>
      </div>
    </main>
  )
}