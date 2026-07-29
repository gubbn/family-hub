'use client'

import { useCallback, useEffect, useState } from 'react'
import NavBar from '../../components/NavBar'
import { supabase } from '../../lib/supabaseClient'
import { useHousehold } from '../../components/AuthProvider'
import { joinMealsToPlan } from '../../lib/mealPlan'
import {
  parseIngredientList,
  shoppingCategories,
} from '../../lib/ingredients'

type MealPlanItem = {
  id: string
  day_of_week: number
  meal_id: string | null
  notes: string | null
  meals: {
    id: string
    title: string
    ingredients: string | null
  } | null
}

type ShoppingItem = {
  id: string
  category: string
  item: string
  completed: boolean
}

export default function ShoppingPage() {
  const { householdId } = useHousehold()
  const [mealPlan, setMealPlan] = useState<MealPlanItem[]>([])
  const [manualItems, setManualItems] = useState<ShoppingItem[]>([])
  const [loading, setLoading] = useState(true)

  const loadShoppingList = useCallback(async () => {
    if (!householdId) {
      setLoading(false)
      return
    }

    setLoading(true)

    const { data: planData, error: planError } = await supabase
      .from('meal_plan')
      .select('id, day_of_week, meal_id, notes')
      .eq('household_id', householdId)
      .eq('active', true)
      .order('day_of_week', { ascending: true })

    const { data: mealsData, error: mealsError } = await supabase
      .from('meals')
      .select('id, title, ingredients')
      .eq('household_id', householdId)

    const { data: itemsData, error: itemsError } = await supabase
      .from('shopping_items')
      .select('id, category, item, completed')
      .eq('household_id', householdId)
      .order('created_at', { ascending: true })

    if (planError || mealsError) {
      console.error('Load shopping list error:', planError || mealsError)
      setMealPlan([])
    } else {
      setMealPlan(
        joinMealsToPlan(planData || [], mealsData || []) as MealPlanItem[]
      )
    }

    if (itemsError) {
      console.error('Load direct shopping items error:', itemsError)
      setManualItems([])
    } else {
      setManualItems((itemsData as ShoppingItem[]) || [])
    }

    setLoading(false)
  }, [householdId])

  useEffect(() => {
    loadShoppingList()
  }, [loadShoppingList])

  function getMeal(item: MealPlanItem) {
    return item.meals
  }

  const ingredientsByCategory = shoppingCategories
    .map((category) => ({
      category,
      items: [
        ...manualItems
          .filter(
            (item) =>
              (item.category || 'Other').toLowerCase() ===
              category.toLowerCase()
          )
          .map((item) => item.item),
        ...mealPlan.flatMap((item) => {
          const meal = getMeal(item)
          return parseIngredientList(meal?.ingredients || null)
            .filter((ingredient) => ingredient.category === category)
            .map((ingredient) => ingredient.item)
        }),
      ],
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
            This Week&apos;s Shopping List
          </h2>

          <p className="mb-6 text-sm text-slate-500">
            Meal ingredients and extras added directly by a parent.
          </p>

          {loading && (
            <p className="text-slate-500">
              Loading shopping list...
            </p>
          )}

          {!loading && ingredientsByCategory.length === 0 && (
            <p className="text-slate-500">
              Nothing on the shopping list yet.
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
