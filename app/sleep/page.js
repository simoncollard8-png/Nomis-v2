'use client'
import { useState, useEffect } from 'react'
import Shell from '../../components/Shell'
import NomisChat from '../../components/NomisChat'
import { dbRead, dbWrite } from '../../lib/api'

const QUALITY_OPTIONS = [
  { key: 'great', label: 'Great', color: 'var(--teal)' },
  { key: 'good',  label: 'Good',  color: 'var(--cyan)' },
  { key: 'okay',  label: 'Okay',  color: 'var(--orange)' },
  { key: 'poor',  label: 'Poor',  color: '#a78bfa' },
  { key: 'bad',   label: 'Bad',   color: 'var(--red)' },
]

export default function Sleep() {
  const [sleepData, setSleepData] = useState([])
  const [loading, setLoading]     = useState(true)
  const [showAdd, setShowAdd]     = useState(false)
  const [saving, setSaving]       = useState(false)
  const [toast, setToast]         = useState(null)
  const [tab, setTab]             = useState('overview')

  // Form
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    duration: '',
    quality: 'good',
    bedtime: '',
    wake_time: '',
    rem_min: '',
    deep_min: '',
    core_min: '',
    awakenings: '',
    resting_hr: '',
    hrv: '',
    notes: '',
  })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const data = await dbRead('sleep', {}, { order: 'date', limit: 60 })
      setSleepData((data || []).sort((a, b) => b.date.localeCompare(a.date)))
    } catch (err) {
      console.error('Sleep load error:', err)
    }
    setLoading(false)
  }

  async function handleSave() {
    if (!form.duration) return
    setSaving(true)
    try {
      await dbWrite('sleep', 'insert', {
        date: form.date,
        duration_hrs: parseFloat(form.duration) || null,
        quality: form.quality || null,
        bedtime: form.bedtime || null,
        wake_time: form.wake_time || null,
        rem_min: parseInt(form.rem_min) || null,
        deep_min: parseInt(form.deep_min) || null,
        core_min: parseInt(form.core_min) || null,
        awakenings: parseInt(form.awakenings) || null,
        resting_hr: parseInt(form.resting_hr) || null,
        hrv: parseInt(form.hrv) || null,
        notes: form.notes || '',
      })
      showToast('Sleep logged')
      setShowAdd(false)
      resetForm()
      await loadData()
    } catch (err) {
      console.error('Save error:', err)
      showToast('Failed to save')
    }
    setSaving(false)
  }

  function resetForm() {
    setForm({
      date: new Date().toISOString().split('T')[0],
      duration: '', quality: 'good', bedtime: '', wake_time: '',
      rem_min: '', deep_min: '', core_min: '', awakenings: '',
      resting_hr: '', hrv: '', notes: '',
    })
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  function updateForm(key, val) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  // Last night
  const lastNight = sleepData[0] || null
  const lastDuration = lastNight ? parseFloat(lastNight.duration_hrs || lastNight.duration_hours) : null
  const lastQuality = lastNight?.quality || null
  const lastQualityColor = QUALITY_OPTIONS.find(q => q.key === lastQuality)?.color || 'var(--text3)'

  // Stage breakdown for last night
  const lastRem = lastNight?.rem_min || null
  const lastDeep = lastNight?.deep_min || null
  const lastCore = lastNight?.core_min || null
  const lastAwake = lastNight?.awakenings || null
  const hasStages = lastRem || lastDeep || lastCore
  const totalStageMin = (lastRem || 0) + (lastDeep || 0) + (lastCore || 0)

  // Averages
  const last7 = sleepData.slice(0, 7)
  const last14 = sleepData.slice(0, 14)
  const last30 = sleepData.slice(0, 30)

  const avg7 = last7.length ? (last7.reduce((a, b) => a + (parseFloat(b.duration_hrs || b.duration_hours) || 0), 0) / last7.length).toFixed(1) : '--'
  const avg14 = last14.length ? (last14.reduce((a, b) => a + (parseFloat(b.duration_hrs || b.duration_hours) || 0), 0) / last14.length).toFixed(1) : '--'
  const avg30 = last30.length ? (last30.reduce((a, b) => a + (parseFloat(b.duration_hrs || b.duration_hours) || 0), 0) / last30.length).toFixed(1) : '--'

  const avgHR = last14.filter(s => s.resting_hr).length
    ? Math.round(last14.filter(s => s.resting_hr).reduce((a, b) => a + parseInt(b.resting_hr), 0) / last14.filter(s => s.resting_hr).length)
    : null
  const avgHRV = last14.filter(s => s.hrv).length
    ? Math.round(last14.filter(s => s.hrv).reduce((a, b) => a + parseInt(b.hrv), 0) / last14.filter(s => s.hrv).length)
    : null

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'history', label: 'History' },
  ]

  if (loading) return (
    <Shell title="Sleep">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--text3)', letterSpacing: '0.12em' }}>LOADING...</span>
      </div>
    </Shell>
  )

  return (
    <Shell title="Sleep">
      <div style={s.page}>

        {toast && (
          <div style={s.toast} className="animate-fadeIn">
            <span className="mono">{toast}</span>
          </div>
        )}

        {/* Tab bar */}
        <div style={s.tabBar}>
          {tabs.map(t => (
            <button key={t.key} style={{
              ...s.tab,
              ...(tab === t.key ? s.tabActive : {}),
            }} onClick={() => setTab(t.key)}>{t.label}</button>
          ))}
          <div style={{ marginLeft: 'auto' }}>
            <button style={s.logBtn} onClick={() => setShowAdd(true)}>+ Log sleep</button>
          </div>
        </div>

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <>
            {/* Last night hero */}
            <div style={s.section}>
              <div className="section-label" style={s.sLabel}>Last night</div>
              {lastNight ? (
                <div className="card" style={s.heroCard}>
                  <div style={s.heroTop}>
                    <div style={s.heroDuration}>
                      <span style={s.heroDurationNum} className="mono">{lastDuration?.toFixed(1) || '--'}</span>
                      <span style={s.heroDurationUnit} className="mono">hours</span>
                    </div>
                    <div style={s.heroMeta}>
                      <span style={{ ...s.heroQuality, color: lastQualityColor }} className="mono">
                        {lastQuality?.toUpperCase() || '--'}
                      </span>
                      <span style={s.heroDate} className="mono">{lastNight.date}</span>
                    </div>
                  </div>

                  {/* Times */}
                  {(lastNight.bedtime || lastNight.wake_time) && (
                    <div style={s.timesRow}>
                      {lastNight.bedtime && (
                        <div style={s.timeItem}>
                          <span style={s.timeLabel} className="mono">Bedtime</span>
                          <span style={s.timeValue} className="mono">{lastNight.bedtime}</span>
                        </div>
                      )}
                      {lastNight.wake_time && (
                        <div style={s.timeItem}>
                          <span style={s.timeLabel} className="mono">Wake</span>
                          <span style={s.timeValue} className="mono">{lastNight.wake_time}</span>
                        </div>
                      )}
                      {lastAwake !== null && (
                        <div style={s.timeItem}>
                          <span style={s.timeLabel} className="mono">Wake-ups</span>
                          <span style={s.timeValue} className="mono">{lastAwake}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sleep stages bar */}
                  {hasStages && (
                    <div style={s.stagesSection}>
                      <div style={s.stagesLabel} className="mono">Sleep stages</div>
                      <div style={s.stagesBar}>
                        {lastDeep > 0 && (
                          <div style={{ ...s.stageSegment, width: `${(lastDeep / totalStageMin) * 100}%`, background: '#6366f1' }} />
                        )}
                        {lastCore > 0 && (
                          <div style={{ ...s.stageSegment, width: `${(lastCore / totalStageMin) * 100}%`, background: 'var(--cyan)' }} />
                        )}
                        {lastRem > 0 && (
                          <div style={{ ...s.stageSegment, width: `${(lastRem / totalStageMin) * 100}%`, background: 'var(--teal)' }} />
                        )}
                      </div>
                      <div style={s.stagesLegend}>
                        {lastDeep > 0 && (
                          <div style={s.stageLegendItem}>
                            <div style={{ ...s.stageDot, background: '#6366f1' }} />
                            <span className="mono" style={s.stageLegendText}>Deep {lastDeep}m</span>
                          </div>
                        )}
                        {lastCore > 0 && (
                          <div style={s.stageLegendItem}>
                            <div style={{ ...s.stageDot, background: 'var(--cyan)' }} />
                            <span className="mono" style={s.stageLegendText}>Core {lastCore}m</span>
                          </div>
                        )}
                        {lastRem > 0 && (
                          <div style={s.stageLegendItem}>
                            <div style={{ ...s.stageDot, background: 'var(--teal)' }} />
                            <span className="mono" style={s.stageLegendText}>REM {lastRem}m</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Vitals */}
                  {(lastNight.resting_hr || lastNight.hrv) && (
                    <div style={s.vitalsRow}>
                      {lastNight.resting_hr && (
                        <div style={s.vitalItem}>
                          <span style={{ ...s.vitalValue, color: 'var(--red)' }} className="mono">{lastNight.resting_hr}</span>
                          <span style={s.vitalLabel} className="mono">Resting HR</span>
                        </div>
                      )}
                      {lastNight.hrv && (
                        <div style={s.vitalItem}>
                          <span style={{ ...s.vitalValue, color: 'var(--teal)' }} className="mono">{lastNight.hrv}</span>
                          <span style={s.vitalLabel} className="mono">HRV</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="card" style={s.emptyCard}>
                  <div className="mono" style={s.emptyText}>No sleep data logged</div>
                  <div style={s.emptyHint}>Tap "+ Log sleep" to get started</div>
                </div>
              )}
            </div>

            {/* Averages */}
            <div style={s.section}>
              <div className="section-label" style={s.sLabel}>Averages</div>
              <div style={s.avgGrid}>
                <div className="card-sm" style={s.avgCard}>
                  <div style={{ ...s.avgValue, color: 'var(--teal)' }} className="mono">{avg7}h</div>
                  <div style={s.avgLabel} className="mono">7-day avg</div>
                </div>
                <div className="card-sm" style={s.avgCard}>
                  <div style={{ ...s.avgValue, color: 'var(--cyan)' }} className="mono">{avg14}h</div>
                  <div style={s.avgLabel} className="mono">14-day avg</div>
                </div>
                <div className="card-sm" style={s.avgCard}>
                  <div style={{ ...s.avgValue, color: 'var(--text)' }} className="mono">{avg30}h</div>
                  <div style={s.avgLabel} className="mono">30-day avg</div>
                </div>
              </div>
            </div>

            {/* Vitals averages */}
            {(avgHR || avgHRV) && (
              <div style={s.section}>
                <div className="section-label" style={s.sLabel}>Vitals (14-day avg)</div>
                <div style={s.avgGrid}>
                  {avgHR && (
                    <div className="card-sm" style={s.avgCard}>
                      <div style={{ ...s.avgValue, color: 'var(--red)' }} className="mono">{avgHR}</div>
                      <div style={s.avgLabel} className="mono">Resting HR</div>
                    </div>
                  )}
                  {avgHRV && (
                    <div className="card-sm" style={s.avgCard}>
                      <div style={{ ...s.avgValue, color: 'var(--teal)' }} className="mono">{avgHRV}</div>
                      <div style={s.avgLabel} className="mono">HRV</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Trend chart */}
            {sleepData.length > 2 && (
              <div style={s.section}>
                <div className="section-label" style={s.sLabel}>Trend (last 14 nights)</div>
                <div className="card" style={s.chartCard}>
                  <SleepChart data={last14.slice().reverse()} />
                </div>
              </div>
            )}

            {/* Recent */}
            {sleepData.length > 0 && (
              <div style={s.section}>
                <div className="section-label" style={s.sLabel}>Recent nights</div>
                <div className="card" style={s.listCard}>
                  {sleepData.slice(0, 7).map((sl, i) => {
                    const dur = parseFloat(sl.duration_hrs || sl.duration_hours) || 0
                    const qColor = QUALITY_OPTIONS.find(q => q.key === sl.quality)?.color || 'var(--text3)'
                    return (
                      <div key={i} style={{
                        ...s.listRow,
                        borderBottom: i < Math.min(sleepData.length, 7) - 1 ? '1px solid var(--border)' : 'none',
                      }}>
                        <div>
                          <div style={s.listTitle}>{dur.toFixed(1)}h</div>
                          <div style={s.listMeta} className="mono">
                            {new Date(sl.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                        <div style={s.listRight}>
                          {sl.deep_min && <span className="mono" style={s.listStage}>{sl.deep_min}m deep</span>}
                          <span className="mono" style={{ ...s.listQuality, color: qColor }}>
                            {sl.quality || '--'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── HISTORY ── */}
        {tab === 'history' && (
          <div style={s.section}>
            <div className="section-label" style={s.sLabel}>All sleep logs</div>
            {sleepData.length === 0 ? (
              <div className="card" style={s.emptyCard}>
                <div className="mono" style={s.emptyText}>No sleep data</div>
              </div>
            ) : (
              <div className="card" style={s.listCard}>
                {sleepData.map((sl, i) => {
                  const dur = parseFloat(sl.duration_hrs || sl.duration_hours) || 0
                  const qColor = QUALITY_OPTIONS.find(q => q.key === sl.quality)?.color || 'var(--text3)'
                  return (
                    <div key={i} style={{
                      ...s.historyRow,
                      borderBottom: i < sleepData.length - 1 ? '1px solid var(--border)' : 'none',
                    }}>
                      <div style={s.historyLeft}>
                        <div style={s.historyDate}>
                          {new Date(sl.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                        <div style={s.historyDuration} className="mono">{dur.toFixed(1)}h</div>
                      </div>
                      <div style={s.historyCenter}>
                        {sl.bedtime && <span className="mono" style={s.historyMeta}>{sl.bedtime}</span>}
                        {sl.bedtime && sl.wake_time && <span style={s.historyArrow}>→</span>}
                        {sl.wake_time && <span className="mono" style={s.historyMeta}>{sl.wake_time}</span>}
                      </div>
                      <div style={s.historyRight}>
                        {sl.deep_min && <span className="mono" style={s.historyStage}>{sl.deep_min}m deep</span>}
                        {sl.rem_min && <span className="mono" style={s.historyStage}>{sl.rem_min}m rem</span>}
                        <span className="mono" style={{ ...s.historyQuality, color: qColor }}>{sl.quality || '--'}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Log Sleep Modal ── */}
        {showAdd && (
          <div style={s.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setShowAdd(false) }}>
            <div style={s.modal} className="animate-fadeIn">
              <div style={s.modalHeader}>
                <span style={s.modalTitle}>Log Sleep</span>
                <button style={s.modalClose} onClick={() => setShowAdd(false)}>
                  <span style={{ position: 'absolute', width: '14px', height: '1.5px', background: 'var(--text3)', transform: 'rotate(45deg)' }} />
                  <span style={{ position: 'absolute', width: '14px', height: '1.5px', background: 'var(--text3)', transform: 'rotate(-45deg)' }} />
                </button>
              </div>

              <div style={s.formBody}>
                {/* Date */}
                <div style={s.formLabel} className="mono">Date</div>
                <input
                  style={s.input} className="mono" type="date"
                  value={form.date}
                  onChange={e => updateForm('date', e.target.value)}
                />

                {/* Duration + Quality */}
                <div style={s.formRow}>
                  <div style={s.formHalf}>
                    <div style={s.formLabel} className="mono">Hours slept</div>
                    <input
                      style={s.input} className="mono"
                      type="number" inputMode="decimal" step="0.5" placeholder="7.5"
                      value={form.duration}
                      onChange={e => updateForm('duration', e.target.value)}
                    />
                  </div>
                  <div style={s.formHalf}>
                    <div style={s.formLabel} className="mono">Quality</div>
                    <div style={s.qualityRow}>
                      {QUALITY_OPTIONS.map(q => (
                        <button key={q.key} style={{
                          ...s.qualityChip,
                          ...(form.quality === q.key ? { background: `${q.color}15`, borderColor: `${q.color}40`, color: q.color } : {}),
                        }} onClick={() => updateForm('quality', q.key)}>{q.label}</button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bedtime / Wake time */}
                <div style={s.formRow}>
                  <div style={s.formHalf}>
                    <div style={s.formLabel} className="mono">Bedtime</div>
                    <input
                      style={s.input} className="mono"
                      type="time" value={form.bedtime}
                      onChange={e => updateForm('bedtime', e.target.value)}
                    />
                  </div>
                  <div style={s.formHalf}>
                    <div style={s.formLabel} className="mono">Wake time</div>
                    <input
                      style={s.input} className="mono"
                      type="time" value={form.wake_time}
                      onChange={e => updateForm('wake_time', e.target.value)}
                    />
                  </div>
                </div>

                {/* Sleep stages */}
                <div style={s.formLabel} className="mono">Sleep stages (minutes)</div>
                <div style={s.stageInputs}>
                  <div style={s.stageInputWrap}>
                    <div style={{ ...s.stageInputLabel, color: '#6366f1' }} className="mono">Deep</div>
                    <input style={s.stageInput} className="mono" type="number" inputMode="numeric" placeholder="--" value={form.deep_min} onChange={e => updateForm('deep_min', e.target.value)} />
                  </div>
                  <div style={s.stageInputWrap}>
                    <div style={{ ...s.stageInputLabel, color: 'var(--cyan)' }} className="mono">Core</div>
                    <input style={s.stageInput} className="mono" type="number" inputMode="numeric" placeholder="--" value={form.core_min} onChange={e => updateForm('core_min', e.target.value)} />
                  </div>
                  <div style={s.stageInputWrap}>
                    <div style={{ ...s.stageInputLabel, color: 'var(--teal)' }} className="mono">REM</div>
                    <input style={s.stageInput} className="mono" type="number" inputMode="numeric" placeholder="--" value={form.rem_min} onChange={e => updateForm('rem_min', e.target.value)} />
                  </div>
                  <div style={s.stageInputWrap}>
                    <div style={s.stageInputLabel} className="mono">Wakes</div>
                    <input style={s.stageInput} className="mono" type="number" inputMode="numeric" placeholder="--" value={form.awakenings} onChange={e => updateForm('awakenings', e.target.value)} />
                  </div>
                </div>

                {/* Vitals */}
                <div style={s.formLabel} className="mono">Vitals (optional)</div>
                <div style={s.formRow}>
                  <div style={s.formHalf}>
                    <div style={{ ...s.stageInputLabel, color: 'var(--red)' }} className="mono">Resting HR</div>
                    <input style={s.input} className="mono" type="number" inputMode="numeric" placeholder="--" value={form.resting_hr} onChange={e => updateForm('resting_hr', e.target.value)} />
                  </div>
                  <div style={s.formHalf}>
                    <div style={{ ...s.stageInputLabel, color: 'var(--teal)' }} className="mono">HRV</div>
                    <input style={s.input} className="mono" type="number" inputMode="numeric" placeholder="--" value={form.hrv} onChange={e => updateForm('hrv', e.target.value)} />
                  </div>
                </div>

                {/* Notes */}
                <input style={s.input} placeholder="Notes (optional)" value={form.notes} onChange={e => updateForm('notes', e.target.value)} />

                <button
                  style={{ ...s.saveBtn, opacity: saving || !form.duration ? 0.4 : 1 }}
                  onClick={handleSave}
                  disabled={saving || !form.duration}
                >
                  {saving ? 'Saving...' : 'Log sleep'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
      <NomisChat pageContext={`Sleep page. Last night: ${lastDuration ? lastDuration.toFixed(1) + 'h' : 'no data'}, quality: ${lastQuality || 'unknown'}. 7-day avg: ${avg7}h.`} />
    </Shell>
  )
}

// ── Sleep trend chart ────────────────────────────────────────────────────────
function SleepChart({ data }) {
  if (!data.length) return null
  const values = data.map(d => parseFloat(d.duration_hrs || d.duration_hours) || 0)
  const max = Math.max(...values, 9)
  const min = Math.min(...values, 5)
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

      {/* 7h target line */}
      <div style={{ position: 'relative', height: '90px' }}>
        <div style={{
          position: 'absolute', left: 0, right: 0,
          bottom: `${((7 - min) / range) * 80 + 5}px`,
          height: '1px', background: 'var(--teal)', opacity: 0.2,
        }} />
        <div style={{
          position: 'absolute', right: 0,
          bottom: `${((7 - min) / range) * 80 + 8}px`,
          fontSize: '0.4rem', color: 'var(--teal)', opacity: 0.5,
          fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
        }}>7h goal</div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '80px', paddingTop: '10px' }}>
          {values.map((v, i) => {
            const height = Math.max(4, ((v - min) / range) * 70 + 10)
            const qualityKey = data[i]?.quality
            const color = v >= 7 ? 'var(--teal)' : v >= 6 ? 'var(--cyan)' : 'var(--orange)'
            return (
              <div key={i} style={{
                flex: 1, height: `${height}px`,
                background: color,
                opacity: 0.5 + (i / values.length) * 0.5,
                borderRadius: '3px 3px 0 0',
                transition: 'height 0.3s ease',
              }} />
            )
          })}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
        <span className="mono" style={{ fontSize: '0.5rem', color: 'var(--text3)' }}>{min.toFixed(1)}h</span>
        <span className="mono" style={{ fontSize: '0.5rem', color: 'var(--teal)' }}>{max.toFixed(1)}h</span>
      </div>
    </div>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────────
const s = {
  page: { padding: '8px 0 40px' },
  section: { marginBottom: '24px' },
  sLabel: { padding: '0 24px', marginBottom: '10px' },

  toast: {
    position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
    zIndex: 300, background: 'rgba(45,212,191,0.1)', border: '1px solid var(--teal-border)',
    borderRadius: '12px', padding: '10px 20px',
    fontSize: '0.6rem', color: 'var(--teal)', letterSpacing: '0.06em',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
  },

  // Tabs
  tabBar: {
    display: 'flex', gap: '4px', padding: '16px 24px 24px', alignItems: 'center',
  },
  tab: {
    padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)',
    background: 'transparent', color: 'var(--text3)', fontSize: '0.75rem',
    fontWeight: '500', cursor: 'pointer', whiteSpace: 'nowrap',
    fontFamily: 'var(--font-body)', transition: 'all 0.15s',
  },
  tabActive: {
    background: 'var(--teal-dim)', borderColor: 'var(--teal-border)', color: 'var(--teal)',
  },
  logBtn: {
    padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--teal-border)',
    background: 'var(--teal-dim)', color: 'var(--teal)',
    fontFamily: 'var(--font-mono)', fontSize: '0.52rem', letterSpacing: '0.06em',
    cursor: 'pointer',
  },

  // Hero
  heroCard: { margin: '0 24px', overflow: 'hidden' },
  heroTop: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '24px 20px 20px',
  },
  heroDuration: { display: 'flex', alignItems: 'baseline', gap: '6px' },
  heroDurationNum: { fontSize: '2.2rem', fontWeight: '600', color: '#fff', lineHeight: 1 },
  heroDurationUnit: { fontSize: '0.6rem', color: 'var(--text3)', letterSpacing: '0.06em' },
  heroMeta: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' },
  heroQuality: { fontSize: '0.55rem', fontWeight: '500', letterSpacing: '0.1em' },
  heroDate: { fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.06em' },

  timesRow: {
    display: 'flex', gap: '0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
  },
  timeItem: {
    flex: 1, padding: '14px 0', textAlign: 'center',
    borderRight: '1px solid var(--border)',
  },
  timeLabel: { fontSize: '0.42rem', color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' },
  timeValue: { fontSize: '0.82rem', fontWeight: '500', color: 'var(--text)' },

  // Stages
  stagesSection: { padding: '16px 20px 20px' },
  stagesLabel: { fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' },
  stagesBar: {
    display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', gap: '2px',
  },
  stageSegment: { height: '100%', borderRadius: '3px' },
  stagesLegend: { display: 'flex', gap: '16px', marginTop: '10px' },
  stageLegendItem: { display: 'flex', alignItems: 'center', gap: '5px' },
  stageDot: { width: '6px', height: '6px', borderRadius: '50%' },
  stageLegendText: { fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.04em' },

  // Vitals
  vitalsRow: {
    display: 'flex', borderTop: '1px solid var(--border)',
  },
  vitalItem: {
    flex: 1, padding: '16px 0', textAlign: 'center',
    borderRight: '1px solid var(--border)',
  },
  vitalValue: { fontSize: '1rem', fontWeight: '600', lineHeight: 1, marginBottom: '5px' },
  vitalLabel: { fontSize: '0.42rem', color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase' },

  // Averages
  avgGrid: { display: 'flex', gap: '8px', padding: '0 24px' },
  avgCard: { flex: 1, padding: '18px 12px', textAlign: 'center' },
  avgValue: { fontSize: '1.15rem', fontWeight: '600', lineHeight: 1, marginBottom: '6px' },
  avgLabel: { fontSize: '0.42rem', color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase' },

  // Chart
  chartCard: { margin: '0 24px', overflow: 'hidden' },

  // List
  listCard: { margin: '0 24px', overflow: 'hidden' },
  listRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px' },
  listTitle: { fontSize: '0.95rem', fontWeight: '500', color: 'var(--text)' },
  listMeta: { fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.04em', marginTop: '3px' },
  listRight: { display: 'flex', alignItems: 'center', gap: '10px' },
  listStage: { fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.04em' },
  listQuality: { fontSize: '0.55rem', fontWeight: '500', letterSpacing: '0.06em' },

  // History
  historyRow: { padding: '14px 18px' },
  historyLeft: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' },
  historyDate: { fontSize: '0.85rem', fontWeight: '500', color: 'var(--text)' },
  historyDuration: { fontSize: '0.85rem', fontWeight: '600', color: 'var(--teal)' },
  historyCenter: { display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' },
  historyMeta: { fontSize: '0.52rem', color: 'var(--text3)', letterSpacing: '0.04em' },
  historyArrow: { fontSize: '0.5rem', color: 'var(--text3)' },
  historyRight: { display: 'flex', gap: '10px', alignItems: 'center' },
  historyStage: { fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.04em' },
  historyQuality: { fontSize: '0.52rem', fontWeight: '500', letterSpacing: '0.06em' },

  // Empty
  emptyCard: { margin: '0 24px', padding: '40px 20px', textAlign: 'center' },
  emptyText: { fontSize: '0.6rem', color: 'var(--text3)', letterSpacing: '0.06em', marginBottom: '6px' },
  emptyHint: { fontSize: '0.72rem', color: 'var(--text3)', opacity: 0.6 },

  // Modal
  modalOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
    zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  },
  modal: {
    width: '100%', maxWidth: '480px', background: 'var(--bg2)',
    border: '1px solid var(--border2)', borderRadius: '20px 20px 0 0',
    maxHeight: '85vh', overflowY: 'auto',
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 20px 12px',
  },
  modalTitle: { fontSize: '1rem', fontWeight: '700', color: '#fff' },
  modalClose: {
    width: '28px', height: '28px', borderRadius: '7px', background: 'transparent',
    border: 'none', position: 'relative', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },

  // Form
  formBody: { padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' },
  formLabel: {
    fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.1em',
    textTransform: 'uppercase', marginBottom: '-4px',
  },
  formRow: { display: 'flex', gap: '10px' },
  formHalf: { flex: 1 },
  input: {
    width: '100%', padding: '12px 14px', borderRadius: '10px',
    border: '1px solid var(--border2)', background: 'var(--bg3)',
    color: 'var(--text)', fontSize: '0.88rem', fontFamily: 'var(--font-body)',
    outline: 'none',
  },
  qualityRow: { display: 'flex', flexWrap: 'wrap', gap: '4px' },
  qualityChip: {
    padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border)',
    background: 'transparent', color: 'var(--text3)', fontSize: '0.6rem',
    fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font-body)',
    transition: 'all 0.15s',
  },
  stageInputs: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' },
  stageInputWrap: { display: 'flex', flexDirection: 'column', gap: '4px' },
  stageInputLabel: {
    fontSize: '0.42rem', color: 'var(--text3)', letterSpacing: '0.1em',
    textTransform: 'uppercase', textAlign: 'center',
  },
  stageInput: {
    width: '100%', padding: '10px 6px', borderRadius: '8px',
    border: '1px solid var(--border2)', background: 'var(--bg3)',
    color: 'var(--text)', fontSize: '0.82rem', textAlign: 'center',
    outline: 'none', fontFamily: 'var(--font-mono)',
  },
  saveBtn: {
    width: '100%', padding: '15px', marginTop: '4px', borderRadius: '12px',
    border: '1px solid var(--teal-border)',
    background: 'linear-gradient(135deg, rgba(45,212,191,0.10), rgba(45,212,191,0.04))',
    color: 'var(--teal)', fontFamily: 'var(--font-body)',
    fontSize: '0.88rem', fontWeight: '600', cursor: 'pointer',
  },
}
