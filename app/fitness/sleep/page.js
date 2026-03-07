'use client'
import { useState, useEffect } from 'react'
import Nav from '../../../components/Nav'
import NomisChat from '../../../components/NomisChat'
import { dbRead, dbWrite } from '../../../lib/api'

const QUALITY_OPTIONS = [
  { value: 'great', label: 'Great',  icon: '◈', color: 'var(--green)'  },
  { value: 'good',  label: 'Good',   icon: '◉', color: 'var(--cyan)'   },
  { value: 'okay',  label: 'Okay',   icon: '◎', color: 'var(--orange)' },
  { value: 'poor',  label: 'Poor',   icon: '○', color: 'var(--red)'    },
]

const QUALITY_SCORE = { great: 4, good: 3, okay: 2, poor: 1 }

function QualityBar({ quality, size = 'md' }) {
  const q = QUALITY_OPTIONS.find(o => o.value === quality)
  if (!q) return null
  return (
    <span style={{
      fontFamily: 'var(--font-mono)',
      fontSize: size === 'sm' ? '0.44rem' : '0.52rem',
      color: q.color,
      letterSpacing: '0.08em',
      padding: '2px 7px',
      borderRadius: '5px',
      border: `1px solid ${q.color}33`,
      background: `${q.color}0d`,
    }}>
      {q.icon} {q.label.toUpperCase()}
    </span>
  )
}

function SleepBar({ hours, maxHours = 10, color = 'var(--cyan)' }) {
  const pct = Math.min((hours / maxHours) * 100, 100)
  const isGood = hours >= 7
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
      <div style={{ flex:1, height:'5px', background:'rgba(255,255,255,0.04)', borderRadius:'3px', overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background: isGood ? 'var(--cyan)' : 'var(--orange)', borderRadius:'3px', transition:'width 0.5s ease', boxShadow: `0 0 6px ${isGood ? 'rgba(0,229,255,0.4)' : 'rgba(249,115,22,0.4)'}` }} />
      </div>
      <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.55rem', color: isGood ? 'var(--cyan)' : 'var(--orange)', width:'28px', textAlign:'right' }}>{hours}h</span>
    </div>
  )
}

export default function Sleep() {
  const [tab, setTab]         = useState('log')
  const [logs, setLogs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [form, setForm]       = useState({
    date:         new Date().toISOString().split('T')[0],
    duration_hrs: '',
    bedtime:      '',
    wake_time:    '',
    quality:      'good',
    notes:        '',
  })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const data = await dbRead('sleep_logs', {}, { order: 'date', limit: 60 })
    setLogs([...data].reverse())
    setLoading(false)
  }

  function setF(k, v) { setForm(prev => ({ ...prev, [k]: v })) }

  // Auto-calc duration from bedtime/wake
  function calcDuration(bedtime, wake_time) {
    if (!bedtime || !wake_time) return ''
    const [bh, bm] = bedtime.split(':').map(Number)
    const [wh, wm] = wake_time.split(':').map(Number)
    let mins = (wh * 60 + wm) - (bh * 60 + bm)
    if (mins < 0) mins += 24 * 60
    return (mins / 60).toFixed(1)
  }

  function handleTimeChange(field, val) {
    const newForm = { ...form, [field]: val }
    const dur = calcDuration(
      field === 'bedtime' ? val : form.bedtime,
      field === 'wake_time' ? val : form.wake_time
    )
    if (dur) newForm.duration_hrs = dur
    setForm(newForm)
  }

  async function handleSave() {
    if (!form.duration_hrs && !form.bedtime) return
    setSaving(true)
    await dbWrite('sleep_logs', 'insert', {
      date:         form.date,
      duration_hrs: parseFloat(form.duration_hrs) || null,
      bedtime:      form.bedtime || null,
      wake_time:    form.wake_time || null,
      quality:      form.quality,
      notes:        form.notes,
    })
    await loadData()
    setSaved(true)
    setForm(prev => ({ ...prev, duration_hrs:'', bedtime:'', wake_time:'', notes:'' }))
    setSaving(false)
    setTimeout(() => setSaved(false), 2500)
  }

  // Stats
  const last7  = logs.slice(0, 7)
  const last14 = logs.slice(0, 14)
  const avg7   = last7.length  ? (last7.reduce((a,b) => a + parseFloat(b.duration_hrs||0), 0) / last7.length).toFixed(1)  : null
  const avg14  = last14.length ? (last14.reduce((a,b) => a + parseFloat(b.duration_hrs||0), 0) / last14.length).toFixed(1) : null
  const bestNight = logs.reduce((best, l) => parseFloat(l.duration_hrs||0) > parseFloat(best?.duration_hrs||0) ? l : best, null)
  const qualityAvg = last7.length ? (last7.reduce((a,b) => a + (QUALITY_SCORE[b.quality]||0), 0) / last7.length).toFixed(1) : null
  const under7 = last7.filter(l => parseFloat(l.duration_hrs||0) < 7).length

  const pageContext = `
User is on the Sleep page.
7-day avg: ${avg7 || 'unknown'}h. 14-day avg: ${avg14 || 'unknown'}h.
Nights under 7h in last week: ${under7}.
Quality avg (last 7): ${qualityAvg}/4.
Total nights logged: ${logs.length}.
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
              <div className="page-title">SLEEP</div>
              <div className="page-sub">Duration · Quality · Trends</div>
            </div>
            <div style={s.headerStats}>
              <div style={s.hStat}>
                <span style={{ ...s.hVal, color: parseFloat(avg7) >= 7 ? 'var(--cyan)' : 'var(--orange)' }}>{avg7 || '—'}h</span>
                <span style={s.hLbl}>7-DAY AVG</span>
              </div>
              <div style={s.hStat}>
                <span style={s.hVal}>{logs.length}</span>
                <span style={s.hLbl}>LOGGED</span>
              </div>
            </div>
          </header>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: avg7 ? `${Math.min((parseFloat(avg7)/8)*100,100)}%` : '0%', background:'var(--cyan)', color:'var(--cyan)' }} />
          </div>

          <div style={s.tabs}>
            {[['log','LOG'],['history','HISTORY'],['trends','TRENDS']].map(([t,l]) => (
              <button key={t} style={{ ...s.tab, ...(tab===t ? s.tabActive:{}) }} onClick={() => setTab(t)}>{l}</button>
            ))}
          </div>

          {/* ── LOG TAB ── */}
          {tab === 'log' && (
            <div style={s.body}>
              {/* Stats row */}
              <div style={s.statsRow}>
                <div style={s.statCard}>
                  <div style={{ ...s.statVal, color:'var(--cyan)' }}>{avg7 || '—'}h</div>
                  <div style={s.statLbl}>7-DAY AVG</div>
                </div>
                <div style={s.statCard}>
                  <div style={{ ...s.statVal, color: under7 === 0 ? 'var(--green)' : 'var(--orange)' }}>{under7}</div>
                  <div style={s.statLbl}>UNDER 7H</div>
                </div>
                <div style={s.statCard}>
                  <div style={{ ...s.statVal, color:'var(--purple)' }}>{bestNight ? `${bestNight.duration_hrs}h` : '—'}</div>
                  <div style={s.statLbl}>BEST NIGHT</div>
                </div>
              </div>

              {/* Quick insight */}
              {avg7 && (
                <div style={s.insightCard}>
                  <div style={s.insightText}>
                    {parseFloat(avg7) >= 8
                      ? `Averaging ${avg7}h — excellent recovery. Your body is getting what it needs.`
                      : parseFloat(avg7) >= 7
                      ? `Averaging ${avg7}h — solid. Try to push toward 8h for optimal recovery.`
                      : `Averaging only ${avg7}h — below target. Sleep deprivation is limiting your gains.`
                    }
                  </div>
                </div>
              )}

              {/* Log form */}
              <div style={s.formCard}>
                <div className="section-label" style={{ marginBottom:'14px' }}>// LOG SLEEP</div>

                <div style={s.fieldRow}>
                  <div style={s.field}>
                    <label style={s.label}>DATE</label>
                    <input className="nomis-input" type="date" value={form.date} onChange={e => setF('date', e.target.value)} />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>DURATION (hrs)</label>
                    <input className="nomis-input" type="number" step="0.5" placeholder="7.5" value={form.duration_hrs} onChange={e => setF('duration_hrs', e.target.value)} />
                  </div>
                </div>

                <div style={s.fieldRow}>
                  <div style={s.field}>
                    <label style={s.label}>BEDTIME</label>
                    <input className="nomis-input" type="time" value={form.bedtime} onChange={e => handleTimeChange('bedtime', e.target.value)} />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>WAKE TIME</label>
                    <input className="nomis-input" type="time" value={form.wake_time} onChange={e => handleTimeChange('wake_time', e.target.value)} />
                  </div>
                </div>

                <div style={s.field}>
                  <label style={s.label}>QUALITY</label>
                  <div style={s.qualityRow}>
                    {QUALITY_OPTIONS.map(q => (
                      <button
                        key={q.value}
                        style={{ ...s.qualityBtn, ...(form.quality === q.value ? { ...s.qualityBtnActive, borderColor: q.color, color: q.color, background: `${q.color}0d` } : {}) }}
                        onClick={() => setF('quality', q.value)}
                      >
                        {q.icon} {q.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={s.field}>
                  <label style={s.label}>NOTES</label>
                  <input className="nomis-input" placeholder="Woke up 2x, vivid dreams, etc..." value={form.notes} onChange={e => setF('notes', e.target.value)} />
                </div>

                <button className="nomis-btn" onClick={handleSave} style={{ opacity: saving ? 0.5 : 1 }}>
                  {saving ? '● SAVING...' : saved ? '✓ SAVED' : '+ LOG SLEEP'}
                </button>
              </div>
            </div>
          )}

          {/* ── HISTORY TAB ── */}
          {tab === 'history' && (
            <div style={s.body}>
              <div className="section-label">// SLEEP LOG ({logs.length} nights)</div>
              {logs.length === 0 && <div style={s.empty}>No sleep logged yet</div>}
              {logs.map((log, i) => (
                <div key={log.id || i} style={s.logCard}>
                  <div style={s.logTop}>
                    <div>
                      <div style={s.logDate}>{new Date(log.date).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</div>
                      {log.bedtime && <div style={s.logTimes}>{log.bedtime} → {log.wake_time}</div>}
                    </div>
                    <QualityBar quality={log.quality} size="sm" />
                  </div>
                  <SleepBar hours={parseFloat(log.duration_hrs || 0)} />
                  {log.notes && <div style={s.logNotes}>{log.notes}</div>}
                </div>
              ))}
            </div>
          )}

          {/* ── TRENDS TAB ── */}
          {tab === 'trends' && (
            <div style={s.body}>
              <div style={s.trendStats}>
                {[
                  { label:'7-DAY AVG',  val: avg7  ? `${avg7}h`  : '—', color:'var(--cyan)'   },
                  { label:'14-DAY AVG', val: avg14 ? `${avg14}h` : '—', color:'var(--purple)'  },
                  { label:'NIGHTS < 7H', val: under7, color: under7 === 0 ? 'var(--green)' : 'var(--orange)' },
                  { label:'QUALITY AVG', val: qualityAvg ? `${qualityAvg}/4` : '—', color:'var(--green)' },
                ].map(stat => (
                  <div key={stat.label} style={s.trendStat}>
                    <div style={{ ...s.trendVal, color: stat.color }}>{stat.val}</div>
                    <div style={s.trendLbl}>{stat.label}</div>
                  </div>
                ))}
              </div>

              <div className="section-label">// LAST 14 NIGHTS</div>
              {logs.slice(0,14).map((log, i) => (
                <div key={i} style={s.trendRow}>
                  <div style={s.trendDate}>{new Date(log.date).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</div>
                  <div style={{ flex:1 }}>
                    <SleepBar hours={parseFloat(log.duration_hrs || 0)} />
                  </div>
                  <QualityBar quality={log.quality} size="sm" />
                </div>
              ))}
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
  hVal: { fontFamily:'var(--font-mono)', fontSize:'1.2rem', fontWeight:'500', color:'var(--cyan)', lineHeight:1 },
  hLbl: { fontFamily:'var(--font-mono)', fontSize:'0.42rem', color:'var(--text4)', letterSpacing:'0.12em' },
  tabs: { display:'flex', borderBottom:'1px solid var(--border)' },
  tab: { flex:1, padding:'13px', background:'transparent', border:'none', borderBottom:'2px solid transparent', fontFamily:'var(--font-mono)', fontSize:'0.55rem', color:'var(--text3)', letterSpacing:'0.1em', cursor:'pointer', transition:'all 0.15s' },
  tabActive: { color:'var(--cyan)', borderBottomColor:'var(--cyan)' },
  body: { padding:'20px', display:'flex', flexDirection:'column', gap:'12px' },
  statsRow: { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px' },
  statCard: { background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'12px', padding:'14px', textAlign:'center' },
  statVal: { fontFamily:'var(--font-mono)', fontSize:'1.1rem', fontWeight:'500', lineHeight:1, marginBottom:'4px' },
  statLbl: { fontFamily:'var(--font-mono)', fontSize:'0.42rem', color:'var(--text4)', letterSpacing:'0.1em' },
  insightCard: { background:'linear-gradient(135deg,rgba(0,229,255,0.04),var(--bg2))', border:'1px solid rgba(0,229,255,0.12)', borderRadius:'12px', padding:'14px 16px' },
  insightText: { fontFamily:'var(--font-display)', fontSize:'0.85rem', color:'var(--text2)', lineHeight:1.6 },
  formCard: { background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'14px', padding:'18px' },
  fieldRow: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' },
  field: { display:'flex', flexDirection:'column', gap:'6px', marginBottom:'12px' },
  label: { fontFamily:'var(--font-mono)', fontSize:'0.46rem', color:'var(--text3)', letterSpacing:'0.12em' },
  qualityRow: { display:'flex', gap:'6px' },
  qualityBtn: { flex:1, padding:'8px 4px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'8px', color:'var(--text3)', fontFamily:'var(--font-display)', fontSize:'0.75rem', cursor:'pointer', transition:'all 0.15s', textAlign:'center' },
  qualityBtnActive: { fontWeight:'600' },
  empty: { padding:'40px 20px', textAlign:'center', fontFamily:'var(--font-mono)', fontSize:'0.58rem', color:'var(--text4)', letterSpacing:'0.08em' },
  logCard: { background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'12px', padding:'14px 16px', display:'flex', flexDirection:'column', gap:'8px' },
  logTop: { display:'flex', alignItems:'flex-start', justifyContent:'space-between' },
  logDate: { fontFamily:'var(--font-display)', fontSize:'0.9rem', fontWeight:'600', color:'var(--text)', marginBottom:'2px' },
  logTimes: { fontFamily:'var(--font-mono)', fontSize:'0.48rem', color:'var(--text3)', letterSpacing:'0.06em' },
  logNotes: { fontFamily:'var(--font-display)', fontSize:'0.78rem', color:'var(--text3)', fontStyle:'italic', lineHeight:1.4 },
  trendStats: { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px', marginBottom:'8px' },
  trendStat: { background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'10px', padding:'12px', textAlign:'center' },
  trendVal: { fontFamily:'var(--font-mono)', fontSize:'0.95rem', fontWeight:'500', lineHeight:1, marginBottom:'4px' },
  trendLbl: { fontFamily:'var(--font-mono)', fontSize:'0.38rem', color:'var(--text4)', letterSpacing:'0.1em' },
  trendRow: { display:'flex', alignItems:'center', gap:'12px', padding:'8px 0', borderBottom:'1px solid var(--border)' },
  trendDate: { fontFamily:'var(--font-mono)', fontSize:'0.52rem', color:'var(--text2)', width:'88px', flexShrink:0 },
}
