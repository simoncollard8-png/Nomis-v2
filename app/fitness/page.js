'use client'
import Link from 'next/link'
import Nav from '../../components/Nav'
import NomisChat from '../../components/NomisChat'

const SUB_MODULES = [
  { href: '/fitness/workout',     name: 'WORKOUT',    icon: '💪', desc: 'Log sets · Track PRs · Body model' },
  { href: '/fitness/diet',        name: 'DIET',       icon: '🥗', desc: 'Macros · Meals · Water intake' },
  { href: '/fitness/cardio',      name: 'CARDIO',     icon: '♡',  desc: 'Walks · Runs · Heart rate' },
  { href: '/fitness/sleep',       name: 'SLEEP',      icon: '◎',  desc: 'Recovery · Quality · Trends' },
  { href: '/fitness/body',        name: 'BODY',       icon: '◈',  desc: 'Weight · Measurements · BF%' },
  { href: '/fitness/peptides',    name: 'PEPTIDES',   icon: '💉', desc: 'Cycles · Dosing · Research' },
  { href: '/fitness/supplements', name: 'SUPPLEMENTS',icon: '💊', desc: 'Stack · Timing · Analysis' },
]

export default function FitnessHub() {
  return (
    <div className="app-shell">
      <Nav />
      <main className="main-content">
        <div style={s.page}>
          <header className="page-header pwa-header">
            <div>
              <div className="page-title">FITNESS HUB</div>
              <div className="page-sub">PPL Strength Recomp · Graphs coming in Drop 2</div>
            </div>
          </header>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: '100%', background: 'var(--green)', color: 'var(--green)' }} />
          </div>

          <div style={s.body}>
            <div className="section-label">// MODULES</div>
            <div style={s.grid}>
              {SUB_MODULES.map((mod, i) => (
                <Link key={mod.href} href={mod.href} style={{ textDecoration: 'none' }}>
                  <div className="nomis-card" style={{ ...s.card, animationDelay: `${i * 60}ms` }}>
                    <div style={s.cornerTL} />
                    <div style={s.cardTop}>
                      <span style={s.cardIcon}>{mod.icon}</span>
                    </div>
                    <div style={s.cardName}>{mod.name}</div>
                    <div style={s.cardDesc}>{mod.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
      <NomisChat pageContext="User is on the Fitness Hub overview page." />
    </div>
  )
}

const s = {
  page: { minHeight: '100dvh', background: 'var(--bg)' },
  body: { padding: '24px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' },
  card: { borderRadius: '14px', padding: '20px 18px', minHeight: '130px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden', cursor: 'pointer', background: 'linear-gradient(135deg, rgba(34,212,138,0.05), var(--bg2))', border: '1px solid rgba(34,212,138,0.12)' },
  cornerTL: { position: 'absolute', top: '8px', left: '8px', width: '10px', height: '10px', borderTop: '1px solid rgba(34,212,138,0.45)', borderLeft: '1px solid rgba(34,212,138,0.45)', borderTopLeftRadius: '3px' },
  cardTop: { marginBottom: '12px' },
  cardIcon: { fontSize: '1.3rem' },
  cardName: { fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: '700', letterSpacing: '0.08em', color: 'var(--green)', marginBottom: '4px' },
  cardDesc: { fontFamily: 'var(--font-mono)', fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.04em' },
}
