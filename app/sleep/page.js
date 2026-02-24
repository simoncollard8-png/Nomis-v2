'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { logSleep, getRecentSleep } from '../../lib/api'

const QUALITY_OPTIONS = [
  { val: 1, label: 'Terrible', color: '#ef4444' },
  { val: 2, label: 'Poor',     color: '#f97316' },
  { val: 3, label: 'OK',       color: '#eab308' },
  { val: 4, label: 'Good',     color: '#84cc16' },
  { val: 5, label: 'Great',    color: '#22d48a' },
]

export default function Sleep() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    duration_hrs: '',
    quality: 4,
    bedtime: '',
    wake_time: '',
    notes: '',
  })

  useEffect(() => {
    getRecentSleep(14).then(data => {
      setHistory(data.reverse())
      setLoading(false)
    })
  }, [])

  function set(key, val) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function submit() {
    if (!form.duration_hrs) return
    setSaving(true)
    await logSleep(form)
    setSaved(true)
    const updated = await getRecentSleep(14)
    setHistory(updated.reverse())
    setForm(prev => ({ ...prev, duration_hrs: '', bedtime: '', wake_time: '', notes: '' }))
    setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  const avg = history.length
    ? (history.reduce((a, b) => a + parseFloat(b.duration_hrs || 0), 0) / history.length).toFixed(1)
    : null

  const avgQ = history.length
    ? (history.reduce((a, b) => a + parseInt(b.quality || 3), 0) / history.length).toFixed(1)
    : null

  function formatDate(dateStr) {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <div style={s.page} className="safe-top">
      <header style={s.header} className="pwa-header">
        <Link href="/" style={s.back}>‹ BACK</Link>
        <div style={s.headerCenter}>
          <div style={s.title}>SLEEP</div>
          <div style={s.subtitle}>Track your recovery</div>
        </div>
        <div style={{ width: '60px' }} />
      </header>
      <div style={s.progressTrack}><div style={s.progressFill} /></div>

      {/* Stats row */}
      {history.length > 0 && (
        <div style={s.statsRow}>
          <div style={s.statCard}>
            <div style={s.statVal}>{avg}h</div>
            <div style={s.statLbl}>AVG SLEEP</div>
          </div>
          <div style={s.statCard}>
            <div style={{ ...s.statVal, color: '#84cc16' }}>{avgQ}/5</div>
            <div style={s.statLbl}>AVG QUALITY</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statVal}>{history.length}</div>
            <div style={s.statLbl}>ENTRIES</div>
          </div>
        </div>
      )}

      {/* Log form */}
      <div style={s.formCard}>
        <div style={s.formLabel}>// LOG SLEEP</div>

        <div style={s.fieldRow}>
          <div style={s.field}>
            <label style={s.label}>DATE</label>
            <input style={s.input} type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
          <div style={s.field}>
            <label style={s.label}>HOURS SLEPT</label>
            <input style={s.input} type="number" step="0.5" min="0" max="24" placeholder="7.5" value={form.duration_hrs} onChange={e => set('duration_hrs', e.target.value)} />
          </div>
        </div>

        <div style={s.fieldRow}>
          <div style={s.field}>
            <label style={s.label}>BEDTIME</label>
            <input style={s.input} type="time" value={form.bedtime} onChange={e => set('bedtime', e.target.value)} />
          </div>
          <div style={s.field}>
            <label style={s.label}>WAKE TIME</label>
            <input style={s.input} type="time" value={form.wake_time} onChange={e => set('wake_time', e.target.value)} />
          </div>
        </div>

        <div style={s.qualityRow}>
          <label style={s.label}>SLEEP QUALITY</label>
          <div style={s.qualityBtns}>
            {QUALITY_OPTIONS.map(q => (
              <button key={q.val}
                style={{ ...s.qualityBtn, ...(form.quality === q.val ? { background: `${q.color}22`, borderColor: q.color, color: q.color } : {}) }}
                onClick={() => set('quality', q.val)}>
                {q.val} — {q.label}
              </button>
            ))}
          </div>
        </div>

        <div style={s.field}>
          <label style={s.label}>NOTES (optional)</label>
          <input style={s.input} type="text" placeholder="Woke up twice, vivid dreams..." value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>

        <button style={{ ...s.submitBtn, opacity: saving ? 0.5 : 1 }} onClick={submit} disabled={saving} className="btn-complete">
          {saving ? '● SAVING...' : saved ? '✓ SAVED' : '+ LOG SLEEP'}
        </button>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div style={s.histSection}>
          <div style={s.histLabel}>// RECENT — 14 DAYS</div>
          <div style={s.histList}>
            {history.map((entry, i) => {
              const q = QUALITY_OPTIONS.find(o => o.val === parseInt(entry.quality)) || QUALITY_OPTIONS[2]
              return (
                <div key={i} style={s.histRow}>
                  <div style={s.histDate}>{formatDate(entry.date)}</div>
                  <div style={s.histHrs}>{entry.duration_hrs}h</div>
                  <div style={{ ...s.histQuality, color: q.color }}>{q.label}</div>
                  {entry.notes && <div style={s.histNotes}>{entry.notes}</div>}
                </div>
              )
            })}
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
  progressFill: { height: '100%', width: '100%', background: 'linear-gradient(90deg, #00e5ff, #22d48a)', boxShadow: '0 0 10px rgba(0,229,255,0.4)' },
  statsRow: { display: 'flex', gap: '10px', padding: '20px 20px 0' },
  statCard: { flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px', textAlign: 'center' },
  statVal: { fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: '500', color: 'var(--green)', lineHeight: 1, marginBottom: '4px' },
  statLbl: { fontFamily: 'var(--font-mono)', fontSize: '0.44rem', color: 'var(--text4)', letterSpacing: '0.1em' },
  formCard: { margin: '20px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px' },
  formLabel: { fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: 'var(--text3)', letterSpacing: '0.15em', marginBottom: '16px' },
  fieldRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' },
  label: { fontFamily: 'var(--font-mono)', fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.12em' },
  input: { background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: '8px', padding: '11px 14px', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', outline: 'none', transition: 'all 0.15s', width: '100%' },
  qualityRow: { marginBottom: '14px' },
  qualityBtns: { display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' },
  qualityBtn: { padding: '7px 10px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '7px', color: 'var(--text3)', fontFamily: 'var(--font-mono)', fontSize: '0.55rem', letterSpacing: '0.06em', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' },
  submitBtn: { width: '100%', padding: '13px', background: 'var(--green-dim)', border: '1px solid var(--green-glow)', borderRadius: '10px', color: 'var(--green)', fontFamily: 'var(--font-display)', fontSize: '0.88rem', fontWeight: '700', letterSpacing: '0.1em', cursor: 'pointer', transition: 'all 0.15s', marginTop: '4px' },
  histSection: { padding: '0 20px' },
  histLabel: { fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: 'var(--text3)', letterSpacing: '0.15em', marginBottom: '12px' },
  histList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  histRow: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 60px 80px', gap: '8px', alignItems: 'center' },
  histDate: { fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text2)', letterSpacing: '0.06em' },
  histHrs: { fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--green)', textAlign: 'center' },
  histQuality: { fontFamily: 'var(--font-mono)', fontSize: '0.55rem', letterSpacing: '0.06em', textAlign: 'right' },
  histNotes: { gridColumn: '1/-1', fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text3)', letterSpacing: '0.04em', marginTop: '2px' },
}
