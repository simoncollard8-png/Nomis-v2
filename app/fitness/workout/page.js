'use client'
import { useState, useEffect, useRef } from 'react'
import Nav from '../../../components/Nav'
import NomisChat from '../../../components/NomisChat'
import { getTodaysWorkout, startWorkout, saveSets, checkAndSavePR, dbRead } from '../../../lib/api'

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
const WORKOUT_TYPES = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body', 'Rest', 'Cardio']

const MUSCLE_COLORS = {
  chest:      '#22d48a',
  back:       '#00e5ff',
  shoulders:  '#a78bfa',
  biceps:     '#f59e0b',
  triceps:    '#f97316',
  legs:       '#ef4444',
  quads:      '#ef4444',
  hamstrings: '#dc2626',
  glutes:     '#b91c1c',
  calves:     '#fca5a5',
  core:       '#22d48a',
  forearms:   '#fbbf24',
  traps:      '#818cf8',
  lats:       '#00e5ff',
}

function getMuscleColor(muscleGroup) {
  if (!muscleGroup) return '#22d48a'
  const lower = muscleGroup.toLowerCase()
  for (const [key, color] of Object.entries(MUSCLE_COLORS)) {
    if (lower.includes(key)) return color
  }
  return '#22d48a'
}

function BodyModel({ activeMuscle }) {
  const color = getMuscleColor(activeMuscle)
  const isActive = (group) => {
    if (!activeMuscle) return false
    return activeMuscle.toLowerCase().includes(group.toLowerCase())
  }
  const glow = { filter: `drop-shadow(0 0 6px ${color})`, transition: 'all 0.3s' }
  const dim  = { opacity: 0.15, transition: 'all 0.3s' }
  const base = { transition: 'all 0.3s' }

  return (
    <svg viewBox="0 0 120 280" style={{ width: '100%', maxWidth: '140px', height: 'auto' }}>
      {/* Head */}
      <ellipse cx="60" cy="22" rx="14" ry="16" fill="#1a2035" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />

      {/* Neck */}
      <rect x="54" y="36" width="12" height="10" rx="2" fill="#1a2035" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />

      {/* Torso */}
      <path d="M35 46 L85 46 L90 130 L30 130 Z" fill="#111827" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />

      {/* Chest */}
      <path d="M38 50 L60 50 L62 80 L35 82 Z" style={isActive('chest') || isActive('push') ? {...glow} : dim}
        fill={isActive('chest') || isActive('push') ? color : '#22d48a'} opacity={isActive('chest') || isActive('push') ? 0.85 : 0.12} />
      <path d="M82 50 L60 50 L58 80 L85 82 Z" style={isActive('chest') || isActive('push') ? {...glow} : dim}
        fill={isActive('chest') || isActive('push') ? color : '#22d48a'} opacity={isActive('chest') || isActive('push') ? 0.85 : 0.12} />

      {/* Shoulders */}
      <ellipse cx="32" cy="52" rx="9" ry="11" style={isActive('shoulder') || isActive('push') ? {...glow} : base}
        fill={isActive('shoulder') || isActive('push') ? color : '#a78bfa'} opacity={isActive('shoulder') || isActive('push') ? 0.85 : 0.15} />
      <ellipse cx="88" cy="52" rx="9" ry="11" style={isActive('shoulder') || isActive('push') ? {...glow} : base}
        fill={isActive('shoulder') || isActive('push') ? color : '#a78bfa'} opacity={isActive('shoulder') || isActive('push') ? 0.85 : 0.15} />

      {/* Lats / Back */}
      <path d="M35 58 L38 50 L35 46 L22 60 L28 90 L35 90 Z" style={isActive('back') || isActive('lat') || isActive('pull') ? {...glow} : base}
        fill={isActive('back') || isActive('lat') || isActive('pull') ? color : '#00e5ff'} opacity={isActive('back') || isActive('lat') || isActive('pull') ? 0.7 : 0.1} />
      <path d="M85 58 L82 50 L85 46 L98 60 L92 90 L85 90 Z" style={isActive('back') || isActive('lat') || isActive('pull') ? {...glow} : base}
        fill={isActive('back') || isActive('lat') || isActive('pull') ? color : '#00e5ff'} opacity={isActive('back') || isActive('lat') || isActive('pull') ? 0.7 : 0.1} />

      {/* Abs */}
      {[0,1,2].map(i => (
        <g key={i}>
          <rect x="47" y={84 + i*14} width="11" height="11" rx="2" style={isActive('core') || isActive('abs') ? {...glow} : dim}
            fill={isActive('core') || isActive('abs') ? color : '#22d48a'} opacity={isActive('core') || isActive('abs') ? 0.8 : 0.12} />
          <rect x="62" y={84 + i*14} width="11" height="11" rx="2" style={isActive('core') || isActive('abs') ? {...glow} : dim}
            fill={isActive('core') || isActive('abs') ? color : '#22d48a'} opacity={isActive('core') || isActive('abs') ? 0.8 : 0.12} />
        </g>
      ))}

      {/* Upper Arms - Biceps */}
      <path d="M23 62 L30 62 L32 95 L22 95 Z" style={isActive('bicep') || isActive('pull') ? {...glow} : base}
        fill={isActive('bicep') || isActive('pull') ? color : '#f59e0b'} opacity={isActive('bicep') || isActive('pull') ? 0.85 : 0.15} />
      <path d="M97 62 L90 62 L88 95 L98 95 Z" style={isActive('bicep') || isActive('pull') ? {...glow} : base}
        fill={isActive('bicep') || isActive('pull') ? color : '#f59e0b'} opacity={isActive('bicep') || isActive('pull') ? 0.85 : 0.15} />

      {/* Upper Arms - Triceps */}
      <path d="M23 62 L18 62 L16 95 L22 95 Z" style={isActive('tricep') || isActive('push') ? {...glow} : base}
        fill={isActive('tricep') || isActive('push') ? color : '#f97316'} opacity={isActive('tricep') || isActive('push') ? 0.85 : 0.12} />
      <path d="M97 62 L102 62 L104 95 L98 95 Z" style={isActive('tricep') || isActive('push') ? {...glow} : base}
        fill={isActive('tricep') || isActive('push') ? color : '#f97316'} opacity={isActive('tricep') || isActive('push') ? 0.85 : 0.12} />

      {/* Forearms */}
      <path d="M22 97 L30 97 L28 128 L20 128 Z" style={base} fill="#fbbf24" opacity="0.1" />
      <path d="M98 97 L90 97 L92 128 L100 128 Z" style={base} fill="#fbbf24" opacity="0.1" />

      {/* Hands */}
      <ellipse cx="24" cy="133" rx="6" ry="8" fill="#1a2035" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
      <ellipse cx="96" cy="133" rx="6" ry="8" fill="#1a2035" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />

      {/* Hips */}
      <path d="M30 130 L90 130 L88 155 L32 155 Z" fill="#0f1525" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />

      {/* Quads */}
      <path d="M33 155 L57 155 L55 215 L31 215 Z" style={isActive('quad') || isActive('leg') ? {...glow} : base}
        fill={isActive('quad') || isActive('leg') ? color : '#ef4444'} opacity={isActive('quad') || isActive('leg') ? 0.8 : 0.15} />
      <path d="M87 155 L63 155 L65 215 L89 215 Z" style={isActive('quad') || isActive('leg') ? {...glow} : base}
        fill={isActive('quad') || isActive('leg') ? color : '#ef4444'} opacity={isActive('quad') || isActive('leg') ? 0.8 : 0.15} />

      {/* Hamstrings */}
      <path d="M32 155 L57 155 L55 215 L30 215 Z" style={isActive('hamstring') || isActive('leg') ? {...glow} : dim}
        fill={isActive('hamstring') || isActive('leg') ? color : '#dc2626'} opacity={isActive('hamstring') || isActive('leg') ? 0.4 : 0.05} />

      {/* Knees */}
      <ellipse cx="44" cy="218" rx="10" ry="7" fill="#1a2035" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
      <ellipse cx="76" cy="218" rx="10" ry="7" fill="#1a2035" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />

      {/* Calves */}
      <path d="M34 225 L54 225 L51 265 L37 265 Z" style={isActive('calf') || isActive('leg') ? {...glow} : base}
        fill={isActive('calf') || isActive('leg') ? color : '#fca5a5'} opacity={isActive('calf') || isActive('leg') ? 0.75 : 0.1} />
      <path d="M86 225 L66 225 L69 265 L83 265 Z" style={isActive('calf') || isActive('leg') ? {...glow} : base}
        fill={isActive('calf') || isActive('leg') ? color : '#fca5a5'} opacity={isActive('calf') || isActive('leg') ? 0.75 : 0.1} />

      {/* Feet */}
      <ellipse cx="44" cy="268" rx="10" ry="5" fill="#1a2035" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
      <ellipse cx="76" cy="268" rx="10" ry="5" fill="#1a2035" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />

      {/* Label */}
      {activeMuscle && (
        <text x="60" y="276" textAnchor="middle"
          style={{ fontFamily: 'var(--font-mono)', fontSize: '5px', fill: color, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
          {activeMuscle.toUpperCase()}
        </text>
      )}
    </svg>
  )
}

export default function Workout() {
  const [workout, setWorkout]           = useState(null)
  const [workoutId, setWorkoutId]       = useState(null)
  const [exercises, setExercises]       = useState([])
  const [activeIdx, setActiveIdx]       = useState(0)
  const [setData, setSetData]           = useState({})
  const [completedEx, setCompletedEx]   = useState({})
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [prToast, setPrToast]           = useState(null)
  const [weekSchedule, setWeekSchedule] = useState(null)
  const [editingDay, setEditingDay]     = useState(null)
  const [tab, setTab]                   = useState('workout') // workout | schedule

  useEffect(() => {
    loadWorkout()
    loadSchedule()
  }, [])

  async function loadWorkout() {
    const w = await getTodaysWorkout()
    if (w) {
      setWorkout(w)
      setExercises(w.exercises)
      const initial = {}
      w.exercises.forEach(ex => {
        initial[ex.id] = Array.from({ length: ex.sets }, (_, i) => ({ set: i + 1, weight: '', reps: '' }))
      })
      setSetData(initial)
    }
    setLoading(false)
  }

  async function loadSchedule() {
    const programs = await dbRead('programs', { active: true })
    if (!programs.length) return
    const plans = await dbRead('workout_plans', { program_id: programs[0].id })
    const schedule = {}
    DAYS.forEach(d => {
      const plan = plans.find(p => p.day_of_week === d)
      schedule[d] = plan ? plan.muscle_group : 'Rest'
    })
    setWeekSchedule(schedule)
  }

  async function handleStart() {
    if (!workout || workoutId) return
    const w = await startWorkout(workout)
    if (w) setWorkoutId(w.id)
  }

  async function handleCompleteExercise(ex) {
    if (!workoutId) await handleStart()
    const sets = setData[ex.id] || []
    setSaving(true)
    await saveSets(workoutId, ex, sets)
    const pr = await checkAndSavePR(ex, sets)
    if (pr) {
      setPrToast(`🏆 NEW PR — ${ex.name}: ${pr} lbs`)
      setTimeout(() => setPrToast(null), 4000)
    }
    setCompletedEx(prev => ({ ...prev, [ex.id]: true }))
    setSaving(false)
    const next = exercises.findIndex((e, i) => i > activeIdx && !completedEx[e.id])
    if (next !== -1) setActiveIdx(next)
  }

  function updateSet(exId, setIdx, field, val) {
    setSetData(prev => ({
      ...prev,
      [exId]: prev[exId].map((s, i) => i === setIdx ? { ...s, [field]: val } : s)
    }))
  }

  const activeEx      = exercises[activeIdx]
  const completedCount = Object.keys(completedEx).length
  const progress      = exercises.length ? (completedCount / exercises.length) * 100 : 0

  const pageContext = workout ? `
User is on the Workout page.
Today: ${workout.day} — ${workout.muscle_group} (${workout.program})
Exercises: ${exercises.map(e => `${e.name} ${e.sets}x${e.reps}`).join(', ')}
Progress: ${completedCount}/${exercises.length} complete
Active exercise: ${activeEx?.name || 'none'}
  `.trim() : 'User is on the Workout page. No workout scheduled today.'

  if (loading) return (
    <div className="app-shell">
      <Nav />
      <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text3)', letterSpacing: '0.15em' }} className="animate-pulse">
          LOADING WORKOUT...
        </div>
      </main>
    </div>
  )

  return (
    <div className="app-shell">
      <Nav />
      <main className="main-content">
        <div style={s.page}>

          {/* PR Toast */}
          {prToast && (
            <div style={s.prToast} onClick={() => setPrToast(null)}>
              {prToast}
            </div>
          )}

          {/* Header */}
          <header className="pwa-header" style={s.header}>
            <div>
              <div className="page-title">WORKOUT</div>
              <div className="page-sub">
                {workout ? `${workout.day} · ${workout.muscle_group}` : 'No workout today'}
              </div>
            </div>
            {workout && (
              <div style={s.headerProgress}>
                <div style={s.progressNum}>{completedCount}<span style={s.progressOf}>/{exercises.length}</span></div>
                <div style={s.progressLabel}>DONE</div>
              </div>
            )}
          </header>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%`, background: 'var(--green)', color: 'var(--green)' }} />
          </div>

          {/* Tabs */}
          <div style={s.tabs}>
            {['workout','schedule'].map(t => (
              <button key={t} style={{ ...s.tab, ...(tab === t ? s.tabActive : {}) }} onClick={() => setTab(t)}>
                {t === 'workout' ? 'TODAY' : 'SCHEDULE'}
              </button>
            ))}
          </div>

          {/* WORKOUT TAB */}
          {tab === 'workout' && (
            <div style={s.body}>
              {!workout ? (
                <div style={s.restDay}>
                  <div style={s.restIcon}>◎</div>
                  <div style={s.restTitle}>REST DAY</div>
                  <div style={s.restSub}>Recovery is part of the program. Ask NOMIS for active recovery tips.</div>
                </div>
              ) : (
                <div style={s.workoutLayout}>
                  {/* Left — exercise list */}
                  <div style={s.leftCol}>
                    <div style={s.colLabel}>// EXERCISES</div>
                    {exercises.map((ex, i) => (
                      <div
                        key={ex.id}
                        className="ex-row"
                        onClick={() => setActiveIdx(i)}
                        style={{
                          ...s.exRow,
                          ...(i === activeIdx ? s.exRowActive : {}),
                          ...(completedEx[ex.id] ? s.exRowDone : {}),
                        }}
                      >
                        <div style={s.exCheck}>
                          {completedEx[ex.id] ? <span style={{ color: 'var(--green)' }}>✓</span> : <span style={{ color: 'var(--text4)' }}>○</span>}
                        </div>
                        <div style={s.exInfo}>
                          <div style={s.exName}>{ex.name}</div>
                          <div style={s.exSub}>{ex.sets}×{ex.reps} · {ex.muscle_group}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Right — set logger + body model */}
                  <div style={s.rightCol}>
                    {/* Body model */}
                    <div style={s.bodyModelWrap}>
                      <BodyModel activeMuscle={activeEx?.muscle_group || workout.muscle_group} />
                    </div>

                    {/* Set logger */}
                    {activeEx && (
                      <div style={s.logger}>
                        <div style={s.loggerTitle}>{activeEx.name}</div>
                        <div style={s.loggerSub}>{activeEx.sets} sets × {activeEx.reps} reps</div>
                        {activeEx.notes && <div style={s.loggerNotes}>💡 {activeEx.notes}</div>}

                        <div style={s.setRows}>
                          <div style={s.setHeader}>
                            <span>SET</span><span>WEIGHT (lbs)</span><span>REPS</span>
                          </div>
                          {(setData[activeEx.id] || []).map((set, i) => (
                            <div key={i} style={s.setInputRow}>
                              <span style={s.setNum}>{set.set}</span>
                              <input
                                style={s.setInput}
                                type="number"
                                placeholder="0"
                                value={set.weight}
                                onChange={e => updateSet(activeEx.id, i, 'weight', e.target.value)}
                              />
                              <input
                                style={s.setInput}
                                type="number"
                                placeholder={activeEx.reps}
                                value={set.reps}
                                onChange={e => updateSet(activeEx.id, i, 'reps', e.target.value)}
                              />
                            </div>
                          ))}
                        </div>

                        <button
                          style={{ ...s.completeBtn, opacity: saving ? 0.5 : 1, background: completedEx[activeEx.id] ? 'rgba(34,212,138,0.15)' : 'var(--green-dim)' }}
                          onClick={() => handleCompleteExercise(activeEx)}
                          disabled={saving || completedEx[activeEx.id]}
                        >
                          {completedEx[activeEx.id] ? '✓ LOGGED' : saving ? '● SAVING...' : '+ LOG SETS'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SCHEDULE TAB */}
          {tab === 'schedule' && (
            <div style={s.body}>
              <div style={s.colLabel}>// WEEKLY SCHEDULE — tap to change</div>
              {DAYS.map(day => (
                <div key={day} style={s.scheduleRow}>
                  <div style={s.scheduleDay}>{day.slice(0,3).toUpperCase()}</div>
                  {editingDay === day ? (
                    <div style={s.scheduleEditRow}>
                      {WORKOUT_TYPES.map(type => (
                        <button
                          key={type}
                          style={{ ...s.typeBtn, ...(weekSchedule?.[day] === type ? s.typeBtnActive : {}) }}
                          onClick={() => {
                            setWeekSchedule(prev => ({ ...prev, [day]: type }))
                            setEditingDay(null)
                          }}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div style={s.scheduleType} onClick={() => setEditingDay(day)}>
                      <span style={{ color: weekSchedule?.[day] === 'Rest' ? 'var(--text4)' : 'var(--green)' }}>
                        {weekSchedule?.[day] || 'Rest'}
                      </span>
                      <span style={s.scheduleEdit}>edit</span>
                    </div>
                  )}
                </div>
              ))}
              <div style={s.scheduleNote}>
                Note: Tap a day to change its type. Full DB sync for schedule editing coming in a future update.
              </div>
            </div>
          )}

        </div>
      </main>
      <NomisChat pageContext={pageContext} />
    </div>
  )
}

const s = {
  page: { minHeight: '100dvh', background: 'var(--bg)', paddingBottom: '40px', position: 'relative' },
  prToast: { position: 'fixed', top: '20px', right: '20px', zIndex: 300, background: 'rgba(34,212,138,0.12)', border: '1px solid rgba(34,212,138,0.4)', borderRadius: '12px', padding: '12px 18px', fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: 'var(--green)', letterSpacing: '0.06em', cursor: 'pointer', boxShadow: '0 4px 20px rgba(34,212,138,0.2)', animation: 'fadeUp 0.3s ease' },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '24px 24px 18px', borderBottom: '1px solid var(--border)' },
  headerProgress: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' },
  progressNum: { fontFamily: 'var(--font-mono)', fontSize: '1.3rem', fontWeight: '500', color: 'var(--green)', lineHeight: 1 },
  progressOf: { fontSize: '0.7rem', color: 'var(--text3)' },
  progressLabel: { fontFamily: 'var(--font-mono)', fontSize: '0.42rem', color: 'var(--text4)', letterSpacing: '0.12em' },
  tabs: { display: 'flex', borderBottom: '1px solid var(--border)' },
  tab: { flex: 1, padding: '13px', background: 'transparent', border: 'none', borderBottom: '2px solid transparent', fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text3)', letterSpacing: '0.1em', cursor: 'pointer', transition: 'all 0.15s' },
  tabActive: { color: 'var(--green)', borderBottomColor: 'var(--green)' },
  body: { padding: '20px' },
  restDay: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '60px 20px', textAlign: 'center' },
  restIcon: { fontSize: '2.5rem', color: 'var(--text4)', opacity: 0.3 },
  restTitle: { fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: '700', letterSpacing: '0.2em', color: 'var(--text3)' },
  restSub: { fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text4)', letterSpacing: '0.06em', maxWidth: '260px', lineHeight: 1.6 },
  workoutLayout: { display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '16px' },
  leftCol: { display: 'flex', flexDirection: 'column', gap: '6px' },
  rightCol: { display: 'flex', flexDirection: 'column', gap: '14px' },
  colLabel: { fontFamily: 'var(--font-mono)', fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.14em', marginBottom: '6px' },
  exRow: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 10px', borderRadius: '10px', border: '1px solid transparent', cursor: 'pointer', transition: 'all 0.15s' },
  exRowActive: { background: 'var(--green-dim)', border: '1px solid rgba(34,212,138,0.2)' },
  exRowDone: { opacity: 0.45 },
  exCheck: { fontFamily: 'var(--font-mono)', fontSize: '0.75rem', width: '18px', flexShrink: 0 },
  exInfo: { flex: 1, minWidth: 0 },
  exName: { fontFamily: 'var(--font-display)', fontSize: '0.82rem', fontWeight: '600', color: 'var(--text)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  exSub: { fontFamily: 'var(--font-mono)', fontSize: '0.45rem', color: 'var(--text3)', marginTop: '2px', letterSpacing: '0.04em' },
  bodyModelWrap: { display: 'flex', justifyContent: 'center', padding: '10px 0' },
  logger: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' },
  loggerTitle: { fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: '700', color: 'var(--text)', marginBottom: '2px' },
  loggerSub: { fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text3)', letterSpacing: '0.06em', marginBottom: '8px' },
  loggerNotes: { fontFamily: 'var(--font-display)', fontSize: '0.75rem', color: 'var(--text3)', background: 'rgba(255,255,255,0.02)', borderRadius: '7px', padding: '8px 10px', marginBottom: '10px', lineHeight: 1.4 },
  setRows: { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' },
  setHeader: { display: 'grid', gridTemplateColumns: '28px 1fr 1fr', gap: '8px', fontFamily: 'var(--font-mono)', fontSize: '0.44rem', color: 'var(--text4)', letterSpacing: '0.1em', padding: '0 4px', marginBottom: '2px' },
  setInputRow: { display: 'grid', gridTemplateColumns: '28px 1fr 1fr', gap: '8px', alignItems: 'center' },
  setNum: { fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text3)', textAlign: 'center' },
  setInput: { background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: '7px', padding: '8px 10px', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', textAlign: 'center', outline: 'none', width: '100%', transition: 'all 0.15s' },
  completeBtn: { width: '100%', padding: '11px', background: 'var(--green-dim)', border: '1px solid var(--green-glow)', borderRadius: '9px', color: 'var(--green)', fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: '700', letterSpacing: '0.1em', cursor: 'pointer', transition: 'all 0.15s' },
  scheduleRow: { display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 0', borderBottom: '1px solid var(--border)' },
  scheduleDay: { fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text3)', letterSpacing: '0.1em', width: '36px', flexShrink: 0 },
  scheduleType: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' },
  scheduleEdit: { fontFamily: 'var(--font-mono)', fontSize: '0.46rem', color: 'var(--text4)', letterSpacing: '0.08em' },
  scheduleEditRow: { flex: 1, display: 'flex', flexWrap: 'wrap', gap: '6px' },
  typeBtn: { padding: '6px 10px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '7px', color: 'var(--text3)', fontFamily: 'var(--font-mono)', fontSize: '0.52rem', letterSpacing: '0.06em', cursor: 'pointer', transition: 'all 0.15s' },
  typeBtnActive: { background: 'var(--green-dim)', borderColor: 'rgba(34,212,138,0.35)', color: 'var(--green)' },
  scheduleNote: { fontFamily: 'var(--font-mono)', fontSize: '0.48rem', color: 'var(--text4)', letterSpacing: '0.04em', marginTop: '14px', lineHeight: 1.6 },
}
