'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type Props = {
  selectedMember: string
}

type RoutineStep = {
  id: string
  title: string
  step_order: number
  routines: {
    title: string
  } | null
}

type Completion = {
  routine_step_id: string
  family_member_id: string
}

export default function RoutineSection({ selectedMember }: Props) {
  const [steps, setSteps] = useState<RoutineStep[]>([])
  const [completed, setCompleted] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  async function loadRoutineData() {
    if (!selectedMember) return

    setLoading(true)

    try {
      const today = new Date().toISOString().split('T')[0]

      const { data: stepData, error: stepError } = await supabase
        .from('routine_steps')
        .select(`
          id,
          title,
          step_order,
          routines (
            title
          )
        `)
        .order('step_order')

      const { data: completionData, error: completionError } = await supabase
        .from('routine_step_completions')
        .select('routine_step_id, family_member_id')
        .eq('family_member_id', selectedMember)
        .gte('completed_at', today)

      if (stepError) console.error('Routine steps error:', stepError)
      if (completionError) console.error('Routine completions error:', completionError)

      setSteps(stepData || [])

      setCompleted(
        completionData?.map(
          (completion: Completion) =>
            `${completion.routine_step_id}:${completion.family_member_id}`
        ) || []
      )
    } catch (error) {
      console.error('Load routine data failed:', error)
    } finally {
      setLoading(false)
    }
  }

  async function toggleRoutineStep(stepId: string) {
    if (!selectedMember) return

    const today = new Date().toISOString().split('T')[0]
    const key = `${stepId}:${selectedMember}`
    const isComplete = completed.includes(key)

    if (isComplete) {
      const { error } = await supabase
        .from('routine_step_completions')
        .delete()
        .eq('routine_step_id', stepId)
        .eq('family_member_id', selectedMember)
        .gte('completed_at', today)

      if (error) {
        console.error('Delete routine completion error:', error)
        return
      }
    } else {
      const { error } = await supabase
        .from('routine_step_completions')
        .insert({
          routine_step_id: stepId,
          family_member_id: selectedMember,
        })

      if (error) {
        console.error('Insert routine completion error:', error)
        return
      }
    }

    await loadRoutineData()
  }

  useEffect(() => {
    loadRoutineData()
  }, [selectedMember])

  const grouped = steps.reduce((acc, step) => {
    const routineName = step.routines?.title || 'Routine'

    if (!acc[routineName]) {
      acc[routineName] = []
    }

    acc[routineName].push(step)

    return acc
  }, {} as Record<string, RoutineStep[]>)

  return (
    <div className="space-y-6">
      {loading && <p>Loading routines...</p>}

      {!loading && steps.length === 0 && (
        <p>No routine steps found</p>
      )}

      {Object.entries(grouped).map(([routineName, routineSteps]) => (
        <div key={routineName}>
          <h3 className="mb-3 text-xl font-semibold">
            {routineName}
          </h3>

          <div className="space-y-2">
            {routineSteps.map((step) => {
              const isComplete = completed.includes(
                `${step.id}:${selectedMember}`
              )

              return (
                <button
                  key={step.id}
                  onClick={() => toggleRoutineStep(step.id)}
                  className={`w-full rounded-xl border p-4 text-left text-lg ${
                    isComplete
                      ? 'border-blue-400 bg-blue-100'
                      : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  {isComplete ? '✅' : '⬜'} {step.title}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}