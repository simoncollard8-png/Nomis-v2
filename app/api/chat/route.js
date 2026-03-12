import { NextResponse } from 'next/server'
import { authenticate, loadChatHistory, saveMessage, loadUserContext } from '@/lib/nomis-server'

export async function POST(request) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { message, image } = await request.json()
  if (!message) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  try {
    const [history, userContext] = await Promise.all([
      loadChatHistory(50),
      loadUserContext()
    ])

    const systemPrompt = `You are NOMIS, an elite AI fitness and life optimization assistant. You are direct, data-driven, and deeply knowledgeable about training, nutrition, recovery, and performance.

${userContext ? `CURRENT USER DATA:\n${userContext}` : ''}

When the user logs data (workouts, meals, sleep, stats, etc), extract it and return it in this exact format at the end of your response:
<nomis_data>
{"action":"insert","table":"tablename","data":{...}}
</nomis_data>

Tables: workouts, workout_sets, nutrition, sleep, cardio, body_stats, supplement_logs, peptide_logs
Be conversational but precise. No fluff.`

    const userContent = image
      ? [
          { type: 'image', source: { type: 'base64', media_type: image.media_type, data: image.data } },
          { type: 'text', text: message }
        ]
      : message

    const messages = [
      ...history,
      { role: 'user', content: userContent }
    ]

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2048,
        system: systemPrompt,
        messages
      })
    })

    if (!response.ok) {
      const err = await response.json()
      return NextResponse.json({ error: 'Anthropic API error', details: err }, { status: 500 })
    }

    const result = await response.json()
    const fullText = result.content[0].text
    const dataMatch = fullText.match(/<nomis_data>([\s\S]*?)<\/nomis_data>/)
    let parsedData = null

    if (dataMatch) {
      try { parsedData = JSON.parse(dataMatch[1].trim()) }
      catch (e) { console.error('Failed to parse nomis_data:', e) }
    }

    const cleanResponse = fullText.replace(/<nomis_data>[\s\S]*?<\/nomis_data>/g, '').trim()

    await saveMessage('user', message)
    await saveMessage('assistant', cleanResponse, parsedData)

    return NextResponse.json({
      success: true,
      response: cleanResponse,
      parsed_data: parsedData,
      usage: result.usage
    })

  } catch (err) {
    console.error('Chat error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}