'use client'
import Nav from '../../components/Nav'
import NomisChat from '../../components/NomisChat'

export default function Settings() {
  const rows = [
    { section: '// PROFILE', items: [
      { label: 'Name', value: 'Simon' },
      { label: 'Program', value: 'PPL Strength Recomp' },
      { label: 'Goal', value: 'Recomp — Build + Cut' },
    ]},
    { section: '// MODULES', items: [
      { label: 'Fitness Hub',   value: 'Online', color: 'var(--green)' },
      { label: 'Workout',       value: 'Online', color: 'var(--green)' },
      { label: 'Diet',          value: 'Online', color: 'var(--green)' },
      { label: 'Cardio',        value: 'Online', color: 'var(--green)' },
      { label: 'Sleep',         value: 'Online', color: 'var(--green)' },
      { label: 'Body Stats',    value: 'Online', color: 'var(--green)' },
      { label: 'Peptides',      value: 'Online', color: 'var(--green)' },
      { label: 'Supplements',   value: 'Online', color: 'var(--green)' },
    ]},
    { section: '// INFRASTRUCTURE', items: [
      { label: 'Database',    value: 'Supabase' },
      { label: 'Middleware',  value: 'Railway' },
      { label: 'Frontend',    value: 'Vercel + Next.js 15' },
      { label: 'AI Engine',   value: 'Claude (Anthropic)' },
      { label: 'Context',     value: '30-day rolling window' },
    ]},
    { section: '// PWA', items: [
      { label: 'Version',           value: 'v2.0.0' },
      { label: 'Install on iPhone', value: 'Safari → Share → Add to Home Screen' },
      { label: 'Offline',           value: 'Partial — reads cached data' },
    ]},
  ]

  return (
    <div className="app-shell">
      <Nav />
      <main className="main-content">
        <div style={s.page}>
          <header className="page-header pwa-header">
            <div>
              <div className="page-title">SETTINGS</div>
              <div className="page-sub">NOMIS v2.0.0</div>
            </div>
          </header>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: '100%', background: 'linear-gradient(90deg, var(--green), var(--cyan))', color: 'var(--green)' }} />
          </div>

          <div style={s.body}>
            {rows.map(group => (
              <div key={group.section} style={s.group}>
                <div className="section-label">{group.section}</div>
                <div className="info-card" style={{ padding: 0, overflow: 'hidden' }}>
                  {group.items.map((item, i) => (
                    <div key={i} style={{ ...s.row, ...(i < group.items.length - 1 ? { borderBottom: '1px solid var(--border)' } : {}) }}>
                      <span style={s.rowLabel}>{item.label}</span>
                      <span style={{ ...s.rowVal, color: item.color || 'var(--text2)' }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div style={s.footer}>
              <div style={s.footerText}>NOMIS — Neural Optimization & Management Intelligence System</div>
              <div style={s.footerText}>© 2026 Simon · Built with Next.js + Claude AI</div>
            </div>
          </div>
        </div>
      </main>
      <NomisChat pageContext="User is on the Settings page." />
    </div>
  )
}

const s = {
  page: { minHeight: '100dvh', background: 'var(--bg)', paddingBottom: '40px' },
  body: { padding: '24px' },
  group: { marginBottom: '24px' },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px' },
  rowLabel: { fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: '500', color: 'var(--text)' },
  rowVal: { fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.06em', textAlign: 'right', maxWidth: '55%' },
  footer: { textAlign: 'center', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' },
  footerText: { fontFamily: 'var(--font-mono)', fontSize: '0.46rem', color: 'var(--text4)', letterSpacing: '0.08em' },
}
