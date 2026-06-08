export function isParentUnlocked() {
  if (typeof window === 'undefined') return false
  return sessionStorage.getItem('parentUnlocked') === 'true'
}

export function unlockParent() {
  sessionStorage.setItem('parentUnlocked', 'true')
}

export function lockParent() {
  sessionStorage.removeItem('parentUnlocked')
}