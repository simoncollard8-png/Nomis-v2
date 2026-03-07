'use client'
import { useState, useEffect } from 'react'
import Shell from '../components/Shell'
import NomisChat from '../components/NomisChat'
import { getTodaysSummary, getRecentWorkouts, getRecentBodyStats, getRecentSleep } from '../lib/api'

export default function Dashboard() {
  const [summary, setSummary]     = useState(null)
  const [workouts, setWorkouts]   = useState([])
  const [bodyStats, setBodyStats] = useState([])
  const [sleepData, setSleepData] = useState([])
  const [mounted, setMounted]     = useState(false)
  const [time, setTime]           = useState('')
  const [date, setDate]           = useState('')
  const [greeting, setGreeting]   = useState('')

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

    Promise.all([
      getTodaysSummary().then(setSummary).catch(() => {}),
      getRecentWorkouts(7).then(setWorkouts).catch(() => {}),
      getRecentBodyStats(7).then(setBodyStats).catch(() => {}),
      getRecentSleep(7).then(setSleepData).catch(() => {}),
    ])

    return () => clearInterval(id)
  }, [])

  const todayCals = summary?.nutrition?.reduce((a, b) => a + (parseInt(b.calories) || 0), 0) || 0
  const todayProtein = summary?.nutrition?.reduce((a, b) => a + (parseInt(b.protein_g) || 0), 0) || 0
  const latestWeight = bodyStats?.[0]?.weight_lbs || '--'
  const latestSleep = sleepData?.[0]?.duration_hrs || sleepData?.[0]?.duration_hours || '--'
  const workoutCount = workouts?.length || 0
  const streak = calculateStreak(workouts)

  const stats = [
    { label: 'Weight', value: latestWeight !== '--' ? `${latestWeight}` : '--', unit: latestWeight !== '--' ? 'lbs' : '', color: 'var(--text)' },
    { label: 'Sleep', value: latestSleep !== '--' ? `${latestSleep}` : '--', unit: latestSleep !== '--' ? 'hrs' : '', color: 'var(--teal)' },
    { label: 'Calories', value: todayCals || '--', unit: todayCals ? 'cal' : '', color: 'var(--orange)' },
    { label: 'Protein', value: todayProtein || '--', unit: todayProtein ? 'g' : '', color: 'var(--cyan)' },
  ]

  return (
    <Shell title="NOMIS">
      <div style={s.page}>

        <div style={s.greeting}>
          <div style={s.greetText}>
            {mounted ? greeting : ''}, <span style={s.greetName}>Simon</span>
          </div>
          <div style={s.greetMeta}>
            <span className="mono" style={s.dateMono}>{mounted ? date : ''}</span>
            <span className="mono" style={s.timeMono}>{mounted ? time : ''}</span>
          </div>
        </div>

        <div style={s.section}>
          <div className="section-label" style={s.sLabel}>Today</div>
          <div className="card" style={s.statsGrid}>
            {stats.map((stat, i) => (
              <div key={stat.label} style={{
                ...s.statCell,
                borderRight: i < stats.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', justifyContent: 'center' }}>
                  <span style={{ ...s.statValue, color: stat.color }} className="mono">{stat.value}</span>
                  {stat.unit && <span style={s.statUnit} className="mono">{stat.unit}</span>}
                </div>
                <div style={s.statLabel} className="mono">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={s.section}>
          <div className="section-label" style={s.sLabel}>This week</div>
          <div style={s.weekCards}>
            <div className="card-sm" style={s.weekCard}>
              <div style={{ ...s.weekValue, color: 'var(--cyan)' }} className="mono">{workoutCount}</div>
              <div style={s.weekLabel} className="mono">Workouts</div>
            </div>
            <div className="card-sm" style={s.weekCard}>
              <div style={{ ...s.weekValue, color: 'var(--teal)' }} className="mono">{streak}</div>
              <div style={s.weekLabel} className="mono">Day streak</div>
            </div>
            <div className="card-sm" style={s.weekCard}>
              <div style={{ ...s.weekValue, color: 'var(--orange)' }} className="mono">
                {sleepData.length ? (sleepData.reduce((a, b) => a + (parseFloat(b.duration_hrs || b.duration_hours) || 0), 0) / sleepData.length).toFixed(1) : '--'}
              </div>
              <div style={s.weekLabel} className="mono">Avg sleep</div>
            </div>
          </div>
        </div>

        <div style={s.section}>
          <div className="section-label" style={s.sLabel}>Recent activity</div>
          <div className="card" style={s.activityCard}>
            {workouts.length === 0 && (
              <div style={s.emptyRow} className="mono">No recent workouts</div>
            )}
            {workouts.slice(0, 5).map((w, i) => (
              <div key={i} style={{
                ...s.activityRow,
                borderBottom: i < Math.min(workouts.length, 5) - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={s.activityLeft}>
                  <div style={s.activityDot} />
                  <div>
                    <div style={s.activityTitle}>{w.title || w.muscle_group}</div>
                    <div style={s.activityMeta} className="mono">{w.date}</div>
                  </div>
                </div>
                {w.feeling && <span className="mono" style={s.activityFeeling}>{w.feeling}</span>}
              </div>
            ))}
          </div>
        </div>

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
            <a href="/calendar" style={s.actionCard} className="card-sm">
              <div style={{ ...s.actionAccent, background: 'linear-gradient(180deg, var(--teal), #1a9988)' }} />
              <div>
                <div style={s.actionTitle}>View calendar</div>
                <div style={s.actionSub} className="mono">History and backfill data</div>
              </div>
            </a>
          </div>
        </div>

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
  greeting: { padding: '20px 24px 28px' },
  greetText: { fontSize: '1.35rem', fontWeight: '600', color: '#fff', letterSpacing: '-0.02em', marginBottom: '8px' },
  greetName: { color: 'var(--cyan)' },
  greetMeta: { display: 'flex', alignItems: 'center', gap: '12px' },
  dateMono: { fontSize: '0.55rem', color: 'var(--text3)', letterSpacing: '0.08em' },
  timeMono: { fontSize: '0.55rem', color: 'var(--text3)', letterSpacing: '0.08em', opacity: 0.6 },
  section: { marginBottom: '24px' },
  sLabel: { padding: '0 24px', marginBottom: '10px' },
  statsGrid: { margin: '0 24px', display: 'flex', overflow: 'hidden' },
  statCell: { flex: 1, padding: '18px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' },
  statValue: { fontSize: '1.05rem', fontWeight: '500', letterSpacing: '0.02em', lineHeight: 1 },
  statUnit: { fontSize: '0.5rem', color: 'var(--text3)', letterSpacing: '0.04em' },
  statLabel: { fontSize: '0.42rem', color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase' },
  weekCards: { display: 'flex', gap: '8px', padding: '0 24px' },
  weekCard: { flex: 1, padding: '18px 12px', textAlign: 'center' },
  weekValue: { fontSize: '1.15rem', fontWeight: '600', lineHeight: 1, marginBottom: '6px' },
  weekLabel: { fontSize: '0.42rem', color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase' },
  activityCard: { margin: '0 24px', overflow: 'hidden' },
  activityRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px' },
  activityLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  activityDot: { width: '6px', height: '6px', borderRadius: '50%', background: 'var(--cyan)', flexShrink: 0 },
  activityTitle: { fontSize: '0.88rem', fontWeight: '500', color: 'var(--text)' },
  activityMeta: { fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.04em', marginTop: '3px' },
  activityFeeling: { fontSize: '0.5rem', color: 'var(--text3)', letterSpacing: '0.06em' },
  emptyRow: { padding: '24px 18px', fontSize: '0.55rem', color: 'var(--text3)', letterSpacing: '0.06em', textAlign: 'center' },
  actions: { display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 24px' },
  actionCard: { display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 18px', textDecoration: 'none' },
  actionAccent: { width: '3px', height: '32px', borderRadius: '2px', background: 'linear-gradient(180deg, var(--cyan), var(--teal))', flexShrink: 0 },
  actionTitle: { fontSize: '0.92rem', fontWeight: '600', color: 'var(--text)' },
  actionSub: { fontSize: '0.5rem', color: 'var(--text3)', letterSpacing: '0.04em', marginTop: '4px' },
  systemCard: { margin: '0 24px', padding: '4px 0' },
  sysRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--border)' },
  sysLabel: { fontSize: '0.6rem', color: 'var(--text3)', letterSpacing: '0.06em' },
  sysStatus: { display: 'flex', alignItems: 'center', gap: '6px' },
  sysDot: { width: '5px', height: '5px', borderRadius: '50%', background: 'var(--teal)', boxShadow: '0 0 6px rgba(45,212,191,0.3)' },
  sysOnline: { fontSize: '0.55rem', color: 'var(--teal)', letterSpacing: '0.08em' },
  sysVal: { fontSize: '0.55rem', color: 'var(--text2)', letterSpacing: '0.06em' },
}
