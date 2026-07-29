'use client'

import { useCallback, useEffect, useState } from 'react'
import NavBar from '../../../components/NavBar'
import ParentBackButton from '../../../components/ParentBackButton'
import ParentGate from '../../../components/ParentGate'
import { useHousehold } from '../../../components/AuthProvider'
import { supabase } from '../../../lib/supabaseClient'
import { joinMealsToPlan } from '../../../lib/mealPlan'
import {
  categoriseIngredient,
  countMealsByIngredient,
  ingredientKey,
  parseIngredientList,
  shoppingCategories,
} from '../../../lib/ingredients'

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

type ParsedIngredient = {
  category: string
  item: string
  source: 'meal' | 'manual'
  id?: string
  completed?: boolean
  mealCount?: number
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
  const { householdId } = useHousehold()
  const [mealPlan, setMealPlan] = useState<MealPlanItem[]>([])
  const [manualItems, setManualItems] = useState<ShoppingItem[]>([])
  const [newItem, setNewItem] = useState('')
  const [loading, setLoading] = useState(true)
  const [addingItem, setAddingItem] = useState(false)
  const [status, setStatus] = useState('')

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
      console.error('Load shopping list error:', planError)
      if (mealsError) console.error('Load meals error:', mealsError)
      setMealPlan([])
    } else {
      setMealPlan(
        joinMealsToPlan(planData || [], mealsData || []) as MealPlanItem[]
      )
    }

    if (itemsError) {
      console.error('Load manual shopping items error:', itemsError)
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

  function parseIngredients(ingredients: string | null): ParsedIngredient[] {
    return parseIngredientList(ingredients).map((ingredient) => ({
      ...ingredient,
      source: 'meal' as const,
    }))
  }

  function handleShoppingMutationError(
    error: { code?: string },
    fallbackMessage: string
  ) {
    if (error.code === '42501') {
      window.dispatchEvent(new Event('parent-zone-expired'))
      setStatus('Parent Zone timed out. Enter your PIN and try again.')
      return
    }

    setStatus(fallbackMessage)
  }

  const mealIngredients = mealPlan.flatMap((item) => {
    const meal = getMeal(item)
    return parseIngredients(meal?.ingredients || null)
  })

  const manualIngredients: ParsedIngredient[] = manualItems.map((item) => ({
    category: item.category || 'Other',
    item: item.item,
    source: 'manual',
    id: item.id,
    completed: item.completed,
  }))

  const allShoppingItems = [...manualIngredients, ...mealIngredients]

  const mealCountsByIngredient = countMealsByIngredient(
    mealPlan.map((item) => getMeal(item)?.ingredients || null)
  )

  const uniqueShoppingItems = [
    ...allShoppingItems
      .reduce((uniqueItems, ingredient) => {
        const key = ingredientKey(ingredient)

        if (!uniqueItems.has(key)) {
          uniqueItems.set(key, {
            ...ingredient,
            mealCount: mealCountsByIngredient.get(key) || 0,
          })
        }

        return uniqueItems
      }, new Map<string, ParsedIngredient>())
      .values(),
  ]

  const groupedIngredients = shoppingCategories
    .map((category) => ({
      category,
      items: uniqueShoppingItems
        .filter(
          (ingredient) =>
            ingredient.category.toLowerCase() === category.toLowerCase()
        )
        .sort((a, b) => a.item.localeCompare(b.item)),
    }))
    .filter((group) => group.items.length > 0)

  async function addManualItem() {
    const cleanItem = newItem.trim()

    if (!cleanItem) {
      setStatus('Enter an item first')
      return
    }

    if (!householdId) {
      setStatus('Could not identify your household')
      return
    }

    setAddingItem(true)

    const { data, error } = await supabase
      .from('shopping_items')
      .insert({
        household_id: householdId,
        category: categoriseIngredient(cleanItem),
        item: cleanItem,
        completed: false,
      })
      .select('id, category, item, completed')
      .single()

    if (error) {
      console.error('Add shopping item error:', error)
      handleShoppingMutationError(error, 'Could not add item')
      setAddingItem(false)
      return
    }

    setManualItems((current) => [...current, data as ShoppingItem])
    setNewItem('')
    setStatus('Item added')
    setAddingItem(false)
    await loadShoppingList()
  }

  async function toggleManualItem(itemId: string, completed: boolean) {
    const { error } = await supabase
      .from('shopping_items')
      .update({ completed: !completed })
      .eq('id', itemId)
      .eq('household_id', householdId)

    if (error) {
      console.error('Toggle shopping item error:', error)
      handleShoppingMutationError(error, 'Could not update item')
      return
    }

    await loadShoppingList()
  }

  async function deleteManualItem(itemId: string) {
    const { error } = await supabase
      .from('shopping_items')
      .delete()
      .eq('id', itemId)
      .eq('household_id', householdId)

    if (error) {
      console.error('Delete shopping item error:', error)
      handleShoppingMutationError(error, 'Could not delete item')
      return
    }

    setStatus('Item removed')
    await loadShoppingList()
  }

  async function clearCompletedManualItems() {
    const { error } = await supabase
      .from('shopping_items')
      .delete()
      .eq('household_id', householdId)
      .eq('completed', true)

    if (error) {
      console.error('Clear completed shopping items error:', error)
      handleShoppingMutationError(error, 'Could not clear completed items')
      return
    }

    setStatus('Completed items cleared')
    await loadShoppingList()
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <NavBar />

        <ParentBackButton />

        <h1 className="mb-6 text-4xl font-bold tracking-tight">
          Shopping List
        </h1>

        {status && (
          <p
            role="status"
            aria-live="polite"
            className="mb-4 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800"
          >
            {status}
          </p>
        )}

        <ParentGate>
          <section className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-2xl font-semibold">
              Add Shopping Item
            </h2>

            <p className="mb-5 text-sm text-slate-500">
              Add extras that are not linked to meals, like toilet roll, dog
              treats, snacks or milk.
            </p>

            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <input
                value={newItem}
                onChange={(event) => setNewItem(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white p-3"
                placeholder="e.g. toilet roll"
              />

              <button
                onClick={addManualItem}
                disabled={addingItem}
                className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
              >
                {addingItem ? 'Adding...' : 'Add item'}
              </button>
            </div>

            {newItem.trim() && (
              <p className="mt-3 text-sm text-slate-500">
                We&apos;ll add this to{' '}
                <strong>{categoriseIngredient(newItem)}</strong>.
              </p>
            )}
          </section>

          <section className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold">
                  Consolidated Shopping List
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Meal ingredients and manual items grouped by category.
                </p>
              </div>

              <button
                onClick={clearCompletedManualItems}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Clear completed manual items
              </button>
            </div>

            {loading && (
              <p className="text-slate-500">Loading shopping list...</p>
            )}

            {!loading && groupedIngredients.length === 0 && (
              <p className="text-slate-500">No ingredients found.</p>
            )}

            {!loading && groupedIngredients.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                {groupedIngredients.map((group) => (
                  <div
                    key={group.category}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <h3 className="mb-3 text-lg font-semibold">
                      {group.category}
                    </h3>

                    <div className="space-y-2">
                      {group.items.map((ingredient) => {
                        const isManual = ingredient.source === 'manual'

                        return (
                          <div
                            key={`${group.category}-${ingredient.item}`}
                            className="flex items-center justify-between gap-3 rounded-xl bg-white p-3"
                          >
                            <label className="flex flex-1 items-center gap-3">
                              <input
  type="checkbox"
  className="h-5 w-5"
  defaultChecked={ingredient.completed || false}
  onChange={() => {
    if (isManual && ingredient.id) {
      toggleManualItem(
        ingredient.id,
        ingredient.completed || false
      )
    }
  }}
/>

                              <span
                                className={
                                  ingredient.completed
                                    ? 'text-slate-400 line-through'
                                    : ''
                                }
                              >
                                {ingredient.item}
                                {(ingredient.mealCount || 0) > 1
                                  ? ` (${ingredient.mealCount} meals)`
                                  : ''}
                              </span>
                            </label>

                            {isManual && ingredient.id && (
                              <button
                                onClick={() =>
                                  deleteManualItem(ingredient.id as string)
                                }
                                className="text-sm text-red-500 hover:text-red-700"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-2xl font-semibold">Meals This Week</h2>

            <div className="space-y-4">
              {mealPlan.map((item) => {
                const meal = getMeal(item)
                if (!meal) return null

                const ingredients = parseIngredients(meal.ingredients)

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
                          <li key={`${ingredient.item}-${index}`}>
                            <span className="font-medium">
                              {ingredient.category}:
                            </span>{' '}
                            {ingredient.item}
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
