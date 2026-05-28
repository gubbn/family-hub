'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import NavBar from '../../../components/NavBar'
import ParentGate from '../../../components/ParentGate'
import ParentBackButton from '../../../components/ParentBackButton'

type Activity = {
  id: string
  title: string
  energy_level: string
  location_type: string
  activity_type: string
}

export default function ParentActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [title, setTitle] = useState('')
  const [energyLevel, setEnergyLevel] = useState('medium')
  const [locationType, setLocationType] = useState('anywhere')
  const [activityType, setActivityType] = useState('solo')
  const [status, setStatus] = useState('')

  async function loadActivities() {
    const { data, error } = await supabase
      .from('activities')
      .select('id, title, energy_level, location_type, activity_type')
      .order('title')

    if (error) {
      console.error('Load activities error:', error)
      setStatus('Could not load activities')
      return
    }

    setActivities(data || [])
  }

  async function addActivity() {
    const trimmedTitle = title.trim()

    if (!trimmedTitle) {
      setStatus('Enter an activity title first')
      return
    }

    const { error } = await supabase
      .from('activities')
      .insert({
        title: trimmedTitle,
        energy_level: energyLevel,
        location_type: locationType,
        activity_type: activityType,
      })

    if (error) {
      console.error('Add activity error:', error)
      setStatus('Could not add activity')
      return
    }

    setTitle('')
    setEnergyLevel('medium')
    setLocationType('anywhere')
    setActivityType('solo')
    setStatus('Activity added')
    await loadActivities()
  }

  async function deleteActivity(activityId: string) {
    const { error } = await supabase
      .from('activities')
      .delete()
      .eq('id', activityId)

    if (error) {
      console.error('Delete activity error:', error)
      setStatus('Could not delete activity')
      return
    }

    setStatus('Activity deleted')
    await loadActivities()
  }

  useEffect(() => {
    loadActivities()
  }, [])

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <NavBar />

        <ParentBackButton />

        <h1 className="mb-6 text-4xl font-bold tracking-tight">
          Parent Zone: Activities
        </h1>

        <ParentGate>
          {status && (
            <section className="mb-6 rounded-2xl bg-white p-4 text-sm text-slate-500 shadow-sm">
              {status}
            </section>
          )}

          <section className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-2xl font-semibold">
              Add Activity
            </h2>

            <div className="grid gap-4">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="rounded-2xl border border-slate-200 p-4 text-lg"
                placeholder="Activity title"
              />

              <div className="grid gap-4 md:grid-cols-3">
                <select
                  value={energyLevel}
                  onChange={(event) => setEnergyLevel(event.target.value)}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <option value="low">Low energy</option>
                  <option value="medium">Medium energy</option>
                  <option value="high">High energy</option>
                </select>

                <select
                  value={locationType}
                  onChange={(event) => setLocationType(event.target.value)}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <option value="indoors">Indoors</option>
                  <option value="outdoors">Outdoors</option>
                  <option value="anywhere">Anywhere</option>
                </select>

                <select
                  value={activityType}
                  onChange={(event) => setActivityType(event.target.value)}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <option value="solo">Solo</option>
                  <option value="family">Family</option>
                </select>
              </div>

              <button
                onClick={addActivity}
                className="rounded-2xl bg-blue-600 p-4 text-lg font-semibold text-white hover:bg-blue-700"
              >
                Add activity
              </button>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-2xl font-semibold">
              Existing Activities
            </h2>

            <div className="space-y-3">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div>
                    <div className="font-semibold">
                      {activity.title}
                    </div>

                    <div className="text-sm text-slate-500">
                      {activity.energy_level} energy · {activity.location_type} · {activity.activity_type}
                    </div>
                  </div>

                  <button
                    onClick={() => deleteActivity(activity.id)}
                    className="rounded-xl border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </section>
        </ParentGate>
      </div>
    </main>
  )
}