'use client'

import { useCallback, useEffect, useState } from 'react'
import { useHousehold } from '../../../components/AuthProvider'
import NavBar from '../../../components/NavBar'
import ParentBackButton from '../../../components/ParentBackButton'
import ParentGate from '../../../components/ParentGate'
import { supabase } from '../../../lib/supabaseClient'

type Reward = {
  id: string
  name: string
  description: string | null
  emoji: string
  points_cost: number
  active: boolean
}

type RewardRequest = {
  id: string
  points_cost: number
  requested_at: string
  rewards: { name: string; emoji: string } | { name: string; emoji: string }[]
  family_members:
    | { name: string; avatar_emoji: string | null }
    | { name: string; avatar_emoji: string | null }[]
}

export default function ParentRewardsPage() {
  const { householdId } = useHousehold()
  const [rewards, setRewards] = useState<Reward[]>([])
  const [requests, setRequests] = useState<RewardRequest[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [emoji, setEmoji] = useState('🎁')
  const [pointsCost, setPointsCost] = useState('20')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    const [rewardsResult, requestsResult] = await Promise.all([
      supabase
        .from('rewards')
        .select('id, name, description, emoji, points_cost, active')
        .order('points_cost'),
      supabase
        .from('reward_requests')
        .select(`
          id,
          points_cost,
          requested_at,
          rewards (name, emoji),
          family_members (name, avatar_emoji)
        `)
        .eq('status', 'pending')
        .order('requested_at'),
    ])

    if (rewardsResult.error) console.error('Load parent rewards:', rewardsResult.error)
    if (requestsResult.error) console.error('Load reward requests:', requestsResult.error)

    setRewards((rewardsResult.data || []) as Reward[])
    setRequests((requestsResult.data || []) as RewardRequest[])
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  async function addReward() {
    const cost = Number(pointsCost)
    if (!name.trim() || !Number.isInteger(cost) || cost <= 0) {
      setStatus('Add a reward name and a positive whole-number point value.')
      return
    }

    const { error } = await supabase.from('rewards').insert({
      household_id: householdId,
      name: name.trim(),
      description: description.trim() || null,
      emoji: emoji.trim() || '🎁',
      points_cost: cost,
    })

    if (error) {
      console.error('Add reward error:', error)
      setStatus('Could not add that reward.')
      return
    }

    setName('')
    setDescription('')
    setEmoji('🎁')
    setPointsCost('20')
    setStatus('Reward added.')
    await loadData()
  }

  async function toggleReward(reward: Reward) {
    const { error } = await supabase
      .from('rewards')
      .update({ active: !reward.active, updated_at: new Date().toISOString() })
      .eq('id', reward.id)

    if (error) {
      console.error('Toggle reward error:', error)
      setStatus('Could not update that reward.')
      return
    }

    await loadData()
  }

  async function reviewRequest(requestId: string, decision: 'approved' | 'declined') {
    const { error } = await supabase.rpc('review_reward_request', {
      target_request_id: requestId,
      decision,
    })

    if (error) {
      console.error('Review reward request error:', error)
      setStatus(error.message)
      return
    }

    setStatus(decision === 'approved' ? 'Reward approved and points spent.' : 'Reward declined.')
    await loadData()
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <NavBar />
        <ParentBackButton />
        <h1 className="mb-6 text-4xl font-bold tracking-tight">Rewards</h1>

        <ParentGate>
          <div className="space-y-6">
            {status && (
              <p role="status" className="rounded-2xl bg-blue-50 p-4 text-blue-800">
                {status}
              </p>
            )}

            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold">Waiting for approval</h2>
              {loading ? (
                <p className="mt-4 text-slate-500">Loading requests...</p>
              ) : requests.length === 0 ? (
                <p className="mt-4 text-slate-500">No reward requests waiting.</p>
              ) : (
                <div className="mt-5 space-y-3">
                  {requests.map((request) => {
                    const reward = Array.isArray(request.rewards)
                      ? request.rewards[0]
                      : request.rewards
                    const member = Array.isArray(request.family_members)
                      ? request.family_members[0]
                      : request.family_members

                    return (
                      <div
                        key={request.id}
                        className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-amber-50 p-4"
                      >
                        <div>
                          <p className="font-semibold">
                            {member?.avatar_emoji || '🙂'} {member?.name} wants{' '}
                            {reward?.emoji || '🎁'} {reward?.name}
                          </p>
                          <p className="text-sm text-slate-600">
                            {request.points_cost} points
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => void reviewRequest(request.id, 'approved')}
                            className="rounded-xl bg-green-600 px-4 py-2 font-semibold text-white"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => void reviewRequest(request.id, 'declined')}
                            className="rounded-xl bg-white px-4 py-2 font-semibold text-red-700"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold">Create a reward</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-[90px_1fr_150px]">
                <input
                  value={emoji}
                  onChange={(event) => setEmoji(event.target.value)}
                  className="rounded-xl border border-slate-200 p-3 text-center text-2xl"
                  aria-label="Reward emoji"
                  maxLength={16}
                />
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="rounded-xl border border-slate-200 p-3"
                  placeholder="Reward name, e.g. choose Friday's film"
                  maxLength={80}
                />
                <input
                  type="number"
                  min="1"
                  value={pointsCost}
                  onChange={(event) => setPointsCost(event.target.value)}
                  className="rounded-xl border border-slate-200 p-3"
                  placeholder="Points"
                />
              </div>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="mt-3 min-h-24 w-full rounded-xl border border-slate-200 p-3"
                placeholder="Optional details"
                maxLength={300}
              />
              <button
                type="button"
                onClick={() => void addReward()}
                className="mt-3 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
              >
                Add reward
              </button>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold">Your rewards</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {rewards.map((reward) => (
                  <div key={reward.id} className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xl font-semibold">
                      {reward.emoji} {reward.name}
                    </p>
                    <p className="mt-1 text-purple-700">
                      {reward.points_cost} points
                    </p>
                    <button
                      type="button"
                      onClick={() => void toggleReward(reward)}
                      className="mt-3 text-sm font-medium text-blue-700 underline"
                    >
                      {reward.active ? 'Pause reward' : 'Make available'}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </ParentGate>
      </div>
    </main>
  )
}
