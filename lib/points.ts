export type PointCompletion = {
  completed_by: string | null
  points_awarded: number
}

export type ApprovedRewardSpend = {
  family_member_id: string
  points_cost: number
}

export function calculatePointBalances(
  completions: PointCompletion[],
  approvedSpends: ApprovedRewardSpend[]
) {
  const balances: Record<string, number> = {}

  completions.forEach((completion) => {
    if (!completion.completed_by) return
    balances[completion.completed_by] =
      (balances[completion.completed_by] || 0) + completion.points_awarded
  })

  approvedSpends.forEach((spend) => {
    balances[spend.family_member_id] = Math.max(
      (balances[spend.family_member_id] || 0) - spend.points_cost,
      0
    )
  })

  return balances
}
