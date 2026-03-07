'use client'
import { useState, useEffect } from 'react'
import Shell from '../components/Shell'
import NomisChat from '../components/NomisChat'
import { getTodaysSummary } from '../lib/api'

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [mounted, setMounted] = useState(false)
  const [time, setTime]       = useState('')
  const [date, setDate]       = useState('')
  const [greeting, setGreeting] = useState('')

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
    getTodaysSummary().then(setSummary).catch(() => {})
    return () => clearInterval(id)
  }, [])

  const stats = [
    {
      label: 'Workout',
      value: summary?.workouts?.length ? 'Done' : '--',
      color: summary?.workouts?.length ? 'var(--teal)' : 'var(--text3)',
    },
    {
      label: 'Sleep',
      value: summary?.sleep?.[0]?.duration_hrs ? `${summary.sleep[0].duration_hrs}h` : '--',
      color: summary?.sleep?.length ? 'var(--cyan)' : 'var(--text3)',
    },
    {
      label: 'Calories',
      value: summary?.nutrition?.length
        ? `${summary.nutrition.reduce((a, b) => a + (parseInt(b.calories) || 0), 0)}`
        : '--',
      color: summary?.nutrition?.length ? 'var(--orange)' : 'var(--text3)',
    },
    {
      label: 'Weight',
      value: summary?.bodyStats?.[0]?.weight_lbs ? `${summary.bodyStats[0].weight_lbs}` : '--',
      color: summary?.bodyStats?.length ? 'var(--text)' : 'var(--text3)',
    },
  ]

  return (
    <Shell title="NOMIS">
      <div style={s.page}>

        {/* Greeting */}
        <div style={s.greeting}>
          <div style={s.greetText}>
            {mounted ? greeting : ''}, <span style={s.greetName}>Simon</span>
          </div>
          <div style={s.greetDate}>
            <span style={s.dateMono}>{mounted ? date : ''}</span>
            <span style={s.timeMono}>{mounted ? time : ''}</span>
          </div>
        </div>

        {/* Today's stats */}
        <div style={s.section}>
          <div className="section-label" style={s.sectionLabel}>Today</div>
          <div className="card" style={s.statsCard}>
            {stats.map((stat, i) => (
              <div key={stat.label} style={{
                ...s.statCell,
                borderRight: i < stats.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ ...s.statValue, color: stat.color }} className="mono">
                  {stat.value}
                </div>
                <div style={s.statLabel} className="mono">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div style={s.section}>
          <div className="section-label" style={s.sectionLabel}>Quick start</div>
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

        {/* System status */}
        <div style={s.section}>
          <div className="section-label" style={s.sectionLabel}>System</div>
          <div className="card" style={s.systemCard}>
            <div style={s.systemRow}>
              <span style={s.systemLabel} className="mono">Middleware</span>
              <div style={s.systemStatus}>
                <div style={s.statusDot} />
                <span style={s.statusText} className="mono">Online</span>
              </div>
            </div>
            <div style={{ ...s.systemRow, borderBottom: 'none' }}>
              <span style={s.systemLabel} className="mono">AI Model</span>
              <span style={s.systemVal} className="mono">Sonnet 4.5</span>
            </div>
          </div>
        </div>

      </div>
      <NomisChat />
    </Shell>
  )
}

const s = {
  page: {
    padding: '8px 0 40px',
  },
  greeting: {
    padding: '20px 24px 28px',
  },
  greetText: {
    fontSize: '1.35rem',
    fontWeight: '600',
    color: '#fff',
    letterSpacing: '-0.02em',
    marginBottom: '8px',
  },
  greetName: {
    color: 'var(--cyan)',
  },
  greetDate: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  dateMono: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.55rem',
    color: 'var(--text3)',
    letterSpacing: '0.08em',
  },
  timeMono: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.55rem',
    color: 'var(--text3)',
    letterSpacing: '0.08em',
    opacity: 0.6,
  },

  section: {
    marginBottom: '24px',
  },
  sectionLabel: {
    padding: '0 24px',
    marginBottom: '10px',
  },

  // Stats card
  statsCard: {
    margin: '0 24px',
    display: 'flex',
    overflow: 'hidden',
  },
  statCell: {
    flex: 1,
    padding: '18px 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
  },
  statValue: {
    fontSize: '1rem',
    fontWeight: '500',
    letterSpacing: '0.02em',
    lineHeight: 1,
  },
  statLabel: {
    fontSize: '0.45rem',
    color: 'var(--text3)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },

  // Quick actions
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '0 24px',
  },
  actionCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px 18px',
    textDecoration: 'none',
    transition: 'border-color 0.15s',
  },
  actionAccent: {
    width: '3px',
    height: '32px',
    borderRadius: '2px',
    background: 'linear-gradient(180deg, var(--cyan), var(--teal))',
    flexShrink: 0,
  },
  actionTitle: {
    fontSize: '0.92rem',
    fontWeight: '600',
    color: 'var(--text)',
    letterSpacing: '-0.01em',
  },
  actionSub: {
    fontSize: '0.5rem',
    color: 'var(--text3)',
    letterSpacing: '0.04em',
    marginTop: '4px',
  },

  // System card
  systemCard: {
    margin: '0 24px',
    padding: '4px 0',
  },
  systemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 18px',
    borderBottom: '1px solid var(--border)',
  },
  systemLabel: {
    fontSize: '0.6rem',
    color: 'var(--text3)',
    letterSpacing: '0.06em',
  },
  systemStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  statusDot: {
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    background: 'var(--teal)',
    boxShadow: '0 0 6px rgba(45,212,191,0.3)',
  },
  statusText: {
    fontSize: '0.55rem',
    color: 'var(--teal)',
    letterSpacing: '0.08em',
  },
  systemVal: {
    fontSize: '0.55rem',
    color: 'var(--text2)',
    letterSpacing: '0.06em',
  },
}
