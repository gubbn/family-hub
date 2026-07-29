'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useHousehold } from './AuthProvider'

type Props = {
  children: React.ReactNode
}

export default function ParentGate({ children }: Props) {
  const { householdId } = useHousehold()
  const [pin, setPin] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function checkGate(showLoading = false) {
      if (!householdId) {
        if (!cancelled) {
          setUnlocked(false)
          setLoading(false)
        }
        return
      }

      if (showLoading) setLoading(true)

      const { data, error } = await supabase.rpc('parent_zone_status', {
        target_household_id: householdId,
      })

      if (error) console.error('Parent Zone status error:', error)

      if (!cancelled && !error) {
        setUnlocked((wasUnlocked) => {
          const isUnlocked = Boolean(data)

          if (wasUnlocked && !isUnlocked) {
            setError('Parent Zone timed out. Enter your PIN again.')
          }

          return isUnlocked
        })
      }

      if (!cancelled) setLoading(false)
    }

    function handleExpired() {
      setUnlocked(false)
      setError('Parent Zone timed out. Enter your PIN again.')
    }

    function handleFocus() {
      void checkGate()
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void checkGate()
      }
    }

    void checkGate(true)

    const statusInterval = window.setInterval(() => {
      void checkGate()
    }, 30_000)

    window.addEventListener('focus', handleFocus)
    window.addEventListener('parent-zone-expired', handleExpired)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      cancelled = true
      window.clearInterval(statusInterval)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('parent-zone-expired', handleExpired)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [householdId])

  async function handleUnlock() {
    const { data, error: unlockError } = await supabase.rpc(
      'unlock_parent_zone',
      {
        target_household_id: householdId,
        parent_pin: pin.trim(),
      }
    )

    if (!unlockError && data) {
      setUnlocked(true)
      setError('')
      setPin('')
      return
    }

    if (unlockError) console.error('Parent Zone unlock error:', unlockError)
    setError('Incorrect PIN')
  }

  if (loading) {
    return (
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Checking Parent Zone access...</p>
      </section>
    )
  }

  if (unlocked) {
    return <>{children}</>
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-2xl font-semibold">Parent Zone</h2>

      <p className="mb-4 text-sm text-slate-500">
        Enter your PIN to continue.
      </p>

      <div className="flex gap-3">
        <input
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(event) => {
            setPin(event.target.value)
            setError('')
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              handleUnlock()
            }
          }}
          className="rounded-2xl border border-slate-200 p-4 text-xl"
          placeholder="PIN"
        />

        <button
          type="button"
          onClick={handleUnlock}
          className="rounded-2xl bg-blue-600 px-6 py-4 text-xl font-semibold text-white hover:bg-blue-700"
        >
          Unlock
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </section>
  )
}
