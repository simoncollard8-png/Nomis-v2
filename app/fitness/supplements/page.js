'use client'
import { useState, useEffect } from 'react'
import Nav from '../../../components/Nav'
import NomisChat from '../../../components/NomisChat'
import { dbRead, dbWrite, chat } from '../../../lib/api'

const TIMING_OPTIONS = ['Morning', 'Pre-Workout', 'Post-Workout', 'With Meals', 'Evening', 'Before Bed', 'As Needed']
const CATEGORY_OPTIONS = ['Protein', 'Creatine', 'Pre-Workout', 'Vitamins', 'Minerals', 'Amino Acids', 'Fat Burner', 'Recovery', 'Hormone Support', 'Other']

const CATEGORY_COLORS = {
  'Protein':          'var(--green)',
  'Creatine':         'var(--cyan)',
  'Pre-Workout':      'var(--orange)',
  'Vitamins':         'var(--purple)',
  'Minerals':         'var(--yellow, #fbbf24)',
  'Amino Acids':      'var(--green)',
  'Fat Burner':       'var(--red)',
  'Recovery':         'var(--cyan)',
  'Hormone Support':  'var(--orange)',
  'Other':            'var(--text3)',
}

const SUGGESTED_STACK = [
  { name:'Creatine Monohydrate', category:'Creatine',   dose:'5g',      timing:'Post-Workout', notes:'Load 20g/day for 5 days or just take 5g daily' },
  { name:'Whey Protein',         category:'Protein',    dose:'25-40g',  timing:'Post-Workout', notes:'1g per lb of bodyweight total daily target' },
  { name:'Vitamin D3',           category:'Vitamins',   dose:'5000 IU', timing:'Morning',      notes:'Take with K2 for absorption' },
  { name:'Magnesium Glycinate',  category:'Minerals',   dose:'400mg',   timing:'Before Bed',   notes:'Improves sleep quality and recovery' },
  { name:'Omega-3',              category:'Recovery',   dose:'2-3g',    timing:'With Meals',   notes:'EPA/DHA for inflammation' },
  { name:'Zinc',                 category:'Minerals',   dose:'25mg',    timing:'Evening',      notes:'Testosterone support, immune function' },
]

export default function Supplements() {
  const [tab, setTab]         = useState('stack')
  const [supps, setSupps]     = useState([])
  const [logs, setLogs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [form, setForm]       = useState({
    name: '', category: 'Other', dose: '', timing: 'Morning', notes: '', active: true,
  })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [s, l] = await Promise.all([
      dbRead('supplements', {}, { order: 'name' }),
      dbRead('supplement_logs', {}, { order: 'date' }),
    ])
    setSupps(s)
    setLogs([...l].reverse())
    setLoading(false)
  }

  function setF(k, v) { setForm(prev => ({ ...prev, [k]: v })) }

  async function handleSave() {
    if (!form.name) return
    setSaving(true)
    await dbWrite('supplements', 'insert', form)
    await loadData()
    setShowNew(false)
    setForm({ name:'', category:'Other', dose:'', timing:'Morning', notes:'', active:true })
    setSaving(false)
  }

  async function logDose(supp) {
    await dbWrite('supplement_logs', 'insert', {
      supplement_id:   supp.id,
      supplement_name: supp.name,
      date:            new Date().toISOString().split('T')[0],
      dose:            supp.dose,
    })
    await loadData()
  }

  async function toggleActive(supp) {
    await dbWrite('supplements', 'update', { active: !supp.active }, { id: supp.id })
    await loadData()
  }

  async function analyzeStack() {
    setAnalyzing(true)
    const activeSupps = supps.filter(s => s.active)
    try {
      const res = await chat(
        `Analyze this supplement stack: ${activeSupps.map(s => `${s.name} ${s.dose} (${s.timing})`).join(', ')}.
Give me:
1. What's working well together (synergies)
2. Any conflicts or timing issues
3. What's missing for body recomposition
4. One specific optimization recommendation
Be direct, under 180 words.`,
        []
      )
      if (res.response) setAnalysis(res.response)
    } catch {}
    setAnalyzing(false)
  }

  const activeSupps    = supps.filter(s => s.active)
  const inactiveSupps  = supps.filter(s => !s.active)
  const today          = new Date().toISOString().split('T')[0]
  const todayLogs      = logs.filter(l => l.date === today)

  // Group active supplements by timing
  const byTiming = TIMING_OPTIONS.reduce((acc, t) => {
    const group = activeSupps.filter(s => s.timing === t)
    if (group.length) acc[t] = group
    return acc
  }, {})

  const pageContext = `
User is on the Supplements page.
Active supplements: ${activeSupps.map(s => `${s.name} ${s.dose} (${s.timing})`).join(', ') || 'none'}.
Today's doses logged: ${todayLogs.length}.
Total in stack: ${activeSupps.length}.
  `.trim()

  if (loading) return (
    <div className="app-shell"><Nav />
      <main className="main-content" style={{ display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100dvh' }}>
        <div style={{ fontFamily:'var(--font-mono)',fontSize:'0.7rem',color:'var(--text3)',letterSpacing:'0.15em' }} className="animate-pulse">LOADING...</div>
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
              <div className="page-title">SUPPLEMENTS</div>
              <div className="page-sub">Stack · Timing · Analysis</div>
            </div>
            <div style={s.headerStats}>
              <div style={s.hStat}>
                <span style={s.hVal}>{activeSupps.length}</span>
                <span style={s.hLbl}>IN STACK</span>
              </div>
              <div style={s.hStat}>
                <span style={s.hVal}>{todayLogs.length}</span>
                <span style={s.hLbl}>TODAY</span>
              </div>
            </div>
          </header>
          <div className="progress-track">
            <div className="progress-fill" style={{
              width: `${Math.min((todayLogs.length / Math.max(activeSupps.length, 1)) * 100, 100)}%`,
              background:'var(--green)', color:'var(--green)'
            }} />
          </div>

          <div style={s.tabs}>
            {[['stack','MY STACK'],['schedule','SCHEDULE'],['log','LOG'],['suggested','SUGGESTED']].map(([t,l]) => (
              <button key={t} style={{ ...s.tab, ...(tab===t ? s.tabActive:{}) }} onClick={() => setTab(t)}>{l}</button>
            ))}
          </div>

          {/* ── STACK TAB ── */}
          {tab === 'stack' && (
            <div style={s.body}>
              <div style={s.sectionRow}>
                <span className="section-label">// ACTIVE STACK ({activeSupps.length})</span>
                <div style={{ display:'flex', gap:'8px' }}>
                  <button style={s.analyzeBtn} onClick={analyzeStack} disabled={analyzing || activeSupps.length === 0}>
                    {analyzing ? '...' : '⚡ Analyze'}
                  </button>
                  <button style={s.newBtn} onClick={() => setShowNew(true)}>+ Add</button>
                </div>
              </div>

              {analysis && (
                <div style={s.analysisCard}>
                  <div style={s.analysisLabel}>// NOMIS STACK ANALYSIS</div>
                  <div style={s.analysisText}>{analysis}</div>
                  <button style={s.dismissBtn} onClick={() => setAnalysis(null)}>Dismiss</button>
                </div>
              )}

              {activeSupps.length === 0 && (
                <div style={s.empty}>No active supplements. Add some or check the Suggested tab.</div>
              )}

              {activeSupps.map(supp => {
                const loggedToday = todayLogs.some(l => l.supplement_id === supp.id)
                return (
                  <div key={supp.id} style={s.suppCard}>
                    <div style={s.suppTop}>
                      <div style={{ ...s.catDot, background: CATEGORY_COLORS[supp.category] || 'var(--text3)' }} />
                      <div style={s.suppInfo}>
                        <div style={s.suppName}>{supp.name}</div>
                        <div style={s.suppMeta}>{supp.dose} · {supp.timing}</div>
                        {supp.notes && <div style={s.suppNotes}>{supp.notes}</div>}
                      </div>
                      <div style={s.suppActions}>
                        <button
                          style={{ ...s.logBtn, ...(loggedToday ? s.logBtnDone : {}) }}
                          onClick={() => logDose(supp)}
                          disabled={loggedToday}
                        >
                          {loggedToday ? '✓' : '+'}
                        </button>
                        <button style={s.toggleBtn} onClick={() => toggleActive(supp)}>
                          Pause
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}

              {inactiveSupps.length > 0 && (
                <>
                  <div className="section-label" style={{ marginTop:'8px' }}>// PAUSED ({inactiveSupps.length})</div>
                  {inactiveSupps.map(supp => (
                    <div key={supp.id} style={{ ...s.suppCard, opacity:0.45 }}>
                      <div style={s.suppTop}>
                        <div style={{ ...s.catDot, background:'var(--text4)' }} />
                        <div style={s.suppInfo}>
                          <div style={s.suppName}>{supp.name}</div>
                          <div style={s.suppMeta}>{supp.dose} · {supp.timing}</div>
                        </div>
                        <button style={s.reactivateBtn} onClick={() => toggleActive(supp)}>Resume</button>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {showNew && (
                <div style={s.formCard}>
                  <div className="section-label" style={{ marginBottom:'14px' }}>// ADD SUPPLEMENT</div>

                  <div style={s.fieldRow}>
                    <div style={s.field}>
                      <label style={s.label}>NAME</label>
                      <input className="nomis-input" placeholder="Creatine Monohydrate" value={form.name} onChange={e => setF('name', e.target.value)} />
                    </div>
                    <div style={s.field}>
                      <label style={s.label}>CATEGORY</label>
                      <select className="nomis-select" value={form.category} onChange={e => setF('category', e.target.value)}>
                        {CATEGORY_OPTIONS.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={s.fieldRow}>
                    <div style={s.field}>
                      <label style={s.label}>DOSE</label>
                      <input className="nomis-input" placeholder="5g" value={form.dose} onChange={e => setF('dose', e.target.value)} />
                    </div>
                    <div style={s.field}>
                      <label style={s.label}>TIMING</label>
                      <select className="nomis-select" value={form.timing} onChange={e => setF('timing', e.target.value)}>
                        {TIMING_OPTIONS.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={s.field}>
                    <label style={s.label}>NOTES</label>
                    <input className="nomis-input" placeholder="Optional notes..." value={form.notes} onChange={e => setF('notes', e.target.value)} />
                  </div>

                  <div style={{ display:'flex', gap:'10px' }}>
                    <button className="nomis-btn" onClick={handleSave} style={{ opacity: saving ? 0.5 : 1 }}>
                      {saving ? '● SAVING...' : '+ ADD TO STACK'}
                    </button>
                    <button style={s.cancelBtn} onClick={() => setShowNew(false)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SCHEDULE TAB ── */}
          {tab === 'schedule' && (
            <div style={s.body}>
              <div className="section-label">// DAILY SCHEDULE</div>
              {Object.keys(byTiming).length === 0 && (
                <div style={s.empty}>No supplements in your stack yet</div>
              )}
              {Object.entries(byTiming).map(([timing, items]) => (
                <div key={timing} style={s.schedBlock}>
                  <div style={s.schedTime}>{timing.toUpperCase()}</div>
                  {items.map(supp => {
                    const loggedToday = todayLogs.some(l => l.supplement_id === supp.id)
                    return (
                      <div key={supp.id} style={s.schedRow}>
                        <div style={{ ...s.catDot, background: CATEGORY_COLORS[supp.category] || 'var(--text3)' }} />
                        <div style={s.schedInfo}>
                          <div style={s.schedName}>{supp.name}</div>
                          <div style={s.schedDose}>{supp.dose}</div>
                        </div>
                        <button
                          style={{ ...s.logBtn, ...(loggedToday ? s.logBtnDone : {}) }}
                          onClick={() => logDose(supp)}
                          disabled={loggedToday}
                        >
                          {loggedToday ? '✓' : '+'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}

          {/* ── LOG TAB ── */}
          {tab === 'log' && (
            <div style={s.body}>
              <div className="section-label">// RECENT DOSE LOG</div>
              {logs.length === 0 && <div style={s.empty}>No doses logged yet</div>}
              {[...new Set(logs.map(l => l.date))].slice(0,14).map(date => {
                const dayLogs = logs.filter(l => l.date === date)
                return (
                  <div key={date} style={s.logDay}>
                    <div style={s.logDate}>{new Date(date).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</div>
                    <div style={s.logItems}>
                      {dayLogs.map((l, i) => (
                        <div key={i} style={s.logItem}>
                          <span style={s.logName}>{l.supplement_name}</span>
                          {l.dose && <span style={s.logDose}>{l.dose}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── SUGGESTED TAB ── */}
          {tab === 'suggested' && (
            <div style={s.body}>
              <div className="section-label">// RECOMMENDED FOR BODY RECOMP</div>
              <div style={s.suggestedNote}>
                Based on your goals. Tap "+ Add" to add any to your stack.
              </div>
              {SUGGESTED_STACK.map((supp, i) => {
                const alreadyHave = supps.some(s => s.name.toLowerCase().includes(supp.name.toLowerCase()))
                return (
                  <div key={i} style={{ ...s.suggestedCard, opacity: alreadyHave ? 0.5 : 1 }}>
                    <div style={s.suppTop}>
                      <div style={{ ...s.catDot, background: CATEGORY_COLORS[supp.category] || 'var(--text3)' }} />
                      <div style={s.suppInfo}>
                        <div style={s.suppName}>{supp.name}</div>
                        <div style={s.suppMeta}>{supp.dose} · {supp.timing}</div>
                        <div style={s.suppNotes}>{supp.notes}</div>
                      </div>
                      {alreadyHave ? (
                        <span style={s.haveIt}>✓ In stack</span>
                      ) : (
                        <button style={s.addSuggBtn} onClick={async () => {
                          await dbWrite('supplements', 'insert', {
                            name: supp.name, category: supp.category,
                            dose: supp.dose, timing: supp.timing,
                            notes: supp.notes, active: true
                          })
                          loadData()
                        }}>
                          + Add
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

        </div>
      </main>
      <NomisChat pageContext={pageContext} />
    </div>
  )
}

const s = {
  page: { minHeight:'100dvh', background:'var(--bg)', paddingBottom:'40px' },
  header: { display:'flex', alignItems:'flex-start', justifyContent:'space-between', padding:'24px 24px 18px', borderBottom:'1px solid var(--border)' },
  headerStats: { display:'flex', gap:'20px' },
  hStat: { display:'flex', flexDirection:'column', alignItems:'center', gap:'3px' },
  hVal: { fontFamily:'var(--font-mono)', fontSize:'1.2rem', fontWeight:'500', color:'var(--green)', lineHeight:1 },
  hLbl: { fontFamily:'var(--font-mono)', fontSize:'0.42rem', color:'var(--text4)', letterSpacing:'0.12em' },
  tabs: { display:'flex', borderBottom:'1px solid var(--border)', overflowX:'auto' },
  tab: { flex:1, padding:'13px 8px', background:'transparent', border:'none', borderBottom:'2px solid transparent', fontFamily:'var(--font-mono)', fontSize:'0.5rem', color:'var(--text3)', letterSpacing:'0.08em', cursor:'pointer', transition:'all 0.15s', whiteSpace:'nowrap' },
  tabActive: { color:'var(--green)', borderBottomColor:'var(--green)' },
  body: { padding:'20px', display:'flex', flexDirection:'column', gap:'10px' },
  sectionRow: { display:'flex', alignItems:'center', justifyContent:'space-between' },
  analyzeBtn: { padding:'7px 12px', background:'rgba(34,212,138,0.06)', border:'1px solid rgba(34,212,138,0.2)', borderRadius:'8px', color:'var(--green)', fontFamily:'var(--font-mono)', fontSize:'0.52rem', letterSpacing:'0.06em', cursor:'pointer' },
  newBtn: { padding:'7px 14px', background:'var(--green-dim)', border:'1px solid var(--green-glow)', borderRadius:'8px', color:'var(--green)', fontFamily:'var(--font-mono)', fontSize:'0.52rem', letterSpacing:'0.08em', cursor:'pointer' },
  empty: { padding:'40px 20px', textAlign:'center', fontFamily:'var(--font-mono)', fontSize:'0.58rem', color:'var(--text4)', letterSpacing:'0.08em', lineHeight:1.7 },
  analysisCard: { background:'linear-gradient(135deg,rgba(34,212,138,0.05),var(--bg2))', border:'1px solid rgba(34,212,138,0.15)', borderRadius:'14px', padding:'16px', display:'flex', flexDirection:'column', gap:'8px' },
  analysisLabel: { fontFamily:'var(--font-mono)', fontSize:'0.48rem', color:'var(--green)', letterSpacing:'0.15em', opacity:0.7 },
  analysisText: { fontFamily:'var(--font-display)', fontSize:'0.85rem', color:'var(--text2)', lineHeight:1.7 },
  dismissBtn: { alignSelf:'flex-start', background:'transparent', border:'1px solid var(--border)', borderRadius:'7px', padding:'5px 12px', color:'var(--text4)', fontFamily:'var(--font-mono)', fontSize:'0.48rem', cursor:'pointer' },
  suppCard: { background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'12px', padding:'14px 16px' },
  suppTop: { display:'flex', alignItems:'center', gap:'12px' },
  catDot: { width:'8px', height:'8px', borderRadius:'50%', flexShrink:0, boxShadow:'0 0 6px currentColor' },
  suppInfo: { flex:1, minWidth:0 },
  suppName: { fontFamily:'var(--font-display)', fontSize:'0.95rem', fontWeight:'600', color:'var(--text)', marginBottom:'2px' },
  suppMeta: { fontFamily:'var(--font-mono)', fontSize:'0.5rem', color:'var(--text3)', letterSpacing:'0.06em' },
  suppNotes: { fontFamily:'var(--font-display)', fontSize:'0.75rem', color:'var(--text3)', marginTop:'2px', lineHeight:1.4 },
  suppActions: { display:'flex', gap:'6px', flexShrink:0 },
  logBtn: { width:'32px', height:'32px', borderRadius:'8px', background:'var(--green-dim)', border:'1px solid var(--green-glow)', color:'var(--green)', fontFamily:'var(--font-display)', fontSize:'1rem', fontWeight:'700', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' },
  logBtnDone: { background:'rgba(34,212,138,0.08)', borderColor:'rgba(34,212,138,0.15)', cursor:'default' },
  toggleBtn: { padding:'6px 10px', background:'transparent', border:'1px solid var(--border)', borderRadius:'7px', color:'var(--text4)', fontFamily:'var(--font-mono)', fontSize:'0.46rem', letterSpacing:'0.06em', cursor:'pointer' },
  reactivateBtn: { padding:'6px 10px', background:'var(--green-dim)', border:'1px solid var(--green-glow)', borderRadius:'7px', color:'var(--green)', fontFamily:'var(--font-mono)', fontSize:'0.46rem', letterSpacing:'0.06em', cursor:'pointer' },
  formCard: { background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'14px', padding:'18px', marginTop:'4px' },
  fieldRow: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' },
  field: { display:'flex', flexDirection:'column', gap:'6px', marginBottom:'12px' },
  label: { fontFamily:'var(--font-mono)', fontSize:'0.46rem', color:'var(--text3)', letterSpacing:'0.12em' },
  cancelBtn: { padding:'11px 20px', background:'transparent', border:'1px solid var(--border)', borderRadius:'9px', color:'var(--text3)', fontFamily:'var(--font-mono)', fontSize:'0.55rem', letterSpacing:'0.08em', cursor:'pointer' },
  schedBlock: { background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'12px', overflow:'hidden', marginBottom:'2px' },
  schedTime: { fontFamily:'var(--font-mono)', fontSize:'0.5rem', color:'var(--green)', letterSpacing:'0.15em', padding:'10px 14px', borderBottom:'1px solid var(--border)', background:'rgba(34,212,138,0.03)' },
  schedRow: { display:'flex', alignItems:'center', gap:'12px', padding:'11px 14px', borderBottom:'1px solid var(--border)' },
  schedInfo: { flex:1 },
  schedName: { fontFamily:'var(--font-display)', fontSize:'0.88rem', fontWeight:'500', color:'var(--text)' },
  schedDose: { fontFamily:'var(--font-mono)', fontSize:'0.48rem', color:'var(--text3)', letterSpacing:'0.04em' },
  logDay: { marginBottom:'4px' },
  logDate: { fontFamily:'var(--font-mono)', fontSize:'0.52rem', color:'var(--green)', letterSpacing:'0.1em', marginBottom:'6px' },
  logItems: { display:'flex', flexDirection:'column', gap:'4px' },
  logItem: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'8px' },
  logName: { fontFamily:'var(--font-display)', fontSize:'0.85rem', color:'var(--text)' },
  logDose: { fontFamily:'var(--font-mono)', fontSize:'0.5rem', color:'var(--text3)' },
  suggestedNote: { fontFamily:'var(--font-display)', fontSize:'0.8rem', color:'var(--text3)', lineHeight:1.5, marginBottom:'4px' },
  suggestedCard: { background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'12px', padding:'14px 16px' },
  haveIt: { fontFamily:'var(--font-mono)', fontSize:'0.48rem', color:'var(--green)', letterSpacing:'0.08em', flexShrink:0 },
  addSuggBtn: { padding:'7px 12px', background:'var(--green-dim)', border:'1px solid var(--green-glow)', borderRadius:'8px', color:'var(--green)', fontFamily:'var(--font-mono)', fontSize:'0.5rem', letterSpacing:'0.06em', cursor:'pointer', flexShrink:0, whiteSpace:'nowrap' },
}
