'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { updateCompletionStreak } from '@/lib/streaks'
import { useHousehold } from './AuthProvider'

type Props = {
  selectedMember: string
  selectedMemberRole: string | null
  resetKey?: number
}

type RoutineInfo = {
  id: string
  title: string
  time_of_day: string
}

type RoutineStep = {
  id: string
  routine_id: string
  title: string
  step_order: number
  assigned_to: string | null
  routines: RoutineInfo | RoutineInfo[] | null
}

type Completion = {
  routine_step_id: string
  family_member_id: string
}

type Streak = {
  item_id: string
  streak_count: number
  best_streak: number
}

export default function RoutineSection({
  selectedMember,
  selectedMemberRole,
  resetKey = 0,
}: Props) {
  const { householdId } = useHousehold()
  const [steps, setSteps] = useState<RoutineStep[]>([])
  const [completed, setCompleted] = useState<string[]>([])
  const [streaks, setStreaks] = useState<Record<string, Streak>>({})
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')

  const loadRoutineData = useCallback(async () => {
    if (!selectedMember || !householdId) return

    setLoading(true)
    setLoadError('')

    try {
      const today = new Date().toISOString().split('T')[0]

      const [
        { data: routineData, error: routineError },
        { data: stepData, error: stepError },
        { data: completionData, error: completionError },
        { data: streakData, error: streakError },
      ] = await Promise.all([
        supabase
          .from('routines')
          .select('id, title, time_of_day')
          .eq('household_id', householdId),
        supabase
          .from('routine_steps')
          .select('id, routine_id, title, step_order, assigned_to')
          .eq('household_id', householdId)
          .order('step_order'),
        supabase
          .from('routine_step_completions')
          .select('routine_step_id, family_member_id')
          .eq('household_id', householdId)
          .eq('family_member_id', selectedMember)
          .gte('completed_at', today),
        supabase
          .from('completion_streaks')
          .select('item_id, streak_count, best_streak')
          .eq('household_id', householdId)
          .eq('member_id', selectedMember)
          .eq('item_type', 'routine_step'),
      ])

      if (routineError) console.error('Routines error:', routineError)
      if (stepError) console.error('Routine steps error:', stepError)
      if (completionError) console.error('Routine completions error:', completionError)
      if (streakError) console.error('Routine streaks error:', streakError)

      if (routineError || stepError) {
        setSteps([])
        setLoadError('Could not load routine steps. Please try again.')
        return
      }

      const routinesById = new Map(
        ((routineData as RoutineInfo[]) || []).map((routine) => [
          routine.id,
          routine,
        ])
      )

      const safeSteps: RoutineStep[] =
        stepData?.map((step) => ({
          id: step.id,
          routine_id: step.routine_id,
          title: step.title,
          step_order: step.step_order,
          assigned_to: step.assigned_to,
          routines: routinesById.get(step.routine_id) || null,
        }))
          .filter((step) =>
            selectedMemberRole === 'pet'
              ? step.assigned_to === selectedMember
              : step.assigned_to === null ||
                step.assigned_to === selectedMember
          ) || []

      const safeCompleted =
        completionData?.map(
          (completion: Completion) =>
            `${completion.routine_step_id}:${completion.family_member_id}`
        ) || []

      const safeStreaks =
        streakData?.reduce((acc, streak) => {
          acc[streak.item_id] = streak
          return acc
        }, {} as Record<string, Streak>) || {}

      setSteps(safeSteps)
      setCompleted(safeCompleted)
      setStreaks(safeStreaks)
    } catch (error) {
      console.error('Load routine data failed:', error)
    } finally {
      setLoading(false)
    }
  }, [householdId, selectedMember, selectedMemberRole])

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

      await updateCompletionStreak({
        memberId: selectedMember,
        itemType: 'routine_step',
        itemId: stepId,
      })
    }

    await loadRoutineData()
  }

  useEffect(() => {
    loadRoutineData()
  }, [loadRoutineData, resetKey])

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
          {loadError || 'No routine steps found'}
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
              {routineData.steps.map((step) => {
                const streak = streaks[step.id]

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => toggleRoutineStep(step.id)}
                    className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left text-lg transition hover:bg-slate-50"
                  >
                    <span>⬜ {step.title}</span>

                    {streak?.streak_count > 0 && (
                      <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-700">
                        🔥 {streak.streak_count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
    </div>
  )
}
