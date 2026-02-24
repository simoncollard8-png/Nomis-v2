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
  quads:     '#a78bfa',
  hamstring: '#a78bfa',
  core:      '#f59e0b',
  abs:       '#f59e0b',
}

function getColor(muscleGroup, key) {
  const mg = (muscleGroup || '').toLowerCase()
  return mg.includes(key) ? MUSCLE_COLORS[key] : 'rgba(255,255,255,0.04)'
}

function BodyModel({ muscleGroup }) {
  const mg = (muscleGroup || '').toLowerCase()
  const isChest     = mg.includes('chest')
  const isShoulder  = mg.includes('shoulder')
  const isTricep    = mg.includes('tricep')
  const isBack      = mg.includes('back')
  const isBicep     = mg.includes('bicep')
  const isLegs      = mg.includes('leg') || mg.includes('quad') || mg.includes('hamstring')
  const isCore      = mg.includes('core') || mg.includes('ab')

  const activeColor = isChest || isShoulder || isTricep ? '#22d48a'
    : isBack || isBicep ? '#00e5ff'
    : isLegs ? '#a78bfa'
    : isCore ? '#f59e0b'
    : '#22d48a'

  const glow = (active) => active ? `drop-shadow(0 0 5px ${activeColor})` : 'none'

  return (
    <svg viewBox="0 0 100 230" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', maxHeight: '260px', overflow: 'visible' }}>

      {/* Head */}
      <ellipse cx="50" cy="17" rx="11" ry="13"
        fill="rgba(255,255,255,0.03)"
        stroke="rgba(255,255,255,0.12)" strokeWidth="0.7" />

      {/* Neck */}
      <rect x="45.5" y="29" width="9" height="7"
        fill="rgba(255,255,255,0.03)"
        stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />

      {/* Left shoulder */}
      <ellipse cx="25" cy="43" rx="9" ry="6.5"
        fill={isShoulder ? activeColor : 'rgba(255,255,255,0.04)'}
        stroke="rgba(255,255,255,0.08)" strokeWidth="0.5"
        style={{ filter: glow(isShoulder), opacity: isShoulder ? 0.85 : 0.7 }} />

      {/* Right shoulder */}
      <ellipse cx="75" cy="43" rx="9" ry="6.5"
        fill={isShoulder ? activeColor : 'rgba(255,255,255,0.04)'}
        stroke="rgba(255,255,255,0.08)" strokeWidth="0.5"
        style={{ filter: glow(isShoulder), opacity: isShoulder ? 0.85 : 0.7 }} />

      {/* Left pec */}
      <path d="M34 37 L50 42 L50 61 L34 56 Z"
        fill={isChest ? activeColor : 'rgba(255,255,255,0.04)'}
        stroke="rgba(255,255,255,0.06)" strokeWidth="0.5"
        style={{ filter: glow(isChest), opacity: isChest ? 0.85 : 0.7 }} />

      {/* Right pec */}
      <path d="M66 37 L50 42 L50 61 L66 56 Z"
        fill={isChest ? activeColor : 'rgba(255,255,255,0.04)'}
        stroke="rgba(255,255,255,0.06)" strokeWidth="0.5"
        style={{ filter: glow(isChest), opacity: isChest ? 0.85 : 0.7 }} />

      {/* Left upper arm */}
      <path d="M16 41 L13 71" stroke="rgba(255,255,255,0.07)" strokeWidth="7" strokeLinecap="round" />

      {/* Right upper arm */}
      <path d="M84 41 L87 71" stroke="rgba(255,255,255,0.07)" strokeWidth="7" strokeLinecap="round" />

      {/* Bicep highlight */}
      {isBicep && <>
        <path d="M17 43 L14 67" stroke={activeColor} strokeWidth="4" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${activeColor})`, opacity: 0.9 }} />
        <path d="M83 43 L86 67" stroke={activeColor} strokeWidth="4" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${activeColor})`, opacity: 0.9 }} />
      </>}

      {/* Tricep highlight */}
      {isTricep && <>
        <path d="M14 47 L12 67" stroke={activeColor} strokeWidth="3" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${activeColor})`, opacity: 0.9 }} />
        <path d="M86 47 L88 67" stroke={activeColor} strokeWidth="3" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${activeColor})`, opacity: 0.9 }} />
      </>}

      {/* Forearms */}
      <path d="M13 71 L15 98" stroke="rgba(255,255,255,0.05)" strokeWidth="5" strokeLinecap="round" />
      <path d="M87 71 L85 98" stroke="rgba(255,255,255,0.05)" strokeWidth="5" strokeLinecap="round" />

      {/* Torso outline */}
      <path d="M34 37 L66 37 L70 100 L30 100 Z"
        fill={isBack ? `${activeColor}22` : 'rgba(255,255,255,0.015)'}
        stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />

      {/* Abs */}
      <path d="M38 62 L62 62 L60 100 L40 100 Z"
        fill={isCore ? activeColor : 'rgba(255,255,255,0.03)'}
        stroke="rgba(255,255,255,0.05)" strokeWidth="0.5"
        style={{ filter: glow(isCore), opacity: isCore ? 0.7 : 0.6 }} />
      <line x1="40" y1="72" x2="60" y2="72" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
      <line x1="40" y1="83" x2="60" y2="83" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
      <line x1="50" y1="62" x2="50" y2="100" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />

      {/* Left quad */}
      <path d="M30 100 L26 162 L44 162 L46 100 Z"
        fill={isLegs ? activeColor : 'rgba(255,255,255,0.04)'}
        stroke="rgba(255,255,255,0.06)" strokeWidth="0.5"
        style={{ filter: glow(isLegs), opacity: isLegs ? 0.8 : 0.6 }} />

      {/* Right quad */}
      <path d="M70 100 L74 162 L56 162 L54 100 Z"
        fill={isLegs ? activeColor : 'rgba(255,255,255,0.04)'}
        stroke="rgba(255,255,255,0.06)" strokeWidth="0.5"
        style={{ filter: glow(isLegs), opacity: isLegs ? 0.8 : 0.6 }} />

      {/* Left shin */}
      <path d="M26 162 L28 198 L44 198 L44 162 Z"
        fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />

      {/* Right shin */}
      <path d="M74 162 L72 198 L56 198 L56 162 Z"
        fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />

      {/* Label */}
      <text x="50" y="218" textAnchor="middle"
        fill="rgba(255,255,255,0.12)"
        fontFamily="monospace" fontSize="4" letterSpacing="2.5">ANTERIOR VIEW</text>

      {/* Active muscle label */}
      {muscleGroup && (
        <text x="50" y="228" textAnchor="middle"
          fill={activeColor}
          fontFamily="monospace" fontSize="3.5" letterSpacing="2"
          style={{ filter: `drop-shadow(0 0 4px ${activeColor})` }}>
          {muscleGroup.toUpperCase()}
        </text>
      )}
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
  const [view, setView]                     = useState('list') // 'list' | 'logger' | 'body'
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
    setView('logger')
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
    setView('list')
    setSaving(false)
  }

  async function sendChat() {
    if (!chatInput.trim() || chatLoading) return
    const msg = chatInput.trim()
    setChatInput('')
    setChatLoading(true)
    const userMsg = { role: 'user', content: msg }
    setChatHistory(prev => [...prev, userMsg])

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
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Connection error.' }])
    }
    setChatLoading(false)
  }

  const completed = exercises.filter(e => e.done).length
  const pct = exercises.length ? Math.round((completed / exercises.length) * 100) : 0

  if (loading) return (
    <div style={s.loadingScreen}>
      <div style={s.loadingOrb} className="animate-orb">N</div>
      <div style={s.loadingText}>Loading workout...</div>
    </div>
  )

  if (!workout) return (
    <div style={s.loadingScreen}>
      <div style={s.loadingOrb}>N</div>
      <div style={s.loadingText}>No workout scheduled for today.</div>
    </div>
  )

  return (
    <div style={s.page} className="safe-top">

      {/* PR Toast */}
      {newPR && (
        <div style={s.prToast} onClick={() => setNewPR(null)}>
          <span>🏆</span>
          <span>NEW PR — {newPR.exercise}: <strong>{newPR.weight} lbs</strong></span>
          <span style={{ opacity: 0.4, fontSize: '0.65rem' }}>✕</span>
        </div>
      )}

      {/* Header */}
      <header style={s.header} className="pwa-header">
        <Link href="/" style={s.backBtn}>
          <span style={s.backArrow}>‹</span>
          <span>BACK</span>
        </Link>

        <div style={s.headerCenter}>
          <div style={s.headerTitle}>FITNESS</div>
          <div style={s.headerSub}>{workout.day} · {workout.program}</div>
        </div>

        <div style={s.headerRight}>
          <div style={s.statBlock}>
            <span style={s.statNum}>{completed}/{exercises.length}</span>
            <span style={s.statLbl}>DONE</span>
          </div>
          <div style={{ ...s.statBlock, marginLeft: '10px' }}>
            <span style={{ ...s.statNum, color: pct === 100 ? 'var(--green)' : 'var(--text)' }}>{pct}%</span>
            <span style={s.statLbl}>COMP</span>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div style={s.progressTrack}>
        <div style={{ ...s.progressFill, width: `${pct}%` }} />
      </div>

      {/* Mobile nav tabs */}
      <div style={s.mobileTabs} className="mobile-only">
        {['list', 'logger', 'body'].map(tab => (
          <button
            key={tab}
            style={{ ...s.mobileTab, ...(view === tab ? s.mobileTabActive : {}) }}
            onClick={() => setView(tab)}
          >
            {tab === 'list' ? 'EXERCISES' : tab === 'logger' ? 'LOG SETS' : 'BODY MAP'}
          </button>
        ))}
      </div>

      {/* Desktop layout */}
      <div style={s.desktopBody} className="desktop-only">
        {/* Exercise list */}
        <div style={s.panel}>
          <ExerciseList
            exercises={exercises}
            activeExercise={activeExercise}
            workout={workout}
            onSelect={openExercise}
          />
        </div>

        {/* Set logger */}
        <div style={s.panel}>
          <SetLogger
            activeExercise={activeExercise}
            sets={sets}
            saving={saving}
            onUpdateSet={updateSet}
            onComplete={completeExercise}
          />
        </div>

        {/* Body model */}
        <div style={{ ...s.panel, alignItems: 'center' }}>
          <div style={s.panelLabel}>// MUSCLE MAP</div>
          <div style={s.bodyWrap}>
            <BodyModel muscleGroup={activeExercise?.muscle_group || workout.muscle_group} />
          </div>
        </div>
      </div>

      {/* Mobile layout - single panel view */}
      <div style={s.mobileBody} className="mobile-only">
        {view === 'list' && (
          <ExerciseList
            exercises={exercises}
            activeExercise={activeExercise}
            workout={workout}
            onSelect={openExercise}
          />
        )}
        {view === 'logger' && (
          <SetLogger
            activeExercise={activeExercise}
            sets={sets}
            saving={saving}
            onUpdateSet={updateSet}
            onComplete={completeExercise}
          />
        )}
        {view === 'body' && (
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={s.panelLabel}>// MUSCLE MAP</div>
            <div style={{ ...s.bodyWrap, maxWidth: '240px' }}>
              <BodyModel muscleGroup={activeExercise?.muscle_group || workout.muscle_group} />
            </div>
          </div>
        )}
      </div>

      {/* NOMIS Chat */}
      <div style={s.chatWrap} className="pwa-bottom safe-bottom">
        {chatOpen && (
          <div style={s.chatPanel}>
            <div style={s.chatMessages}>
              {chatHistory.length === 0 && (
                <div style={s.chatPlaceholder}>
                  Ask NOMIS anything about your workout...
                </div>
              )}
              {chatHistory.map((msg, i) => (
                <div key={i} style={msg.role === 'user' ? s.msgUser : s.msgNomis}>
                  {msg.role === 'assistant' && <span style={s.msgPrefix}>NOMIS</span>}
                  <div>{msg.content}</div>
                </div>
              ))}
              {chatLoading && (
                <div style={s.msgNomis}>
                  <span style={s.msgPrefix}>NOMIS</span>
                  <div style={s.typing}>
                    <span>●</span><span>●</span><span>●</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>
        )}

        <div style={s.chatBar}>
          <button
            style={s.orbBtn}
            className="orb-btn animate-orb"
            onClick={() => setChatOpen(o => !o)}
          >
            N
          </button>
          <input
            style={s.chatInput}
            placeholder="Ask NOMIS..."
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendChat()}
            onFocus={() => setChatOpen(true)}
          />
          <button
            style={s.sendBtn}
            className="btn-chat-send"
            onClick={sendChat}
          >
            ›
          </button>
        </div>
      </div>

      <style>{`
        @keyframes typingBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.3; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
        .typing span {
          display: inline-block;
          animation: typingBounce 1.2s infinite;
          margin: 0 1px;
          font-size: 0.5rem;
          color: var(--green);
        }
        .typing span:nth-child(2) { animation-delay: 0.2s; }
        .typing span:nth-child(3) { animation-delay: 0.4s; }
      `}</style>
    </div>
  )
}

function ExerciseList({ exercises, activeExercise, workout, onSelect }) {
  return (
    <div style={s.panelContent}>
      <div style={s.panelLabel}>// TODAY — {workout?.day?.toUpperCase()}</div>
      <div style={s.muscleTag}>{(workout?.muscle_group || '').toUpperCase()}</div>
      {exercises.map(ex => (
        <div
          key={ex.id}
          className="ex-row"
          onClick={() => onSelect(ex)}
          style={{
            ...s.exRow,
            ...(ex.done ? s.exRowDone : {}),
            ...(activeExercise?.id === ex.id ? s.exRowActive : {}),
          }}
        >
          <div style={{ ...s.check, ...(ex.done ? s.checkDone : {}) }}>
            {ex.done ? '✓' : ''}
          </div>
          <div style={s.exText}>
            <div style={s.exName}>{ex.name}</div>
            <div style={s.exMeta}>{ex.sets} sets · {ex.reps} reps · {ex.equipment}</div>
          </div>
          <div style={s.exChev}>›</div>
        </div>
      ))}
    </div>
  )
}

function SetLogger({ activeExercise, sets, saving, onUpdateSet, onComplete }) {
  if (!activeExercise) return (
    <div style={s.emptyState}>
      <div style={s.emptyIcon}>‹ ‹</div>
      <div style={s.emptyText}>Select an exercise</div>
      <div style={s.emptySub}>to start logging sets</div>
    </div>
  )

  return (
    <div style={s.panelContent}>
      <div style={s.panelLabel}>{activeExercise.name.toUpperCase()}</div>
      <div style={s.loggerMeta}>{activeExercise.sets} sets · {activeExercise.reps} reps</div>

      {activeExercise.notes && (
        <div style={s.coachNote}>
          <span style={s.coachIcon}>💡</span>
          <span>{activeExercise.notes}</span>
        </div>
      )}

      <div style={s.setTable}>
        <div style={s.setHeader}>
          <span>SET</span>
          <span>WEIGHT (LBS)</span>
          <span>REPS</span>
        </div>
        {(sets[activeExercise.id] || []).map((sv, i) => (
          <div key={i} style={s.setRow}>
            <span style={s.setNum}>{sv.set}</span>
            <input
              className="set-input"
              style={s.setInput}
              type="number"
              placeholder="0"
              value={sv.weight}
              onChange={e => onUpdateSet(activeExercise.id, i, 'weight', e.target.value)}
            />
            <input
              className="set-input"
              style={s.setInput}
              type="number"
              placeholder="0"
              value={sv.reps}
              onChange={e => onUpdateSet(activeExercise.id, i, 'reps', e.target.value)}
            />
          </div>
        ))}
      </div>

      <button
        className="btn-complete"
        style={{ ...s.completeBtn, opacity: saving ? 0.5 : 1 }}
        onClick={onComplete}
        disabled={saving}
      >
        {saving ? '● SAVING...' : '✓ MARK COMPLETE'}
      </button>
    </div>
  )
}

const s = {
  page: {
    minHeight: '100vh',
    minHeight: '100dvh',
    background: 'var(--bg)',
    paddingBottom: '90px',
    position: 'relative',
  },
  loadingScreen: {
    minHeight: '100vh',
    background: 'var(--bg)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
  },
  loadingOrb: {
    width: '60px',
    height: '60px',
    borderRadius: '18px',
    background: 'radial-gradient(circle at 35% 35%, rgba(34,212,138,0.3), rgba(34,212,138,0.05))',
    border: '1px solid rgba(34,212,138,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-display)',
    fontSize: '1.5rem',
    fontWeight: '700',
    color: 'var(--green)',
  },
  loadingText: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.7rem',
    color: 'var(--text3)',
    letterSpacing: '0.1em',
  },
  prToast: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    background: 'rgba(6,9,16,0.95)',
    border: '1px solid rgba(34,212,138,0.4)',
    borderRadius: '12px',
    padding: '14px 18px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontFamily: 'var(--font-display)',
    fontSize: '0.82rem',
    fontWeight: '600',
    color: 'var(--green)',
    letterSpacing: '0.06em',
    cursor: 'pointer',
    zIndex: 300,
    backdropFilter: 'blur(20px)',
    boxShadow: '0 4px 24px rgba(34,212,138,0.15)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '20px 24px 16px',
    gap: '12px',
    borderBottom: '1px solid var(--border)',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.6rem',
    color: 'var(--text3)',
    letterSpacing: '0.1em',
    flexShrink: 0,
  },
  backArrow: {
    fontSize: '1.2rem',
    lineHeight: 1,
    marginTop: '-1px',
  },
  headerCenter: {
    flex: 1,
    textAlign: 'center',
  },
  headerTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.3rem',
    fontWeight: '700',
    letterSpacing: '0.2em',
    color: '#fff',
    lineHeight: 1,
  },
  headerSub: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.5rem',
    color: 'var(--text3)',
    letterSpacing: '0.1em',
    marginTop: '3px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  statBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  statNum: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.88rem',
    color: 'var(--text)',
    lineHeight: 1,
  },
  statLbl: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.42rem',
    color: 'var(--text3)',
    letterSpacing: '0.1em',
  },
  progressTrack: {
    height: '2px',
    background: 'rgba(255,255,255,0.04)',
  },
  progressFill: {
    height: '100%',
    background: 'var(--green)',
    transition: 'width 0.5s ease',
    boxShadow: '0 0 10px rgba(34,212,138,0.5)',
  },
  mobileTabs: {
    display: 'none',
    borderBottom: '1px solid var(--border)',
  },
  mobileTab: {
    flex: 1,
    padding: '12px 8px',
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.52rem',
    color: 'var(--text3)',
    letterSpacing: '0.1em',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  mobileTabActive: {
    color: 'var(--green)',
    borderBottomColor: 'var(--green)',
  },
  desktopBody: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 260px',
    minHeight: 'calc(100vh - 130px)',
    minHeight: 'calc(100dvh - 130px)',
  },
  mobileBody: {
    display: 'none',
  },
  panel: {
    borderRight: '1px solid var(--border)',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
  },
  panelContent: {
    display: 'flex',
    flexDirection: 'column',
  },
  panelLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.52rem',
    color: 'var(--text3)',
    letterSpacing: '0.15em',
    marginBottom: '6px',
  },
  muscleTag: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.62rem',
    color: 'var(--green)',
    letterSpacing: '0.1em',
    marginBottom: '20px',
    textShadow: '0 0 10px rgba(34,212,138,0.3)',
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
    borderRadius: '6px',
  },
  exRowDone: { opacity: 0.3 },
  exRowActive: { paddingLeft: '8px' },
  check: {
    width: '18px',
    height: '18px',
    borderRadius: '4px',
    border: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.6rem',
    flexShrink: 0,
    color: 'var(--green)',
    transition: 'all 0.15s',
  },
  checkDone: {
    background: 'rgba(34,212,138,0.1)',
    borderColor: 'rgba(34,212,138,0.4)',
  },
  exText: { flex: 1 },
  exName: {
    fontFamily: 'var(--font-display)',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--text)',
    marginBottom: '2px',
    letterSpacing: '0.02em',
  },
  exMeta: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.52rem',
    color: 'var(--text3)',
    letterSpacing: '0.05em',
  },
  exChev: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.2rem',
    color: 'var(--text4)',
    lineHeight: 1,
  },
  emptyState: {
    flex: 1,
    minHeight: '300px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
  },
  emptyIcon: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.8rem',
    color: 'var(--text4)',
    marginBottom: '8px',
    letterSpacing: '-4px',
  },
  emptyText: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.65rem',
    color: 'var(--text4)',
    letterSpacing: '0.1em',
  },
  emptySub: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.55rem',
    color: 'var(--text4)',
    letterSpacing: '0.1em',
    opacity: 0.6,
  },
  loggerMeta: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.6rem',
    color: 'var(--text3)',
    letterSpacing: '0.08em',
    marginBottom: '16px',
  },
  coachNote: {
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-start',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.62rem',
    color: 'var(--text3)',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '10px 12px',
    marginBottom: '20px',
    lineHeight: '1.6',
  },
  coachIcon: { flexShrink: 0 },
  setTable: { marginBottom: '20px' },
  setHeader: {
    display: 'grid',
    gridTemplateColumns: '32px 1fr 1fr',
    gap: '10px',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.48rem',
    color: 'var(--text3)',
    letterSpacing: '0.12em',
    marginBottom: '10px',
    paddingBottom: '8px',
    borderBottom: '1px solid var(--border)',
  },
  setRow: {
    display: 'grid',
    gridTemplateColumns: '32px 1fr 1fr',
    gap: '10px',
    marginBottom: '8px',
    alignItems: 'center',
  },
  setNum: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    color: 'var(--text3)',
    fontWeight: '600',
  },
  setInput: {
    background: 'var(--bg3)',
    border: '1px solid var(--border2)',
    borderRadius: '8px',
    padding: '10px 12px',
    color: 'var(--text)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.9rem',
    width: '100%',
    transition: 'all 0.15s',
  },
  completeBtn: {
    width: '100%',
    padding: '14px',
    background: 'var(--green-dim)',
    border: '1px solid var(--green-glow)',
    borderRadius: '10px',
    color: 'var(--green)',
    fontFamily: 'var(--font-display)',
    fontSize: '0.88rem',
    fontWeight: '700',
    letterSpacing: '0.1em',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  bodyWrap: {
    width: '100%',
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px 0',
  },
  chatWrap: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  chatPanel: {
    background: 'rgba(6,9,16,0.97)',
    borderTop: '1px solid var(--border)',
    maxHeight: '280px',
    overflow: 'hidden',
    backdropFilter: 'blur(20px)',
  },
  chatMessages: {
    overflowY: 'auto',
    maxHeight: '280px',
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  chatPlaceholder: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.6rem',
    color: 'var(--text4)',
    textAlign: 'center',
    letterSpacing: '0.08em',
    padding: '20px 0',
  },
  msgNomis: {
    alignSelf: 'flex-start',
    maxWidth: '85%',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  msgUser: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    borderTopRightRadius: '3px',
    padding: '10px 14px',
    fontFamily: 'var(--font-display)',
    fontSize: '0.85rem',
    color: 'var(--text2)',
    lineHeight: '1.5',
  },
  msgPrefix: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.48rem',
    color: 'var(--green)',
    letterSpacing: '0.15em',
    opacity: 0.7,
  },
  typing: {
    display: 'flex',
    gap: '3px',
    padding: '8px 0',
  },
  chatBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 16px 14px',
    background: 'rgba(6,9,16,0.98)',
    borderTop: '1px solid var(--border)',
  },
  orbBtn: {
    width: '44px',
    height: '44px',
    borderRadius: '14px',
    background: 'radial-gradient(circle at 35% 35%, rgba(34,212,138,0.4), rgba(34,212,138,0.05))',
    border: '1px solid rgba(34,212,138,0.4)',
    color: 'var(--green)',
    fontFamily: 'var(--font-display)',
    fontSize: '1.1rem',
    fontWeight: '700',
    cursor: 'pointer',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    letterSpacing: '0.05em',
    transition: 'box-shadow 0.2s',
  },
  chatInput: {
    flex: 1,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--border2)',
    borderRadius: '12px',
    padding: '12px 16px',
    color: 'var(--text)',
    fontFamily: 'var(--font-display)',
    fontSize: '0.9rem',
    letterSpacing: '0.02em',
    outline: 'none',
    transition: 'border-color 0.15s',
  },
  sendBtn: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    background: 'var(--green-dim)',
    border: '1px solid var(--green-glow)',
    color: 'var(--green)',
    fontSize: '1.4rem',
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    transition: 'background 0.15s',
  },
}
