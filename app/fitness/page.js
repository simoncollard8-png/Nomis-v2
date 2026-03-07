'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '../../components/Nav'
import NomisChat from '../../components/NomisChat'
import { dbRead } from '../../lib/api'

// Score ring component — the hero element
function ScoreRing({ score, max = 100, size = 88, color = 'var(--green)', label, sublabel }) {
  const r         = (size - 10) / 2
  const circ      = 2 * Math.PI * r
  const pct       = Math.min(score / max, 1)
  const offset    = circ * (1 - pct)

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'6px' }}>
      <div style={{ position:'relative', width:size, height:size }}>
        <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
          <circle
            cx={size/2} cy={size/2} r={r}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition:'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)', filter:`drop-shadow(0 0 4px ${color})` }}
          />
        </svg>
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'1px' }}>
          <span style={{ fontFamily:'var(--font-mono)', fontSize: size > 80 ? '1.25rem' : '0.9rem', fontWeight:'600', color, lineHeight:1, letterSpacing:'-0.02em' }}>
            {typeof score === 'number' ? Math.round(score) : score}
          </span>
          {sublabel && <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.38rem', color:'var(--text3)', letterSpacing:'0.06em' }}>{sublabel}</span>}
        </div>
      </div>
      {label && <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.46rem', color:'var(--text3)', letterSpacing:'0.1em' }}>{label}</span>}
    </div>
  )
}

// Mini bar chart
function MiniBar({ data = [], color = 'var(--green)', height = 36 }) {
  const max = Math.max(...data.map(d => d.val), 1)
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:'3px', height }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex:1, height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end', gap:'2px' }}>
          <div style={{
            width:'100%',
            height: `${Math.max((d.val/max)*100, d.val > 0 ? 8 : 3)}%`,
            background: d.val > 0 ? color : 'rgba(255,255,255,0.04)',
            borderRadius:'2px 2px 0 0',
            opacity: i === data.length-1 ? 1 : (d.val > 0 ? 0.45 : 0.2),
            transition:'height 0.4s ease',
          }} />
          <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.32rem', color:'var(--text4)', lineHeight:1 }}>
            {d.label}
          </span>
        </div>
      ))}
    </div>
  )
}

// Module tile
function ModuleTile({ title, color, icon, metric, metricLabel, chart, chartData, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#1c1c1c',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '16px',
        padding: '16px',
        cursor: 'pointer',
        transition: 'border-color 0.15s, transform 0.15s',
        WebkitTapHighlightColor: 'transparent',
      }}
      onTouchStart={e => e.currentTarget.style.transform = 'scale(0.98)'}
      onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'12px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <div style={{ width:'28px', height:'28px', borderRadius:'8px', background:`${color}14`, border:`1px solid ${color}28`, display:'flex', alignItems:'center', justifyContent:'center', color }}>
            {icon}
          </div>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.52rem', color:'var(--text2)', letterSpacing:'0.1em' }}>{title}</span>
        </div>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text4)" strokeWidth="2" strokeLinecap="round">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </div>
      {metric != null && (
        <div style={{ marginBottom:'10px' }}>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:'1.35rem', fontWeight:'600', color, letterSpacing:'-0.02em', lineHeight:1 }}>{metric}</span>
          {metricLabel && <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.48rem', color:'var(--text3)', marginLeft:'5px', letterSpacing:'0.06em' }}>{metricLabel}</span>}
        </div>
      )}
      {chartData && <MiniBar data={chartData} color={color} />}
    </div>
  )
}

export default function FitnessHub() {
  const router  = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const today = new Date().toISOString().split('T')[0]
    const days7 = Array.from({length:7}, (_,i) => {
      const d = new Date(); d.setDate(d.getDate()-i); return d.toISOString().split('T')[0]
    }).reverse()
    const weekLabels = days7.map(d => new Date(d).toLocaleDateString('en-US',{weekday:'narrow'}))

    try {
      const [workouts, sleep, cardio, body, nutrition] = await Promise.all([
        dbRead('workout_sessions', {}, { order:'date', limit:30 }),
        dbRead('sleep_logs',       {}, { order:'date', limit:14 }),
        dbRead('cardio_sessions',  {}, { order:'date', limit:14 }),
        dbRead('body_stats',       {}, { order:'date', limit:20 }),
        dbRead('nutrition',        {}, { order:'date', limit:14 }).catch(() => []),
      ])

      // Chart data
      const workoutBars = days7.map((d,i) => ({ val: workouts.some(w => w.date===d)?1:0, label: weekLabels[i] }))
      const sleepBars   = days7.map((d,i) => {
        const log = [...sleep].reverse().find(s => s.date===d)
        return { val: log ? parseFloat(log.duration_hrs||0) : 0, label: weekLabels[i] }
      })
      const cardioBars  = days7.map((d,i) => {
        const s = [...cardio].reverse().find(c => c.date===d)
        return { val: s ? parseFloat(s.duration_min||0) : 0, label: weekLabels[i] }
      })

      // Stats
      const weekWorkouts  = workouts.filter(w => days7.includes(w.date)).length
      const last7sleep    = days7.map(d => [...sleep].reverse().find(s => s.date===d)).filter(Boolean)
      const avgSleep      = last7sleep.length ? (last7sleep.reduce((a,s)=>a+parseFloat(s.duration_hrs||0),0)/last7sleep.length).toFixed(1) : null
      const latestWeight  = [...body].reverse()[0]?.weight_lbs || null
      const totalMiles    = [...cardio].reverse().slice(0,30).reduce((a,c)=>a+parseFloat(c.distance_miles||0),0).toFixed(1)

      // Today
      const todayWorkout   = workouts.some(w => w.date===today)
      const todaySleep     = [...sleep].reverse().find(s => s.date===today)
      const todayCardio    = [...cardio].reverse().find(c => c.date===today)
      const todayCals      = [...nutrition].reverse().filter(n => n.date===today).reduce((a,n)=>a+(n.calories||0),0)

      // Weekly score (0-100)
      let score = 0
      score += (weekWorkouts / 5) * 35          // workouts  35pts
      score += avgSleep ? Math.min((parseFloat(avgSleep)/8)*30, 30) : 0 // sleep 30pts
      score += todayCardio ? 15 : 0              // cardio    15pts
      score += todayCals > 0 ? 20 : 0            // nutrition 20pts
      score = Math.round(Math.min(score, 100))

      const scoreColor = score >= 80 ? 'var(--green)' : score >= 50 ? 'var(--orange)' : 'var(--red)'

      setData({ workoutBars, sleepBars, cardioBars, weekWorkouts, avgSleep, latestWeight, totalMiles, todayWorkout, todaySleep, todayCardio, todayCals, score, scoreColor })
    } catch(e) {
      console.error(e)
      setData({ workoutBars:[], sleepBars:[], cardioBars:[], weekWorkouts:0, score:0, scoreColor:'var(--text3)' })
    }
    setLoading(false)
  }

  const pageContext = data ? `Fitness hub. Week score: ${data.score}/100. Workouts: ${data.weekWorkouts}/7. Sleep avg: ${data.avgSleep||'?'}h. Weight: ${data.latestWeight||'?'} lbs.` : 'Fitness hub.'

  if (loading) return (
    <div className="app-shell"><Nav />
      <main className="main-content" style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100dvh' }}>
        <div style={{ fontFamily:'var(--font-mono)',fontSize:'0.65rem',color:'var(--text3)',letterSpacing:'0.2em' }}>LOADING...</div>
      </main>
    </div>
  )

  const { workoutBars, sleepBars, cardioBars, weekWorkouts, avgSleep, latestWeight, totalMiles, todayWorkout, todaySleep, todayCardio, todayCals, score, scoreColor } = data

  const icons = {
    workout: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6.5 6.5h1.5v11H6.5zM16 6.5h1.5v11H16z"/><path d="M4 9H6.5M17.5 9H20M4 15H6.5M17.5 15H20M8 11h8v2H8z"/></svg>,
    sleep:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
    cardio:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 12h3l2-7 3 14 3-10 2 3h5"/></svg>,
    body:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="5" r="2"/><path d="M12 7v6M9 10h6M9 22l3-9 3 9"/></svg>,
  }

  return (
    <div className="app-shell">
      <Nav />
      <main className="main-content">
        <div style={{ minHeight:'100dvh', background:'var(--bg)', paddingBottom:'40px' }}>

          {/* ── Header ── */}
          <div style={{ padding:'24px 20px 20px', borderBottom:'1px solid var(--border)', background:'linear-gradient(180deg, rgba(34,212,138,0.03) 0%, transparent 100%)' }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:'1.4rem', fontWeight:'700', letterSpacing:'0.04em', color:'#fff', lineHeight:1 }}>FITNESS</div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.6rem', color:'var(--text3)', letterSpacing:'0.08em', marginTop:'5px' }}>
                  {new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}
                </div>
              </div>
              {/* Score ring — hero element */}
              <ScoreRing score={score} max={100} size={76} color={scoreColor} sublabel="SCORE" />
            </div>
          </div>

          <div style={{ padding:'16px', display:'flex', flexDirection:'column', gap:'12px' }}>

            {/* ── Today's status ── */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'6px' }}>
              {[
                { label:'WORKOUT', done:todayWorkout,   href:'/fitness/workout', color:'var(--green)'  },
                { label:'SLEEP',   done:!!todaySleep,   href:'/fitness/sleep',   color:'var(--cyan)'   },
                { label:'CARDIO',  done:!!todayCardio,  href:'/fitness/cardio',  color:'var(--orange)' },
                { label:'DIET',    done:todayCals > 0,  href:'/fitness/diet',    color:'var(--purple)' },
              ].map(item => (
                <div key={item.label}
                  onClick={() => router.push(item.href)}
                  style={{
                    padding:'12px 6px',
                    borderRadius:'12px',
                    background: item.done ? `${item.color}0d` : '#1c1c1c',
                    border:`1px solid ${item.done ? item.color + '28' : 'rgba(255,255,255,0.06)'}`,
                    display:'flex', flexDirection:'column', alignItems:'center', gap:'6px',
                    cursor:'pointer', transition:'all 0.15s',
                    WebkitTapHighlightColor:'transparent',
                  }}>
                  <div style={{ width:'8px', height:'8px', borderRadius:'50%', background: item.done ? item.color : 'var(--text4)', boxShadow: item.done ? `0 0 6px ${item.color}` : 'none', transition:'all 0.2s' }} />
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.42rem', color: item.done ? item.color : 'var(--text3)', letterSpacing:'0.07em', textAlign:'center', lineHeight:1.3 }}>{item.label}</span>
                </div>
              ))}
            </div>

            {/* ── Weekly rings row ── */}
            <div style={{ background:'#1c1c1c', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'16px', padding:'18px 16px' }}>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.52rem', color:'var(--text3)', letterSpacing:'0.12em', marginBottom:'16px' }}>THIS WEEK</div>
              <div style={{ display:'flex', justifyContent:'space-around' }}>
                <ScoreRing score={weekWorkouts} max={5}   size={72} color="var(--green)"  label="WORKOUTS" sublabel={`/${5}`}  />
                <ScoreRing score={parseFloat(avgSleep||0)} max={8} size={72} color="var(--cyan)"   label="AVG SLEEP" sublabel="HRS" />
                <ScoreRing score={parseFloat(totalMiles||0)} max={20} size={72} color="var(--orange)" label="MILES"    sublabel="/30D" />
              </div>
            </div>

            {/* ── Module tiles ── */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
              <ModuleTile
                title="WORKOUT" color="var(--green)" icon={icons.workout}
                metric={weekWorkouts} metricLabel="this week"
                chartData={workoutBars}
                onClick={() => router.push('/fitness/workout')}
              />
              <ModuleTile
                title="SLEEP" color="var(--cyan)" icon={icons.sleep}
                metric={avgSleep || '—'} metricLabel="avg hrs"
                chartData={sleepBars}
                onClick={() => router.push('/fitness/sleep')}
              />
              <ModuleTile
                title="CARDIO" color="var(--orange)" icon={icons.cardio}
                metric={totalMiles} metricLabel="mi / 30d"
                chartData={cardioBars}
                onClick={() => router.push('/fitness/cardio')}
              />
              <ModuleTile
                title="BODY" color="var(--purple)" icon={icons.body}
                metric={latestWeight || '—'} metricLabel="lbs"
                onClick={() => router.push('/fitness/body')}
              />
            </div>

            {/* ── Quick links ── */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px' }}>
              {[
                { label:'DIET',         href:'/fitness/diet',        color:'var(--green)'  },
                { label:'SUPPLEMENTS',  href:'/fitness/supplements', color:'var(--orange)' },
                { label:'PEPTIDES',     href:'/fitness/peptides',    color:'var(--cyan)'   },
              ].map(item => (
                <button key={item.label}
                  onClick={() => router.push(item.href)}
                  style={{
                    padding:'11px 8px',
                    background:'#1c1c1c',
                    border:`1px solid rgba(255,255,255,0.07)`,
                    borderRadius:'11px',
                    color:'var(--text2)',
                    fontFamily:'var(--font-mono)',
                    fontSize:'0.48rem',
                    letterSpacing:'0.1em',
                    cursor:'pointer',
                    transition:'all 0.15s',
                    WebkitTapHighlightColor:'transparent',
                  }}>
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
