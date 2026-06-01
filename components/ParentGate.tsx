'use client'

import { useEffect, useState } from 'react'
import { getSetting } from '../lib/settings'

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
    async function loadPin() {
      const savedPin = await getSetting('parent_pin')
      setParentPin(savedPin || '1234')
      setLoading(false)
    }

    loadPin()
  }, [])

  function unlock() {
    if (pin === parentPin) {
      setUnlocked(true)
      setError('')
    } else {
      setError('Incorrect PIN')
    }
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
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              unlock()
            }
          }}
          disabled={loading}
          className="rounded-2xl border border-slate-200 p-4 text-xl"
          placeholder={loading ? 'Loading...' : 'PIN'}
        />

        <button
          onClick={unlock}
          disabled={loading}
          className="rounded-2xl bg-blue-600 px-6 py-4 text-xl font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          Unlock
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </section>
  )
}