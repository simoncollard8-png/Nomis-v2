import { NextResponse } from 'next/server'
import { authenticate } from '@/lib/nomis-server'

export async function POST(request) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { username, password } = await request.json()
  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password required' }, { status: 400 })
  }

  const success = username === process.env.NOMIS_USERNAME && password === process.env.NOMIS_PASSWORD
  return NextResponse.json({ success })
}