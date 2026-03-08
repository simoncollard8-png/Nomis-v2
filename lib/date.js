// Returns today's date as YYYY-MM-DD in local timezone (not UTC)
export function getLocalDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Returns a date string for N days ago
export function getLocalDateAgo(daysAgo) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return getLocalDate(d)
}