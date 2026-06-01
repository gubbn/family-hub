'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import NavBar from '../../components/NavBar'

type FamilyMember = {
  id: string
  name: string
  avatar_emoji: string | null
}

type ChoreFrequency = 'daily' | 'weekly' | 'adhoc'

type Chore = {
  id: string
  title: string
  points: number
  frequency: ChoreFrequency | null
  shared_completion: boolean | null
}

type ChoreCompletion = {
  chore_id: string
  completed_by: string | null
  completed_at: string
  chores: { points: number } | { points: number }[] | null
}

type ChoreAssignment = {
  chores: Chore | Chore[] | null
}

function getTodayDate() {
  return new Date().toISOString().split('T')[0]
}

function getWeekStartDate() {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  return monday.toISOString().split('T')[0]
}

export default function ChoresPage() {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [chores, setChores] = useState<Chore[]>([])
  const [completions, setCompletions] = useState<ChoreCompletion[]>([])
  const [points, setPoints] = useState<Record<string, number>>({})
  const [selectedMember, setSelectedMember] = useState('')
  const [loading, setLoading] = useState(true)

  async function loadData() {
    setLoading(true)

    try {
      const today = getTodayDate()

      const membersResponse = await supabase
        .from('family_members')
        .select('id, name, avatar_emoji')
        .order('display_order')

      const safeMembers = membersResponse.data || []
      const activeMember = selectedMember || safeMembers[0]?.id || ''

      if (!selectedMember && activeMember) {
        setSelectedMember(activeMember)
      }

      const [assignmentsResponse, completionsResponse] = await Promise.all([
        supabase
          .from('chore_assignments')
          .select(`
            chores (
              id,
              title,
              points,
              frequency,
              shared_completion
            )
          `)
          .eq('family_member_id', activeMember),

        supabase
          .from('chore_completions')
          .select(`
            chore_id,
            completed_by,
            completed_at,
            chores (
              points
            )
          `),
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
      setCompletions(safeCompletions)

      const totals: Record<string, number> = {}

      safeCompletions
        .filter((completion) => completion.completed_at >= today)
        .forEach((completion) => {
          if (!completion.completed_by) return

          const chorePoints = Array.isArray(completion.chores)
            ? completion.chores[0]?.points || 0
            : completion.chores?.points || 0

          totals[completion.completed_by] =
            (totals[completion.completed_by] || 0) + chorePoints
        })

      setPoints(totals)
    } catch (error) {
      console.error('Load chores failed:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedMember])

  const dueChores = useMemo(() => {
    const today = getTodayDate()
    const weekStart = getWeekStartDate()

    return chores.filter((chore) => {
      const frequency = chore.frequency || 'daily'

      const relevantCompletions = completions.filter((completion) => {
        if (completion.chore_id !== chore.id) return false

        if (chore.shared_completion) {
          return true
        }

        return completion.completed_by === selectedMember
      })

      if (frequency === 'daily') {
        return !relevantCompletions.some(
          (completion) => completion.completed_at >= today
        )
      }

      if (frequency === 'weekly') {
        return !relevantCompletions.some(
          (completion) => completion.completed_at >= weekStart
        )
      }

      if (frequency === 'adhoc') {
        return relevantCompletions.length === 0
      }

      return true
    })
  }, [chores, completions, selectedMember])

  function getCompletionPeriodStart(chore: Chore) {
    const frequency = chore.frequency || 'daily'

    if (frequency === 'weekly') {
      return getWeekStartDate()
    }

    if (frequency === 'adhoc') {
      return null
    }

    return getTodayDate()
  }

  function isChoreComplete(chore: Chore) {
    const periodStart = getCompletionPeriodStart(chore)

    return completions.some((completion) => {
      if (completion.chore_id !== chore.id) return false

      if (!chore.shared_completion && completion.completed_by !== selectedMember) {
        return false
      }

      if (!periodStart) return true

      return completion.completed_at >= periodStart
    })
  }

  async function completeChore(chore: Chore) {
    if (!selectedMember) return

    const periodStart = getCompletionPeriodStart(chore)
    const alreadyComplete = isChoreComplete(chore)

    if (alreadyComplete) {
      let deleteQuery = supabase
        .from('chore_completions')
        .delete()
        .eq('chore_id', chore.id)

      if (!chore.shared_completion) {
        deleteQuery = deleteQuery.eq('completed_by', selectedMember)
      }

      if (periodStart) {
        deleteQuery = deleteQuery.gte('completed_at', periodStart)
      }

      const { error } = await deleteQuery

      if (error) {
        console.error('Untick chore error:', error)
        return
      }

      await loadData()
      return
    }

    const { error } = await supabase.from('chore_completions').insert({
      chore_id: chore.id,
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

    const today = getTodayDate()

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

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <NavBar />

        <h1 className="mb-6 text-5xl font-bold tracking-tight">Chores</h1>

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
                    <div className="text-lg font-semibold">{member.name}</div>

                    <div className="text-sm text-slate-500">
                      {points[member.id] || 0} points today
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
          <h2 className="mb-5 text-3xl font-semibold">Due Chores</h2>

          {loading && <p className="text-slate-500">Loading chores...</p>}

          {!loading && dueChores.length === 0 && (
            <p className="text-slate-500">
              No chores due for this person 🎉
            </p>
          )}

          <div className="space-y-3">
            {dueChores.map((chore) => {
              const complete = isChoreComplete(chore)

              return (
                <button
                  key={chore.id}
                  onClick={() => completeChore(chore)}
                  className={`flex w-full items-center justify-between rounded-2xl border p-5 text-left transition-all ${
                    complete
                      ? 'border-green-300 bg-green-100'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">
                      {complete ? '✅' : '⬜'}
                    </div>

                    <div>
                      <div className="text-xl font-medium">{chore.title}</div>

                      <div className="mt-1 flex flex-wrap gap-2 text-sm text-slate-500">
                        <span>{chore.points} points</span>
                        <span>•</span>
                        <span>{chore.frequency || 'daily'}</span>
                        {chore.shared_completion && (
                          <>
                            <span>•</span>
                            <span>shared</span>
                          </>
                        )}
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