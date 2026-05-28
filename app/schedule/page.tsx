'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import NavBar from '../../components/NavBar'

type WeeklyEvent = {
  id: string
  title: string
  day_of_week: number
  start_time: string | null
  end_time: string | null
  location: string | null
  notes: string | null
}

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

export default function SchedulePage() {
  const [events, setEvents] = useState<WeeklyEvent[]>([])
  const [loading, setLoading] = useState(true)

  async function loadEvents() {
    setLoading(true)

    const { data, error } = await supabase
      .from('weekly_events')
      .select('*')
      .eq('active', true)
      .order('day_of_week')
      .order('start_time')

    if (error) {
      console.error('Load events error:', error)
      setLoading(false)
      return
    }

    setEvents(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadEvents()
  }, [])

  const groupedEvents = useMemo(() => {
    const grouped: Record<number, WeeklyEvent[]> = {}

    for (let i = 1; i <= 7; i++) {
      grouped[i] = []
    }

    events.forEach((event) => {
      grouped[event.day_of_week].push(event)
    })

    return grouped
  }, [events])

  const todayNumber = (() => {
    const jsDay = new Date().getDay()

    return jsDay === 0 ? 7 : jsDay
  })()

  const upcomingEvent = useMemo(() => {
    const now = new Date()

    const currentTime =
      now.getHours().toString().padStart(2, '0') +
      ':' +
      now.getMinutes().toString().padStart(2, '0')

    for (let offset = 0; offset < 7; offset++) {
      const dayNumber =
        ((todayNumber + offset - 1) % 7) + 1

      const dayEvents =
        groupedEvents[dayNumber]?.filter((event) => {
          if (!event.start_time) return offset > 0
          if (offset > 0) return true

          return event.start_time >= currentTime
        }) || []

      if (dayEvents.length > 0) {
        return {
          ...dayEvents[0],
          dayName: days[dayNumber],
        }
      }
    }

    return null
  }, [groupedEvents, todayNumber])

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-[1600px]">
        <NavBar />

        <h1 className="mb-6 text-5xl font-bold tracking-tight">
          Schedule
        </h1>

        <section className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-2xl font-semibold">
            Coming Up Next
          </h2>

          {!upcomingEvent && (
            <p className="text-slate-500">
              Nothing else scheduled 🎉
            </p>
          )}

          {upcomingEvent && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
              <div className="text-2xl font-bold">
                {upcomingEvent.title}
              </div>

              <div className="mt-2 text-sm font-medium text-blue-700">
                {upcomingEvent.dayName}
              </div>

              <div className="mt-1 text-slate-600">
                {upcomingEvent.start_time}

                {upcomingEvent.end_time &&
                  ` - ${upcomingEvent.end_time}`}
              </div>

              {upcomingEvent.location && (
                <div className="mt-1 text-slate-500">
                  📍 {upcomingEvent.location}
                </div>
              )}

              {upcomingEvent.notes && (
                <div className="mt-3 text-sm text-slate-500">
                  {upcomingEvent.notes}
                </div>
              )}
            </div>
          )}
        </section>

        {loading && (
          <p className="text-slate-500">
            Loading schedule...
          </p>
        )}

        <div className="overflow-x-auto rounded-3xl bg-white p-4 shadow-sm">
          <div className="grid min-w-[1100px] grid-cols-7 gap-3">
            {days.slice(1).map((day, index) => {
              const dayNumber = index + 1
              const isToday = dayNumber === todayNumber

              return (
                <section
                  key={day}
                  className={`min-h-[600px] rounded-2xl border p-4 ${
                    isToday
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <h2 className="mb-4 text-center text-xl font-bold">
                    {day}
                  </h2>

                  {groupedEvents[dayNumber]?.length === 0 && (
                    <p className="text-center text-sm text-slate-400">
                      Nothing scheduled
                    </p>
                  )}

                  <div className="space-y-3">
                    {groupedEvents[dayNumber]?.map((event) => (
                      <div
                        key={event.id}
                        className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                      >
                        <div className="text-sm font-semibold">
                          {event.title}
                        </div>

                        {(event.start_time ||
                          event.end_time) && (
                          <div className="mt-1 text-xs text-slate-600">
                            {event.start_time || '—'}

                            {event.end_time &&
                              ` - ${event.end_time}`}
                          </div>
                        )}

                        {event.location && (
                          <div className="mt-1 text-xs text-slate-500">
                            📍 {event.location}
                          </div>
                        )}

                        {event.notes && (
                          <div className="mt-2 text-xs text-slate-500">
                            {event.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      </div>
    </main>
  )
}