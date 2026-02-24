'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getRecentWorkouts, getPersonalRecords, getWorkoutSets } from '../../lib/api'

export default function History() {
  const [workouts, setWorkouts] = useState([])
  const [prs, setPrs] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('workouts')
  const [expandedId, setExpandedId] = useState(null)
  const [expandedSets, setExpandedSets] = useState({})

  useEffect(() => {
    async function load() {
      const [w, p] = await Promise.all([getRecentWorkouts(20), getPersonalRecords()])
      setWorkouts(w.reverse())
      // Group PRs by exercise, keep only best
      const grouped = {}
      p.forEach(pr => {
        if (!grouped[pr.metric] || parseFloat(pr.value) > parseFloat(grouped[pr.metric].value)) {
          grouped[pr.metric] = pr
        }
      })
      setPrs(Object.values(grouped).sort((a, b) => parseFloat(b.value) - parseFloat(a.value)))
      setLoading(false)
    }
    load()
  }, [])

  async function toggleWorkout(id) {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    if (!expandedSets[id]) {
      const sets = await getWorkoutSets(id)
      setExpandedSets(prev => ({ ...prev, [id]: sets }))
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  if (loading) return <LoadingScreen />

  return (
    <div style={s.page} className="safe-top">
      <header style={s.header} className="pwa-header">
        <Link href="/" style={s.back}>‹ BACK</Link>
        <div style={s.headerCenter}>
          <div style={s.title}>HISTORY</div>
          <div style={s.subtitle}>{workouts.length} sessions logged</div>
        </div>
        <div style={{ width: '60px' }} />
      </header>
      <div style={s.progressTrack}><div style={s.progressFill} /></div>

      <div style={s.tabs}>
        {['workouts', 'prs'].map(tab => (
          <button key={tab} style={{ ...s.tab, ...(activeTab === tab ? s.tabActive : {}) }}
            onClick={() => setActiveTab(tab)}>
            {tab === 'workouts' ? `SESSIONS (${workouts.length})` : `PRs (${prs.length})`}
          </button>
        ))}
      </div>

      <div style={s.body}>
        {activeTab === 'workouts' && (
          <div style={s.list}>
            {workouts.length === 0 && <EmptyState text="No workouts logged yet" />}
            {workouts.map(w => (
              <div key={w.id} style={s.workoutCard} onClick={() => toggleWorkout(w.id)}>
                <div style={s.workoutTop}>
                  <div style={s.workoutLeft}>
                    <div style={s.workoutDate}>{formatDate(w.date)}</div>
                    <div style={s.workoutTitle}>{w.title || w.muscle_group}</div>
                    {w.description && <div style={s.workoutDesc}>{w.description}</div>}
                  </div>
                  <div style={s.workoutRight}>
                    {w.duration_min && <span style={s.workoutStat}>{w.duration_min}m</span>}
                    <span style={s.chevron}>{expandedId === w.id ? '∨' : '›'}</span>
                  </div>
                </div>
                {expandedId === w.id && (
                  <div style={s.setsExpanded}>
                    {!expandedSets[w.id] ? (
                      <div style={s.loadingTxt}>Loading sets...</div>
                    ) : expandedSets[w.id].length === 0 ? (
                      <div style={s.loadingTxt}>No sets recorded</div>
                    ) : (
                      <>
                        <div style={s.setHeader}>
                          <span>EXERCISE</span><span>SET</span><span>WEIGHT</span><span>REPS</span>
                        </div>
                        {expandedSets[w.id].map((set, i) => (
                          <div key={i} style={s.setRow}>
                            <span style={s.setExercise}>{set.exercise_name}</span>
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

        {activeTab === 'prs' && (
          <div style={s.list}>
            {prs.length === 0 && <EmptyState text="No PRs logged yet — complete some workouts" />}
            {prs.map((pr, i) => (
              <div key={pr.id} style={s.prCard}>
                <div style={s.prRank}>#{i + 1}</div>
                <div style={s.prInfo}>
                  <div style={s.prExercise}>{pr.metric}</div>
                  <div style={s.prDate}>{formatDate(pr.date)}</div>
                </div>
                <div style={s.prValue}>
                  <span style={s.prWeight}>{pr.value}</span>
                  <span style={s.prUnit}>{pr.unit}</span>
                </div>
                <div style={s.prBadge}>🏆 PR</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ text }) {
  return (
    <div style={{ padding: '60px 24px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text4)', letterSpacing: '0.1em' }}>
      {text}
    </div>
  )
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text3)', letterSpacing: '0.1em' }}>
      Loading...
    </div>
  )
}

const s = {
  page: { minHeight: '100dvh', background: 'var(--bg)', paddingBottom: '40px' },
  header: { display: 'flex', alignItems: 'center', padding: '20px 24px 16px', gap: '12px', borderBottom: '1px solid var(--border)' },
  back: { fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text3)', letterSpacing: '0.1em', width: '60px' },
  headerCenter: { flex: 1, textAlign: 'center' },
  title: { fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: '700', letterSpacing: '0.2em', color: '#fff', lineHeight: 1 },
  subtitle: { fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text3)', letterSpacing: '0.1em', marginTop: '3px' },
  progressTrack: { height: '2px', background: 'var(--border)' },
  progressFill: { height: '100%', width: '100%', background: 'linear-gradient(90deg, var(--green), var(--cyan))', boxShadow: '0 0 10px rgba(34,212,138,0.4)' },
  tabs: { display: 'flex', borderBottom: '1px solid var(--border)' },
  tab: { flex: 1, padding: '14px', background: 'transparent', border: 'none', borderBottom: '2px solid transparent', fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text3)', letterSpacing: '0.1em', cursor: 'pointer', transition: 'all 0.15s' },
  tabActive: { color: 'var(--green)', borderBottomColor: 'var(--green)' },
  body: { padding: '20px 20px' },
  list: { display: 'flex', flexDirection: 'column', gap: '10px' },
  workoutCard: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.15s' },
  workoutTop: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '16px' },
  workoutLeft: { flex: 1 },
  workoutDate: { fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: 'var(--green)', letterSpacing: '0.1em', marginBottom: '4px' },
  workoutTitle: { fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: '600', color: 'var(--text)', marginBottom: '3px' },
  workoutDesc: { fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text3)', letterSpacing: '0.04em' },
  workoutRight: { display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 },
  workoutStat: { fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text2)' },
  chevron: { fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--text3)', lineHeight: 1 },
  setsExpanded: { borderTop: '1px solid var(--border)', padding: '14px 16px', background: 'rgba(0,0,0,0.2)' },
  loadingTxt: { fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text4)', letterSpacing: '0.08em' },
  setHeader: { display: 'grid', gridTemplateColumns: '2fr 0.5fr 1fr 0.8fr', gap: '8px', fontFamily: 'var(--font-mono)', fontSize: '0.46rem', color: 'var(--text3)', letterSpacing: '0.1em', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid var(--border)' },
  setRow: { display: 'grid', gridTemplateColumns: '2fr 0.5fr 1fr 0.8fr', gap: '8px', marginBottom: '6px', alignItems: 'center' },
  setExercise: { fontFamily: 'var(--font-display)', fontSize: '0.78rem', color: 'var(--text2)' },
  setCell: { fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text)' },
  prCard: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', transition: 'border-color 0.15s' },
  prRank: { fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text4)', width: '24px', flexShrink: 0 },
  prInfo: { flex: 1 },
  prExercise: { fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: '600', color: 'var(--text)', marginBottom: '2px' },
  prDate: { fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text3)', letterSpacing: '0.08em' },
  prValue: { display: 'flex', alignItems: 'baseline', gap: '3px' },
  prWeight: { fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: '600', color: 'var(--green)' },
  prUnit: { fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: 'var(--text3)', letterSpacing: '0.06em' },
  prBadge: { fontFamily: 'var(--font-mono)', fontSize: '0.48rem', color: '#f59e0b', letterSpacing: '0.06em', flexShrink: 0 },
}
