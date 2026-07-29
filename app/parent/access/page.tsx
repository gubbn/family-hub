'use client'

import { useCallback, useEffect, useState } from 'react'
import { useHousehold } from '../../../components/AuthProvider'
import NavBar from '../../../components/NavBar'
import ParentBackButton from '../../../components/ParentBackButton'
import ParentGate from '../../../components/ParentGate'
import { supabase } from '../../../lib/supabaseClient'

type ParentMembership = {
  user_id: string
  email: string
  role: 'owner' | 'parent'
}

export default function ParentAccessPage() {
  const { householdId, user, role } = useHousehold()
  const [parents, setParents] = useState<ParentMembership[]>([])
  const [inviteCode, setInviteCode] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)

  const loadParents = useCallback(async () => {
    const { data, error } = await supabase
      .from('household_memberships')
      .select('user_id, email, role')
      .eq('household_id', householdId)
      .order('created_at')

    if (error) {
      console.error('Load parent access error:', error)
      setStatus('Could not load parent access.')
    } else {
      setParents((data || []) as ParentMembership[])
    }

    setLoading(false)
  }, [householdId])

  useEffect(() => {
    void loadParents()
  }, [loadParents])

  async function createInvite() {
    setStatus('')
    const { data, error } = await supabase.rpc('create_parent_invite', {
      target_household_id: householdId,
    })

    if (error) {
      console.error('Create parent invite error:', error)
      setStatus(error.message)
      return
    }

    setInviteCode(String(data))
    setStatus('Invitation created. It expires in 24 hours and works once.')
  }

  async function copyInvite() {
    if (!inviteCode) return

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(inviteCode)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = inviteCode
        textArea.setAttribute('readonly', '')
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.select()

        const copied = document.execCommand('copy')
        document.body.removeChild(textArea)

        if (!copied) {
          throw new Error('The browser blocked clipboard access')
        }
      }

      setStatus('Invitation code copied.')
    } catch (error) {
      console.error('Copy invitation code error:', error)
      window.prompt('Copy this invitation code:', inviteCode)
      setStatus('The code is ready to copy from the box shown.')
    }
  }

  async function removeParent(parent: ParentMembership) {
    if (!window.confirm(`Remove access for ${parent.email}?`)) return

    const { error } = await supabase.rpc('remove_parent_access', {
      target_household_id: householdId,
      target_user_id: parent.user_id,
    })

    if (error) {
      console.error('Remove parent access error:', error)
      setStatus(error.message)
      return
    }

    setStatus(`${parent.email} no longer has access.`)
    await loadParents()
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <NavBar />
        <ParentBackButton />
        <h1 className="mb-6 text-4xl font-bold tracking-tight">
          Parent Access
        </h1>

        <ParentGate>
          <div className="space-y-6">
            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold">Invite another parent</h2>
              <p className="mt-2 text-slate-600">
                Create a private, single-use code. Send it to the parent you
                trust. They sign in using their own email and choose
                &ldquo;Join with an invite&rdquo;.
              </p>

              <button
                type="button"
                onClick={createInvite}
                className="mt-5 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
              >
                Create invitation code
              </button>

              {inviteCode && (
                <div className="mt-5 rounded-2xl bg-blue-50 p-5">
                  <p className="text-sm font-medium text-blue-800">
                    Invitation code
                  </p>
                  <p className="mt-2 break-all font-mono text-2xl font-bold tracking-wider">
                    {inviteCode}
                  </p>
                  <button
                    type="button"
                    onClick={() => void copyInvite()}
                    className="mt-4 rounded-xl bg-white px-4 py-2 font-medium shadow-sm"
                  >
                    Copy code
                  </button>
                </div>
              )}
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold">Parents with access</h2>

              {loading ? (
                <p className="mt-4 text-slate-500">Loading parents...</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {parents.map((parent) => (
                    <div
                      key={parent.user_id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4"
                    >
                      <div>
                        <p className="font-semibold">{parent.email}</p>
                        <p className="text-sm capitalize text-slate-500">
                          {parent.role}
                          {parent.user_id === user.id ? ' · You' : ''}
                        </p>
                      </div>

                      {role === 'owner' &&
                        parent.role === 'parent' &&
                        parent.user_id !== user.id && (
                          <button
                            type="button"
                            onClick={() => void removeParent(parent)}
                            className="rounded-xl bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                          >
                            Remove access
                          </button>
                        )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {status && (
              <p
                role="status"
                className="rounded-2xl bg-white p-4 text-sm shadow-sm"
              >
                {status}
              </p>
            )}
          </div>
        </ParentGate>
      </div>
    </main>
  )
}
