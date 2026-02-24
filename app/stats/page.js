'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { logBodyStats, getRecentBodyStats } from '../../lib/api'

export default function Stats() {
  const [history, setHistory] = useState([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    weight_lbs: '',
    body_fat_pct: '',
    chest_in: '',
    waist_in: '',
    hips_in: '',
    arms_in: '',
    thighs_in: '',
    notes: '',
  })

  useEffect(() => {
    getRecentBodyStats(14).then(data => setHistory(data.reverse()))
  }, [])

  function set(key, val) { setForm(prev => ({ ...prev, [key]: val })) }

  async function submit() {
    if (!form.weight_lbs && !form.body_fat_pct) return
    setSaving(true)
    await logBodyStats(form)
    setSaved(true)
    const updated = await getRecentBodyStats(14)
    setHistory(updated.reverse())
    setForm(prev => ({ ...prev, weight_lbs: '', body_fat_pct: '', chest_in: '', waist_in: '', hips_in: '', arms_in: '', thighs_in: '', notes: '' }))
    setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  const latest = history[0]
  const prev = history[1]
  const weightDiff = latest && prev && latest.weight_lbs && prev.weight_lbs
    ? (parseFloat(latest.weight_lbs) - parseFloat(prev.weight_lbs)).toFixed(1)
    : null

  function formatDate(d) {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <div style={s.page} className="safe-top">
      <header style={s.header} className="pwa-header">
        <Link href="/" style={s.back}>‹ BACK</Link>
        <div style={s.headerCenter}>
          <div style={s.title}>BODY</div>
          <div style={s.subtitle}>Weight · Measurements · Composition</div>
        </div>
        <div style={{ width: '60px' }} />
      </header>
      <div style={s.progressTrack}><div style={s.progressFill} /></div>

      {latest && (
        <div style={s.latestCard}>
          <div style={s.latestLabel}>// LATEST — {formatDate(latest.date)}</div>
          <div style={s.latestRow}>
            <div style={s.latestStat}>
              <div style={s.latestVal}>{latest.weight_lbs || '—'}</div>
              <div style={s.latestUnit}>LBS</div>
              {weightDiff && (
                <div style={{ ...s.diff, color: parseFloat(weightDiff) < 0 ? 'var(--green)' : '#ef4444' }}>
                  {parseFloat(weightDiff) > 0 ? '+' : ''}{weightDiff}
                </div>
              )}
            </div>
            <div style={s.latestStat}>
              <div style={s.latestVal}>{latest.body_fat_pct || '—'}</div>
              <div style={s.latestUnit}>% BF</div>
            </div>
            {latest.waist_in && (
              <div style={s.latestStat}>
                <div style={s.latestVal}>{latest.waist_in}"</div>
                <div style={s.latestUnit}>WAIST</div>
              </div>
            )}
            {latest.arms_in && (
              <div style={s.latestStat}>
                <div style={s.latestVal}>{latest.arms_in}"</div>
                <div style={s.latestUnit}>ARMS</div>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={s.formCard}>
        <div style={s.formLabel}>// LOG BODY STATS</div>

        <div style={s.fieldRow}>
          <div style={s.field}>
            <label style={s.label}>DATE</label>
            <input style={s.input} type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
          <div style={s.field}>
            <label style={s.label}>WEIGHT (lbs)</label>
            <input style={s.input} type="number" step="0.1" placeholder="185.0" value={form.weight_lbs} onChange={e => set('weight_lbs', e.target.value)} />
          </div>
        </div>

        <div style={s.fieldRow}>
          <div style={s.field}>
            <label style={s.label}>BODY FAT %</label>
            <input style={s.input} type="number" step="0.1" placeholder="15.0" value={form.body_fat_pct} onChange={e => set('body_fat_pct', e.target.value)} />
          </div>
          <div style={s.field}>
            <label style={s.label}>CHEST (in)</label>
            <input style={s.input} type="number" step="0.25" placeholder="40.0" value={form.chest_in} onChange={e => set('chest_in', e.target.value)} />
          </div>
        </div>

        <div style={s.fieldRow}>
          <div style={s.field}>
            <label style={s.label}>WAIST (in)</label>
            <input style={s.input} type="number" step="0.25" placeholder="32.0" value={form.waist_in} onChange={e => set('waist_in', e.target.value)} />
          </div>
          <div style={s.field}>
            <label style={s.label}>HIPS (in)</label>
            <input style={s.input} type="number" step="0.25" placeholder="38.0" value={form.hips_in} onChange={e => set('hips_in', e.target.value)} />
          </div>
        </div>

        <div style={s.fieldRow}>
          <div style={s.field}>
            <label style={s.label}>ARMS (in)</label>
            <input style={s.input} type="number" step="0.25" placeholder="15.0" value={form.arms_in} onChange={e => set('arms_in', e.target.value)} />
          </div>
          <div style={s.field}>
            <label style={s.label}>THIGHS (in)</label>
            <input style={s.input} type="number" step="0.25" placeholder="23.0" value={form.thighs_in} onChange={e => set('thighs_in', e.target.value)} />
          </div>
        </div>

        <div style={s.field}>
          <label style={s.label}>NOTES</label>
          <input style={s.input} type="text" placeholder="Morning, fasted..." value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>

        <button style={{ ...s.submitBtn, opacity: saving ? 0.5 : 1 }} onClick={submit} disabled={saving} className="btn-complete">
          {saving ? '● SAVING...' : saved ? '✓ SAVED' : '+ LOG STATS'}
        </button>
      </div>

      {history.length > 1 && (
        <div style={s.histSection}>
          <div style={s.histLabel}>// WEIGHT HISTORY</div>
          <div style={s.histList}>
            {history.map((entry, i) => {
              const prevEntry = history[i + 1]
              const diff = prevEntry && entry.weight_lbs && prevEntry.weight_lbs
                ? (parseFloat(entry.weight_lbs) - parseFloat(prevEntry.weight_lbs)).toFixed(1) : null
              return (
                <div key={i} style={s.histRow}>
                  <div style={s.histDate}>{formatDate(entry.date)}</div>
                  <div style={s.histWeight}>{entry.weight_lbs ? `${entry.weight_lbs} lbs` : '—'}</div>
                  {entry.body_fat_pct && <div style={s.histBf}>{entry.body_fat_pct}% BF</div>}
                  {diff && (
                    <div style={{ ...s.histDiff, color: parseFloat(diff) < 0 ? 'var(--green)' : '#ef4444' }}>
                      {parseFloat(diff) > 0 ? '+' : ''}{diff}
                    </div>
                  )}
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
  progressFill: { height: '100%', width: '100%', background: 'linear-gradient(90deg, #a78bfa, #22d48a)', boxShadow: '0 0 10px rgba(167,139,250,0.4)' },
  latestCard: { margin: '20px', background: 'linear-gradient(135deg, rgba(34,212,138,0.06), var(--bg2))', border: '1px solid rgba(34,212,138,0.2)', borderRadius: '14px', padding: '20px' },
  latestLabel: { fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: 'var(--text3)', letterSpacing: '0.15em', marginBottom: '14px' },
  latestRow: { display: 'flex', gap: '24px' },
  latestStat: { display: 'flex', flexDirection: 'column', gap: '2px', position: 'relative' },
  latestVal: { fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: '500', color: 'var(--green)', lineHeight: 1 },
  latestUnit: { fontFamily: 'var(--font-mono)', fontSize: '0.44rem', color: 'var(--text3)', letterSpacing: '0.12em' },
  diff: { fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: '600', marginTop: '2px' },
  formCard: { margin: '20px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px' },
  formLabel: { fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: 'var(--text3)', letterSpacing: '0.15em', marginBottom: '16px' },
  fieldRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' },
  label: { fontFamily: 'var(--font-mono)', fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.12em' },
  input: { background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: '8px', padding: '11px 14px', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', outline: 'none', transition: 'all 0.15s', width: '100%' },
  submitBtn: { width: '100%', padding: '13px', background: 'var(--green-dim)', border: '1px solid var(--green-glow)', borderRadius: '10px', color: 'var(--green)', fontFamily: 'var(--font-display)', fontSize: '0.88rem', fontWeight: '700', letterSpacing: '0.1em', cursor: 'pointer', transition: 'all 0.15s' },
  histSection: { padding: '0 20px' },
  histLabel: { fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: 'var(--text3)', letterSpacing: '0.15em', marginBottom: '12px' },
  histList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  histRow: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '16px' },
  histDate: { fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text2)', flex: 1 },
  histWeight: { fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--green)', fontWeight: '500' },
  histBf: { fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text3)' },
  histDiff: { fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: '600' },
}
