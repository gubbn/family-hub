'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import NavBar from '../components/NavBar'
import { supabase } from '../lib/supabaseClient'

type MealPlanItem = {
  day_of_week: number
  notes: string | null
  meals: { title: string } | { title: string }[] | null
}

type Completion = {
  completed_by: string | null
  chores: { points: number } | { points: number }[] | null
}

type FamilyMember = {
  id: string
  name: string
  avatar_emoji: string | null
}

type WeeklyEvent = {
  id: string
  title: string
  day_of_week: number
  start_time: string | null
  end_time: string | null
  location: string | null
  notes: string | null
}

const dashboardCards = [
  { title: 'Chores', href: '/chores', emoji: '🧹' },
  { title: 'Routines', href: '/routines', emoji: '🌅' },
  { title: 'Schedule', href: '/schedule', emoji: '📅' },
  { title: 'Meals', href: '/meals', emoji: '🍽️' },
  { title: 'I’m Bored', href: '/bored', emoji: '🎲' },
  { title: 'Parent Zone', href: '/parent', emoji: '🔐' },
]

export default function Home() {
  const [mealPlan, setMealPlan] = useState<MealPlanItem[]>([])
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [points, setPoints] = useState<Record<string, number>>({})
  const [events, setEvents] = useState<WeeklyEvent[]>([])
  const [loading, setLoading] = useState(true)

  const todayNumber = (() => {
    const jsDay = new Date().getDay()
    return jsDay === 0 ? 7 : jsDay
  })()

  async function loadDashboardData() {
    setLoading(true)

    const today = new Date().toISOString().split('T')[0]

    const { data: mealData } = await supabase
      .from('meal_plan')
      .select(`
        day_of_week,
        notes,
        meals (
          title
        )
      `)

    const { data: membersData } = await supabase
      .from('family_members')
      .select('id, name, avatar_emoji')

    const { data: completedData } = await supabase
      .from('chore_completions')
      .select('completed_by, chores(points)')
      .gte('completed_at', today)

    const { data: eventsData } = await supabase
      .from('weekly_events')
      .select('*')
      .eq('active', true)
      .order('day_of_week')
      .order('start_time')

    setMealPlan(mealData || [])
    setFamilyMembers(membersData || [])
    setEvents(eventsData || [])

    const totals: Record<string, number> = {}

    ;(completedData as Completion[] | null)?.forEach((completion) => {
      if (!completion.completed_by) return

      const chorePoints = Array.isArray(completion.chores)
        ? completion.chores[0]?.points || 0
        : completion.chores?.points || 0

      totals[completion.completed_by] =
        (totals[completion.completed_by] || 0) + chorePoints
    })

    setPoints(totals)
    setLoading(false)
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  const todaysMeal = useMemo(() => {
    return mealPlan.find((item) => item.day_of_week === todayNumber)
  }, [mealPlan, todayNumber])

  const mealTitle = (() => {
    if (!todaysMeal?.meals) return null

    return Array.isArray(todaysMeal.meals)
      ? todaysMeal.meals[0]?.title
      : todaysMeal.meals.title
  })()

  const currentDate = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const upcomingEvent = useMemo(() => {
    const now = new Date()

    const currentTime =
      now.getHours().toString().padStart(2, '0') +
      ':' +
      now.getMinutes().toString().padStart(2, '0')

    const todaysEvents = events.filter(
      (event) =>
        event.day_of_week === todayNumber &&
        event.start_time &&
        event.start_time >= currentTime
    )

    return todaysEvents[0] || null
  }, [events, todayNumber])

  const leaderboard = familyMembers
    .map((member) => ({
      ...member,
      total: points[member.id] || 0,
    }))
    .sort((a, b) => b.total - a.total)

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <NavBar />

        <section className="mb-4 rounded-2xl bg-white p-5 shadow-sm">
          <h1 className="mb-2 text-3xl font-bold tracking-tight">
            Our Day
          </h1>

          <p className="text-sm text-slate-600">
            Chores, routines, meals and family plans in one place.
          </p>
        </section>

        <section className="mb-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-xl font-semibold">
              {currentDate}
            </h2>

            <div className="grid gap-3">
              <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                <div className="text-xs font-medium text-orange-700">
                  Meal of the day
                </div>

                {loading && (
                  <p className="mt-1 text-sm text-slate-500">
                    Loading meal plan...
                  </p>
                )}

                {!loading && !mealTitle && (
                  <p className="mt-1 text-sm text-slate-500">
                    No meal planned.
                  </p>
                )}

                {!loading && mealTitle && (
                  <>
                    <div className="mt-1 text-2xl font-bold">
                      {mealTitle}
                    </div>

                    {todaysMeal?.notes && (
                      <div className="mt-2 text-sm text-slate-600">
                        {todaysMeal.notes}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <div className="text-xs font-medium text-blue-700">
                  Coming up next
                </div>

                {!upcomingEvent && (
                  <p className="mt-1 text-sm text-slate-500">
                    Nothing else scheduled today 🎉
                  </p>
                )}

                {upcomingEvent && (
                  <>
                    <div className="mt-1 text-2xl font-bold">
                      {upcomingEvent.title}
                    </div>

                    <div className="mt-1 text-sm text-slate-600">
                      {upcomingEvent.start_time}
                      {upcomingEvent.end_time &&
                        ` - ${upcomingEvent.end_time}`}
                    </div>

                    {upcomingEvent.location && (
                      <div className="mt-1 text-sm text-slate-500">
                        📍 {upcomingEvent.location}
                      </div>
                    )}

                    {upcomingEvent.notes && (
                      <div className="mt-2 text-sm text-slate-500">
                        {upcomingEvent.notes}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-xl font-semibold">
              Points Leaderboard
            </h2>

            <div className="space-y-2">
              {leaderboard.map((member, index) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 text-sm font-bold text-slate-500">
                      #{index + 1}
                    </div>

                    <div className="text-2xl">
                      {member.avatar_emoji || '🙂'}
                    </div>

                    <div className="font-medium">
                      {member.name}
                    </div>
                  </div>

                  <div className="text-lg font-bold text-blue-600">
                    {member.total}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {dashboardCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-2 text-4xl">
                {card.emoji}
              </div>

              <h2 className="text-xl font-semibold">
                {card.title}
              </h2>
            </Link>
          ))}
        </section>
      </div>
    </main>
  )
}