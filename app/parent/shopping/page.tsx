'use client'

import { useEffect, useState } from 'react'
import NavBar from '../../../components/NavBar'
import ParentGate from '../../../components/ParentGate'
import ParentBackButton from '../../../components/ParentBackButton'
import { supabase } from '../../../lib/supabaseClient'

type MealPlanItem = {
  id: string
  day_of_week: number
  notes: string | null
  meals:
    | {
        id: string
        title: string
        ingredients: string | null
      }
    | {
        id: string
        title: string
        ingredients: string | null
      }[]
    | null
}

const days: Record<number, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
}

export default function ParentShoppingPage() {
  const [mealPlan, setMealPlan] = useState<MealPlanItem[]>([])
  const [loading, setLoading] = useState(true)

  async function loadShoppingList() {
    setLoading(true)

    const { data, error } = await supabase
      .from('meal_plan')
      .select(`
        id,
        day_of_week,
        notes,
        meals (
          id,
          title,
          ingredients
        )
      `)
      .eq('active', true)
      .order('day_of_week', { ascending: true })

    if (error) {
      console.error('Load shopping list error:', error)
      setMealPlan([])
    } else {
      setMealPlan((data as MealPlanItem[]) || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadShoppingList()
  }, [])

  function getMeal(item: MealPlanItem) {
    if (!item.meals) return null

    return Array.isArray(item.meals)
      ? item.meals[0]
      : item.meals
  }

  function getIngredients(ingredients: string | null) {
    if (!ingredients) return []

    return ingredients
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  const allIngredients = mealPlan.flatMap((item) => {
    const meal = getMeal(item)

    if (!meal?.ingredients) return []

    return getIngredients(meal.ingredients)
  })

  const uniqueIngredients = [...new Set(allIngredients)].sort()

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <NavBar />

        <ParentBackButton />

        <h1 className="mb-6 text-4xl font-bold tracking-tight">
          Shopping List
        </h1>

        <ParentGate>
          <section className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-2xl font-semibold">
              Consolidated Shopping List
            </h2>

            <p className="mb-6 text-sm text-slate-500">
              Ingredients combined from all meals currently on this week's menu.
            </p>

            {loading && (
              <p className="text-slate-500">
                Loading shopping list...
              </p>
            )}

            {!loading && uniqueIngredients.length === 0 && (
              <p className="text-slate-500">
                No ingredients found.
              </p>
            )}

            {!loading && uniqueIngredients.length > 0 && (
              <div className="grid gap-2 md:grid-cols-2">
                {uniqueIngredients.map((ingredient) => (
                  <label
                    key={ingredient}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <input
                      type="checkbox"
                      className="h-5 w-5"
                    />

                    <span>{ingredient}</span>
                  </label>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-2xl font-semibold">
              Meals This Week
            </h2>

            <div className="space-y-4">
              {mealPlan.map((item) => {
                const meal = getMeal(item)

                if (!meal) return null

                const ingredients = getIngredients(
                  meal.ingredients
                )

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <h3 className="text-xl font-semibold">
                      {days[item.day_of_week]} — {meal.title}
                    </h3>

                    {ingredients.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-500">
                        No ingredients added yet.
                      </p>
                    ) : (
                      <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-700">
                        {ingredients.map((ingredient, index) => (
                          <li key={`${ingredient}-${index}`}>
                            {ingredient}
                          </li>
                        ))}
                      </ul>
                    )}
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