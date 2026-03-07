'use client'
import { useState, useEffect } from 'react'
import Shell from '../../components/Shell'
import NomisChat from '../../components/NomisChat'
import { getTodaysWorkout, startWorkout, saveSets, checkAndSavePR, dbRead, dbWrite, getExerciseInfo, suggestExercises } from '../../lib/api'

const WORKOUT_TYPES = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body', 'Rest', 'Cardio']

const EQUIPMENT = [
  'Adjustable Dumbbells (5-55 lbs)',
  'Flat/Incline Bench',
  'Barbell',
  'Pull-up and Dip Station',
  'Bodyweight',
]
const EQUIPMENT_CONTEXT = `Home gym equipment: adjustable dumbbells up to 55lbs, flat/incline bench, barbell (used mainly for deadlifts, RDLs, bent over rows), pull-up and dip station, bodyweight. No cables, no machines, no squat rack. Dumbbell-dominant for pressing movements.`

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
  const [showTypeSelect, setShowTypeSelect] = useState(false)
  const [exerciseInfo, setExerciseInfo] = useState({})
  const [infoLoading, setInfoLoading]   = useState({})
  const [showAddExercise, setShowAddExercise] = useState(false)
  const [suggestions, setSuggestions]   = useState([])
  const [suggestLoading, setSuggestLoading] = useState(false)

  const [selectedDate, setSelectedDate] = useState(new Date())

  useEffect(() => { loadWorkout() }, [selectedDate])

  useEffect(() => {
    if (!sessionStart) return
    const id = setInterval(() => {
      const diff = Math.floor((Date.now() - sessionStart) / 1000)
      const h = String(Math.floor(diff / 3600)).padStart(2, '0')
      const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0')
      const sec = String(diff % 60).padStart(2, '0')
      setElapsed(`${h}:${m}:${sec}`)
    }, 1000)
    return () => clearInterval(id)
  }, [sessionStart])

  async function loadWorkout() {
    setLoading(true)
    const w = await getTodaysWorkout()
    if (w) {
      setWorkout(w)
      setExercises(w.exercises || [])
      const init = {}
      ;(w.exercises || []).forEach(ex => {
        init[ex.id] = Array.from({ length: ex.sets || 4 }, (_, i) => ({ set: i + 1, weight: '', reps: '' }))
      })
      setSetData(init)
    } else {
      setWorkout(null)
      setExercises([])
    }
    setLoading(false)
  }

  async function switchWorkoutType(type) {
    setShowTypeSelect(false)
    if (type === 'Rest') {
      setWorkout({ day: workout?.day, muscle_group: 'Rest', isRest: true, exercises: [] })
      setExercises([])
      return
    }

    setSuggestLoading(true)
    try {
      const results = await suggestExercises(type, 5, EQUIPMENT_CONTEXT)
      const newExercises = results.map((ex, i) => ({
        id: `suggested-${Date.now()}-${i}`,
        exercise_id: null,
        name: ex.name,
        muscle_group: ex.muscle_group || type,
        equipment: ex.equipment || '',
        sets: ex.sets || 4,
        reps: ex.reps || '8-10',
        notes: ex.notes || '',
        done: false,
      }))
      setWorkout({ day: workout?.day, muscle_group: type, exercises: newExercises })
      setExercises(newExercises)
      const init = {}
      newExercises.forEach(ex => {
        init[ex.id] = Array.from({ length: ex.sets || 4 }, (_, i) => ({ set: i + 1, weight: '', reps: '' }))
      })
      setSetData(init)
      setCompletedEx({})
      setActiveIdx(null)
    } catch (err) {
      console.error('Failed to get exercises:', err)
    }
    setSuggestLoading(false)
  }

  async function loadExerciseInfo(ex) {
    if (exerciseInfo[ex.id] || infoLoading[ex.id]) return
    setInfoLoading(prev => ({ ...prev, [ex.id]: true }))
    try {
      const info = await getExerciseInfo(ex.name)
      setExerciseInfo(prev => ({ ...prev, [ex.id]: info }))
    } catch (err) {
      console.error('Exercise info error:', err)
    }
    setInfoLoading(prev => ({ ...prev, [ex.id]: false }))
  }

  async function handleAddExercise() {
    if (!workout?.muscle_group) return
    setShowAddExercise(true)
    setSuggestLoading(true)
    try {
      const currentNames = exercises.map(e => e.name).join(', ')
      const results = await suggestExercises(
        workout.muscle_group, 5,
        `${EQUIPMENT_CONTEXT} Already in workout: ${currentNames}. Suggest different exercises.`
      )
      setSuggestions(results)
    } catch (err) {
      console.error('Suggest error:', err)
    }
    setSuggestLoading(false)
  }

  function addSuggestedExercise(ex) {
    const newEx = {
      id: `added-${Date.now()}`,
      exercise_id: null,
      name: ex.name,
      muscle_group: ex.muscle_group || workout?.muscle_group,
      equipment: ex.equipment || '',
      sets: ex.sets || 4,
      reps: ex.reps || '8-10',
      notes: ex.notes || '',
      done: false,
    }
    setExercises(prev => [...prev, newEx])
    setSetData(prev => ({
      ...prev,
      [newEx.id]: Array.from({ length: newEx.sets || 4 }, (_, i) => ({ set: i + 1, weight: '', reps: '' }))
    }))
    setShowAddExercise(false)
    setSuggestions([])
  }

  function removeExercise(exId) {
    setExercises(prev => prev.filter(e => e.id !== exId))
    setSetData(prev => { const n = { ...prev }; delete n[exId]; return n })
    setCompletedEx(prev => { const n = { ...prev }; delete n[exId]; return n })
    if (activeIdx !== null) setActiveIdx(null)
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
  const dateMain = selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  const dateSub = selectedDate.toLocaleDateString('en-US', { weekday: 'long' })
  const prevDate = (() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) })()
  const nextDate = (() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) })()

  const muscleDesc = {
    'Push': 'Chest / Shoulders / Triceps',
    'Pull': 'Back / Biceps / Rear Delts',
    'Legs': 'Quads / Hamstrings / Glutes / Calves',
    'Upper': 'Chest / Back / Shoulders / Arms',
    'Lower': 'Quads / Hamstrings / Glutes / Calves',
    'Full Body': 'All Major Muscle Groups',
  }

  if (loading) return (
    <Shell title="Train">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--text3)', letterSpacing: '0.12em' }}>
          {suggestLoading ? 'NOMIS IS BUILDING YOUR WORKOUT...' : 'LOADING...'}
        </span>
      </div>
    </Shell>
  )

  return (
    <Shell title="Train">
      <div style={s.page}>

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
        <div style={s.sessionCard} className="card">
          <div style={s.sessionTop} onClick={() => setShowTypeSelect(!showTypeSelect)}>
            <div style={s.sessionInfo}>
              <div style={s.sessionAccent} />
              <div>
                <div style={s.sessionTitle}>
                  {workout?.muscle_group || 'Rest'}
                  {suggestLoading && <span style={s.loadingDot} className="mono"> ...</span>}
                </div>
                <div style={s.sessionSub} className="mono">
                  {muscleDesc[workout?.muscle_group] || 'Tap to select workout type'}
                </div>
              </div>
            </div>
            <div style={s.sessionRight}>
              <span className="badge badge-cyan">{isToday ? 'Today' : 'Viewing'}</span>
              <span className="mono" style={{ fontSize: '0.55rem', color: 'var(--text3)', cursor: 'pointer' }}>
                Change v
              </span>
            </div>
          </div>

          {/* Workout type dropdown */}
          {showTypeSelect && (
            <div style={s.typeDropdown} className="animate-fadeIn">
              {WORKOUT_TYPES.map(type => (
                <button
                  key={type}
                  style={{
                    ...s.typeOption,
                    ...(workout?.muscle_group === type ? s.typeOptionActive : {}),
                  }}
                  onClick={() => switchWorkoutType(type)}
                >
                  <span style={s.typeLabel}>{type}</span>
                  <span className="mono" style={{ fontSize: '0.48rem', color: 'var(--text3)' }}>
                    {muscleDesc[type] || ''}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Progress + stats */}
          {exercises.length > 0 && (
            <>
              <div style={s.progressRow}>
                <div style={s.progressBg}>
                  <div style={{ ...s.progressFill, width: `${progress}%` }} />
                </div>
                <span style={s.progressLabel} className="mono">{completedCount} / {exercises.length}</span>
              </div>
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
            </>
          )}
        </div>

        {/* Rest day */}
        {workout?.isRest && (
          <div style={s.restCard} className="card">
            <div style={s.restTitle}>Rest Day</div>
            <div style={s.restSub} className="mono">Recovery is growth. Ask NOMIS for mobility or stretching ideas.</div>
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
              const info = exerciseInfo[ex.id]
              const isInfoLoading = infoLoading[ex.id]
              const topWeight = setData[ex.id]?.reduce((max, s) => {
                const w = parseFloat(s.weight) || 0
                return w > max ? w : max
              }, 0)
              const topReps = setData[ex.id]?.find(s => parseFloat(s.weight) === topWeight)?.reps || ''

              return (
                <div key={ex.id}>
                  <div
                    style={{
                      ...s.exCard,
                      ...(isDone ? s.exCardDone : {}),
                      ...(isActive ? s.exCardActive : {}),
                    }}
                    onClick={() => {
                      const newIdx = isActive ? null : i
                      setActiveIdx(newIdx)
                      if (newIdx !== null) loadExerciseInfo(ex)
                    }}
                  >
                    <div style={s.exLeft}>
                      <span style={s.exNum} className="mono">{String(i + 1).padStart(2, '0')}</span>
                      <div>
                        <div style={{ ...s.exName, ...(isDone ? { color: 'var(--text2)' } : {}) }}>{ex.name}</div>
                        <div style={s.exDetail} className="mono">
                          {ex.muscle_group} / {ex.equipment || 'Bodyweight'} / {ex.sets || 4} x {ex.reps || '8-10'}
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

                  {/* Expanded panel */}
                  {isActive && (
                    <div style={s.expandedPanel} className="animate-fadeIn">

                      {/* Exercise info */}
                      <div style={s.infoSection}>
                        {isInfoLoading ? (
                          <div className="mono" style={{ fontSize: '0.52rem', color: 'var(--text3)', letterSpacing: '0.08em' }}>
                            Loading info...
                          </div>
                        ) : info ? (
                          <>
                            <div style={s.infoRow}>
                              <span style={s.infoLabel} className="mono">Targets</span>
                              <span style={s.infoValue}>{info.muscles}</span>
                            </div>
                            {info.secondary && (
                              <div style={s.infoRow}>
                                <span style={s.infoLabel} className="mono">Secondary</span>
                                <span style={s.infoValue}>{info.secondary}</span>
                              </div>
                            )}
                            {info.cues?.length > 0 && (
                              <div style={s.cuesSection}>
                                <div style={s.infoLabel} className="mono">Form cues</div>
                                {info.cues.map((c, ci) => (
                                  <div key={ci} style={s.cueItem}>{c}</div>
                                ))}
                              </div>
                            )}
                            {info.tip && (
                              <div style={s.tipBox}>{info.tip}</div>
                            )}
                          </>
                        ) : (
                          <div className="mono" style={{ fontSize: '0.52rem', color: 'var(--text3)' }}>
                            Tap to load exercise details
                          </div>
                        )}
                      </div>

                      {/* Divider */}
                      <div style={s.divider} />

                      {/* Set logger */}
                      {!isDone && (
                        <>
                          <div style={s.setHeader} className="mono">
                            <span>SET</span><span>WEIGHT (lbs)</span><span>REPS</span>
                          </div>
                          {(setData[ex.id] || []).map((set, si) => (
                            <div key={si} style={s.setRow}>
                              <span style={s.setNum} className="mono">{set.set}</span>
                              <input
                                style={s.setInput} className="mono"
                                type="number" inputMode="decimal" placeholder="0"
                                value={set.weight}
                                onChange={e => updateSet(ex.id, si, 'weight', e.target.value)}
                              />
                              <input
                                style={s.setInput} className="mono"
                                type="number" inputMode="numeric" placeholder={ex.reps || '0'}
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
                        </>
                      )}

                      {isDone && (
                        <div className="mono" style={{ fontSize: '0.55rem', color: 'var(--teal)', letterSpacing: '0.06em', textAlign: 'center', padding: '8px 0' }}>
                          Sets logged
                        </div>
                      )}

                      {/* Remove button */}
                      <button style={s.removeBtn} onClick={(e) => { e.stopPropagation(); removeExercise(ex.id) }}>
                        Remove exercise
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Add exercise */}
            <div style={s.addCard} onClick={handleAddExercise}>
              <span className="mono" style={{ fontSize: '0.85rem', color: 'var(--text3)', fontWeight: '300' }}>+</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text3)' }}>Add exercise</span>
            </div>
          </div>
        )}

        {/* Add exercise modal */}
        {showAddExercise && (
          <div style={s.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) { setShowAddExercise(false); setSuggestions([]) } }}>
            <div style={s.modal} className="animate-fadeIn">
              <div style={s.modalHeader}>
                <span style={s.modalTitle}>Add Exercise</span>
                <button style={s.modalClose} onClick={() => { setShowAddExercise(false); setSuggestions([]) }}>
                  <span style={{ position: 'absolute', width: '14px', height: '1.5px', background: 'var(--text3)', transform: 'rotate(45deg)' }} />
                  <span style={{ position: 'absolute', width: '14px', height: '1.5px', background: 'var(--text3)', transform: 'rotate(-45deg)' }} />
                </button>
              </div>
              <div className="mono" style={{ fontSize: '0.5rem', color: 'var(--text3)', letterSpacing: '0.06em', padding: '0 20px 16px' }}>
                {suggestLoading ? 'NOMIS is suggesting exercises...' : `Suggestions for ${workout?.muscle_group} with your equipment`}
              </div>
              <div style={s.suggestionList}>
                {suggestions.map((ex, i) => (
                  <div key={i} style={s.suggestionCard} onClick={() => addSuggestedExercise(ex)}>
                    <div>
                      <div style={s.suggName}>{ex.name}</div>
                      <div style={s.suggMeta} className="mono">
                        {ex.muscle_group} / {ex.equipment} / {ex.sets} x {ex.reps}
                      </div>
                      {ex.notes && <div style={s.suggNote}>{ex.notes}</div>}
                    </div>
                    <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--cyan)', flexShrink: 0 }}>+</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        {exercises.length > 0 && (
          <div style={s.submitSection}>
            <button style={{
              ...s.submitBtn,
              opacity: completedCount === 0 ? 0.4 : 1,
            }}>
              Complete Session
            </button>
          </div>
        )}

      </div>
      <NomisChat pageContext={
        workout
          ? `Train: ${workout.day || dateSub} / ${workout.muscle_group}. Equipment: ${EQUIPMENT.join(', ')}. ${completedCount}/${exercises.length} done. Exercises: ${exercises.map(e => e.name).join(', ')}`
          : 'Rest day'
      } />
    </Shell>
  )
}

const s = {
  page: { padding: '8px 0 40px' },

  prToast: {
    position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
    zIndex: 300, background: 'rgba(45,212,191,0.1)', border: '1px solid var(--teal-border)',
    borderRadius: '12px', padding: '12px 20px', fontFamily: 'var(--font-mono)',
    fontSize: '0.65rem', color: 'var(--teal)', letterSpacing: '0.06em',
    cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
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
    fontFamily: 'var(--font-body)', boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
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
    padding: '20px 20px 16px', display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', cursor: 'pointer',
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
  loadingDot: { color: 'var(--text3)', fontSize: '0.8rem' },

  // Type dropdown
  typeDropdown: {
    padding: '8px 16px 16px', borderTop: '1px solid var(--border)',
    display: 'flex', flexWrap: 'wrap', gap: '6px',
  },
  typeOption: {
    padding: '10px 14px', borderRadius: '10px', background: 'var(--bg3)',
    border: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left',
    display: 'flex', flexDirection: 'column', gap: '2px', transition: 'all 0.15s',
    flex: '0 0 auto',
  },
  typeOptionActive: {
    background: 'var(--cyan-dim)', borderColor: 'var(--cyan-border)',
  },
  typeLabel: { fontSize: '0.82rem', fontWeight: '600', color: 'var(--text)' },

  // Progress
  progressRow: { padding: '0 20px 16px', display: 'flex', alignItems: 'center', gap: '12px' },
  progressBg: { flex: 1, height: '3px', background: 'rgba(255,255,255,0.04)', borderRadius: '2px', overflow: 'hidden' },
  progressFill: {
    height: '100%', borderRadius: '2px',
    background: 'linear-gradient(90deg, var(--cyan), var(--teal))',
    boxShadow: '0 0 8px rgba(34,211,238,0.2)', transition: 'width 0.3s ease',
  },
  progressLabel: { fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.06em', flexShrink: 0 },

  // Stats row
  statsRow: { display: 'flex', borderTop: '1px solid var(--border)' },
  statCell: { flex: 1, padding: '14px 0', textAlign: 'center', borderRight: '1px solid var(--border)' },
  statValue: { fontSize: '0.88rem', fontWeight: '500', letterSpacing: '0.02em', lineHeight: 1 },
  statLabel: { fontSize: '0.42rem', color: 'var(--text3)', letterSpacing: '0.1em', marginTop: '5px', textTransform: 'uppercase' },

  // Rest
  restCard: { margin: '0 24px', padding: '48px 24px', textAlign: 'center' },
  restTitle: { fontSize: '1.1rem', fontWeight: '600', color: 'var(--text2)', marginBottom: '8px' },
  restSub: { fontSize: '0.55rem', color: 'var(--text3)', letterSpacing: '0.04em' },

  // Section
  section: { margin: '0 24px 24px' },
  exHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '0 2px' },

  // Exercise cards
  exCard: {
    background: 'var(--bg2)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)', padding: '16px 18px', marginBottom: '8px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.08)',
    transition: 'border-color 0.15s',
  },
  exCardDone: { borderLeft: '2px solid var(--teal)' },
  exCardActive: { borderColor: 'var(--border3)', background: 'var(--bg3)', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: 0 },
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
    fontSize: '0.62rem', color: 'var(--text3)', background: 'transparent',
    border: '1px solid var(--border)', padding: '5px 12px', borderRadius: '7px',
  },
  exDot: { width: '8px', height: '8px', borderRadius: '50%', border: '1.5px solid var(--border3)' },
  exDotDone: { background: 'var(--teal)', borderColor: 'var(--teal)', boxShadow: '0 0 6px rgba(45,212,191,0.25)' },

  // Expanded panel
  expandedPanel: {
    background: 'var(--bg2)', border: '1px solid var(--border3)', borderTop: 'none',
    borderRadius: '0 0 var(--radius-md) var(--radius-md)',
    padding: '16px 18px', marginBottom: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  },

  // Exercise info
  infoSection: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '4px' },
  infoRow: { display: 'flex', gap: '12px', alignItems: 'flex-start' },
  infoLabel: { fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.1em', width: '70px', flexShrink: 0, paddingTop: '2px', textTransform: 'uppercase' },
  infoValue: { fontSize: '0.8rem', color: 'var(--text2)', lineHeight: 1.4 },
  cuesSection: { display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' },
  cueItem: { fontSize: '0.78rem', color: 'var(--text2)', lineHeight: 1.4, paddingLeft: '8px', borderLeft: '2px solid var(--border2)' },
  tipBox: {
    fontSize: '0.78rem', color: 'var(--cyan)', lineHeight: 1.5,
    background: 'var(--cyan-dim)', border: '1px solid var(--cyan-border)',
    borderRadius: '8px', padding: '10px 12px', marginTop: '4px',
  },
  divider: { height: '1px', background: 'var(--border)', margin: '12px 0' },

  // Set logger
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
    fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer',
  },
  removeBtn: {
    width: '100%', padding: '10px', marginTop: '8px',
    borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
    background: 'transparent', color: 'var(--text3)',
    fontFamily: 'var(--font-mono)', fontSize: '0.52rem', letterSpacing: '0.06em',
    cursor: 'pointer',
  },

  // Add exercise card
  addCard: {
    border: '1.5px dashed var(--border2)', borderRadius: 'var(--radius-md)',
    padding: '14px 18px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: '10px', cursor: 'pointer', marginBottom: '8px',
  },

  // Modal
  modalOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
    zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  },
  modal: {
    width: '100%', maxWidth: '480px', background: 'var(--bg2)',
    border: '1px solid var(--border2)', borderRadius: '20px 20px 0 0',
    maxHeight: '75vh', overflowY: 'auto',
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '20px 20px 8px',
  },
  modalTitle: { fontSize: '1rem', fontWeight: '700', color: '#fff' },
  modalClose: {
    width: '28px', height: '28px', borderRadius: '7px', background: 'transparent',
    border: 'none', position: 'relative', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  suggestionList: { padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: '8px' },
  suggestionCard: {
    padding: '14px 16px', background: 'var(--bg3)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex',
    justifyContent: 'space-between', alignItems: 'center', gap: '12px',
    transition: 'border-color 0.15s',
  },
  suggName: { fontSize: '0.88rem', fontWeight: '500', color: 'var(--text)' },
  suggMeta: { fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.04em', marginTop: '4px' },
  suggNote: { fontSize: '0.72rem', color: 'var(--text2)', marginTop: '6px', lineHeight: 1.4 },

  // Submit
  submitSection: { margin: '8px 24px 40px' },
  submitBtn: {
    width: '100%', padding: '17px', borderRadius: 'var(--radius-md)',
    border: '1px solid var(--cyan-border)',
    background: 'linear-gradient(135deg, rgba(34,211,238,0.10), rgba(45,212,191,0.05))',
    color: 'var(--cyan)', fontFamily: 'var(--font-body)',
    fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15), 0 0 20px rgba(34,211,238,0.04)',
    transition: 'opacity 0.15s',
  },
}