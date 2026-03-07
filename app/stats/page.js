'use client'
import { useState, useEffect } from 'react'
import Shell from '../../components/Shell'
import NomisChat from '../../components/NomisChat'
import { getRecentWorkouts, getRecentBodyStats, getRecentSleep, getRecentCardio, getPersonalRecords, getRecentNutrition } from '../../lib/api'

export default function Stats() {
  const [workouts, setWorkouts]   = useState([])
  const [bodyStats, setBodyStats] = useState([])
  const [sleep, setSleep]         = useState([])
  const [cardio, setCardio]       = useState([])
  const [prs, setPrs]             = useState([])
  const [nutrition, setNutrition] = useState([])
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState('overview')

  useEffect(() => {
    async function load() {
      try {
        const [w, b, s, c, p, n] = await Promise.all([
          getRecentWorkouts(30),
          getRecentBodyStats(30),
          getRecentSleep(30),
          getRecentCardio(30),
          getPersonalRecords(),
          getRecentNutrition(30),
        ])
        setWorkouts(w || [])
        setBodyStats(b || [])
        setSleep(s || [])
        setCardio(c || [])
        setPrs(p || [])
        setNutrition(n || [])
      } catch (err) {
        console.error('Stats load error:', err)
      }
      setLoading(false)
    }
    load()
  }, [])

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'body', label: 'Body' },
    { key: 'prs', label: 'PRs' },
    { key: 'sleep', label: 'Sleep' },
    { key: 'nutrition', label: 'Nutrition' },
  ]

  // Calculations
  const avgSleep = sleep.length ? (sleep.reduce((a, b) => a + (parseFloat(b.duration_hrs || b.duration_hours) || 0), 0) / sleep.length).toFixed(1) : '--'
  const avgCals = nutrition.length ? Math.round(nutrition.reduce((a, b) => a + (parseInt(b.calories) || 0), 0) / Math.max(1, [...new Set(nutrition.map(n => n.date))].length)) : '--'
  const workoutsThisMonth = workouts.length
  const weightTrend = bodyStats.length >= 2 ? (bodyStats[0].weight_lbs - bodyStats[bodyStats.length - 1].weight_lbs).toFixed(1) : null

  if (loading) return (
    <Shell title="Stats">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--text3)', letterSpacing: '0.12em' }}>LOADING...</span>
      </div>
    </Shell>
  )

  return (
    <Shell title="Stats">
      <div style={s.page}>

        {/* Tab bar */}
        <div style={s.tabBar}>
          {tabs.map(t => (
            <button key={t.key} style={{
              ...s.tab,
              ...(tab === t.key ? s.tabActive : {}),
            }} onClick={() => setTab(t.key)}>{t.label}</button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <>
            <div style={s.section}>
              <div className="section-label" style={s.sLabel}>30-day snapshot</div>
              <div style={s.overviewGrid}>
                <div className="card-sm" style={s.overviewCard}>
                  <div style={{ ...s.ovValue, color: 'var(--cyan)' }} className="mono">{workoutsThisMonth}</div>
                  <div style={s.ovLabel} className="mono">Workouts</div>
                </div>
                <div className="card-sm" style={s.overviewCard}>
                  <div style={{ ...s.ovValue, color: 'var(--teal)' }} className="mono">{avgSleep}h</div>
                  <div style={s.ovLabel} className="mono">Avg sleep</div>
                </div>
                <div className="card-sm" style={s.overviewCard}>
                  <div style={{ ...s.ovValue, color: 'var(--orange)' }} className="mono">{avgCals}</div>
                  <div style={s.ovLabel} className="mono">Avg cal/day</div>
                </div>
                <div className="card-sm" style={s.overviewCard}>
                  <div style={{ ...s.ovValue, color: weightTrend && parseFloat(weightTrend) < 0 ? 'var(--teal)' : 'var(--text)' }} className="mono">
                    {weightTrend ? `${parseFloat(weightTrend) > 0 ? '+' : ''}${weightTrend}` : '--'}
                  </div>
                  <div style={s.ovLabel} className="mono">Weight change</div>
                </div>
              </div>
            </div>

            {/* Mini weight chart */}
            {bodyStats.length > 1 && (
              <div style={s.section}>
                <div className="section-label" style={s.sLabel}>Weight trend</div>
                <div className="card" style={s.chartCard}>
                  <MiniChart data={bodyStats.slice().reverse()} valueKey="weight_lbs" color="var(--cyan)" />
                </div>
              </div>
            )}

            {/* Mini sleep chart */}
            {sleep.length > 1 && (
              <div style={s.section}>
                <div className="section-label" style={s.sLabel}>Sleep trend</div>
                <div className="card" style={s.chartCard}>
                  <MiniChart data={sleep.slice().reverse()} valueKey={(d) => d.duration_hrs || d.duration_hours} color="var(--teal)" />
                </div>
              </div>
            )}
          </>
        )}

        {/* ── BODY ── */}
        {tab === 'body' && (
          <div style={s.section}>
            <div className="section-label" style={s.sLabel}>Body stats history</div>
            {bodyStats.length === 0 ? (
              <div className="card" style={s.emptyCard}><span className="mono" style={s.emptyText}>No body stats logged</span></div>
            ) : (
              <div className="card" style={s.listCard}>
                {bodyStats.slice(0, 20).map((b, i) => (
                  <div key={i} style={{ ...s.listRow, borderBottom: i < bodyStats.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div>
                      <div style={s.listTitle}>{b.weight_lbs} lbs</div>
                      <div style={s.listMeta} className="mono">{b.date}</div>
                    </div>
                    {b.body_fat_pct && <span className="mono" style={s.listVal}>{b.body_fat_pct}% BF</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PRs ── */}
        {tab === 'prs' && (
          <div style={s.section}>
            <div className="section-label" style={s.sLabel}>Personal records</div>
            {prs.length === 0 ? (
              <div className="card" style={s.emptyCard}><span className="mono" style={s.emptyText}>No PRs recorded yet</span></div>
            ) : (
              <div style={s.prList}>
                {prs.map((pr, i) => (
                  <div key={i} className="card-sm" style={s.prCard}>
                    <div>
                      <div style={s.prName}>{pr.metric}</div>
                      <div style={s.prDate} className="mono">{pr.date}</div>
                    </div>
                    <div style={s.prValue} className="mono">
                      {pr.value} <span style={s.prUnit}>{pr.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SLEEP ── */}
        {tab === 'sleep' && (
          <div style={s.section}>
            <div className="section-label" style={s.sLabel}>Sleep log</div>
            {sleep.length === 0 ? (
              <div className="card" style={s.emptyCard}><span className="mono" style={s.emptyText}>No sleep data</span></div>
            ) : (
              <div className="card" style={s.listCard}>
                {sleep.slice(0, 20).map((sl, i) => (
                  <div key={i} style={{ ...s.listRow, borderBottom: i < sleep.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div>
                      <div style={s.listTitle}>{sl.duration_hrs || sl.duration_hours}h</div>
                      <div style={s.listMeta} className="mono">{sl.date}</div>
                    </div>
                    <span className="mono" style={{
                      ...s.listVal,
                      color: sl.quality === 'great' ? 'var(--teal)' : sl.quality === 'good' ? 'var(--cyan)' : sl.quality === 'okay' ? 'var(--orange)' : 'var(--text3)',
                    }}>{sl.quality || '--'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── NUTRITION ── */}
        {tab === 'nutrition' && (
          <div style={s.section}>
            <div className="section-label" style={s.sLabel}>Daily nutrition averages</div>
            {nutrition.length === 0 ? (
              <div className="card" style={s.emptyCard}><span className="mono" style={s.emptyText}>No nutrition data</span></div>
            ) : (
              <div className="card" style={s.listCard}>
                {(() => {
                  const grouped = {}
                  nutrition.forEach(n => {
                    if (!grouped[n.date]) grouped[n.date] = { cal: 0, pro: 0, count: 0 }
                    grouped[n.date].cal += parseInt(n.calories) || 0
                    grouped[n.date].pro += parseInt(n.protein_g) || 0
                    grouped[n.date].count++
                  })
                  return Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 14).map(([date, d], i, arr) => (
                    <div key={date} style={{ ...s.listRow, borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div>
                        <div style={s.listTitle}>{new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                        <div style={s.listMeta} className="mono">{d.count} meal{d.count !== 1 ? 's' : ''}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '14px' }}>
                        <span className="mono" style={{ ...s.listVal, color: 'var(--orange)' }}>{d.cal} cal</span>
                        <span className="mono" style={{ ...s.listVal, color: 'var(--cyan)' }}>{d.pro}g P</span>
                      </div>
                    </div>
                  ))
                })()}
              </div>
            )}
          </div>
        )}

      </div>
      <NomisChat pageContext={`Stats page. Tab: ${tab}. ${workoutsThisMonth} workouts, avg sleep ${avgSleep}h, avg cals ${avgCals}.`} />
    </Shell>
  )
}

// Simple bar chart component
function MiniChart({ data, valueKey, color }) {
  if (!data.length) return null
  const values = data.map(d => typeof valueKey === 'function' ? parseFloat(valueKey(d)) || 0 : parseFloat(d[valueKey]) || 0)
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1

  return (
    <div style={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span className="mono" style={{ fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.08em' }}>
          {data[0]?.date}
        </span>
        <span className="mono" style={{ fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.08em' }}>
          {data[data.length - 1]?.date}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '80px' }}>
        {values.map((v, i) => {
          const height = Math.max(4, ((v - min) / range) * 70 + 10)
          return (
            <div key={i} style={{
              flex: 1,
              height: `${height}px`,
              background: color,
              opacity: 0.6 + (i / values.length) * 0.4,
              borderRadius: '3px 3px 0 0',
              transition: 'height 0.3s ease',
            }} />
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
        <span className="mono" style={{ fontSize: '0.5rem', color }}>
          {min.toFixed(1)}
        </span>
        <span className="mono" style={{ fontSize: '0.5rem', color }}>
          {max.toFixed(1)}
        </span>
      </div>
    </div>
  )
}

const s = {
  page: { padding: '8px 0 40px' },
  section: { marginBottom: '24px' },
  sLabel: { padding: '0 24px', marginBottom: '10px' },

  // Tabs
  tabBar: {
    display: 'flex', gap: '4px', padding: '16px 24px 24px',
    overflowX: 'auto', scrollbarWidth: 'none',
  },
  tab: {
    padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)',
    background: 'transparent', color: 'var(--text3)', fontSize: '0.75rem',
    fontWeight: '500', cursor: 'pointer', whiteSpace: 'nowrap',
    fontFamily: 'var(--font-body)', transition: 'all 0.15s',
  },
  tabActive: {
    background: 'var(--cyan-dim)', borderColor: 'var(--cyan-border)', color: 'var(--cyan)',
  },

  // Overview grid
  overviewGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '0 24px' },
  overviewCard: { padding: '20px 16px', textAlign: 'center' },
  ovValue: { fontSize: '1.3rem', fontWeight: '600', lineHeight: 1, marginBottom: '8px' },
  ovLabel: { fontSize: '0.42rem', color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase' },

  // Chart
  chartCard: { margin: '0 24px', overflow: 'hidden' },

  // List
  listCard: { margin: '0 24px', overflow: 'hidden' },
  listRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px' },
  listTitle: { fontSize: '0.9rem', fontWeight: '500', color: 'var(--text)' },
  listMeta: { fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.04em', marginTop: '3px' },
  listVal: { fontSize: '0.6rem', fontWeight: '500', letterSpacing: '0.02em', color: 'var(--text2)' },

  // PRs
  prList: { display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 24px' },
  prCard: { padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  prName: { fontSize: '0.9rem', fontWeight: '500', color: 'var(--text)' },
  prDate: { fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.04em', marginTop: '4px' },
  prValue: { fontSize: '1.15rem', fontWeight: '600', color: 'var(--cyan)' },
  prUnit: { fontSize: '0.55rem', color: 'var(--text3)' },

  // Empty
  emptyCard: { margin: '0 24px', padding: '32px 20px', textAlign: 'center' },
  emptyText: { fontSize: '0.6rem', color: 'var(--text3)', letterSpacing: '0.06em' },
}
