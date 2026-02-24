'use client'
import Nav from '../../../components/Nav'
import NomisChat from '../../../components/NomisChat'

export default function Page() {
  return (
    <div className="app-shell">
      <Nav />
      <main className="main-content">
        <div style={s.page}>
          <header className="pwa-header" style={s.header}>
            <div className="page-title">CARDIO</div>
            <div className="page-sub">Sessions · Distance · Heart rate</div>
          </header>
          <div className="progress-track"><div className="progress-fill" style={{ width:'0%' }} /></div>
          <div style={s.body}>
            <div style={s.card}>
              <div style={s.icon}>♡</div>
              <div style={s.title}>CARDIO</div>
              <div style={s.sub}>Coming in Drop 5</div>
              <div style={s.desc}>Sessions · Distance · Heart rate</div>
              <div style={s.hint}>Ask NOMIS about cardio in the meantime →</div>
            </div>
          </div>
        </div>
      </main>
      <NomisChat pageContext="User is on the CARDIO page. Module coming in Drop 5." />
    </div>
  )
}

const s = {
  page: { minHeight:'100dvh', background:'var(--bg)' },
  header: { padding:'24px 24px 18px', borderBottom:'1px solid var(--border)' },
  body: { display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh', padding:'24px' },
  card: { display:'flex', flexDirection:'column', alignItems:'center', gap:'12px', textAlign:'center', maxWidth:'300px' },
  icon: { fontSize:'2.5rem', opacity:0.3, marginBottom:'4px' },
  title: { fontFamily:'var(--font-display)', fontSize:'1.4rem', fontWeight:'700', letterSpacing:'0.2em', color:'var(--text3)' },
  sub: { fontFamily:'var(--font-mono)', fontSize:'0.55rem', color:'var(--green)', letterSpacing:'0.15em', background:'rgba(34,212,138,0.08)', border:'1px solid rgba(34,212,138,0.2)', borderRadius:'6px', padding:'4px 10px' },
  desc: { fontFamily:'var(--font-mono)', fontSize:'0.55rem', color:'var(--text4)', letterSpacing:'0.06em', lineHeight:1.6 },
  hint: { fontFamily:'var(--font-display)', fontSize:'0.82rem', color:'var(--text3)', lineHeight:1.5, marginTop:'8px' },
}
