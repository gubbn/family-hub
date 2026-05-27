'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import NavBar from '../../components/NavBar'

type FamilyMember = {
  id: string
  name: string
  avatar_emoji: string | null
}

type Meal = {
  id: string
  title: string
}

type MealRating = {
  meal_id: string
  family_member_id: string
  rating: number
}

export default function MealsPage() {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [selectedMember, setSelectedMember] = useState('')
  const [meals, setMeals] = useState<Meal[]>([])
  const [ratings, setRatings] = useState<MealRating[]>([])
  const [loading, setLoading] = useState(true)

  async function loadData() {
    setLoading(true)

    try {
      const { data: membersData } = await supabase
        .from('family_members')
        .select('id, name, avatar_emoji')

      const { data: mealsData } = await supabase
        .from('meals')
        .select('id, title')
        .order('title')

      const { data: ratingsData } = await supabase
        .from('meal_ratings')
        .select('meal_id, family_member_id, rating')

      const safeMembers = membersData || []

      setFamilyMembers(safeMembers)
      setSelectedMember((current) => current || safeMembers[0]?.id || '')
      setMeals(mealsData || [])
      setRatings(ratingsData || [])
    } catch (error) {
      console.error('Load meals failed:', error)
    } finally {
      setLoading(false)
    }
  }

  async function rateMeal(mealId: string, rating: number) {
    if (!selectedMember) return

    const { error } = await supabase
      .from('meal_ratings')
      .upsert(
        {
          meal_id: mealId,
          family_member_id: selectedMember,
          rating,
        },
        {
          onConflict: 'meal_id,family_member_id',
        }
      )

    if (error) {
      console.error('Rate meal error:', error)
      return
    }

    await loadData()
  }

  function getMemberRating(mealId: string) {
    return ratings.find(
      (rating) =>
        rating.meal_id === mealId &&
        rating.family_member_id === selectedMember
    )?.rating
  }

  function getAverageRating(mealId: string) {
    const mealRatings = ratings.filter(
      (rating) => rating.meal_id === mealId
    )

    if (mealRatings.length === 0) return null

    const total = mealRatings.reduce(
      (sum, rating) => sum + rating.rating,
      0
    )

    return Math.round((total / mealRatings.length) * 10) / 10
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <NavBar />

        <h1 className="mb-6 text-5xl font-bold tracking-tight">
          Meals
        </h1>

        <section className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-2xl font-semibold">
            Who&apos;s rating?
          </h2>

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

                <div className="text-xl font-medium">
                  {member.name}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-3xl font-semibold">
            Family Meals
          </h2>

          {loading && (
            <p className="text-slate-500">
              Loading meals...
            </p>
          )}

          {!loading && meals.length === 0 && (
            <p className="text-slate-500">
              No meals found
            </p>
          )}

          <div className="space-y-4">
            {meals.map((meal) => {
              const memberRating = getMemberRating(meal.id)
              const averageRating = getAverageRating(meal.id)

              return (
                <div
                  key={meal.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-2xl font-semibold">
                        {meal.title}
                      </h3>

                      <p className="text-sm text-slate-500">
                        Family average:{' '}
                        {averageRating ? `${averageRating}/5` : 'No ratings yet'}
                      </p>
                    </div>

                    <div className="text-sm text-slate-500">
                      Your rating: {memberRating || 'Not rated'}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => rateMeal(meal.id, rating)}
                        className={`rounded-xl border px-4 py-3 text-lg transition ${
                          memberRating === rating
                            ? 'border-yellow-400 bg-yellow-100'
                            : 'border-slate-200 bg-white hover:bg-slate-100'
                        }`}
                      >
                        {'⭐'.repeat(rating)}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </main>
  )
}