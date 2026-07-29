'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import NavBar from '../components/NavBar'
import WeatherCard from '../components/WeatherCard'
import DogWalkSuggestion from '../components/DogWalkSuggestion'
import { useHousehold } from '../components/AuthProvider'
import { supabase } from '../lib/supabaseClient'
import { calculatePointBalances } from '../lib/points'
import { joinMealsToPlan } from '../lib/mealPlan'

type MealPlanItem = {
  day_of_week: number
  meal_id: string | null
  notes: string | null
  meals: { id: string; title: string } | null
}

type Completion = {
  completed_by: string | null
  chore_id?: string
  completed_at?: string
  points_awarded: number
}

type RewardSpend = {
  family_member_id: string
  points_cost: number
}

type FamilyMember = {
  id: string
  name: string
  avatar_emoji: string | null
  role: string | null
  pet_type: string | null
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

type DashboardChore = {
  id: string
  title: string
  points: number
  frequency: 'daily' | 'weekly' | 'adhoc' | null
  shared_completion: boolean | null
}

type ChoreAssignment = {
  chore_id: string
  family_member_id: string
  chores: DashboardChore | DashboardChore[] | null
}

type RoutineStreak = {
  member_id: string
  item_id: string
  streak_count: number
}

type RoutineStreakLeader = {
  id: string
  name: string
  streakTotal: number
}

function getTodayDate() {
  return new Date().toISOString().split('T')[0]
}

function getWeekStartDate() {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)

  monday.setDate(now.getDate() + diff)

  return monday.toISOString().split('T')[0]
}

function formatNames(names: string[]) {
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`

  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

export default function Home() {
  const { householdId, householdName } = useHousehold()
  const [mealPlan, setMealPlan] = useState<MealPlanItem[]>([])
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [points, setPoints] = useState<Record<string, number>>({})
  const [events, setEvents] = useState<WeeklyEvent[]>([])
  const [choreAssignments, setChoreAssignments] = useState<ChoreAssignment[]>([])
  const [choreCompletions, setChoreCompletions] = useState<Completion[]>([])
  const [routineStreaks, setRoutineStreaks] = useState<RoutineStreak[]>([])
  const [loading, setLoading] = useState(true)
  const [hasDog, setHasDog] = useState(false)

  const todayNumber = useMemo(() => {
    const jsDay = new Date().getDay()
    return jsDay === 0 ? 7 : jsDay
  }, [])

  const loadDashboardData = useCallback(async () => {
    if (!householdId) {
      setLoading(false)
      return
    }

    setLoading(true)

    const { data: planData, error: planError } = await supabase
      .from('meal_plan')
      .select('day_of_week, meal_id, notes')
      .eq('household_id', householdId)
      .eq('active', true)

    const { data: mealsData, error: mealsError } = await supabase
      .from('meals')
      .select('id, title')
      .eq('household_id', householdId)

    const { data: membersData, error: membersError } = await supabase
      .from('family_members')
      .select('id, name, avatar_emoji, role, pet_type')
      .eq('household_id', householdId)
      .order('display_order')

    const { data: completedData, error: completedError } = await supabase
      .from('chore_completions')
      .select(`
        chore_id,
        completed_by,
        completed_at,
        points_awarded
      `)
      .eq('household_id', householdId)

    const { data: assignmentData, error: assignmentError } = await supabase
      .from('chore_assignments')
      .select(`
        chore_id,
        family_member_id,
        chores!chore_assignments_chore_household_fkey (
          id,
          title,
          points,
          frequency,
          shared_completion
        )
      `)
      .eq('household_id', householdId)

    const { data: eventsData, error: eventsError } = await supabase
      .from('weekly_events')
      .select('*')
      .eq('household_id', householdId)
      .eq('active', true)
      .order('day_of_week')
      .order('start_time')

    const { data: streakData, error: streakError } = await supabase
      .from('completion_streaks')
      .select('member_id, item_id, streak_count')
      .eq('household_id', householdId)
      .eq('item_type', 'routine_step')
      .gt('streak_count', 0)

    const { data: spendingData, error: spendingError } = await supabase
      .from('reward_requests')
      .select('family_member_id, points_cost')
      .eq('household_id', householdId)
      .eq('status', 'approved')

    if (planError) console.error('Meal plan error:', planError)
    if (mealsError) console.error('Meals error:', mealsError)
    if (membersError) console.error('Members error:', membersError)
    if (completedError) console.error('Completed chores error:', completedError)
    if (assignmentError) console.error('Chore assignments error:', assignmentError)
    if (eventsError) console.error('Weekly events error:', eventsError)
    if (streakError) console.error('Routine streaks error:', streakError)
    if (spendingError) console.error('Reward spending error:', spendingError)

    setMealPlan(
      joinMealsToPlan(planData || [], mealsData || []) as MealPlanItem[]
    )
    const allMembers = (membersData as FamilyMember[]) || []
    setFamilyMembers(allMembers.filter((member) => member.role !== 'pet'))
    setHasDog(
      allMembers.some(
        (member) => member.role === 'pet' && member.pet_type === 'dog'
      )
    )
    setChoreCompletions((completedData as Completion[]) || [])
    setChoreAssignments((assignmentData as ChoreAssignment[]) || [])
    setEvents((eventsData as WeeklyEvent[]) || [])
    setRoutineStreaks((streakData as RoutineStreak[]) || [])

    setPoints(
      calculatePointBalances(
        (completedData as Completion[]) || [],
        (spendingData as RewardSpend[]) || []
      )
    )
    setLoading(false)
  }, [householdId])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const todaysMeal = useMemo(() => {
    return mealPlan.find((item) => item.day_of_week === todayNumber)
  }, [mealPlan, todayNumber])

  const mealTitle = useMemo(() => {
    return todaysMeal?.meals?.title || null
  }, [todaysMeal])

  const currentDate = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const upcomingEvent = useMemo(() => {
    const now = new Date()

    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}`

    return (
      events.find(
        (event) =>
          event.day_of_week === todayNumber &&
          event.start_time &&
          event.start_time >= currentTime
      ) || null
    )
  }, [events, todayNumber])

  const leaderboard = useMemo(() => {
    return familyMembers
      .map((member) => ({
        ...member,
        total: points[member.id] || 0,
      }))
      .sort((a, b) => b.total - a.total)
  }, [familyMembers, points])

  const routineStreakLeaders = useMemo(() => {
    const totals = new Map<string, number>()

    routineStreaks.forEach((streak) => {
      totals.set(streak.member_id, (totals.get(streak.member_id) || 0) + 1)
    })

    const leaders: RoutineStreakLeader[] = familyMembers
      .map((member) => ({
        id: member.id,
        name: member.name,
        streakTotal: totals.get(member.id) || 0,
      }))
      .filter((member) => member.streakTotal > 0)
      .sort((a, b) => b.streakTotal - a.streakTotal)

    if (leaders.length === 0) return []

    const highest = leaders[0].streakTotal

    return leaders.filter((leader) => leader.streakTotal === highest)
  }, [familyMembers, routineStreaks])

  const routineStreakText = useMemo(() => {
    if (routineStreakLeaders.length === 0) {
      return 'No routine streaks yet'
    }

    const names = formatNames(routineStreakLeaders.map((person) => person.name))
    const total = routineStreakLeaders[0].streakTotal
    const verb = routineStreakLeaders.length === 1 ? 'has' : 'have'

    return `${names} ${verb} ${total} routine streaks`
  }, [routineStreakLeaders])

  const choreSummary = useMemo(() => {
    const today = getTodayDate()
    const weekStart = getWeekStartDate()
    const uniqueChores = new Map<string, DashboardChore>()

    choreAssignments.forEach((assignment) => {
      if (!assignment.chores) return

      const chores = Array.isArray(assignment.chores)
        ? assignment.chores
        : [assignment.chores]

      chores.forEach((chore) => {
        uniqueChores.set(chore.id, chore)
      })
    })

    const chores = Array.from(uniqueChores.values())

    const completedToday = choreCompletions.filter(
      (completion) => completion.completed_at && completion.completed_at >= today
    )

    const pointsToday = completedToday.reduce((total, completion) => {
      return total + completion.points_awarded
    }, 0)

    const dueToday = chores.filter((chore) => {
      const frequency = chore.frequency || 'daily'

      const relevantCompletions = choreCompletions.filter(
        (completion) => completion.chore_id === chore.id
      )

      if (frequency === 'daily') {
        return !relevantCompletions.some(
          (completion) => completion.completed_at && completion.completed_at >= today
        )
      }

      if (frequency === 'weekly') {
        return !relevantCompletions.some(
          (completion) => completion.completed_at && completion.completed_at >= weekStart
        )
      }

      if (frequency === 'adhoc') {
        return relevantCompletions.length === 0
      }

      return true
    })

    return {
      dueToday: dueToday.length,
      completedToday: completedToday.length,
      pointsToday,
    }
  }, [choreAssignments, choreCompletions])

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <NavBar />

        <section className="mb-4 rounded-2xl bg-white p-5 shadow-sm">
          <h1 className="mb-2 text-3xl font-bold tracking-tight">
            {householdName}
          </h1>

          <p className="text-sm text-slate-600">
            Chores, routines, meals and family plans in one place.
          </p>
        </section>

        <section className="mb-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">{currentDate}</h2>
              <WeatherCard />
            </div>

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
                      {upcomingEvent.end_time && ` - ${upcomingEvent.end_time}`}
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
            <h2 className="mb-1 text-xl font-semibold">Points &amp; Rewards</h2>
            <p className="mb-3 text-sm text-slate-500">
              Available points after approved rewards.
            </p>

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

                    <div className="font-medium">{member.name}</div>
                  </div>

                  <div className="text-lg font-bold text-blue-600">
                    {member.total} pts
                  </div>
                </div>
              ))}
            </div>

            <Link
              href="/rewards"
              className="mt-4 block rounded-xl bg-purple-600 px-4 py-3 text-center font-semibold text-white hover:bg-purple-700"
            >
              Spend points on rewards
            </Link>
          </div>
        </section>

        <section className="mb-4 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">🎉 Family Wins</h2>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl bg-yellow-50 p-4">
              <div className="text-sm font-medium text-yellow-700">
                Current leader
              </div>

              <div className="mt-1 text-lg font-bold">
                {leaderboard[0]
                  ? `${leaderboard[0].avatar_emoji || '🙂'} ${leaderboard[0].name} with ${leaderboard[0].total} points`
                  : 'No points yet'}
              </div>
            </div>

            <div className="rounded-xl bg-orange-50 p-4">
              <div className="text-sm font-medium text-orange-700">
                Routine streaks
              </div>

              <div className="mt-1 text-lg font-bold">
                🔥 {routineStreakText}
              </div>
            </div>

            <div className="rounded-xl bg-green-50 p-4">
              <div className="text-sm font-medium text-green-700">
                Chore progress
              </div>

              <div className="mt-1 text-lg font-bold">
                {choreSummary.completedToday} completed today
              </div>
            </div>

            {hasDog && (
              <div className="rounded-xl bg-blue-50 p-4">
                <div className="text-sm font-medium text-blue-700">
                  Dog walk
                </div>

                <div className="mt-1 text-lg font-bold">
                  <DogWalkSuggestion />
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="mb-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="text-3xl">🧹</div>

            <div className="mt-2 text-sm font-medium text-slate-500">
              Chores due
            </div>

            <div className="text-3xl font-bold text-slate-900">
              {choreSummary.dueToday}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="text-3xl">✅</div>

            <div className="mt-2 text-sm font-medium text-slate-500">
              Completed today
            </div>

            <div className="text-3xl font-bold text-slate-900">
              {choreSummary.completedToday}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="text-3xl">⭐</div>

            <div className="mt-2 text-sm font-medium text-slate-500">
              Points earned today
            </div>

            <div className="text-3xl font-bold text-slate-900">
              {choreSummary.pointsToday}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
