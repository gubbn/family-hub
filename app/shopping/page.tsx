'use client'

import { useEffect, useState } from 'react'
import NavBar from '../../components/NavBar'
import { supabase } from '../../lib/supabaseClient'
import {
  parseIngredientList,
  shoppingCategories,
} from '../../lib/ingredients'

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

export default function ShoppingPage() {
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
    return Array.isArray(item.meals) ? item.meals[0] : item.meals
  }

  const ingredientsByCategory = shoppingCategories
    .map((category) => ({
      category,
      items: mealPlan.flatMap((item) => {
        const meal = getMeal(item)
        return parseIngredientList(meal?.ingredients || null)
          .filter((ingredient) => ingredient.category === category)
          .map((ingredient) => ingredient.item)
      }),
    }))
    .map((group) => ({
      ...group,
      items: [...new Set(group.items)].sort((a, b) => a.localeCompare(b)),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <NavBar />

        <h1 className="mb-6 text-5xl font-bold tracking-tight">
          Shopping List
        </h1>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-2xl font-semibold">
            This Week&apos;s Ingredients
          </h2>

          <p className="mb-6 text-sm text-slate-500">
            Ingredients are pulled from the meals currently on the weekly menu.
          </p>

          {loading && (
            <p className="text-slate-500">
              Loading shopping list...
            </p>
          )}

          {!loading && mealPlan.length === 0 && (
            <p className="text-slate-500">
              No meals planned this week.
            </p>
          )}

          {!loading && ingredientsByCategory.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {ingredientsByCategory.map((group) => (
                <div
                  key={group.category}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <h3 className="text-xl font-semibold">{group.category}</h3>
                  <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-700">
                    {group.items.map((ingredient) => (
                      <li key={ingredient}>{ingredient}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
