import { supabase } from '@/lib/supabaseClient'

export type StreakItemType = 'routine_step' | 'chore' | 'workout'

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10)
}

function getYesterdayDateString() {
  const date = new Date()
  date.setDate(date.getDate() - 1)
  return date.toISOString().slice(0, 10)
}

export async function updateCompletionStreak({
  memberId,
  itemType,
  itemId,
}: {
  memberId: string
  itemType: StreakItemType
  itemId: string
}) {
  const today = getTodayDateString()
  const yesterday = getYesterdayDateString()

  const { data: existing, error: fetchError } = await supabase
    .from('completion_streaks')
    .select('*')
    .eq('member_id', memberId)
    .eq('item_type', itemType)
    .eq('item_id', itemId)
    .maybeSingle()

  if (fetchError) {
    console.error('Error fetching streak:', fetchError)
    return null
  }

  if (!existing) {
    const { data, error } = await supabase
      .from('completion_streaks')
      .insert({
        member_id: memberId,
        item_type: itemType,
        item_id: itemId,
        streak_count: 1,
        best_streak: 1,
        last_completed_date: today,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating streak:', error)
      return null
    }

    return data
  }

  if (existing.last_completed_date === today) {
    return existing
  }

  const nextStreak =
    existing.last_completed_date === yesterday
      ? existing.streak_count + 1
      : 1

  const nextBestStreak = Math.max(existing.best_streak || 0, nextStreak)

  const { data, error } = await supabase
    .from('completion_streaks')
    .update({
      streak_count: nextStreak,
      best_streak: nextBestStreak,
      last_completed_date: today,
    })
    .eq('id', existing.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating streak:', error)
    return null
  }

  return data
}