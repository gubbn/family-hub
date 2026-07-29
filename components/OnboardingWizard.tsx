'use client'

import { useState, type Dispatch, type SetStateAction } from 'react'
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

type MealDraft = {
  title: string
  ingredients: string
}

type WeekDraft = {
  title: string
  dayOfWeek: number
  startTime: string
}

type ChoreDraft = {
  title: string
  points: number
  frequency: 'daily' | 'weekly'
  assigneeIndex: number
}

type RoutineDraft = {
  title: string
  timeOfDay: 'morning' | 'afternoon' | 'evening'
  assigneeIndex: number
  steps: string[]
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
  const [postcode, setPostcode] = useState('')
  const [activeSetup, setActiveSetup] = useState<
    keyof SetupChoices | null
  >(null)
  const [meals, setMeals] = useState<MealDraft[]>([
    { title: '', ingredients: '' },
  ])
  const [weekEvents, setWeekEvents] = useState<WeekDraft[]>([
    { title: '', dayOfWeek: 1, startTime: '' },
  ])
  const [chores, setChores] = useState<ChoreDraft[]>([
    { title: '', points: 5, frequency: 'daily', assigneeIndex: -1 },
  ])
  const [routines, setRoutines] = useState<RoutineDraft[]>([
    {
      title: 'Morning routine',
      timeOfDay: 'morning',
      assigneeIndex: -1,
      steps: [''],
    },
  ])
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
        petType: role === 'pet' ? 'other' : null,
      },
    ])
  }

  function removeProfile(index: number) {
    setProfiles((current) =>
      current.filter((_, profileIndex) => profileIndex !== index)
    )
  }

  function startSetup() {
    const compactPostcode = postcode.trim().replace(/\s+/g, '').toUpperCase()
    const postcodePattern =
      /^(GIR0AA|[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2})$/

    if (!postcodePattern.test(compactPostcode)) {
      setMessage('Enter a valid UK postcode so we can show local weather.')
      return
    }

    setPostcode(
      `${compactPostcode.slice(0, -3)} ${compactPostcode.slice(-3)}`
    )
    setMessage('')
    setStep(1)
  }

  function continueProfiles() {
    if (profiles.length === 0 || profiles.some((profile) => !profile.name.trim())) {
      setMessage('Give each family member or pet a name, or remove empty rows.')
      return
    }

    setMessage('')
    setStep(2)
  }

  function continueConfiguredStage(stageKey: keyof SetupChoices) {
    const hasEntries = {
      meals: meals.some((meal) => meal.title.trim()),
      week: weekEvents.some((event) => event.title.trim()),
      chores: chores.some((chore) => chore.title.trim()),
      routines: routines.some(
        (routine) =>
          routine.title.trim() &&
          routine.steps.some((routineStep) => routineStep.trim())
      ),
    }[stageKey]

    if (!hasEntries) {
      setMessage(`Add at least one ${stageKey === 'week' ? 'event' : stageKey.slice(0, -1)} before continuing.`)
      return
    }

    setMessage('')
    setActiveSetup(null)
    setStep((current) => current + 1)
  }

  async function finishOnboarding() {
    setSaving(true)
    setMessage('')

    const completeProfiles = profiles
      .map((profile) => ({ ...profile, name: profile.name.trim() }))
      .filter((profile) => profile.name)

    const { error: postcodeError } = await supabase.rpc(
      'set_household_postcode',
      {
        target_household_id: householdId,
        home_postcode: postcode,
      }
    )

    if (postcodeError) {
      console.error('Save household postcode error:', postcodeError)
      setMessage(postcodeError.message)
      setSaving(false)
      return
    }

    const { error } = await supabase.rpc('complete_guided_household_setup', {
      target_household_id: householdId,
      profiles: completeProfiles,
      meal_entries: choices.meals
        ? meals.filter((meal) => meal.title.trim())
        : [],
      week_entries: choices.week
        ? weekEvents.filter((event) => event.title.trim())
        : [],
      chore_entries: choices.chores
        ? chores.filter((chore) => chore.title.trim())
        : [],
      routine_entries: choices.routines
        ? routines
            .filter((routine) => routine.title.trim())
            .map((routine) => ({
              ...routine,
              steps: routine.steps.filter((routineStep) =>
                routineStep.trim()
              ),
            }))
        : [],
    })

    if (error) {
      console.error('Complete onboarding error:', error)
      setMessage(error.message)
      setSaving(false)
      return
    }

    await onComplete()

    window.location.assign('/')
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
            <label className="mt-6 block">
              <span className="mb-2 block text-sm font-medium">
                Home postcode
              </span>
              <input
                type="text"
                autoComplete="postal-code"
                required
                value={postcode}
                onChange={(event) => setPostcode(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 p-4 uppercase"
                placeholder="e.g. NG22 9RU"
                maxLength={8}
              />
              <span className="mt-2 block text-sm text-slate-500">
                Used for local weather and dog-walk suggestions. You can change
                it later in Parent Settings.
              </span>
            </label>
            <button
              type="button"
              onClick={startSetup}
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
                        petType: role === 'pet' ? 'other' : null,
                        emoji:
                          profile.emoji === profileDefaults[profile.role]
                            ? role === 'pet'
                              ? '🐾'
                              : profileDefaults[role]
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
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:col-start-3">
                      <input
                        type="checkbox"
                        checked={profile.petType === 'dog'}
                      onChange={(event) => {
                          const isDog = event.target.checked
                        updateProfile(index, {
                            petType: isDog ? 'dog' : 'other',
                            emoji: isDog ? '🐶' : '🐾',
                        })
                      }}
                        className="h-5 w-5 rounded border-slate-300 accent-blue-600"
                      />
                      <span className="text-sm font-medium">
                        This pet is a dog
                      </span>
                    </label>
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
              onNext={continueProfiles}
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

              {activeSetup === setupStep.key ? (
                <GuidedStageForm
                  stageKey={setupStep.key}
                  profiles={profiles}
                  meals={meals}
                  setMeals={setMeals}
                  weekEvents={weekEvents}
                  setWeekEvents={setWeekEvents}
                  chores={chores}
                  setChores={setChores}
                  routines={routines}
                  setRoutines={setRoutines}
                  onBack={() => {
                    setActiveSetup(null)
                    setChoices((current) => ({
                      ...current,
                      [setupStep.key]: false,
                    }))
                  }}
                  onContinue={() =>
                    continueConfiguredStage(setupStep.key)
                  }
                />
              ) : (
                <>
                  <div className="mt-8 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => {
                        setChoices((current) => ({
                          ...current,
                          [setupStep.key]: true,
                        }))
                        setActiveSetup(setupStep.key)
                        setMessage('')
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
                        setMessage('')
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
                </>
              )}
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

function GuidedStageForm({
  stageKey,
  profiles,
  meals,
  setMeals,
  weekEvents,
  setWeekEvents,
  chores,
  setChores,
  routines,
  setRoutines,
  onBack,
  onContinue,
}: {
  stageKey: keyof SetupChoices
  profiles: Profile[]
  meals: MealDraft[]
  setMeals: Dispatch<SetStateAction<MealDraft[]>>
  weekEvents: WeekDraft[]
  setWeekEvents: Dispatch<SetStateAction<WeekDraft[]>>
  chores: ChoreDraft[]
  setChores: Dispatch<SetStateAction<ChoreDraft[]>>
  routines: RoutineDraft[]
  setRoutines: Dispatch<SetStateAction<RoutineDraft[]>>
  onBack: () => void
  onContinue: () => void
}) {
  const assignableProfiles = profiles
    .map((profile, index) => ({ ...profile, index }))
    .filter((profile) => profile.role !== 'pet')

  return (
    <div className="mt-8">
      {stageKey === 'meals' && (
        <div className="space-y-4">
          {meals.map((meal, index) => (
            <div key={index} className="rounded-2xl bg-slate-50 p-4">
              <input
                value={meal.title}
                onChange={(event) =>
                  setMeals((current) =>
                    replaceAt(current, index, { title: event.target.value })
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white p-3"
                placeholder="Meal name, e.g. chicken wraps"
                maxLength={120}
              />
              <textarea
                value={meal.ingredients}
                onChange={(event) =>
                  setMeals((current) =>
                    replaceAt(current, index, {
                      ingredients: event.target.value,
                    })
                  )
                }
                className="mt-3 min-h-24 w-full rounded-xl border border-slate-200 bg-white p-3"
                placeholder={'Ingredients, one per line\nChicken\nWraps\nPeppers'}
              />
              {meals.length > 1 && (
                <RemoveButton
                  onClick={() =>
                    setMeals((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index)
                    )
                  }
                />
              )}
            </div>
          ))}
          <AddButton
            label="+ Add another meal"
            onClick={() =>
              setMeals((current) => [
                ...current,
                { title: '', ingredients: '' },
              ])
            }
          />
        </div>
      )}

      {stageKey === 'week' && (
        <div className="space-y-4">
          {weekEvents.map((weekEvent, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-[1fr_150px_130px]"
            >
              <input
                value={weekEvent.title}
                onChange={(event) =>
                  setWeekEvents((current) =>
                    replaceAt(current, index, { title: event.target.value })
                  )
                }
                className="rounded-xl border border-slate-200 bg-white p-3"
                placeholder="School, club or appointment"
                maxLength={120}
              />
              <select
                value={weekEvent.dayOfWeek}
                onChange={(event) =>
                  setWeekEvents((current) =>
                    replaceAt(current, index, {
                      dayOfWeek: Number(event.target.value),
                    })
                  )
                }
                className="rounded-xl border border-slate-200 bg-white p-3"
                aria-label="Day of week"
              >
                {[
                  'Monday',
                  'Tuesday',
                  'Wednesday',
                  'Thursday',
                  'Friday',
                  'Saturday',
                  'Sunday',
                ].map((day, dayIndex) => (
                  <option key={day} value={dayIndex + 1}>
                    {day}
                  </option>
                ))}
              </select>
              <input
                type="time"
                value={weekEvent.startTime}
                onChange={(event) =>
                  setWeekEvents((current) =>
                    replaceAt(current, index, {
                      startTime: event.target.value,
                    })
                  )
                }
                className="rounded-xl border border-slate-200 bg-white p-3"
                aria-label="Start time"
              />
              {weekEvents.length > 1 && (
                <RemoveButton
                  onClick={() =>
                    setWeekEvents((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index)
                    )
                  }
                />
              )}
            </div>
          ))}
          <AddButton
            label="+ Add another event"
            onClick={() =>
              setWeekEvents((current) => [
                ...current,
                { title: '', dayOfWeek: 1, startTime: '' },
              ])
            }
          />
        </div>
      )}

      {stageKey === 'chores' && (
        <div className="space-y-4">
          {chores.map((chore, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2"
            >
              <input
                value={chore.title}
                onChange={(event) =>
                  setChores((current) =>
                    replaceAt(current, index, { title: event.target.value })
                  )
                }
                className="rounded-xl border border-slate-200 bg-white p-3"
                placeholder="Chore name"
                maxLength={120}
              />
              <select
                value={chore.assigneeIndex}
                onChange={(event) =>
                  setChores((current) =>
                    replaceAt(current, index, {
                      assigneeIndex: Number(event.target.value),
                    })
                  )
                }
                className="rounded-xl border border-slate-200 bg-white p-3"
                aria-label="Assign chore to"
              >
                <option value={-1}>Leave unassigned</option>
                {assignableProfiles.map((profile) => (
                  <option key={profile.index} value={profile.index}>
                    {profile.emoji} {profile.name}
                  </option>
                ))}
              </select>
              <label className="rounded-xl bg-white p-3 text-sm">
                <span className="mb-1 block text-slate-500">Points</span>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={chore.points}
                  onChange={(event) =>
                    setChores((current) =>
                      replaceAt(current, index, {
                        points: Number(event.target.value) || 1,
                      })
                    )
                  }
                  className="w-full outline-none"
                />
              </label>
              <select
                value={chore.frequency}
                onChange={(event) =>
                  setChores((current) =>
                    replaceAt(current, index, {
                      frequency: event.target.value as 'daily' | 'weekly',
                    })
                  )
                }
                className="rounded-xl border border-slate-200 bg-white p-3"
                aria-label="Chore frequency"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
              {chores.length > 1 && (
                <RemoveButton
                  onClick={() =>
                    setChores((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index)
                    )
                  }
                />
              )}
            </div>
          ))}
          <AddButton
            label="+ Add another chore"
            onClick={() =>
              setChores((current) => [
                ...current,
                {
                  title: '',
                  points: 5,
                  frequency: 'daily',
                  assigneeIndex: -1,
                },
              ])
            }
          />
        </div>
      )}

      {stageKey === 'routines' && (
        <div className="space-y-4">
          {routines.map((routine, routineIndex) => (
            <div
              key={routineIndex}
              className="rounded-2xl bg-slate-50 p-4"
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  value={routine.title}
                  onChange={(event) =>
                    setRoutines((current) =>
                      replaceAt(current, routineIndex, {
                        title: event.target.value,
                      })
                    )
                  }
                  className="rounded-xl border border-slate-200 bg-white p-3"
                  placeholder="Routine name"
                  maxLength={120}
                />
                <select
                  value={routine.timeOfDay}
                  onChange={(event) =>
                    setRoutines((current) =>
                      replaceAt(current, routineIndex, {
                        timeOfDay: event.target.value as
                          | 'morning'
                          | 'afternoon'
                          | 'evening',
                      })
                    )
                  }
                  className="rounded-xl border border-slate-200 bg-white p-3"
                  aria-label="Routine time"
                >
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                </select>
                <select
                  value={routine.assigneeIndex}
                  onChange={(event) =>
                    setRoutines((current) =>
                      replaceAt(current, routineIndex, {
                        assigneeIndex: Number(event.target.value),
                      })
                    )
                  }
                  className="rounded-xl border border-slate-200 bg-white p-3"
                  aria-label="Assign routine to"
                >
                  <option value={-1}>Everyone</option>
                  {assignableProfiles.map((profile) => (
                    <option key={profile.index} value={profile.index}>
                      {profile.emoji} {profile.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-3 space-y-2">
                {routine.steps.map((routineStep, stepIndex) => (
                  <div key={stepIndex} className="flex gap-2">
                    <input
                      value={routineStep}
                      onChange={(event) =>
                        setRoutines((current) =>
                          current.map((currentRoutine, currentIndex) =>
                            currentIndex === routineIndex
                              ? {
                                  ...currentRoutine,
                                  steps: currentRoutine.steps.map(
                                    (currentStep, currentStepIndex) =>
                                      currentStepIndex === stepIndex
                                        ? event.target.value
                                        : currentStep
                                  ),
                                }
                              : currentRoutine
                          )
                        )
                      }
                      className="flex-1 rounded-xl border border-slate-200 bg-white p-3"
                      placeholder={`Step ${stepIndex + 1}`}
                      maxLength={120}
                    />
                    {routine.steps.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setRoutines((current) =>
                            current.map((currentRoutine, currentIndex) =>
                              currentIndex === routineIndex
                                ? {
                                    ...currentRoutine,
                                    steps: currentRoutine.steps.filter(
                                      (_, currentStepIndex) =>
                                        currentStepIndex !== stepIndex
                                    ),
                                  }
                                : currentRoutine
                            )
                          )
                        }
                        className="rounded-xl px-3 text-red-600"
                        aria-label={`Remove step ${stepIndex + 1}`}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() =>
                  setRoutines((current) =>
                    current.map((currentRoutine, currentIndex) =>
                      currentIndex === routineIndex
                        ? {
                            ...currentRoutine,
                            steps: [...currentRoutine.steps, ''],
                          }
                        : currentRoutine
                    )
                  )
                }
                className="mt-3 text-sm font-medium text-blue-700"
              >
                + Add a step
              </button>
              {routines.length > 1 && (
                <RemoveButton
                  label="Remove routine"
                  onClick={() =>
                    setRoutines((current) =>
                      current.filter(
                        (_, currentIndex) => currentIndex !== routineIndex
                      )
                    )
                  }
                />
              )}
            </div>
          ))}
          <AddButton
            label="+ Add another routine"
            onClick={() =>
              setRoutines((current) => [
                ...current,
                {
                  title: '',
                  timeOfDay: 'evening',
                  assigneeIndex: -1,
                  steps: [''],
                },
              ])
            }
          />
        </div>
      )}

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
          onClick={onContinue}
          className="rounded-2xl bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700"
        >
          Save and continue
        </button>
      </div>
    </div>
  )
}

function replaceAt<T>(items: T[], index: number, updates: Partial<T>) {
  return items.map((item, itemIndex) =>
    itemIndex === index ? { ...item, ...updates } : item
  )
}

function AddButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700"
    >
      {label}
    </button>
  )
}

function RemoveButton({
  label = 'Remove',
  onClick,
}: {
  label?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 text-sm font-medium text-red-600"
    >
      {label}
    </button>
  )
}
