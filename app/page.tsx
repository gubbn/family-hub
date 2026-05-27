'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

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

      const { data: choresData, error: choresError } = await supabase
        .from('chores')
        .select('id, title, points')
        .eq('active', true)

      const { data: membersData, error: membersError } = await supabase
        .from('family_members')
        .select('id, name, avatar_emoji')

      const { data: completedData, error: completedError } = await supabase
        .from('chore_completions')
        .select('chore_id, completed_by, chores(points)')
        .gte('completed_at', today)

      if (choresError) console.error('Chores error:', choresError)
      if (membersError) console.error('Members error:', membersError)
      if (completedError) console.error('Completions error:', completedError)

      const safeMembers = membersData || []
      const safeCompletions = completedData || []

      setChores(choresData || [])
      setFamilyMembers(safeMembers)
      setSelectedMember((current) => current || safeMembers[0]?.id || '')

      setCompleted(
        safeCompletions
          .filter((completion) => completion.chore_id && completion.completed_by)
          .map((completion) => `${completion.chore_id}:${completion.completed_by}`)
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

  useEffect(() => {
    loadData()
  }, [])

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <h1 className="mb-6 text-4xl font-bold">Family Hub</h1>

      <section className="mb-6 rounded-2xl bg-white p-6 shadow">
        <h2 className="mb-4 text-2xl font-semibold">Today&apos;s Points</h2>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {familyMembers.map((member) => (
            <div key={member.id} className="rounded-xl border bg-white p-4 text-center">
              <div className="text-3xl">{member.avatar_emoji || '🙂'}</div>
              <div className="text-lg font-medium">{member.name}</div>
              <div className="text-2xl font-bold">{points[member.id] || 0}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6 rounded-2xl bg-white p-6 shadow">
        <h2 className="mb-4 text-2xl font-semibold">Who&apos;s doing chores?</h2>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {familyMembers.map((member) => (
            <button
              key={member.id}
              onClick={() => setSelectedMember(member.id)}
              className={`rounded-xl border p-4 text-xl ${
                selectedMember === member.id
                  ? 'border-blue-500 bg-blue-100'
                  : 'bg-white'
              }`}
            >
              <div className="text-3xl">{member.avatar_emoji || '🙂'}</div>
              <div>{member.name}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow">
        <h2 className="mb-4 text-2xl font-semibold">Today&apos;s Chores</h2>

        {loading && <p>Loading...</p>}

        <div className="space-y-3">
          {chores.map((chore) => {
            const isComplete = completed.includes(`${chore.id}:${selectedMember}`)

            return (
              <button
                key={chore.id}
                onClick={() => completeChore(chore.id)}
                className={`w-full rounded-xl border p-4 text-left text-xl transition ${
                  isComplete
                    ? 'border-green-400 bg-green-100 opacity-80'
                    : 'bg-white hover:bg-slate-50'
                }`}
              >
                <div>{isComplete ? '✅' : '⬜'} {chore.title}</div>
                <div className="text-sm text-slate-500">{chore.points} points</div>
              </button>
            )
          })}
        </div>
      </section>
    </main>
  )
}