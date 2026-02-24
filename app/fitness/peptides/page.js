'use client'
import { useState, useEffect } from 'react'
import Nav from '../../../components/Nav'
import NomisChat from '../../../components/NomisChat'
import { dbRead, dbWrite, chat } from '../../../lib/api'

const COMMON_PEPTIDES = [
  { name: 'BPC-157',     category: 'healing',    typical_dose: '250-500mcg', frequency: 'Daily', notes: 'Gut health, injury repair' },
  { name: 'TB-500',      category: 'healing',    typical_dose: '2-2.5mg',    frequency: '2x/week', notes: 'Tissue repair, flexibility' },
  { name: 'CJC-1295',    category: 'growth',     typical_dose: '100mcg',     frequency: 'Daily', notes: 'GH release, combine with Ipamorelin' },
  { name: 'Ipamorelin',  category: 'growth',     typical_dose: '200mcg',     frequency: 'Daily', notes: 'GH pulse, minimal side effects' },
  { name: 'Semaglutide', category: 'metabolic',  typical_dose: '0.25-1mg',   frequency: 'Weekly', notes: 'GLP-1, appetite regulation' },
  { name: 'Tirzepatide', category: 'metabolic',  typical_dose: '2.5-15mg',   frequency: 'Weekly', notes: 'GLP-1/GIP dual agonist' },
  { name: 'PT-141',      category: 'other',      typical_dose: '1-2mg',      frequency: 'As needed', notes: 'Melanocortin receptor' },
  { name: 'Selank',      category: 'cognitive',  typical_dose: '250mcg',     frequency: 'Daily', notes: 'Anxiolytic, cognitive' },
  { name: 'Semax',       category: 'cognitive',  typical_dose: '200mcg',     frequency: 'Daily', notes: 'BDNF, neuroprotective' },
  { name: 'AOD-9604',    category: 'metabolic',  typical_dose: '300mcg',     frequency: 'Daily', notes: 'Fat metabolism fragment' },
]

const CATEGORY_COLORS = {
  healing:   'var(--green)',
  growth:    'var(--cyan)',
  metabolic: 'var(--orange)',
  cognitive: 'var(--purple)',
  other:     'var(--text3)',
}

const STATUS_COLORS = {
  active:    'var(--green)',
  completed: 'var(--text3)',
  paused:    'var(--orange)',
  planned:   'var(--cyan)',
}

function daysSince(dateStr) {
  if (!dateStr) return null
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function progressPct(startDate, cycleDays) {
  if (!startDate || !cycleDays) return 0
  const elapsed = daysSince(startDate)
  return Math.min(Math.round((elapsed / cycleDays) * 100), 100)
}

export default function Peptides() {
  const [tab, setTab]         = useState('active')
  const [cycles, setCycles]   = useState([])
  const [doses, setDoses]     = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [research, setResearch] = useState({})
  const [resLoading, setResLoading] = useState({})
  const [showNew, setShowNew] = useState(false)
  const [form, setForm]       = useState({
    stack_name: '',
    start_date: new Date().toISOString().split('T')[0],
    cycle_days: 20,
    dose_details: '',
    status: 'active',
    notes: '',
  })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [c, d] = await Promise.all([
      dbRead('peptide_cycles', {}, { order: 'start_date' }),
      dbRead('peptide_doses', {}, { order: 'date' }),
    ])
    setCycles([...c].reverse())
    setDoses(d)
    setLoading(false)
  }

  function setF(k, v) { setForm(prev => ({ ...prev, [k]: v })) }

  async function handleSave() {
    if (!form.stack_name) return
    setSaving(true)
    await dbWrite('peptide_cycles', 'insert', form)
    await loadData()
    setShowNew(false)
    setForm({ stack_name:'', start_date: new Date().toISOString().split('T')[0], cycle_days:20, dose_details:'', status:'active', notes:'' })
    setSaving(false)
  }

  async function logDose(cycleId, peptideName) {
    await dbWrite('peptide_doses', 'insert', {
      cycle_id: cycleId,
      peptide_name: peptideName,
      date: new Date().toISOString().split('T')[0],
      time_of_day: new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening',
    })
    await loadData()
  }

  async function updateStatus(id, status) {
    await dbWrite('peptide_cycles', 'update', { status }, { id })
    await loadData()
  }

  async function getResearch(peptideName) {
    if (research[peptideName]) return
    setResLoading(prev => ({ ...prev, [peptideName]: true }))
    try {
      const res = await chat(
        `Give me a concise research summary for the peptide "${peptideName}" covering: mechanism of action, primary benefits, typical protocol (dose + frequency), cycle length, and any important considerations. Be direct and factual. Keep it under 200 words.`,
        []
      )
      if (res.response) setResearch(prev => ({ ...prev, [peptideName]: res.response }))
    } catch {}
    setResLoading(prev => ({ ...prev, [peptideName]: false }))
  }

  const activeCycles    = cycles.filter(c => c.status === 'active')
  const inactiveCycles  = cycles.filter(c => c.status !== 'active')
  const todayDoses      = doses.filter(d => d.date === new Date().toISOString().split('T')[0])

  const pageContext = `
User is on the Peptides page.
Active cycles: ${activeCycles.map(c => `${c.stack_name} (day ${daysSince(c.start_date)} of ${c.cycle_days})`).join(', ') || 'none'}.
Today's doses logged: ${todayDoses.length}.
Total cycles tracked: ${cycles.length}.
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
              <div className="page-title">PEPTIDES</div>
              <div className="page-sub">Cycles · Dosing · Research</div>
            </div>
            <div style={s.headerStats}>
              <div style={s.hStat}>
                <span style={s.hVal}>{activeCycles.length}</span>
                <span style={s.hLbl}>ACTIVE</span>
              </div>
              <div style={s.hStat}>
                <span style={s.hVal}>{todayDoses.length}</span>
                <span style={s.hLbl}>TODAY</span>
              </div>
            </div>
          </header>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: activeCycles.length ? '100%' : '0%', background:'var(--green)', color:'var(--green)' }} />
          </div>

          <div style={s.tabs}>
            {[['active','ACTIVE'],['history','HISTORY'],['library','LIBRARY'],['log','LOG DOSE']].map(([t,l]) => (
              <button key={t} style={{ ...s.tab, ...(tab===t ? s.tabActive:{}) }} onClick={() => setTab(t)}>{l}</button>
            ))}
          </div>

          {/* ── ACTIVE TAB ── */}
          {tab === 'active' && (
            <div style={s.body}>
              <div style={s.sectionRow}>
                <span className="section-label">// ACTIVE CYCLES</span>
                <button style={s.newBtn} onClick={() => setShowNew(true)}>+ New Cycle</button>
              </div>

              {activeCycles.length === 0 && (
                <div style={s.empty}>No active cycles. Start one or tell NOMIS you're starting a cycle.</div>
              )}

              {activeCycles.map(cycle => {
                const pct     = progressPct(cycle.start_date, cycle.cycle_days)
                const elapsed = daysSince(cycle.start_date)
                const remaining = Math.max(0, cycle.cycle_days - elapsed)
                const cycleDoses = doses.filter(d => d.cycle_id === cycle.id)
                const todayLogged = todayDoses.some(d => d.cycle_id === cycle.id)

                return (
                  <div key={cycle.id} style={s.cycleCard}>
                    <div style={s.cycleTop}>
                      <div>
                        <div style={s.cycleName}>{cycle.stack_name}</div>
                        <div style={s.cycleMeta}>
                          Started {new Date(cycle.start_date).toLocaleDateString('en-US',{month:'short',day:'numeric'})} · Day {elapsed} of {cycle.cycle_days}
                        </div>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'4px' }}>
                        <span style={{ ...s.statusBadge, color: STATUS_COLORS[cycle.status], borderColor: STATUS_COLORS[cycle.status] + '33' }}>
                          {cycle.status.toUpperCase()}
                        </span>
                        <span style={s.remainingTxt}>{remaining}d left</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div style={s.cycleProgress}>
                      <div style={{ ...s.cycleFill, width:`${pct}%` }} />
                    </div>
                    <div style={s.cyclePct}>{pct}% complete · {cycleDoses.length} doses logged</div>

                    {cycle.dose_details && (
                      <div style={s.cycleDetails}>{cycle.dose_details}</div>
                    )}

                    {cycle.notes && <div style={s.cycleNotes}>{cycle.notes}</div>}

                    {/* Actions */}
                    <div style={s.cycleActions}>
                      <button
                        style={{ ...s.doseBtn, ...(todayLogged ? s.doseBtnDone : {}) }}
                        onClick={() => logDose(cycle.id, cycle.stack_name)}
                        disabled={todayLogged}
                      >
                        {todayLogged ? '✓ Dosed Today' : '+ Log Today\'s Dose'}
                      </button>
                      <button style={s.pauseBtn} onClick={() => updateStatus(cycle.id, 'paused')}>Pause</button>
                      <button style={s.completeBtn} onClick={() => updateStatus(cycle.id, 'completed')}>Complete</button>
                    </div>
                  </div>
                )
              })}

              {/* New cycle form */}
              {showNew && (
                <div style={s.formCard}>
                  <div className="section-label" style={{ marginBottom:'14px' }}>// NEW CYCLE</div>

                  <div style={s.field}>
                    <label style={s.label}>PEPTIDE / STACK NAME</label>
                    <input className="nomis-input" list="peptide-list" placeholder="BPC-157 + TB-500" value={form.stack_name} onChange={e => setF('stack_name', e.target.value)} />
                    <datalist id="peptide-list">
                      {COMMON_PEPTIDES.map(p => <option key={p.name} value={p.name} />)}
                    </datalist>
                  </div>

                  <div style={s.fieldRow}>
                    <div style={s.field}>
                      <label style={s.label}>START DATE</label>
                      <input className="nomis-input" type="date" value={form.start_date} onChange={e => setF('start_date', e.target.value)} />
                    </div>
                    <div style={s.field}>
                      <label style={s.label}>CYCLE LENGTH (days)</label>
                      <input className="nomis-input" type="number" placeholder="20" value={form.cycle_days} onChange={e => setF('cycle_days', e.target.value)} />
                    </div>
                  </div>

                  <div style={s.field}>
                    <label style={s.label}>DOSE DETAILS</label>
                    <input className="nomis-input" placeholder="e.g. 500mcg BPC-157 AM, 2mg TB-500 2x/week" value={form.dose_details} onChange={e => setF('dose_details', e.target.value)} />
                  </div>

                  <div style={s.field}>
                    <label style={s.label}>NOTES</label>
                    <input className="nomis-input" placeholder="Goals, observations..." value={form.notes} onChange={e => setF('notes', e.target.value)} />
                  </div>

                  <div style={{ display:'flex', gap:'10px' }}>
                    <button className="nomis-btn" onClick={handleSave} style={{ opacity: saving ? 0.5 : 1 }}>
                      {saving ? '● SAVING...' : '+ START CYCLE'}
                    </button>
                    <button style={s.cancelBtn} onClick={() => setShowNew(false)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── HISTORY TAB ── */}
          {tab === 'history' && (
            <div style={s.body}>
              <div className="section-label">// ALL CYCLES ({cycles.length})</div>
              {cycles.length === 0 && <div style={s.empty}>No cycles logged yet</div>}
              {cycles.map(cycle => {
                const elapsed = daysSince(cycle.start_date)
                const cycleDoses = doses.filter(d => d.cycle_id === cycle.id)
                return (
                  <div key={cycle.id} style={s.historyCard}>
                    <div style={s.historyTop}>
                      <div>
                        <div style={s.cycleName}>{cycle.stack_name}</div>
                        <div style={s.cycleMeta}>
                          {new Date(cycle.start_date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                          {cycle.status === 'completed' ? ` · ${cycle.cycle_days} day cycle` : ` · Day ${elapsed}`}
                        </div>
                      </div>
                      <span style={{ ...s.statusBadge, color: STATUS_COLORS[cycle.status], borderColor: STATUS_COLORS[cycle.status] + '33' }}>
                        {cycle.status.toUpperCase()}
                      </span>
                    </div>
                    <div style={s.historyMeta}>{cycleDoses.length} doses · {cycle.dose_details || 'No dose details'}</div>
                    {cycle.notes && <div style={s.cycleNotes}>{cycle.notes}</div>}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── LIBRARY TAB ── */}
          {tab === 'library' && (
            <div style={s.body}>
              <div className="section-label">// PEPTIDE LIBRARY — tap for research</div>
              {Object.entries(
                COMMON_PEPTIDES.reduce((acc, p) => {
                  if (!acc[p.category]) acc[p.category] = []
                  acc[p.category].push(p)
                  return acc
                }, {})
              ).map(([category, peptides]) => (
                <div key={category} style={s.categorySection}>
                  <div style={{ ...s.categoryLabel, color: CATEGORY_COLORS[category] }}>
                    {category.toUpperCase()}
                  </div>
                  {peptides.map(p => (
                    <div key={p.name} style={s.libraryCard}>
                      <div style={s.libTop} onClick={() => getResearch(p.name)}>
                        <div>
                          <div style={s.libName}>{p.name}</div>
                          <div style={s.libMeta}>{p.typical_dose} · {p.frequency}</div>
                          <div style={s.libNotes}>{p.notes}</div>
                        </div>
                        <div style={s.libActions}>
                          <button style={s.researchBtn} onClick={e => { e.stopPropagation(); getResearch(p.name) }}>
                            {resLoading[p.name] ? '...' : research[p.name] ? '▲' : '▼ Research'}
                          </button>
                        </div>
                      </div>
                      {research[p.name] && (
                        <div style={s.researchPanel}>
                          <div style={s.researchLabel}>// NOMIS RESEARCH</div>
                          <div style={s.researchText}>{research[p.name]}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* ── LOG DOSE TAB ── */}
          {tab === 'log' && (
            <div style={s.body}>
              <div className="section-label">// LOG A DOSE</div>
              {activeCycles.length === 0 ? (
                <div style={s.empty}>No active cycles to log doses for. Start a cycle first.</div>
              ) : (
                activeCycles.map(cycle => {
                  const todayLogged = todayDoses.some(d => d.cycle_id === cycle.id)
                  const recentDoses = doses.filter(d => d.cycle_id === cycle.id).slice(-7).reverse()
                  return (
                    <div key={cycle.id} style={s.logCard}>
                      <div style={s.logHeader}>
                        <div style={s.cycleName}>{cycle.stack_name}</div>
                        <span style={{ ...s.statusBadge, color:'var(--green)', borderColor:'rgba(34,212,138,0.2)' }}>
                          Day {daysSince(cycle.start_date)}
                        </span>
                      </div>
                      <div style={s.logDoseInfo}>{cycle.dose_details || 'No dose details recorded'}</div>
                      <button
                        style={{ ...s.doseBtn, width:'100%', opacity: todayLogged ? 0.5 : 1 }}
                        onClick={() => logDose(cycle.id, cycle.stack_name)}
                        disabled={todayLogged}
                      >
                        {todayLogged ? '✓ Already logged today' : '+ Log Today\'s Dose'}
                      </button>
                      {recentDoses.length > 0 && (
                        <div style={s.recentDoses}>
                          <div style={s.recentLabel}>Recent doses</div>
                          {recentDoses.map((d, i) => (
                            <div key={i} style={s.doseRow}>
                              <span style={s.doseDate}>{new Date(d.date).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</span>
                              <span style={s.doseTime}>{d.time_of_day || '—'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
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
  body: { padding:'20px', display:'flex', flexDirection:'column', gap:'12px' },
  sectionRow: { display:'flex', alignItems:'center', justifyContent:'space-between' },
  newBtn: { padding:'7px 14px', background:'var(--green-dim)', border:'1px solid var(--green-glow)', borderRadius:'8px', color:'var(--green)', fontFamily:'var(--font-mono)', fontSize:'0.52rem', letterSpacing:'0.08em', cursor:'pointer' },
  empty: { padding:'40px 20px', textAlign:'center', fontFamily:'var(--font-mono)', fontSize:'0.58rem', color:'var(--text4)', letterSpacing:'0.08em', lineHeight:1.7 },
  cycleCard: { background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'14px', padding:'18px', display:'flex', flexDirection:'column', gap:'10px' },
  cycleTop: { display:'flex', alignItems:'flex-start', justifyContent:'space-between' },
  cycleName: { fontFamily:'var(--font-display)', fontSize:'1.05rem', fontWeight:'700', color:'var(--text)', marginBottom:'3px' },
  cycleMeta: { fontFamily:'var(--font-mono)', fontSize:'0.5rem', color:'var(--text3)', letterSpacing:'0.06em' },
  statusBadge: { fontFamily:'var(--font-mono)', fontSize:'0.44rem', letterSpacing:'0.1em', padding:'3px 8px', borderRadius:'5px', border:'1px solid', flexShrink:0 },
  remainingTxt: { fontFamily:'var(--font-mono)', fontSize:'0.48rem', color:'var(--text4)', letterSpacing:'0.06em' },
  cycleProgress: { height:'4px', background:'rgba(255,255,255,0.04)', borderRadius:'2px', overflow:'hidden' },
  cycleFill: { height:'100%', background:'var(--green)', borderRadius:'2px', transition:'width 0.5s ease', boxShadow:'0 0 6px rgba(34,212,138,0.4)' },
  cyclePct: { fontFamily:'var(--font-mono)', fontSize:'0.46rem', color:'var(--text4)', letterSpacing:'0.06em' },
  cycleDetails: { fontFamily:'var(--font-display)', fontSize:'0.82rem', color:'var(--text2)', lineHeight:1.5, background:'rgba(255,255,255,0.02)', borderRadius:'8px', padding:'8px 10px' },
  cycleNotes: { fontFamily:'var(--font-display)', fontSize:'0.78rem', color:'var(--text3)', lineHeight:1.5, fontStyle:'italic' },
  cycleActions: { display:'flex', gap:'8px', marginTop:'4px' },
  doseBtn: { flex:2, padding:'10px', background:'var(--green-dim)', border:'1px solid var(--green-glow)', borderRadius:'9px', color:'var(--green)', fontFamily:'var(--font-display)', fontSize:'0.82rem', fontWeight:'700', letterSpacing:'0.08em', cursor:'pointer', transition:'all 0.15s' },
  doseBtnDone: { background:'rgba(34,212,138,0.08)', borderColor:'rgba(34,212,138,0.15)', cursor:'default' },
  pauseBtn: { flex:1, padding:'10px', background:'transparent', border:'1px solid var(--border)', borderRadius:'9px', color:'var(--text3)', fontFamily:'var(--font-mono)', fontSize:'0.5rem', letterSpacing:'0.06em', cursor:'pointer' },
  completeBtn: { flex:1, padding:'10px', background:'transparent', border:'1px solid rgba(0,229,255,0.2)', borderRadius:'9px', color:'var(--cyan)', fontFamily:'var(--font-mono)', fontSize:'0.5rem', letterSpacing:'0.06em', cursor:'pointer' },
  formCard: { background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'14px', padding:'18px' },
  fieldRow: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' },
  field: { display:'flex', flexDirection:'column', gap:'6px', marginBottom:'12px' },
  label: { fontFamily:'var(--font-mono)', fontSize:'0.46rem', color:'var(--text3)', letterSpacing:'0.12em' },
  cancelBtn: { padding:'11px 20px', background:'transparent', border:'1px solid var(--border)', borderRadius:'9px', color:'var(--text3)', fontFamily:'var(--font-mono)', fontSize:'0.55rem', letterSpacing:'0.08em', cursor:'pointer' },
  historyCard: { background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'12px', padding:'14px 16px' },
  historyTop: { display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'6px' },
  historyMeta: { fontFamily:'var(--font-mono)', fontSize:'0.5rem', color:'var(--text3)', letterSpacing:'0.04em' },
  categorySection: { display:'flex', flexDirection:'column', gap:'6px' },
  categoryLabel: { fontFamily:'var(--font-mono)', fontSize:'0.5rem', letterSpacing:'0.15em', marginTop:'8px', marginBottom:'4px' },
  libraryCard: { background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'12px', overflow:'hidden' },
  libTop: { display:'flex', alignItems:'flex-start', justifyContent:'space-between', padding:'14px 16px', cursor:'pointer' },
  libName: { fontFamily:'var(--font-display)', fontSize:'0.95rem', fontWeight:'700', color:'var(--text)', marginBottom:'3px' },
  libMeta: { fontFamily:'var(--font-mono)', fontSize:'0.48rem', color:'var(--green)', letterSpacing:'0.06em', marginBottom:'3px' },
  libNotes: { fontFamily:'var(--font-display)', fontSize:'0.78rem', color:'var(--text3)' },
  libActions: { flexShrink:0 },
  researchBtn: { padding:'6px 12px', background:'rgba(34,212,138,0.06)', border:'1px solid rgba(34,212,138,0.2)', borderRadius:'7px', color:'var(--green)', fontFamily:'var(--font-mono)', fontSize:'0.48rem', letterSpacing:'0.06em', cursor:'pointer', whiteSpace:'nowrap' },
  researchPanel: { borderTop:'1px solid var(--border)', padding:'14px 16px', background:'rgba(0,0,0,0.15)' },
  researchLabel: { fontFamily:'var(--font-mono)', fontSize:'0.46rem', color:'var(--green)', letterSpacing:'0.14em', marginBottom:'8px', opacity:0.7 },
  researchText: { fontFamily:'var(--font-display)', fontSize:'0.82rem', color:'var(--text2)', lineHeight:1.7 },
  logCard: { background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'14px', padding:'18px', display:'flex', flexDirection:'column', gap:'10px' },
  logHeader: { display:'flex', alignItems:'center', justifyContent:'space-between' },
  logDoseInfo: { fontFamily:'var(--font-display)', fontSize:'0.82rem', color:'var(--text3)', lineHeight:1.5, background:'rgba(255,255,255,0.02)', borderRadius:'8px', padding:'8px 10px' },
  recentDoses: { display:'flex', flexDirection:'column', gap:'5px', marginTop:'4px' },
  recentLabel: { fontFamily:'var(--font-mono)', fontSize:'0.46rem', color:'var(--text4)', letterSpacing:'0.1em', marginBottom:'3px' },
  doseRow: { display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--border)' },
  doseDate: { fontFamily:'var(--font-mono)', fontSize:'0.55rem', color:'var(--text2)' },
  doseTime: { fontFamily:'var(--font-mono)', fontSize:'0.52rem', color:'var(--text3)', textTransform:'capitalize' },
}
