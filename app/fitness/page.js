'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { getTodaysWorkout, startWorkout, saveSets, checkAndSavePR, chat } from '../../lib/api'

const MUSCLE_COLORS = {
  chest:     '#22d48a',
  shoulders: '#22d48a',
  triceps:   '#22d48a',
  back:      '#00e5ff',
  biceps:    '#00e5ff',
  legs:      '#a78bfa',
  core:      '#f59e0b',
  cardio:    '#f87171',
}

function BodyModel({ muscleGroup }) {
  const mg = (muscleGroup || '').toLowerCase()
  const color = (group) => {
    for (const [key, val] of Object.entries(MUSCLE_COLORS)) {
      if (mg.includes(key)) return mg.includes(group) ? val : 'rgba(255,255,255,0.04)'
    }
    return 'rgba(255,255,255,0.04)'
  }

  const isChest     = mg.includes('chest')
  const isShoulders = mg.includes('shoulder')
  const isTriceps   = mg.includes('tricep')
  const isBack      = mg.includes('back')
  const isBiceps    = mg.includes('bicep')
  const isLegs      = mg.includes('leg') || mg.includes('quad') || mg.includes('hamstring')
  const isCore      = mg.includes('core') || mg.includes('ab')

  const highlight = (active, key) => active
    ? { fill: MUSCLE_COLORS[key], filter: `drop-shadow(0 0 6px ${MUSCLE_COLORS[key]})`, opacity: 0.9 }
    : { fill: 'rgba(255,255,255,0.05)', opacity: 0.6 }

  return (
    <svg viewBox="0 0 100 220" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxHeight: '240px' }}>
      {/* Head */}
      <ellipse cx="50" cy="18" rx="12" ry="14" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" fill="rgba(255,255,255,0.03)" />
      {/* Neck */}
      <rect x="45" y="31" width="10" height="7" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
      {/* Shoulders */}
      <ellipse cx="24" cy="44" rx="10" ry="7" {...highlight(isShoulders, 'shoulders')} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
      <ellipse cx="76" cy="44" rx="10" ry="7" {...highlight(isShoulders, 'shoulders')} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
      {/* Chest */}
      <path d="M34 38 L50 43 L50 62 L34 57 Z" {...highlight(isChest, 'chest')} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
      <path d="M66 38 L50 43 L50 62 L66 57 Z" {...highlight(isChest, 'chest')} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
      {/* Upper arms */}
      <path d="M15 42 L12 72" stroke={isBack || isBiceps ? MUSCLE_COLORS['back'] : 'rgba(255,255,255,0.08)'} strokeWidth="7" strokeLinecap="round" opacity="0.7" />
      <path d="M85 42 L88 72" stroke={isBack || isBiceps ? MUSCLE_COLORS['back'] : 'rgba(255,255,255,0.08)'} strokeWidth="7" strokeLinecap="round" opacity="0.7" />
      {/* Triceps overlay */}
      <path d="M13 48 L11 68" stroke={isTriceps ? MUSCLE_COLORS['triceps'] : 'transparent'} strokeWidth="3" strokeLinecap="round" opacity="0.9" style={isTriceps ? { filter: `drop-shadow(0 0 4px ${MUSCLE_COLORS['triceps']})` } : {}} />
      <path d="M87 48 L89 68" stroke={isTriceps ? MUSCLE_COLORS['triceps'] : 'transparent'} strokeWidth="3" strokeLinecap="round" opacity="0.9" style={isTriceps ? { filter: `drop-shadow(0 0 4px ${MUSCLE_COLORS['triceps']})` } : {}} />
      {/* Biceps overlay */}
      <path d="M16 44 L13 64" stroke={isBiceps ? MUSCLE_COLORS['biceps'] : 'transparent'} strokeWidth="3" strokeLinecap="round" opacity="0.9" style={isBiceps ? { filter: `drop-shadow(0 0 4px ${MUSCLE_COLORS['biceps']})` } : {}} />
      <path d="M84 44 L87 64" stroke={isBiceps ? MUSCLE_COLORS['biceps'] : 'transparent'} strokeWidth="3" strokeLinecap="round" opacity="0.9" />
      {/* Forearms */}
      <path d="M12 72 L14 100" stroke="rgba(255,255,255,0.06)" strokeWidth="5" strokeLinecap="round" />
      <path d="M88 72 L86 100" stroke="rgba(255,255,255,0.06)" strokeWidth="5" strokeLinecap="round" />
      {/* Torso */}
      <path d="M34 38 L66 38 L70 100 L30 100 Z" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
      {/* Back */}
      <path d="M34 38 L66 38 L70 100 L30 100 Z" {...highlight(isBack, 'back')} opacity={isBack ? 0.3 : 0} />
      {/* Abs */}
      <path d="M38 64 L62 64 L60 100 L40 100 Z" {...highlight(isCore, 'core')} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
      <line x1="40" y1="72" x2="60" y2="72" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
      <line x1="40" y1="82" x2="60" y2="82" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
      <line x1="50" y1="64" x2="50" y2="100" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
      {/* Quads */}
      <path d="M30 100 L26 160 L44 160 L46 100 Z" {...highlight(isLegs, 'legs')} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
      <path d="M70 100 L74 160 L56 160 L54 100 Z" {...highlight(isLegs, 'legs')} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
      {/* Shins */}
      <path d="M26 160 L28 195 L44 195 L44 160 Z" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
      <path d="M74 160 L72 195 L56 195 L56 160 Z" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
      {/* Label */}
      <text x="50" y="215" textAnchor="middle" fill="rgba(255,255,255,0.15)" fontFamily="monospace" fontSize="4.5" letterSpacing="2">ANTERIOR</text>
    </svg>
  )
}

export default function Fitness() {
  const [workout, setWorkout]               = useState(null)
  const [exercises, setExercises]           = useState([])
  const [activeExercise, setActiveExercise] = useState(null)
  const [sets, setSets]                     = useState({})
  const [loading, setLoading]               = useState(true)
  const [workoutId, setWorkoutId]           = useState(null)
  const [saving, setSaving]                 = useState(false)
  const [newPR, setNewPR]                   = useState(null)
  const [chatOpen, setChatOpen]             = useState(false)
  const [chatInput, setChatInput]           = useState('')
  const [chatHistory, setChatHistory]       = useState([])
  const [chatLoading, setChatLoading]       = useState(false)
  const chatEndRef                          = useRef(null)

  useEffect(() => {
    async function load() {
      const data = await getTodaysWorkout()
      if (data) {
        setWorkout(data)
        setExercises(data.exercises)
        const session = await startWorkout(data)
        if (session) setWorkoutId(session.id)
      }
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  function openExercise(ex) {
    setActiveExercise(ex)
    if (!sets[ex.id]) {
      setSets(prev => ({
        ...prev,
        [ex.id]: Array.from({ length: ex.sets }, (_, i) => ({ set: i + 1, reps: '', weight: '' }))
      }))
    }
  }

  function updateSet(exId, idx, field, val) {
    setSets(prev => ({
      ...prev,
      [exId]: prev[exId].map((s, i) => i === idx ? { ...s, [field]: val } : s)
    }))
  }

  async function completeExercise() {
    if (!activeExercise) return
    setSaving(true)
    const setData = sets[activeExercise.id] || []
    if (workoutId) {
      await saveSets(workoutId, activeExercise, setData)
      const pr = await checkAndSavePR(activeExercise, setData)
      if (pr) setNewPR({ exercise: activeExercise.name, weight: pr })
    }
    setExercises(prev => prev.map(ex => ex.id === activeExercise.id ? { ...ex, done: true } : ex))
    setActiveExercise(null)
    setSaving(false)
  }

async function sendChat() {
  if (!chatInput.trim() || chatLoading) return
  const msg = chatInput.trim()
  setChatInput('')
  setChatLoading(true)
  const userMsg = { role: 'user', content: msg }
  setChatHistory(prev => [...prev, userMsg])

  // Build context about current workout
  const context = workout ? `
Current workout context:
- Day: ${workout.day} (${workout.program})
- Muscle group: ${workout.muscle_group}
- Exercises: ${exercises.map(e => `${e.name} (${e.sets} sets x ${e.reps} reps) — ${e.done ? 'DONE' : 'pending'}`).join(', ')}
- Progress: ${completed}/${exercises.length} exercises complete
- Active exercise: ${activeExercise ? activeExercise.name : 'none selected'}

User message: ${msg}` : msg

  try {
    const res = await chat(context, chatHistory)
    if (res.response) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: res.response }])
    }
  } catch (e) {
    setChatHistory(prev => [...prev, { role: 'assistant', content: 'Connection error. Try again.' }])
  }
  setChatLoading(false)
}

  const completed = exercises.filter(e => e.done).length
  const pct = exercises.length ? Math.round((completed / exercises.length) * 100) : 0

  if (loading) return (
    <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={s.loadingText}>Loading workout...</div>
    </div>
  )

  if (!workout) return (
    <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={s.loadingText}>No workout scheduled for today.</div>
    </div>
  )

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        input::placeholder { color: #2a2a40; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(34,212,138,0.2); border-radius: 2px; }
        .ex-row:hover { background: rgba(255,255,255,0.02) !important; padding-left: 8px !important; }
        .chat-send:hover { background: rgba(34,212,138,0.2) !important; }
        .log-btn:hover { background: rgba(34,212,138,0.18) !important; }
      `}</style>

      {/* PR Toast */}
      {newPR && (
        <div style={s.prToast} onClick={() => setNewPR(null)}>
          🏆 NEW PR — {newPR.exercise}: {newPR.weight} lbs
          <span style={{ marginLeft: '12px', opacity: 0.5, fontSize: '0.7rem' }}>tap to dismiss</span>
        </div>
      )}

      {/* Header */}
      <header style={s.header}>
        <Link href="/" style={s.backBtn}>← BACK</Link>
        <div style={s.headerCenter}>
          <div style={s.headerTitle}>FITNESS</div>
          <div style={s.headerSub}>{workout.day} · {workout.program}</div>
        </div>
        <div style={s.headerStats}>
          <div style={s.statPill}>
            <span style={s.statVal}>{completed}/{exercises.length}</span>
            <span style={s.statLabel}>DONE</span>
          </div>
          <div style={s.statPill}>
            <span style={{ ...s.statVal, color: pct === 100 ? '#22d48a' : '#e8e8f0' }}>{pct}%</span>
            <span style={s.statLabel}>COMPLETE</span>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div style={s.progressBar}>
        <div style={{ ...s.progressFill, width: `${pct}%` }} />
      </div>

      {/* Main content */}
      <div style={s.body}>

        {/* Left — exercise list */}
        <div style={s.leftCol}>
          <div style={s.colLabel}>// TODAY — {workout.day?.toUpperCase()}</div>
          <div style={s.muscleTag}>{workout.muscle_group?.toUpperCase()}</div>
          <div style={s.exList}>
            {exercises.map(ex => (
              <div
                key={ex.id}
                className="ex-row"
                onClick={() => openExercise(ex)}
                style={{
                  ...s.exRow,
                  ...(ex.done ? s.exRowDone : {}),
                  ...(activeExercise?.id === ex.id ? s.exRowActive : {}),
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{ ...s.check, ...(ex.done ? s.checkDone : {}) }}
                  onClick={e => { e.stopPropagation() }}
                >
                  {ex.done ? '✓' : ''}
                </div>
                <div style={s.exTextWrap}>
                  <div style={s.exName}>{ex.name}</div>
                  <div style={s.exMeta}>{ex.sets} sets · {ex.reps} reps · {ex.equipment}</div>
                </div>
                <div style={s.exChevron}>›</div>
              </div>
            ))}
          </div>
        </div>

        {/* Middle — set logger */}
        <div style={s.midCol}>
          {activeExercise ? (
            <>
              <div style={s.colLabel}>{activeExercise.name.toUpperCase()}</div>
              <div style={s.exMetaLarge}>{activeExercise.sets} sets · {activeExercise.reps} reps</div>
              {activeExercise.notes && (
                <div style={s.coachNote}>💡 {activeExercise.notes}</div>
              )}
              <div style={s.setGrid}>
                <div style={s.setGridHeader}>
                  <span>SET</span><span>WEIGHT</span><span>REPS</span>
                </div>
                {(sets[activeExercise.id] || []).map((s_, i) => (
                  <div key={i} style={s.setRow}>
                    <span style={s.setNum}>{s_.set}</span>
                    <input
                      style={s.setInput}
                      type="number"
                      placeholder="lbs"
                      value={s_.weight}
                      onChange={e => updateSet(activeExercise.id, i, 'weight', e.target.value)}
                    />
                    <input
                      style={s.setInput}
                      type="number"
                      placeholder="reps"
                      value={s_.reps}
                      onChange={e => updateSet(activeExercise.id, i, 'reps', e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <button
                className="log-btn"
                style={{ ...s.logBtn, opacity: saving ? 0.5 : 1 }}
                onClick={completeExercise}
                disabled={saving}
              >
                {saving ? 'SAVING...' : 'MARK COMPLETE'}
              </button>
            </>
          ) : (
            <div style={s.emptyLogger}>
              <div style={s.emptyIcon}>←</div>
              <div style={s.emptyText}>Select an exercise</div>
              <div style={s.emptySubtext}>to log your sets</div>
            </div>
          )}
        </div>

        {/* Right — body model */}
        <div style={s.rightCol}>
          <div style={s.colLabel}>// MUSCLE MAP</div>
          <div style={s.bodyModelWrap}>
            <BodyModel muscleGroup={activeExercise?.muscle_group || workout.muscle_group} />
          </div>
          <div style={s.muscleLabel}>
            {(activeExercise?.muscle_group || workout.muscle_group || '').toUpperCase()}
          </div>
        </div>

      </div>

      {/* NOMIS Chat Bar */}
      <div style={s.chatBarWrap}>
        {chatOpen && (
          <div style={s.chatPanel}>
            <div style={s.chatMessages}>
              {chatHistory.length === 0 && (
                <div style={s.chatEmpty}>Ask NOMIS anything about your workout...</div>
              )}
              {chatHistory.map((msg, i) => (
                <div key={i} style={msg.role === 'user' ? s.chatMsgUser : s.chatMsgNomis}>
                  {msg.content}
                </div>
              ))}
              {chatLoading && <div style={s.chatMsgNomis}>...</div>}
              <div ref={chatEndRef} />
            </div>
          </div>
        )}
        <div style={s.chatBar}>
          <button style={s.orbBtn} onClick={() => setChatOpen(o => !o)}>N</button>
          <input
            style={s.chatInput}
            placeholder="Ask NOMIS... 'How many sets left?' or 'Log bench 185 x 5'"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendChat()}
            onFocus={() => setChatOpen(true)}
          />
          <button className="chat-send" style={s.chatSend} onClick={sendChat}>→</button>
        </div>
      </div>

    </div>
  )
}

const s = {
  page: {
    minHeight: '100vh',
    background: '#060910',
    fontFamily: "'Rajdhani', sans-serif",
    paddingBottom: '100px',
  },
  loadingText: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.8rem',
    color: '#333350',
    letterSpacing: '0.1em',
  },
  prToast: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    background: 'rgba(34,212,138,0.12)',
    border: '1px solid rgba(34,212,138,0.3)',
    borderRadius: '12px',
    padding: '14px 20px',
    fontSize: '0.78rem',
    fontWeight: '700',
    color: '#22d48a',
    letterSpacing: '0.08em',
    cursor: 'pointer',
    zIndex: 200,
    backdropFilter: 'blur(10px)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '24px 40px 20px',
    gap: '20px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  backBtn: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.65rem',
    color: '#333350',
    textDecoration: 'none',
    letterSpacing: '0.1em',
    flexShrink: 0,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    letterSpacing: '0.2em',
    color: '#ffffff',
    lineHeight: 1,
  },
  headerSub: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.6rem',
    color: '#333350',
    letterSpacing: '0.1em',
    marginTop: '3px',
  },
  headerStats: {
    display: 'flex',
    gap: '12px',
  },
  statPill: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '8px',
  },
  statVal: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.9rem',
    color: '#e8e8f0',
    fontWeight: '500',
    lineHeight: 1,
  },
  statLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.45rem',
    color: '#333350',
    letterSpacing: '0.12em',
  },
  progressBar: {
    height: '2px',
    background: 'rgba(255,255,255,0.04)',
  },
  progressFill: {
    height: '100%',
    background: '#22d48a',
    transition: 'width 0.5s ease',
    boxShadow: '0 0 8px rgba(34,212,138,0.6)',
  },
  body: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 280px',
    gap: '0',
    minHeight: 'calc(100vh - 160px)',
  },
  leftCol: {
    padding: '28px 32px',
    borderRight: '1px solid rgba(255,255,255,0.04)',
  },
  midCol: {
    padding: '28px 32px',
    borderRight: '1px solid rgba(255,255,255,0.04)',
  },
  rightCol: {
    padding: '28px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  colLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.55rem',
    color: '#333350',
    letterSpacing: '0.15em',
    marginBottom: '6px',
  },
  muscleTag: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.65rem',
    color: '#22d48a',
    letterSpacing: '0.1em',
    marginBottom: '20px',
  },
  exList: {
    display: 'flex',
    flexDirection: 'column',
  },
  exRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    paddingTop: '13px',
    paddingBottom: '13px',
    paddingLeft: '0',
    paddingRight: '4px',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    cursor: 'pointer',
    borderRadius: '4px',
  },
  exRowDone: {
    opacity: 0.35,
  },
  exRowActive: {
    paddingLeft: '8px',
  },
  check: {
    width: '18px',
    height: '18px',
    borderRadius: '4px',
    border: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.65rem',
    flexShrink: 0,
    color: '#22d48a',
  },
  checkDone: {
    background: 'rgba(34,212,138,0.08)',
    borderColor: 'rgba(34,212,138,0.4)',
  },
  exTextWrap: {
    flex: 1,
  },
  exName: {
    fontSize: '0.88rem',
    fontWeight: '600',
    color: '#d0d0e8',
    marginBottom: '2px',
    letterSpacing: '0.02em',
  },
  exMeta: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.55rem',
    color: '#2a2a40',
    letterSpacing: '0.05em',
  },
  exChevron: {
    fontSize: '1.1rem',
    color: '#222235',
  },
  exMetaLarge: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.65rem',
    color: '#444460',
    letterSpacing: '0.08em',
    marginBottom: '16px',
  },
  coachNote: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.65rem',
    color: '#444460',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '8px',
    padding: '10px 14px',
    marginBottom: '20px',
    lineHeight: '1.6',
  },
  setGrid: {
    marginBottom: '20px',
  },
  setGridHeader: {
    display: 'grid',
    gridTemplateColumns: '36px 1fr 1fr',
    gap: '10px',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.5rem',
    color: '#2a2a40',
    letterSpacing: '0.12em',
    marginBottom: '10px',
    paddingBottom: '8px',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
  },
  setRow: {
    display: 'grid',
    gridTemplateColumns: '36px 1fr 1fr',
    gap: '10px',
    marginBottom: '8px',
    alignItems: 'center',
  },
  setNum: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.75rem',
    color: '#333350',
    fontWeight: '500',
  },
  setInput: {
    background: '#0a0f18',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '8px',
    padding: '10px 12px',
    color: '#e8e8f0',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.88rem',
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.15s',
  },
  logBtn: {
    width: '100%',
    padding: '13px',
    background: 'rgba(34,212,138,0.08)',
    border: '1px solid rgba(34,212,138,0.2)',
    borderRadius: '10px',
    color: '#22d48a',
    fontFamily: "'Rajdhani', sans-serif",
    fontSize: '0.85rem',
    fontWeight: '700',
    letterSpacing: '0.12em',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  emptyLogger: {
    height: '100%',
    minHeight: '300px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
  },
  emptyIcon: {
    fontSize: '1.5rem',
    color: '#1a1a28',
    marginBottom: '8px',
  },
  emptyText: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.7rem',
    color: '#222235',
    letterSpacing: '0.08em',
  },
  emptySubtext: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.6rem',
    color: '#1a1a28',
    letterSpacing: '0.08em',
  },
  bodyModelWrap: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    padding: '16px 0',
  },
  muscleLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.55rem',
    color: '#22d48a',
    letterSpacing: '0.15em',
    marginTop: '8px',
    textAlign: 'center',
  },
  chatBarWrap: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  chatPanel: {
    background: 'rgba(6,9,16,0.97)',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    maxHeight: '260px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  chatMessages: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  chatEmpty: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.65rem',
    color: '#222235',
    letterSpacing: '0.08em',
    textAlign: 'center',
    marginTop: '16px',
  },
  chatMsgNomis: {
    alignSelf: 'flex-start',
    background: 'rgba(34,212,138,0.05)',
    border: '1px solid rgba(34,212,138,0.1)',
    borderRadius: '10px',
    borderTopLeftRadius: '2px',
    padding: '10px 14px',
    fontSize: '0.82rem',
    color: '#c0c0d8',
    maxWidth: '80%',
    lineHeight: '1.5',
    fontFamily: "'Rajdhani', sans-serif",
  },
  chatMsgUser: {
    alignSelf: 'flex-end',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '10px',
    borderTopRightRadius: '2px',
    padding: '10px 14px',
    fontSize: '0.82rem',
    color: '#888899',
    maxWidth: '80%',
    lineHeight: '1.5',
    fontFamily: "'Rajdhani', sans-serif",
  },
  chatBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 20px 16px',
    background: 'rgba(6,9,16,0.98)',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    backdropFilter: 'blur(20px)',
  },
  orbBtn: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    background: 'radial-gradient(circle at 35% 35%, #22d48a, #0a6644)',
    boxShadow: '0 0 16px rgba(34,212,138,0.35)',
    border: 'none',
    color: '#060910',
    fontSize: '1rem',
    fontWeight: '800',
    fontFamily: "'Rajdhani', sans-serif",
    cursor: 'pointer',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatInput: {
    flex: 1,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '12px',
    padding: '12px 16px',
    color: '#e8e8f0',
    fontFamily: "'Rajdhani', sans-serif",
    fontSize: '0.88rem',
    outline: 'none',
  },
  chatSend: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    background: 'rgba(34,212,138,0.08)',
    border: '1px solid rgba(34,212,138,0.2)',
    color: '#22d48a',
    fontSize: '1.1rem',
    cursor: 'pointer',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.15s',
  },
}
