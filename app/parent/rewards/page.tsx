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
  status: 'pending' | 'approved' | 'declined'
  requested_at: string
  reviewed_at: string | null
  rewards: { name: string; emoji: string } | { name: string; emoji: string }[]
  family_members:
    | { name: string; avatar_emoji: string | null }
    | { name: string; avatar_emoji: string | null }[]
}

export default function ParentRewardsPage() {
  const { householdId } = useHousehold()
  const [rewards, setRewards] = useState<Reward[]>([])
  const [requests, setRequests] = useState<RewardRequest[]>([])
  const [redemptions, setRedemptions] = useState<RewardRequest[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [emoji, setEmoji] = useState('🎁')
  const [pointsCost, setPointsCost] = useState('20')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    const [rewardsResult, requestsResult, redemptionsResult] = await Promise.all([
      supabase
        .from('rewards')
        .select('id, name, description, emoji, points_cost, active')
        .eq('household_id', householdId)
        .order('points_cost'),
      supabase
        .from('reward_requests')
        .select(`
          id,
          points_cost,
          status,
          requested_at,
          reviewed_at,
          rewards!reward_requests_reward_household_fkey (name, emoji),
          family_members!reward_requests_member_household_fkey (name, avatar_emoji)
        `)
        .eq('household_id', householdId)
        .eq('status', 'pending')
        .order('requested_at'),
      supabase
        .from('reward_requests')
        .select(`
          id,
          points_cost,
          status,
          requested_at,
          reviewed_at,
          rewards!reward_requests_reward_household_fkey (name, emoji),
          family_members!reward_requests_member_household_fkey (name, avatar_emoji)
        `)
        .eq('household_id', householdId)
        .eq('status', 'approved')
        .order('reviewed_at', { ascending: false }),
    ])

    if (rewardsResult.error) console.error('Load parent rewards:', rewardsResult.error)
    if (requestsResult.error) console.error('Load reward requests:', requestsResult.error)
    if (redemptionsResult.error) {
      console.error('Load reward redemption history:', redemptionsResult.error)
    }

    setRewards((rewardsResult.data || []) as Reward[])
    setRequests((requestsResult.data || []) as RewardRequest[])
    setRedemptions((redemptionsResult.data || []) as RewardRequest[])
    setLoading(false)
  }, [householdId])

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

            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold">Redemption history</h2>
              <p className="mt-2 text-slate-600">
                A permanent record of rewards approved and points spent.
              </p>

              {loading ? (
                <p className="mt-4 text-slate-500">Loading history...</p>
              ) : redemptions.length === 0 ? (
                <p className="mt-4 text-slate-500">
                  No rewards have been redeemed yet.
                </p>
              ) : (
                <div className="mt-5 divide-y divide-slate-200">
                  {redemptions.map((redemption) => {
                    const reward = Array.isArray(redemption.rewards)
                      ? redemption.rewards[0]
                      : redemption.rewards
                    const member = Array.isArray(redemption.family_members)
                      ? redemption.family_members[0]
                      : redemption.family_members
                    const redeemedAt =
                      redemption.reviewed_at || redemption.requested_at

                    return (
                      <div
                        key={redemption.id}
                        className="flex flex-wrap items-center justify-between gap-3 py-4"
                      >
                        <div>
                          <p className="font-semibold">
                            {member?.avatar_emoji || '🙂'} {member?.name}{' '}
                            redeemed {reward?.emoji || '🎁'} {reward?.name}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {new Intl.DateTimeFormat('en-GB', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            }).format(new Date(redeemedAt))}
                          </p>
                        </div>
                        <p className="font-semibold text-purple-700">
                          {redemption.points_cost} points
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </div>
        </ParentGate>
      </div>
    </main>
  )
}
