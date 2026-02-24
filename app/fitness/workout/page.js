'use client'
import { useState, useEffect, useRef } from 'react'
import Nav from '../../../components/Nav'
import NomisChat from '../../../components/NomisChat'
import { getTodaysWorkout, startWorkout, saveSets, checkAndSavePR, dbRead, dbWrite, getExerciseInfo, getSwapOptions } from '../../../lib/api'

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
const WORKOUT_TYPES = ['Push','Pull','Legs','Upper','Lower','Full Body','Rest','Cardio']

// ── Body Model ──────────────────────────────────────────────────────────────
function BodyModel({ activeMuscle }) {
  function hit(groups) {
    if (!activeMuscle) return false
    const a = activeMuscle.toLowerCase()
    return groups.some(g => a.includes(g))
  }

  const ON  = (color) => ({ fill: color, opacity: 0.9, filter: `drop-shadow(0 0 5px ${color})`, transition: 'all 0.3s' })
  const OFF = (color) => ({ fill: color, opacity: 0.12, transition: 'all 0.3s' })

  const chest     = hit(['chest','push','pec'])          ? ON('#22d48a') : OFF('#22d48a')
  const shoulders = hit(['shoulder','delt','push','ohp']) ? ON('#a78bfa') : OFF('#a78bfa')
  const triceps   = hit(['tricep','push'])               ? ON('#f97316') : OFF('#f97316')
  const biceps    = hit(['bicep','pull','curl'])          ? ON('#f59e0b') : OFF('#f59e0b')
  const back      = hit(['back','lat','row','pull','trap','rhomboid']) ? ON('#00e5ff') : OFF('#00e5ff')
  const core      = hit(['core','ab','oblique'])         ? ON('#22d48a') : OFF('#22d48a')
  const quads     = hit(['quad','leg','squat','lunge'])  ? ON('#ef4444') : OFF('#ef4444')
  const hams      = hit(['hamstring','leg','deadlift','rdl']) ? ON('#dc2626') : OFF('#dc2626')
  const glutes    = hit(['glute','hip','leg'])           ? ON('#b91c1c') : OFF('#b91c1c')
  const calves    = hit(['calf','leg'])                  ? ON('#fca5a5') : OFF('#fca5a5')
  const forearms  = hit(['forearm','grip','pull'])       ? ON('#fbbf24') : OFF('#fbbf24')

  return (
    <svg viewBox="0 0 160 340" style={{ width: '100%', maxWidth: '160px', height: 'auto' }}>
      {/* ── HEAD ── */}
      <ellipse cx="80" cy="26" rx="18" ry="20" fill="#1a2035" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5"/>
      {/* ears */}
      <ellipse cx="62" cy="26" rx="4" ry="6" fill="#151c2e"/>
      <ellipse cx="98" cy="26" rx="4" ry="6" fill="#151c2e"/>
      {/* NECK */}
      <rect x="72" y="44" width="16" height="13" rx="3" fill="#1a2035" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5"/>
      {/* TRAPS */}
      <path d="M72 44 L55 58 L65 62 L80 57 L95 62 L105 58 L88 44 Z" {...back}/>

      {/* ── TORSO ── */}
      {/* base */}
      <path d="M46 58 L114 58 L118 160 L42 160 Z" fill="#0f1525" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5"/>

      {/* CHEST left */}
      <path d="M50 62 L80 62 L80 98 L46 100 Z" {...chest}/>
      {/* CHEST right */}
      <path d="M80 62 L110 62 L114 100 L80 98 Z" {...chest}/>
      {/* chest line */}
      <line x1="80" y1="62" x2="80" y2="98" stroke="rgba(0,0,0,0.3)" strokeWidth="0.8"/>

      {/* SHOULDERS */}
      <ellipse cx="42" cy="66" rx="12" ry="15" {...shoulders}/>
      <ellipse cx="118" cy="66" rx="12" ry="15" {...shoulders}/>

      {/* LATS */}
      <path d="M46 68 L50 62 L46 58 L28 76 L34 110 L46 112 Z" {...back}/>
      <path d="M114 68 L110 62 L114 58 L132 76 L126 110 L114 112 Z" {...back}/>

      {/* ABS — 3 rows × 2 cols */}
      {[0,1,2].map(row => (
        <g key={row}>
          <rect x="58" y={104+row*17} width="18" height="13" rx="3" {...core}/>
          <rect x="84" y={104+row*17} width="18" height="13" rx="3" {...core}/>
        </g>
      ))}
      {/* serratus */}
      {[0,1,2].map(i => (
        <g key={i}>
          <path d={`M46 ${96+i*12} L56 ${100+i*12}`} stroke="#22d48a" strokeWidth="1.5" {...core} fill="none" opacity={core.opacity*0.6}/>
          <path d={`M114 ${96+i*12} L104 ${100+i*12}`} stroke="#22d48a" strokeWidth="1.5" {...core} fill="none" opacity={core.opacity*0.6}/>
        </g>
      ))}

      {/* ── ARMS ── */}
      {/* Upper arm backs (triceps) */}
      <path d="M30 70 L40 70 L38 114 L28 114 Z" {...triceps}/>
      <path d="M130 70 L120 70 L122 114 L132 114 Z" {...triceps}/>
      {/* Upper arm fronts (biceps) */}
      <path d="M30 70 L40 70 L42 114 L32 114 Z" {...biceps}/>
      <path d="M130 70 L120 70 L118 114 L128 114 Z" {...biceps}/>

      {/* FOREARMS */}
      <path d="M28 116 L40 116 L37 150 L26 150 Z" {...forearms}/>
      <path d="M132 116 L120 116 L123 150 L134 150 Z" {...forearms}/>
      {/* Hands */}
      <ellipse cx="32" cy="157" rx="8" ry="10" fill="#1a2035" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5"/>
      <ellipse cx="128" cy="157" rx="8" ry="10" fill="#1a2035" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5"/>

      {/* ── LOWER BODY ── */}
      {/* Hips/pelvis */}
      <path d="M42 160 L118 160 L115 188 L45 188 Z" fill="#0d1422" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5"/>
      {/* GLUTES (visible from front as hip flexors) */}
      <path d="M46 160 L80 162 L114 160 L115 188 L45 188 Z" {...glutes}/>

      {/* QUADS */}
      <path d="M46 188 L78 188 L74 262 L40 262 Z" {...quads}/>
      <path d="M114 188 L82 188 L86 262 L120 262 Z" {...quads}/>
      {/* quad separation */}
      <path d="M56 188 L54 262" stroke="rgba(0,0,0,0.25)" strokeWidth="0.8"/>
      <path d="M104 188 L106 262" stroke="rgba(0,0,0,0.25)" strokeWidth="0.8"/>

      {/* HAMSTRINGS (behind quads, slightly offset) */}
      <path d="M44 188 L78 188 L74 262 L40 262 Z" {...hams} opacity={hams.opacity * 0.5}/>
      <path d="M116 188 L82 188 L86 262 L120 262 Z" {...hams} opacity={hams.opacity * 0.5}/>

      {/* Knees */}
      <ellipse cx="57" cy="265" rx="14" ry="9" fill="#1a2035" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5"/>
      <ellipse cx="103" cy="265" rx="14" ry="9" fill="#1a2035" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5"/>

      {/* CALVES */}
      <path d="M44 274 L68 274 L64 318 L48 318 Z" {...calves}/>
      <path d="M116 274 L92 274 L96 318 L112 318 Z" {...calves}/>

      {/* Ankles/Feet */}
      <ellipse cx="56" cy="322" rx="13" ry="6" fill="#1a2035" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5"/>
      <ellipse cx="104" cy="322" rx="13" ry="6" fill="#1a2035" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5"/>

      {/* Active label */}
      {activeMuscle && (
        <text x="80" y="336" textAnchor="middle"
          style={{ fontFamily:'var(--font-mono)', fontSize:'6px', letterSpacing:'0.8px', textTransform:'uppercase',
            fill: chest.opacity > 0.5 ? '#22d48a' : shoulders.opacity > 0.5 ? '#a78bfa' : back.opacity > 0.5 ? '#00e5ff' : quads.opacity > 0.5 ? '#ef4444' : '#22d48a' }}>
          {activeMuscle.toUpperCase()}
        </text>
      )}
    </svg>
  )
}

// ── Exercise Info Dropdown ──────────────────────────────────────────────────
function ExerciseInfo({ exercise }) {
  const [open, setOpen]       = useState(false)
  const [info, setInfo]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [lastEx, setLastEx]   = useState(null)

  useEffect(() => {
    if (lastEx !== exercise.id) {
      setOpen(false)
      setInfo(null)
      setLastEx(exercise.id)
    }
  }, [exercise.id])

  async function load() {
    if (open) { setOpen(false); return }
    setOpen(true)
    if (info) return
    setLoading(true)
    const result = await getExerciseInfo(exercise.name)
    setInfo(result)
    setLoading(false)
  }

  return (
    <div style={ei.wrap}>
      <button style={ei.btn} onClick={load}>
        <span>MORE INFO</span>
        <span style={{ transform: open ? 'rotate(180deg)' : 'none', transition:'transform 0.2s', display:'inline-block' }}>▾</span>
      </button>
      {open && (
        <div style={ei.panel} className="animate-fadeIn">
          {loading ? (
            <div style={ei.loading}>Loading from NOMIS...</div>
          ) : info && (
            <>
              <div style={ei.row}><span style={ei.lbl}>PRIMARY</span><span style={ei.val}>{info.muscles}</span></div>
              <div style={ei.row}><span style={ei.lbl}>SECONDARY</span><span style={ei.val}>{info.secondary}</span></div>
              <div style={ei.section}>
                <div style={ei.sectionLbl}>FORM CUES</div>
                {info.cues?.map((c,i) => <div key={i} style={ei.bullet}>· {c}</div>)}
              </div>
              <div style={ei.section}>
                <div style={ei.sectionLbl}>COMMON MISTAKES</div>
                {info.mistakes?.map((m,i) => <div key={i} style={{ ...ei.bullet, color:'var(--red)' }}>✗ {m}</div>)}
              </div>
              {info.variations?.length > 0 && (
                <div style={ei.section}>
                  <div style={ei.sectionLbl}>VARIATIONS</div>
                  {info.variations.map((v,i) => <div key={i} style={ei.bullet}>→ {v}</div>)}
                </div>
              )}
              {info.tip && <div style={ei.tip}>💡 {info.tip}</div>}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Swap Lifts Modal ────────────────────────────────────────────────────────
function SwapModal({ exercises, onClose, onSwap }) {
  const [selected, setSelected]     = useState([])
  const [suggestions, setSuggestions] = useState(null)
  const [loading, setLoading]       = useState(false)
  const [replacing, setReplacing]   = useState(null) // which exercise we're replacing

  function toggle(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function getSuggestions() {
    if (!selected.length) return
    setLoading(true)
    try {
      // Get swap options for each selected exercise in parallel
      const toSwap = exercises.filter(e => selected.includes(e.id))
      const results = await Promise.all(
        toSwap.map(ex => getSwapOptions(ex.name, `Target muscle: ${ex.muscle_group}`))
      )
      const swaps = toSwap.map((ex, i) => ({
        original: ex.name,
        options: results[i].map(r => ({ name: r.name, equipment: r.equipment, difficulty: r.difficulty, similarity: r.similarity }))
      }))
      setSuggestions({ swaps })
    } catch (e) {
      console.error('Swap error:', e)
    }
    setLoading(false)
  }

  return (
    <div style={sw.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={sw.modal} className="animate-fadeIn">
        <div style={sw.header}>
          <div style={sw.title}>SWAP LIFTS</div>
          <button style={sw.close} onClick={onClose}>✕</button>
        </div>

        {!suggestions ? (
          <>
            <div style={sw.sub}>Select exercises to swap out</div>
            <div style={sw.list}>
              {exercises.map(ex => (
                <div key={ex.id} style={sw.exRow} onClick={() => toggle(ex.id)}>
                  <div style={{ ...sw.checkbox, ...(selected.includes(ex.id) ? sw.checkboxOn : {}) }}>
                    {selected.includes(ex.id) && <span style={sw.checkMark}>✓</span>}
                  </div>
                  <div style={sw.exInfo}>
                    <div style={sw.exName}>{ex.name}</div>
                    <div style={sw.exSub}>{ex.sets}×{ex.reps} · {ex.muscle_group}</div>
                  </div>
                </div>
              ))}
            </div>
            <button
              style={{ ...sw.swapBtn, opacity: selected.length ? 1 : 0.4 }}
              onClick={getSuggestions}
              disabled={!selected.length || loading}
            >
              {loading ? '● GETTING SUGGESTIONS...' : `GET ALTERNATIVES (${selected.length} selected)`}
            </button>
          </>
        ) : (
          <>
            <div style={sw.sub}>Choose your replacements</div>
            <div style={sw.suggList}>
              {suggestions.swaps?.map((swap, i) => (
                <div key={i} style={sw.swapGroup}>
                  <div style={sw.swapOriginal}>Replacing: <span style={{ color:'var(--text2)' }}>{swap.original}</span></div>
                  <div style={sw.options}>
                    {swap.options?.map((opt, j) => {
                      const name = typeof opt === 'string' ? opt : opt.name
                      const sub  = typeof opt === 'object' ? `${opt.equipment || ''} · ${opt.difficulty || ''}`.trim().replace(/^·\s*|·\s*$/, '') : ''
                      return (
                        <button
                          key={j}
                          style={{ ...sw.optBtn, ...(replacing === `${i}-${j}` ? sw.optBtnActive : {}) }}
                          onClick={() => {
                            setReplacing(`${i}-${j}`)
                            onSwap(swap.original, name)
                          }}
                        >
                          <span>{name}</span>
                          {sub && <span style={{ fontSize:'0.44rem', color:'var(--text3)', display:'block', marginTop:'2px' }}>{sub}</span>}
                          {replacing === `${i}-${j}` && <span style={sw.optCheck}> ✓</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div style={sw.actionRow}>
              <button style={sw.backBtn} onClick={() => { setSuggestions(null); setSelected([]) }}>← Back</button>
              <button style={sw.doneBtn} onClick={onClose}>Done</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Body Photo ──────────────────────────────────────────────────────────────
function BodyPhotoUpload({ onAnalysis }) {
  const [photos, setPhotos]     = useState([])
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const fileRef                 = useRef()

  useEffect(() => {
    const saved = localStorage.getItem('nomis_body_photos')
    if (saved) setPhotos(JSON.parse(saved))
  }, [])

  async function handleUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target.result
      const newPhoto = { date: new Date().toISOString().split('T')[0], src: base64 }
      const updated = [newPhoto, ...photos].slice(0, 6)
      setPhotos(updated)
      localStorage.setItem('nomis_body_photos', JSON.stringify(updated))
      await analyzePhoto(base64)
    }
    reader.readAsDataURL(file)
  }

  async function analyzePhoto(base64) {
    setAnalyzing(true)
    try {
      const MIDDLEWARE_URL = process.env.NEXT_PUBLIC_MIDDLEWARE_URL
      const NOMIS_KEY = process.env.NEXT_PUBLIC_NOMIS_KEY
      const res = await fetch(`${MIDDLEWARE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-nomis-key': NOMIS_KEY },
        body: JSON.stringify({
          message: `Analyze this physique photo. This person is on a body recomp program. 
Give me:
1. Areas that appear well developed
2. Areas that need more focus
3. Top 3 muscle groups to prioritize
4. One specific workout recommendation

Be direct and specific. No disclaimers.`,
          image: base64,
        })
      })
      const data = await res.json()
      if (data.response) {
        setAnalysis(data.response)
        onAnalysis?.(data.response)
      }
    } catch { setAnalysis('Could not analyze photo. Try again.') }
    setAnalyzing(false)
  }

  return (
    <div style={ph.wrap}>
      <div style={ph.header}>
        <div style={ph.title}>BODY PROGRESS PHOTOS</div>
        <button style={ph.uploadBtn} onClick={() => fileRef.current?.click()}>
          + Add Photo
        </button>
        <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleUpload} />
      </div>

      {/* Photo grid */}
      {photos.length > 0 && (
        <div style={ph.grid}>
          {photos.map((p, i) => (
            <div key={i} style={ph.photoWrap}>
              <img src={p.src} alt={p.date} style={ph.photo} />
              <div style={ph.photoDate}>{p.date}</div>
            </div>
          ))}
        </div>
      )}

      {photos.length === 0 && (
        <div style={ph.empty} onClick={() => fileRef.current?.click()}>
          <div style={ph.emptyIcon}>📸</div>
          <div style={ph.emptyText}>Upload a photo — NOMIS will analyze your physique and suggest what to focus on</div>
        </div>
      )}

      {analyzing && (
        <div style={ph.analyzing} className="animate-pulse">NOMIS is analyzing your photo...</div>
      )}

      {analysis && (
        <div style={ph.analysis}>
          <div style={ph.analysisLabel}>// NOMIS ANALYSIS</div>
          <div style={ph.analysisText}>{analysis}</div>
        </div>
      )}
    </div>
  )
}

// ── Main Workout Page ───────────────────────────────────────────────────────
export default function Workout() {
  const [workout, setWorkout]         = useState(null)
  const [workoutId, setWorkoutId]     = useState(null)
  const [exercises, setExercises]     = useState([])
  const [activeIdx, setActiveIdx]     = useState(0)
  const [setData, setSetData]         = useState({})
  const [completedEx, setCompletedEx] = useState({})
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [prToast, setPrToast]         = useState(null)
  const [tab, setTab]                 = useState('workout')
  const [showSwap, setShowSwap]       = useState(false)
  const [weekSchedule, setWeekSchedule] = useState(null)
  const [editingDay, setEditingDay]   = useState(null)

  useEffect(() => { loadWorkout(); loadSchedule() }, [])

  async function loadWorkout() {
    const w = await getTodaysWorkout()
    if (w) {
      setWorkout(w)
      setExercises(w.exercises)
      const init = {}
      w.exercises.forEach(ex => {
        init[ex.id] = Array.from({ length: ex.sets }, (_, i) => ({ set: i+1, weight:'', reps:'' }))
      })
      setSetData(init)
    }
    setLoading(false)
  }

  async function loadSchedule() {
    const programs = await dbRead('programs', { active:true })
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
    if (!workout || workoutId) return workoutId
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
      [exId]: prev[exId].map((s,i) => i === setIdx ? { ...s, [field]: val } : s)
    }))
  }

  function handleSwap(originalName, newName) {
    setExercises(prev => prev.map(ex =>
      ex.name === originalName ? { ...ex, name: newName } : ex
    ))
  }

  const activeEx       = exercises[activeIdx]
  const completedCount = Object.keys(completedEx).length
  const progress       = exercises.length ? (completedCount / exercises.length) * 100 : 0

  const pageContext = workout
    ? `Workout: ${workout.day} — ${workout.muscle_group}. Exercises: ${exercises.map(e=>e.name).join(', ')}. Progress: ${completedCount}/${exercises.length}.`
    : 'No workout scheduled today.'

  if (loading) return (
    <div className="app-shell"><Nav />
      <main className="main-content" style={{ display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100dvh' }}>
        <div style={{ fontFamily:'var(--font-mono)',fontSize:'0.7rem',color:'var(--text3)',letterSpacing:'0.15em' }} className="animate-pulse">
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
            <div style={s.prToast} onClick={() => setPrToast(null)}>{prToast}</div>
          )}

          {/* Swap Modal */}
          {showSwap && (
            <SwapModal
              exercises={exercises}
              onClose={() => setShowSwap(false)}
              onSwap={handleSwap}
            />
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
              <div style={s.progressBadge}>
                <div style={s.progressNum}>{completedCount}<span style={s.progressOf}>/{exercises.length}</span></div>
                <div style={s.progressLbl}>DONE</div>
              </div>
            )}
          </header>
          <div className="progress-track">
            <div className="progress-fill" style={{ width:`${progress}%`, background:'var(--green)', color:'var(--green)' }} />
          </div>

          {/* Tabs */}
          <div style={s.tabs}>
            {[['workout','TODAY'],['schedule','SCHEDULE'],['photos','PHOTOS']].map(([t,l]) => (
              <button key={t} style={{ ...s.tab, ...(tab===t ? s.tabActive:{}) }} onClick={() => setTab(t)}>{l}</button>
            ))}
          </div>

          {/* ── WORKOUT TAB ── */}
          {tab === 'workout' && (
            <div style={s.body}>
              {!workout ? (
                <div style={s.restDay}>
                  <div style={s.restIcon}>◎</div>
                  <div style={s.restTitle}>REST DAY</div>
                  <div style={s.restSub}>Recovery is growth. Ask NOMIS for mobility or active recovery ideas.</div>
                </div>
              ) : (
                <>
                  <div style={s.layout}>
                    {/* Left — exercise list */}
                    <div style={s.leftCol}>
                      <div style={s.colLabel}>// EXERCISES</div>
                      {exercises.map((ex, i) => (
                        <div key={ex.id} className="ex-row"
                          onClick={() => setActiveIdx(i)}
                          style={{ ...s.exRow, ...(i===activeIdx ? s.exRowActive:{}), ...(completedEx[ex.id] ? s.exRowDone:{}) }}>
                          <div style={s.exCheck}>
                            {completedEx[ex.id]
                              ? <span style={{ color:'var(--green)' }}>✓</span>
                              : <span style={{ color:'var(--text4)' }}>○</span>}
                          </div>
                          <div style={s.exInfoBox}>
                            <div style={s.exName}>{ex.name}</div>
                            <div style={s.exSub}>{ex.sets}×{ex.reps} · {ex.muscle_group}</div>
                          </div>
                        </div>
                      ))}

                      {/* Swap button */}
                      <button style={s.swapBtn} onClick={() => setShowSwap(true)}>
                        ⇄ SWAP LIFTS
                      </button>
                    </div>

                    {/* Right — body model + logger */}
                    <div style={s.rightCol}>
                      <div style={s.bodyModelWrap}>
                        <BodyModel activeMuscle={activeEx?.muscle_group || workout.muscle_group} />
                      </div>

                      {activeEx && (
                        <div style={s.logger}>
                          <div style={s.loggerTitle}>{activeEx.name}</div>
                          <div style={s.loggerSub}>{activeEx.sets} sets × {activeEx.reps} reps</div>
                          {activeEx.notes && <div style={s.loggerNotes}>💡 {activeEx.notes}</div>}

                          <div style={s.setHeader}>
                            <span>SET</span><span>WEIGHT (lbs)</span><span>REPS</span>
                          </div>
                          {(setData[activeEx.id]||[]).map((set,i) => (
                            <div key={i} style={s.setRow}>
                              <span style={s.setNum}>{set.set}</span>
                              <input style={s.setInput} type="number" placeholder="0"
                                value={set.weight} onChange={e => updateSet(activeEx.id,i,'weight',e.target.value)} />
                              <input style={s.setInput} type="number" placeholder={activeEx.reps}
                                value={set.reps} onChange={e => updateSet(activeEx.id,i,'reps',e.target.value)} />
                            </div>
                          ))}

                          <button
                            style={{ ...s.completeBtn, opacity: saving ? 0.5 : 1,
                              background: completedEx[activeEx.id] ? 'rgba(34,212,138,0.15)' : 'var(--green-dim)' }}
                            onClick={() => handleCompleteExercise(activeEx)}
                            disabled={saving || completedEx[activeEx.id]}
                          >
                            {completedEx[activeEx.id] ? '✓ LOGGED' : saving ? '● SAVING...' : '+ LOG SETS'}
                          </button>

                          {/* Exercise info dropdown */}
                          <ExerciseInfo exercise={activeEx} />
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── SCHEDULE TAB ── */}
          {tab === 'schedule' && (
            <div style={s.body}>
              <div style={s.colLabel}>// WEEKLY SCHEDULE — tap to change</div>
              {DAYS.map(day => (
                <div key={day} style={s.schedRow}>
                  <div style={s.schedDay}>{day.slice(0,3).toUpperCase()}</div>
                  {editingDay === day ? (
                    <div style={s.typeGrid}>
                      {WORKOUT_TYPES.map(type => (
                        <button key={type}
                          style={{ ...s.typeBtn, ...(weekSchedule?.[day]===type ? s.typeBtnActive:{}) }}
                          onClick={() => { setWeekSchedule(prev=>({...prev,[day]:type})); setEditingDay(null) }}>
                          {type}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div style={s.schedType} onClick={() => setEditingDay(day)}>
                      <span style={{ color: weekSchedule?.[day]==='Rest' ? 'var(--text4)' : 'var(--green)' }}>
                        {weekSchedule?.[day] || 'Rest'}
                      </span>
                      <span style={s.schedEdit}>tap to edit</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── PHOTOS TAB ── */}
          {tab === 'photos' && (
            <div style={s.body}>
              <BodyPhotoUpload onAnalysis={(a) => console.log('Analysis:', a)} />
            </div>
          )}

        </div>
      </main>
      <NomisChat pageContext={pageContext} />
    </div>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────────
const s = {
  page: { minHeight:'100dvh', background:'var(--bg)', paddingBottom:'40px', position:'relative' },
  prToast: { position:'fixed', top:'20px', right:'20px', zIndex:300, background:'rgba(34,212,138,0.12)', border:'1px solid rgba(34,212,138,0.4)', borderRadius:'12px', padding:'12px 18px', fontFamily:'var(--font-display)', fontSize:'0.85rem', color:'var(--green)', cursor:'pointer', boxShadow:'0 4px 20px rgba(34,212,138,0.2)' },
  header: { display:'flex', alignItems:'flex-start', justifyContent:'space-between', padding:'24px 24px 18px', borderBottom:'1px solid var(--border)' },
  progressBadge: { display:'flex', flexDirection:'column', alignItems:'center', gap:'3px' },
  progressNum: { fontFamily:'var(--font-mono)', fontSize:'1.3rem', fontWeight:'500', color:'var(--green)', lineHeight:1 },
  progressOf: { fontSize:'0.7rem', color:'var(--text3)' },
  progressLbl: { fontFamily:'var(--font-mono)', fontSize:'0.42rem', color:'var(--text4)', letterSpacing:'0.12em' },
  tabs: { display:'flex', borderBottom:'1px solid var(--border)' },
  tab: { flex:1, padding:'13px', background:'transparent', border:'none', borderBottom:'2px solid transparent', fontFamily:'var(--font-mono)', fontSize:'0.55rem', color:'var(--text3)', letterSpacing:'0.1em', cursor:'pointer', transition:'all 0.15s' },
  tabActive: { color:'var(--green)', borderBottomColor:'var(--green)' },
  body: { padding:'20px' },
  restDay: { display:'flex', flexDirection:'column', alignItems:'center', gap:'12px', padding:'60px 20px', textAlign:'center' },
  restIcon: { fontSize:'2.5rem', color:'var(--text4)', opacity:0.3 },
  restTitle: { fontFamily:'var(--font-display)', fontSize:'1.5rem', fontWeight:'700', letterSpacing:'0.2em', color:'var(--text3)' },
  restSub: { fontFamily:'var(--font-mono)', fontSize:'0.6rem', color:'var(--text4)', letterSpacing:'0.06em', maxWidth:'260px', lineHeight:1.6 },
  layout: { display:'grid', gridTemplateColumns:'1fr 1.5fr', gap:'16px' },
  leftCol: { display:'flex', flexDirection:'column', gap:'5px' },
  rightCol: { display:'flex', flexDirection:'column', gap:'12px' },
  colLabel: { fontFamily:'var(--font-mono)', fontSize:'0.48rem', color:'var(--text3)', letterSpacing:'0.14em', marginBottom:'6px' },
  exRow: { display:'flex', alignItems:'center', gap:'10px', padding:'9px 10px', borderRadius:'10px', border:'1px solid transparent', cursor:'pointer', transition:'all 0.15s' },
  exRowActive: { background:'var(--green-dim)', border:'1px solid rgba(34,212,138,0.2)' },
  exRowDone: { opacity:0.4 },
  exCheck: { fontFamily:'var(--font-mono)', fontSize:'0.75rem', width:'16px', flexShrink:0 },
  exInfoBox: { flex:1, minWidth:0 },
  exName: { fontFamily:'var(--font-display)', fontSize:'0.8rem', fontWeight:'600', color:'var(--text)', lineHeight:1.2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
  exSub: { fontFamily:'var(--font-mono)', fontSize:'0.43rem', color:'var(--text3)', marginTop:'2px', letterSpacing:'0.04em' },
  swapBtn: { marginTop:'8px', padding:'10px', background:'rgba(255,255,255,0.03)', border:'1px solid var(--border2)', borderRadius:'9px', color:'var(--text2)', fontFamily:'var(--font-mono)', fontSize:'0.55rem', letterSpacing:'0.1em', cursor:'pointer', transition:'all 0.15s', width:'100%' },
  bodyModelWrap: { display:'flex', justifyContent:'center' },
  logger: { background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'12px', padding:'16px', display:'flex', flexDirection:'column', gap:'8px' },
  loggerTitle: { fontFamily:'var(--font-display)', fontSize:'1rem', fontWeight:'700', color:'var(--text)', lineHeight:1 },
  loggerSub: { fontFamily:'var(--font-mono)', fontSize:'0.5rem', color:'var(--text3)', letterSpacing:'0.06em' },
  loggerNotes: { fontFamily:'var(--font-display)', fontSize:'0.75rem', color:'var(--text3)', background:'rgba(255,255,255,0.02)', borderRadius:'7px', padding:'8px 10px', lineHeight:1.4 },
  setHeader: { display:'grid', gridTemplateColumns:'26px 1fr 1fr', gap:'8px', fontFamily:'var(--font-mono)', fontSize:'0.42rem', color:'var(--text4)', letterSpacing:'0.1em', padding:'0 2px' },
  setRow: { display:'grid', gridTemplateColumns:'26px 1fr 1fr', gap:'8px', alignItems:'center' },
  setNum: { fontFamily:'var(--font-mono)', fontSize:'0.65rem', color:'var(--text3)', textAlign:'center' },
  setInput: { background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:'7px', padding:'8px 10px', color:'var(--text)', fontFamily:'var(--font-mono)', fontSize:'0.82rem', textAlign:'center', outline:'none', width:'100%', transition:'all 0.15s' },
  completeBtn: { width:'100%', padding:'11px', background:'var(--green-dim)', border:'1px solid var(--green-glow)', borderRadius:'9px', color:'var(--green)', fontFamily:'var(--font-display)', fontSize:'0.85rem', fontWeight:'700', letterSpacing:'0.1em', cursor:'pointer', transition:'all 0.15s' },
  schedRow: { display:'flex', alignItems:'center', gap:'14px', padding:'12px 0', borderBottom:'1px solid var(--border)' },
  schedDay: { fontFamily:'var(--font-mono)', fontSize:'0.58rem', color:'var(--text3)', letterSpacing:'0.1em', width:'36px', flexShrink:0 },
  schedType: { flex:1, display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer' },
  schedEdit: { fontFamily:'var(--font-mono)', fontSize:'0.44rem', color:'var(--text4)', letterSpacing:'0.06em' },
  typeGrid: { flex:1, display:'flex', flexWrap:'wrap', gap:'6px' },
  typeBtn: { padding:'6px 10px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'7px', color:'var(--text3)', fontFamily:'var(--font-mono)', fontSize:'0.52rem', letterSpacing:'0.06em', cursor:'pointer', transition:'all 0.15s' },
  typeBtnActive: { background:'var(--green-dim)', borderColor:'rgba(34,212,138,0.35)', color:'var(--green)' },
}

const ei = {
  wrap: { borderTop:'1px solid var(--border)', paddingTop:'8px', marginTop:'4px' },
  btn: { display:'flex', alignItems:'center', gap:'6px', background:'transparent', border:'none', color:'var(--text3)', fontFamily:'var(--font-mono)', fontSize:'0.5rem', letterSpacing:'0.1em', cursor:'pointer', padding:'4px 0' },
  panel: { background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'10px', padding:'14px', marginTop:'8px', display:'flex', flexDirection:'column', gap:'8px' },
  loading: { fontFamily:'var(--font-mono)', fontSize:'0.52rem', color:'var(--text3)', letterSpacing:'0.08em' },
  row: { display:'flex', gap:'10px' },
  lbl: { fontFamily:'var(--font-mono)', fontSize:'0.44rem', color:'var(--text4)', letterSpacing:'0.1em', width:'72px', flexShrink:0, paddingTop:'2px' },
  val: { fontFamily:'var(--font-display)', fontSize:'0.8rem', color:'var(--text2)', lineHeight:1.4 },
  section: { display:'flex', flexDirection:'column', gap:'4px' },
  sectionLbl: { fontFamily:'var(--font-mono)', fontSize:'0.44rem', color:'var(--text4)', letterSpacing:'0.1em', marginBottom:'2px' },
  bullet: { fontFamily:'var(--font-display)', fontSize:'0.78rem', color:'var(--text2)', lineHeight:1.4, paddingLeft:'4px' },
  tip: { fontFamily:'var(--font-display)', fontSize:'0.8rem', color:'var(--green)', background:'rgba(34,212,138,0.06)', borderRadius:'7px', padding:'8px 10px', lineHeight:1.4 },
}

const sw = {
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:400, display:'flex', alignItems:'flex-end', justifyContent:'center', backdropFilter:'blur(4px)' },
  modal: { width:'100%', maxWidth:'520px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'20px 20px 0 0', padding:'24px', maxHeight:'80vh', overflowY:'auto', display:'flex', flexDirection:'column', gap:'16px' },
  header: { display:'flex', alignItems:'center', justifyContent:'space-between' },
  title: { fontFamily:'var(--font-display)', fontSize:'1.2rem', fontWeight:'700', letterSpacing:'0.15em', color:'#fff' },
  close: { background:'transparent', border:'none', color:'var(--text3)', fontSize:'0.9rem', cursor:'pointer', padding:'4px 8px' },
  sub: { fontFamily:'var(--font-mono)', fontSize:'0.52rem', color:'var(--text3)', letterSpacing:'0.08em', marginTop:'-8px' },
  list: { display:'flex', flexDirection:'column', gap:'6px' },
  exRow: { display:'flex', alignItems:'center', gap:'12px', padding:'12px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'10px', cursor:'pointer', transition:'all 0.15s' },
  checkbox: { width:'20px', height:'20px', borderRadius:'5px', border:'1px solid var(--border2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.15s' },
  checkboxOn: { background:'var(--green-dim)', borderColor:'rgba(34,212,138,0.4)' },
  checkMark: { color:'var(--green)', fontSize:'0.7rem' },
  exInfo: {},
  exName: { fontFamily:'var(--font-display)', fontSize:'0.9rem', fontWeight:'600', color:'var(--text)' },
  exSub: { fontFamily:'var(--font-mono)', fontSize:'0.46rem', color:'var(--text3)', letterSpacing:'0.04em' },
  swapBtn: { width:'100%', padding:'13px', background:'var(--green-dim)', border:'1px solid var(--green-glow)', borderRadius:'10px', color:'var(--green)', fontFamily:'var(--font-display)', fontSize:'0.88rem', fontWeight:'700', letterSpacing:'0.1em', cursor:'pointer', transition:'all 0.15s' },
  suggList: { display:'flex', flexDirection:'column', gap:'16px' },
  swapGroup: { display:'flex', flexDirection:'column', gap:'8px' },
  swapOriginal: { fontFamily:'var(--font-mono)', fontSize:'0.5rem', color:'var(--text3)', letterSpacing:'0.08em' },
  options: { display:'flex', flexDirection:'column', gap:'6px' },
  optBtn: { padding:'11px 14px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'9px', color:'var(--text)', fontFamily:'var(--font-display)', fontSize:'0.88rem', fontWeight:'500', cursor:'pointer', transition:'all 0.15s', textAlign:'left' },
  optBtnActive: { background:'var(--green-dim)', borderColor:'rgba(34,212,138,0.35)', color:'var(--green)' },
  optCheck: { color:'var(--green)' },
  actionRow: { display:'flex', gap:'10px' },
  backBtn: { flex:1, padding:'12px', background:'transparent', border:'1px solid var(--border)', borderRadius:'9px', color:'var(--text3)', fontFamily:'var(--font-mono)', fontSize:'0.55rem', letterSpacing:'0.1em', cursor:'pointer' },
  doneBtn: { flex:1, padding:'12px', background:'var(--green-dim)', border:'1px solid var(--green-glow)', borderRadius:'9px', color:'var(--green)', fontFamily:'var(--font-display)', fontSize:'0.88rem', fontWeight:'700', letterSpacing:'0.1em', cursor:'pointer' },
}

const ph = {
  wrap: { display:'flex', flexDirection:'column', gap:'16px' },
  header: { display:'flex', alignItems:'center', justifyContent:'space-between' },
  title: { fontFamily:'var(--font-mono)', fontSize:'0.52rem', color:'var(--text3)', letterSpacing:'0.15em' },
  uploadBtn: { padding:'8px 14px', background:'var(--green-dim)', border:'1px solid var(--green-glow)', borderRadius:'8px', color:'var(--green)', fontFamily:'var(--font-mono)', fontSize:'0.52rem', letterSpacing:'0.08em', cursor:'pointer' },
  grid: { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px' },
  photoWrap: { position:'relative', borderRadius:'10px', overflow:'hidden', border:'1px solid var(--border)' },
  photo: { width:'100%', aspectRatio:'3/4', objectFit:'cover', display:'block' },
  photoDate: { position:'absolute', bottom:0, left:0, right:0, padding:'4px 6px', background:'rgba(0,0,0,0.6)', fontFamily:'var(--font-mono)', fontSize:'0.4rem', color:'var(--text3)', letterSpacing:'0.06em' },
  empty: { display:'flex', flexDirection:'column', alignItems:'center', gap:'10px', padding:'40px 20px', background:'var(--bg2)', border:'1px dashed var(--border2)', borderRadius:'14px', cursor:'pointer', textAlign:'center' },
  emptyIcon: { fontSize:'2rem' },
  emptyText: { fontFamily:'var(--font-display)', fontSize:'0.82rem', color:'var(--text3)', lineHeight:1.5, maxWidth:'240px' },
  analyzing: { fontFamily:'var(--font-mono)', fontSize:'0.55rem', color:'var(--green)', letterSpacing:'0.1em', textAlign:'center', padding:'12px' },
  analysis: { background:'linear-gradient(135deg,rgba(34,212,138,0.05),var(--bg2))', border:'1px solid rgba(34,212,138,0.15)', borderRadius:'12px', padding:'16px' },
  analysisLabel: { fontFamily:'var(--font-mono)', fontSize:'0.48rem', color:'var(--green)', letterSpacing:'0.15em', marginBottom:'8px', opacity:0.7 },
  analysisText: { fontFamily:'var(--font-display)', fontSize:'0.85rem', color:'var(--text2)', lineHeight:1.7 },
}
