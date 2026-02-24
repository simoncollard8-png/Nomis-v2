'use client'
import { useState, useEffect, useRef } from 'react'
import { chat, dbWrite } from '../lib/api'
import { buildContext } from '../lib/context'

// ── Action handlers — each parsed_data action maps to a DB write ────────────
async function executeAction(parsed_data) {
  const { action, data } = parsed_data
  if (!action || !data) return null

  try {
    switch (action) {

      case 'log_workout':
        return await dbWrite('workout_sessions', 'insert', {
          date:         data.date || new Date().toISOString().split('T')[0],
          muscle_group: data.muscle_group,
          title:        data.title,
          description:  data.description,
          feeling:      data.feeling,
          duration_min: data.duration_min || null,
        })

      case 'log_sets': {
        // First create the session
        const session = await dbWrite('workout_sessions', 'insert', {
          date:         data.date || new Date().toISOString().split('T')[0],
          muscle_group: data.muscle_group,
          title:        data.title || `${data.muscle_group} Day`,
          description:  data.description || '',
        })
        const sessionId = session?.data?.[0]?.id
        if (!sessionId || !data.exercises) return session

        // Then log each exercise and its sets
        for (const ex of data.exercises) {
          const exRow = await dbWrite('workout_exercises', 'insert', {
            session_id:   sessionId,
            name:         ex.name,
            muscle_group: ex.muscle_group || data.muscle_group,
            sets:         ex.sets?.length || 0,
          })
          const exId = exRow?.data?.[0]?.id
          if (!exId || !ex.sets) continue

          for (const set of ex.sets) {
            await dbWrite('workout_sets', 'insert', {
              exercise_id:    exId,
              session_id:     sessionId,
              set_number:     set.set,
              weight_lbs:     set.weight_lbs || null,
              reps_completed: set.reps || null,
            })
          }
        }
        return { success: true, sessionId }
      }

      case 'log_cardio':
        return await dbWrite('cardio_sessions', 'insert', {
          date:            data.date || new Date().toISOString().split('T')[0],
          activity:        data.activity || 'cardio',
          duration_min:    data.duration_min || null,
          distance_miles:  data.distance_miles || null,
          pace_min_mile:   data.pace_min_mile || null,
          avg_heart_rate:  data.avg_heart_rate || null,
          max_heart_rate:  data.max_heart_rate || null,
          calories_burned: data.calories_burned || null,
          notes:           data.notes || '',
        })

      case 'log_sleep':
        return await dbWrite('sleep_logs', 'insert', {
          date:         data.date || new Date().toISOString().split('T')[0],
          duration_hrs: data.duration_hours || null,
          quality:      data.quality || null,
          notes:        data.notes || '',
        })

      case 'log_nutrition':
        return await dbWrite('nutrition', 'insert', {
          date:       data.date || new Date().toISOString().split('T')[0],
          meal:       data.meal || 'meal',
          description: data.description || '',
          calories:   data.calories || null,
          protein_g:  data.protein_g || data.protein || null,
          carbs_g:    data.carbs_g || null,
          fat_g:      data.fat_g || null,
          sodium_mg:  data.sodium_mg || null,
          notes:      data.notes || '',
        })

      case 'log_body_stats':
        return await dbWrite('body_stats', 'insert', {
          date:         data.date || new Date().toISOString().split('T')[0],
          weight_lbs:   data.weight_lbs || null,
          body_fat_pct: data.body_fat_pct || null,
          notes:        data.notes || '',
        })

      case 'log_peptide_cycle':
        return await dbWrite('peptide_cycles', 'insert', {
          stack_name:   data.stack_name,
          start_date:   data.start_date || new Date().toISOString().split('T')[0],
          cycle_days:   data.cycle_days || null,
          dose_details: data.dose_details || '',
          status:       data.status || 'active',
          notes:        data.notes || '',
        })

      case 'suggest_exercises':
      case 'exercise_info':
        // These don't write to DB — they're handled by rendering in the chat
        return { success: true, display_only: true, exercises: data.exercises || data }

      default:
        console.warn('Unknown action:', action)
        return null
    }
  } catch (err) {
    console.error('Action failed:', action, err)
    return { success: false, error: err.message }
  }
}

// ── Action confirmation card ─────────────────────────────────────────────────
function ActionCard({ action, data, result }) {
  const isError   = result && !result.success && !result.display_only
  const isDisplay = result?.display_only

  const labels = {
    log_workout:       { icon: '💪', label: 'Workout logged' },
    log_sets:          { icon: '💪', label: 'Sets logged' },
    log_cardio:        { icon: '♡',  label: 'Cardio logged' },
    log_sleep:         { icon: '◎',  label: 'Sleep logged' },
    log_nutrition:     { icon: '🥗', label: 'Meal logged' },
    log_body_stats:    { icon: '◉',  label: 'Body stats logged' },
    log_peptide_cycle: { icon: '💉', label: 'Peptide cycle logged' },
    suggest_exercises: { icon: '⚡', label: 'Exercise suggestions' },
    exercise_info:     { icon: '📋', label: 'Exercise info' },
  }

  const meta = labels[action] || { icon: '✓', label: action }

  if (isDisplay && action === 'suggest_exercises' && data?.exercises) {
    return (
      <div style={ac.wrap}>
        <div style={ac.header}>
          <span style={ac.icon}>{meta.icon}</span>
          <span style={ac.label}>NOMIS Suggestions</span>
        </div>
        <div style={ac.exGrid}>
          {data.exercises.map((ex, i) => (
            <div key={i} style={ac.exCard}>
              <div style={ac.exName}>{ex.name}</div>
              <div style={ac.exMeta}>{ex.sets}×{ex.reps} · {ex.muscle_group}</div>
              {ex.notes && <div style={ac.exNote}>{ex.notes}</div>}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Summary lines for logged data
  const summaryLines = []
  if (data) {
    if (data.date)           summaryLines.push(`Date: ${data.date}`)
    if (data.muscle_group)   summaryLines.push(`Muscle: ${data.muscle_group}`)
    if (data.title)          summaryLines.push(data.title)
    if (data.duration_hours) summaryLines.push(`${data.duration_hours}h sleep`)
    if (data.quality)        summaryLines.push(`Quality: ${data.quality}`)
    if (data.duration_min)   summaryLines.push(`${data.duration_min} min`)
    if (data.distance_miles) summaryLines.push(`${data.distance_miles} mi`)
    if (data.calories)       summaryLines.push(`${data.calories} kcal`)
    if (data.protein_g || data.protein) summaryLines.push(`${data.protein_g || data.protein}g protein`)
    if (data.weight_lbs)     summaryLines.push(`${data.weight_lbs} lbs`)
    if (data.stack_name)     summaryLines.push(data.stack_name)
    if (data.exercises)      summaryLines.push(`${data.exercises.length} exercise${data.exercises.length !== 1 ? 's' : ''}`)
  }

  return (
    <div style={{ ...ac.wrap, borderColor: isError ? 'rgba(239,68,68,0.2)' : 'rgba(34,212,138,0.2)', background: isError ? 'rgba(239,68,68,0.04)' : 'rgba(34,212,138,0.04)' }}>
      <div style={ac.header}>
        <span style={ac.icon}>{isError ? '✗' : meta.icon}</span>
        <span style={{ ...ac.label, color: isError ? 'var(--red)' : 'var(--green)' }}>
          {isError ? `Failed to log — ${result.error}` : `✓ ${meta.label}`}
        </span>
      </div>
      {summaryLines.length > 0 && (
        <div style={ac.summary}>
          {summaryLines.join(' · ')}
        </div>
      )}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export default function NomisChat({ pageContext = '' }) {
  const [open, setOpen]         = useState(false)
  const [input, setInput]       = useState('')
  const [messages, setMessages] = useState([]) // { role, content, action_card? }
  const [history, setHistory]   = useState([]) // clean history for API
  const [loading, setLoading]   = useState(false)
  const [context, setContext]   = useState('')
  const [ctxLoaded, setCtxLoaded] = useState(false)
  const endRef                  = useRef(null)
  const inputRef                = useRef(null)

  useEffect(() => {
    buildContext().then(ctx => { setContext(ctx); setCtxLoaded(true) })
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  async function send() {
    if (!input.trim() || loading) return
    const msg = input.trim()
    setInput('')
    setLoading(true)

    // Add user message to display
    setMessages(prev => [...prev, { role: 'user', content: msg }])

    // Build full message with context
    const fullMessage = [
      context,
      pageContext ? `Current page: ${pageContext}` : '',
      `User: ${msg}`
    ].filter(Boolean).join('\n\n')

    try {
      const res = await chat(fullMessage, history)

      if (res.response) {
        // Update clean history for next API call
        setHistory(prev => [
          ...prev,
          { role: 'user', content: msg },
          { role: 'assistant', content: res.response }
        ])

        // Handle parsed_data action
        let actionCard = null
        if (res.parsed_data?.action) {
          const result = await executeAction(res.parsed_data)
          actionCard = {
            action: res.parsed_data.action,
            data:   res.parsed_data.data,
            result,
          }
        }

        setMessages(prev => [...prev, {
          role: 'assistant',
          content: res.response,
          action_card: actionCard,
        }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Try again.' }])
    }
    setLoading(false)
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div style={s.wrap}>
      {open && (
        <div style={s.panel} className="animate-fadeIn">
          {/* Header */}
          <div style={s.panelHeader}>
            <div style={s.panelTitle}>
              <div style={s.panelOrb}>N</div>
              <div>
                <div style={s.panelName}>NOMIS</div>
                <div style={s.panelStatus}>
                  {ctxLoaded ? '● Context loaded · 30 days' : '○ Loading context...'}
                </div>
              </div>
            </div>
            <button style={s.closeBtn} onClick={() => setOpen(false)}>✕</button>
          </div>

          {/* Messages */}
          <div style={s.messages}>
            {messages.length === 0 && (
              <div style={s.welcome}>
                <div style={s.welcomeOrb}>N</div>
                <div style={s.welcomeTitle}>Hey Simon.</div>
                <div style={s.welcomeText}>
                  I know your last 30 days. Just talk to me — tell me what you ate, how you slept, what you lifted. I'll log it automatically.
                </div>
                <div style={s.examples}>
                  {[
                    'Bench 185x5x4, incline 70x10x3',
                    'Slept 7.5 hours, felt good',
                    'Walked 2 miles this morning',
                    'Had chicken and rice for lunch, ~500 cal',
                  ].map((ex, i) => (
                    <div key={i} style={s.exampleChip} onClick={() => { setInput(ex); inputRef.current?.focus() }}>
                      {ex}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '100%' }}>
                {msg.role === 'assistant' && <div style={s.msgLabel}>NOMIS</div>}
                <div style={msg.role === 'user' ? s.msgUser : s.msgNomis}>
                  {msg.content}
                </div>
                {msg.action_card && (
                  <ActionCard
                    action={msg.action_card.action}
                    data={msg.action_card.data}
                    result={msg.action_card.result}
                  />
                )}
              </div>
            ))}

            {loading && (
              <div style={{ alignSelf: 'flex-start', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={s.msgLabel}>NOMIS</div>
                <div style={s.typing}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ ...s.dot, animationDelay: `${i * 0.15}s` }} className="animate-pulse" />
                  ))}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div style={s.inputRow}>
            <input
              ref={inputRef}
              style={s.chatInput}
              placeholder="Tell me what you did today..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
            />
            <button style={s.sendBtn} onClick={send} disabled={loading}>→</button>
          </div>
        </div>
      )}

      {/* Orb button */}
      <div style={s.orb} onClick={() => setOpen(o => !o)}>
        {open ? '✕' : 'N'}
      </div>
    </div>
  )
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = {
  wrap: { position:'fixed', bottom:'calc(var(--nav-h, 64px) + 16px)', right:'16px', zIndex:200, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'10px' },
  orb: { width:'52px', height:'52px', borderRadius:'16px', background:'radial-gradient(circle at 35% 35%, rgba(34,212,138,0.45), rgba(34,212,138,0.06))', border:'1px solid rgba(34,212,138,0.4)', color:'var(--green)', fontFamily:'var(--font-display)', fontSize:'1.2rem', fontWeight:'700', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', letterSpacing:'0.05em', transition:'box-shadow 0.2s', boxShadow:'0 4px 20px rgba(34,212,138,0.15)' },
  panel: { width:'360px', height:'520px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'18px', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,0.5)' },
  panelHeader: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', borderBottom:'1px solid var(--border)', flexShrink:0 },
  panelTitle: { display:'flex', alignItems:'center', gap:'10px' },
  panelOrb: { width:'32px', height:'32px', borderRadius:'10px', background:'radial-gradient(circle at 35% 35%, rgba(34,212,138,0.4), rgba(34,212,138,0.05))', border:'1px solid rgba(34,212,138,0.35)', color:'var(--green)', fontFamily:'var(--font-display)', fontSize:'0.85rem', fontWeight:'700', display:'flex', alignItems:'center', justifyContent:'center' },
  panelName: { fontFamily:'var(--font-display)', fontSize:'0.9rem', fontWeight:'700', color:'#fff', letterSpacing:'0.1em' },
  panelStatus: { fontFamily:'var(--font-mono)', fontSize:'0.44rem', color:'var(--green)', letterSpacing:'0.1em', opacity:0.8 },
  closeBtn: { background:'transparent', border:'none', color:'var(--text3)', fontSize:'0.85rem', cursor:'pointer', padding:'4px 6px' },
  messages: { flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:'12px' },
  welcome: { display:'flex', flexDirection:'column', alignItems:'center', gap:'10px', textAlign:'center', padding:'12px 4px' },
  welcomeOrb: { width:'48px', height:'48px', borderRadius:'15px', background:'radial-gradient(circle at 35% 35%, rgba(34,212,138,0.4), rgba(34,212,138,0.05))', border:'1px solid rgba(34,212,138,0.3)', color:'var(--green)', fontFamily:'var(--font-display)', fontSize:'1.3rem', fontWeight:'700', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'4px' },
  welcomeTitle: { fontFamily:'var(--font-display)', fontSize:'1.1rem', fontWeight:'600', color:'#fff', letterSpacing:'0.05em' },
  welcomeText: { fontFamily:'var(--font-mono)', fontSize:'0.58rem', color:'var(--text3)', lineHeight:'1.7', letterSpacing:'0.03em' },
  examples: { display:'flex', flexDirection:'column', gap:'5px', width:'100%', marginTop:'4px' },
  exampleChip: { padding:'8px 12px', background:'rgba(255,255,255,0.03)', border:'1px solid var(--border)', borderRadius:'8px', fontFamily:'var(--font-display)', fontSize:'0.75rem', color:'var(--text3)', cursor:'pointer', textAlign:'left', transition:'all 0.15s' },
  msgLabel: { fontFamily:'var(--font-mono)', fontSize:'0.44rem', color:'var(--green)', letterSpacing:'0.15em', opacity:0.7 },
  msgNomis: { background:'rgba(34,212,138,0.04)', border:'1px solid rgba(34,212,138,0.1)', borderRadius:'12px', borderTopLeftRadius:'3px', padding:'10px 14px', fontFamily:'var(--font-display)', fontSize:'0.85rem', color:'var(--text)', lineHeight:'1.6', alignSelf:'flex-start', maxWidth:'90%' },
  msgUser: { alignSelf:'flex-end', maxWidth:'85%', background:'rgba(255,255,255,0.04)', border:'1px solid var(--border)', borderRadius:'12px', borderTopRightRadius:'3px', padding:'10px 14px', fontFamily:'var(--font-display)', fontSize:'0.85rem', color:'var(--text2)', lineHeight:'1.5' },
  typing: { background:'rgba(34,212,138,0.04)', border:'1px solid rgba(34,212,138,0.1)', borderRadius:'12px', borderTopLeftRadius:'3px', padding:'12px 16px', display:'flex', gap:'4px', alignItems:'center' },
  dot: { width:'6px', height:'6px', borderRadius:'50%', background:'var(--green)', opacity:0.6 },
  inputRow: { display:'flex', gap:'8px', padding:'12px 14px 14px', borderTop:'1px solid var(--border)', flexShrink:0 },
  chatInput: { flex:1, background:'rgba(255,255,255,0.03)', border:'1px solid var(--border2)', borderRadius:'10px', padding:'11px 14px', color:'var(--text)', fontFamily:'var(--font-display)', fontSize:'0.88rem', outline:'none', transition:'border-color 0.15s' },
  sendBtn: { width:'40px', height:'40px', borderRadius:'10px', background:'var(--green-dim)', border:'1px solid var(--green-glow)', color:'var(--green)', fontSize:'1.3rem', cursor:'pointer', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.15s', fontFamily:'var(--font-display)', fontWeight:'700' },
}

const ac = {
  wrap: { borderRadius:'10px', border:'1px solid rgba(34,212,138,0.2)', background:'rgba(34,212,138,0.04)', padding:'10px 12px', display:'flex', flexDirection:'column', gap:'6px', alignSelf:'flex-start', maxWidth:'90%' },
  header: { display:'flex', alignItems:'center', gap:'7px' },
  icon: { fontSize:'0.85rem' },
  label: { fontFamily:'var(--font-mono)', fontSize:'0.52rem', color:'var(--green)', letterSpacing:'0.1em', fontWeight:'500' },
  summary: { fontFamily:'var(--font-mono)', fontSize:'0.5rem', color:'var(--text3)', letterSpacing:'0.04em', lineHeight:1.5 },
  exGrid: { display:'flex', flexDirection:'column', gap:'5px', marginTop:'2px' },
  exCard: { background:'rgba(255,255,255,0.03)', borderRadius:'7px', padding:'8px 10px' },
  exName: { fontFamily:'var(--font-display)', fontSize:'0.82rem', fontWeight:'600', color:'var(--text)', marginBottom:'2px' },
  exMeta: { fontFamily:'var(--font-mono)', fontSize:'0.45rem', color:'var(--text3)', letterSpacing:'0.06em' },
  exNote: { fontFamily:'var(--font-display)', fontSize:'0.72rem', color:'var(--text3)', marginTop:'3px', lineHeight:1.4 },
}