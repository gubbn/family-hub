'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import NavBar from '../../components/NavBar'
import { calculatePointBalances } from '../../lib/points'
import { supabase } from '../../lib/supabaseClient'

type FamilyMember = {
  id: string
  name: string
  avatar_emoji: string | null
  role: string | null
}

type Reward = {
  id: string
  name: string
  description: string | null
  emoji: string
  points_cost: number
}

type Completion = {
  completed_by: string | null
  points_awarded: number
}

type RewardRequest = {
  id: string
  reward_id: string
  family_member_id: string
  points_cost: number
  status: 'pending' | 'approved' | 'declined'
}

export default function RewardsPage() {
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [requests, setRequests] = useState<RewardRequest[]>([])
  const [completions, setCompletions] = useState<Completion[]>([])
  const [selectedMember, setSelectedMember] = useState('')
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')

  const loadRewards = useCallback(async () => {
    setLoading(true)

    const [membersResult, rewardsResult, completionsResult, requestsResult] =
      await Promise.all([
        supabase
          .from('family_members')
          .select('id, name, avatar_emoji, role')
          .neq('role', 'pet')
          .order('display_order'),
        supabase
          .from('rewards')
          .select('id, name, description, emoji, points_cost')
          .eq('active', true)
          .order('points_cost'),
        supabase
          .from('chore_completions')
          .select('completed_by, points_awarded'),
        supabase
          .from('reward_requests')
          .select('id, reward_id, family_member_id, points_cost, status')
          .order('requested_at', { ascending: false }),
      ])

    const firstError = [
      membersResult.error,
      rewardsResult.error,
      completionsResult.error,
      requestsResult.error,
    ].find(Boolean)

    if (firstError) {
      console.error('Load rewards error:', firstError)
      setStatus('Could not load rewards.')
    }

    const safeMembers = (membersResult.data || []) as FamilyMember[]
    setMembers(safeMembers)
    setRewards((rewardsResult.data || []) as Reward[])
    setCompletions((completionsResult.data || []) as Completion[])
    setRequests((requestsResult.data || []) as RewardRequest[])
    setSelectedMember((current) => current || safeMembers[0]?.id || '')
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadRewards()
  }, [loadRewards])

  const balances = useMemo(
    () =>
      calculatePointBalances(
        completions,
        requests.filter((request) => request.status === 'approved')
      ),
    [completions, requests]
  )

  const selectedBalance = balances[selectedMember] || 0

  async function requestReward(reward: Reward) {
    if (!selectedMember) {
      setStatus('Choose who is spending the points first.')
      return
    }

    setStatus('')
    const { error } = await supabase.rpc('request_reward', {
      target_reward_id: reward.id,
      target_family_member_id: selectedMember,
    })

    if (error) {
      console.error('Request reward error:', error)
      setStatus(error.message)
      return
    }

    setStatus('Reward requested! A parent needs to approve it.')
    await loadRewards()
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <NavBar />

        <div className="mb-6">
          <h1 className="text-4xl font-bold tracking-tight">Rewards Shop</h1>
          <p className="mt-2 text-slate-600">
            Save points from chores, choose a reward, then ask a parent to
            approve it.
          </p>
        </div>

        <section className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-2xl font-semibold">
            Who is choosing a reward?
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {members.map((member) => (
              <button
                type="button"
                key={member.id}
                onClick={() => setSelectedMember(member.id)}
                className={`rounded-2xl border p-4 text-left ${
                  selectedMember === member.id
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-slate-200'
                }`}
              >
                <span className="text-3xl">{member.avatar_emoji || '🙂'}</span>
                <span className="ml-3 font-semibold">{member.name}</span>
                <span className="mt-2 block text-sm text-purple-700">
                  ⭐ {balances[member.id] || 0} points available
                </span>
              </button>
            ))}
          </div>
        </section>

        {status && (
          <p role="status" className="mb-6 rounded-2xl bg-blue-50 p-4 text-blue-800">
            {status}
          </p>
        )}

        {loading ? (
          <p className="text-slate-500">Opening the rewards shop...</p>
        ) : rewards.length === 0 ? (
          <section className="rounded-3xl bg-white p-8 text-center shadow-sm">
            <div className="text-6xl">🎁</div>
            <h2 className="mt-4 text-2xl font-semibold">No rewards yet</h2>
            <p className="mt-2 text-slate-500">
              A parent can add rewards in Parent Zone.
            </p>
          </section>
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rewards.map((reward) => {
              const pending = requests.some(
                (request) =>
                  request.reward_id === reward.id &&
                  request.family_member_id === selectedMember &&
                  request.status === 'pending'
              )
              const canAfford = selectedBalance >= reward.points_cost

              return (
                <article
                  key={reward.id}
                  className="flex h-full flex-col rounded-3xl bg-white p-6 shadow-sm"
                >
                  <div className="flex h-14 items-center text-5xl">
                    {reward.emoji}
                  </div>
                  <div className="mt-4 flex-1">
                    <h2 className="text-2xl font-semibold leading-tight">
                      {reward.name}
                    </h2>
                    {reward.description && (
                      <p className="mt-2 text-sm text-slate-600">
                        {reward.description}
                      </p>
                    )}
                  </div>
                  <p className="mt-5 text-xl font-bold text-purple-700">
                    ⭐ {reward.points_cost} points
                  </p>
                  <button
                    type="button"
                    disabled={!selectedMember || !canAfford || pending}
                    onClick={() => void requestReward(reward)}
                    className="mt-4 min-h-12 w-full rounded-2xl bg-purple-600 px-5 py-3 font-semibold text-white hover:bg-purple-700 disabled:bg-slate-300"
                  >
                    {pending
                      ? 'Waiting for a parent'
                      : canAfford
                        ? 'Spend my points'
                        : 'Keep earning'}
                  </button>
                </article>
              )
            })}
          </section>
        )}
      </div>
    </main>
  )
}
