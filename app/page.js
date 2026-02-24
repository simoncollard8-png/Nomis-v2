'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const modules = [
  {
    id: 'fitness',
    name: 'FITNESS',
    status: 'online',
    icon: '💪',
    stat: 'Push Day Today',
    detail: 'PPL Strength Recomp',
  },
  {
    id: 'finance',
    name: 'FINANCE',
    status: 'offline',
    icon: '💰',
    stat: 'Coming Soon',
    detail: '',
  },
  {
    id: 'work',
    name: 'WORK',
    status: 'offline',
    icon: '💼',
    stat: 'Coming Soon',
    detail: '',
  },
  {
    id: 'health',
    name: 'HEALTH',
    status: 'offline',
    icon: '🏥',
    stat: 'Coming Soon',
    detail: '',
  },
  {
    id: 'home',
    name: 'HOME',
    status: 'offline',
    icon: '🏠',
    stat: 'Coming Soon',
    detail: '',
  },
  {
    id: 'projects',
    name: 'PROJECTS',
    status: 'offline',
    icon: '📊',
    stat: 'Coming Soon',
    detail: '',
  },
]

export default function Home() {
  const [time, setTime] = useState('')
  const [greeting, setGreeting] = useState('')
  const [dateStr, setDateStr] = useState('')

  useEffect(() => {
    function tick() {
      const now = new Date()
      const h = now.getHours()
      setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening')
      setTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }))
      setDateStr(now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={s.page}>
      {/* Header */}
      <header style={s.header}>
        <div style={s.logoRow}>
          <div style={s.logoMark}>N</div>
          <div>
            <div style={s.logoName}>NOMIS</div>
            <div style={s.logoFull}>Neural Optimization & Management Intelligence System</div>
          </div>
        </div>
        <div style={s.headerRight}>
          <div style={s.timeDisplay}>{time}</div>
          <div style={s.onlineRow}>
            <div style={s.dot} />
            <span style={s.onlineText}>Systems Online</span>
          </div>
        </div>
      </header>

      {/* Greeting */}
      <section style={s.greetSection}>
        <div style={s.greetDate}>{dateStr}</div>
        <div style={s.greetName}>{greeting}, <span style={s.greetHighlight}>Simon.</span></div>
        <div style={s.greetSub}>1 module active · 5 modules offline · Push day on the board</div>
      </section>

      {/* Divider */}
      <div style={s.divider}>
        <span style={s.dividerLabel}>// MODULES</span>
        <div style={s.dividerLine} />
        <span style={s.dividerLabel}>6 CONFIGURED</span>
      </div>

      {/* Grid */}
      <div style={s.grid}>
        {modules.map((mod, i) => (
          mod.status === 'online' ? (
            <Link href={`/${mod.id}`} key={mod.id} style={{ textDecoration: 'none' }}>
              <div style={{ ...s.card, ...s.cardOnline, animationDelay: `${i * 60}ms` }} className="nomis-card">
                <div style={s.cardTop}>
                  <span style={s.cardIcon}>{mod.icon}</span>
                  <span style={s.badgeOnline}>ONLINE</span>
                </div>
                <div style={s.cardName}>{mod.name}</div>
                <div style={s.cardStat}>{mod.stat}</div>
                {mod.detail && <div style={s.cardDetail}>{mod.detail}</div>}
                <div style={s.cardCornerTR} />
              </div>
            </Link>
          ) : (
            <div key={mod.id} style={{ ...s.card, ...s.cardOffline, animationDelay: `${i * 60}ms` }} className="nomis-card">
              <div style={s.cardTop}>
                <span style={{ ...s.cardIcon, opacity: 0.3 }}>{mod.icon}</span>
                <span style={s.badgeOffline}>OFFLINE</span>
              </div>
              <div style={{ ...s.cardName, color: '#2a2a40' }}>{mod.name}</div>
              <div style={{ ...s.cardStat, color: '#1e1e30' }}>{mod.stat}</div>
            </div>
          )
        ))}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #060910; }

        .nomis-card {
          animation: fadeUp 0.4s ease both;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .nomis-card:hover {
          transform: translateY(-3px) !important;
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }
      `}</style>
    </div>
  )
}

const s = {
  page: {
    minHeight: '100vh',
    background: '#060910',
    padding: '40px 48px 60px',
    fontFamily: "'Rajdhani', sans-serif",
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '56px',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  logoMark: {
    width: '46px',
    height: '46px',
    borderRadius: '12px',
    background: 'rgba(34,212,138,0.08)',
    border: '1px solid rgba(34,212,138,0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.3rem',
    fontWeight: '700',
    color: '#22d48a',
    boxShadow: '0 0 20px rgba(34,212,138,0.1)',
  },
  logoName: {
    fontFamily: "'Rajdhani', sans-serif",
    fontSize: '1.5rem',
    fontWeight: '700',
    letterSpacing: '0.25em',
    color: '#ffffff',
    lineHeight: 1,
  },
  logoFull: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.5rem',
    color: '#333350',
    letterSpacing: '0.08em',
    marginTop: '3px',
  },
  headerRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '6px',
  },
  timeDisplay: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '1.4rem',
    color: '#22d48a',
    letterSpacing: '0.1em',
    lineHeight: 1,
  },
  onlineRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  dot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#22d48a',
    boxShadow: '0 0 8px rgba(34,212,138,0.8)',
  },
  onlineText: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.6rem',
    color: '#22d48a',
    letterSpacing: '0.12em',
  },
  greetSection: {
    marginBottom: '48px',
  },
  greetDate: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.6rem',
    color: '#333350',
    letterSpacing: '0.15em',
    marginBottom: '8px',
    textTransform: 'uppercase',
  },
  greetName: {
    fontFamily: "'Rajdhani', sans-serif",
    fontSize: '2.4rem',
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: '0.02em',
    lineHeight: 1.1,
    marginBottom: '8px',
  },
  greetHighlight: {
    color: '#22d48a',
  },
  greetSub: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.65rem',
    color: '#333350',
    letterSpacing: '0.08em',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '24px',
  },
  dividerLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.55rem',
    color: '#333350',
    letterSpacing: '0.15em',
    whiteSpace: 'nowrap',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: 'rgba(255,255,255,0.04)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '14px',
    maxWidth: '960px',
  },
  card: {
    borderRadius: '16px',
    padding: '28px 26px',
    minHeight: '170px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
    cursor: 'pointer',
  },
  cardOnline: {
    background: '#0a0f18',
    border: '1px solid rgba(34,212,138,0.2)',
    boxShadow: '0 0 30px rgba(34,212,138,0.04)',
  },
  cardOffline: {
    background: '#080b12',
    border: '1px solid rgba(255,255,255,0.03)',
    cursor: 'not-allowed',
  },
  cardTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardIcon: {
    fontSize: '1.5rem',
  },
  badgeOnline: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.45rem',
    letterSpacing: '0.12em',
    padding: '3px 8px',
    borderRadius: '4px',
    border: '1px solid rgba(34,212,138,0.3)',
    color: '#22d48a',
    background: 'rgba(34,212,138,0.06)',
  },
  badgeOffline: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.45rem',
    letterSpacing: '0.12em',
    padding: '3px 8px',
    borderRadius: '4px',
    border: '1px solid rgba(255,255,255,0.05)',
    color: '#222235',
    background: 'transparent',
  },
  cardName: {
    fontFamily: "'Rajdhani', sans-serif",
    fontSize: '1.2rem',
    fontWeight: '700',
    letterSpacing: '0.12em',
    color: '#22d48a',
    marginTop: '20px',
  },
  cardStat: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.6rem',
    color: '#555570',
    letterSpacing: '0.06em',
    marginTop: '4px',
  },
  cardDetail: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.55rem',
    color: '#333350',
    letterSpacing: '0.06em',
    marginTop: '2px',
  },
  cardCornerTR: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    width: '10px',
    height: '10px',
    borderTop: '1px solid rgba(34,212,138,0.4)',
    borderRight: '1px solid rgba(34,212,138,0.4)',
  },
}
