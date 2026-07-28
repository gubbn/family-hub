import { supabase } from './supabaseClient'

export async function getSetting(key: string) {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', key)
    .single()

  if (error) {
    console.error(`Failed to load setting: ${key}`, error)
    return null
  }

  return data?.value || null
}

export async function updateSetting(
  key: string,
  value: string,
  householdId: string
) {
  const { error } = await supabase
    .from('app_settings')
    .upsert(
      {
        household_id: householdId,
        key,
        value,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'household_id,key',
      }
    )

  if (error) {
    console.error(`Failed to update setting: ${key}`, error)
    return false
  }

  return true
}
