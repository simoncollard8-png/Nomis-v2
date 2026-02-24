'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Nav from '../components/Nav'
import NomisChat from '../components/NomisChat'
import { getTodaysSummary } from '../lib/api'

const MODULES = [
  { href: '/fitness',  name: 'FITNESS',  icon: '⚡', desc: 'Workouts · Sleep · Diet · Body',        status: 'online' },
  { href: '#',         name: 'FINANCE',  icon: '◈',  desc: 'Budget · Spending · Goals',             status: 'offline' },
  { href: '#',         name: 'WORK',     icon: '◉',  desc: 'Tasks · Projects · Focus',              status: 'offline' },
  { href: '#',         name: 'HEALTH',   icon: '◎',  desc: 'Medical · Labs · Vitals',               status: 'offline' },
  { href: '#',         name: 'HOME',     icon: '◫',  desc: 'Maintenance · Shopping · Bills',        status: 'offline' },
  { href: '#',         name: 'MIND',     icon: '◬',  desc: 'Journaling · Mood · Habits',            status: 'offline' },
  { href: '#',         name: 'SOCIAL',   icon: '◭',  desc: 'Relationships · Events · Follow-ups',   status: 'offline' },
  { href: '#',         name: 'LEARN',    icon: '◪',  desc: 'Books · Courses · Skills',              status: 'offline' },
  { href: '/settings', name: 'SETTINGS', icon: '⚙',  desc: 'Profile · System · Preferences',       status: 'online' },
]

export default function Dashboard() {
  const [time, setTime]         = useState('')
  const [greeting, setGreeting] = useState('')
  const [dateStr, setDateStr]   = useState('')
  const [summary, setSummary]   = useState(null)
  const [mounted, setMounted]   = useState(false)

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
    { label: 'WORKOUT',  value: summary?.workouts?.length ? '✓' : '—', active: !!summary?.workouts?.length },
    { label: 'SLEEP',    value: summary?.sleep?.[0]?.duration_hrs ? `${summary.sleep[0].duration_hrs}h` : '—', active: !!summary?.sleep?.length },
    { label: 'CARDIO',   value: summary?.cardio?.[0]?.duration_min ? `${summary.cardio[0].duration_min}m` : '—', active: !!summary?.cardio?.length },
    { label: 'CALORIES', value: summary?.nutrition?.length ? `${summary.nutrition.reduce((a,b)=>a+(parseInt(b.calories)||0),0)}` : '—', active: !!summary?.nutrition?.length },
    { label: 'WEIGHT',   value: summary?.bodyStats?.[0]?.weight_lbs ? `${summary.bodyStats[0].weight_lbs}lb` : '—', active: !!summary?.bodyStats?.length },
  ]

  const onlineCount  = MODULES.filter(m => m.status === 'online').length
  const offlineCount = MODULES.filter(m => m.status === 'offline').length

  return (
    <div className="app-shell">
      <Nav />
      <main className="main-content">
        <div style={s.page}>
          <div style={s.ambientGlow} />

          <header style={s.header} className="pwa-header">
            <div>
              <div style={s.greetDate}>{mounted ? dateStr : ''}</div>
              <div style={s.greetName}>{greeting}, <span style={s.accent}>Simon.</span></div>
            </div>
            <div style={s.headerRight}>
              <div style={s.clock}>{mounted ? time : '--:--:--'}</div>
              <div style={s.onlineRow}>
                <div style={s.dot} className="animate-pulse" />
                <span style={s.onlineTxt}>ONLINE</span>
              </div>
            </div>
          </header>

          <div style={s.headerRule} />

          <div style={s.statsBar}>
            {todayStats.map(stat => (
              <div key={stat.label} style={s.statItem}>
                <div style={{ ...s.statVal, color: stat.active ? 'var(--green)' : 'var(--text4)' }}>{stat.value}</div>
                <div style={s.statLbl}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div style={s.sectionRow}>
            <span style={s.sectionLbl}>// MODULES</span>
            <div style={s.sectionLine} />
            <span style={s.sectionLbl}>{onlineCount} ACTIVE · {offlineCount} COMING SOON</span>
          </div>

          <div style={s.grid}>
            {MODULES.map((mod, i) =>
              mod.status === 'online' ? (
                <Link key={mod.name} href={mod.href} style={{ textDecoration: 'none' }}>
                  <div className="nomis-card" style={{ ...s.card, ...s.cardOnline, animationDelay: `${i * 55}ms` }}>
                    <div style={s.cornerTL} /><div style={s.cornerBR} />
                    <div style={s.cardTop}>
                      <span style={s.cardIcon}>{mod.icon}</span>
                      <span style={s.badgeOnline}>● ONLINE</span>
                    </div>
                    <div style={{ ...s.cardName, color: 'var(--green)' }}>{mod.name}</div>
                    <div style={s.cardDesc}>{mod.desc}</div>
                    <div style={s.cardGlow} />
                  </div>
                </Link>
              ) : (
                <div key={mod.name} className="nomis-card" style={{ ...s.card, ...s.cardOffline, animationDelay: `${i * 55}ms` }}>
                  <div style={s.cardTop}>
                    <span style={{ ...s.cardIcon, opacity: 0.2 }}>{mod.icon}</span>
                    <span style={s.badgeOffline}>○ SOON</span>
                  </div>
                  <div style={{ ...s.cardName, color: 'var(--text4)' }}>{mod.name}</div>
                  <div style={{ ...s.cardDesc, color: 'var(--text4)' }}>{mod.desc}</div>
                </div>
              )
            )}
          </div>

          <footer style={s.footer}>
            <span style={s.footerTxt}>NOMIS v2.0 · Neural Optimization & Management Intelligence System</span>
            <span style={s.footerTxt}>Railway · Supabase · Vercel · Claude</span>
          </footer>
        </div>
      </main>
      <NomisChat />
    </div>
  )
}

const s = {
  page: { minHeight: '100dvh', background: 'var(--bg)', paddingBottom: '40px', position: 'relative', overflow: 'hidden' },
  ambientGlow: { position: 'fixed', top: '-15%', left: '55%', transform: 'translateX(-50%)', width: '700px', height: '350px', background: 'radial-gradient(ellipse, rgba(34,212,138,0.04) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '28px 28px 20px', position: 'relative', zIndex: 1 },
  greetDate: { fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: 'var(--text3)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' },
  greetName: { fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', fontWeight: '600', color: '#fff', letterSpacing: '0.02em', lineHeight: 1.1 },
  accent: { color: 'var(--green)', textShadow: '0 0 28px rgba(34,212,138,0.35)' },
  headerRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px', flexShrink: 0 },
  clock: { fontFamily: 'var(--font-mono)', fontSize: '1.35rem', fontWeight: '500', color: 'var(--green)', letterSpacing: '0.08em', textShadow: '0 0 18px rgba(34,212,138,0.4)', lineHeight: 1 },
  onlineRow: { display: 'flex', alignItems: 'center', gap: '5px' },
  dot: { width: '5px', height: '5px', borderRadius: '50%', background: 'var(--green)', flexShrink: 0 },
  onlineTxt: { fontFamily: 'var(--font-mono)', fontSize: '0.46rem', color: 'var(--green)', letterSpacing: '0.14em' },
  headerRule: { margin: '0 28px 24px', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(34,212,138,0.2), rgba(34,212,138,0.06), transparent)' },
  statsBar: { display: 'flex', margin: '0 28px 28px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', position: 'relative', zIndex: 1 },
  statItem: { flex: 1, padding: '14px 8px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' },
  statVal: { fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: '500', letterSpacing: '0.04em', lineHeight: 1 },
  statLbl: { fontFamily: 'var(--font-mono)', fontSize: '0.38rem', color: 'var(--text4)', letterSpacing: '0.1em' },
  sectionRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '0 28px', marginBottom: '16px', position: 'relative', zIndex: 1 },
  sectionLbl: { fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text3)', letterSpacing: '0.15em', whiteSpace: 'nowrap' },
  sectionLine: { flex: 1, height: '1px', background: 'var(--border)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', padding: '0 28px', position: 'relative', zIndex: 1 },
  card: { borderRadius: '14px', padding: '18px 16px', minHeight: '138px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden', cursor: 'pointer' },
  cardOnline: { background: 'linear-gradient(135deg, rgba(34,212,138,0.05) 0%, var(--bg2) 60%)', border: '1px solid rgba(34,212,138,0.14)' },
  cardOffline: { background: 'var(--bg2)', border: '1px solid rgba(255,255,255,0.03)', cursor: 'not-allowed', opacity: 0.4 },
  cornerTL: { position: 'absolute', top: '8px', left: '8px', width: '10px', height: '10px', borderTop: '1px solid rgba(34,212,138,0.45)', borderLeft: '1px solid rgba(34,212,138,0.45)', borderTopLeftRadius: '3px' },
  cornerBR: { position: 'absolute', bottom: '8px', right: '8px', width: '10px', height: '10px', borderBottom: '1px solid rgba(34,212,138,0.2)', borderRight: '1px solid rgba(34,212,138,0.2)', borderBottomRightRadius: '3px' },
  cardTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' },
  cardIcon: { fontSize: '1.1rem', color: 'var(--green)' },
  badgeOnline: { fontFamily: 'var(--font-mono)', fontSize: '0.38rem', letterSpacing: '0.1em', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(34,212,138,0.2)', color: 'var(--green)', background: 'rgba(34,212,138,0.04)' },
  badgeOffline: { fontFamily: 'var(--font-mono)', fontSize: '0.38rem', letterSpacing: '0.1em', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)', color: 'var(--text4)' },
  cardName: { fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: '700', letterSpacing: '0.08em', lineHeight: 1, marginBottom: '4px' },
  cardDesc: { fontFamily: 'var(--font-mono)', fontSize: '0.44rem', color: 'var(--text3)', letterSpacing: '0.04em' },
  cardGlow: { position: 'absolute', bottom: 0, left: '15%', right: '15%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(34,212,138,0.3), transparent)' },
  footer: { display: 'flex', justifyContent: 'space-between', padding: '28px 28px 0', marginTop: '16px', flexWrap: 'wrap', gap: '8px' },
  footerTxt: { fontFamily: 'var(--font-mono)', fontSize: '0.4rem', color: 'var(--text4)', letterSpacing: '0.08em' },
}