'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import NavBar from '../../components/NavBar'
import RoutineSection from '../../components/RoutineSection'

type FamilyMember = {
  id: string
  name: string
  avatar_emoji: string | null
}

export default function RoutinesPage() {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [selectedMember, setSelectedMember] = useState('')

  async function loadMembers() {
    try {
      const { data, error } = await supabase
        .from('family_members')
        .select('id, name, avatar_emoji')
        .order('display_order')

      if (error) {
        console.error('Load members error:', error)
        return
      }

      const safeMembers = data || []

      setFamilyMembers(safeMembers)

      setSelectedMember((current) => {
        return current || safeMembers[0]?.id || ''
      })
    } catch (error) {
      console.error('Load members failed:', error)
    }
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

    window.location.reload()
  }

  useEffect(() => {
    loadMembers()
  }, [])

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <NavBar />

        <h1 className="mb-6 text-5xl font-bold tracking-tight">
          Routines
        </h1>

        <section className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-2xl font-semibold">
            Who&apos;s doing routines?
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
              Need to reset today&apos;s routines for this person?
            </p>

            <button
              onClick={resetTodayRoutines}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Reset their routines
            </button>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <RoutineSection selectedMember={selectedMember} />
        </section>
      </div>
    </main>
  )
}