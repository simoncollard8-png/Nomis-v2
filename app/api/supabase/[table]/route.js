import { NextResponse } from 'next/server'
import { authenticate, supabase } from '@/lib/nomis-server'

export async function GET(request, { params }) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { table } = params
  const { searchParams } = new URL(request.url)
  const filters = searchParams.get('filters')
  const limit = searchParams.get('limit')
  const order = searchParams.get('order')

  try {
    let query = supabase.from(table).select('*')
    if (filters) {
      const parsed = JSON.parse(filters)
      for (const [col, val] of Object.entries(parsed)) query = query.eq(col, val)
    }
    if (order) query = query.order(order, { ascending: false })
    if (limit) query = query.limit(parseInt(limit))

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, data })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}