import { NextResponse } from 'next/server'
import { authenticate } from '@/lib/nomis-server'

export async function POST(request) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { type, exercise_name, muscle_group, count = 5, context = '' } = await request.json()
  if (!type) {
    return NextResponse.json({ error: 'type is required: info | suggest | swap' }, { status: 400 })
  }

  let prompt = ''

  if (type === 'info') {
    if (!exercise_name) return NextResponse.json({ error: 'exercise_name required for info' }, { status: 400 })
    prompt = `Give me a complete breakdown for the exercise "${exercise_name}". Return ONLY this JSON object:
{"name":"${exercise_name}","muscles":"primary muscles","secondary":"secondary muscles","equipment":"what equipment needed","difficulty":"beginner/intermediate/advanced","cues":["form cue 1","form cue 2","form cue 3","form cue 4"],"mistakes":["common mistake 1","common mistake 2","common mistake 3"],"variations":["variation 1","variation 2","variation 3"],"tip":"single most important coaching tip","sets_recommendation":"e.g. 3-4 sets","reps_recommendation":"e.g. 8-12 reps"}`

  } else if (type === 'suggest') {
    if (!muscle_group) return NextResponse.json({ error: 'muscle_group required for suggest' }, { status: 400 })
    prompt = `Suggest ${count} exercises for ${muscle_group}. ${context}
Return ONLY this JSON array (no other text):
[{"name":"Exercise Name","muscle_group":"${muscle_group}","secondary_muscles":"secondary","equipment":"barbell/dumbbell/cable/machine/bodyweight","difficulty":"beginner/intermediate/advanced","sets":4,"reps":"8-10","rest_seconds":90,"notes":"one coaching tip"}]`

  } else if (type === 'swap') {
    if (!exercise_name) return NextResponse.json({ error: 'exercise_name required for swap' }, { status: 400 })
    prompt = `Suggest 4 alternative exercises to replace "${exercise_name}". ${context ? `Context: ${context}` : ''}
Return ONLY this JSON array:
[{"name":"Alternative Name","muscle_group":"same muscle group","equipment":"barbell/dumbbell/cable/machine/bodyweight","difficulty":"beginner/intermediate/advanced","similarity":"why this is a good swap","sets":4,"reps":"8-10"}]`

  } else {
    return NextResponse.json({ error: 'type must be: info | suggest | swap' }, { status: 400 })
  }

  try {
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
        system: 'You are a strength and conditioning coach. Return only valid JSON, no markdown, no explanation.',
        messages: [{ role: 'user', content: prompt }]
      })
    })

    if (!response.ok) {
      const err = await response.json()
      return NextResponse.json({ error: 'Anthropic API error', details: err }, { status: 500 })
    }

    const result = await response.json()
    const rawText = result.content[0].text.trim()
    const jsonMatch = rawText.match(/(\[[\s\S]*\]|\{[\s\S]*\})/)
    if (!jsonMatch) return NextResponse.json({ error: 'Claude did not return valid JSON', raw: rawText }, { status: 500 })

    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json({ success: true, data: parsed, type, usage: result.usage })

  } catch (err) {
    console.error('Exercises error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}