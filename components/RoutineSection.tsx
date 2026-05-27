'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type Props = {
  selectedMember: string
}

type RoutineInfo = {
  title: string
  time_of_day: string
}

type RoutineStep = {
  id: string
  routine_id: string
  title: string
  step_order: number
  routines: RoutineInfo | RoutineInfo[] | null
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
          routine_id,
          title,
          step_order,
          routines (
            title,
            time_of_day
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

      const safeSteps: RoutineStep[] =
        stepData?.map((step) => ({
          id: step.id,
          routine_id: step.routine_id,
          title: step.title,
          step_order: step.step_order,
          routines: step.routines,
        })) || []

      setSteps(safeSteps)

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

  const visibleSteps = steps.filter((step) => {
    const key = `${step.id}:${selectedMember}`
    return !completed.includes(key)
  })

  const routineOrder = ['morning', 'afternoon', 'evening']

  const grouped = visibleSteps.reduce((acc, step) => {
    const routine = Array.isArray(step.routines)
      ? step.routines[0]
      : step.routines

    const routineName = routine?.title || 'Routine'
    const timeOfDay = routine?.time_of_day || 'zzz'

    if (!acc[routineName]) {
      acc[routineName] = {
        timeOfDay,
        steps: [],
      }
    }

    acc[routineName].steps.push(step)

    return acc
  }, {} as Record<string, { timeOfDay: string; steps: RoutineStep[] }>)

  return (
    <div className="space-y-6">
      {loading && (
        <p className="text-slate-500">
          Loading routines...
        </p>
      )}

      {!loading && steps.length === 0 && (
        <p className="text-slate-500">
          No routine steps found
        </p>
      )}

      {!loading && steps.length > 0 && visibleSteps.length === 0 && (
        <p className="text-slate-500">
          All routine steps done for today 🎉
        </p>
      )}

      {Object.entries(grouped)
        .sort((a, b) => {
          const aIndex = routineOrder.indexOf(a[1].timeOfDay)
          const bIndex = routineOrder.indexOf(b[1].timeOfDay)

          return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex)
        })
        .map(([routineName, routineData]) => (
          <div key={routineName}>
            <h3 className="mb-3 text-xl font-semibold">
              {routineName}
            </h3>

            <div className="space-y-2">
              {routineData.steps.map((step) => (
                <button
                  key={step.id}
                  onClick={() => toggleRoutineStep(step.id)}
                  className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left text-lg transition hover:bg-slate-50"
                >
                  ⬜ {step.title}
                </button>
              ))}
            </div>
          </div>
        ))}
    </div>
  )
}