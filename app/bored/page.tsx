'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import NavBar from '../../components/NavBar'

type Activity = {
  id: string
  title: string
  energy_level: string
  location_type: string
  activity_type: string
}

export default function BoredPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [selectedActivity, setSelectedActivity] =
    useState<Activity | null>(null)

  const [energy, setEnergy] = useState('any')
  const [location, setLocation] = useState('any')
  const [type, setType] = useState('any')

  async function loadActivities() {
    const { data, error } = await supabase
      .from('activities')
      .select('*')

    if (error) {
      console.error(error)
      return
    }

    setActivities(data || [])
  }

  function suggestActivity() {
    let filtered = [...activities]

    if (energy !== 'any') {
      filtered = filtered.filter(
        (a) => a.energy_level === energy
      )
    }

    if (location !== 'any') {
      filtered = filtered.filter(
        (a) => a.location_type === location
      )
    }

    if (type !== 'any') {
      filtered = filtered.filter(
        (a) => a.activity_type === type
      )
    }

    if (filtered.length === 0) {
      setSelectedActivity(null)
      return
    }

    const random =
      filtered[Math.floor(Math.random() * filtered.length)]

    setSelectedActivity(random)
  }

  useEffect(() => {
    loadActivities()
  }, [])

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <NavBar />

        <h1 className="mb-6 text-5xl font-bold tracking-tight">
          I&apos;m Bored
        </h1>

        <section className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-2xl font-semibold">
            Filters
          </h2>

          <div className="grid gap-4 md:grid-cols-3">
            <select
              value={energy}
              onChange={(e) => setEnergy(e.target.value)}
              className="rounded-2xl border border-slate-200 p-4"
            >
              <option value="any">Any energy</option>
              <option value="low">Low energy</option>
              <option value="medium">Medium energy</option>
              <option value="high">High energy</option>
            </select>

            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="rounded-2xl border border-slate-200 p-4"
            >
              <option value="any">Anywhere</option>
              <option value="indoors">Indoors</option>
              <option value="outdoors">Outdoors</option>
            </select>

            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="rounded-2xl border border-slate-200 p-4"
            >
              <option value="any">Any type</option>
              <option value="solo">Solo</option>
              <option value="family">Family</option>
            </select>
          </div>

          <button
            onClick={suggestActivity}
            className="mt-6 w-full rounded-3xl bg-blue-600 px-6 py-5 text-2xl font-semibold text-white transition hover:bg-blue-700"
          >
            🎲 Suggest Something Fun
          </button>
        </section>

        <section className="rounded-3xl bg-white p-10 text-center shadow-sm">
          {!selectedActivity && (
            <p className="text-xl text-slate-500">
              Press the button for an idea ✨
            </p>
          )}

          {selectedActivity && (
            <>
              <div className="mb-4 text-6xl">
                🎉
              </div>

              <h2 className="mb-4 text-4xl font-bold">
                {selectedActivity.title}
              </h2>

              <div className="flex flex-wrap justify-center gap-3">
                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm">
                  {selectedActivity.energy_level} energy
                </span>

                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm">
                  {selectedActivity.location_type}
                </span>

                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm">
                  {selectedActivity.activity_type}
                </span>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  )
}