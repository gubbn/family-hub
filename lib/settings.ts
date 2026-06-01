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

export async function updateSetting(key: string, value: string) {
  const { error } = await supabase
    .from('app_settings')
    .upsert(
      {
        key,
        value,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'key',
      }
    )

  if (error) {
    console.error(`Failed to update setting: ${key}`, error)
    return false
  }

  return true
}