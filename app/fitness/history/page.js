'use client'
import { useState, useEffect } from 'react'
import Nav from '../../../components/Nav'
import NomisChat from '../../../components/NomisChat'
import { getRecentWorkouts, getPersonalRecords, getWorkoutSets } from '../../../lib/api'

export default function History() {
  const [workouts, setWorkouts]     = useState([])
  const [prs, setPrs]               = useState([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState('sessions')
  const [expandedId, setExpandedId] = useState(null)
  const [expandedSets, setExpandedSets] = useState({})

  useEffect(() => {
    async function load() {
      const [w, p] = await Promise.all([getRecentWorkouts(30), getPersonalRecords()])
      setWorkouts([...w].reverse())
      const map = {}
      p.forEach(pr => {
        if (!map[pr.metric] || parseFloat(pr.value) > parseFloat(map[pr.metric].value)) map[pr.metric] = pr
      })
      setPrs(Object.values(map).sort((a,b) => parseFloat(b.value) - parseFloat(a.value)))
      setLoading(false)
    }
    load()
  }, [])

  async function toggle(id) {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    if (!expandedSets[id]) {
      const sets = await getWorkoutSets(id)
      setExpandedSets(prev => ({ ...prev, [id]: sets }))
    }
  }

  function fmt(d) {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  if (loading) return (
    <div className="app-shell"><Nav />
      <main className="main-content" style={{ display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100dvh' }}>
        <div style={{ fontFamily:'var(--font-mono)',fontSize:'0.7rem',color:'var(--text3)',letterSpacing:'0.15em' }}>LOADING...</div>
      </main>
    </div>
  )

  return (
    <div className="app-shell">
      <Nav />
      <main className="main-content">
        <div style={s.page}>
          <header className="pwa-header" style={s.header}>
            <div>
              <div className="page-title">HISTORY</div>
              <div className="page-sub">{workouts.length} sessions · {prs.length} PRs tracked</div>
            </div>
          </header>
          <div className="progress-track">
            <div className="progress-fill" style={{ width:'100%', background:'linear-gradient(90deg,var(--green),var(--cyan))', color:'var(--green)' }} />
          </div>

          <div style={s.tabs}>
            {[['sessions',`SESSIONS (${workouts.length})`],['prs',`PERSONAL RECORDS (${prs.length})`]].map(([t,l]) => (
              <button key={t} style={{ ...s.tab, ...(tab===t ? s.tabActive:{}) }} onClick={() => setTab(t)}>{l}</button>
            ))}
          </div>

          <div style={s.body}>
            {tab === 'sessions' && (
              <div style={s.list}>
                {workouts.length === 0 && <div style={s.empty}>No sessions logged yet</div>}
                {workouts.map(w => (
                  <div key={w.id} style={s.card} onClick={() => toggle(w.id)}>
                    <div style={s.cardTop}>
                      <div>
                        <div style={s.cardDate}>{fmt(w.date)}</div>
                        <div style={s.cardTitle}>{w.title || w.muscle_group}</div>
                        {w.description && <div style={s.cardDesc}>{w.description}</div>}
                      </div>
                      <span style={s.chevron}>{expandedId===w.id ? '∨' : '›'}</span>
                    </div>
                    {expandedId===w.id && (
                      <div style={s.setsWrap}>
                        {!expandedSets[w.id] ? (
                          <div style={s.loadingTxt}>Loading...</div>
                        ) : expandedSets[w.id].length === 0 ? (
                          <div style={s.loadingTxt}>No sets recorded</div>
                        ) : (
                          <>
                            <div style={s.setHeader}><span>EXERCISE</span><span>SET</span><span>WEIGHT</span><span>REPS</span></div>
                            {expandedSets[w.id].map((set,i) => (
                              <div key={i} style={s.setRow}>
                                <span style={s.setEx}>{set.exercise_name}</span>
                                <span style={s.setCell}>{set.set_number}</span>
                                <span style={s.setCell}>{set.weight_lbs ? `${set.weight_lbs} lbs` : '—'}</span>
                                <span style={s.setCell}>{set.reps_completed || '—'}</span>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {tab === 'prs' && (
              <div style={s.list}>
                {prs.length === 0 && <div style={s.empty}>No PRs yet — complete some workouts</div>}
                {prs.map((pr,i) => (
                  <div key={pr.id} style={s.prCard}>
                    <span style={s.prRank}>#{i+1}</span>
                    <div style={s.prInfo}>
                      <div style={s.prEx}>{pr.metric}</div>
                      <div style={s.prDate}>{fmt(pr.date)}</div>
                    </div>
                    <div style={s.prVal}>{pr.value} <span style={s.prUnit}>{pr.unit}</span></div>
                    <span style={s.prBadge}>🏆</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <NomisChat pageContext="User is reviewing workout history and PRs." />
    </div>
  )
}

const s = {
  page: { minHeight:'100dvh', background:'var(--bg)', paddingBottom:'40px' },
  header: { display:'flex', alignItems:'flex-start', justifyContent:'space-between', padding:'24px 24px 18px', borderBottom:'1px solid var(--border)' },
  tabs: { display:'flex', borderBottom:'1px solid var(--border)' },
  tab: { flex:1, padding:'13px', background:'transparent', border:'none', borderBottom:'2px solid transparent', fontFamily:'var(--font-mono)', fontSize:'0.52rem', color:'var(--text3)', letterSpacing:'0.1em', cursor:'pointer', transition:'all 0.15s' },
  tabActive: { color:'var(--green)', borderBottomColor:'var(--green)' },
  body: { padding:'20px' },
  list: { display:'flex', flexDirection:'column', gap:'8px' },
  empty: { padding:'60px 20px', textAlign:'center', fontFamily:'var(--font-mono)', fontSize:'0.6rem', color:'var(--text4)', letterSpacing:'0.1em' },
  card: { background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'12px', overflow:'hidden', cursor:'pointer' },
  cardTop: { display:'flex', alignItems:'flex-start', justifyContent:'space-between', padding:'14px 16px' },
  cardDate: { fontFamily:'var(--font-mono)', fontSize:'0.5rem', color:'var(--green)', letterSpacing:'0.1em', marginBottom:'3px' },
  cardTitle: { fontFamily:'var(--font-display)', fontSize:'0.95rem', fontWeight:'600', color:'var(--text)', marginBottom:'2px' },
  cardDesc: { fontFamily:'var(--font-mono)', fontSize:'0.48rem', color:'var(--text3)', letterSpacing:'0.04em' },
  chevron: { fontFamily:'var(--font-display)', fontSize:'1.1rem', color:'var(--text3)' },
  setsWrap: { borderTop:'1px solid var(--border)', padding:'12px 16px', background:'rgba(0,0,0,0.15)' },
  loadingTxt: { fontFamily:'var(--font-mono)', fontSize:'0.52rem', color:'var(--text4)' },
  setHeader: { display:'grid', gridTemplateColumns:'2fr 0.5fr 1fr 0.8fr', gap:'8px', fontFamily:'var(--font-mono)', fontSize:'0.44rem', color:'var(--text3)', letterSpacing:'0.1em', marginBottom:'8px', paddingBottom:'6px', borderBottom:'1px solid var(--border)' },
  setRow: { display:'grid', gridTemplateColumns:'2fr 0.5fr 1fr 0.8fr', gap:'8px', marginBottom:'5px', alignItems:'center' },
  setEx: { fontFamily:'var(--font-display)', fontSize:'0.78rem', color:'var(--text2)' },
  setCell: { fontFamily:'var(--font-mono)', fontSize:'0.65rem', color:'var(--text)' },
  prCard: { background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'12px', padding:'14px 16px', display:'flex', alignItems:'center', gap:'12px' },
  prRank: { fontFamily:'var(--font-mono)', fontSize:'0.55rem', color:'var(--text4)', width:'22px', flexShrink:0 },
  prInfo: { flex:1 },
  prEx: { fontFamily:'var(--font-display)', fontSize:'0.95rem', fontWeight:'600', color:'var(--text)', marginBottom:'2px' },
  prDate: { fontFamily:'var(--font-mono)', fontSize:'0.48rem', color:'var(--text3)', letterSpacing:'0.06em' },
  prVal: { fontFamily:'var(--font-mono)', fontSize:'1.05rem', fontWeight:'500', color:'var(--green)' },
  prUnit: { fontSize:'0.5rem', color:'var(--text3)' },
  prBadge: { fontSize:'1rem', flexShrink:0 },
}
