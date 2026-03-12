import { NextResponse } from 'next/server'
import { authenticate, loadChatHistory } from '@/lib/nomis-server'

export async function GET(request) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const history = await loadChatHistory(50)
  return NextResponse.json({ success: true, messages: history })
}