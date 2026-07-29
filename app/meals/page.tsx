'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import NavBar from '../../components/NavBar'
import { useHousehold } from '../../components/AuthProvider'
import { joinMealsToPlan } from '../../lib/mealPlan'

type FamilyMember = {
  id: string
  name: string
  avatar_emoji: string | null
}

type MenuMeal = {
  id: string
  day_of_week: number
  meal_id: string | null
  notes: string | null
  meals: Meal | null
}

type MealRating = {
  meal_id: string
  family_member_id: string
  rating: number
}

type Meal = {
  id: string
  title: string
  staple?: string | null
}

const dayNames: Record<number, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
}

export default function MealsPage() {
  const { householdId } = useHousehold()
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [selectedMember, setSelectedMember] = useState('')
  const [menuMeals, setMenuMeals] = useState<MenuMeal[]>([])
  const [ratings, setRatings] = useState<MealRating[]>([])
  const [reratingMealIds, setReratingMealIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [allMeals, setAllMeals] = useState<Meal[]>([])

  const loadData = useCallback(async () => {
    if (!householdId) return

    setLoading(true)

    try {
      const [
        { data: membersData, error: membersError },
        { data: planData, error: planError },
        { data: ratingsData, error: ratingsError },
        { data: allMealsData, error: mealsError },
      ] = await Promise.all([
        supabase
          .from('family_members')
          .select('id, name, avatar_emoji')
          .eq('household_id', householdId)
          .order('display_order'),
        supabase
          .from('meal_plan')
          .select('id, day_of_week, meal_id, notes')
          .eq('household_id', householdId)
          .eq('active', true)
          .order('day_of_week', { ascending: true }),
        supabase
          .from('meal_ratings')
          .select('meal_id, family_member_id, rating')
          .eq('household_id', householdId),
        supabase
          .from('meals')
          .select('id, title, staple')
          .eq('household_id', householdId),
      ])

      const safeMembers = membersData || []

      if (membersError) console.error('Load meal members error:', membersError)
      if (planError) console.error('Load meal plan error:', planError)
      if (ratingsError) console.error('Load meal ratings error:', ratingsError)
      if (mealsError) console.error('Load meal library error:', mealsError)

      setFamilyMembers(safeMembers)
      setSelectedMember((current) => current || safeMembers[0]?.id || '')
      setMenuMeals(
        joinMealsToPlan(planData || [], allMealsData || []) as MenuMeal[]
      )
      setRatings((ratingsData as MealRating[]) || [])
      setAllMeals((allMealsData as Meal[]) || [])
    } catch (error) {
      console.error('Load meals failed:', error)
    } finally {
      setLoading(false)
    }
  }, [householdId])

  useEffect(() => {
    loadData()
  }, [loadData])

  function getMealFromPlan(item: MenuMeal) {
    return item.meals
  }

  async function rateMeal(mealId: string, rating: number) {
    if (!selectedMember) return

    const { error } = await supabase
      .from('meal_ratings')
      .upsert(
        {
          meal_id: mealId,
          family_member_id: selectedMember,
          household_id: householdId,
          rating,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'meal_id,family_member_id',
        }
      )

    if (error) {
      console.error('Rate meal error:', error)
      alert(error.message)
      return
    }

    setReratingMealIds((current) => current.filter((id) => id !== mealId))
    await loadData()
  }

  function getMemberRating(mealId: string) {
    return ratings.find(
      (rating) =>
        rating.meal_id === mealId &&
        rating.family_member_id === selectedMember
    )?.rating
  }

  function getMealRatingSummary(mealId: string) {
    const mealRatings = ratings.filter((rating) => rating.meal_id === mealId)

    if (mealRatings.length === 0) {
      return {
        average: null as number | null,
        count: 0,
      }
    }

    const total = mealRatings.reduce((sum, rating) => sum + rating.rating, 0)

    return {
      average: Math.round((total / mealRatings.length) * 10) / 10,
      count: mealRatings.length,
    }
  }

  function getRatedMeals() {
  return allMeals
    .map((meal) => {
      const mealRatings = ratings
        .filter((rating) => rating.meal_id === meal.id)
        .map((rating) => rating.rating)

      if (mealRatings.length === 0) return null

      const average =
        mealRatings.reduce((sum, rating) => sum + rating, 0) /
        mealRatings.length

      return {
        id: meal.id,
        title: meal.title,
        staple: meal.staple,
        average: Math.round(average * 10) / 10,
        count: mealRatings.length,
      }
    })
    .filter(Boolean) as {
      id: string
      title: string
      staple?: string | null
      average: number
      count: number
    }[]
}

  const familyFavourites = getRatedMeals()
    .filter((meal) => meal.average >= 4)
    .sort((a, b) => b.average - a.average)
    .slice(0, 5)

  const needsReview = getRatedMeals()
    .filter((meal) => meal.average <= 2.5)
    .sort((a, b) => a.average - b.average)
    .slice(0, 5)

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <NavBar />

        <h1 className="mb-6 text-5xl font-bold tracking-tight">Meals</h1>

        <section className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-2xl font-semibold">Who&apos;s rating?</h2>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {familyMembers.map((member) => (
              <button
                key={member.id}
                onClick={() => setSelectedMember(member.id)}
                className={`rounded-2xl border p-5 text-center transition-all ${
                  selectedMember === member.id
                    ? 'border-blue-500 bg-blue-100 shadow-sm'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="mb-2 text-5xl">
                  {member.avatar_emoji || '🙂'}
                </div>

                <div className="text-xl font-medium">{member.name}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-3xl font-semibold">This Week&apos;s Menu</h2>

          <p className="mb-5 text-sm text-slate-500">
            Rate the meals currently on this week&apos;s menu.
          </p>

          {loading && <p className="text-slate-500">Loading meals...</p>}

          {!loading && menuMeals.length === 0 && (
            <p className="text-slate-500">No meals planned this week.</p>
          )}

          <div className="space-y-4">
            {menuMeals.map((item) => {
              const meal = getMealFromPlan(item)

              if (!meal) return null

              const memberRating = getMemberRating(meal.id)
              const summary = getMealRatingSummary(meal.id)
              const isRerating = reratingMealIds.includes(meal.id)

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-500">
                        {dayNames[item.day_of_week] || 'Menu day'}
                      </p>

                      <h3 className="text-2xl font-semibold">{meal.title}</h3>

                      {item.notes && (
                        <p className="mt-1 text-sm text-slate-500">
                          {item.notes}
                        </p>
                      )}

                      {meal.staple && (
                        <p className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500">
                          {meal.staple}
                        </p>
                      )}
                    </div>

                    <div className="rounded-xl bg-white px-4 py-3 text-sm text-slate-600">
                      {summary.average ? (
                        <>
                          <div className="font-semibold">
                            ⭐ {summary.average}/5
                          </div>
                          <div>
                            {summary.count} rating
                            {summary.count !== 1 ? 's' : ''}
                          </div>
                        </>
                      ) : (
                        <div>No ratings yet</div>
                      )}
                    </div>
                  </div>

                  {memberRating && !isRerating ? (
                    <div className="rounded-xl bg-white p-4">
                      <p className="text-sm font-medium text-slate-500">
                        Your last rating
                      </p>

                      <p className="mt-1 text-lg font-bold">
                        {'⭐'.repeat(memberRating)} {memberRating}/5
                      </p>

                      <p className="mt-2 text-sm text-slate-500">
                        Happy with this rating, or want to change it?
                      </p>

                      <div className="mt-3 flex flex-wrap gap-3">
                        <button className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
                          👍 Keep this rating
                        </button>

                        <button
                          onClick={() =>
                            setReratingMealIds((current) => [
                              ...current,
                              meal.id,
                            ])
                          }
                          className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-800"
                        >
                          👎 Re-rate this meal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="mb-2 text-sm font-medium text-slate-500">
                        {memberRating ? 'Choose a new rating' : 'How was this meal?'}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            key={rating}
                            onClick={() => rateMeal(meal.id, rating)}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-lg transition hover:bg-yellow-50"
                          >
                            {'⭐'.repeat(rating)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        <section className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-2xl font-semibold">⭐ Family Favourites</h2>

            <p className="mb-5 text-sm text-slate-500">
              Highest-rated meals from your full meal library.
            </p>

            {familyFavourites.length === 0 ? (
              <p className="text-sm text-slate-500">
                No family favourites yet.
              </p>
            ) : (
              <div className="space-y-3">
                {familyFavourites.map((meal) => (
                  <div
                    key={meal.id}
                    className="rounded-2xl bg-yellow-50 p-4"
                  >
                    <div className="font-semibold">{meal.title}</div>
                    <div className="text-sm text-slate-600">
                      ⭐ {meal.average}/5 from {meal.count} rating
                      {meal.count !== 1 ? 's' : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-2xl font-semibold">⚠️ Needs Review</h2>

            <p className="mb-5 text-sm text-slate-500">
              Low-rated meals from your full meal library.
            </p>

            {needsReview.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nothing needs review yet.
              </p>
            ) : (
              <div className="space-y-3">
                {needsReview.map((meal) => (
                  <div
                    key={meal.id}
                    className="rounded-2xl bg-orange-50 p-4"
                  >
                    <div className="font-semibold">{meal.title}</div>
                    <div className="text-sm text-slate-600">
                      ⭐ {meal.average}/5 from {meal.count} rating
                      {meal.count !== 1 ? 's' : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
