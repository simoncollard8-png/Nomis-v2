const NOMIS_KEY = process.env.NEXT_PUBLIC_NOMIS_KEY

const headers = {
  'Content-Type': 'application/json',
  'x-nomis-key': NOMIS_KEY
}

import { getLocalDate } from '../lib/date'

export async function dbRead(table, filters = {}, options = {}) {
  const params = new URLSearchParams()
  if (Object.keys(filters).length) params.append('filters', JSON.stringify(filters))
  if (options.order) params.append('order', options.order)
  if (options.limit) params.append('limit', options.limit)
  const res = await fetch(`/api/supabase/${table}?${params}`, { headers })
  const data = await res.json()
  return data.data || []
}

export async function dbWrite(table, action, data, filters = null) {
  const body = { table, action, data }
  if (filters) body.filters = filters
  const res = await fetch('/api/supabase', {
    method: 'POST', headers, body: JSON.stringify(body)
  })
  return await res.json()
}

export async function chat(message, history = [], image = null) {
  const body = { message }
  if (image) body.image = image
  const res = await fetch('/api/chat', {
    method: 'POST', headers,
    body: JSON.stringify(body)
  })
  return await res.json()
}