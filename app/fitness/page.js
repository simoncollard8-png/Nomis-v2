'use client'
import { useState, useEffect } from 'react'
import Nav from '../../components/Nav'
import NomisChat from '../../components/NomisChat'
import { getDashboardData, getPersonalRecords, getTodaysSummary } from '../../lib/api'

function MiniBarChart({ data, color = 'var(--green)', label, unit = '', height = 60 }) {
  if (!data || data.length === 0) return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text4)', letterSpacing: '0.1em' }}>NO DATA</span>
    </div>
  )
  const max = Math.max(...data.map(d => d.value), 0.1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', height: '100%', justifyContent: 'flex-end' }}>
            <div style={{
              width: '100%',
              height: `${Math.max((d.value / max) * 100, 4)}%`,
              background: d.value > 0 ? color : 'var(--border)',
              borderRadius: '3px 3px 0 0',
              transition: 'height 0.4s ease',
              boxShadow: d.value > 0 ? `0 0 6px ${color}55` : 'none',
              minHeight: '3px',
            }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '4px' }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.38rem', color: 'var(--text4)', letterSpacing: '0.04em' }}>
            {d.label}
          </div>
        ))}
      </div>
    </div>
  )
}

function LineChart({ data, color = 'var(--green)', height = 80 }) {
  if (!data || data.length < 2) return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text4)', letterSpacing: '0.1em' }}>NEED MORE DATA</span>
    </div>
  )
  const values = data.map(d => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const w = 300
  const h = height
  const pad = 8
  const points = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2)
    const y = h - pad - ((d.value - min) / range) * (h - pad * 2)
    return `${x},${y}`
  }).join(' ')
  const areaPoints = `${pad},${h - pad} ${points} ${w - pad},${h - pad}`

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height, overflow: 'visible' }}>
        <defs>
          <linearGradient id={`grad-${color.replace(/[^a-z]/gi,'')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill={`url(#grad-${color.replace(/[^a-z]/gi,'')})`} />
        <polyline points={points} fill="none" stroke={color} strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 0 4px ${color}88)` }} />
        {data.map((d, i) => {
          const [x, y] = points.split(' ')[i].split(',')
          return <circle key={i} cx={x} cy={y} r="2.5" fill={color} style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
        })}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.38rem', color: 'var(--text4)' }}>{data[0]?.label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.38rem', color: 'var(--text4)' }}>{data[data.length-1]?.label}</span>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, color = 'var(--green)', children }) {
  return (
    <div style={cs.statCard}>
      <div style={cs.statLabel}>{label}</div>
      <div style={{ ...cs.statValue, color }}>{value}</div>
      {sub && <div style={cs.statSub}>{sub}</div>}
      {children}
    </div>
  )
}

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function getLast7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return { date: d.toISOString().split('T')[0], label: DAYS[d.getDay()] }
  })
}

export default function FitnessHub() {
  const [data, setData]       = useState(null)
  const [prs, setPrs]         = useState([])
  const [today, setToday]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getDashboardData(), getPersonalRecords(), getTodaysSummary()]).then(([d, p, t]) => {
      setData(d)
      // dedupe PRs — best per exercise
      const map = {}
      p.forEach(pr => {
        if (!map[pr.metric] || parseFloat(pr.value) > parseFloat(map[pr.metric].value)) map[pr.metric] = pr
      })
      setPrs(Object.values(map).sort((a,b) => parseFloat(b.value) - parseFloat(a.value)).slice(0, 6))
      setToday(t)
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className="app-shell">
      <Nav />
      <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text3)', letterSpacing: '0.15em' }} className="animate-pulse">
          LOADING DATA...
        </div>
      </main>
    </div>
  )

  const last7 = getLast7Days()

  // Build chart data
  const sleepData = last7.map(day => {
    const entry = data.sleep.find(s => s.date === day.date)
    return { label: day.label, value: entry ? parseFloat(entry.duration_hrs) : 0 }
  })

  const cardioData = last7.map(day => {
    const entries = data.cardio.filter(c => c.date === day.date)
    return { label: day.label, value: entries.reduce((a,b) => a + parseInt(b.duration_min||0), 0) }
  })

  const milesData = last7.map(day => {
    const entries = data.cardio.filter(c => c.date === day.date)
    return { label: day.label, value: entries.reduce((a,b) => a + parseFloat(b.distance_miles||0), 0) }
  })

  const workoutData = last7.map(day => {
    const entries = data.workouts.filter(w => w.date === day.date)
    return { label: day.label, value: entries.length > 0 ? 1 : 0 }
  })

  const weightData = data.bodyStats
    .filter(b => b.weight_lbs)
    .slice(-10)
    .map(b => ({ label: b.date.slice(5), value: parseFloat(b.weight_lbs) }))

  // Summary stats
  const avgSleep = sleepData.filter(d => d.value > 0).length
    ? (sleepData.filter(d=>d.value>0).reduce((a,b) => a+b.value, 0) / sleepData.filter(d=>d.value>0).length).toFixed(1)
    : null
  const totalCardio = cardioData.reduce((a,b) => a+b.value, 0)
  const totalMiles  = milesData.reduce((a,b) => a+b.value, 0).toFixed(1)
  const workoutsThisWeek = workoutData.filter(d => d.value > 0).length
  const latestWeight = data.bodyStats.filter(b=>b.weight_lbs).slice(-1)[0]?.weight_lbs
  const prevWeight   = data.bodyStats.filter(b=>b.weight_lbs).slice(-2)[0]?.weight_lbs
  const weightDiff   = latestWeight && prevWeight ? (parseFloat(latestWeight) - parseFloat(prevWeight)).toFixed(1) : null

  // Today status
  const todayWorked  = today?.workouts?.length > 0
  const todaySlept   = today?.sleep?.[0]?.duration_hrs
  const todayCardio  = today?.cardio?.[0]?.duration_min
  const todayCalories = today?.nutrition?.reduce((a,b) => a+(parseInt(b.calories)||0), 0)

  const pageContext = `
User is on the Fitness Hub dashboard.
This week: ${workoutsThisWeek}/7 workouts, avg sleep ${avgSleep||'unknown'} hrs, total cardio ${totalCardio} min, ${totalMiles} miles.
Current weight: ${latestWeight||'unknown'} lbs.
Today: workout ${todayWorked?'done':'not logged'}, sleep ${todaySlept||'not logged'} hrs, cardio ${todayCardio||'not logged'} min.
  `.trim()

  return (
    <div className="app-shell">
      <Nav />
      <main className="main-content">
        <div style={s.page}>
          <div style={s.ambientGlow} />

          {/* Header */}
          <header className="pwa-header" style={s.header}>
            <div>
              <div className="page-title">FITNESS HUB</div>
              <div className="page-sub">PPL Strength Recomp · Last 7 days</div>
            </div>
            <div style={s.headerStats}>
              <div style={s.hStat}>
                <span style={{ ...s.hStatVal, color: todayWorked ? 'var(--green)' : 'var(--text4)' }}>
                  {todayWorked ? '✓' : '—'}
                </span>
                <span style={s.hStatLbl}>TODAY</span>
              </div>
              <div style={s.hStat}>
                <span style={s.hStatVal}>{workoutsThisWeek}<span style={s.hStatUnit}>/7</span></span>
                <span style={s.hStatLbl}>SESSIONS</span>
              </div>
            </div>
          </header>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${(workoutsThisWeek/7)*100}%`, background: 'var(--green)', color: 'var(--green)' }} />
          </div>

          <div style={s.body}>

            {/* Today's status row */}
            <div style={s.todayRow}>
              {[
                { label: 'WORKOUT',  value: todayWorked ? '✓ DONE' : 'NOT LOGGED', active: todayWorked },
                { label: 'SLEEP',    value: todaySlept ? `${todaySlept}h` : '—',    active: !!todaySlept },
                { label: 'CARDIO',   value: todayCardio ? `${todayCardio}m` : '—',  active: !!todayCardio },
                { label: 'CALORIES', value: todayCalories ? `${todayCalories}` : '—', active: !!todayCalories },
              ].map(item => (
                <div key={item.label} style={s.todayItem}>
                  <div style={{ ...s.todayVal, color: item.active ? 'var(--green)' : 'var(--text4)' }}>{item.value}</div>
                  <div style={s.todayLbl}>{item.label}</div>
                </div>
              ))}
            </div>

            {/* Row 1 — Sleep + Workout frequency */}
            <div style={s.row2}>
              <div style={s.graphCard}>
                <div style={s.graphHeader}>
                  <span style={s.graphTitle}>SLEEP DURATION</span>
                  <span style={s.graphStat}>{avgSleep ? `${avgSleep}h avg` : 'no data'}</span>
                </div>
                <MiniBarChart data={sleepData} color="var(--cyan)" height={70} />
              </div>
              <div style={s.graphCard}>
                <div style={s.graphHeader}>
                  <span style={s.graphTitle}>WORKOUT DAYS</span>
                  <span style={s.graphStat}>{workoutsThisWeek} this week</span>
                </div>
                <MiniBarChart data={workoutData} color="var(--green)" height={70} />
              </div>
            </div>

            {/* Row 2 — Cardio time + Miles */}
            <div style={s.row2}>
              <div style={s.graphCard}>
                <div style={s.graphHeader}>
                  <span style={s.graphTitle}>CARDIO TIME</span>
                  <span style={s.graphStat}>{totalCardio}m total</span>
                </div>
                <MiniBarChart data={cardioData} color="var(--orange)" height={70} />
              </div>
              <div style={s.graphCard}>
                <div style={s.graphHeader}>
                  <span style={s.graphTitle}>MILES WALKED/RAN</span>
                  <span style={s.graphStat}>{totalMiles} mi total</span>
                </div>
                <MiniBarChart data={milesData} color="#f97316" height={70} />
              </div>
            </div>

            {/* Weight trend — full width */}
            <div style={s.graphCardWide}>
              <div style={s.graphHeader}>
                <span style={s.graphTitle}>WEIGHT TREND</span>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {weightDiff && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: parseFloat(weightDiff) < 0 ? 'var(--green)' : 'var(--red)', letterSpacing: '0.06em' }}>
                      {parseFloat(weightDiff) > 0 ? '+' : ''}{weightDiff} lbs
                    </span>
                  )}
                  <span style={s.graphStat}>{latestWeight ? `${latestWeight} lbs` : 'no data'}</span>
                </div>
              </div>
              <LineChart data={weightData} color="var(--purple)" height={90} />
            </div>

            {/* PRs */}
            {prs.length > 0 && (
              <div style={s.prSection}>
                <div style={s.graphHeader}>
                  <span style={s.graphTitle}>PERSONAL RECORDS</span>
                  <span style={s.graphStat}>{prs.length} tracked</span>
                </div>
                <div style={s.prGrid}>
                  {prs.map((pr, i) => (
                    <div key={i} style={s.prCard}>
                      <div style={s.prExercise}>{pr.metric}</div>
                      <div style={s.prVal}>{pr.value} <span style={s.prUnit}>{pr.unit}</span></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* NOMIS insight */}
            <div style={s.insightCard}>
              <div style={s.insightLabel}>// NOMIS INSIGHT</div>
              <div style={s.insightText}>
                {workoutsThisWeek >= 5
                  ? `Strong week — ${workoutsThisWeek} sessions logged. ${avgSleep && parseFloat(avgSleep) >= 7 ? 'Sleep is solid too. Keep pushing.' : 'Watch your recovery — sleep avg is under 7h.'}`
                  : workoutsThisWeek >= 3
                  ? `Decent week — ${workoutsThisWeek} sessions in. Room to push harder.${avgSleep ? ` Avg sleep: ${avgSleep}h.` : ''}`
                  : `Only ${workoutsThisWeek} session${workoutsThisWeek !== 1 ? 's' : ''} this week. Let's get after it — open the workout module.`
                }
              </div>
            </div>

          </div>
        </div>
      </main>
      <NomisChat pageContext={pageContext} />
    </div>
  )
}

const s = {
  page: { minHeight: '100dvh', background: 'var(--bg)', paddingBottom: '40px', position: 'relative' },
  ambientGlow: { position: 'fixed', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '300px', background: 'radial-gradient(ellipse, rgba(34,212,138,0.04) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '24px 24px 18px', borderBottom: '1px solid var(--border)' },
  headerStats: { display: 'flex', gap: '20px', alignItems: 'center' },
  hStat: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' },
  hStatVal: { fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: '500', color: 'var(--green)', lineHeight: 1 },
  hStatUnit: { fontSize: '0.65rem', color: 'var(--text3)' },
  hStatLbl: { fontFamily: 'var(--font-mono)', fontSize: '0.42rem', color: 'var(--text4)', letterSpacing: '0.12em' },
  body: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' },
  todayRow: { display: 'flex', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' },
  todayItem: { flex: 1, padding: '14px 10px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' },
  todayVal: { fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: '500', letterSpacing: '0.04em', lineHeight: 1 },
  todayLbl: { fontFamily: 'var(--font-mono)', fontSize: '0.38rem', color: 'var(--text4)', letterSpacing: '0.1em' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  graphCard: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' },
  graphCardWide: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' },
  graphHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' },
  graphTitle: { fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text3)', letterSpacing: '0.12em' },
  graphStat: { fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--green)', letterSpacing: '0.06em' },
  prSection: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' },
  prGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '4px' },
  prCard: { background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px' },
  prExercise: { fontFamily: 'var(--font-mono)', fontSize: '0.46rem', color: 'var(--text3)', letterSpacing: '0.06em', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  prVal: { fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: '500', color: 'var(--green)' },
  prUnit: { fontSize: '0.5rem', color: 'var(--text3)' },
  insightCard: { background: 'linear-gradient(135deg, rgba(34,212,138,0.05), var(--bg2))', border: '1px solid rgba(34,212,138,0.15)', borderRadius: '12px', padding: '16px' },
  insightLabel: { fontFamily: 'var(--font-mono)', fontSize: '0.48rem', color: 'var(--green)', letterSpacing: '0.15em', marginBottom: '8px', opacity: 0.7 },
  insightText: { fontFamily: 'var(--font-display)', fontSize: '0.9rem', color: 'var(--text2)', lineHeight: '1.6', fontWeight: '400' },
}

const cs = {
  statCard: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' },
  statLabel: { fontFamily: 'var(--font-mono)', fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.12em', marginBottom: '6px' },
  statValue: { fontFamily: 'var(--font-mono)', fontSize: '1.3rem', fontWeight: '500', lineHeight: 1, marginBottom: '3px' },
  statSub: { fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text3)', letterSpacing: '0.06em' },
}
