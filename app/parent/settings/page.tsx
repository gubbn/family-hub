'use client'

import { useEffect, useState } from 'react'
import NavBar from '../../../components/NavBar'
import ParentGate from '../../../components/ParentGate'
import { useHousehold } from '../../../components/AuthProvider'
import { getSetting, updateSetting } from '../../../lib/settings'
import { supabase } from '../../../lib/supabaseClient'

export default function ParentSettingsPage() {
  const { householdId } = useHousehold()
  const [postcode, setPostcode] = useState('')
  const [newPin, setNewPin] = useState('')

  const [mealRules, setMealRules] = useState({
    chicken: '2',
    beef: '1',
    vegetarian: '1',
    fish: '1',
    quickMeal: '1',
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadSettings() {
      try {
        const savedPostcode = await getSetting('home_postcode')
        const chickenRule = await getSetting('meal_rule_chicken')
        const beefRule = await getSetting('meal_rule_beef')
        const vegetarianRule = await getSetting('meal_rule_vegetarian')
        const fishRule = await getSetting('meal_rule_fish')
        const quickMealRule = await getSetting('meal_rule_quick_meal')

        setPostcode(savedPostcode || '')
        setMealRules({
          chicken: chickenRule || '2',
          beef: beefRule || '1',
          vegetarian: vegetarianRule || '1',
          fish: fishRule || '1',
          quickMeal: quickMealRule || '1',
        })
      } catch (error) {
        console.error(error)
        setError('Could not load settings')
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
      await updateSetting(
        'home_postcode',
        postcode.trim().toUpperCase(),
        householdId
      )

      await updateSetting(
        'meal_rule_chicken',
        mealRules.chicken,
        householdId
      )

      await updateSetting(
        'meal_rule_beef',
        mealRules.beef,
        householdId
      )

      await updateSetting(
        'meal_rule_vegetarian',
        mealRules.vegetarian,
        householdId
      )

      await updateSetting(
        'meal_rule_fish',
        mealRules.fish,
        householdId
      )

      await updateSetting(
        'meal_rule_quick_meal',
        mealRules.quickMeal,
        householdId
      )

      if (newPin) {
        const { error: pinError } = await supabase.rpc('change_parent_pin', {
          target_household_id: householdId,
          new_parent_pin: newPin,
        })

        if (pinError) throw pinError
        setNewPin('')
      }

      setSaved(true)

      setTimeout(() => {
        setSaved(false)
      }, 3000)
    } catch (error) {
      console.error(error)
      setError('Failed to save settings')
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
            <h2 className="mb-6 text-2xl font-semibold">
              Family Settings
            </h2>

            {loading ? (
              <p className="text-slate-500">
                Loading settings...
              </p>
            ) : (
              <div className="space-y-8">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Home Postcode
                  </label>

                  <input
                    value={postcode}
                    onChange={(e) =>
                      setPostcode(e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    Used for weather forecasts and dog walk suggestions.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    New Parent Zone PIN (optional)
                  </label>

                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]{4,8}"
                    minLength={4}
                    maxLength={8}
                    value={newPin}
                    onChange={(e) =>
                      setNewPin(e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    Enter 4 to 8 numbers only if you want to change it.
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-5">
                  <h3 className="mb-2 text-xl font-semibold">
                    Meal Generator Rules
                  </h3>

                  <p className="mb-5 text-sm text-slate-500">
                    Control how automatic menu generation balances meals.
                  </p>

                  <div className="grid gap-4 md:grid-cols-2">
                    <RuleInput
                      label="Chicken meals"
                      value={mealRules.chicken}
                      onChange={(value) =>
                        setMealRules((current) => ({
                          ...current,
                          chicken: value,
                        }))
                      }
                    />

                    <RuleInput
                      label="Beef meals"
                      value={mealRules.beef}
                      onChange={(value) =>
                        setMealRules((current) => ({
                          ...current,
                          beef: value,
                        }))
                      }
                    />

                    <RuleInput
                      label="Vegetarian meals"
                      value={mealRules.vegetarian}
                      onChange={(value) =>
                        setMealRules((current) => ({
                          ...current,
                          vegetarian: value,
                        }))
                      }
                    />

                    <RuleInput
                      label="Fish meals"
                      value={mealRules.fish}
                      onChange={(value) =>
                        setMealRules((current) => ({
                          ...current,
                          fish: value,
                        }))
                      }
                    />

                    <RuleInput
                      label="Quick meals"
                      value={mealRules.quickMeal}
                      onChange={(value) =>
                        setMealRules((current) => ({
                          ...current,
                          quickMeal: value,
                        }))
                      }
                    />
                  </div>
                </div>

                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-slate-400"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>

                {saved && (
                  <p className="font-medium text-green-600">
                    ✅ Settings saved
                  </p>
                )}

                {error && (
                  <p className="font-medium text-red-600">
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

type RuleInputProps = {
  label: string
  value: string
  onChange: (value: string) => void
}

function RuleInput({
  label,
  value,
  onChange,
}: RuleInputProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">
        {label}
      </label>

      <input
        type="number"
        min="0"
        max="7"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-300 px-4 py-3"
      />
    </div>
  )
}
