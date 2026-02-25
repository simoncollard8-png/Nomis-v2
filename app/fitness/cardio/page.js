'use client'
import { useState, useEffect } from 'react'
import Nav from '../../../components/Nav'
import NomisChat from '../../../components/NomisChat'
import { dbRead, dbWrite } from '../../../lib/api'

const ACTIVITIES = ['Walk','Run','Bike','Swim','Elliptical','Rowing','HIIT','Jump Rope','Other']
const INTENSITY  = [
  { value:'low',      label:'Low',      color:'var(--cyan)'   },
  { value:'moderate', label:'Moderate', color:'var(--green)'  },
  { value:'high',     label:'High',     color:'var(--orange)' },
  { value:'max',      label:'Max',      color:'var(--red)'    },
]

export default function Cardio() {
  const [tab, setTab]           = useState('log')
  const [sessions, setSessions] = useState([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [form, setForm]         = useState({
    date:'', activity:'Walk', duration_min:'', distance_miles:'',
    avg_heart_rate:'', calories_burned:'', intensity:'moderate', notes:''
  })

  useEffect(() => {
    setForm(f => ({ ...f, date: new Date().toISOString().split('T')[0] }))
    loadData()
  }, [])

  async function loadData() {
    const data = await dbRead('cardio_sessions', {}, { order:'date', limit:60 })
    setSessions([...data].reverse())
    setLoading(false)
  }

  function setF(k, v) { setForm(prev => ({ ...prev, [k]: v })) }

  async function handleSave() {
    if (!form.duration_min) return
    setSaving(true)
    await dbWrite('cardio_sessions', 'insert', {
      date: form.date, activity: form.activity,
      duration_min: parseFloat(form.duration_min) || null,
      distance_miles: parseFloat(form.distance_miles) || null,
      avg_heart_rate: parseInt(form.avg_heart_rate) || null,
      calories_burned: parseInt(form.calories_burned) || null,
      intensity: form.intensity, notes: form.notes,
    })
    await loadData()
    setSaved(true)
    setForm(f => ({ ...f, duration_min:'', distance_miles:'', avg_heart_rate:'', calories_burned:'', notes:'' }))
    setSaving(false)
    setTimeout(() => setSaved(false), 2500)
  }

  const last7     = sessions.slice(0,7)
  const last30    = sessions.slice(0,30)
  const totalMiles = last30.reduce((a,s) => a + parseFloat(s.distance_miles||0), 0).toFixed(1)
  const totalMins  = last30.reduce((a,s) => a + parseFloat(s.duration_min||0), 0)
  const avgDur     = last7.length ? Math.round(last7.reduce((a,s) => a + parseFloat(s.duration_min||0), 0) / last7.length) : null
  const bestPace   = sessions.filter(s => s.distance_miles > 0 && s.duration_min > 0)
    .map(s => s.duration_min / s.distance_miles).sort((a,b) => a-b)[0]

  // Bar chart data
  const chartData = last7.slice().reverse()

  const pageContext = `User is on Cardio page. 7-day avg duration: ${avgDur||'?'} min. Total miles last 30 days: ${totalMiles}. Sessions: ${sessions.length}.`

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
              <div className="page-title">CARDIO</div>
              <div className="page-sub">Sessions · Distance · Heart Rate</div>
            </div>
            <div style={s.headerStats}>
              <div style={s.hStat}><span style={s.hVal}>{sessions.length}</span><span style={s.hLbl}>SESSIONS</span></div>
              <div style={s.hStat}><span style={{ ...s.hVal, color:'var(--orange)' }}>{totalMiles}</span><span style={s.hLbl}>MI/30D</span></div>
            </div>
          </header>
          <div className="progress-track">
            <div className="progress-fill" style={{ width:`${Math.min((last7.length/5)*100,100)}%`, background:'var(--orange)', color:'var(--orange)' }} />
          </div>

          <div style={s.tabs}>
            {[['log','LOG'],['history','HISTORY'],['trends','TRENDS']].map(([t,l]) => (
              <button key={t} style={{ ...s.tab, ...(tab===t?s.tabActive:{}) }} onClick={() => setTab(t)}>{l}</button>
            ))}
          </div>

          {tab === 'log' && (
            <div style={s.body}>
              <div style={s.statsRow}>
                {[
                  { val: `${totalMiles}mi`, lbl:'MILES/30D', color:'var(--orange)' },
                  { val: avgDur||'—',       lbl:'AVG MIN',   color:'var(--green)'  },
                  { val: bestPace ? `${bestPace.toFixed(1)}` : '—', lbl:'BEST PACE', color:'var(--cyan)' },
                ].map(stat => (
                  <div key={stat.lbl} style={s.statCard}>
                    <div style={{ ...s.statVal, color:stat.color }}>{stat.val}</div>
                    <div style={s.statLbl}>{stat.lbl}</div>
                  </div>
                ))}
              </div>

              {/* Bar chart */}
              {chartData.length > 1 && (
                <div style={s.chartCard}>
                  <div style={s.chartLabel}>DURATION (min) — LAST 7 SESSIONS</div>
                  <div style={s.chartBars}>
                    {chartData.map((d,i) => {
                      const max = Math.max(...chartData.map(x => x.duration_min||0), 1)
                      const h = Math.max(((d.duration_min||0)/max)*100, 4)
                      return (
                        <div key={i} style={s.chartBarWrap}>
                          <div style={{ ...s.chartBar, height:`${h}%`, opacity: i===chartData.length-1?1:0.4 }} />
                          <div style={s.chartBarLbl}>{new Date(d.date).toLocaleDateString('en-US',{weekday:'narrow'})}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div style={s.formCard}>
                <div className="section-label" style={{ marginBottom:'14px' }}>// LOG CARDIO</div>
                <div style={s.fieldRow}>
                  <div style={s.field}><label style={s.label}>DATE</label><input className="nomis-input" type="date" value={form.date} onChange={e => setF('date',e.target.value)} /></div>
                  <div style={s.field}><label style={s.label}>ACTIVITY</label>
                    <select className="nomis-select" value={form.activity} onChange={e => setF('activity',e.target.value)}>
                      {ACTIVITIES.map(a => <option key={a}>{a}</option>)}
                    </select>
                  </div>
                </div>
                <div style={s.fieldRow}>
                  <div style={s.field}><label style={s.label}>DURATION (min)</label><input className="nomis-input" type="number" placeholder="30" value={form.duration_min} onChange={e => setF('duration_min',e.target.value)} /></div>
                  <div style={s.field}><label style={s.label}>DISTANCE (mi)</label><input className="nomis-input" type="number" step="0.1" placeholder="2.0" value={form.distance_miles} onChange={e => setF('distance_miles',e.target.value)} /></div>
                </div>
                <div style={s.fieldRow}>
                  <div style={s.field}><label style={s.label}>AVG HR</label><input className="nomis-input" type="number" placeholder="130" value={form.avg_heart_rate} onChange={e => setF('avg_heart_rate',e.target.value)} /></div>
                  <div style={s.field}><label style={s.label}>CALORIES</label><input className="nomis-input" type="number" placeholder="250" value={form.calories_burned} onChange={e => setF('calories_burned',e.target.value)} /></div>
                </div>
                <div style={s.field}>
                  <label style={s.label}>INTENSITY</label>
                  <div style={s.intensityRow}>
                    {INTENSITY.map(i => (
                      <button key={i.value} onClick={() => setF('intensity',i.value)}
                        style={{ ...s.intBtn, ...(form.intensity===i.value ? { borderColor:i.color, color:i.color, background:`${i.color}0d` } : {}) }}>
                        {i.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={s.field}><label style={s.label}>NOTES</label><input className="nomis-input" placeholder="Route, how you felt..." value={form.notes} onChange={e => setF('notes',e.target.value)} /></div>
                <button className="nomis-btn" onClick={handleSave} style={{ opacity:saving?0.5:1 }}>
                  {saving?'● SAVING...':saved?'✓ SAVED':'+ LOG SESSION'}
                </button>
              </div>
            </div>
          )}

          {tab === 'history' && (
            <div style={s.body}>
              <div className="section-label">// ALL SESSIONS ({sessions.length})</div>
              {sessions.length===0 && <div style={s.empty}>No sessions logged yet</div>}
              {sessions.map((session,i) => {
                const intColor = INTENSITY.find(x=>x.value===session.intensity)?.color||'var(--text3)'
                const pace = session.distance_miles && session.duration_min ? (session.duration_min/session.distance_miles).toFixed(1) : null
                return (
                  <div key={session.id||i} style={s.sessionCard}>
                    <div style={s.sessionTop}>
                      <div>
                        <div style={s.sessionName}>{session.activity}</div>
                        <div style={s.sessionDate}>{new Date(session.date).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</div>
                      </div>
                      <div style={s.sessionMetrics}>
                        {session.duration_min && <div style={s.metric}><span style={s.metricVal}>{session.duration_min}</span><span style={s.metricLbl}>min</span></div>}
                        {session.distance_miles && <div style={s.metric}><span style={{ ...s.metricVal,color:'var(--orange)' }}>{session.distance_miles}</span><span style={s.metricLbl}>mi</span></div>}
                        {pace && <div style={s.metric}><span style={{ ...s.metricVal,color:'var(--cyan)' }}>{pace}</span><span style={s.metricLbl}>m/mi</span></div>}
                      </div>
                    </div>
                    <div style={s.sessionFoot}>
                      {session.avg_heart_rate && <span style={s.hrTag}>♥ {session.avg_heart_rate} bpm</span>}
                      {session.calories_burned && <span style={s.calTag}>🔥 {session.calories_burned} cal</span>}
                      <span style={{ ...s.intTag, color:intColor, borderColor:`${intColor}33` }}>{(session.intensity||'').toUpperCase()}</span>
                    </div>
                    {session.notes && <div style={s.sessionNotes}>{session.notes}</div>}
                  </div>
                )
              })}
            </div>
          )}

          {tab === 'trends' && (
            <div style={s.body}>
              <div style={s.trendStats}>
                {[
                  { label:'SESSIONS/30D', val:last30.length,              color:'var(--green)'  },
                  { label:'MILES/30D',    val:`${totalMiles}mi`,          color:'var(--orange)' },
                  { label:'TOTAL MINS',   val:`${Math.round(totalMins)}m`,color:'var(--cyan)'   },
                  { label:'BEST PACE',    val:bestPace?`${bestPace.toFixed(1)}m/mi`:'—', color:'var(--purple)' },
                ].map(stat => (
                  <div key={stat.label} style={s.trendStat}>
                    <div style={{ ...s.trendVal, color:stat.color }}>{stat.val}</div>
                    <div style={s.trendLbl}>{stat.label}</div>
                  </div>
                ))}
              </div>
              <div className="section-label">// BY ACTIVITY</div>
              {ACTIVITIES.filter(a => sessions.some(s => s.activity===a)).map(activity => {
                const acts = sessions.filter(s => s.activity===activity)
                const mi   = acts.reduce((a,s) => a+parseFloat(s.distance_miles||0),0).toFixed(1)
                const mins = acts.reduce((a,s) => a+parseFloat(s.duration_min||0),0)
                return (
                  <div key={activity} style={s.actRow}>
                    <div style={s.actName}>{activity}</div>
                    <div style={s.actStats}>
                      <span style={s.actStat}>{acts.length} sessions</span>
                      {parseFloat(mi)>0 && <span style={s.actStat}>{mi} mi</span>}
                      <span style={s.actStat}>{Math.round(mins)} min</span>
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
  page:{ minHeight:'100dvh',background:'var(--bg)',paddingBottom:'40px' },
  header:{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',padding:'24px 24px 18px',borderBottom:'1px solid var(--border)' },
  headerStats:{ display:'flex',gap:'20px' },
  hStat:{ display:'flex',flexDirection:'column',alignItems:'center',gap:'3px' },
  hVal:{ fontFamily:'var(--font-mono)',fontSize:'1.2rem',fontWeight:'500',color:'var(--green)',lineHeight:1 },
  hLbl:{ fontFamily:'var(--font-mono)',fontSize:'0.42rem',color:'var(--text4)',letterSpacing:'0.12em' },
  tabs:{ display:'flex',borderBottom:'1px solid var(--border)' },
  tab:{ flex:1,padding:'13px',background:'transparent',border:'none',borderBottom:'2px solid transparent',fontFamily:'var(--font-mono)',fontSize:'0.55rem',color:'var(--text3)',letterSpacing:'0.1em',cursor:'pointer',transition:'all 0.15s' },
  tabActive:{ color:'var(--orange)',borderBottomColor:'var(--orange)' },
  body:{ padding:'20px',display:'flex',flexDirection:'column',gap:'12px' },
  statsRow:{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px' },
  statCard:{ background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'12px',padding:'14px',textAlign:'center' },
  statVal:{ fontFamily:'var(--font-mono)',fontSize:'1.1rem',fontWeight:'500',lineHeight:1,marginBottom:'4px' },
  statLbl:{ fontFamily:'var(--font-mono)',fontSize:'0.42rem',color:'var(--text4)',letterSpacing:'0.1em' },
  chartCard:{ background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'12px',padding:'14px' },
  chartLabel:{ fontFamily:'var(--font-mono)',fontSize:'0.44rem',color:'var(--text4)',letterSpacing:'0.1em',marginBottom:'10px' },
  chartBars:{ display:'flex',alignItems:'flex-end',gap:'4px',height:'60px' },
  chartBarWrap:{ flex:1,height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',gap:'4px' },
  chartBar:{ width:'100%',background:'var(--orange)',borderRadius:'2px 2px 0 0',transition:'height 0.3s ease',minHeight:'3px',boxShadow:'0 0 4px rgba(249,115,22,0.3)' },
  chartBarLbl:{ fontFamily:'var(--font-mono)',fontSize:'0.4rem',color:'var(--text4)' },
  formCard:{ background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'14px',padding:'18px' },
  fieldRow:{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px' },
  field:{ display:'flex',flexDirection:'column',gap:'6px',marginBottom:'12px' },
  label:{ fontFamily:'var(--font-mono)',fontSize:'0.46rem',color:'var(--text3)',letterSpacing:'0.12em' },
  intensityRow:{ display:'flex',gap:'6px' },
  intBtn:{ flex:1,padding:'8px 4px',background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'8px',color:'var(--text3)',fontFamily:'var(--font-display)',fontSize:'0.72rem',cursor:'pointer',transition:'all 0.15s',textAlign:'center' },
  empty:{ padding:'40px 20px',textAlign:'center',fontFamily:'var(--font-mono)',fontSize:'0.58rem',color:'var(--text4)',letterSpacing:'0.08em' },
  sessionCard:{ background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'12px',padding:'14px 16px',display:'flex',flexDirection:'column',gap:'8px' },
  sessionTop:{ display:'flex',alignItems:'flex-start',justifyContent:'space-between' },
  sessionName:{ fontFamily:'var(--font-display)',fontSize:'0.95rem',fontWeight:'600',color:'var(--text)',marginBottom:'2px' },
  sessionDate:{ fontFamily:'var(--font-mono)',fontSize:'0.48rem',color:'var(--text3)',letterSpacing:'0.06em' },
  sessionMetrics:{ display:'flex',gap:'14px' },
  metric:{ display:'flex',flexDirection:'column',alignItems:'center',gap:'1px' },
  metricVal:{ fontFamily:'var(--font-mono)',fontSize:'0.95rem',fontWeight:'500',color:'var(--green)',lineHeight:1 },
  metricLbl:{ fontFamily:'var(--font-mono)',fontSize:'0.4rem',color:'var(--text4)',letterSpacing:'0.08em' },
  sessionFoot:{ display:'flex',gap:'8px',flexWrap:'wrap' },
  hrTag:{ fontFamily:'var(--font-mono)',fontSize:'0.48rem',color:'var(--red)',padding:'2px 7px',borderRadius:'5px',border:'1px solid rgba(239,68,68,0.2)',background:'rgba(239,68,68,0.06)' },
  calTag:{ fontFamily:'var(--font-mono)',fontSize:'0.48rem',color:'var(--orange)',padding:'2px 7px',borderRadius:'5px',border:'1px solid rgba(249,115,22,0.2)',background:'rgba(249,115,22,0.06)' },
  intTag:{ fontFamily:'var(--font-mono)',fontSize:'0.44rem',padding:'2px 7px',borderRadius:'5px',border:'1px solid' },
  sessionNotes:{ fontFamily:'var(--font-display)',fontSize:'0.78rem',color:'var(--text3)',lineHeight:1.4,fontStyle:'italic' },
  trendStats:{ display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'10px',marginBottom:'8px' },
  trendStat:{ background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'10px',padding:'14px',textAlign:'center' },
  trendVal:{ fontFamily:'var(--font-mono)',fontSize:'1rem',fontWeight:'500',lineHeight:1,marginBottom:'4px' },
  trendLbl:{ fontFamily:'var(--font-mono)',fontSize:'0.4rem',color:'var(--text4)',letterSpacing:'0.1em' },
  actRow:{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 0',borderBottom:'1px solid var(--border)' },
  actName:{ fontFamily:'var(--font-display)',fontSize:'0.9rem',fontWeight:'600',color:'var(--text)' },
  actStats:{ display:'flex',gap:'10px' },
  actStat:{ fontFamily:'var(--font-mono)',fontSize:'0.5rem',color:'var(--text3)',letterSpacing:'0.04em' },
}
