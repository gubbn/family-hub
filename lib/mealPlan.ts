export type MealPlanWithId = {
  meal_id: string | null
}

export type MealWithId = {
  id: string
}

export function joinMealsToPlan<
  Plan extends MealPlanWithId,
  Meal extends MealWithId,
>(plans: Plan[], meals: Meal[]) {
  const mealsById = new Map(meals.map((meal) => [meal.id, meal]))

  return plans.map((plan) => ({
    ...plan,
    meals: plan.meal_id ? mealsById.get(plan.meal_id) || null : null,
  }))
}
