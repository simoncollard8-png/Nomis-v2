'use client'
import { useState, useEffect } from 'react'
import Shell from '../../components/Shell'
import NomisChat from '../../components/NomisChat'
import { getTodaysWorkout, startWorkout, saveSets, checkAndSavePR, dbRead, dbWrite } from '../../lib/api'

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const WORKOUT_TYPES = ['Push','Pull','Legs','Upper','Lower','Full Body','Rest','Cardio']

export default function Train() {
  const [workout, setWorkout]           = useState(null)
  const [workoutId, setWorkoutId]       = useState(null)
  const [exercises, setExercises]       = useState([])
  const [activeIdx, setActiveIdx]       = useState(null)
  const [setData, setSetData]           = useState({})
  const [completedEx, setCompletedEx]   = useState({})
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [prToast, setPrToast]           = useState(null)
  const [sessionStart, setSessionStart] = useState(null)
  const [elapsed, setElapsed]           = useState('00:00:00')

  // Date navigation
  const [selectedDate, setSelectedDate] = useState(new Date())

  useEffect(() => { loadWorkout() }, [selectedDate])

  // Session timer
  useEffect(() => {
    if (!sessionStart) return
    const id = setInterval(() => {
      const diff = Math.floor((Date.now() - sessionStart) / 1000)
      const h = String(Math.floor(diff / 3600)).padStart(2, '0')
      const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0')
      const s = String(diff % 60).padStart(2, '0')
      setElapsed(`${h}:${m}:${s}`)
    }, 1000)
    return () => clearInterval(id)
  }, [sessionStart])

  async function loadWorkout() {
    setLoading(true)
    const w = await getTodaysWorkout()
    if (w) {
      setWorkout(w)
      setExercises(w.exercises)
      const init = {}
      w.exercises.forEach(ex => {
        init[ex.id] = Array.from({ length: ex.sets || 4 }, (_, i) => ({ set: i + 1, weight: '', reps: '' }))
      })
      setSetData(init)
    }
    setLoading(false)
  }

  async function handleStart() {
    if (!workout || workoutId) return workoutId
    setSessionStart(Date.now())
    const w = await startWorkout(workout)
    if (w) { setWorkoutId(w.id); return w.id }
    return null
  }

  async function handleCompleteExercise(ex) {
    let wid = workoutId
    if (!wid) wid = await handleStart()
    if (!wid) return
    const sets = setData[ex.id] || []
    setSaving(true)
    await saveSets(wid, ex, sets)
    const pr = await checkAndSavePR(ex, sets)
    if (pr) {
      setPrToast(`NEW PR / ${ex.name}: ${pr} lbs`)
      setTimeout(() => setPrToast(null), 4000)
    }
    setCompletedEx(prev => ({ ...prev, [ex.id]: true }))
    setSaving(false)
    setActiveIdx(null)
  }

  function updateSet(exId, setIdx, field, val) {
    setSetData(prev => ({
      ...prev,
      [exId]: prev[exId].map((s, i) => i === setIdx ? { ...s, [field]: val } : s)
    }))
  }

  function shiftDate(dir) {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + dir)
    setSelectedDate(d)
  }

  const completedCount = Object.keys(completedEx).length
  const progress = exercises.length ? (completedCount / exercises.length) * 100 : 0
  const isToday = selectedDate.toDateString() === new Date().toDateString()

  // Format dates
  const dateMain = selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  const dateSub = selectedDate.toLocaleDateString('en-US', { weekday: 'long' })
  const prevDate = (() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) })()
  const nextDate = (() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) })()

  if (loading) return (
    <Shell title="Train">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--text3)', letterSpacing: '0.12em' }}>
          LOADING...
        </span>
      </div>
    </Shell>
  )

  return (
    <Shell title="Train">
      <div style={s.page}>

        {/* PR Toast */}
        {prToast && (
          <div style={s.prToast} onClick={() => setPrToast(null)}>{prToast}</div>
        )}

        {/* Date navigator */}
        <div style={s.dateNav}>
          <button style={s.dateArrow} onClick={() => shiftDate(-1)}>&lt;</button>
          <span style={s.dateSide} onClick={() => shiftDate(-1)}>{prevDate}</span>
          <div style={s.dateCenter}>
            <div style={s.dateMain}>{dateMain}</div>
            <div style={s.dateSub} className="mono">{dateSub.toUpperCase()}</div>
          </div>
          <span style={s.dateNext} onClick={() => shiftDate(1)}>{nextDate}</span>
          <button style={s.dateArrow} onClick={() => shiftDate(1)}>&gt;</button>
        </div>

        {/* Session card */}
        {workout && !workout.isRest ? (
          <div style={s.sessionCard} className="card">
            <div style={s.sessionTop}>
              <div style={s.sessionInfo}>
                <div style={s.sessionAccent} />
                <div>
                  <div style={s.sessionTitle}>{workout.muscle_group}</div>
                  <div style={s.sessionSub} className="mono">
                    {workout.muscle_group === 'Push' ? 'Chest / Shoulders / Triceps' :
                     workout.muscle_group === 'Pull' ? 'Back / Biceps / Rear Delts' :
                     workout.muscle_group === 'Legs' ? 'Quads / Hamstrings / Glutes' :
                     workout.muscle_group}
                  </div>
                </div>
              </div>
              <div style={s.sessionRight}>
                <span className="badge badge-cyan">
                  {isToday ? 'Scheduled' : 'Viewing'}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div style={s.progressRow}>
              <div style={s.progressBg}>
                <div style={{ ...s.progressFill, width: `${progress}%` }} />
              </div>
              <span style={s.progressLabel} className="mono">{completedCount} / {exercises.length}</span>
            </div>

            {/* Stats row */}
            <div style={s.statsRow}>
              <div style={s.statCell}>
                <div style={{ ...s.statValue, color: 'var(--cyan)' }} className="mono">{elapsed}</div>
                <div style={s.statLabel} className="mono">Duration</div>
              </div>
              <div style={s.statCell}>
                <div style={{ ...s.statValue, color: 'var(--orange)' }} className="mono">{exercises.length}</div>
                <div style={s.statLabel} className="mono">Exercises</div>
              </div>
              <div style={s.statCell}>
                <div style={{ ...s.statValue, color: 'var(--teal)' }} className="mono">
                  {exercises.reduce((a, ex) => a + (ex.sets || 4), 0)}
                </div>
                <div style={s.statLabel} className="mono">Sets</div>
              </div>
            </div>
          </div>
        ) : (
          <div style={s.restCard} className="card">
            <div style={s.restTitle}>Rest Day</div>
            <div style={s.restSub} className="mono">Recovery is growth. Ask NOMIS for mobility ideas.</div>
          </div>
        )}

        {/* Exercises */}
        {exercises.length > 0 && (
          <div style={s.section}>
            <div style={s.exHeader}>
              <span className="section-label">Exercises</span>
              <span className="mono" style={{ fontSize: '0.5rem', color: 'var(--text3)' }}>
                {completedCount} of {exercises.length}
              </span>
            </div>

            {exercises.map((ex, i) => {
              const isDone = completedEx[ex.id]
              const isActive = activeIdx === i
              const topWeight = setData[ex.id]?.reduce((max, s) => {
                const w = parseFloat(s.weight) || 0
                return w > max ? w : max
              }, 0)
              const topReps = setData[ex.id]?.find(s => parseFloat(s.weight) === topWeight)?.reps || ''

              return (
                <div key={ex.id}>
                  {/* Exercise card */}
                  <div
                    style={{
                      ...s.exCard,
                      ...(isDone ? s.exCardDone : {}),
                      ...(isActive ? s.exCardActive : {}),
                    }}
                    onClick={() => setActiveIdx(isActive ? null : i)}
                  >
                    <div style={s.exLeft}>
                      <span style={s.exNum} className="mono">{String(i + 1).padStart(2, '0')}</span>
                      <div>
                        <div style={{ ...s.exName, ...(isDone ? { color: 'var(--text2)' } : {}) }}>{ex.name}</div>
                        <div style={s.exDetail} className="mono">
                          {ex.muscle_group} / {ex.equipment || 'Bodyweight'} / {ex.sets || 4} sets
                        </div>
                      </div>
                    </div>
                    <div style={s.exRight}>
                      {isDone && topWeight ? (
                        <span style={s.exBadge} className="mono">{topWeight} x {topReps}</span>
                      ) : (
                        <span style={s.exBadgeEmpty} className="mono">--</span>
                      )}
                      <div style={{ ...s.exDot, ...(isDone ? s.exDotDone : {}) }} />
                    </div>
                  </div>

                  {/* Expanded set logger */}
                  {isActive && !isDone && (
                    <div style={s.logger} className="animate-fadeIn">
                      <div style={s.setHeader} className="mono">
                        <span>SET</span><span>WEIGHT (lbs)</span><span>REPS</span>
                      </div>
                      {(setData[ex.id] || []).map((set, si) => (
                        <div key={si} style={s.setRow}>
                          <span style={s.setNum} className="mono">{set.set}</span>
                          <input
                            style={s.setInput}
                            className="mono"
                            type="number"
                            inputMode="decimal"
                            placeholder="0"
                            value={set.weight}
                            onChange={e => updateSet(ex.id, si, 'weight', e.target.value)}
                          />
                          <input
                            style={s.setInput}
                            className="mono"
                            type="number"
                            inputMode="numeric"
                            placeholder={ex.reps || '0'}
                            value={set.reps}
                            onChange={e => updateSet(ex.id, si, 'reps', e.target.value)}
                          />
                        </div>
                      ))}
                      <button
                        style={{ ...s.logBtn, opacity: saving ? 0.5 : 1 }}
                        onClick={() => handleCompleteExercise(ex)}
                        disabled={saving}
                      >
                        {saving ? 'Saving...' : 'Log sets'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Add exercise placeholder */}
            <div style={s.addCard}>
              <span className="mono" style={{ fontSize: '0.85rem', color: 'var(--text3)', fontWeight: '300' }}>+</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text3)' }}>Add exercise</span>
            </div>
          </div>
        )}

        {/* Submit */}
        {exercises.length > 0 && completedCount > 0 && (
          <div style={s.submitSection}>
            <button style={s.submitBtn}>Complete Session</button>
          </div>
        )}

      </div>
      <NomisChat pageContext={workout ? `Train: ${workout.day} / ${workout.muscle_group}. ${completedCount}/${exercises.length} done.` : 'Rest day'} />
    </Shell>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────────
const s = {
  page: {
    padding: '8px 0 40px',
  },

  // PR toast
  prToast: {
    position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
    zIndex: 300,
    background: 'rgba(45,212,191,0.1)',
    border: '1px solid var(--teal-border)',
    borderRadius: '12px',
    padding: '12px 20px',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.65rem',
    color: 'var(--teal)',
    letterSpacing: '0.06em',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
  },

  // Date nav
  dateNav: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: '16px', padding: '20px 24px 28px',
  },
  dateArrow: {
    width: '30px', height: '30px', borderRadius: '8px',
    background: 'var(--bg2)', border: '1px solid var(--border2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--text3)', fontSize: '0.72rem', cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
  },
  dateSide: {
    fontSize: '0.82rem', color: 'var(--text3)', opacity: 0.6,
    minWidth: '48px', textAlign: 'right', cursor: 'pointer',
  },
  dateNext: {
    fontSize: '0.82rem', color: 'var(--text3)', opacity: 0.6,
    minWidth: '48px', textAlign: 'left', cursor: 'pointer',
  },
  dateCenter: { textAlign: 'center', minWidth: '100px' },
  dateMain: { fontSize: '1.1rem', fontWeight: '600', color: '#fff' },
  dateSub: { fontSize: '0.48rem', color: 'var(--cyan)', letterSpacing: '0.12em', marginTop: '4px' },

  // Session card
  sessionCard: { margin: '0 24px 24px', overflow: 'hidden' },
  sessionTop: {
    padding: '20px 20px 16px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  sessionInfo: { display: 'flex', gap: '16px', alignItems: 'center' },
  sessionAccent: {
    width: '3px', height: '44px', borderRadius: '2px',
    background: 'linear-gradient(180deg, var(--cyan), var(--teal))',
    boxShadow: '0 0 10px rgba(34,211,238,0.12)', flexShrink: 0,
  },
  sessionTitle: { fontSize: '1.15rem', fontWeight: '700', color: '#fff' },
  sessionSub: { fontSize: '0.52rem', color: 'var(--text3)', letterSpacing: '0.06em', marginTop: '5px' },
  sessionRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' },

  // Progress
  progressRow: {
    padding: '0 20px 16px', display: 'flex', alignItems: 'center', gap: '12px',
  },
  progressBg: {
    flex: 1, height: '3px', background: 'rgba(255,255,255,0.04)',
    borderRadius: '2px', overflow: 'hidden',
  },
  progressFill: {
    height: '100%', borderRadius: '2px',
    background: 'linear-gradient(90deg, var(--cyan), var(--teal))',
    boxShadow: '0 0 8px rgba(34,211,238,0.2)',
    transition: 'width 0.3s ease',
  },
  progressLabel: { fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.06em', flexShrink: 0 },

  // Stats row
  statsRow: { display: 'flex', borderTop: '1px solid var(--border)' },
  statCell: {
    flex: 1, padding: '14px 0', textAlign: 'center',
    borderRight: '1px solid var(--border)',
  },
  statValue: { fontSize: '0.88rem', fontWeight: '500', letterSpacing: '0.02em', lineHeight: 1 },
  statLabel: { fontSize: '0.42rem', color: 'var(--text3)', letterSpacing: '0.1em', marginTop: '5px', textTransform: 'uppercase' },

  // Rest card
  restCard: { margin: '0 24px', padding: '48px 24px', textAlign: 'center' },
  restTitle: { fontSize: '1.1rem', fontWeight: '600', color: 'var(--text2)', marginBottom: '8px' },
  restSub: { fontSize: '0.55rem', color: 'var(--text3)', letterSpacing: '0.04em' },

  // Exercise section
  section: { margin: '0 24px 24px' },
  exHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '12px', padding: '0 2px',
  },

  // Exercise cards
  exCard: {
    background: 'var(--bg2)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)', padding: '16px 18px', marginBottom: '8px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.08)',
    transition: 'border-color 0.15s',
  },
  exCardDone: { borderLeft: '2px solid var(--teal)' },
  exCardActive: { borderColor: 'var(--border3)', background: 'var(--bg3)' },
  exLeft: { display: 'flex', alignItems: 'center', gap: '14px' },
  exNum: { fontSize: '0.55rem', color: 'var(--text3)', width: '16px' },
  exName: { fontSize: '0.9rem', fontWeight: '500', color: 'var(--text)' },
  exDetail: { fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.04em', marginTop: '4px' },
  exRight: { display: 'flex', alignItems: 'center', gap: '10px' },
  exBadge: {
    fontSize: '0.62rem', fontWeight: '500', color: 'var(--text2)',
    background: 'var(--bg3)', border: '1px solid var(--border2)',
    padding: '5px 12px', borderRadius: '7px',
  },
  exBadgeEmpty: {
    fontSize: '0.62rem', color: 'var(--text3)',
    background: 'transparent', border: '1px solid var(--border)',
    padding: '5px 12px', borderRadius: '7px',
  },
  exDot: {
    width: '8px', height: '8px', borderRadius: '50%',
    border: '1.5px solid var(--border3)',
  },
  exDotDone: {
    background: 'var(--teal)', borderColor: 'var(--teal)',
    boxShadow: '0 0 6px rgba(45,212,191,0.25)',
  },

  // Set logger (expanded)
  logger: {
    background: 'var(--bg2)', border: '1px solid var(--border2)',
    borderRadius: 'var(--radius-md)', padding: '16px 18px', marginBottom: '8px',
    marginTop: '-4px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
  },
  setHeader: {
    display: 'grid', gridTemplateColumns: '32px 1fr 1fr',
    gap: '8px', fontSize: '0.42rem', color: 'var(--text3)',
    letterSpacing: '0.1em', padding: '0 2px', marginBottom: '8px',
  },
  setRow: {
    display: 'grid', gridTemplateColumns: '32px 1fr 1fr',
    gap: '8px', alignItems: 'center', marginBottom: '6px',
  },
  setNum: { fontSize: '0.65rem', color: 'var(--text3)', textAlign: 'center' },
  setInput: {
    background: 'var(--bg3)', border: '1px solid var(--border2)',
    borderRadius: '8px', padding: '10px 12px', color: 'var(--text)',
    fontFamily: 'var(--font-mono)', fontSize: '0.85rem', textAlign: 'center',
    outline: 'none', width: '100%',
  },
  logBtn: {
    width: '100%', padding: '13px', marginTop: '8px',
    borderRadius: 'var(--radius-md)', border: '1px solid var(--teal-border)',
    background: 'var(--teal-dim)', color: 'var(--teal)',
    fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: '600',
    cursor: 'pointer',
  },

  // Add exercise
  addCard: {
    border: '1.5px dashed var(--border2)', borderRadius: 'var(--radius-md)',
    padding: '14px 18px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: '10px', cursor: 'pointer', marginBottom: '8px',
  },

  // Submit
  submitSection: { margin: '8px 24px 40px' },
  submitBtn: {
    width: '100%', padding: '17px', borderRadius: 'var(--radius-md)',
    border: '1px solid var(--cyan-border)',
    background: 'linear-gradient(135deg, rgba(34,211,238,0.10), rgba(45,212,191,0.05))',
    color: 'var(--cyan)', fontFamily: 'var(--font-body)',
    fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15), 0 0 20px rgba(34,211,238,0.04)',
  },
}