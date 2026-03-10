'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { saveSets, checkAndSavePR, startWorkout, dbWrite } from '../../lib/api'

const COACHING_CUES = [
  'Solid set. Stay tight on the next one.',
  'Good work. Control the eccentric.',
  'That\'s the pace. Keep your core braced.',
  'Strong. Push through the sticking point next set.',
  'Nice. Rest up — you earned it.',
  'Good rep range. Keep the form clean.',
  'That\'s what we came for. One more round.',
]

const REST_COMPLETE_CUES = [
  'Rest over. Load up and go.',
  'Time\'s up. Next set when you\'re ready.',
  'Rest complete. Stay focused.',
  'Back to work.',
]

const SET_START_CUES = [
  (ex, set, target) => `Set ${set} of ${ex}. Target ${target} reps.`,
  (ex, set, target) => `${ex}. Set ${set}. Let\'s go.`,
  (ex, set) => `Set ${set}. You\'ve got this.`,
]

export default function LiftMode() {
  const router = useRouter()

  // Workout data
  const [exercises, setExercises] = useState([])
  const [workout, setWorkout] = useState(null)
  const [setData, setSetData] = useState({})

  // Session state
  const [workoutId, setWorkoutId] = useState(null)
  const [exIdx, setExIdx] = useState(0)
  const [setIdx, setSetIdx] = useState(0)
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [loggedSets, setLoggedSets] = useState([])
  const [completedExercises, setCompletedExercises] = useState([])
  const [showNext, setShowNext] = useState(false)
  const [screen, setScreen] = useState('lift') // lift | complete
  const [calories, setCalories] = useState('')
  const [saving, setSaving] = useState(false)
  const [prToast, setPrToast] = useState(null)

  // Timers
  const [sessionTime, setSessionTime] = useState(0)
  const [sessionStart] = useState(Date.now())
  const [restActive, setRestActive] = useState(false)
  const [restTime, setRestTime] = useState(90)
  const [restMax, setRestMax] = useState(90)
  const [flashing, setFlashing] = useState(false)
  const [flashColor, setFlashColor] = useState('cyan')

  // Coach
  const [coachMsg, setCoachMsg] = useState('First set when you\'re ready.')

  // Voice / audio prefs
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [listening, setListening] = useState(false)
  const [micPulse, setMicPulse] = useState(false)
  const [voiceStatus, setVoiceStatus] = useState('')

  // Refs
  const sessionRef = useRef(null)
  const restRef = useRef(null)
  const flashRef = useRef(null)
  const micPulseRef = useRef(null)
  const recognitionRef = useRef(null)
  const synthRef = useRef(null)

  // ── INIT ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Load workout from sessionStorage
    try {
      const raw = sessionStorage.getItem('liftMode_workout')
      if (raw) {
        const data = JSON.parse(raw)
        setWorkout(data.workout)
        setExercises(data.exercises || [])
        setSetData(data.setData || {})
      }
    } catch (err) {
      console.error('Failed to load workout data:', err)
    }

    // Load prefs from localStorage
    try {
      const prefs = JSON.parse(localStorage.getItem('nomis_training_prefs') || '{}')
      setVoiceEnabled(prefs.voiceInput || false)
      setAudioEnabled(prefs.audioCoaching || false)
      const dur = prefs.restDuration || 90
      setRestTime(dur)
      setRestMax(dur)
    } catch {}

    // Init speech synthesis
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis
    }

    // Lock to fullscreen on mobile if possible
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {})
      }
    } catch {}

    return () => {
      // Exit fullscreen on unmount
      try {
        if (document.exitFullscreen && document.fullscreenElement) {
          document.exitFullscreen().catch(() => {})
        }
      } catch {}
      stopListening()
      if (synthRef.current) synthRef.current.cancel()
    }
  }, [])

  // Session timer
  useEffect(() => {
    if (screen !== 'lift') return
    sessionRef.current = setInterval(() => {
      setSessionTime(Math.floor((Date.now() - sessionStart) / 1000))
    }, 1000)
    return () => clearInterval(sessionRef.current)
  }, [screen])

  // Rest countdown
  useEffect(() => {
    if (!restActive) return
    if (restTime > 0) {
      restRef.current = setTimeout(() => setRestTime(t => t - 1), 1000)
    } else {
      setRestActive(false)
      triggerFlash('cyan')
      const cue = REST_COMPLETE_CUES[Math.floor(Math.random() * REST_COMPLETE_CUES.length)]
      setCoachMsg(cue)
      speak(cue)
    }
    return () => clearTimeout(restRef.current)
  }, [restActive, restTime])

  // Mic pulse animation
  useEffect(() => {
    if (!listening) { setMicPulse(false); return }
    micPulseRef.current = setInterval(() => setMicPulse(p => !p), 500)
    return () => clearInterval(micPulseRef.current)
  }, [listening])

  // ── SPEECH SYNTHESIS ────────────────────────────────────────────────────────
  function speak(text) {
    if (!audioEnabled || !synthRef.current) return
    try {
      synthRef.current.cancel()
      const utter = new SpeechSynthesisUtterance(text)
      utter.rate = 0.95
      utter.pitch = 1
      utter.volume = 1
      // Prefer a natural voice if available
      const voices = synthRef.current.getVoices()
      const preferred = voices.find(v =>
        v.name.includes('Samantha') || v.name.includes('Daniel') ||
        v.name.includes('Karen') || v.name.includes('Google')
      )
      if (preferred) utter.voice = preferred
      synthRef.current.speak(utter)
    } catch (err) {
      console.error('Speech error:', err)
    }
  }

  // ── SPEECH RECOGNITION ──────────────────────────────────────────────────────
  function startListening() {
    if (!voiceEnabled) return
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (!SpeechRecognition) {
        setVoiceStatus('Voice not supported on this browser')
        return
      }
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'

      recognition.onstart = () => {
        setListening(true)
        setVoiceStatus('Listening...')
      }

      recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript.toLowerCase()
        setVoiceStatus(`Heard: "${transcript}"`)
        parseVoiceInput(transcript)
      }

      recognition.onerror = (e) => {
        setListening(false)
        setVoiceStatus(e.error === 'no-speech' ? 'No speech detected' : `Error: ${e.error}`)
        setTimeout(() => setVoiceStatus(''), 2000)
      }

      recognition.onend = () => {
        setListening(false)
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch (err) {
      console.error('Recognition error:', err)
      setVoiceStatus('Voice input failed')
    }
  }

  function stopListening() {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        recognitionRef.current = null
      }
    } catch {}
    setListening(false)
  }

  function toggleListening() {
    if (listening) {
      stopListening()
    } else {
      startListening()
    }
  }

  // Parse voice input — handles patterns like:
  // "55 pounds 10 reps" / "55 10" / "forty five, eight" / "log 50 for 12"
  function parseVoiceInput(transcript) {
    // Remove filler words
    const clean = transcript
      .replace(/pounds?|lbs?|reps?|sets?|log|for|got|did|times?/g, ' ')
      .replace(/,/g, ' ')
      .trim()

    // Extract numbers (including written-out numbers)
    const wordNums = {
      zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
      six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
      eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
      sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
      thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
      eighty: 80, ninety: 90, hundred: 100,
    }

    let normalized = clean
    Object.entries(wordNums).forEach(([word, num]) => {
      normalized = normalized.replace(new RegExp(`\\b${word}\\b`, 'g'), ` ${num} `)
    })

    const nums = normalized.match(/\d+(\.\d+)?/g)?.map(Number).filter(n => n > 0)

    if (!nums || nums.length === 0) {
      setVoiceStatus('Could not parse — try "55 pounds, 10 reps"')
      setTimeout(() => setVoiceStatus(''), 3000)
      return
    }

    if (nums.length >= 2) {
      // First number = weight, second = reps
      setWeight(String(nums[0]))
      setReps(String(nums[1]))
      setVoiceStatus(`Got it: ${nums[0]} lbs × ${nums[1]} reps`)
      speak(`${nums[0]} pounds, ${nums[1]} reps. Confirm to log.`)
    } else if (nums.length === 1) {
      // If weight already set, fill reps; otherwise fill weight
      if (weight && !reps) {
        setReps(String(nums[0]))
        setVoiceStatus(`Reps: ${nums[0]}`)
      } else {
        setWeight(String(nums[0]))
        setVoiceStatus(`Weight: ${nums[0]} lbs`)
      }
    }

    setTimeout(() => setVoiceStatus(''), 3000)
  }

  // ── FLASH ───────────────────────────────────────────────────────────────────
  function triggerFlash(color = 'cyan') {
    setFlashColor(color)
    setFlashing(true)
    clearTimeout(flashRef.current)
    flashRef.current = setTimeout(() => setFlashing(false), 500)
  }

  // ── FORMAT TIME ─────────────────────────────────────────────────────────────
  function formatTime(s) {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  }

  // ── LOG SET ─────────────────────────────────────────────────────────────────
  async function logSet() {
    if (!weight || !reps || saving) return
    const ex = exercises[exIdx]
    if (!ex) return

    setSaving(true)

    // Update local setData
    const w = parseFloat(weight)
    const r = parseInt(reps)
    const updatedSets = [...(setData[ex.id] || [])]
    if (updatedSets[setIdx]) {
      updatedSets[setIdx] = { ...updatedSets[setIdx], weight: w, reps: r }
    } else {
      updatedSets.push({ set: setIdx + 1, weight: w, reps: r })
    }
    const newSetData = { ...setData, [ex.id]: updatedSets }
    setSetData(newSetData)

    // Save to DB
    try {
      let wid = workoutId
      if (!wid) {
        const started = await startWorkout(workout)
        if (started) {
          setWorkoutId(started.id)
          wid = started.id
        }
      }
      if (wid) {
        await saveSets(wid, ex, updatedSets)
        const pr = await checkAndSavePR(ex, updatedSets)
        if (pr) {
          setPrToast(`NEW PR: ${ex.name} — ${pr} lbs`)
          setTimeout(() => setPrToast(null), 4000)
          speak(`New personal record on ${ex.name}! ${pr} pounds!`)
        }
      }
    } catch (err) {
      console.error('Save set error:', err)
    }

    // Coach cue
    const cue = COACHING_CUES[Math.floor(Math.random() * COACHING_CUES.length)]
    setCoachMsg(cue)
    speak(cue)
    triggerFlash('teal')

    setLoggedSets(prev => [...prev, { exId: ex.id, exName: ex.name, set: setIdx + 1, weight: w, reps: r }])

    const nextSet = setIdx + 1
    if (nextSet >= (ex.sets || 4)) {
      // All sets done for this exercise
      setShowNext(true)
      setCompletedExercises(prev => [...prev, ex.id])
      const msg = nextExerciseName()
        ? `${ex.name} complete. Rest, then move to ${nextExerciseName()}.`
        : `${ex.name} complete. Last exercise. Finish strong.`
      setCoachMsg(msg)
      speak(msg)
    } else {
      // Start rest timer
      setSetIdx(nextSet)
      setRestActive(true)
      setRestTime(restMax)

      // Announce next set after rest
      const nextCueFn = SET_START_CUES[Math.floor(Math.random() * SET_START_CUES.length)]
      setTimeout(() => {
        // Will be spoken when rest ends
      }, 500)
    }

    setWeight('')
    setReps('')
    setSaving(false)
  }

  function nextExerciseName() {
    return exercises[exIdx + 1]?.name || null
  }

  // ── NEXT EXERCISE ───────────────────────────────────────────────────────────
  function goNextExercise() {
    const next = exIdx + 1
    if (next >= exercises.length) {
      finishSession()
      return
    }
    setExIdx(next)
    setSetIdx(0)
    setShowNext(false)
    setRestActive(false)
    clearTimeout(restRef.current)

    const nextEx = exercises[next]
    const msg = `${nextEx.name}. ${nextEx.sets || 4} sets. Target ${nextEx.reps || '8 to 10'} reps.`
    setCoachMsg(msg)
    speak(msg)
  }

  // ── FINISH SESSION ──────────────────────────────────────────────────────────
  async function finishSession() {
    setScreen('complete')
    clearInterval(sessionRef.current)
    try {
      if (workoutId) {
        const durationMin = Math.round((Date.now() - sessionStart) / 60000)
        await dbWrite('workouts', 'update', {
          duration_min: durationMin,
          description: exercises.map(e => e.name).join(', '),
        }, { id: workoutId })
      }
    } catch (err) {
      console.error('Finish session error:', err)
    }
    speak(`Session complete. Great work. ${totalSetsLogged()} sets logged.`)
  }

  async function saveAndExit() {
    try {
      if (workoutId && calories) {
        await dbWrite('workouts', 'update', { calories_burned: parseInt(calories) }, { id: workoutId })
      }
    } catch {}
    sessionStorage.removeItem('liftMode_workout')
    router.push('/train')
  }

  function exitWithoutSaving() {
    sessionStorage.removeItem('liftMode_workout')
    router.push('/train')
  }

  // ── COMPUTED ─────────────────────────────────────────────────────────────────
  function totalVolume() {
    let vol = 0
    loggedSets.forEach(s => { vol += (s.weight || 0) * (s.reps || 0) })
    return vol
  }

  function totalSetsLogged() {
    return loggedSets.length
  }

  const ex = exercises[exIdx]
  const nextEx = exercises[exIdx + 1]
  const restPct = restMax > 0 ? (restTime / restMax) * 100 : 0
  const circumference = 2 * Math.PI * 44
  const overallProgress = exercises.length > 0
    ? ((exIdx + (showNext ? 1 : 0)) / exercises.length) * 100
    : 0

  // ── COMPLETE SCREEN ──────────────────────────────────────────────────────────
  if (screen === 'complete') {
    const vol = totalVolume()
    return (
      <div style={st.root}>
        <div style={st.completeBg} />
        <div style={st.completeWrap}>
          <div style={st.completeCheck}>✓</div>
          <div style={st.completeTitle}>Session Complete</div>
          <div style={st.completeElapsed} className="mono">{formatTime(sessionTime)}</div>

          <div style={st.completeGrid}>
            <div style={st.cStat}>
              <div style={{ ...st.cStatVal, color: '#22d3ee' }}>{completedExercises.length}</div>
              <div style={st.cStatLabel}>EXERCISES</div>
            </div>
            <div style={st.cStat}>
              <div style={{ ...st.cStatVal, color: '#fb923c' }}>{totalSetsLogged()}</div>
              <div style={st.cStatLabel}>SETS</div>
            </div>
            <div style={st.cStat}>
              <div style={{ ...st.cStatVal, color: '#2dd4bf' }}>
                {vol > 1000 ? `${(vol / 1000).toFixed(1)}k` : vol || '—'}
              </div>
              <div style={st.cStatLabel}>VOLUME</div>
            </div>
          </div>

          <div style={st.calRow}>
            <span style={st.calLabel}>Calories burned</span>
            <input
              style={st.calInput} className="mono"
              type="number" inputMode="numeric"
              placeholder="—"
              value={calories}
              onChange={e => setCalories(e.target.value)}
            />
            <span style={st.calUnit} className="mono">kcal</span>
          </div>

          <button style={st.finishBtn} onClick={saveAndExit}>
            Save & Exit
          </button>
        </div>
      </div>
    )
  }

  // No exercises loaded
  if (!ex) return (
    <div style={st.root}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '16px' }}>
        <div className="mono" style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em' }}>NO WORKOUT LOADED</div>
        <button style={st.exitBtnFull} onClick={exitWithoutSaving}>Back to Train</button>
      </div>
    </div>
  )

  // ── LIFT SCREEN ──────────────────────────────────────────────────────────────
  return (
    <div style={st.root}>
      {/* Flash overlay */}
      {flashing && (
        <div style={{
          ...st.flashLayer,
          background: flashColor === 'cyan' ? 'rgba(34,211,238,0.2)' : 'rgba(45,212,191,0.18)',
        }} />
      )}

      {/* PR toast */}
      {prToast && (
        <div style={st.prToast}>{prToast}</div>
      )}

      <div style={st.ambientBg} />

      {/* ── TOP BAR ── */}
      <div style={st.topBar}>
        <div style={st.timerPill}>
          <div style={st.timerDot} />
          <span style={st.timerText} className="mono">{formatTime(sessionTime)}</span>
        </div>

        <div style={st.topCenter}>
          <div style={st.exCounter} className="mono">
            {exIdx + 1}
            <span style={st.exCounterOf}> / {exercises.length}</span>
          </div>
          <div style={st.exCounterLabel} className="mono">EXERCISE</div>
        </div>

        <button style={st.exitBtn} onClick={exitWithoutSaving}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <line x1="1" y1="1" x2="9" y2="9" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="9" y1="1" x2="1" y2="9" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Session progress bar */}
      <div style={st.progressBar}>
        <div style={{ ...st.progressFill, width: `${overallProgress}%` }} />
      </div>

      {/* ── EXERCISE HEADER ── */}
      <div style={st.exHeader}>
        <div style={st.exName}>{ex.name}</div>
        <div style={st.exMeta} className="mono">
          {ex.muscle_group} · {ex.equipment || 'Bodyweight'}
        </div>

        {/* Set dots */}
        <div style={st.setDots}>
          {Array.from({ length: ex.sets || 4 }).map((_, i) => (
            <div key={i} style={{
              ...st.dot,
              ...(i < setIdx || showNext ? st.dotDone : {}),
              ...(i === setIdx && !showNext && !restActive ? st.dotActive : {}),
              ...(i === setIdx && restActive ? st.dotResting : {}),
            }} />
          ))}
        </div>

        <div style={st.setInfo} className="mono">
          {showNext
            ? <span style={{ color: '#2dd4bf' }}>All sets complete</span>
            : `Set ${setIdx + 1} of ${ex.sets || 4} · Target ${ex.reps || '8-10'} reps`
          }
        </div>
      </div>

      {/* ── REST TIMER ── */}
      {restActive && (
        <div style={st.restWrap}>
          <div style={st.restRingWrap}>
            <svg width="100" height="100" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
              <circle
                cx="50" cy="50" r="44" fill="none"
                stroke={restTime < 10 ? '#fb923c' : '#22d3ee'}
                strokeWidth="5" strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - restPct / 100)}
                transform="rotate(-90 50 50)"
                style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }}
              />
            </svg>
            <div style={st.restOverlay}>
              <div style={{ ...st.restNum, color: restTime < 10 ? '#fb923c' : '#fff' }} className="mono">
                {restTime}
              </div>
              <div style={st.restLabel} className="mono">REST</div>
            </div>
          </div>
          <button style={st.skipBtn} onClick={() => { setRestActive(false); clearTimeout(restRef.current) }}>
            Skip rest
          </button>
        </div>
      )}

      {/* ── SET LOGGER ── */}
      {!restActive && !showNext && (
        <div style={st.loggerWrap}>
          <div style={st.inputCard}>
            <div style={st.inputHalf}>
              <div style={st.inputTag} className="mono">WEIGHT</div>
              <input
                style={st.numInput} className="mono"
                type="number" inputMode="decimal"
                placeholder="—"
                value={weight}
                onChange={e => setWeight(e.target.value)}
              />
              <div style={st.inputUnit} className="mono">lbs</div>
            </div>
            <div style={st.inputSep} />
            <div style={st.inputHalf}>
              <div style={st.inputTag} className="mono">REPS</div>
              <input
                style={st.numInput} className="mono"
                type="number" inputMode="numeric"
                placeholder="—"
                value={reps}
                onChange={e => setReps(e.target.value)}
              />
              <div style={st.inputUnit} className="mono">reps</div>
            </div>
          </div>

          <button
            style={{ ...st.logBtn, opacity: weight && reps && !saving ? 1 : 0.35 }}
            onClick={logSet}
            disabled={!weight || !reps || saving}
          >
            {saving ? 'Saving...' : 'Log Set'}
          </button>

          {/* Voice button — only if enabled */}
          {voiceEnabled && (
            <button style={st.micBtn} onClick={toggleListening}>
              <div style={{
                ...st.micRing,
                ...(listening ? st.micRingActive : {}),
                ...(micPulse && listening ? st.micRingPulse : {}),
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <rect x="9" y="2" width="6" height="12" rx="3"
                    fill={listening ? '#22d3ee' : 'rgba(255,255,255,0.45)'}/>
                  <path d="M5 10c0 3.866 3.134 7 7 7s7-3.134 7-7"
                    stroke={listening ? '#22d3ee' : 'rgba(255,255,255,0.35)'}
                    strokeWidth="2" strokeLinecap="round"/>
                  <line x1="12" y1="17" x2="12" y2="21"
                    stroke={listening ? '#22d3ee' : 'rgba(255,255,255,0.35)'}
                    strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <span style={{
                ...st.micLabel,
                color: listening ? '#22d3ee' : 'rgba(255,255,255,0.3)',
              }} className="mono">
                {voiceStatus || (listening ? 'Listening...' : 'Speak set')}
              </span>
            </button>
          )}
        </div>
      )}

      {/* ── NEXT EXERCISE ── */}
      {showNext && (
        <div style={st.nextWrap}>
          {nextEx && (
            <div style={st.nextCard}>
              <div style={st.nextTag} className="mono">UP NEXT</div>
              <div style={st.nextName}>{nextEx.name}</div>
              <div style={st.nextMeta} className="mono">
                {nextEx.sets || 4} sets · {nextEx.reps || '8-10'} reps
              </div>
            </div>
          )}
          <button style={st.nextBtn} onClick={goNextExercise}>
            {nextEx ? `Next: ${nextEx.name}` : 'Finish Session'}
          </button>
        </div>
      )}

      {/* ── NOMIS COACH BAR ── */}
      <div style={st.coachBar}>
        <div style={st.coachInner}>
          <div style={st.coachPip} />
          <span style={st.coachText} className="mono">{coachMsg}</span>
        </div>
      </div>
    </div>
  )
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const st = {
  root: {
    width: '100%', minHeight: '100vh', minHeight: '100dvh',
    background: '#0d1014',
    display: 'flex', flexDirection: 'column',
    position: 'relative', overflow: 'hidden',
    fontFamily: 'var(--font-body, system-ui, sans-serif)',
    color: '#fff',
    maxWidth: '480px', margin: '0 auto',
    userSelect: 'none',
  },
  ambientBg: {
    position: 'absolute', inset: 0, pointerEvents: 'none',
    background: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(34,211,238,0.07) 0%, transparent 100%)',
  },
  flashLayer: {
    position: 'fixed', inset: 0, zIndex: 200, pointerEvents: 'none',
  },
  prToast: {
    position: 'fixed', top: '60px', left: '50%', transform: 'translateX(-50%)',
    zIndex: 300, background: 'rgba(45,212,191,0.12)',
    border: '1px solid rgba(45,212,191,0.3)',
    borderRadius: '12px', padding: '10px 20px',
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: '0.62rem', color: '#2dd4bf', letterSpacing: '0.06em',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)', whiteSpace: 'nowrap',
  },

  // Top bar
  topBar: {
    position: 'relative', zIndex: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 20px 12px',
  },
  timerPill: {
    display: 'flex', alignItems: 'center', gap: '7px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '20px', padding: '6px 12px',
  },
  timerDot: {
    width: '5px', height: '5px', borderRadius: '50%',
    background: '#22d3ee', boxShadow: '0 0 6px #22d3ee',
  },
  timerText: { fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.1em' },
  topCenter: { textAlign: 'center' },
  exCounter: { fontSize: '1rem', fontWeight: '700', color: '#fff', lineHeight: 1 },
  exCounterOf: { color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem' },
  exCounterLabel: { fontSize: '0.4rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.18em', marginTop: '3px' },
  exitBtn: {
    width: '32px', height: '32px', borderRadius: '9px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  exitBtnFull: {
    padding: '14px 28px', borderRadius: '12px',
    border: '1px solid rgba(34,211,238,0.3)',
    background: 'rgba(34,211,238,0.08)',
    color: '#22d3ee', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer',
    fontFamily: 'var(--font-body, system-ui)',
  },

  progressBar: { height: '2px', background: 'rgba(255,255,255,0.05)', position: 'relative', zIndex: 10 },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #22d3ee, #2dd4bf)',
    boxShadow: '0 0 8px rgba(34,211,238,0.5)',
    transition: 'width 0.5s ease', minWidth: '4px',
  },

  // Exercise header
  exHeader: {
    position: 'relative', zIndex: 5,
    padding: '32px 28px 16px', textAlign: 'center',
  },
  exName: {
    fontSize: '1.9rem', fontWeight: '800',
    letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '8px',
  },
  exMeta: { fontSize: '0.52rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', marginBottom: '22px', textTransform: 'uppercase' },
  setDots: { display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '10px' },
  dot: { width: '11px', height: '11px', borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.15)', transition: 'all 0.25s' },
  dotDone: { background: '#2dd4bf', borderColor: '#2dd4bf', boxShadow: '0 0 8px rgba(45,212,191,0.5)' },
  dotActive: { borderColor: '#22d3ee', boxShadow: '0 0 10px rgba(34,211,238,0.5)', background: 'rgba(34,211,238,0.15)' },
  dotResting: { borderColor: 'rgba(34,211,238,0.4)', background: 'rgba(34,211,238,0.08)' },
  setInfo: { fontSize: '0.5rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' },

  // Rest timer
  restWrap: {
    position: 'relative', zIndex: 5,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '12px 28px 8px', gap: '12px',
  },
  restRingWrap: { position: 'relative', width: '100px', height: '100px' },
  restOverlay: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  restNum: { fontSize: '1.9rem', fontWeight: '700', lineHeight: 1, transition: 'color 0.3s' },
  restLabel: { fontSize: '0.4rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.2em', marginTop: '2px' },
  skipBtn: {
    padding: '8px 20px', borderRadius: '8px',
    background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.35)',
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: '0.5rem', letterSpacing: '0.08em', cursor: 'pointer',
  },

  // Set logger
  loggerWrap: { position: 'relative', zIndex: 5, padding: '8px 24px 80px', display: 'flex', flexDirection: 'column', gap: '12px' },
  inputCard: {
    display: 'flex',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: '18px', overflow: 'hidden',
  },
  inputHalf: { flex: 1, padding: '22px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' },
  inputSep: { width: '1px', background: 'rgba(255,255,255,0.07)', margin: '18px 0' },
  inputTag: { fontSize: '0.42rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.18em' },
  numInput: {
    background: 'transparent', border: 'none', outline: 'none',
    fontSize: '2.6rem', fontWeight: '700', color: '#fff',
    textAlign: 'center', width: '100%', lineHeight: 1,
  },
  inputUnit: { fontSize: '0.42rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.12em' },

  logBtn: {
    width: '100%', padding: '19px', borderRadius: '15px',
    border: '1px solid rgba(45,212,191,0.35)',
    background: 'linear-gradient(135deg, rgba(45,212,191,0.14), rgba(45,212,191,0.04))',
    color: '#2dd4bf', fontSize: '1rem', fontWeight: '700', letterSpacing: '0.03em',
    cursor: 'pointer', transition: 'opacity 0.15s',
    fontFamily: 'var(--font-body, system-ui)',
  },

  micBtn: {
    width: '100%', padding: '13px 20px', borderRadius: '12px',
    background: 'transparent', border: '1px solid rgba(255,255,255,0.07)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
  },
  micRing: {
    width: '36px', height: '36px', borderRadius: '50%',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.2s',
  },
  micRingActive: { background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.4)' },
  micRingPulse: { boxShadow: '0 0 14px rgba(34,211,238,0.35)' },
  micLabel: { fontSize: '0.52rem', letterSpacing: '0.08em', transition: 'color 0.2s' },

  // Next exercise
  nextWrap: { position: 'relative', zIndex: 5, padding: '8px 24px 80px', display: 'flex', flexDirection: 'column', gap: '12px' },
  nextCard: { padding: '18px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px' },
  nextTag: { fontSize: '0.42rem', color: '#22d3ee', letterSpacing: '0.2em', marginBottom: '6px' },
  nextName: { fontSize: '1.1rem', fontWeight: '700', marginBottom: '4px' },
  nextMeta: { fontSize: '0.5rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em' },
  nextBtn: {
    width: '100%', padding: '19px', borderRadius: '15px',
    border: '1px solid rgba(34,211,238,0.35)',
    background: 'linear-gradient(135deg, rgba(34,211,238,0.12), rgba(34,211,238,0.04))',
    color: '#22d3ee', fontSize: '1rem', fontWeight: '700', letterSpacing: '0.03em', cursor: 'pointer',
    fontFamily: 'var(--font-body, system-ui)',
  },

  // Coach bar
  coachBar: {
    position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
    width: '100%', maxWidth: '480px',
    background: 'linear-gradient(to top, rgba(13,16,20,1) 60%, transparent)',
    padding: '20px 24px 32px', zIndex: 20,
  },
  coachInner: {
    display: 'flex', alignItems: 'flex-start', gap: '10px',
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '12px',
  },
  coachPip: {
    width: '5px', height: '5px', borderRadius: '50%',
    background: '#22d3ee', flexShrink: 0, marginTop: '5px',
    boxShadow: '0 0 6px rgba(34,211,238,0.7)',
  },
  coachText: { fontSize: '0.58rem', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.04em', lineHeight: 1.6 },

  // Complete screen
  completeBg: {
    position: 'absolute', inset: 0, pointerEvents: 'none',
    background: 'radial-gradient(ellipse 60% 40% at 50% 20%, rgba(45,212,191,0.1) 0%, transparent 70%)',
  },
  completeWrap: { position: 'relative', zIndex: 1, padding: '80px 28px 48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' },
  completeCheck: {
    width: '68px', height: '68px', borderRadius: '20px',
    background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.25)',
    color: '#2dd4bf', fontSize: '2rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px',
  },
  completeTitle: { fontSize: '1.9rem', fontWeight: '800', letterSpacing: '-0.02em' },
  completeElapsed: { fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.15em', marginBottom: '8px' },
  completeGrid: { display: 'flex', gap: '8px', width: '100%', marginBottom: '4px' },
  cStat: { flex: 1, padding: '20px 8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', textAlign: 'center' },
  cStatVal: { fontFamily: 'var(--font-mono, monospace)', fontSize: '1.5rem', fontWeight: '700', lineHeight: 1, marginBottom: '6px' },
  cStatLabel: { fontFamily: 'var(--font-mono, monospace)', fontSize: '0.4rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.16em' },
  calRow: { width: '100%', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '18px 20px' },
  calLabel: { flex: 1, fontSize: '0.9rem', color: 'rgba(255,255,255,0.55)' },
  calInput: { width: '72px', background: 'transparent', border: 'none', outline: 'none', fontSize: '1.1rem', fontWeight: '600', color: '#fff', textAlign: 'right' },
  calUnit: { fontSize: '0.5rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' },
  finishBtn: {
    width: '100%', padding: '19px', marginTop: '8px', borderRadius: '15px',
    border: '1px solid rgba(45,212,191,0.35)',
    background: 'linear-gradient(135deg, rgba(45,212,191,0.14), rgba(45,212,191,0.04))',
    color: '#2dd4bf', fontSize: '1rem', fontWeight: '700', letterSpacing: '0.03em', cursor: 'pointer',
    fontFamily: 'var(--font-body, system-ui)',
  },
}