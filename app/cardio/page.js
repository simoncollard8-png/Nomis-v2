'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { logCardio, getRecentCardio } from '../../lib/api'

const ACTIVITIES = ['Walk', 'Run', 'Bike', 'Swim', 'Hike', 'Elliptical', 'Rowing', 'Jump Rope', 'Other']

export default function Cardio() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    activity: 'Walk',
    duration_min: '',
    distance_miles: '',
    avg_heart_rate: '',
    calories_burned: '',
    notes: '',
  })

  useEffect(() => {
    getRecentCardio(14).then(data => { setHistory(data.reverse()); setLoading(false) })
  }, [])

  function set(key, val) { setForm(prev => ({ ...prev, [key]: val })) }

  async function submit() {
    if (!form.duration_min) return
    setSaving(true)
    await logCardio(form)
    setSaved(true)
    const updated = await getRecentCardio(14)
    setHistory(updated.reverse())
    setForm(prev => ({ ...prev, duration_min: '', distance_miles: '', avg_heart_rate: '', calories_burned: '', notes: '' }))
    setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  const totalMin = history.reduce((a, b) => a + parseInt(b.duration_min || 0), 0)
  const totalMiles = history.reduce((a, b) => a + parseFloat(b.distance_miles || 0), 0).toFixed(1)

  function formatDate(d) {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <div style={s.page} className="safe-top">
      <header style={s.header} className="pwa-header">
        <Link href="/" style={s.back}>‹ BACK</Link>
        <div style={s.headerCenter}>
          <div style={s.title}>CARDIO</div>
          <div style={s.subtitle}>Track your endurance</div>
        </div>
        <div style={{ width: '60px' }} />
      </header>
      <div style={s.progressTrack}><div style={s.progressFill} /></div>

      {history.length > 0 && (
        <div style={s.statsRow}>
          <div style={s.statCard}>
            <div style={s.statVal}>{history.length}</div>
            <div style={s.statLbl}>SESSIONS</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statVal}>{totalMin}m</div>
            <div style={s.statLbl}>TOTAL TIME</div>
          </div>
          <div style={s.statCard}>
            <div style={{ ...s.statVal, color: '#00e5ff' }}>{totalMiles} mi</div>
            <div style={s.statLbl}>TOTAL DIST</div>
          </div>
        </div>
      )}

      <div style={s.formCard}>
        <div style={s.formLabel}>// LOG CARDIO</div>

        <div style={s.fieldRow}>
          <div style={s.field}>
            <label style={s.label}>DATE</label>
            <input style={s.input} type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
          <div style={s.field}>
            <label style={s.label}>DURATION (min)</label>
            <input style={s.input} type="number" placeholder="30" value={form.duration_min} onChange={e => set('duration_min', e.target.value)} />
          </div>
        </div>

        <div style={s.field}>
          <label style={s.label}>ACTIVITY</label>
          <div style={s.activityGrid}>
            {ACTIVITIES.map(a => (
              <button key={a}
                style={{ ...s.actBtn, ...(form.activity === a ? s.actBtnActive : {}) }}
                onClick={() => set('activity', a)}>
                {a}
              </button>
            ))}
          </div>
        </div>

        <div style={s.fieldRow}>
          <div style={s.field}>
            <label style={s.label}>DISTANCE (mi)</label>
            <input style={s.input} type="number" step="0.1" placeholder="2.5" value={form.distance_miles} onChange={e => set('distance_miles', e.target.value)} />
          </div>
          <div style={s.field}>
            <label style={s.label}>AVG HEART RATE</label>
            <input style={s.input} type="number" placeholder="145" value={form.avg_heart_rate} onChange={e => set('avg_heart_rate', e.target.value)} />
          </div>
        </div>

        <div style={s.fieldRow}>
          <div style={s.field}>
            <label style={s.label}>CALORIES</label>
            <input style={s.input} type="number" placeholder="300" value={form.calories_burned} onChange={e => set('calories_burned', e.target.value)} />
          </div>
          <div style={s.field}>
            <label style={s.label}>NOTES</label>
            <input style={s.input} type="text" placeholder="Easy pace, felt good" value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>

        <button style={{ ...s.submitBtn, opacity: saving ? 0.5 : 1 }} onClick={submit} disabled={saving} className="btn-complete">
          {saving ? '● SAVING...' : saved ? '✓ SAVED' : '+ LOG CARDIO'}
        </button>
      </div>

      {history.length > 0 && (
        <div style={s.histSection}>
          <div style={s.histLabel}>// RECENT — 14 DAYS</div>
          <div style={s.histList}>
            {history.map((entry, i) => (
              <div key={i} style={s.histRow}>
                <div style={s.histLeft}>
                  <div style={s.histActivity}>{entry.activity}</div>
                  <div style={s.histDate}>{formatDate(entry.date)}</div>
                </div>
                <div style={s.histStats}>
                  <span style={s.histStat}>{entry.duration_min}m</span>
                  {entry.distance_miles && <span style={s.histStat}>{entry.distance_miles} mi</span>}
                  {entry.avg_heart_rate && <span style={{ ...s.histStat, color: '#ef4444' }}>♡ {entry.avg_heart_rate}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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
  progressFill: { height: '100%', width: '100%', background: 'linear-gradient(90deg, #f59e0b, #ef4444)', boxShadow: '0 0 10px rgba(245,158,11,0.4)' },
  statsRow: { display: 'flex', gap: '10px', padding: '20px 20px 0' },
  statCard: { flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px', textAlign: 'center' },
  statVal: { fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: '500', color: 'var(--green)', lineHeight: 1, marginBottom: '4px' },
  statLbl: { fontFamily: 'var(--font-mono)', fontSize: '0.44rem', color: 'var(--text4)', letterSpacing: '0.1em' },
  formCard: { margin: '20px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px' },
  formLabel: { fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: 'var(--text3)', letterSpacing: '0.15em', marginBottom: '16px' },
  fieldRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '0' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' },
  label: { fontFamily: 'var(--font-mono)', fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.12em' },
  input: { background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: '8px', padding: '11px 14px', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', outline: 'none', transition: 'all 0.15s', width: '100%' },
  activityGrid: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' },
  actBtn: { padding: '7px 12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '7px', color: 'var(--text3)', fontFamily: 'var(--font-mono)', fontSize: '0.55rem', letterSpacing: '0.06em', cursor: 'pointer', transition: 'all 0.15s' },
  actBtnActive: { background: 'rgba(0,229,255,0.08)', borderColor: 'rgba(0,229,255,0.4)', color: '#00e5ff' },
  submitBtn: { width: '100%', padding: '13px', background: 'var(--green-dim)', border: '1px solid var(--green-glow)', borderRadius: '10px', color: 'var(--green)', fontFamily: 'var(--font-display)', fontSize: '0.88rem', fontWeight: '700', letterSpacing: '0.1em', cursor: 'pointer', transition: 'all 0.15s', marginTop: '4px' },
  histSection: { padding: '0 20px' },
  histLabel: { fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: 'var(--text3)', letterSpacing: '0.15em', marginBottom: '12px' },
  histList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  histRow: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  histLeft: {},
  histActivity: { fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: '600', color: 'var(--text)', marginBottom: '2px' },
  histDate: { fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text3)', letterSpacing: '0.06em' },
  histStats: { display: 'flex', gap: '10px', alignItems: 'center' },
  histStat: { fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--green)' },
}
