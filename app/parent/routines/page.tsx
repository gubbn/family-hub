'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import NavBar from '../../../components/NavBar'
import ParentGate from '../../../components/ParentGate'
import ParentBackButton from '../../../components/ParentBackButton'

type Routine = {
  id: string
  title: string
  time_of_day: string | null
}

type RoutineStep = {
  id: string
  routine_id: string
  title: string
  step_order: number
  routines: { title: string } | { title: string }[] | null
}

export default function ParentRoutinesPage() {
  const [routines, setRoutines] = useState<Routine[]>([])
  const [steps, setSteps] = useState<RoutineStep[]>([])
  const [selectedRoutine, setSelectedRoutine] = useState('')
  const [newStepTitle, setNewStepTitle] = useState('')
  const [newStepOrder, setNewStepOrder] = useState('1')
  const [status, setStatus] = useState('')

  async function loadData() {
    const { data: routinesData, error: routinesError } = await supabase
      .from('routines')
      .select('id, title, time_of_day')
      .order('time_of_day')

    const { data: stepsData, error: stepsError } = await supabase
      .from('routine_steps')
      .select(`
        id,
        routine_id,
        title,
        step_order,
        routines (
          title
        )
      `)
      .order('step_order')

    if (routinesError) {
      console.error('Load routines error:', routinesError)
      setStatus('Could not load routines')
    }

    if (stepsError) {
      console.error('Load routine steps error:', stepsError)
      setStatus('Could not load routine steps')
    }

    const safeRoutines = routinesData || []

    setRoutines(safeRoutines)
    setSteps((stepsData as RoutineStep[]) || [])

    setSelectedRoutine((current) => current || safeRoutines[0]?.id || '')
  }

  async function addRoutineStep() {
    const trimmedTitle = newStepTitle.trim()

    if (!selectedRoutine) {
      setStatus('Choose a routine first')
      return
    }

    if (!trimmedTitle) {
      setStatus('Enter a routine step first')
      return
    }

    const { error } = await supabase
      .from('routine_steps')
      .insert({
        routine_id: selectedRoutine,
        title: trimmedTitle,
        step_order: Number(newStepOrder) || 1,
      })

    if (error) {
      console.error('Add routine step error:', error)
      setStatus('Could not add routine step')
      return
    }

    setNewStepTitle('')
    setNewStepOrder('1')
    setStatus('Routine step added')
    await loadData()
  }

  async function deleteRoutineStep(stepId: string) {
    const { error } = await supabase
      .from('routine_steps')
      .delete()
      .eq('id', stepId)

    if (error) {
      console.error('Delete routine step error:', error)
      setStatus('Could not delete routine step')
      return
    }

    setStatus('Routine step deleted')
    await loadData()
  }

  function getRoutineTitle(step: RoutineStep) {
    if (!step.routines) return 'Routine'

    return Array.isArray(step.routines)
      ? step.routines[0]?.title || 'Routine'
      : step.routines.title
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <NavBar />

        <ParentBackButton />

        <h1 className="mb-6 text-4xl font-bold tracking-tight">
          Parent Zone: Routines
        </h1>

        <ParentGate>
          {status && (
            <section className="mb-6 rounded-2xl bg-white p-4 text-sm text-slate-500 shadow-sm">
              {status}
            </section>
          )}

          <section className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-2xl font-semibold">
              Add Routine Step
            </h2>

            <div className="grid gap-4">
              <select
                value={selectedRoutine}
                onChange={(event) => setSelectedRoutine(event.target.value)}
                className="rounded-2xl border border-slate-200 p-4"
              >
                {routines.map((routine) => (
                  <option key={routine.id} value={routine.id}>
                    {routine.title}
                  </option>
                ))}
              </select>

              <input
                value={newStepTitle}
                onChange={(event) => setNewStepTitle(event.target.value)}
                className="rounded-2xl border border-slate-200 p-4 text-lg"
                placeholder="Step title"
              />

              <input
                type="number"
                min="1"
                value={newStepOrder}
                onChange={(event) => setNewStepOrder(event.target.value)}
                className="rounded-2xl border border-slate-200 p-4"
                placeholder="Order"
              />

              <button
                onClick={addRoutineStep}
                className="rounded-2xl bg-blue-600 p-4 text-lg font-semibold text-white hover:bg-blue-700"
              >
                Add routine step
              </button>
            </div>
          </section>

<section className="rounded-3xl bg-white p-6 shadow-sm">
  <h2 className="mb-5 text-2xl font-semibold">
    Existing Routine Steps
  </h2>

  <div className="overflow-x-auto rounded-2xl bg-slate-50 p-3">
    <div className="grid min-w-[900px] grid-cols-3 gap-3">
      {[...routines]
  .sort((a, b) => {
    const order = ['morning', 'afternoon', 'evening']

    return (
      order.indexOf(a.time_of_day || '') -
      order.indexOf(b.time_of_day || '')
    )
  })
  .map((routine) => {
        const routineSteps = steps
          .filter((step) => step.routine_id === routine.id)
          .sort((a, b) => a.step_order - b.step_order)

        return (
          <section
            key={routine.id}
            className="min-h-[400px] rounded-2xl border border-slate-200 bg-white p-4"
          >
            <h3 className="mb-4 text-center text-lg font-bold">
              {routine.title}
            </h3>

            {routineSteps.length === 0 && (
              <p className="text-center text-xs text-slate-400">
                No steps
              </p>
            )}

            <div className="space-y-2">
              {routineSteps.map((step) => (
                <div
                  key={step.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="text-sm font-semibold">
                    {step.step_order}. {step.title}
                  </div>

                  <button
                    onClick={() => deleteRoutineStep(step.id)}
                    className="mt-3 w-full rounded-lg border border-red-200 px-3 py-2 text-xs text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  </div>
</section>
        </ParentGate>
      </div>
    </main>
  )
}