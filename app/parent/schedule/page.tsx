'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
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

type WeeklyEvent = {
  id: string
  title: string
  day_of_week: number
  start_time: string | null
  end_time: string | null
  location: string | null
  notes: string | null
}

export default function ParentSchedulePage() {
  const [weeklyEvents, setWeeklyEvents] = useState<WeeklyEvent[]>([])
  const [newEventTitle, setNewEventTitle] = useState('')
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [newEventStart, setNewEventStart] = useState('')
  const [newEventEnd, setNewEventEnd] = useState('')
  const [newEventLocation, setNewEventLocation] = useState('')
  const [newEventNotes, setNewEventNotes] = useState('')
  const [status, setStatus] = useState('')

  async function loadEvents() {
    const { data, error } = await supabase
      .from('weekly_events')
      .select('id, title, day_of_week, start_time, end_time, location, notes')
      .eq('active', true)
      .order('day_of_week')
      .order('start_time')

    if (error) {
      console.error('Load weekly events error:', error)
      setStatus('Could not load weekly events')
      return
    }

    setWeeklyEvents(data || [])
  }

  function toggleDay(dayNumber: number) {
    setSelectedDays((current) => {
      if (current.includes(dayNumber)) {
        return current.filter((day) => day !== dayNumber)
      }

      return [...current, dayNumber].sort()
    })
  }

  async function addWeeklyEvent() {
    const trimmedTitle = newEventTitle.trim()

    if (!trimmedTitle) {
      setStatus('Enter an event title first')
      return
    }

    if (selectedDays.length === 0) {
      setStatus('Choose at least one day')
      return
    }

    const rows = selectedDays.map((dayNumber) => ({
      title: trimmedTitle,
      day_of_week: dayNumber,
      start_time: newEventStart || null,
      end_time: newEventEnd || null,
      location: newEventLocation.trim() || null,
      notes: newEventNotes.trim() || null,
      active: true,
    }))

    const { error } = await supabase
      .from('weekly_events')
      .insert(rows)

    if (error) {
      console.error('Add weekly event error:', error)
      setStatus('Could not add weekly event')
      return
    }

    setNewEventTitle('')
    setSelectedDays([])
    setNewEventStart('')
    setNewEventEnd('')
    setNewEventLocation('')
    setNewEventNotes('')
    setStatus('Weekly event added')
    await loadEvents()
  }

  async function updateWeeklyEvent(
    eventId: string,
    updates: Partial<WeeklyEvent>
  ) {
    const { error } = await supabase
      .from('weekly_events')
      .update(updates)
      .eq('id', eventId)

    if (error) {
      console.error('Update weekly event error:', error)
      setStatus('Could not update weekly event')
      return
    }

    setWeeklyEvents((current) =>
      current.map((event) =>
        event.id === eventId ? { ...event, ...updates } : event
      )
    )

    setStatus('Weekly event updated')
  }

  async function deleteWeeklyEvent(eventId: string) {
    const { error } = await supabase
      .from('weekly_events')
      .delete()
      .eq('id', eventId)

    if (error) {
      console.error('Delete weekly event error:', error)
      setStatus('Could not delete weekly event')
      return
    }

    setStatus('Weekly event deleted')
    await loadEvents()
  }

  useEffect(() => {
    loadEvents()
  }, [])

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <NavBar />

        <ParentBackButton />

        <h1 className="mb-6 text-4xl font-bold tracking-tight">
          Parent Zone: Schedule
        </h1>

        <ParentGate>
          {status && (
            <section className="mb-6 rounded-2xl bg-white p-4 text-sm text-slate-500 shadow-sm">
              {status}
            </section>
          )}

          <section className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-2xl font-semibold">
              Add Weekly Event
            </h2>

            <div className="grid gap-4">
              <input
                value={newEventTitle}
                onChange={(event) => setNewEventTitle(event.target.value)}
                className="rounded-2xl border border-slate-200 p-4 text-lg"
                placeholder="Event title"
              />

              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-600">
                  Repeat on
                </h3>

                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {days.slice(1).map((day, index) => {
                    const dayNumber = index + 1
                    const selected = selectedDays.includes(dayNumber)

                    return (
                      <button
                        key={day}
                        onClick={() => toggleDay(dayNumber)}
                        className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                          selected
                            ? 'border-blue-500 bg-blue-100 text-blue-800'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        {selected ? '✅' : '⬜'} {day}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <input
                  type="time"
                  value={newEventStart}
                  onChange={(event) => setNewEventStart(event.target.value)}
                  className="rounded-2xl border border-slate-200 p-4"
                />

                <input
                  type="time"
                  value={newEventEnd}
                  onChange={(event) => setNewEventEnd(event.target.value)}
                  className="rounded-2xl border border-slate-200 p-4"
                />
              </div>

              <input
                value={newEventLocation}
                onChange={(event) => setNewEventLocation(event.target.value)}
                className="rounded-2xl border border-slate-200 p-4"
                placeholder="Location"
              />

              <input
                value={newEventNotes}
                onChange={(event) => setNewEventNotes(event.target.value)}
                className="rounded-2xl border border-slate-200 p-4"
                placeholder="Notes"
              />

              <button
                onClick={addWeeklyEvent}
                className="rounded-2xl bg-blue-600 p-4 text-lg font-semibold text-white hover:bg-blue-700"
              >
                Add event
              </button>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-2xl font-semibold">
              Existing Weekly Events
            </h2>

            <div className="overflow-x-auto rounded-2xl bg-slate-50 p-3">
              <div className="grid min-w-[1100px] grid-cols-7 gap-3">
                {days.slice(1).map((day, index) => {
                  const dayNumber = index + 1

                  const dayEvents = weeklyEvents
                    .filter((event) => event.day_of_week === dayNumber)
                    .sort((a, b) => {
                      const aTime = a.start_time || '99:99'
                      const bTime = b.start_time || '99:99'
                      return aTime.localeCompare(bTime)
                    })

                  return (
                    <section
                      key={day}
                      className="min-h-[400px] rounded-2xl border border-slate-200 bg-white p-3"
                    >
                      <h3 className="mb-3 text-center text-lg font-bold">
                        {day}
                      </h3>

                      {dayEvents.length === 0 && (
                        <p className="text-center text-xs text-slate-400">
                          No events
                        </p>
                      )}

                      <div className="space-y-2">
                        {dayEvents.map((event) => (
                          <div
                            key={event.id}
                            className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                          >
                            <input
                              value={event.title}
                              onChange={(inputEvent) =>
                                updateWeeklyEvent(event.id, {
                                  title: inputEvent.target.value,
                                })
                              }
                              className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm font-semibold"
                            />

                            <select
                              value={event.day_of_week}
                              onChange={(inputEvent) =>
                                updateWeeklyEvent(event.id, {
                                  day_of_week: Number(inputEvent.target.value),
                                })
                              }
                              className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs"
                            >
                              {days.slice(1).map((dayOption, dayIndex) => (
                                <option key={dayOption} value={dayIndex + 1}>
                                  {dayOption}
                                </option>
                              ))}
                            </select>

                            <div className="mt-2 grid grid-cols-2 gap-2">
                              <input
                                type="time"
                                value={event.start_time || ''}
                                onChange={(inputEvent) =>
                                  updateWeeklyEvent(event.id, {
                                    start_time: inputEvent.target.value || null,
                                  })
                                }
                                className="rounded-lg border border-slate-200 bg-white p-2 text-xs"
                              />

                              <input
                                type="time"
                                value={event.end_time || ''}
                                onChange={(inputEvent) =>
                                  updateWeeklyEvent(event.id, {
                                    end_time: inputEvent.target.value || null,
                                  })
                                }
                                className="rounded-lg border border-slate-200 bg-white p-2 text-xs"
                              />
                            </div>

                            <input
                              value={event.location || ''}
                              onChange={(inputEvent) =>
                                updateWeeklyEvent(event.id, {
                                  location: inputEvent.target.value || null,
                                })
                              }
                              className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs"
                              placeholder="Location"
                            />

                            <input
                              value={event.notes || ''}
                              onChange={(inputEvent) =>
                                updateWeeklyEvent(event.id, {
                                  notes: inputEvent.target.value || null,
                                })
                              }
                              className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs"
                              placeholder="Notes"
                            />

                            <button
                              onClick={() => deleteWeeklyEvent(event.id)}
                              className="mt-3 w-full rounded-lg border border-red-200 px-3 py-2 text-xs text-red-600 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        ))}
                      </div>
                    </section>
                  )
                })}
              </div>
            </div>
          </section>
        </ParentGate>
      </div>
    </main>
  )
}