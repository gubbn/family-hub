'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import NavBar from '../../../components/NavBar'
import ParentGate from '../../../components/ParentGate'
import ParentBackButton from '../../../components/ParentBackButton'

const days = [
  '',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

type Meal = {
  id: string
  title: string
}

type MealPlan = {
  id: string
  day_of_week: number
  meal_id: string | null
  notes: string | null
}

export default function ParentMealsPage() {
  const [meals, setMeals] = useState<Meal[]>([])
  const [mealPlan, setMealPlan] = useState<MealPlan[]>([])
  const [newMealTitle, setNewMealTitle] = useState('')
  const [status, setStatus] = useState('')

  async function loadData() {
    const { data: mealsData, error: mealsError } = await supabase
      .from('meals')
      .select('id, title')
      .order('created_at', { ascending: false })

    const { data: planData, error: planError } = await supabase
      .from('meal_plan')
      .select('id, day_of_week, meal_id, notes')

    if (mealsError) console.error('Load meals error:', mealsError)
    if (planError) console.error('Load meal plan error:', planError)

    setMeals(mealsData || [])
    setMealPlan(planData || [])
  }

  function getPlanForDay(day: number) {
    return mealPlan.find((plan) => plan.day_of_week === day)
  }

  async function addNewMeal() {
    const trimmedTitle = newMealTitle.trim()

    if (!trimmedTitle) {
      setStatus('Enter a meal name first')
      return
    }

    const { error } = await supabase
      .from('meals')
      .insert({
        title: trimmedTitle,
      })

    if (error) {
      console.error('Add meal error:', error)
      setStatus('Could not add meal')
      return
    }

    setNewMealTitle('')
    setStatus('Meal added')
    await loadData()
  }

  async function updateMealPlan(day: number, mealId: string) {
    const existing = getPlanForDay(day)

    const { error } = await supabase
      .from('meal_plan')
      .upsert(
        {
          id: existing?.id,
          day_of_week: day,
          meal_id: mealId || null,
          notes: existing?.notes || null,
        },
        {
          onConflict: 'day_of_week',
        }
      )

    if (error) {
      console.error('Update meal plan error:', error)
      setStatus('Could not update meal plan')
      return
    }

    setStatus('Meal plan saved')
    await loadData()
  }

  async function updateNotes(day: number, notes: string) {
    const existing = getPlanForDay(day)

    const { error } = await supabase
      .from('meal_plan')
      .upsert(
        {
          id: existing?.id,
          day_of_week: day,
          meal_id: existing?.meal_id || null,
          notes,
        },
        {
          onConflict: 'day_of_week',
        }
      )

    if (error) {
      console.error('Update notes error:', error)
      setStatus('Could not update notes')
      return
    }

    setStatus('Notes saved')
    await loadData()
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
          Parent Zone: Meals
        </h1>

        <ParentGate>
          {status && (
            <section className="mb-6 rounded-2xl bg-white p-4 text-sm text-slate-500 shadow-sm">
              {status}
            </section>
          )}

          <section className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-2xl font-semibold">
              Add New Meal
            </h2>

            <div className="flex flex-col gap-3 md:flex-row">
              <input
                value={newMealTitle}
                onChange={(event) => setNewMealTitle(event.target.value)}
                className="flex-1 rounded-2xl border border-slate-200 p-4 text-lg"
                placeholder="e.g. Chicken fajitas"
              />

              <button
                onClick={addNewMeal}
                className="rounded-2xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white hover:bg-blue-700"
              >
                Add meal
              </button>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-2xl font-semibold">
              Meals This Week
            </h2>

            <div className="space-y-4">
              {days.slice(1).map((day, index) => {
                const dayNumber = index + 1
                const plan = getPlanForDay(dayNumber)

                return (
                  <div
                    key={day}
                    className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[160px_1fr_1fr]"
                  >
                    <div className="text-xl font-semibold">
                      {day}
                    </div>

                    <select
                      value={plan?.meal_id || ''}
                      onChange={(event) =>
                        updateMealPlan(dayNumber, event.target.value)
                      }
                      className="rounded-xl border border-slate-200 bg-white p-3"
                    >
                      <option value="">No meal selected</option>

                      {meals.map((meal) => (
                        <option key={meal.id} value={meal.id}>
                          {meal.title}
                        </option>
                      ))}
                    </select>

                    <input
                      value={plan?.notes || ''}
                      onChange={(event) =>
                        updateNotes(dayNumber, event.target.value)
                      }
                      className="rounded-xl border border-slate-200 bg-white p-3"
                      placeholder="Notes"
                    />
                  </div>
                )
              })}
            </div>
          </section>
        </ParentGate>
      </div>
    </main>
  )
}