'use client'
import { useState, useEffect, useRef } from 'react'
import Nav from '../../../components/Nav'
import NomisChat from '../../../components/NomisChat'
import { dbRead, dbWrite, chat } from '../../../lib/api'

const MEASUREMENTS = [
  { key:'chest_in',    label:'Chest',   unit:'in' },
  { key:'waist_in',    label:'Waist',   unit:'in' },
  { key:'hips_in',     label:'Hips',    unit:'in' },
  { key:'neck_in',     label:'Neck',    unit:'in' },
  { key:'bicep_in',    label:'Bicep',   unit:'in' },
  { key:'thigh_in',    label:'Thigh',   unit:'in' },
  { key:'calf_in',     label:'Calf',    unit:'in' },
]

function WeightChart({ data }) {
  if (data.length < 2) return null
  const vals   = data.map(d => parseFloat(d.weight_lbs||0))
  const min    = Math.min(...vals) - 2
  const max    = Math.max(...vals) + 2
  const w      = 300, h = 80
  const pts    = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * w
    const y = h - ((v - min) / (max - min)) * h
    return `${x},${y}`
  }).join(' ')
  const first  = vals[0], last = vals[vals.length-1]
  const trend  = last - first
  const color  = trend <= 0 ? 'var(--green)' : 'var(--orange)'
  return (
    <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'12px', padding:'14px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
        <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.46rem', color:'var(--text4)', letterSpacing:'0.1em' }}>WEIGHT TREND</span>
        <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.52rem', color, letterSpacing:'0.06em' }}>
          {trend > 0 ? '+' : ''}{trend.toFixed(1)} lbs
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width:'100%', height:'60px', overflow:'visible' }}>
        <defs>
          <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2"/>
            <stop offset="100%" stopColor={color} stopOpacity="0"/>
          </linearGradient>
        </defs>
        <polygon points={`0,${h} ${pts} ${w},${h}`} fill="url(#wg)" />
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        {vals.map((v, i) => {
          const x = (i / (vals.length - 1)) * w
          const y = h - ((v - min) / (max - min)) * h
          return <circle key={i} cx={x} cy={y} r={i === vals.length-1 ? 3 : 2} fill={color} opacity={i===vals.length-1?1:0.5}/>
        })}
      </svg>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:'4px' }}>
        <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.4rem', color:'var(--text4)' }}>{data[0]?.date}</span>
        <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.4rem', color:'var(--text4)' }}>{data[data.length-1]?.date}</span>
      </div>
    </div>
  )
}

export default function Body() {
  const [tab, setTab]           = useState('log')
  const [stats, setStats]       = useState([])
  const [photos, setPhotos]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const fileRef                 = useRef()
  const [form, setForm]         = useState({
    date:'', weight_lbs:'', body_fat_pct:'',
    chest_in:'', waist_in:'', hips_in:'', neck_in:'', bicep_in:'', thigh_in:'', calf_in:'',
    notes:'',
  })

  useEffect(() => {
    setForm(f => ({ ...f, date: new Date().toISOString().split('T')[0] }))
    loadData()
    const saved = localStorage.getItem('nomis_body_photos')
    if (saved) setPhotos(JSON.parse(saved))
  }, [])

  async function loadData() {
    const data = await dbRead('body_stats', {}, { order:'date', limit:60 })
    setStats([...data].reverse())
    setLoading(false)
  }

  function setF(k,v) { setForm(prev => ({ ...prev, [k]: v })) }

  async function handleSave() {
    if (!form.weight_lbs && !form.chest_in) return
    setSaving(true)
    const payload = { date: form.date, notes: form.notes }
    if (form.weight_lbs)   payload.weight_lbs   = parseFloat(form.weight_lbs)
    if (form.body_fat_pct) payload.body_fat_pct = parseFloat(form.body_fat_pct)
    MEASUREMENTS.forEach(m => { if (form[m.key]) payload[m.key] = parseFloat(form[m.key]) })
    await dbWrite('body_stats', 'insert', payload)
    await loadData()
    setSaved(true)
    setForm(f => ({ ...f, weight_lbs:'', body_fat_pct:'', chest_in:'', waist_in:'', hips_in:'', neck_in:'', bicep_in:'', thigh_in:'', calf_in:'', notes:'' }))
    setSaving(false)
    setTimeout(() => setSaved(false), 2500)
  }

  async function handlePhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target.result
      const newPhoto = { date: new Date().toISOString().split('T')[0], src: base64 }
      const updated  = [newPhoto, ...photos].slice(0, 9)
      setPhotos(updated)
      localStorage.setItem('nomis_body_photos', JSON.stringify(updated))
      await analyzePhoto(base64)
    }
    reader.readAsDataURL(file)
  }

  async function analyzePhoto(base64) {
    setAnalyzing(true)
    try {
      const MIDDLEWARE_URL = process.env.NEXT_PUBLIC_MIDDLEWARE_URL
      const NOMIS_KEY      = process.env.NEXT_PUBLIC_NOMIS_KEY
      const res = await fetch(`${MIDDLEWARE_URL}/chat`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'x-nomis-key': NOMIS_KEY },
        body: JSON.stringify({
          message: `Analyze this physique photo for a body recomp program. Give me: 1) Areas that appear well developed, 2) Areas to prioritize, 3) Top 3 muscle groups to focus on, 4) One specific recommendation. Be direct, no disclaimers.`,
          image: { data: base64.replace(/^data:image\/\w+;base64,/, ''), media_type: 'image/jpeg' }
        })
      })
      const data = await res.json()
      if (data.response) setAnalysis(data.response)
    } catch {}
    setAnalyzing(false)
  }

  // Latest stats
  const latest   = stats[0]
  const previous = stats[1]
  const weightData = stats.filter(s => s.weight_lbs).slice(0,20).reverse()

  // Weight change
  const weightChange = latest?.weight_lbs && previous?.weight_lbs
    ? (parseFloat(latest.weight_lbs) - parseFloat(previous.weight_lbs)).toFixed(1)
    : null

  const pageContext = `User is on Body page. Latest weight: ${latest?.weight_lbs||'?'} lbs. Body fat: ${latest?.body_fat_pct||'?'}%. Stats logged: ${stats.length}. Progress photos: ${photos.length}.`

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
              <div className="page-title">BODY</div>
              <div className="page-sub">Weight · Measurements · Progress</div>
            </div>
            <div style={s.headerStats}>
              <div style={s.hStat}>
                <span style={s.hVal}>{latest?.weight_lbs||'—'}</span>
                <span style={s.hLbl}>LBS</span>
              </div>
              {latest?.body_fat_pct && (
                <div style={s.hStat}>
                  <span style={{ ...s.hVal, color:'var(--cyan)' }}>{latest.body_fat_pct}%</span>
                  <span style={s.hLbl}>BODY FAT</span>
                </div>
              )}
            </div>
          </header>
          <div className="progress-track">
            <div className="progress-fill" style={{ width:`${Math.min((stats.length/20)*100,100)}%`, background:'var(--purple)', color:'var(--purple)' }} />
          </div>

          <div style={s.tabs}>
            {[['log','LOG'],['history','HISTORY'],['photos','PHOTOS']].map(([t,l]) => (
              <button key={t} style={{ ...s.tab, ...(tab===t?s.tabActive:{}) }} onClick={() => setTab(t)}>{l}</button>
            ))}
          </div>

          {tab === 'log' && (
            <div style={s.body}>
              {/* Current stats */}
              {latest && (
                <div style={s.currentCard}>
                  <div style={s.currentLabel}>// CURRENT</div>
                  <div style={s.currentRow}>
                    <div style={s.currentStat}>
                      <span style={s.curVal}>{latest.weight_lbs}</span>
                      <span style={s.curLbl}>LBS</span>
                    </div>
                    {latest.body_fat_pct && (
                      <div style={s.currentStat}>
                        <span style={{ ...s.curVal, color:'var(--cyan)' }}>{latest.body_fat_pct}</span>
                        <span style={s.curLbl}>% BODY FAT</span>
                      </div>
                    )}
                    {weightChange && (
                      <div style={s.currentStat}>
                        <span style={{ ...s.curVal, color: parseFloat(weightChange) <= 0 ? 'var(--green)' : 'var(--orange)' }}>
                          {parseFloat(weightChange) > 0 ? '+' : ''}{weightChange}
                        </span>
                        <span style={s.curLbl}>VS LAST</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Weight chart */}
              {weightData.length > 1 && <WeightChart data={weightData} />}

              {/* Log form */}
              <div style={s.formCard}>
                <div className="section-label" style={{ marginBottom:'14px' }}>// LOG STATS</div>

                <div style={s.field}><label style={s.label}>DATE</label><input className="nomis-input" type="date" value={form.date} onChange={e => setF('date',e.target.value)} /></div>

                <div style={s.fieldRow}>
                  <div style={s.field}><label style={s.label}>WEIGHT (lbs)</label><input className="nomis-input" type="number" step="0.1" placeholder="185" value={form.weight_lbs} onChange={e => setF('weight_lbs',e.target.value)} /></div>
                  <div style={s.field}><label style={s.label}>BODY FAT %</label><input className="nomis-input" type="number" step="0.1" placeholder="15" value={form.body_fat_pct} onChange={e => setF('body_fat_pct',e.target.value)} /></div>
                </div>

                <div className="section-label" style={{ margin:'4px 0 10px' }}>// MEASUREMENTS (optional)</div>
                <div style={s.measureGrid}>
                  {MEASUREMENTS.map(m => (
                    <div key={m.key} style={s.measureField}>
                      <label style={s.label}>{m.label.toUpperCase()} ({m.unit})</label>
                      <input className="nomis-input" type="number" step="0.25" placeholder="—" value={form[m.key]} onChange={e => setF(m.key, e.target.value)} />
                    </div>
                  ))}
                </div>

                <div style={s.field}><label style={s.label}>NOTES</label><input className="nomis-input" placeholder="How you're feeling, observations..." value={form.notes} onChange={e => setF('notes',e.target.value)} /></div>

                <button className="nomis-btn" onClick={handleSave} style={{ opacity:saving?0.5:1 }}>
                  {saving?'● SAVING...':saved?'✓ SAVED':'+ LOG STATS'}
                </button>
              </div>
            </div>
          )}

          {tab === 'history' && (
            <div style={s.body}>
              <div className="section-label">// STAT HISTORY ({stats.length} entries)</div>
              {stats.length===0 && <div style={s.empty}>No stats logged yet</div>}
              {stats.map((stat, i) => {
                const prev = stats[i+1]
                const wChange = stat.weight_lbs && prev?.weight_lbs ? (parseFloat(stat.weight_lbs)-parseFloat(prev.weight_lbs)).toFixed(1) : null
                return (
                  <div key={stat.id||i} style={s.statCard}>
                    <div style={s.statTop}>
                      <div style={s.statDate}>{new Date(stat.date).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'})}</div>
                      <div style={s.statMetrics}>
                        {stat.weight_lbs && (
                          <div style={s.metricPair}>
                            <span style={s.metricBig}>{stat.weight_lbs}</span>
                            <span style={s.metricUnit}>lbs</span>
                            {wChange && <span style={{ fontSize:'0.5rem', color: parseFloat(wChange)<=0?'var(--green)':'var(--orange)', marginLeft:'4px' }}>
                              {parseFloat(wChange)>0?'+':''}{wChange}
                            </span>}
                          </div>
                        )}
                        {stat.body_fat_pct && (
                          <div style={s.metricPair}>
                            <span style={{ ...s.metricBig, color:'var(--cyan)' }}>{stat.body_fat_pct}</span>
                            <span style={s.metricUnit}>%bf</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {MEASUREMENTS.some(m => stat[m.key]) && (
                      <div style={s.measureRow}>
                        {MEASUREMENTS.filter(m => stat[m.key]).map(m => (
                          <span key={m.key} style={s.measureTag}>{m.label}: {stat[m.key]}"</span>
                        ))}
                      </div>
                    )}
                    {stat.notes && <div style={s.statNotes}>{stat.notes}</div>}
                  </div>
                )
              })}
            </div>
          )}

          {tab === 'photos' && (
            <div style={s.body}>
              <div style={s.photosHeader}>
                <div className="section-label">// PROGRESS PHOTOS ({photos.length})</div>
                <button style={s.uploadBtn} onClick={() => fileRef.current?.click()}>+ Add Photo</button>
                <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handlePhoto} />
              </div>

              {analyzing && (
                <div style={s.analyzingCard} className="animate-pulse">
                  <span>NOMIS is analyzing your photo...</span>
                </div>
              )}

              {analysis && (
                <div style={s.analysisCard}>
                  <div style={s.analysisLabel}>// NOMIS PHYSIQUE ANALYSIS</div>
                  <div style={s.analysisText}>{analysis}</div>
                  <button style={s.dismissBtn} onClick={() => setAnalysis(null)}>Dismiss</button>
                </div>
              )}

              {photos.length === 0 && (
                <div style={s.empty} onClick={() => fileRef.current?.click()}>
                  <div style={{ fontSize:'2rem', marginBottom:'10px', opacity:0.3 }}>📸</div>
                  <div>Tap to upload a photo — NOMIS will analyze your physique</div>
                </div>
              )}

              <div style={s.photoGrid}>
                {photos.map((p,i) => (
                  <div key={i} style={s.photoWrap}>
                    <img src={p.src} alt={p.date} style={s.photo} />
                    <div style={s.photoDate}>{p.date}</div>
                  </div>
                ))}
              </div>
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
  tabActive:{ color:'var(--purple, #a78bfa)',borderBottomColor:'var(--purple, #a78bfa)' },
  body:{ padding:'20px',display:'flex',flexDirection:'column',gap:'12px' },
  currentCard:{ background:'linear-gradient(135deg,rgba(167,139,250,0.06),var(--bg2))',border:'1px solid rgba(167,139,250,0.15)',borderRadius:'14px',padding:'16px' },
  currentLabel:{ fontFamily:'var(--font-mono)',fontSize:'0.46rem',color:'rgba(167,139,250,0.7)',letterSpacing:'0.14em',marginBottom:'10px' },
  currentRow:{ display:'flex',gap:'24px' },
  currentStat:{ display:'flex',flexDirection:'column',gap:'3px' },
  curVal:{ fontFamily:'var(--font-mono)',fontSize:'1.4rem',fontWeight:'500',color:'var(--text)',lineHeight:1 },
  curLbl:{ fontFamily:'var(--font-mono)',fontSize:'0.42rem',color:'var(--text4)',letterSpacing:'0.1em' },
  formCard:{ background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'14px',padding:'18px' },
  fieldRow:{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px' },
  measureGrid:{ display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'10px',marginBottom:'12px' },
  measureField:{ display:'flex',flexDirection:'column',gap:'5px' },
  field:{ display:'flex',flexDirection:'column',gap:'6px',marginBottom:'12px' },
  label:{ fontFamily:'var(--font-mono)',fontSize:'0.46rem',color:'var(--text3)',letterSpacing:'0.12em' },
  empty:{ padding:'40px 20px',textAlign:'center',fontFamily:'var(--font-display)',fontSize:'0.85rem',color:'var(--text3)',lineHeight:1.6,cursor:'pointer' },
  statCard:{ background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'12px',padding:'14px 16px',display:'flex',flexDirection:'column',gap:'8px' },
  statTop:{ display:'flex',alignItems:'flex-start',justifyContent:'space-between' },
  statDate:{ fontFamily:'var(--font-display)',fontSize:'0.9rem',fontWeight:'600',color:'var(--text)' },
  statMetrics:{ display:'flex',gap:'16px' },
  metricPair:{ display:'flex',alignItems:'baseline',gap:'3px' },
  metricBig:{ fontFamily:'var(--font-mono)',fontSize:'1rem',fontWeight:'500',color:'var(--green)' },
  metricUnit:{ fontFamily:'var(--font-mono)',fontSize:'0.44rem',color:'var(--text4)' },
  measureRow:{ display:'flex',flexWrap:'wrap',gap:'5px' },
  measureTag:{ fontFamily:'var(--font-mono)',fontSize:'0.46rem',color:'var(--text3)',padding:'2px 7px',borderRadius:'5px',border:'1px solid var(--border)',background:'var(--bg3)' },
  statNotes:{ fontFamily:'var(--font-display)',fontSize:'0.78rem',color:'var(--text3)',fontStyle:'italic' },
  photosHeader:{ display:'flex',alignItems:'center',justifyContent:'space-between' },
  uploadBtn:{ padding:'7px 14px',background:'rgba(167,139,250,0.08)',border:'1px solid rgba(167,139,250,0.25)',borderRadius:'8px',color:'rgba(167,139,250,0.9)',fontFamily:'var(--font-mono)',fontSize:'0.52rem',letterSpacing:'0.08em',cursor:'pointer' },
  analyzingCard:{ background:'rgba(34,212,138,0.04)',border:'1px solid rgba(34,212,138,0.15)',borderRadius:'10px',padding:'12px 16px',fontFamily:'var(--font-mono)',fontSize:'0.55rem',color:'var(--green)',letterSpacing:'0.1em',textAlign:'center' },
  analysisCard:{ background:'linear-gradient(135deg,rgba(34,212,138,0.05),var(--bg2))',border:'1px solid rgba(34,212,138,0.15)',borderRadius:'12px',padding:'16px',display:'flex',flexDirection:'column',gap:'8px' },
  analysisLabel:{ fontFamily:'var(--font-mono)',fontSize:'0.48rem',color:'var(--green)',letterSpacing:'0.15em',opacity:0.7 },
  analysisText:{ fontFamily:'var(--font-display)',fontSize:'0.85rem',color:'var(--text2)',lineHeight:1.7 },
  dismissBtn:{ alignSelf:'flex-start',background:'transparent',border:'1px solid var(--border)',borderRadius:'7px',padding:'5px 12px',color:'var(--text4)',fontFamily:'var(--font-mono)',fontSize:'0.48rem',cursor:'pointer' },
  photoGrid:{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px' },
  photoWrap:{ position:'relative',borderRadius:'10px',overflow:'hidden',border:'1px solid var(--border)',aspectRatio:'3/4' },
  photo:{ width:'100%',height:'100%',objectFit:'cover',display:'block' },
  photoDate:{ position:'absolute',bottom:0,left:0,right:0,padding:'4px 6px',background:'rgba(0,0,0,0.6)',fontFamily:'var(--font-mono)',fontSize:'0.4rem',color:'var(--text3)' },
}
