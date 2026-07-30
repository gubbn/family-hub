'use client'

import type { User } from '@supabase/supabase-js'
import { usePathname } from 'next/navigation'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { supabase } from '../lib/supabaseClient'
import OnboardingWizard from './OnboardingWizard'

type HouseholdMembership = {
  household_id: string
  role: 'owner' | 'parent'
  householdName: string
  onboardingComplete: boolean
}

type AuthContextValue = {
  user: User
  householdId: string
  householdName: string
  role: HouseholdMembership['role']
  refreshHousehold: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useHousehold() {
  const value = useContext(AuthContext)

  if (!value) {
    throw new Error('useHousehold must be used inside AuthProvider')
  }

  return value
}

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [membership, setMembership] = useState<HouseholdMembership | null>(null)
  const [loading, setLoading] = useState(true)

  const loadMembership = useCallback(async (activeUser: User) => {
    const { data, error } = await supabase
      .from('household_memberships')
      .select('household_id, role, households(name)')
      .eq('user_id', activeUser.id)
      .maybeSingle()

    if (error) {
      console.error('Load household membership error:', error)
      setMembership(null)
      return
    }

    if (!data) {
      setMembership(null)
      return
    }

    const household = Array.isArray(data.households)
      ? data.households[0]
      : data.households

    let onboardingComplete = data.role !== 'owner'

    if (data.role === 'owner') {
      const { data: onboardingSetting, error: onboardingError } = await supabase
        .from('app_settings')
        .select('value')
        .eq('household_id', data.household_id)
        .eq('key', 'onboarding_completed')
        .maybeSingle()

      if (onboardingError) {
        console.error('Load onboarding status error:', onboardingError)
      }

      onboardingComplete = onboardingSetting?.value === 'true'
    }

    setMembership({
      household_id: data.household_id,
      role: data.role as HouseholdMembership['role'],
      householdName: household?.name || 'Family Hub',
      onboardingComplete,
    })
  }, [])

  const refreshHousehold = useCallback(async () => {
    if (user) {
      await loadMembership(user)
    }
  }, [loadMembership, user])

  useEffect(() => {
    let active = true

    async function initialiseAuth() {
      const {
        data: { user: verifiedUser },
      } = await supabase.auth.getUser()

      if (!active) return

      setUser(verifiedUser)

      if (verifiedUser) {
        await loadMembership(verifiedUser)
      }

      if (active) setLoading(false)
    }

    initialiseAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user || null
      setUser(nextUser)

      if (!nextUser) {
        setMembership(null)
        setLoading(false)
        return
      }

      setTimeout(() => {
        void loadMembership(nextUser).finally(() => setLoading(false))
      }, 0)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [loadMembership])

  const contextValue = useMemo<AuthContextValue | null>(() => {
    if (!user || !membership) return null

    return {
      user,
      householdId: membership.household_id,
      householdName: membership.householdName,
      role: membership.role,
      refreshHousehold,
      signOut: async () => {
        await supabase.auth.signOut()
      },
    }
  }, [membership, refreshHousehold, user])

  if (pathname === '/status') {
    return children
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-100 p-6">
        <p className="rounded-3xl bg-white px-6 py-5 text-slate-600 shadow-sm">
          Opening your Family Hub...
        </p>
      </main>
    )
  }

  if (!user) {
    return <SignInScreen />
  }

  if (!membership) {
    return (
      <HouseholdSetup
        user={user}
        onComplete={() => loadMembership(user)}
        onSignOut={() => supabase.auth.signOut()}
      />
    )
  }

  if (!membership.onboardingComplete) {
    return (
      <OnboardingWizard
        householdId={membership.household_id}
        householdName={membership.householdName}
        onComplete={() => loadMembership(user)}
        onSignOut={async () => {
          await supabase.auth.signOut()
        }}
      />
    )
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

function SignInScreen() {
  const [email, setEmail] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [sentEmail, setSentEmail] = useState('')
  const [code, setCode] = useState('')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [message, setMessage] = useState('')

  async function requestSignInEmail() {
    const cleanEmail = email.trim().toLowerCase()

    if (!cleanEmail) {
      setMessage('Enter your email address first.')
      return
    }

    setSending(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        emailRedirectTo: window.location.origin,
        shouldCreateUser: true,
      },
    })

    setSending(false)

    if (error) {
      console.error('Email code request error:', error)
      setMessage(error.message)
      return
    }

    setSentEmail(cleanEmail)
    setCodeSent(true)
    setMessage('Code sent. Check your email for your one-time sign-in code.')
  }

  async function sendSignInEmail(event: React.FormEvent) {
    event.preventDefault()
    await requestSignInEmail()
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault()
    const cleanCode = code.replace(/\D/g, '')

    if (cleanCode.length !== 6) {
      setMessage('Enter the full six-digit code from the email.')
      return
    }

    setVerifying(true)
    setMessage('')

    const { error } = await supabase.auth.verifyOtp({
      email: sentEmail,
      token: cleanCode,
      type: 'email',
    })

    setVerifying(false)

    if (error) {
      console.error('Email code verification error:', error)
      setMessage(
        'That code is incorrect or has expired. Check the email or request a new code.'
      )
      return
    }

    setMessage('Code accepted. Opening your Family Hub…')
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-6 text-slate-900">
      <section className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-sm">
        <div className="mb-4 text-5xl">🏡</div>
        <h1 className="text-3xl font-bold">Welcome to Family Hub</h1>
        <p className="mt-3 text-slate-600">
          We&apos;ll email you a six-digit one-time code. There&apos;s no
          password to remember and no link to open.
        </p>

        {!codeSent ? (
          <>
            <p className="mt-6 rounded-2xl bg-blue-50 p-4 text-sm text-blue-900">
              🔢 Open the email on this device or another one, then type the
              code into Family Hub.
            </p>

            <form onSubmit={sendSignInEmail} className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium">
                  Email address
                </span>
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 p-4"
                  placeholder="you@example.com"
                />
              </label>

              <button
                type="submit"
                disabled={sending}
                className="w-full rounded-2xl bg-blue-600 px-6 py-4 font-semibold text-white hover:bg-blue-700 disabled:bg-slate-400"
              >
                {sending ? 'Sending…' : 'Send my 6-digit code'}
              </button>
            </form>
          </>
        ) : (
          <div className="mt-6">
            <div className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-900">
              <p className="font-semibold">Code sent to {sentEmail}</p>
              <p className="mt-1">
                Open the email on this device or another one, then enter the
                six-digit code below.
              </p>
            </div>

            <form onSubmit={verifyCode} className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium">
                  Six-digit code
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  className="w-full rounded-2xl border border-slate-300 p-4 text-center text-3xl font-bold tracking-[0.35em]"
                  placeholder="000000"
                  aria-label="Six-digit sign-in code"
                />
              </label>

              <button
                type="submit"
                disabled={verifying}
                className="w-full rounded-2xl bg-blue-600 px-6 py-4 font-semibold text-white hover:bg-blue-700 disabled:bg-slate-400"
              >
                {verifying ? 'Checking code…' : 'Open Family Hub'}
              </button>
            </form>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
              <button
                type="button"
                onClick={() => {
                  setCode('')
                  setMessage('')
                  setCodeSent(false)
                }}
                className="text-slate-600 underline"
              >
                Change email
              </button>
              <button
                type="button"
                disabled={sending}
                onClick={() => void requestSignInEmail()}
                className="font-medium text-blue-700 underline disabled:text-slate-400"
              >
                Send a new code
              </button>
            </div>
          </div>
        )}

        {message && (
          <p role="status" className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm">
            {message}
          </p>
        )}
      </section>
    </main>
  )
}

function HouseholdSetup({
  user,
  onComplete,
  onSignOut,
}: {
  user: User
  onComplete: () => Promise<void>
  onSignOut: () => Promise<unknown>
}) {
  const [mode, setMode] = useState<'claim' | 'join' | 'create'>('claim')
  const [claimCode, setClaimCode] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [householdName, setHouseholdName] = useState('')
  const [pin, setPin] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function finishSetup(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setMessage('')

    const request = (() => {
      if (mode === 'claim') {
        return supabase.rpc('claim_existing_household', {
          claim_code: claimCode.trim().toUpperCase(),
          parent_pin: pin,
        })
      }

      if (mode === 'join') {
        return supabase.rpc('accept_parent_invite', {
          invite_code: inviteCode.trim().toUpperCase(),
        })
      }

      return supabase.rpc('create_household', {
        household_name: householdName.trim(),
        parent_pin: pin,
      })
    })()

    const { error } = await request

    if (error) {
      console.error('Household setup error:', error)
      setMessage(error.message)
      setSaving(false)
      return
    }

    await onComplete()
    setSaving(false)
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-6 text-slate-900">
      <section className="w-full max-w-xl rounded-3xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold">Set up your family space</h1>
        <p className="mt-3 text-slate-600">
          Signed in as {user.email}. Your children will use profiles inside
          this household and won&apos;t need email accounts.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setMode('claim')}
            className={`rounded-2xl p-4 font-semibold ${
              mode === 'claim' ? 'bg-blue-600 text-white' : 'bg-slate-100'
            }`}
          >
            Claim my existing hub
          </button>
          <button
            type="button"
            onClick={() => setMode('join')}
            className={`rounded-2xl p-4 font-semibold ${
              mode === 'join' ? 'bg-blue-600 text-white' : 'bg-slate-100'
            }`}
          >
            Join with an invite
          </button>
          <button
            type="button"
            onClick={() => setMode('create')}
            className={`rounded-2xl p-4 font-semibold ${
              mode === 'create' ? 'bg-blue-600 text-white' : 'bg-slate-100'
            }`}
          >
            Create a new hub
          </button>
        </div>

        <form onSubmit={finishSetup} className="mt-6 space-y-4">
          {mode === 'claim' && (
            <label className="block">
              <span className="mb-2 block text-sm font-medium">
                Household claim code
              </span>
              <input
                required
                value={claimCode}
                onChange={(event) => setClaimCode(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 p-4 uppercase"
                placeholder="XXXX-XXXX-XXXX"
              />
            </label>
          )}

          {mode === 'join' && (
            <label className="block">
              <span className="mb-2 block text-sm font-medium">
                Parent invitation code
              </span>
              <input
                required
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 p-4 uppercase"
                placeholder="XXXXXX-XXXXXX-XXXXXX"
              />
            </label>
          )}

          {mode === 'create' && (
            <label className="block">
              <span className="mb-2 block text-sm font-medium">
                What would you like to call your hub?
              </span>
              <input
                required
                minLength={2}
                maxLength={60}
                value={householdName}
                onChange={(event) => setHouseholdName(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 p-4"
                placeholder="e.g. The Smith Family"
              />
            </label>
          )}

          {mode !== 'join' && (
            <label className="block">
              <span className="mb-2 block text-sm font-medium">
                Choose a Parent Zone PIN
              </span>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]{4,8}"
                minLength={4}
                maxLength={8}
                required
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 p-4"
                placeholder="4 to 8 numbers"
              />
            </label>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-2xl bg-green-600 px-6 py-4 font-semibold text-white hover:bg-green-700 disabled:bg-slate-400"
          >
            {saving ? 'Setting up...' : 'Continue to my hub'}
          </button>
        </form>

        {message && (
          <p role="alert" className="mt-4 rounded-2xl bg-red-50 p-4 text-red-700">
            {message}
          </p>
        )}

        <button
          type="button"
          onClick={() => void onSignOut()}
          className="mt-5 text-sm text-slate-500 underline"
        >
          Sign out
        </button>
      </section>
    </main>
  )
}
