'use client'

import { useEffect, useState } from 'react'
import NavBar from '../../../components/NavBar'
import ParentGate from '../../../components/ParentGate'
import { getSetting, updateSetting } from '../../../lib/settings'

export default function ParentSettingsPage() {
  const [postcode, setPostcode] = useState('')
  const [pin, setPin] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadSettings() {
      try {
        const savedPostcode = await getSetting('home_postcode')
        const savedPin = await getSetting('parent_pin')

        setPostcode(savedPostcode || '')
        setPin(savedPin || '')
      } catch (error) {
        console.error('Load settings failed:', error)
        setError('Could not load settings.')
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [])

  async function saveSettings() {
    setSaving(true)
    setSaved(false)
    setError('')

    try {
      const cleanPostcode = postcode.trim().toUpperCase()
      const cleanPin = pin.trim()

      if (!cleanPostcode) {
        setError('Please enter a postcode.')
        return
      }

      if (!cleanPin) {
        setError('Please enter a PIN.')
        return
      }

      await updateSetting('home_postcode', cleanPostcode)
      await updateSetting('parent_pin', cleanPin)

      setSaved(true)

      setTimeout(() => {
        setSaved(false)
      }, 3000)
    } catch (error) {
      console.error(error)
      setError('Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <NavBar />

        <h1 className="mb-6 text-4xl font-bold tracking-tight">
          Settings
        </h1>

        <ParentGate>
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-2xl font-semibold">
              Family Settings
            </h2>

            <p className="mb-6 text-sm text-slate-500">
              Configure household information used throughout the dashboard.
            </p>

            {loading ? (
              <p className="text-slate-500">
                Loading settings...
              </p>
            ) : (
              <div className="space-y-6">
                <div>
                  <label
                    htmlFor="postcode"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Home Postcode
                  </label>

                  <input
                    id="postcode"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value)}
                    placeholder="RG1 1AA"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    Used for weather forecasts and dog walk suggestions.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="pin"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Parent Zone PIN
                  </label>

                  <input
                    id="pin"
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="1234"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    Used to unlock Parent Zone.
                  </p>
                </div>

                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-slate-400"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>

                {saved && (
                  <p className="text-green-600">
                    ✅ Settings saved successfully.
                  </p>
                )}

                {error && (
                  <p className="text-red-600">
                    {error}
                  </p>
                )}
              </div>
            )}
          </section>
        </ParentGate>
      </div>
    </main>
  )
}