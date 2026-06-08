'use client'

import { useEffect, useState } from 'react'
import { getSetting } from '../lib/settings'
import { isParentUnlocked, unlockParent } from '@/lib/parentSession'

type Props = {
  children: React.ReactNode
}

export default function ParentGate({ children }: Props) {
  const [pin, setPin] = useState('')
  const [parentPin, setParentPin] = useState('1234')
  const [unlocked, setUnlocked] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function initialiseGate() {
      if (isParentUnlocked()) {
        setUnlocked(true)
        setLoading(false)
        return
      }

      const savedPin = await getSetting('parent_pin')
      setParentPin(savedPin || '1234')
      setLoading(false)
    }

    initialiseGate()
  }, [])

  function handleUnlock() {
    if (pin.trim() === parentPin) {
      unlockParent()
      setUnlocked(true)
      setError('')
      setPin('')
      return
    }

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