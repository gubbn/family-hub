'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type Profile = {
  name: string
  role: 'parent' | 'child' | 'pet'
  emoji: string
  petType: 'dog' | 'cat' | 'other' | null
}

type SetupChoices = {
  meals: boolean
  week: boolean
  chores: boolean
  routines: boolean
}

const profileDefaults: Record<Profile['role'], string> = {
  parent: '🙂',
  child: '🧒',
  pet: '🐶',
}

const setupSteps = [
  {
    key: 'meals' as const,
    emoji: '🍽️',
    title: 'Would you like to set up meals now?',
    description:
      'Add family favourites and start a simple meal plan. You can always do this later.',
  },
  {
    key: 'week' as const,
    emoji: '📅',
    title: 'Would you like to set up your week now?',
    description:
      'Add school, clubs, appointments and the things your family needs to remember.',
  },
  {
    key: 'chores' as const,
    emoji: '🧹',
    title: 'Would you like to set up chores now?',
    description:
      'Create jobs, assign points and give everyone something manageable to work towards.',
  },
  {
    key: 'routines' as const,
    emoji: '🌅',
    title: 'Would you like to set up routines now?',
    description:
      'Build clear morning, bedtime or getting-out-the-door steps.',
  },
]

export default function OnboardingWizard({
  householdId,
  householdName,
  onComplete,
  onSignOut,
}: {
  householdId: string
  householdName: string
  onComplete: () => Promise<void>
  onSignOut: () => Promise<void>
}) {
  const [step, setStep] = useState(0)
  const [profiles, setProfiles] = useState<Profile[]>([
    { name: '', role: 'child', emoji: '🧒', petType: null },
  ])
  const [choices, setChoices] = useState<SetupChoices>({
    meals: false,
    week: false,
    chores: false,
    routines: false,
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const finalStep = setupSteps.length + 2

  function updateProfile(index: number, updates: Partial<Profile>) {
    setProfiles((current) =>
      current.map((profile, profileIndex) =>
        profileIndex === index ? { ...profile, ...updates } : profile
      )
    )
  }

  function addProfile(role: Profile['role']) {
    setProfiles((current) => [
      ...current,
      {
        name: '',
        role,
        emoji: profileDefaults[role],
        petType: role === 'pet' ? 'dog' : null,
      },
    ])
  }

  function removeProfile(index: number) {
    setProfiles((current) =>
      current.filter((_, profileIndex) => profileIndex !== index)
    )
  }

  async function finishOnboarding() {
    setSaving(true)
    setMessage('')

    const completeProfiles = profiles
      .map((profile) => ({ ...profile, name: profile.name.trim() }))
      .filter((profile) => profile.name)

    const { error } = await supabase.rpc('complete_household_onboarding', {
      target_household_id: householdId,
      profiles: completeProfiles,
      setup_meals_now: choices.meals,
      setup_week_now: choices.week,
      setup_chores_now: choices.chores,
      setup_routines_now: choices.routines,
    })

    if (error) {
      console.error('Complete onboarding error:', error)
      setMessage(error.message)
      setSaving(false)
      return
    }

    await onComplete()

    const firstSelectedDestination = [
      choices.meals && '/parent/meals',
      choices.week && '/parent/schedule',
      choices.chores && '/parent/chores',
      choices.routines && '/parent/routines',
    ].find(Boolean)

    window.location.assign(
      typeof firstSelectedDestination === 'string'
        ? firstSelectedDestination
        : '/'
    )
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-4 text-slate-900">
      <section className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-blue-600">
              Setting up {householdName}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Step {Math.min(step + 1, finalStep + 1)} of {finalStep + 1}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void onSignOut()}
            className="text-sm text-slate-500 underline"
          >
            Sign out
          </button>
        </div>

        {step === 0 && (
          <div>
            <div className="text-6xl">🏡</div>
            <h1 className="mt-4 text-3xl font-bold">
              Let&apos;s make this hub feel like home
            </h1>
            <p className="mt-3 text-lg text-slate-600">
              We&apos;ll guide you through the useful bits. Nothing has to be
              perfect, and everything can be changed later.
            </p>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="mt-8 w-full rounded-2xl bg-blue-600 px-6 py-4 font-semibold text-white hover:bg-blue-700"
            >
              Start family setup
            </button>
          </div>
        )}

        {step === 1 && (
          <div>
            <h1 className="text-3xl font-bold">Who belongs in your hub?</h1>
            <p className="mt-3 text-slate-600">
              Add children, adults and pets. These become the friendly profiles
              used around the app.
            </p>

            <div className="mt-6 space-y-3">
              {profiles.map((profile, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-[80px_1fr_130px_auto]"
                >
                  <input
                    aria-label="Profile emoji"
                    value={profile.emoji}
                    onChange={(event) =>
                      updateProfile(index, { emoji: event.target.value })
                    }
                    className="rounded-xl border border-slate-200 bg-white p-3 text-center text-2xl"
                    maxLength={4}
                  />
                  <input
                    aria-label="Profile name"
                    value={profile.name}
                    onChange={(event) =>
                      updateProfile(index, { name: event.target.value })
                    }
                    className="rounded-xl border border-slate-200 bg-white p-3"
                    placeholder="Name"
                    maxLength={60}
                  />
                  <select
                    aria-label="Profile type"
                    value={profile.role}
                    onChange={(event) => {
                      const role = event.target.value as Profile['role']
                      updateProfile(index, {
                        role,
                        petType: role === 'pet' ? 'dog' : null,
                        emoji:
                          profile.emoji === profileDefaults[profile.role]
                            ? profileDefaults[role]
                            : profile.emoji,
                      })
                    }}
                    className="rounded-xl border border-slate-200 bg-white p-3"
                  >
                    <option value="parent">Adult</option>
                    <option value="child">Child</option>
                    <option value="pet">Pet</option>
                  </select>
                  {profile.role === 'pet' && (
                    <select
                      aria-label="Pet type"
                      value={profile.petType || 'other'}
                      onChange={(event) => {
                        const petType = event.target.value as NonNullable<
                          Profile['petType']
                        >
                        updateProfile(index, {
                          petType,
                          emoji:
                            petType === 'dog'
                              ? '🐶'
                              : petType === 'cat'
                                ? '🐱'
                                : '🐾',
                        })
                      }}
                      className="rounded-xl border border-slate-200 bg-white p-3 sm:col-start-3"
                    >
                      <option value="dog">Dog</option>
                      <option value="cat">Cat</option>
                      <option value="other">Other pet</option>
                    </select>
                  )}
                  <button
                    type="button"
                    onClick={() => removeProfile(index)}
                    className="rounded-xl px-3 text-sm text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => addProfile('child')}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium"
              >
                + Child
              </button>
              <button
                type="button"
                onClick={() => addProfile('parent')}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium"
              >
                + Adult
              </button>
              <button
                type="button"
                onClick={() => addProfile('pet')}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium"
              >
                + Pet
              </button>
            </div>

            <WizardNavigation
              onBack={() => setStep(0)}
              onNext={() => setStep(2)}
              nextLabel="Continue"
            />
          </div>
        )}

        {step >= 2 && step < finalStep && (() => {
          const setupStep = setupSteps[step - 2]

          return (
            <div>
              <div className="text-6xl">{setupStep.emoji}</div>
              <h1 className="mt-4 text-3xl font-bold">{setupStep.title}</h1>
              <p className="mt-3 text-lg text-slate-600">
                {setupStep.description}
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setChoices((current) => ({
                      ...current,
                      [setupStep.key]: true,
                    }))
                    setStep(step + 1)
                  }}
                  className="rounded-2xl bg-blue-600 p-5 text-left font-semibold text-white hover:bg-blue-700"
                >
                  Yes, set it up now
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setChoices((current) => ({
                      ...current,
                      [setupStep.key]: false,
                    }))
                    setStep(step + 1)
                  }}
                  className="rounded-2xl bg-slate-100 p-5 text-left font-semibold hover:bg-slate-200"
                >
                  I&apos;ll do this later
                </button>
              </div>

              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="mt-6 text-sm text-slate-500 underline"
              >
                Back
              </button>
            </div>
          )
        })()}

        {step === finalStep && (
          <div>
            <div className="text-6xl">✨</div>
            <h1 className="mt-4 text-3xl font-bold">Your hub is ready</h1>
            <p className="mt-3 text-lg text-slate-600">
              We&apos;ll take you to the first area you chose to set up. The
              rest will always be waiting in Parent Zone.
            </p>

            <button
              type="button"
              disabled={saving}
              onClick={() => void finishOnboarding()}
              className="mt-8 w-full rounded-2xl bg-green-600 px-6 py-4 font-semibold text-white hover:bg-green-700 disabled:bg-slate-400"
            >
              {saving ? 'Preparing your hub...' : 'Finish and open my hub'}
            </button>
          </div>
        )}

        {message && (
          <p role="alert" className="mt-5 rounded-2xl bg-red-50 p-4 text-red-700">
            {message}
          </p>
        )}
      </section>
    </main>
  )
}

function WizardNavigation({
  onBack,
  onNext,
  nextLabel,
}: {
  onBack: () => void
  onNext: () => void
  nextLabel: string
}) {
  return (
    <div className="mt-8 flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-slate-500 underline"
      >
        Back
      </button>
      <button
        type="button"
        onClick={onNext}
        className="rounded-2xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
      >
        {nextLabel}
      </button>
    </div>
  )
}
