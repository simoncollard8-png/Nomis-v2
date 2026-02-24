'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getTodaysSummary } from '../lib/api'

const modules = [
  { id: 'fitness',  name: 'FITNESS',  status: 'online',  icon: '⚡', description: 'Workouts · PRs · Body' },
  { id: 'history',  name: 'HISTORY',  status: 'online',  icon: '📈', description: 'Past sessions · Trends' },
  { id: 'sleep',    name: 'SLEEP',    status: 'online',  icon: '◎',  description: 'Sleep tracking · Quality' },
  { id: 'cardio',   name: 'CARDIO',   status: 'online',  icon: '♡',  description: 'Walks · Runs · HR' },
  { id: 'stats',    name: 'BODY',     status: 'online',  icon: '◈',  description: 'Weight · Measurements' },
  { id: 'settings', name: 'SETTINGS', status: 'online',  icon: '⚙',  description: 'Profile · Preferences' },
]

export default function Home() {
  const [time, setTime]       = useState('')
  const [greeting, setGreeting] = useState('')
  const [dateStr, setDateStr] = useState('')
  const [mounted, setMounted] = useState(false)
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    setMounted(true)
    function tick() {
      const now = new Date()
      const h = now.getHours()
      setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening')
      setTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }))
      setDateStr(now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }))
    }
    tick()
    const id = setInterval(tick, 1000)
    getTodaysSummary().then(setSummary)
    return () => clearInterval(id)
  }, [])

  const todayStats = [
    { label: 'WORKOUT', value: summary?.workouts?.length ? '✓ DONE' : '—', active: !!summary?.workouts?.length },
    { label: 'SLEEP', value: summary?.sleep?.[0]?.duration_hrs ? `${summary.sleep[0].duration_hrs}h` : '—', active: !!summary?.sleep?.length },
    { label: 'CARDIO', value: summary?.cardio?.[0]?.activity || '—', active: !!summary?.cardio?.length },
    { label: 'WEIGHT', value: summary?.bodyStats?.[0]?.weight_lbs ? `${summary.bodyStats[0].weight_lbs} lbs` : '—', active: !!summary?.bodyStats?.length },
  ]

  return (
    <div style={s.page} className="safe-top">
      <div style={s.ambientGlow} />

      {/* Header */}
      <header style={s.header} className="pwa-header">
        <div style={s.logoRow}>
          <div style={s.logoMark} className="animate-orb">
            <span style={s.logoN}>N</span>
          </div>
          <div>
            <div style={s.logoName}>NOMIS</div>
            <div style={s.logoSub}>Neural Optimization & Management Intelligence System</div>
          </div>
        </div>
        <div style={s.headerRight}>
          <div style={s.clock}>{mounted ? time : '--:--:--'}</div>
          <div style={s.onlineRow}>
            <div style={s.dot} className="animate-pulse-dot" />
            <span style={s.onlineTxt}>ONLINE</span>
          </div>
        </div>
      </header>

      <div style={s.headerRule} />

      {/* Greeting */}
      <section style={s.greet}>
        <div style={s.greetDate}>{mounted ? dateStr : ''}</div>
        <div style={s.greetName}>{greeting}, <span style={s.accent}>Simon.</span></div>
      </section>

      {/* Today stats bar */}
      <div style={s.statsBar}>
        {todayStats.map(stat => (
          <div key={stat.label} style={s.statItem}>
            <div style={{ ...s.statVal, color: stat.active ? 'var(--green)' : 'var(--text3)' }}>
              {stat.value}
            </div>
            <div style={s.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Section label */}
      <div style={s.sectionRow}>
        <span style={s.sectionLbl}>// MODULES</span>
        <div style={s.sectionLine} />
        <span style={s.sectionLbl}>6 ACTIVE</span>
      </div>

      {/* Grid */}
      <div style={s.grid}>
        {modules.map((mod, i) => (
          <Link key={mod.id} href={`/${mod.id}`} style={{ textDecoration: 'none' }}>
            <div
              className="nomis-card nomis-card-active"
              style={{ ...s.card, animationDelay: `${i * 70}ms` }}
            >
              <div style={s.cornerTL} />
              <div style={s.cornerBR} />
              <div style={s.cardTop}>
                <span style={s.cardIcon}>{mod.icon}</span>
                <span style={s.badgeOnline}>● ONLINE</span>
              </div>
              <div style={s.cardName}>{mod.name}</div>
              <div style={s.cardDesc}>{mod.description}</div>
              <div style={s.cardGlow} />
            </div>
          </Link>
        ))}
      </div>

      <footer style={s.footer} className="safe-bottom">
        <span style={s.footerTxt}>NOMIS v2.0</span>
        <span style={s.footerTxt}>Railway · Supabase · Vercel</span>
      </footer>
    </div>
  )
}

const s = {
  page: { minHeight: '100dvh', background: 'var(--bg)', paddingBottom: '24px', position: 'relative', overflow: 'hidden' },
  ambientGlow: { position: 'fixed', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: '800px', height: '400px', background: 'radial-gradient(ellipse, rgba(34,212,138,0.04) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 28px', position: 'relative', zIndex: 1 },
  logoRow: { display: 'flex', alignItems: 'center', gap: '14px' },
  logoMark: { width: '46px', height: '46px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(34,212,138,0.15), rgba(34,212,138,0.03))', border: '1px solid rgba(34,212,138,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  logoN: { fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: '700', color: 'var(--green)' },
  logoName: { fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: '700', letterSpacing: '0.25em', color: '#fff', lineHeight: 1 },
  logoSub: { fontFamily: 'var(--font-mono)', fontSize: '0.44rem', color: 'var(--text4)', letterSpacing: '0.06em', marginTop: '3px' },
  headerRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' },
  clock: { fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: '500', color: 'var(--green)', letterSpacing: '0.08em', textShadow: '0 0 20px rgba(34,212,138,0.4)', lineHeight: 1 },
  onlineRow: { display: 'flex', alignItems: 'center', gap: '5px' },
  dot: { width: '5px', height: '5px', borderRadius: '50%', background: 'var(--green)', flexShrink: 0 },
  onlineTxt: { fontFamily: 'var(--font-mono)', fontSize: '0.48rem', color: 'var(--green)', letterSpacing: '0.15em' },
  headerRule: { margin: '0 28px 28px', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(34,212,138,0.25), rgba(34,212,138,0.08), transparent)' },
  greet: { padding: '0 28px', marginBottom: '28px', position: 'relative', zIndex: 1 },
  greetDate: { fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text3)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' },
  greetName: { fontFamily: 'var(--font-display)', fontSize: 'clamp(1.7rem, 4vw, 2.4rem)', fontWeight: '600', color: '#fff', letterSpacing: '0.02em', lineHeight: 1.1 },
  accent: { color: 'var(--green)', textShadow: '0 0 30px rgba(34,212,138,0.35)' },
  statsBar: { display: 'flex', gap: '0', margin: '0 28px 32px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', position: 'relative', zIndex: 1 },
  statItem: { flex: 1, padding: '14px 12px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', lastChild: { borderRight: 'none' } },
  statVal: { fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: '500', letterSpacing: '0.05em', lineHeight: 1 },
  statLabel: { fontFamily: 'var(--font-mono)', fontSize: '0.42rem', color: 'var(--text4)', letterSpacing: '0.12em' },
  sectionRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '0 28px', marginBottom: '16px' },
  sectionLbl: { fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text3)', letterSpacing: '0.15em', whiteSpace: 'nowrap' },
  sectionLine: { flex: 1, height: '1px', background: 'var(--border)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', padding: '0 28px', position: 'relative', zIndex: 1 },
  card: { borderRadius: '14px', padding: '20px 18px', minHeight: '148px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden', cursor: 'pointer', background: 'linear-gradient(135deg, rgba(34,212,138,0.05) 0%, var(--bg2) 60%)', border: '1px solid rgba(34,212,138,0.15)' },
  cornerTL: { position: 'absolute', top: '9px', left: '9px', width: '10px', height: '10px', borderTop: '1px solid rgba(34,212,138,0.5)', borderLeft: '1px solid rgba(34,212,138,0.5)', borderTopLeftRadius: '3px' },
  cornerBR: { position: 'absolute', bottom: '9px', right: '9px', width: '10px', height: '10px', borderBottom: '1px solid rgba(34,212,138,0.2)', borderRight: '1px solid rgba(34,212,138,0.2)', borderBottomRightRadius: '3px' },
  cardTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' },
  cardIcon: { fontSize: '1.2rem', color: 'var(--green)' },
  badgeOnline: { fontFamily: 'var(--font-mono)', fontSize: '0.4rem', letterSpacing: '0.1em', padding: '2px 7px', borderRadius: '4px', border: '1px solid rgba(34,212,138,0.2)', color: 'var(--green)', background: 'rgba(34,212,138,0.05)' },
  cardName: { fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: '700', letterSpacing: '0.1em', color: 'var(--green)', lineHeight: 1, marginBottom: '4px' },
  cardDesc: { fontFamily: 'var(--font-mono)', fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.05em' },
  cardGlow: { position: 'absolute', bottom: 0, left: '15%', right: '15%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(34,212,138,0.35), transparent)' },
  footer: { display: 'flex', justifyContent: 'space-between', padding: '24px 28px 0', marginTop: '24px' },
  footerTxt: { fontFamily: 'var(--font-mono)', fontSize: '0.44rem', color: 'var(--text4)', letterSpacing: '0.1em' },
}
