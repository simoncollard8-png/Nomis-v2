import { NextResponse } from 'next/server'
import { authenticate } from '@/lib/nomis-server'

export async function POST(request) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { path, content, message } = await request.json()
  if (!path || !content || !message) {
    return NextResponse.json({ error: 'path, content, and message are required' }, { status: 400 })
  }

  const owner = process.env.GITHUB_OWNER
  const repo = process.env.GITHUB_REPO
  const token = process.env.GITHUB_TOKEN
  const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`

  try {
    let sha = null
    const checkRes = await fetch(apiBase, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
    })
    if (checkRes.ok) {
      const existing = await checkRes.json()
      sha = existing.sha
    }

    const body = { message, content: Buffer.from(content).toString('base64') }
    if (sha) body.sha = sha

    const pushRes = await fetch(apiBase, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    if (!pushRes.ok) {
      const err = await pushRes.json()
      return NextResponse.json({ error: 'GitHub push failed', details: err }, { status: 500 })
    }

    const result = await pushRes.json()
    return NextResponse.json({ success: true, file: path, commit: result.commit?.sha })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}