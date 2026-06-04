'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { getSetting } from '../../../lib/settings'
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

const stapleOptions = [
  'Beef',
  'Chicken',
  'Vegetarian',
  'Fish',
  'Pasta',
  'Rice',
  'Side',
  'Quick Meal',
  'Slow Cooker',
  'Air Fryer',
]

type Meal = {
  id: string
  title: string
  notes: string | null
  staple: string | null
  ingredients: string | null
}

type MealPlan = {
  id: string
  day_of_week: number
  meal_id: string | null
  notes: string | null
  week_start: string | null
}

type MealRating = {
  meal_id: string
  rating: number
}

type GeneratedMeal = Meal & {
  average: number
  recentlyUsed: boolean
}

function getCurrentWeekStart() {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)

  monday.setDate(now.getDate() + diff)

  return monday.toISOString().split('T')[0]
}

export default function ParentMealsPage() {
  const [meals, setMeals] = useState<Meal[]>([])
  const [mealPlan, setMealPlan] = useState<MealPlan[]>([])
  const [newMealTitle, setNewMealTitle] = useState('')
  const [newMealStaple, setNewMealStaple] = useState('')
  const [newMealIngredients, setNewMealIngredients] = useState('')
  const [generatedMenu, setGeneratedMenu] = useState<GeneratedMeal[]>([])
  const [status, setStatus] = useState('')

  async function loadData() {
    const { data: mealsData, error: mealsError } = await supabase
      .from('meals')
      .select('id, title, notes, staple, ingredients')
      .order('created_at', { ascending: false })

    const { data: planData, error: planError } = await supabase
      .from('meal_plan')
      .select('id, day_of_week, meal_id, notes, week_start')
      .eq('active', true)
      .order('day_of_week', { ascending: true })

    if (mealsError) {
      console.error('Load meals error:', mealsError)
      setStatus('Could not load meals')
    }

    if (planError) {
      console.error('Load meal plan error:', planError)
      setStatus('Could not load meal plan')
    }

    setMeals((mealsData as Meal[]) || [])
    setMealPlan((planData as MealPlan[]) || [])
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

    const { error } = await supabase.from('meals').insert({
      title: trimmedTitle,
      notes: null,
      staple: newMealStaple || null,
      ingredients: newMealIngredients.trim() || null,
    })

    if (error) {
      console.error('Add meal error:', error)
      setStatus('Could not add meal')
      return
    }

    setNewMealTitle('')
    setNewMealStaple('')
    setNewMealIngredients('')
    setStatus('Meal added')
    await loadData()
  }

  async function updateMeal(mealId: string, title: string) {
    const trimmedTitle = title.trim()

    if (!trimmedTitle) {
      setStatus('Meal name cannot be blank')
      return
    }

    const { error } = await supabase
      .from('meals')
      .update({ title: trimmedTitle })
      .eq('id', mealId)

    if (error) {
      console.error('Update meal error:', error)
      setStatus('Could not update meal')
      return
    }

    setStatus('Meal updated')
    await loadData()
  }

  async function updateMealNotes(mealId: string, notes: string) {
    const { error } = await supabase
      .from('meals')
      .update({ notes: notes || null })
      .eq('id', mealId)

    if (error) {
      console.error('Update meal notes error:', error)
      setStatus('Could not update meal notes')
      return
    }

    setStatus('Meal notes updated')
    await loadData()
  }

  async function updateMealStaple(mealId: string, staple: string) {
    const { error } = await supabase
      .from('meals')
      .update({ staple: staple || null })
      .eq('id', mealId)

    if (error) {
      console.error('Update meal staple error:', error)
      setStatus('Could not update meal staple')
      return
    }

    setStatus('Meal staple updated')
    await loadData()
  }

  async function updateMealIngredients(mealId: string, ingredients: string) {
    const { error } = await supabase
      .from('meals')
      .update({ ingredients: ingredients || null })
      .eq('id', mealId)

    if (error) {
      console.error('Update meal ingredients error:', error)
      setStatus('Could not update meal ingredients')
      return
    }

    setStatus('Meal ingredients updated')
    await loadData()
  }

  async function deleteMeal(mealId: string) {
    const { error } = await supabase.from('meals').delete().eq('id', mealId)

    if (error) {
      console.error('Delete meal error:', error)
      setStatus('Could not delete meal')
      return
    }

    setStatus('Meal deleted')
    await loadData()
  }

  async function updateMealPlan(day: number, mealId: string) {
    const existing = getPlanForDay(day)

    const { error } = await supabase.from('meal_plan').upsert(
      {
        id: existing?.id,
        day_of_week: day,
        meal_id: mealId || null,
        notes: existing?.notes || null,
        active: true,
        week_start: getCurrentWeekStart(),
      },
      { onConflict: 'day_of_week' }
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

    const { error } = await supabase.from('meal_plan').upsert(
      {
        id: existing?.id,
        day_of_week: day,
        meal_id: existing?.meal_id || null,
        notes,
        active: true,
        week_start: getCurrentWeekStart(),
      },
      { onConflict: 'day_of_week' }
    )

    if (error) {
      console.error('Update notes error:', error)
      setStatus('Could not update notes')
      return
    }

    setStatus('Notes saved')
    await loadData()
  }

  async function buildGeneratedMenu() {
    const { data: mealsData, error: mealsError } = await supabase
      .from('meals')
      .select('id, title, notes, staple, ingredients')

    const { data: ratingsData, error: ratingsError } = await supabase
      .from('meal_ratings')
      .select('meal_id, rating')

    const fourWeeksAgo = new Date()
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)

    const { data: recentPlanData, error: recentPlanError } = await supabase
      .from('meal_plan')
      .select('meal_id')
      .gte('week_start', fourWeeksAgo.toISOString().split('T')[0])

    if (mealsError || ratingsError || recentPlanError) {
      console.error(
        'Generate menu error:',
        mealsError || ratingsError || recentPlanError
      )
      setStatus('Could not generate menu')
      return []
    }

    const allMeals = (mealsData as Meal[]) || []
    const ratings = (ratingsData as MealRating[]) || []

    if (allMeals.length < 7) {
      setStatus('You need at least 7 meals before generating a full week')
      return []
    }

    const recentMealIds =
      recentPlanData?.map((plan) => plan.meal_id).filter(Boolean) || []

    const chickenRule = Number((await getSetting('meal_rule_chicken')) || 2)
    const beefRule = Number((await getSetting('meal_rule_beef')) || 1)
    const vegetarianRule = Number(
      (await getSetting('meal_rule_vegetarian')) || 1
    )
    const fishRule = Number((await getSetting('meal_rule_fish')) || 1)
    const quickMealRule = Number(
      (await getSetting('meal_rule_quick_meal')) || 1
    )

    const targetStaples: string[] = [
      ...Array(chickenRule).fill('Chicken'),
      ...Array(beefRule).fill('Beef'),
      ...Array(vegetarianRule).fill('Vegetarian'),
      ...Array(fishRule).fill('Fish'),
      ...Array(quickMealRule).fill('Quick Meal'),
    ].slice(0, 7)

    const scoredMeals: GeneratedMeal[] = allMeals.map((meal) => {
      const mealRatings = ratings.filter((rating) => rating.meal_id === meal.id)

      const average =
        mealRatings.length === 0
          ? 3
          : mealRatings.reduce((sum, rating) => sum + rating.rating, 0) /
            mealRatings.length

      return {
        ...meal,
        average,
        recentlyUsed: recentMealIds.includes(meal.id),
      }
    })

    const selectedMeals: GeneratedMeal[] = []

    function pickMealByStaple(staple: string) {
      const match = scoredMeals
        .filter(
          (meal) =>
            meal.staple === staple &&
            !selectedMeals.some((selected) => selected.id === meal.id)
        )
        .sort((a, b) => {
          if (a.recentlyUsed !== b.recentlyUsed) {
            return a.recentlyUsed ? 1 : -1
          }

          return b.average - a.average
        })[0]

      if (match) {
        selectedMeals.push(match)
      }
    }

    targetStaples.forEach((staple) => {
      pickMealByStaple(staple)
    })

    const fillerMeals = scoredMeals
      .filter(
        (meal) => !selectedMeals.some((selected) => selected.id === meal.id)
      )
      .sort((a, b) => {
        if (a.recentlyUsed !== b.recentlyUsed) {
          return a.recentlyUsed ? 1 : -1
        }

        return b.average - a.average
      })

    while (selectedMeals.length < 7 && fillerMeals.length > 0) {
      const nextMeal = fillerMeals.shift()

      if (nextMeal) {
        selectedMeals.push(nextMeal)
      }
    }

    if (selectedMeals.length < 7) {
      setStatus('Could not find enough meals to build a full menu')
      return []
    }

    return selectedMeals
  }

  async function generateNextWeekMenu() {
    setStatus('Generating menu preview...')

    const selectedMeals = await buildGeneratedMenu()

    if (selectedMeals.length !== 7) return

    setGeneratedMenu(selectedMeals)
    setStatus('Menu preview generated. Confirm to save it.')
  }

  async function confirmGeneratedMenu() {
    if (generatedMenu.length !== 7) {
      setStatus('Generate a full menu first')
      return
    }

    for (let day = 1; day <= 7; day++) {
      const existing = getPlanForDay(day)
      const selectedMeal = generatedMenu[day - 1]

      const { error } = await supabase.from('meal_plan').upsert(
        {
          id: existing?.id,
          day_of_week: day,
          meal_id: selectedMeal.id,
          notes: existing?.notes || null,
          active: true,
          week_start: getCurrentWeekStart(),
        },
        { onConflict: 'day_of_week' }
      )

      if (error) {
        console.error('Confirm generated menu error:', error)
        setStatus('Could not save generated menu')
        return
      }
    }

    setGeneratedMenu([])
    setStatus('Generated menu saved')
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
            <h2 className="mb-5 text-2xl font-semibold">Add New Meal</h2>

            <div className="grid gap-3">
              <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
                <input
                  value={newMealTitle}
                  onChange={(event) => setNewMealTitle(event.target.value)}
                  className="rounded-2xl border border-slate-200 p-4 text-lg"
                  placeholder="e.g. Chicken fajitas"
                />

                <select
                  value={newMealStaple}
                  onChange={(event) => setNewMealStaple(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white p-4 text-lg"
                >
                  <option value="">Staple</option>

                  {stapleOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>

                <button
                  onClick={addNewMeal}
                  className="rounded-2xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white hover:bg-blue-700"
                >
                  Add meal
                </button>
              </div>

              <textarea
                value={newMealIngredients}
                onChange={(event) => setNewMealIngredients(event.target.value)}
                className="min-h-28 rounded-2xl border border-slate-200 p-4 text-lg"
                placeholder="Ingredients, one per line e.g. chicken breast, wraps, peppers"
              />
            </div>
          </section>

          <section className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-2xl font-semibold">Generate Menu</h2>

            <p className="mb-4 text-sm text-slate-500">
              Pick 7 meals automatically using your generator rules, ratings,
              staple tags and recent menu history.
            </p>

            <button
              onClick={generateNextWeekMenu}
              className="rounded-2xl bg-green-600 px-6 py-4 text-lg font-semibold text-white hover:bg-green-700"
            >
              Generate menu preview
            </button>

            {generatedMenu.length > 0 && (
              <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                <h3 className="mb-3 text-xl font-semibold">
                  Suggested Menu Preview
                </h3>

                <div className="space-y-2">
                  {generatedMenu.map((meal, index) => (
                    <div key={meal.id} className="rounded-xl bg-white p-3">
                      <div className="font-semibold">
                        {days[index + 1]}: {meal.title}
                      </div>

                      <div className="text-sm text-slate-500">
                        {meal.staple || 'No staple'} · ⭐{' '}
                        {Math.round(meal.average * 10) / 10}/5
                        {meal.recentlyUsed ? ' · used recently' : ''}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={confirmGeneratedMenu}
                    className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700"
                  >
                    Confirm menu
                  </button>

                  <button
                    onClick={generateNextWeekMenu}
                    className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-white"
                  >
                    Regenerate
                  </button>

                  <button
                    onClick={() => {
                      setGeneratedMenu([])
                      setStatus('Menu preview cancelled')
                    }}
                    className="rounded-xl border border-red-200 px-5 py-3 font-semibold text-red-600 hover:bg-red-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-2xl font-semibold">Meals This Week</h2>

            <div className="space-y-4">
              {days.slice(1).map((day, index) => {
                const dayNumber = index + 1
                const plan = getPlanForDay(dayNumber)

                return (
                  <div
                    key={day}
                    className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[160px_1fr_1fr]"
                  >
                    <div className="text-xl font-semibold">{day}</div>

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
                          {meal.staple ? ` (${meal.staple})` : ''}
                        </option>
                      ))}
                    </select>

                    <input
                      value={plan?.notes || ''}
                      onChange={(event) =>
                        updateNotes(dayNumber, event.target.value)
                      }
                      className="rounded-xl border border-slate-200 bg-white p-3"
                      placeholder="Daily meal notes"
                    />
                  </div>
                )
              })}
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-2xl font-semibold">Existing Meals</h2>

            <div className="space-y-3">
              {meals.map((meal) => (
                <div
                  key={meal.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
                    <input
                      value={meal.title}
                      onChange={(event) =>
                        updateMeal(meal.id, event.target.value)
                      }
                      className="rounded-xl border border-slate-200 bg-white p-3"
                    />

                    <select
                      value={meal.staple || ''}
                      onChange={(event) =>
                        updateMealStaple(meal.id, event.target.value)
                      }
                      className="rounded-xl border border-slate-200 bg-white p-3"
                    >
                      <option value="">No staple</option>

                      {stapleOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => deleteMeal(meal.id)}
                      className="rounded-xl border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <textarea
                      value={meal.notes || ''}
                      onChange={(event) =>
                        updateMealNotes(meal.id, event.target.value)
                      }
                      className="min-h-24 rounded-xl border border-slate-200 bg-white p-3"
                      placeholder="Meal notes"
                    />

                    <textarea
                      value={meal.ingredients || ''}
                      onChange={(event) =>
                        updateMealIngredients(meal.id, event.target.value)
                      }
                      className="min-h-24 rounded-xl border border-slate-200 bg-white p-3"
                      placeholder="Ingredients, one per line"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </ParentGate>
      </div>
    </main>
  )
}