'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const modules = [
  { id: 'fitness',  name: 'FITNESS',  status: 'online',  icon: '⚡', stat: 'Push Day Today',  detail: 'PPL Strength Recomp' },
  { id: 'finance',  name: 'FINANCE',  status: 'offline', icon: '◈',  stat: 'Coming Soon',     detail: '' },
  { id: 'work',     name: 'WORK',     status: 'offline', icon: '◉',  stat: 'Coming Soon',     detail: '' },
  { id: 'health',   name: 'HEALTH',   status: 'offline', icon: '◎',  stat: 'Coming Soon',     detail: '' },
  { id: 'home',     name: 'HOME',     status: 'offline', icon: '◫',  stat: 'Coming Soon',     detail: '' },
  { id: 'projects', name: 'PROJECTS', status: 'offline', icon: '◧',  stat: 'Coming Soon',     detail: '' },
]

export default function Home() {
  const [time, setTime]       = useState('')
  const [greeting, setGreeting] = useState('')
  const [dateStr, setDateStr] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    function tick() {
      const now = new Date()
      const h   = now.getHours()
      setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening')
      setTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }))
      setDateStr(now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={s.page} className="safe-top">

      {/* Ambient background glow */}
      <div style={s.ambientGlow} />

      {/* Header */}
      <header style={s.header} className="pwa-header">
        <div style={s.logoRow}>
          <div style={s.logoMark} className="animate-orb">
            <span style={s.logoN}>N</span>
          </div>
          <div style={s.logoText}>
            <div style={s.logoName}>NOMIS</div>
            <div style={s.logoFull}>Neural Optimization & Management Intelligence System</div>
          </div>
        </div>
        <div style={s.headerRight}>
          <div style={s.timeDisplay}>{mounted ? time : '--:--:--'}</div>
          <div style={s.statusRow}>
            <div style={s.statusDot} className="animate-pulse-dot" />
            <span style={s.statusText}>ALL SYSTEMS ONLINE</span>
          </div>
        </div>
      </header>

      {/* Divider line */}
      <div style={s.headerLine}>
        <div style={s.headerLineInner} />
      </div>

      {/* Greeting section */}
      <section style={s.greetSection}>
        <div style={s.greetDate}>{mounted ? dateStr : ''}</div>
        <div style={s.greetName}>
          {greeting},&nbsp;<span style={s.greetAccent}>Simon.</span>
        </div>
        <div style={s.greetMeta}>
          <span style={s.metaTag}>1 MODULE ACTIVE</span>
          <span style={s.metaDivider}>·</span>
          <span style={s.metaTag}>5 OFFLINE</span>
          <span style={s.metaDivider}>·</span>
          <span style={{ ...s.metaTag, color: 'var(--green)' }}>PUSH DAY SCHEDULED</span>
        </div>
      </section>

      {/* Section header */}
      <div style={s.sectionHeader}>
        <span style={s.sectionLabel}>// MODULES</span>
        <div style={s.sectionLine} />
        <span style={s.sectionLabel}>6 CONFIGURED</span>
      </div>

      {/* Module grid */}
      <div style={s.grid}>
        {modules.map((mod, i) => (
          mod.status === 'online' ? (
            <Link key={mod.id} href={`/${mod.id}`} style={{ textDecoration: 'none' }}>
              <div
                className="nomis-card nomis-card-active"
                style={{ ...s.card, ...s.cardOnline, animationDelay: `${i * 80}ms` }}
              >
                {/* Corner accents */}
                <div style={s.cornerTL} />
                <div style={s.cornerBR} />

                <div style={s.cardTop}>
                  <span style={s.cardIcon}>{mod.icon}</span>
                  <span style={s.badgeOnline}>● ONLINE</span>
                </div>
                <div style={s.cardName}>{mod.name}</div>
                <div style={s.cardStat}>{mod.stat}</div>
                {mod.detail && <div style={s.cardDetail}>{mod.detail}</div>}

                {/* Bottom glow line */}
                <div style={s.cardGlowLine} />
              </div>
            </Link>
          ) : (
            <div
              key={mod.id}
              className="nomis-card"
              style={{ ...s.card, ...s.cardOffline, animationDelay: `${i * 80}ms` }}
            >
              <div style={s.cardTop}>
                <span style={{ ...s.cardIcon, color: 'var(--text4)' }}>{mod.icon}</span>
                <span style={s.badgeOffline}>○ OFFLINE</span>
              </div>
              <div style={{ ...s.cardName, color: 'var(--text4)' }}>{mod.name}</div>
              <div style={{ ...s.cardStat, color: 'var(--text4)' }}>{mod.stat}</div>
            </div>
          )
        ))}
      </div>

      {/* Footer */}
      <footer style={s.footer} className="safe-bottom">
        <span style={s.footerText}>NOMIS v2.0 · {mounted ? dateStr : ''}</span>
        <span style={s.footerText}>Railway · Supabase · Vercel</span>
      </footer>

    </div>
  )
}

const s = {
  page: {
    minHeight: '100vh',
    minHeight: '100dvh',
    background: 'var(--bg)',
    padding: '0 0 20px',
    position: 'relative',
    overflow: 'hidden',
  },
  ambientGlow: {
    position: 'fixed',
    top: '-20%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '800px',
    height: '400px',
    background: 'radial-gradient(ellipse, rgba(34,212,138,0.04) 0%, transparent 70%)',
    pointerEvents: 'none',
    zIndex: 0,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '24px 32px',
    position: 'relative',
    zIndex: 1,
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  logoMark: {
    width: '48px',
    height: '48px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, rgba(34,212,138,0.15), rgba(34,212,138,0.05))',
    border: '1px solid rgba(34,212,138,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  logoN: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.4rem',
    fontWeight: '700',
    color: 'var(--green)',
    letterSpacing: '0.05em',
  },
  logoText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  logoName: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.4rem',
    fontWeight: '700',
    letterSpacing: '0.25em',
    color: '#fff',
    lineHeight: 1,
  },
  logoFull: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.48rem',
    color: 'var(--text4)',
    letterSpacing: '0.08em',
    lineHeight: 1,
  },
  headerRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '6px',
  },
  timeDisplay: {
    fontFamily: 'var(--font-mono)',
    fontSize: '1.5rem',
    fontWeight: '500',
    color: 'var(--green)',
    letterSpacing: '0.08em',
    lineHeight: 1,
    textShadow: '0 0 20px rgba(34,212,138,0.4)',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  statusDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--green)',
    flexShrink: 0,
  },
  statusText: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.5rem',
    color: 'var(--green)',
    letterSpacing: '0.15em',
  },
  headerLine: {
    padding: '0 32px',
    marginBottom: '32px',
  },
  headerLineInner: {
    height: '1px',
    background: 'linear-gradient(90deg, transparent, rgba(34,212,138,0.3), rgba(34,212,138,0.1), transparent)',
  },
  greetSection: {
    padding: '0 32px',
    marginBottom: '40px',
    position: 'relative',
    zIndex: 1,
  },
  greetDate: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.58rem',
    color: 'var(--text3)',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    marginBottom: '10px',
  },
  greetName: {
    fontFamily: 'var(--font-display)',
    fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
    fontWeight: '600',
    color: '#fff',
    letterSpacing: '0.02em',
    lineHeight: 1.1,
    marginBottom: '12px',
  },
  greetAccent: {
    color: 'var(--green)',
    textShadow: '0 0 30px rgba(34,212,138,0.4)',
  },
  greetMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  metaTag: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.55rem',
    color: 'var(--text3)',
    letterSpacing: '0.1em',
  },
  metaDivider: {
    color: 'var(--text4)',
    fontSize: '0.6rem',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '0 32px',
    marginBottom: '20px',
  },
  sectionLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.52rem',
    color: 'var(--text3)',
    letterSpacing: '0.15em',
    whiteSpace: 'nowrap',
  },
  sectionLine: {
    flex: 1,
    height: '1px',
    background: 'var(--border)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    padding: '0 32px',
    position: 'relative',
    zIndex: 1,
  },
  card: {
    borderRadius: '16px',
    padding: '22px 20px',
    minHeight: '160px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
    cursor: 'pointer',
  },
  cardOnline: {
    background: 'linear-gradient(135deg, rgba(34,212,138,0.06) 0%, rgba(6,9,16,0.8) 60%)',
    border: '1px solid rgba(34,212,138,0.2)',
  },
  cardOffline: {
    background: 'var(--bg2)',
    border: '1px solid var(--border)',
    cursor: 'not-allowed',
    opacity: 0.4,
  },
  cornerTL: {
    position: 'absolute',
    top: '10px',
    left: '10px',
    width: '12px',
    height: '12px',
    borderTop: '1px solid rgba(34,212,138,0.5)',
    borderLeft: '1px solid rgba(34,212,138,0.5)',
    borderTopLeftRadius: '3px',
  },
  cornerBR: {
    position: 'absolute',
    bottom: '10px',
    right: '10px',
    width: '12px',
    height: '12px',
    borderBottom: '1px solid rgba(34,212,138,0.3)',
    borderRight: '1px solid rgba(34,212,138,0.3)',
    borderBottomRightRadius: '3px',
  },
  cardTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  cardIcon: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.3rem',
    color: 'var(--green)',
  },
  badgeOnline: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.42rem',
    letterSpacing: '0.12em',
    padding: '3px 8px',
    borderRadius: '4px',
    border: '1px solid rgba(34,212,138,0.25)',
    color: 'var(--green)',
    background: 'rgba(34,212,138,0.06)',
  },
  badgeOffline: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.42rem',
    letterSpacing: '0.12em',
    padding: '3px 8px',
    borderRadius: '4px',
    border: '1px solid var(--border)',
    color: 'var(--text4)',
  },
  cardName: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.15rem',
    fontWeight: '700',
    letterSpacing: '0.1em',
    color: 'var(--green)',
    lineHeight: 1,
  },
  cardStat: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.55rem',
    color: 'var(--text2)',
    letterSpacing: '0.06em',
    marginTop: '5px',
  },
  cardDetail: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.5rem',
    color: 'var(--text3)',
    letterSpacing: '0.06em',
    marginTop: '2px',
  },
  cardGlowLine: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: '1px',
    background: 'linear-gradient(90deg, transparent, rgba(34,212,138,0.4), transparent)',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '24px 32px 0',
    marginTop: '32px',
  },
  footerText: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.48rem',
    color: 'var(--text4)',
    letterSpacing: '0.1em',
  },
}
