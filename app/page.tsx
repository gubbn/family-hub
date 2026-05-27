'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import RoutineSection from '../components/RoutineSection'
import NavBar from '../components/NavBar'

type Chore = {
  id: string
  title: string
  points: number
}

type FamilyMember = {
  id: string
  name: string
  avatar_emoji: string | null
}

type Completion = {
  chore_id: string
  completed_by: string | null
  chores: { points: number } | { points: number }[] | null
}

type Assignment = {
  chore_id: string
  family_member_id: string
  chores: Chore | Chore[] | null
}

export default function Home() {
  const [chores, setChores] = useState<Chore[]>([])
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [selectedMember, setSelectedMember] = useState('')
  const [completed, setCompleted] = useState<string[]>([])
  const [points, setPoints] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  async function loadData() {
    setLoading(true)

    try {
      const today = new Date().toISOString().split('T')[0]

      const { data: membersData, error: membersError } = await supabase
        .from('family_members')
        .select('id, name, avatar_emoji')

      if (membersError) {
        console.error('Members error:', membersError)
      }

      const safeMembers = membersData || []
      const activeMember = selectedMember || safeMembers[0]?.id || ''

      if (!selectedMember && activeMember) {
        setSelectedMember(activeMember)
      }

      const { data: assignmentData, error: assignmentError } = await supabase
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
        .eq('family_member_id', activeMember)

      if (assignmentError) {
        console.error('Assignment error:', assignmentError)
      }

      const mappedChores: Chore[] =
        assignmentData?.flatMap((assignment: Assignment) => {
          if (!assignment.chores) return []

          return Array.isArray(assignment.chores)
            ? assignment.chores
            : [assignment.chores]
        }) || []

      const { data: completedData, error: completedError } = await supabase
        .from('chore_completions')
        .select('chore_id, completed_by, chores(points)')
        .gte('completed_at', today)

      if (completedError) {
        console.error('Completions error:', completedError)
      }

      const safeCompletions = completedData || []

      setFamilyMembers(safeMembers)
      setChores(mappedChores)

      setCompleted(
        safeCompletions
          .filter(
            (completion) =>
              completion.chore_id && completion.completed_by
          )
          .map(
            (completion) =>
              `${completion.chore_id}:${completion.completed_by}`
          )
      )

      const totals: Record<string, number> = {}

      ;(safeCompletions as Completion[]).forEach((completion) => {
        if (!completion.completed_by) return

        const chorePoints = Array.isArray(completion.chores)
          ? completion.chores[0]?.points || 0
          : completion.chores?.points || 0

        totals[completion.completed_by] =
          (totals[completion.completed_by] || 0) + chorePoints
      })

      setPoints(totals)
    } catch (error) {
      console.error('Load data failed:', error)
    } finally {
      setLoading(false)
    }
  }

  async function completeChore(choreId: string) {
    if (!selectedMember) {
      alert('Choose who is completing the chore first')
      return
    }

    const today = new Date().toISOString().split('T')[0]
    const completionKey = `${choreId}:${selectedMember}`

    const isAlreadyComplete = completed.includes(completionKey)

    if (isAlreadyComplete) {
      const { error } = await supabase
        .from('chore_completions')
        .delete()
        .eq('chore_id', choreId)
        .eq('completed_by', selectedMember)
        .gte('completed_at', today)

      if (error) {
        console.error('Delete completion error:', error)
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
      console.error('Completion insert error:', error)
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

async function resetTodayRoutines() {
  if (!selectedMember) return

  const today = new Date().toISOString().split('T')[0]

  const { error } = await supabase
    .from('routine_step_completions')
    .delete()
    .eq('family_member_id', selectedMember)
    .gte('completed_at', today)

  if (error) {
    console.error('Reset routines error:', error)
    return
  }

  await loadData()
}

  useEffect(() => {
    loadData()
  }, [selectedMember])

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <NavBar />

        <h1 className="mb-6 text-5xl font-bold tracking-tight">
          Family Hub
        </h1>

        <section className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-2xl font-semibold">
            Today&apos;s Points
          </h2>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {familyMembers.map((member) => (
              <div
                key={member.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center"
              >
                <div className="mb-2 text-5xl">
                  {member.avatar_emoji || '🙂'}
                </div>

                <div className="text-lg font-medium">
                  {member.name}
                </div>

                <div className="mt-2 text-4xl font-bold text-blue-600">
                  {points[member.id] || 0}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-2xl font-semibold">
            Who&apos;s doing chores?
          </h2>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {familyMembers.map((member) => (
              <button
                key={member.id}
                onClick={() => setSelectedMember(member.id)}
                className={`rounded-2xl border p-5 text-center transition-all ${
                  selectedMember === member.id
                    ? 'border-blue-500 bg-blue-100 shadow-sm'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="mb-2 text-5xl">
                  {member.avatar_emoji || '🙂'}
                </div>

                <div className="text-xl font-medium">
                  {member.name}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="mb-6 rounded-3xl bg-white p-4 shadow-sm">
  <div className="flex flex-wrap items-center justify-between gap-3">
    <p className="text-sm text-slate-500">
      Need to start this person&apos;s day again?
    </p>

    <div className="flex flex-wrap gap-2">
      <button
        onClick={resetTodayChores}
        className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
      >
        Reset their chores
      </button>

      <button
        onClick={resetTodayRoutines}
        className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
      >
        Reset their routines
      </button>
    </div>
  </div>
</section>

        <div className="grid gap-6 lg:grid-cols-2">
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

          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-3xl font-semibold">
              Routines
            </h2>

            <RoutineSection
              selectedMember={selectedMember}
            />
          </section>
        </div>
      </div>
    </main>
  )
}