'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '../../components/Nav'
import NomisChat from '../../components/NomisChat'
import { dbRead } from '../../lib/api'

function BarChart({ data, color, height = 48 }) {
  if (!data?.length) return <div style={{ height, display:'flex', alignItems:'center', justifyContent:'center' }}><span style={{ fontFamily:'var(--font-mono)', fontSize:'0.46rem', color:'var(--text4)' }}>NO DATA</span></div>
  const max = Math.max(...data.map(d => d.val), 1)
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:'3px', height }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex:1, height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end', gap:'3px' }} title={`${d.label}: ${d.val}`}>
          <div style={{ width:'100%', height:`${Math.max((d.val/max)*100,3)}%`, background:color, borderRadius:'2px 2px 0 0', opacity: i===data.length-1?1:0.35, transition:'height 0.4s ease', boxShadow:`0 0 4px ${color}44` }} />
          <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.36rem', color:'var(--text4)', lineHeight:1 }}>{d.label}</span>
        </div>
      ))}
    </div>
  )
}

function LineChart({ data, color, height = 52 }) {
  if (data?.length < 2) return <div style={{ height, display:'flex', alignItems:'center', justifyContent:'center' }}><span style={{ fontFamily:'var(--font-mono)', fontSize:'0.46rem', color:'var(--text4)' }}>NO DATA</span></div>
  const vals = data.map(d => d.val)
  const min  = Math.min(...vals) - 1
  const max  = Math.max(...vals) + 1
  const w    = 280, h = height
  const pts  = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * w
    const y = h - ((v - min) / (max - min)) * (h - 6) - 3
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const last  = vals[vals.length-1]
  const first = vals[0]
  const trend = last - first
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width:'100%', height, overflow:'visible' }}>
        <defs>
          <linearGradient id={`lg-${color.replace(/[^a-z]/gi,'')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.15"/>
            <stop offset="100%" stopColor={color} stopOpacity="0"/>
          </linearGradient>
        </defs>
        <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#lg-${color.replace(/[^a-z]/gi,'')})`}/>
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        {vals.map((v,i) => {
          const x = (i/(vals.length-1))*w
          const y = h - ((v-min)/(max-min))*(h-6) - 3
          return <circle key={i} cx={x} cy={y} r={i===vals.length-1?2.5:1.5} fill={color} opacity={i===vals.length-1?1:0.5}/>
        })}
      </svg>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:'4px' }}>
        <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.38rem', color:'var(--text4)' }}>{data[0]?.label}</span>
        <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.44rem', color: trend<=0?'var(--green)':'var(--orange)' }}>
          {trend>0?'+':''}{trend.toFixed(1)} lbs
        </span>
        <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.38rem', color:'var(--text4)' }}>{data[data.length-1]?.label}</span>
      </div>
    </div>
  )
}

function ModuleCard({ title, sub, href, color, children, onClick }) {
  return (
    <div style={{ background:'var(--bg2)', border:`1px solid var(--border)`, borderRadius:'14px', padding:'14px', cursor:'pointer', transition:'border-color 0.15s' }}
      onClick={onClick}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px' }}>
        <div>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.52rem', fontWeight:'600', color, letterSpacing:'0.12em' }}>{title}</div>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.42rem', color:'var(--text4)', marginTop:'2px', letterSpacing:'0.06em' }}>{sub}</div>
        </div>
        <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.42rem', color, opacity:0.5 }}>→</span>
      </div>
      {children}
    </div>
  )
}

export default function FitnessHub() {
  const router  = useRouter()
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const today = new Date().toISOString().split('T')[0]
    const days7 = Array.from({length:7}, (_,i) => {
      const d = new Date(); d.setDate(d.getDate()-i); return d.toISOString().split('T')[0]
    }).reverse()

    const [workouts, sleep, cardio, body, nutrition] = await Promise.all([
      dbRead('workout_sessions', {}, { order:'date', limit:30 }),
      dbRead('sleep_logs',       {}, { order:'date', limit:14 }),
      dbRead('cardio_sessions',  {}, { order:'date', limit:14 }),
      dbRead('body_stats',       {}, { order:'date', limit:20 }),
      dbRead('nutrition',        {}, { order:'date', limit:14 }),
    ])

    // Workout 7-day bars
    const workoutBars = days7.map(d => ({
      val:   workouts.some(w => w.date === d) ? 1 : 0,
      label: new Date(d).toLocaleDateString('en-US',{weekday:'narrow'})
    }))

    // Sleep 7-day bars
    const sleepBars = days7.map(d => {
      const log = [...sleep].reverse().find(s => s.date === d)
      return { val: log ? parseFloat(log.duration_hrs||0) : 0, label: new Date(d).toLocaleDateString('en-US',{weekday:'narrow'}) }
    })

    // Cardio 7-day
    const cardioBars = days7.map(d => {
      const session = [...cardio].reverse().find(c => c.date === d)
      return { val: session ? parseFloat(session.duration_min||0) : 0, label: new Date(d).toLocaleDateString('en-US',{weekday:'narrow'}) }
    })

    // Weight trend line
    const weightLine = [...body].reverse().filter(s => s.weight_lbs).slice(-10).map(s => ({
      val:   parseFloat(s.weight_lbs),
      label: new Date(s.date).toLocaleDateString('en-US',{month:'numeric',day:'numeric'})
    }))

    // Today status
    const todayWorkout  = workouts.some(w => w.date === today)
    const todaySleep    = [...sleep].reverse().find(s => s.date === today)
    const todayCardio   = [...cardio].reverse().find(c => c.date === today)
    const todayNutrition = [...nutrition].reverse().filter(n => n.date === today)
    const todayCalories = todayNutrition.reduce((a,n) => a+(n.calories||0), 0)

    // Stats
    const weekWorkouts  = workouts.filter(w => days7.includes(w.date)).length
    const avgSleep      = sleep.length ? (sleep.slice(0,7).reduce((a,s)=>a+parseFloat(s.duration_hrs||0),0)/Math.min(sleep.length,7)).toFixed(1) : null
    const latestWeight  = [...body].reverse()[0]?.weight_lbs || null
    const totalMiles    = [...cardio].reverse().slice(0,30).reduce((a,c)=>a+parseFloat(c.distance_miles||0),0).toFixed(1)

    // PRs
    const prs = await dbRead('personal_records', {}, { order:'achieved_at', limit:6 })

    // NOMIS insight
    const insightParts = []
    if (weekWorkouts >= 4)     insightParts.push(`Strong week — ${weekWorkouts}/7 sessions`)
    else if (weekWorkouts > 0) insightParts.push(`${weekWorkouts} workouts this week — push for ${Math.min(weekWorkouts+1,5)}`)
    else                       insightParts.push('No workouts logged yet this week')
    if (avgSleep) {
      if (parseFloat(avgSleep) >= 7.5) insightParts.push(`Sleep averaging ${avgSleep}h — recovery on point`)
      else                              insightParts.push(`Sleep avg ${avgSleep}h — target 8h for optimal recovery`)
    }
    if (latestWeight) insightParts.push(`Current weight: ${latestWeight} lbs`)

    setData({ workoutBars, sleepBars, cardioBars, weightLine, todayWorkout, todaySleep, todayCardio, todayCalories, weekWorkouts, avgSleep, latestWeight, totalMiles, prs, insight: insightParts.join('. ') })
    setLoading(false)
  }

  const pageContext = data ? `Fitness hub. This week: ${data.weekWorkouts} workouts. Sleep avg: ${data.avgSleep||'?'}h. Weight: ${data.latestWeight||'?'} lbs. Miles/30d: ${data.totalMiles}.` : 'Fitness hub loading.'

  if (loading) return (
    <div className="app-shell"><Nav />
      <main className="main-content" style={{ display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100dvh' }}>
        <div style={{ fontFamily:'var(--font-mono)',fontSize:'0.7rem',color:'var(--text3)',letterSpacing:'0.15em' }} className="animate-pulse">LOADING DATA...</div>
      </main>
    </div>
  )

  const { workoutBars, sleepBars, cardioBars, weightLine, todayWorkout, todaySleep, todayCardio, todayCalories, weekWorkouts, avgSleep, latestWeight, totalMiles, prs, insight } = data

  return (
    <div className="app-shell">
      <Nav />
      <main className="main-content">
        <div style={s.page}>
          <header className="pwa-header" style={s.header}>
            <div>
              <div className="page-title">FITNESS</div>
              <div className="page-sub">{new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</div>
            </div>
            <div style={s.weekBadge}>
              <div style={s.weekNum}>{weekWorkouts}<span style={s.weekOf}>/7</span></div>
              <div style={s.weekLbl}>THIS WEEK</div>
            </div>
          </header>

          {/* Weekly progress bar */}
          <div className="progress-track">
            <div className="progress-fill" style={{ width:`${(weekWorkouts/5)*100}%`, background:'var(--green)', color:'var(--green)' }} />
          </div>

          <div style={s.body}>
            {/* Today status row */}
            <div style={s.todayRow}>
              {[
                { label:'WORKOUT', done: todayWorkout,                    href:'/fitness/workout' },
                { label:'SLEEP',   done: !!todaySleep,                   href:'/fitness/sleep'   },
                { label:'CARDIO',  done: !!todayCardio,                  href:'/fitness/cardio'  },
                { label:'CALS',    done: todayCalories > 0, val: todayCalories > 0 ? `${todayCalories}` : null, href:'/fitness/diet' },
              ].map(item => (
                <div key={item.label} style={{ ...s.todayItem, borderColor: item.done ? 'rgba(34,212,138,0.25)' : 'var(--border)', background: item.done ? 'rgba(34,212,138,0.04)' : 'var(--bg2)', cursor:'pointer' }}
                  onClick={() => router.push(item.href)}>
                  <div style={{ ...s.todayDot, background: item.done ? 'var(--green)' : 'var(--text4)', boxShadow: item.done ? '0 0 6px var(--green)' : 'none' }} />
                  <div style={s.todayLabel}>{item.val || item.label}</div>
                </div>
              ))}
            </div>

            {/* NOMIS insight */}
            {insight && (
              <div style={s.insightCard}>
                <span style={s.insightOrb}>N</span>
                <div style={s.insightText}>{insight}</div>
              </div>
            )}

            {/* Charts grid */}
            <div style={s.chartsGrid}>
              <ModuleCard title="WORKOUT" sub="sessions / 7 days" color="var(--green)" onClick={() => router.push('/fitness/workout')}>
                <BarChart data={workoutBars} color="var(--green)" />
              </ModuleCard>

              <ModuleCard title="SLEEP" sub="hours / 7 days" color="var(--cyan)" onClick={() => router.push('/fitness/sleep')}>
                <BarChart data={sleepBars} color="var(--cyan)" />
              </ModuleCard>

              <ModuleCard title="CARDIO" sub="minutes / 7 days" color="var(--orange)" onClick={() => router.push('/fitness/cardio')}>
                <BarChart data={cardioBars} color="var(--orange)" />
              </ModuleCard>

              <ModuleCard title="BODY" sub={latestWeight ? `${latestWeight} lbs` : 'no data'} color="var(--purple, #a78bfa)" onClick={() => router.push('/fitness/body')}>
                <LineChart data={weightLine} color="var(--purple, #a78bfa)" />
              </ModuleCard>
            </div>

            {/* PRs */}
            {prs.length > 0 && (
              <div style={s.prsCard}>
                <div style={s.prsHeader}>
                  <span className="section-label">// PERSONAL RECORDS</span>
                  <span style={s.prsCount}>{prs.length} PRs</span>
                </div>
                <div style={s.prsGrid}>
                  {prs.slice(0,6).map((pr, i) => (
                    <div key={i} style={s.prCard}>
                      <div style={s.prTrophy}>🏆</div>
                      <div style={s.prName}>{pr.exercise_name}</div>
                      <div style={s.prVal}>{pr.weight_lbs}<span style={s.prUnit}> lbs</span></div>
                      <div style={s.prDate}>{new Date(pr.achieved_at||pr.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick nav */}
            <div style={s.quickNav}>
              {[
                { label:'DIET',         href:'/fitness/diet',        color:'var(--green)'  },
                { label:'HISTORY',      href:'/fitness/history',     color:'var(--text3)'  },
                { label:'SUPPLEMENTS',  href:'/fitness/supplements', color:'var(--orange)' },
                { label:'PEPTIDES',     href:'/fitness/peptides',    color:'var(--cyan)'   },
              ].map(item => (
                <button key={item.label} style={{ ...s.quickBtn, color:item.color, borderColor:`${item.color}22` }}
                  onClick={() => router.push(item.href)}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
      <NomisChat pageContext={pageContext} />
    </div>
  )
}

const s = {
  page:{ minHeight:'100dvh',background:'var(--bg)',paddingBottom:'40px' },
  header:{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',padding:'24px 24px 18px',borderBottom:'1px solid var(--border)' },
  weekBadge:{ display:'flex',flexDirection:'column',alignItems:'center',gap:'3px' },
  weekNum:{ fontFamily:'var(--font-mono)',fontSize:'1.4rem',fontWeight:'500',color:'var(--green)',lineHeight:1 },
  weekOf:{ fontSize:'0.7rem',color:'var(--text3)' },
  weekLbl:{ fontFamily:'var(--font-mono)',fontSize:'0.42rem',color:'var(--text4)',letterSpacing:'0.12em' },
  body:{ padding:'16px',display:'flex',flexDirection:'column',gap:'12px' },
  todayRow:{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'6px' },
  todayItem:{ display:'flex',flexDirection:'column',alignItems:'center',gap:'5px',padding:'10px 6px',borderRadius:'10px',border:'1px solid var(--border)',transition:'all 0.15s' },
  todayDot:{ width:'6px',height:'6px',borderRadius:'50%',transition:'all 0.2s' },
  todayLabel:{ fontFamily:'var(--font-mono)',fontSize:'0.44rem',color:'var(--text3)',letterSpacing:'0.08em',textAlign:'center' },
  insightCard:{ display:'flex',alignItems:'flex-start',gap:'10px',background:'linear-gradient(135deg,rgba(34,212,138,0.05),var(--bg2))',border:'1px solid rgba(34,212,138,0.12)',borderRadius:'12px',padding:'12px 14px' },
  insightOrb:{ width:'24px',height:'24px',borderRadius:'7px',background:'rgba(34,212,138,0.12)',border:'1px solid rgba(34,212,138,0.25)',color:'var(--green)',fontFamily:'var(--font-display)',fontSize:'0.7rem',fontWeight:'700',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:'1px' },
  insightText:{ fontFamily:'var(--font-display)',fontSize:'0.82rem',color:'var(--text2)',lineHeight:1.6 },
  chartsGrid:{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px' },
  prsCard:{ background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'14px',padding:'16px' },
  prsHeader:{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px' },
  prsCount:{ fontFamily:'var(--font-mono)',fontSize:'0.48rem',color:'var(--text3)',letterSpacing:'0.08em' },
  prsGrid:{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px' },
  prCard:{ display:'flex',flexDirection:'column',alignItems:'center',gap:'3px',padding:'10px',background:'rgba(255,255,255,0.02)',borderRadius:'10px',border:'1px solid var(--border)',textAlign:'center' },
  prTrophy:{ fontSize:'0.9rem' },
  prName:{ fontFamily:'var(--font-mono)',fontSize:'0.42rem',color:'var(--text3)',letterSpacing:'0.04em',lineHeight:1.3,textAlign:'center' },
  prVal:{ fontFamily:'var(--font-mono)',fontSize:'0.85rem',fontWeight:'500',color:'var(--green)',lineHeight:1 },
  prUnit:{ fontSize:'0.5rem',color:'var(--text4)' },
  prDate:{ fontFamily:'var(--font-mono)',fontSize:'0.38rem',color:'var(--text4)' },
  quickNav:{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'6px' },
  quickBtn:{ padding:'10px 4px',background:'var(--bg2)',border:'1px solid',borderRadius:'9px',fontFamily:'var(--font-mono)',fontSize:'0.46rem',letterSpacing:'0.08em',cursor:'pointer',transition:'all 0.15s',textAlign:'center' },
}
