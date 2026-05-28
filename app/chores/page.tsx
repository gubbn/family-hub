'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import NavBar from '../../components/NavBar'

type FamilyMember = {
  id: string
  name: string
  avatar_emoji: string | null
}

type Chore = {
  id: string
  title: string
  points: number
}

type ChoreCompletion = {
  chore_id: string
  completed_by: string
}

type ChoreAssignment = {
  chore_id: string
  family_member_id: string
  chores: Chore | Chore[] | null
}

export default function ChoresPage() {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [chores, setChores] = useState<Chore[]>([])
  const [completed, setCompleted] = useState<string[]>([])
  const [points, setPoints] = useState<Record<string, number>>({})
  const [selectedMember, setSelectedMember] = useState('')
  const [loading, setLoading] = useState(true)

  async function loadData() {
    setLoading(true)

    try {
      const today = new Date().toISOString().split('T')[0]

      const membersResponse = await supabase
        .from('family_members')
        .select('id, name, avatar_emoji')
        .order('display_order')

      if (membersResponse.error) {
        console.error('Load family members error:', membersResponse.error)
      }

      const safeMembers = membersResponse.data || []
      const activeMember = selectedMember || safeMembers[0]?.id || ''

      if (!selectedMember && activeMember) {
        setSelectedMember(activeMember)
      }

      const [assignmentsResponse, completionsResponse] = await Promise.all([
        supabase
          .from('chore_assignments')
          .select(`
            chore_id,
            family_member_id,
            chores (
              id,
              title,
              points
            )
          `)
          .eq('family_member_id', activeMember),

        supabase
          .from('chore_completions')
          .select('chore_id, completed_by')
          .gte('completed_at', today),
      ])

      if (assignmentsResponse.error) {
        console.error('Load chore assignments error:', assignmentsResponse.error)
      }

      if (completionsResponse.error) {
        console.error('Load chore completions error:', completionsResponse.error)
      }

      const safeChores: Chore[] =
        assignmentsResponse.data?.flatMap((assignment: ChoreAssignment) => {
          if (!assignment.chores) return []

          return Array.isArray(assignment.chores)
            ? assignment.chores
            : [assignment.chores]
        }) || []

      const safeCompletions =
        (completionsResponse.data as ChoreCompletion[]) || []

      setFamilyMembers(safeMembers)
      setChores(safeChores)

      const completedKeys = safeCompletions.map(
        (completion) =>
          `${completion.chore_id}:${completion.completed_by}`
      )

      setCompleted(completedKeys)

      const totals: Record<string, number> = {}

      safeCompletions.forEach((completion) => {
        const chore = safeChores.find(
          (item) => item.id === completion.chore_id
        )

        if (!chore) return

        totals[completion.completed_by] =
          (totals[completion.completed_by] || 0) + chore.points
      })

      setPoints(totals)
    } catch (error) {
      console.error('Load chores failed:', error)
    } finally {
      setLoading(false)
    }
  }

  async function completeChore(choreId: string) {
    if (!selectedMember) return

    const today = new Date().toISOString().split('T')[0]
    const key = `${choreId}:${selectedMember}`
    const isComplete = completed.includes(key)

    if (isComplete) {
      const { error } = await supabase
        .from('chore_completions')
        .delete()
        .eq('chore_id', choreId)
        .eq('completed_by', selectedMember)
        .gte('completed_at', today)

      if (error) {
        console.error('Untick chore error:', error)
        return
      }

      await loadData()
      return
    }

    const { error } = await supabase
      .from('chore_completions')
      .insert({
        chore_id: choreId,
        completed_by: selectedMember,
      })

    if (error) {
      console.error('Complete chore error:', error)
      return
    }

    await loadData()
  }

  async function resetTodayChores() {
    if (!selectedMember) return

    const today = new Date().toISOString().split('T')[0]

    const { error } = await supabase
      .from('chore_completions')
      .delete()
      .eq('completed_by', selectedMember)
      .gte('completed_at', today)

    if (error) {
      console.error('Reset chores error:', error)
      return
    }

    await loadData()
  }

  useEffect(() => {
    loadData()
  }, [selectedMember])

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <NavBar />

        <h1 className="mb-6 text-5xl font-bold tracking-tight">
          Chores
        </h1>

        <section className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-2xl font-semibold">
            Who&apos;s doing chores?
          </h2>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {familyMembers.map((member) => (
              <button
                key={member.id}
                onClick={() => setSelectedMember(member.id)}
                className={`rounded-2xl border p-5 transition-all ${
                  selectedMember === member.id
                    ? 'border-blue-500 bg-blue-100 shadow-sm'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-4xl">
                    {member.avatar_emoji || '🙂'}
                  </div>

                  <div className="text-left">
                    <div className="text-lg font-semibold">
                      {member.name}
                    </div>

                    <div className="text-sm text-slate-500">
                      {points[member.id] || 0} points
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="mb-6 rounded-3xl bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              Need to reset today&apos;s chores for this person?
            </p>

            <button
              onClick={resetTodayChores}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Reset their chores
            </button>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-3xl font-semibold">
            Today&apos;s Chores
          </h2>

          {loading && (
            <p className="text-slate-500">
              Loading chores...
            </p>
          )}

          {!loading && chores.length === 0 && (
            <p className="text-slate-500">
              No chores assigned
            </p>
          )}

          <div className="space-y-3">
            {chores.map((chore) => {
              const isComplete = completed.includes(
                `${chore.id}:${selectedMember}`
              )

              return (
                <button
                  key={chore.id}
                  onClick={() => completeChore(chore.id)}
                  className={`flex w-full items-center justify-between rounded-2xl border p-5 text-left transition-all ${
                    isComplete
                      ? 'border-green-300 bg-green-100'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">
                      {isComplete ? '✅' : '⬜'}
                    </div>

                    <div>
                      <div className="text-xl font-medium">
                        {chore.title}
                      </div>

                      <div className="mt-1 text-sm text-slate-500">
                        {chore.points} points
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      </div>
    </main>
  )
}