'use client'
import { useState, useEffect } from 'react'
import Shell from '../components/Shell'
import NomisChat from '../components/NomisChat'
import { getTodaysSummary, getRecentWorkouts, getRecentBodyStats, getRecentSleep, getRecentNutrition, dbRead } from '../lib/api'

// ── Motivational quotes ─────────────────────────────────────────────────────
const QUOTES = [
  { text: "Don't count the days. Make the days count.", author: "Muhammad Ali" },
  { text: "We don't rise to the level of our expectations. We fall to the level of our training.", author: "Archilochus" },
  { text: "The only person you are destined to become is the person you decide to be.", author: "Ralph Waldo Emerson" },
  { text: "Suffer the pain of discipline or suffer the pain of regret.", author: "Jim Rohn" },
  { text: "Hard times don't create heroes. It is during the hard times when the hero within us is revealed.", author: "Bob Riley" },
  { text: "You are what you repeatedly do. Excellence is not an act, but a habit.", author: "Aristotle" },
  { text: "The impediment to action advances action. What stands in the way becomes the way.", author: "Marcus Aurelius" },
  { text: "Rest at the end, not in the middle.", author: "Kobe Bryant" },
  { text: "Who you are tomorrow begins with what you do today.", author: "Tim Fargo" },
  { text: "The body achieves what the mind believes.", author: "Napoleon Hill" },
  { text: "Be not afraid of going slowly. Be afraid only of standing still.", author: "Chinese Proverb" },
  { text: "You want to be uncommon amongst uncommon people. Period.", author: "David Goggins" },
  { text: "Discipline equals freedom.", author: "Jocko Willink" },
  { text: "The successful warrior is the average man, with laser-like focus.", author: "Bruce Lee" },
  { text: "Strength does not come from the physical capacity. It comes from an indomitable will.", author: "Gandhi" },
  { text: "I fear not the man who has practiced 10,000 kicks once, but the man who has practiced one kick 10,000 times.", author: "Bruce Lee" },
  { text: "The last three or four reps is what makes the muscle grow. This area of pain divides a champion from someone who is not a champion.", author: "Arnold Schwarzenegger" },
  { text: "If something stands between you and your success, move it. Never be denied.", author: "Dwayne Johnson" },
  { text: "The mind is the limit. As long as the mind can envision the fact that you can do something, you can do it.", author: "Arnold Schwarzenegger" },
  { text: "It's supposed to be hard. If it were easy, everyone would do it.", author: "Tom Hanks" },
  { text: "Don't let yesterday take up too much of today.", author: "Will Rogers" },
  { text: "Everything around you that you call life was made up by people that were no smarter than you.", author: "Steve Jobs" },
  { text: "When you want to succeed as bad as you want to breathe, then you'll be successful.", author: "Eric Thomas" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Will Durant" },
  { text: "The only easy day was yesterday.", author: "Navy SEALs" },
  { text: "Go to bed a little smarter each day.", author: "Charlie Munger" },
  { text: "You don't have to be extreme, just consistent.", author: "Unknown" },
  { text: "The pain you feel today will be the strength you feel tomorrow.", author: "Unknown" },
  { text: "Your body can stand almost anything. It's your mind that you have to convince.", author: "Unknown" },
  { text: "Success is nothing more than a few simple disciplines, practiced every day.", author: "Jim Rohn" },
]

function getDailyQuote() {
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000)
  return QUOTES[dayOfYear % QUOTES.length]
}

// ── Readiness Score Calculator ──────────────────────────────────────────────
function calculateReadiness(sleepData, workouts, nutrition, bodyStats, suppPct = 0) {
  let score = 25 // Base

  // Sleep (up to +30)
  if (sleepData.length) {
    const lastSleep = parseFloat(sleepData[0]?.duration_hrs || sleepData[0]?.duration_hours) || 0
    if (lastSleep >= 8) score += 25
    else if (lastSleep >= 7) score += 20
    else if (lastSleep >= 6) score += 12
    else if (lastSleep >= 5) score += 6
    // Under 5: +0

    const quality = sleepData[0]?.quality
    if (quality === 'great') score += 5
    else if (quality === 'good') score += 3
    else if (quality === 'okay') score += 1
    else if (quality === 'poor') score -= 3
    else if (quality === 'bad') score -= 5
  }
  // No sleep data: +0 (base only)

  // Recovery (up to +20)
  if (workouts.length) {
    const today = new Date()
    const lastWorkoutDate = new Date(workouts[0]?.date)
    const daysSince = Math.floor((today - lastWorkoutDate) / 86400000)

    if (daysSince === 1) score += 20 // 1 day rest, ideal
    else if (daysSince === 2) score += 17 // 2 days, good recovery
    else if (daysSince === 0) score += 10 // Trained today
    else if (daysSince >= 3) score += 12 // Well rested but losing momentum

    // Overtraining check — 6+ days in last 7
    const last7 = workouts.filter(w => {
      const d = new Date(w.date)
      return (today - d) / 86400000 <= 7
    })
    if (last7.length >= 6) score -= 10
  }

  // Nutrition (up to +15)
  if (nutrition.length) {
    const todayStr = new Date().toISOString().split('T')[0]
    const todayMeals = nutrition.filter(n => n.date === todayStr)
    const totalProtein = todayMeals.reduce((a, b) => a + (parseInt(b.protein_g) || 0), 0)
    const totalCals = todayMeals.reduce((a, b) => a + (parseInt(b.calories) || 0), 0)

    if (totalProtein >= 150) score += 8
    else if (totalProtein >= 100) score += 5
    else if (totalProtein > 0) score += 2

    if (totalCals >= 1800 && totalCals <= 2800) score += 5
    else if (totalCals > 0) score += 2
  }

  // Stack compliance (up to +10)
  if (suppPct >= 100) score += 10
  else if (suppPct >= 75) score += 7
  else if (suppPct >= 50) score += 4
  else if (suppPct > 0) score += 1

  return Math.min(100, Math.max(0, score))
}

function getReadinessLabel(score) {
  if (score >= 85) return { text: 'Peak readiness — go all out', color: 'var(--teal)' }
  if (score >= 70) return { text: 'Good to go — solid session ahead', color: 'var(--cyan)' }
  if (score >= 55) return { text: 'Moderate — listen to your body', color: 'var(--orange)' }
  if (score >= 40) return { text: 'Low — consider active recovery', color: '#a78bfa' }
  return { text: 'Rest day recommended', color: 'var(--red)' }
}

// ── Main Dashboard ──────────────────────────────────────────────────────────
export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [workouts, setWorkouts] = useState([])
  const [bodyStats, setBodyStats] = useState([])
  const [sleepData, setSleepData] = useState([])
  const [nutrition, setNutrition] = useState([])
  const [schedule, setSchedule] = useState([])
  const [supplements, setSupplements] = useState([])
  const [suppLogs, setSuppLogs] = useState([])
  const [waterCount, setWaterCount] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')
  const [greeting, setGreeting] = useState('')

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    setMounted(true)
    function tick() {
      const now = new Date()
      const h = now.getHours()
      setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening')
      setTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }))
      setDate(now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }))
    }
    tick()
    const id = setInterval(tick, 30000)

    // Load saved water count from localStorage
    try {
      const saved = localStorage.getItem(`nomis-water-${new Date().toISOString().split('T')[0]}`)
      if (saved) setWaterCount(parseInt(saved) || 0)
    } catch {}

    Promise.all([
      getTodaysSummary().then(setSummary).catch(() => {}),
      getRecentWorkouts(14).then(setWorkouts).catch(() => {}),
      getRecentBodyStats(14).then(setBodyStats).catch(() => {}),
      getRecentSleep(7).then(setSleepData).catch(() => {}),
      getRecentNutrition(30).then(setNutrition).catch(() => {}),
      dbRead('user_schedule', {}, { order: 'id', limit: 7 }).then(setSchedule).catch(() => {}),
      dbRead('supplement_stack', {}, { order: 'name', limit: 50 }).then(d => setSupplements((d || []).filter(s => s.active !== false))).catch(() => {}),
      dbRead('supplement_logs', { date: new Date().toISOString().split('T')[0] }, { limit: 50 }).then(setSuppLogs).catch(() => {}),
    ])

    return () => clearInterval(id)
  }, [])

  function addWater() {
    const next = waterCount + 1
    setWaterCount(next)
    try { localStorage.setItem(`nomis-water-${today}`, next.toString()) } catch {}
  }

  // Calculations
  const todayCals = summary?.nutrition?.reduce((a, b) => a + (parseInt(b.calories) || 0), 0) || 0
  const todayProtein = summary?.nutrition?.reduce((a, b) => a + (parseInt(b.protein_g) || 0), 0) || 0
  const todayCarbs = summary?.nutrition?.reduce((a, b) => a + (parseInt(b.carbs_g) || 0), 0) || 0
  const todayFat = summary?.nutrition?.reduce((a, b) => a + (parseInt(b.fat_g) || 0), 0) || 0
  const latestWeight = bodyStats?.[0]?.weight_lbs || '--'
  const latestSleep = sleepData?.[0]
  const sleepHrs = latestSleep ? parseFloat(latestSleep.duration_hrs || latestSleep.duration_hours) : null
  const sleepQuality = latestSleep?.quality || null

  // Supplement compliance
  const suppTaken = supplements.filter(s =>
    suppLogs.some(l => String(l.supplement_id) === String(s.id) || l.name?.toLowerCase() === s.name?.toLowerCase())
  ).length
  const suppTotal = supplements.length
  const suppPct = suppTotal ? Math.round((suppTaken / suppTotal) * 100) : 0

  // Readiness
  const readiness = calculateReadiness(sleepData, workouts, nutrition, bodyStats, suppPct)
  const readinessInfo = getReadinessLabel(readiness)

  // Weekly workout dots
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1) // Monday
  const weekDots = days.map((label, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    const worked = workouts.some(w => w.date === dateStr)
    const isToday = dateStr === today
    return { label, worked, isToday }
  })

  // Next workout from schedule
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const tomorrowIdx = (new Date().getDay() + 1) % 7
  const tomorrowName = dayNames[tomorrowIdx]
  const nextWorkout = schedule.find(s => s.day_of_week === tomorrowName)

  // Macro targets
  const calTarget = 2200
  const proteinTarget = 180
  const calPct = Math.min(100, Math.round((todayCals / calTarget) * 100))
  const proteinPct = Math.min(100, Math.round((todayProtein / proteinTarget) * 100))

  // Quote
  const quote = getDailyQuote()

  // Streak
  const streak = calculateStreak(workouts)

  return (
    <Shell title="NOMIS">
      <div style={s.page}>

        {/* Greeting */}
        <div style={s.greeting}>
          <div style={s.greetText}>
            {mounted ? greeting : ''}, <span style={s.greetName}>Simon</span>
          </div>
          <div style={s.greetMeta}>
            <span className="mono" style={s.dateMono}>{mounted ? date : ''}</span>
            <span className="mono" style={s.timeMono}>{mounted ? time : ''}</span>
          </div>
        </div>

        {/* Readiness Score */}
        <div style={s.section}>
          <div className="card" style={s.readinessCard}>
            <div style={s.readinessTop}>
              <div>
                <div style={s.readinessLabel} className="mono">READINESS</div>
                <div style={{ ...s.readinessScore, color: readinessInfo.color }} className="mono">{readiness}</div>
              </div>
              <div style={s.readinessRight}>
                <div style={{ ...s.readinessText, color: readinessInfo.color }}>{readinessInfo.text}</div>
              </div>
            </div>
            <div style={s.readinessBar}>
              <div style={{ ...s.readinessFill, width: `${readiness}%`, background: readinessInfo.color }} />
            </div>
          </div>
        </div>

        {/* Macro Progress */}
        <div style={s.section}>
          <div className="section-label" style={s.sLabel}>Today's fuel</div>
          <div className="card" style={s.macroCard}>
            <div style={s.macroRow}>
              <div style={s.macroItem}>
                <div style={s.macroProgress}>
                  <div style={s.macroRing}>
                    <svg width="52" height="52" viewBox="0 0 52 52">
                      <circle cx="26" cy="26" r="22" fill="none" stroke="var(--bg3)" strokeWidth="3" />
                      <circle cx="26" cy="26" r="22" fill="none" stroke="var(--orange)" strokeWidth="3"
                        strokeDasharray={`${calPct * 1.38} 138`} strokeLinecap="round"
                        transform="rotate(-90 26 26)" style={{ transition: 'stroke-dasharray 0.5s ease' }} />
                    </svg>
                    <div style={s.macroRingVal} className="mono">{calPct}%</div>
                  </div>
                </div>
                <div style={{ ...s.macroVal, color: 'var(--orange)' }} className="mono">{todayCals} <span style={s.macroUnit}>/ {calTarget}</span></div>
                <div style={s.macroLabel} className="mono">Calories</div>
              </div>
              <div style={s.macroItem}>
                <div style={s.macroProgress}>
                  <div style={s.macroRing}>
                    <svg width="52" height="52" viewBox="0 0 52 52">
                      <circle cx="26" cy="26" r="22" fill="none" stroke="var(--bg3)" strokeWidth="3" />
                      <circle cx="26" cy="26" r="22" fill="none" stroke="var(--cyan)" strokeWidth="3"
                        strokeDasharray={`${proteinPct * 1.38} 138`} strokeLinecap="round"
                        transform="rotate(-90 26 26)" style={{ transition: 'stroke-dasharray 0.5s ease' }} />
                    </svg>
                    <div style={s.macroRingVal} className="mono">{proteinPct}%</div>
                  </div>
                </div>
                <div style={{ ...s.macroVal, color: 'var(--cyan)' }} className="mono">{todayProtein}g <span style={s.macroUnit}>/ {proteinTarget}g</span></div>
                <div style={s.macroLabel} className="mono">Protein</div>
              </div>
              <div style={{ ...s.macroItem, borderRight: 'none' }}>
                <div style={s.miniMacros}>
                  <div style={s.miniRow}>
                    <span className="mono" style={s.miniLabel}>Carbs</span>
                    <span className="mono" style={{ ...s.miniVal, color: 'var(--teal)' }}>{todayCarbs}g</span>
                  </div>
                  <div style={s.miniRow}>
                    <span className="mono" style={s.miniLabel}>Fat</span>
                    <span className="mono" style={{ ...s.miniVal, color: '#a78bfa' }}>{todayFat}g</span>
                  </div>
                  <div style={{ ...s.miniRow, borderBottom: 'none' }}>
                    <span className="mono" style={s.miniLabel}>Meals</span>
                    <span className="mono" style={s.miniVal}>{summary?.nutrition?.length || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sleep + Water row */}
        <div style={s.section}>
          <div style={s.twoCol}>
            {/* Sleep mini */}
            <a href="/sleep" style={s.twoColCard} className="card-sm">
              <div style={s.miniCardLabel} className="mono">Last night</div>
              <div style={s.sleepRow}>
                <span style={{ ...s.sleepNum, color: sleepHrs && sleepHrs >= 7 ? 'var(--teal)' : sleepHrs ? 'var(--orange)' : 'var(--text3)' }} className="mono">
                  {sleepHrs ? sleepHrs.toFixed(1) : '--'}
                </span>
                <span style={s.sleepUnit} className="mono">hrs</span>
              </div>
              {sleepQuality && (
                <div className="mono" style={{ fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.06em', marginTop: '2px' }}>
                  {sleepQuality}
                </div>
              )}
              {latestSleep?.deep_min && (
                <div className="mono" style={{ fontSize: '0.42rem', color: 'var(--text3)', letterSpacing: '0.04em', marginTop: '4px' }}>
                  {latestSleep.deep_min}m deep · {latestSleep.rem_min || '?'}m REM
                </div>
              )}
            </a>

            {/* Water */}
            <div style={s.twoColCard} className="card-sm">
              <div style={s.miniCardLabel} className="mono">Water</div>
              <div style={s.waterRow}>
                <span style={{ ...s.waterNum, color: waterCount >= 8 ? 'var(--teal)' : 'var(--cyan)' }} className="mono">{waterCount}</span>
                <span style={s.waterUnit} className="mono">glasses</span>
              </div>
              <button style={s.waterBtn} onClick={addWater}>
                <span style={s.waterPlus}>+</span>
              </button>
            </div>
          </div>
        </div>

        {/* Weekly streak */}
        <div style={s.section}>
          <div className="section-label" style={s.sLabel}>This week</div>
          <div className="card" style={s.weekCard}>
            <div style={s.weekDots}>
              {weekDots.map((d, i) => (
                <div key={i} style={s.weekDotCol}>
                  <div style={{
                    ...s.weekDot,
                    background: d.worked ? 'var(--cyan)' : 'var(--bg3)',
                    border: d.isToday ? '2px solid var(--cyan)' : d.worked ? '2px solid var(--cyan)' : '2px solid var(--border2)',
                    boxShadow: d.worked ? '0 0 8px rgba(34,211,238,0.2)' : 'none',
                  }} />
                  <span className="mono" style={{
                    ...s.weekDotLabel,
                    color: d.isToday ? 'var(--cyan)' : d.worked ? 'var(--text2)' : 'var(--text3)',
                  }}>{d.label}</span>
                </div>
              ))}
            </div>
            <div style={s.weekMeta}>
              <div style={s.weekMetaItem}>
                <span style={{ ...s.weekMetaVal, color: 'var(--cyan)' }} className="mono">{workouts.filter(w => {
                  const d = new Date(w.date)
                  return (new Date() - d) / 86400000 <= 7
                }).length}</span>
                <span style={s.weekMetaLabel} className="mono">This week</span>
              </div>
              <div style={s.weekMetaItem}>
                <span style={{ ...s.weekMetaVal, color: 'var(--teal)' }} className="mono">{streak}</span>
                <span style={s.weekMetaLabel} className="mono">Day streak</span>
              </div>
              {nextWorkout && (
                <div style={s.weekMetaItem}>
                  <span style={{ ...s.weekMetaVal, color: 'var(--text)' }} className="mono">{nextWorkout.muscle_group}</span>
                  <span style={s.weekMetaLabel} className="mono">Tomorrow</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Supplement compliance */}
        {suppTotal > 0 && (
          <div style={s.section}>
            <div className="section-label" style={s.sLabel}>Supplements</div>
            <a href="/stack" className="card-sm" style={s.suppCard}>
              <div style={s.suppTop}>
                <span className="mono" style={{ ...s.suppPct, color: suppPct === 100 ? 'var(--teal)' : suppPct > 50 ? 'var(--cyan)' : 'var(--orange)' }}>{suppPct}%</span>
                <span className="mono" style={s.suppMeta}>{suppTaken} / {suppTotal} taken</span>
              </div>
              <div style={s.suppBar}>
                <div style={{ ...s.suppFill, width: `${suppPct}%` }} />
              </div>
            </a>
          </div>
        )}

        {/* Body */}
        <div style={s.section}>
          <div className="section-label" style={s.sLabel}>Body</div>
          <div style={s.twoCol}>
            <div className="card-sm" style={s.bodyCard}>
              <div style={s.bodyLabel} className="mono">Weight</div>
              <div style={s.bodyVal} className="mono">{latestWeight !== '--' ? `${latestWeight}` : '--'}</div>
              {latestWeight !== '--' && <div style={s.bodyUnit} className="mono">lbs</div>}
            </div>
            <div className="card-sm" style={s.bodyCard}>
              <div style={s.bodyLabel} className="mono">Body fat</div>
              <div style={s.bodyVal} className="mono">{bodyStats?.[0]?.body_fat_pct || '--'}</div>
              {bodyStats?.[0]?.body_fat_pct && <div style={s.bodyUnit} className="mono">%</div>}
            </div>
          </div>
        </div>

        {/* Quick start */}
        <div style={s.section}>
          <div className="section-label" style={s.sLabel}>Quick start</div>
          <div style={s.actions}>
            <a href="/train" style={s.actionCard} className="card-sm">
              <div style={s.actionAccent} />
              <div>
                <div style={s.actionTitle}>Start workout</div>
                <div style={s.actionSub} className="mono">Log sets and exercises</div>
              </div>
            </a>
            <a href="/nutrition" style={s.actionCard} className="card-sm">
              <div style={{ ...s.actionAccent, background: 'linear-gradient(180deg, var(--orange), #e67e22)' }} />
              <div>
                <div style={s.actionTitle}>Log a meal</div>
                <div style={s.actionSub} className="mono">Track calories and macros</div>
              </div>
            </a>
          </div>
        </div>

        {/* Quote */}
        <div style={s.section}>
          <div className="card" style={s.quoteCard}>
            <div style={s.quoteText}>"{quote.text}"</div>
            <div style={s.quoteAuthor} className="mono">— {quote.author}</div>
          </div>
        </div>

        {/* System */}
        <div style={s.section}>
          <div className="section-label" style={s.sLabel}>System</div>
          <div className="card" style={s.systemCard}>
            <div style={s.sysRow}>
              <span className="mono" style={s.sysLabel}>Middleware</span>
              <div style={s.sysStatus}><div style={s.sysDot} /><span className="mono" style={s.sysOnline}>Online</span></div>
            </div>
            <div style={{ ...s.sysRow, borderBottom: 'none' }}>
              <span className="mono" style={s.sysLabel}>AI Model</span>
              <span className="mono" style={s.sysVal}>Sonnet 4.5</span>
            </div>
          </div>
        </div>

      </div>
      <NomisChat />
    </Shell>
  )
}

function calculateStreak(workouts) {
  if (!workouts?.length) return 0
  const dates = [...new Set(workouts.map(w => w.date))].sort().reverse()
  let streak = 0
  const today = new Date()
  for (let i = 0; i < dates.length; i++) {
    const expected = new Date(today)
    expected.setDate(expected.getDate() - i)
    const expectedStr = expected.toISOString().split('T')[0]
    if (dates.includes(expectedStr)) streak++
    else break
  }
  return streak
}

const s = {
  page: { padding: '8px 0 40px' },
  greeting: { padding: '20px 24px 24px' },
  greetText: { fontSize: '1.35rem', fontWeight: '600', color: '#fff', letterSpacing: '-0.02em', marginBottom: '8px' },
  greetName: { color: 'var(--cyan)' },
  greetMeta: { display: 'flex', alignItems: 'center', gap: '12px' },
  dateMono: { fontSize: '0.55rem', color: 'var(--text3)', letterSpacing: '0.08em' },
  timeMono: { fontSize: '0.55rem', color: 'var(--text3)', letterSpacing: '0.08em', opacity: 0.6 },
  section: { marginBottom: '20px' },
  sLabel: { padding: '0 24px', marginBottom: '10px' },

  // Readiness
  readinessCard: { margin: '0 24px', padding: '20px' },
  readinessTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' },
  readinessLabel: { fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.14em', marginBottom: '6px' },
  readinessScore: { fontSize: '2.4rem', fontWeight: '700', lineHeight: 1 },
  readinessRight: { textAlign: 'right', maxWidth: '55%' },
  readinessText: { fontSize: '0.78rem', fontWeight: '500', lineHeight: 1.4 },
  readinessBar: { height: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '2px', overflow: 'hidden' },
  readinessFill: { height: '100%', borderRadius: '2px', transition: 'width 0.6s ease' },

  // Macros
  macroCard: { margin: '0 24px', overflow: 'hidden' },
  macroRow: { display: 'flex' },
  macroItem: { flex: 1, padding: '16px 8px', textAlign: 'center', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' },
  macroProgress: {},
  macroRing: { position: 'relative', width: '52px', height: '52px' },
  macroRingVal: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', color: 'var(--text2)', fontWeight: '500' },
  macroVal: { fontSize: '0.65rem', fontWeight: '600', lineHeight: 1 },
  macroUnit: { fontSize: '0.48rem', color: 'var(--text3)', fontWeight: '400' },
  macroLabel: { fontSize: '0.42rem', color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase' },
  miniMacros: { width: '100%', padding: '0 4px' },
  miniRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' },
  miniLabel: { fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.06em' },
  miniVal: { fontSize: '0.55rem', fontWeight: '500', color: 'var(--text2)' },

  // Two col
  twoCol: { display: 'flex', gap: '8px', padding: '0 24px' },
  twoColCard: { flex: 1, padding: '16px 14px', textDecoration: 'none' },
  miniCardLabel: { fontSize: '0.42rem', color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' },

  // Sleep
  sleepRow: { display: 'flex', alignItems: 'baseline', gap: '4px' },
  sleepNum: { fontSize: '1.5rem', fontWeight: '600', lineHeight: 1 },
  sleepUnit: { fontSize: '0.5rem', color: 'var(--text3)' },

  // Water
  waterRow: { display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '10px' },
  waterNum: { fontSize: '1.5rem', fontWeight: '600', lineHeight: 1 },
  waterUnit: { fontSize: '0.5rem', color: 'var(--text3)' },
  waterBtn: {
    width: '100%', padding: '8px', borderRadius: '8px',
    border: '1px solid var(--cyan-border)', background: 'var(--cyan-dim)',
    color: 'var(--cyan)', cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  },
  waterPlus: { fontSize: '1rem', fontWeight: '600' },

  // Week
  weekCard: { margin: '0 24px', padding: '20px 16px 16px' },
  weekDots: { display: 'flex', justifyContent: 'space-around', marginBottom: '16px' },
  weekDotCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' },
  weekDot: { width: '14px', height: '14px', borderRadius: '50%', transition: 'all 0.2s' },
  weekDotLabel: { fontSize: '0.42rem', letterSpacing: '0.06em' },
  weekMeta: { display: 'flex', borderTop: '1px solid var(--border)', paddingTop: '12px' },
  weekMetaItem: { flex: 1, textAlign: 'center' },
  weekMetaVal: { fontSize: '0.92rem', fontWeight: '600', lineHeight: 1, display: 'block', marginBottom: '4px' },
  weekMetaLabel: { fontSize: '0.42rem', color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase' },

  // Supplements
  suppCard: { margin: '0 24px', padding: '16px 18px', textDecoration: 'none', display: 'block' },
  suppTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  suppPct: { fontSize: '1rem', fontWeight: '600' },
  suppMeta: { fontSize: '0.52rem', color: 'var(--text3)', letterSpacing: '0.06em' },
  suppBar: { height: '3px', background: 'rgba(255,255,255,0.04)', borderRadius: '2px', overflow: 'hidden' },
  suppFill: { height: '100%', borderRadius: '2px', background: 'linear-gradient(90deg, var(--cyan), var(--teal))', transition: 'width 0.4s ease' },

  // Body
  bodyCard: { flex: 1, padding: '16px 14px', textAlign: 'center' },
  bodyLabel: { fontSize: '0.42rem', color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' },
  bodyVal: { fontSize: '1.3rem', fontWeight: '600', color: 'var(--text)', lineHeight: 1 },
  bodyUnit: { fontSize: '0.48rem', color: 'var(--text3)', marginTop: '4px' },

  // Actions
  actions: { display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 24px' },
  actionCard: { display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 18px', textDecoration: 'none' },
  actionAccent: { width: '3px', height: '32px', borderRadius: '2px', background: 'linear-gradient(180deg, var(--cyan), var(--teal))', flexShrink: 0 },
  actionTitle: { fontSize: '0.92rem', fontWeight: '600', color: 'var(--text)' },
  actionSub: { fontSize: '0.5rem', color: 'var(--text3)', letterSpacing: '0.04em', marginTop: '4px' },

  // Quote
  quoteCard: { margin: '0 24px', padding: '24px 20px', textAlign: 'center' },
  quoteText: { fontSize: '0.88rem', fontWeight: '500', color: 'var(--text)', lineHeight: 1.6, fontStyle: 'italic', marginBottom: '12px' },
  quoteAuthor: { fontSize: '0.5rem', color: 'var(--text3)', letterSpacing: '0.08em' },

  // System
  systemCard: { margin: '0 24px', padding: '4px 0' },
  sysRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--border)' },
  sysLabel: { fontSize: '0.6rem', color: 'var(--text3)', letterSpacing: '0.06em' },
  sysStatus: { display: 'flex', alignItems: 'center', gap: '6px' },
  sysDot: { width: '5px', height: '5px', borderRadius: '50%', background: 'var(--teal)', boxShadow: '0 0 6px rgba(45,212,191,0.3)' },
  sysOnline: { fontSize: '0.55rem', color: 'var(--teal)', letterSpacing: '0.08em' },
  sysVal: { fontSize: '0.55rem', color: 'var(--text2)', letterSpacing: '0.06em' },
}