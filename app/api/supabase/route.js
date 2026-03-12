import { NextResponse } from 'next/server'
import { authenticate, supabase } from '@/lib/nomis-server'

export async function POST(request) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { table, action, data, filters } = await request.json()
  if (!table || !action || !data) {
    return NextResponse.json({ error: 'table, action, and data are required' }, { status: 400 })
  }

  try {
    let result
    switch (action) {
      case 'insert':
        result = await supabase.from(table).insert(data).select()
        break
      case 'update':
        if (!filters) return NextResponse.json({ error: 'filters required for update' }, { status: 400 })
        let uq = supabase.from(table).update(data)
        for (const [col, val] of Object.entries(filters)) uq = uq.eq(col, val)
        result = await uq.select()
        break
      case 'upsert':
        result = await supabase.from(table).upsert(data).select()
        break
      case 'delete':
        if (!filters) return NextResponse.json({ error: 'filters required for delete' }, { status: 400 })
        let dq = supabase.from(table).delete()
        for (const [col, val] of Object.entries(filters)) dq = dq.eq(col, val)
        result = await dq.select()
        break
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }

    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
    return NextResponse.json({ success: true, data: result.data })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}