'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import NavBar from '../../../components/NavBar'
import ParentGate from '../../../components/ParentGate'
import ParentBackButton from '../../../components/ParentBackButton'
import { useHousehold } from '../../../components/AuthProvider'

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

function getTodayNumber() {
  const day = new Date().getDay()
  return day === 0 ? 7 : day
}

export default function ParentSchedulePage() {
  const { householdId } = useHousehold()
  const [weeklyEvents, setWeeklyEvents] = useState<WeeklyEvent[]>([])
  const [selectedDay, setSelectedDay] = useState(getTodayNumber)
  const [additionalEventDays, setAdditionalEventDays] = useState<number[]>([])
  const [newEventTitle, setNewEventTitle] = useState('')
  const [newEventStart, setNewEventStart] = useState('')
  const [newEventEnd, setNewEventEnd] = useState('')
  const [newEventLocation, setNewEventLocation] = useState('')
  const [newEventNotes, setNewEventNotes] = useState('')
  const [addingEvent, setAddingEvent] = useState(false)
  const [savingEventId, setSavingEventId] = useState('')
  const [status, setStatus] = useState('')

  const loadEvents = useCallback(async () => {
    if (!householdId) return

    const { data, error } = await supabase
      .from('weekly_events')
      .select('id, title, day_of_week, start_time, end_time, location, notes')
      .eq('household_id', householdId)
      .eq('active', true)
      .order('day_of_week')
      .order('start_time')

    if (error) {
      console.error('Load weekly events error:', error)
      setStatus('Could not load weekly events')
      return
    }

    setWeeklyEvents(data || [])
  }, [householdId])

  async function addWeeklyEvent() {
    const trimmedTitle = newEventTitle.trim()

    if (!trimmedTitle) {
      setStatus('Enter an event title first')
      return
    }

    if (!householdId) {
      setStatus('Could not identify your household')
      return
    }

    setAddingEvent(true)

    const eventDays = Array.from(
      new Set([selectedDay, ...additionalEventDays])
    ).sort((a, b) => a - b)

    const newEvents = eventDays.map((day) => ({
      household_id: householdId,
      title: trimmedTitle,
      day_of_week: day,
      start_time: newEventStart || null,
      end_time: newEventEnd || null,
      location: newEventLocation.trim() || null,
      notes: newEventNotes.trim() || null,
      active: true,
    }))

    const { error } = await supabase.from('weekly_events').insert(newEvents)

    if (error) {
      console.error('Add weekly event error:', error)
      setStatus('Could not add weekly event')
      setAddingEvent(false)
      return
    }

    setNewEventTitle('')
    setNewEventStart('')
    setNewEventEnd('')
    setNewEventLocation('')
    setNewEventNotes('')
    setAdditionalEventDays([])
    setStatus(
      `Event added to ${eventDays.map((day) => days[day]).join(', ')}`
    )
    setAddingEvent(false)
    await loadEvents()
  }

  function toggleAdditionalEventDay(day: number) {
    setAdditionalEventDays((current) =>
      current.includes(day)
        ? current.filter((selected) => selected !== day)
        : [...current, day]
    )
  }

  function editWeeklyEvent(
    eventId: string,
    updates: Partial<WeeklyEvent>
  ) {
    setWeeklyEvents((current) =>
      current.map((event) =>
        event.id === eventId ? { ...event, ...updates } : event
      )
    )
  }

  async function saveWeeklyEvent(event: WeeklyEvent) {
    const trimmedTitle = event.title.trim()

    if (!trimmedTitle) {
      setStatus('Event title cannot be blank')
      return
    }

    setSavingEventId(event.id)

    const { error } = await supabase
      .from('weekly_events')
      .update({
        title: trimmedTitle,
        day_of_week: event.day_of_week,
        start_time: event.start_time || null,
        end_time: event.end_time || null,
        location: event.location?.trim() || null,
        notes: event.notes?.trim() || null,
      })
      .eq('id', event.id)
      .eq('household_id', householdId)

    if (error) {
      console.error('Update weekly event error:', error)
      setStatus('Could not update weekly event')
      setSavingEventId('')
      return
    }

    setStatus(
      event.day_of_week === selectedDay
        ? 'Event changes saved'
        : `Event moved to ${days[event.day_of_week]}`
    )
    setSavingEventId('')
    await loadEvents()
  }

  async function deleteWeeklyEvent(eventId: string) {
    const { error } = await supabase
      .from('weekly_events')
      .delete()
      .eq('id', eventId)
      .eq('household_id', householdId)

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
  }, [loadEvents])

  const selectedDayEvents = weeklyEvents
    .filter((event) => event.day_of_week === selectedDay)
    .sort((a, b) => {
      const aTime = a.start_time || '99:99'
      const bTime = b.start_time || '99:99'
      return aTime.localeCompare(bTime)
    })

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 sm:p-6">
      <div className="mx-auto max-w-3xl">
        <NavBar />

        <ParentBackButton />

        <h1 className="mb-6 text-4xl font-bold tracking-tight">
          Parent Zone: Our Week
        </h1>

        <ParentGate>
          <section className="mb-6 rounded-3xl bg-blue-50 p-5 shadow-sm sm:p-6">
            <label
              htmlFor="week-day"
              className="mb-2 block text-sm font-semibold text-blue-950"
            >
              Which day would you like to plan?
            </label>
            <select
              id="week-day"
              value={selectedDay}
              onChange={(event) => {
                setSelectedDay(Number(event.target.value))
                setAdditionalEventDays([])
                setStatus('')
              }}
              className="w-full rounded-2xl border border-blue-200 bg-white p-4 text-lg font-semibold text-slate-900"
            >
              {days.slice(1).map((day, index) => (
                <option key={day} value={index + 1}>
                  {day}
                </option>
              ))}
            </select>
            <p className="mt-3 text-sm leading-6 text-blue-900">
              Add or edit {days[selectedDay]} below. The whole family can see
              the full week in Our Day.
            </p>
          </section>

          {status && (
            <section
              aria-live="polite"
              className="mb-6 rounded-2xl bg-white p-4 text-sm text-slate-600 shadow-sm"
            >
              {status}
            </section>
          )}

          <section className="mb-6 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-2 text-2xl font-semibold">
              Add to {days[selectedDay]}
            </h2>
            <p className="mb-5 text-sm text-slate-500">
              Add appointments, clubs, school events or anything else the
              family needs to remember.
            </p>

            <div className="grid gap-4">
              <div>
                <label
                  htmlFor="new-event-title"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  What&apos;s happening?
                </label>
                <input
                  id="new-event-title"
                  value={newEventTitle}
                  onChange={(event) => setNewEventTitle(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 p-4 text-lg"
                  placeholder="e.g. Swimming lesson"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-semibold text-slate-700">
                  Starts
                  <input
                    type="time"
                    value={newEventStart}
                    onChange={(event) => setNewEventStart(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 p-4 font-normal"
                  />
                </label>

                <label className="text-sm font-semibold text-slate-700">
                  Ends
                  <input
                    type="time"
                    value={newEventEnd}
                    onChange={(event) => setNewEventEnd(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 p-4 font-normal"
                  />
                </label>
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

              <fieldset className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <legend className="px-1 text-sm font-semibold text-blue-950">
                  Does this happen on other days too?
                </legend>
                <p className="mb-3 mt-1 text-sm text-blue-900">
                  Tick every extra day you want this added to.
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {days.slice(1).map((day, index) => {
                    const dayNumber = index + 1
                    const isPrimaryDay = dayNumber === selectedDay
                    const isChecked =
                      isPrimaryDay ||
                      additionalEventDays.includes(dayNumber)

                    return (
                      <label
                        key={day}
                        className={`flex items-center gap-2 rounded-xl border p-3 text-sm font-medium ${
                          isChecked
                            ? 'border-blue-300 bg-white text-blue-950'
                            : 'border-blue-100 bg-blue-50 text-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isPrimaryDay}
                          onChange={() =>
                            toggleAdditionalEventDay(dayNumber)
                          }
                          className="h-5 w-5"
                        />
                        {day.slice(0, 3)}
                      </label>
                    )
                  })}
                </div>
                <p className="mt-3 text-xs text-blue-800">
                  {days[selectedDay]} is already selected.
                </p>
              </fieldset>

              <button
                onClick={addWeeklyEvent}
                disabled={addingEvent}
                className="rounded-2xl bg-blue-600 p-4 text-lg font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
              >
                {addingEvent
                  ? 'Adding...'
                  : additionalEventDays.length > 0
                    ? `Add to ${additionalEventDays.length + 1} days`
                    : `Add to ${days[selectedDay]}`}
              </button>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-2 text-2xl font-semibold">
              {days[selectedDay]} plans
            </h2>
            <p className="mb-5 text-sm text-slate-500">
              Select another day above whenever you want to switch.
            </p>

            {selectedDayEvents.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-5 text-center text-slate-500">
                Nothing planned for {days[selectedDay]} yet.
              </div>
            ) : (
              <div className="space-y-4">
                {selectedDayEvents.map((event) => (
                  <article
                    key={event.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="grid gap-3">
                      <label className="text-sm font-semibold text-slate-700">
                        Event
                        <input
                          value={event.title}
                          onChange={(inputEvent) =>
                          editWeeklyEvent(event.id, {
                              title: inputEvent.target.value,
                            })
                          }
                          className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-normal"
                        />
                      </label>

                      <div className="grid grid-cols-2 gap-3">
                        <label className="text-sm font-semibold text-slate-700">
                          Starts
                          <input
                            type="time"
                            value={event.start_time || ''}
                            onChange={(inputEvent) =>
                            editWeeklyEvent(event.id, {
                                start_time: inputEvent.target.value || null,
                              })
                            }
                            className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-normal"
                          />
                        </label>

                        <label className="text-sm font-semibold text-slate-700">
                          Ends
                          <input
                            type="time"
                            value={event.end_time || ''}
                            onChange={(inputEvent) =>
                            editWeeklyEvent(event.id, {
                                end_time: inputEvent.target.value || null,
                              })
                            }
                            className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-normal"
                          />
                        </label>
                      </div>

                      <label className="text-sm font-semibold text-slate-700">
                        Location
                        <input
                          value={event.location || ''}
                          onChange={(inputEvent) =>
                          editWeeklyEvent(event.id, {
                              location: inputEvent.target.value || null,
                            })
                          }
                          className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-normal"
                          placeholder="Location"
                        />
                      </label>

                      <label className="text-sm font-semibold text-slate-700">
                        Notes
                        <input
                          value={event.notes || ''}
                          onChange={(inputEvent) =>
                          editWeeklyEvent(event.id, {
                              notes: inputEvent.target.value || null,
                            })
                          }
                          className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-normal"
                          placeholder="Notes"
                        />
                      </label>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                          onClick={() => saveWeeklyEvent(event)}
                          disabled={savingEventId === event.id}
                          className="rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60 sm:flex-1"
                        >
                          {savingEventId === event.id
                            ? 'Saving...'
                            : 'Save changes'}
                        </button>
                        <button
                          onClick={() => deleteWeeklyEvent(event.id)}
                          disabled={savingEventId === event.id}
                          className="rounded-xl border border-red-200 px-4 py-3 font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60 sm:flex-1"
                        >
                          Delete event
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </ParentGate>
      </div>
    </main>
  )
}
