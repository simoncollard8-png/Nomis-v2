'use client'
import { getLocalDate } from '../../lib/date'
import { useState, useEffect } from 'react'
import Shell from '../../components/Shell'
import NomisChat from '../../components/NomisChat'
import { dbRead, dbWrite, logNutrition } from '../../lib/api'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const LOG_TYPES = [
  { key: 'workout',   label: 'Workout',    color: 'var(--cyan)',   dim: 'var(--cyan-dim)',   border: 'var(--cyan-border)' },
  { key: 'nutrition', label: 'Meal',        color: 'var(--orange)', dim: 'var(--orange-dim)', border: 'var(--orange-border)' },
  { key: 'sleep',     label: 'Sleep',       color: 'var(--teal)',   dim: 'var(--teal-dim)',   border: 'var(--teal-border)' },
  { key: 'cardio',    label: 'Cardio',      color: '#a78bfa',       dim: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)' },
  { key: 'body',      label: 'Body Stats',  color: 'var(--text2)',  dim: 'rgba(145,152,165,0.08)', border: 'rgba(145,152,165,0.2)' },
]
const WORKOUT_TYPES = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body', 'Cardio']
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack']
const SLEEP_QUALITY = [
  { key: 'great', label: 'Great', color: 'var(--teal)' },
  { key: 'good',  label: 'Good',  color: 'var(--cyan)' },
  { key: 'okay',  label: 'Okay',  color: 'var(--orange)' },
  { key: 'poor',  label: 'Poor',  color: '#a78bfa' },
  { key: 'bad',   label: 'Bad',   color: 'var(--red)' },
]
const CARDIO_TYPES = ['Walk', 'Run', 'Bike', 'Swim', 'Hike', 'Row', 'Other']
const FEELINGS = ['great', 'good', 'okay', 'rough']

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [monthData, setMonthData]       = useState({})
  const [dayDetail, setDayDetail]       = useState(null)
  const [loading, setLoading]           = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [savedMeals, setSavedMeals]     = useState([])

  // Modal
  const [showAdd, setShowAdd]   = useState(false)
  const [addType, setAddType]   = useState(null)
  const [saving, setSaving]     = useState(false)
  const [toast, setToast]       = useState(null)

  // Workout form
  const [wf, setWf] = useState({ muscle_group: 'Push', title: '', description: '', feeling: '', duration_min: '' })
  // Nutrition form
  const [nf, setNf] = useState({ meal: 'Lunch', description: '', calories: '', protein: '', carbs: '', fat: '' })
  // Sleep form
  const [sf, setSf] = useState({ duration: '', quality: 'good', bedtime: '', wake_time: '', rem_min: '', deep_min: '', core_min: '', awakenings: '', resting_hr: '', hrv: '', notes: '' })
  // Cardio form
  const [cf, setCf] = useState({ activity: 'Walk', duration_min: '', distance: '', notes: '' })
  // Body form
  const [bf, setBf] = useState({ weight: '', body_fat: '', notes: '' })

  useEffect(() => { loadMonthData() }, [currentMonth])
  useEffect(() => { loadSavedMeals() }, [])

  async function loadSavedMeals() {
    try {
      const saved = await dbRead('saved_meals', {}, { order: 'use_count', limit: 20 })
      setSavedMeals(saved || [])
    } catch {}
  }

  async function loadMonthData() {
    setLoading(true)
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const lastDay = new Date(year, month + 1, 0).getDate()
    try {
      const [workouts, sleep, nutrition, cardio, bodyStats] = await Promise.all([
        dbRead('workouts', {}, { order: 'date', limit: 100 }),
        dbRead('sleep', {}, { order: 'date', limit: 100 }),
        dbRead('nutrition', {}, { order: 'date', limit: 200 }),
        dbRead('cardio', {}, { order: 'date', limit: 100 }),
        dbRead('body_stats', {}, { order: 'date', limit: 100 }),
      ])
      const data = {}
      for (let d = 1; d <= lastDay; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        data[dateStr] = {
          workout:   workouts.some(r => r.date === dateStr),
          sleep:     sleep.some(r => r.date === dateStr),
          nutrition: nutrition.some(r => r.date === dateStr),
          cardio:    cardio.some(r => r.date === dateStr),
          body:      bodyStats.some(r => r.date === dateStr),
        }
      }
      setMonthData(data)
    } catch (err) { console.error('Calendar load error:', err) }
    setLoading(false)
  }

  async function loadDayDetail(dateStr) {
    setDetailLoading(true)
    setSelectedDate(dateStr)
    try {
      const [workouts, sleep, nutrition, cardio, bodyStats] = await Promise.all([
        dbRead('workouts', { date: dateStr }),
        dbRead('sleep', { date: dateStr }),
        dbRead('nutrition', { date: dateStr }),
        dbRead('cardio', { date: dateStr }),
        dbRead('body_stats', { date: dateStr }),
      ])
      setDayDetail({ workouts, sleep, nutrition, cardio, bodyStats })
    } catch (err) {
      setDayDetail({ workouts: [], sleep: [], nutrition: [], cardio: [], bodyStats: [] })
    }
    setDetailLoading(false)
  }

  function shiftMonth(dir) {
    const d = new Date(currentMonth)
    d.setMonth(d.getMonth() + dir)
    setCurrentMonth(d)
    setSelectedDate(null)
    setDayDetail(null)
  }

  function openAdd(typeKey) {
    setAddType(typeKey)
    setShowAdd(true)
    setWf({ muscle_group: 'Push', title: '', description: '', feeling: '', duration_min: '' })
    setNf({ meal: 'Lunch', description: '', calories: '', protein: '', carbs: '', fat: '' })
    setSf({ duration: '', quality: 'good', bedtime: '', wake_time: '', rem_min: '', deep_min: '', core_min: '', awakenings: '', resting_hr: '', hrv: '', notes: '' })
    setCf({ activity: 'Walk', duration_min: '', distance: '', notes: '' })
    setBf({ weight: '', body_fat: '', notes: '' })
  }

  function notify(msg) { setToast(msg); setTimeout(() => setToast(null), 2500) }

  async function quickLogMeal(sm) {
    if (!selectedDate) return
    try {
      await logNutrition({
        date: selectedDate,
        meal: sm.meal_type || 'snack',
        description: sm.name,
        calories: sm.calories,
        protein_g: sm.protein_g,
        carbs_g: sm.carbs_g,
        fat_g: sm.fat_g,
      })
      if (sm.id) {
        await dbWrite('saved_meals', 'update', { use_count: (sm.use_count || 0) + 1 }, { id: sm.id })
      }
      notify(`${sm.name} logged`)
      setShowAdd(false)
      setAddType(null)
      await loadDayDetail(selectedDate)
      await loadMonthData()
      await loadSavedMeals()
    } catch { notify('Failed to log') }
  }

  async function handleSave() {
    if (!selectedDate || !addType) return
    setSaving(true)
    try {
      switch (addType) {
        case 'workout':
          if (!wf.muscle_group) break
          await dbWrite('workouts', 'insert', {
            date: selectedDate, muscle_group: wf.muscle_group,
            title: wf.title || `${wf.muscle_group} Day`,
            description: wf.description || '',
            feeling: wf.feeling || null,
            duration_min: parseInt(wf.duration_min) || null,
          })
          notify('Workout logged')
          break
        case 'nutrition':
          if (!nf.description) break
          await dbWrite('nutrition', 'insert', {
            date: selectedDate, meal: nf.meal.toLowerCase(),
            description: nf.description,
            calories: parseInt(nf.calories) || null,
            protein_g: parseInt(nf.protein) || null,
            carbs_g: parseInt(nf.carbs) || null,
            fat_g: parseInt(nf.fat) || null,
          })
          notify('Meal logged')
          break
        case 'sleep':
          if (!sf.duration) break
          await dbWrite('sleep', 'insert', {
            date: selectedDate,
            duration_hrs: parseFloat(sf.duration) || null,
            quality: sf.quality || null,
            bedtime: sf.bedtime || null,
            wake_time: sf.wake_time || null,
            rem_min: parseInt(sf.rem_min) || null,
            deep_min: parseInt(sf.deep_min) || null,
            core_min: parseInt(sf.core_min) || null,
            awakenings: parseInt(sf.awakenings) || null,
            resting_hr: parseInt(sf.resting_hr) || null,
            hrv: parseInt(sf.hrv) || null,
            notes: sf.notes || '',
          })
          notify('Sleep logged')
          break
        case 'cardio':
          if (!cf.activity) break
          await dbWrite('cardio', 'insert', {
            date: selectedDate, activity: cf.activity,
            duration_min: parseInt(cf.duration_min) || null,
            distance_miles: parseFloat(cf.distance) || null,
            notes: cf.notes || '',
          })
          notify('Cardio logged')
          break
        case 'body':
          if (!bf.weight) break
          await dbWrite('body_stats', 'insert', {
            date: selectedDate,
            weight_lbs: parseFloat(bf.weight) || null,
            body_fat_pct: parseFloat(bf.body_fat) || null,
            notes: bf.notes || '',
          })
          notify('Body stats logged')
          break
      }
      setShowAdd(false)
      setAddType(null)
      await loadDayDetail(selectedDate)
      await loadMonthData()
    } catch (err) { notify('Failed to save') }
    setSaving(false)
  }

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayStr = getLocalDate()
  const cells = []
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const selectedDateObj = selectedDate ? new Date(selectedDate + 'T12:00:00') : null
  const selectedLabel = selectedDateObj
    ? selectedDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : ''
  const activeLog = LOG_TYPES.find(t => t.key === addType)

  return (
    <Shell title="Calendar">
      <div style={s.page}>

        {toast && <div style={s.toast} className="animate-fadeIn"><span className="mono">{toast}</span></div>}

        {/* Month nav */}
        <div style={s.monthNav}>
          <button style={s.monthArrow} onClick={() => shiftMonth(-1)}>&lt;</button>
          <div style={s.monthCenter}><div style={s.monthName}>{MONTH_NAMES[month]} {year}</div></div>
          <button style={s.monthArrow} onClick={() => shiftMonth(1)}>&gt;</button>
        </div>

        {/* Day labels */}
        <div style={s.dayLabels}>
          {DAY_LABELS.map(d => <div key={d} style={s.dayLabel} className="mono">{d}</div>)}
        </div>

        {/* Grid */}
        <div style={s.grid}>
          {cells.map((day, i) => {
            if (day === null) return <div key={`e-${i}`} style={s.cellEmpty} />
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const data = monthData[dateStr] || {}
            const isToday = dateStr === todayStr
            const isSelected = dateStr === selectedDate
            const hasData = data.workout || data.sleep || data.nutrition || data.cardio || data.body
            return (
              <div key={dateStr} style={{ ...s.cell, ...(isToday ? s.cellToday : {}), ...(isSelected ? s.cellSelected : {}) }} onClick={() => loadDayDetail(dateStr)}>
                <div style={{ ...s.cellNum, color: isSelected ? '#fff' : isToday ? 'var(--cyan)' : hasData ? 'var(--text)' : 'var(--text3)' }}>{day}</div>
                {hasData && (
                  <div style={s.dots}>
                    {data.workout && <div style={{ ...s.dot, background: 'var(--cyan)' }} />}
                    {data.nutrition && <div style={{ ...s.dot, background: 'var(--orange)' }} />}
                    {data.sleep && <div style={{ ...s.dot, background: 'var(--teal)' }} />}
                    {data.cardio && <div style={{ ...s.dot, background: '#a78bfa' }} />}
                    {data.body && <div style={{ ...s.dot, background: 'var(--text2)' }} />}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div style={s.legend}>
          {LOG_TYPES.map(t => (
            <div key={t.key} style={s.legendItem}>
              <div style={{ ...s.legendDot, background: t.color }} />
              <span className="mono">{t.key === 'nutrition' ? 'Nutrition' : t.label}</span>
            </div>
          ))}
        </div>

        {/* Day detail */}
        {selectedDate && (
          <div style={s.detailPanel} className="animate-fadeIn">
            <div style={s.detailHeader}>
              <div style={s.detailDate}>{selectedLabel}</div>
              <button style={s.detailClose} onClick={() => { setSelectedDate(null); setDayDetail(null) }}>
                <span style={s.closeX1} /><span style={s.closeX2} />
              </button>
            </div>

            {detailLoading ? (
              <div style={s.detailLoading} className="mono">Loading...</div>
            ) : dayDetail && (
              <div style={s.detailContent}>
                <DetailSection title="Workout" color="var(--cyan)" items={dayDetail.workouts} empty="No workout" renderItem={(w) => (
                  <div style={s.dRow}>
                    <span style={s.dTitle}>{w.title || w.muscle_group}</span>
                    <span style={s.dMeta} className="mono">{[w.feeling, w.duration_min ? `${w.duration_min} min` : ''].filter(Boolean).join(' · ') || ''}</span>
                  </div>
                )} />
                <DetailSection title="Nutrition" color="var(--orange)" items={dayDetail.nutrition} empty="No meals" renderItem={(n) => (
                  <div style={s.dRow}>
                    <span style={s.dTitle}>{n.description || n.meal || 'Meal'}</span>
                    <span style={s.dMeta} className="mono">{n.calories || '--'} cal / {n.protein_g || '--'}g P / {n.carbs_g || '--'}g C / {n.fat_g || '--'}g F</span>
                  </div>
                )} />
                <DetailSection title="Sleep" color="var(--teal)" items={dayDetail.sleep} empty="No sleep" renderItem={(sl) => (
                  <div style={s.dRow}>
                    <span style={s.dTitle}>{sl.duration_hrs || sl.duration_hours}h — {sl.quality || '--'}</span>
                    <span style={s.dMeta} className="mono">
                      {[sl.deep_min ? `${sl.deep_min}m deep` : '', sl.rem_min ? `${sl.rem_min}m REM` : '', sl.bedtime ? `bed ${sl.bedtime}` : '', sl.resting_hr ? `HR ${sl.resting_hr}` : ''].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                )} />
                <DetailSection title="Cardio" color="#a78bfa" items={dayDetail.cardio} empty="No cardio" renderItem={(c) => (
                  <div style={s.dRow}>
                    <span style={s.dTitle}>{c.activity}</span>
                    <span style={s.dMeta} className="mono">{[c.duration_min ? `${c.duration_min} min` : '', c.distance_miles ? `${c.distance_miles} mi` : ''].filter(Boolean).join(' · ')}</span>
                  </div>
                )} />
                <DetailSection title="Body" color="var(--text2)" items={dayDetail.bodyStats} empty="No stats" renderItem={(b) => (
                  <div style={s.dRow}>
                    <span style={s.dTitle}>{b.weight_lbs ? `${b.weight_lbs} lbs` : '--'}</span>
                    <span style={s.dMeta} className="mono">{b.body_fat_pct ? `${b.body_fat_pct}% BF` : ''}</span>
                  </div>
                )} />

                {/* Add buttons */}
                <div style={s.addSection}>
                  <div style={s.addLabel} className="mono">Log data for this day</div>
                  <div style={s.addGrid}>
                    {LOG_TYPES.map(t => (
                      <button key={t.key} style={{ ...s.addTypeBtn, borderColor: t.border, background: t.dim, color: t.color }} onClick={() => openAdd(t.key)}>
                        + {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── LOG MODAL ── */}
        {showAdd && addType && (
          <div style={s.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) { setShowAdd(false); setAddType(null) } }}>
            <div style={s.modal} className="animate-fadeIn">
              <div style={s.modalHeader}>
                <div>
                  <span style={{ ...s.modalTitle, color: activeLog?.color }}>Log {activeLog?.label}</span>
                  <div className="mono" style={s.modalDate}>{selectedLabel}</div>
                </div>
                <button style={s.modalClose} onClick={() => { setShowAdd(false); setAddType(null) }}>
                  <span style={{ position: 'absolute', width: '14px', height: '1.5px', background: 'var(--text3)', transform: 'rotate(45deg)' }} />
                  <span style={{ position: 'absolute', width: '14px', height: '1.5px', background: 'var(--text3)', transform: 'rotate(-45deg)' }} />
                </button>
              </div>

              <div style={s.formBody}>

                {/* ── WORKOUT ── */}
                {addType === 'workout' && (<>
                  <div style={s.fl} className="mono">Type</div>
                  <div style={s.chipRow}>
                    {WORKOUT_TYPES.map(t => (
                      <button key={t} style={{ ...s.chip, ...(wf.muscle_group === t ? { background: 'var(--cyan-dim)', borderColor: 'var(--cyan-border)', color: 'var(--cyan)' } : {}) }} onClick={() => setWf(p => ({ ...p, muscle_group: t }))}>{t}</button>
                    ))}
                  </div>
                  <input style={s.input} placeholder="Title (optional)" value={wf.title} onChange={e => setWf(p => ({ ...p, title: e.target.value }))} />
                  <input style={s.input} placeholder="Description — exercises, notes" value={wf.description} onChange={e => setWf(p => ({ ...p, description: e.target.value }))} />
                  <div style={s.fRow}>
                    <div style={s.fHalf}>
                      <div style={s.fl} className="mono">Duration (min)</div>
                      <input style={s.input} className="mono" type="number" inputMode="numeric" placeholder="--" value={wf.duration_min} onChange={e => setWf(p => ({ ...p, duration_min: e.target.value }))} />
                    </div>
                    <div style={s.fHalf}>
                      <div style={s.fl} className="mono">Feeling</div>
                      <div style={s.chipRow}>
                        {FEELINGS.map(f => (
                          <button key={f} style={{ ...s.chipSm, ...(wf.feeling === f ? { background: 'var(--cyan-dim)', borderColor: 'var(--cyan-border)', color: 'var(--cyan)' } : {}) }} onClick={() => setWf(p => ({ ...p, feeling: f }))}>{f}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>)}

                {/* ── NUTRITION ── */}
                {addType === 'nutrition' && (<>
                  {/* Quick meals */}
                  {savedMeals.length > 0 && (
                    <>
                      <div style={s.fl} className="mono">Quick add</div>
                      <div style={s.quickGrid}>
                        {savedMeals.map(sm => (
                          <div key={sm.id} style={s.quickCard} onClick={() => quickLogMeal(sm)}>
                            <div style={s.quickName}>{sm.name}</div>
                            <div style={s.quickMacro} className="mono">
                              <span style={{ color: 'var(--orange)' }}>{sm.calories || '--'}</span> cal · <span style={{ color: 'var(--cyan)' }}>{sm.protein_g || '--'}</span>g P
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={s.divider} />
                    </>
                  )}

                  <div style={s.fl} className="mono">Or log manually</div>
                  <div style={s.chipRow}>
                    {MEAL_TYPES.map(t => (
                      <button key={t} style={{ ...s.chip, ...(nf.meal === t ? { background: 'var(--orange-dim)', borderColor: 'var(--orange-border)', color: 'var(--orange)' } : {}) }} onClick={() => setNf(p => ({ ...p, meal: t }))}>{t}</button>
                    ))}
                  </div>
                  <input style={s.input} placeholder="What did you eat?" value={nf.description} onChange={e => setNf(p => ({ ...p, description: e.target.value }))} />
                  <div style={s.macroGrid}>
                    <div style={s.macroWrap}>
                      <div style={s.flSm} className="mono">Cal</div>
                      <input style={s.inputSm} className="mono" type="number" inputMode="numeric" placeholder="--" value={nf.calories} onChange={e => setNf(p => ({ ...p, calories: e.target.value }))} />
                    </div>
                    <div style={s.macroWrap}>
                      <div style={s.flSm} className="mono">Protein</div>
                      <input style={s.inputSm} className="mono" type="number" inputMode="numeric" placeholder="--" value={nf.protein} onChange={e => setNf(p => ({ ...p, protein: e.target.value }))} />
                    </div>
                    <div style={s.macroWrap}>
                      <div style={s.flSm} className="mono">Carbs</div>
                      <input style={s.inputSm} className="mono" type="number" inputMode="numeric" placeholder="--" value={nf.carbs} onChange={e => setNf(p => ({ ...p, carbs: e.target.value }))} />
                    </div>
                    <div style={s.macroWrap}>
                      <div style={s.flSm} className="mono">Fat</div>
                      <input style={s.inputSm} className="mono" type="number" inputMode="numeric" placeholder="--" value={nf.fat} onChange={e => setNf(p => ({ ...p, fat: e.target.value }))} />
                    </div>
                  </div>
                </>)}

                {/* ── SLEEP ── */}
                {addType === 'sleep' && (<>
                  <div style={s.fRow}>
                    <div style={s.fHalf}>
                      <div style={s.fl} className="mono">Hours slept</div>
                      <input style={s.input} className="mono" type="number" inputMode="decimal" step="0.5" placeholder="7.5" value={sf.duration} onChange={e => setSf(p => ({ ...p, duration: e.target.value }))} />
                    </div>
                    <div style={s.fHalf}>
                      <div style={s.fl} className="mono">Quality</div>
                      <div style={s.chipRow}>
                        {SLEEP_QUALITY.map(q => (
                          <button key={q.key} style={{ ...s.chipSm, ...(sf.quality === q.key ? { background: `${q.color}15`, borderColor: `${q.color}40`, color: q.color } : {}) }} onClick={() => setSf(p => ({ ...p, quality: q.key }))}>{q.label}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={s.fRow}>
                    <div style={s.fHalf}>
                      <div style={s.fl} className="mono">Bedtime</div>
                      <input style={s.input} className="mono" type="time" value={sf.bedtime} onChange={e => setSf(p => ({ ...p, bedtime: e.target.value }))} />
                    </div>
                    <div style={s.fHalf}>
                      <div style={s.fl} className="mono">Wake time</div>
                      <input style={s.input} className="mono" type="time" value={sf.wake_time} onChange={e => setSf(p => ({ ...p, wake_time: e.target.value }))} />
                    </div>
                  </div>
                  <div style={s.fl} className="mono">Sleep stages (minutes)</div>
                  <div style={s.macroGrid}>
                    <div style={s.macroWrap}>
                      <div style={{ ...s.flSm, color: '#6366f1' }} className="mono">Deep</div>
                      <input style={s.inputSm} className="mono" type="number" inputMode="numeric" placeholder="--" value={sf.deep_min} onChange={e => setSf(p => ({ ...p, deep_min: e.target.value }))} />
                    </div>
                    <div style={s.macroWrap}>
                      <div style={{ ...s.flSm, color: 'var(--cyan)' }} className="mono">Core</div>
                      <input style={s.inputSm} className="mono" type="number" inputMode="numeric" placeholder="--" value={sf.core_min} onChange={e => setSf(p => ({ ...p, core_min: e.target.value }))} />
                    </div>
                    <div style={s.macroWrap}>
                      <div style={{ ...s.flSm, color: 'var(--teal)' }} className="mono">REM</div>
                      <input style={s.inputSm} className="mono" type="number" inputMode="numeric" placeholder="--" value={sf.rem_min} onChange={e => setSf(p => ({ ...p, rem_min: e.target.value }))} />
                    </div>
                    <div style={s.macroWrap}>
                      <div style={s.flSm} className="mono">Wakes</div>
                      <input style={s.inputSm} className="mono" type="number" inputMode="numeric" placeholder="--" value={sf.awakenings} onChange={e => setSf(p => ({ ...p, awakenings: e.target.value }))} />
                    </div>
                  </div>
                  <div style={s.fl} className="mono">Vitals (optional)</div>
                  <div style={s.fRow}>
                    <div style={s.fHalf}>
                      <div style={{ ...s.flSm, color: 'var(--red)' }} className="mono">Resting HR</div>
                      <input style={s.input} className="mono" type="number" inputMode="numeric" placeholder="--" value={sf.resting_hr} onChange={e => setSf(p => ({ ...p, resting_hr: e.target.value }))} />
                    </div>
                    <div style={s.fHalf}>
                      <div style={{ ...s.flSm, color: 'var(--teal)' }} className="mono">HRV</div>
                      <input style={s.input} className="mono" type="number" inputMode="numeric" placeholder="--" value={sf.hrv} onChange={e => setSf(p => ({ ...p, hrv: e.target.value }))} />
                    </div>
                  </div>
                  <input style={s.input} placeholder="Notes (optional)" value={sf.notes} onChange={e => setSf(p => ({ ...p, notes: e.target.value }))} />
                </>)}

                {/* ── CARDIO ── */}
                {addType === 'cardio' && (<>
                  <div style={s.fl} className="mono">Activity</div>
                  <div style={s.chipRow}>
                    {CARDIO_TYPES.map(a => (
                      <button key={a} style={{ ...s.chip, ...(cf.activity === a ? { background: 'rgba(167,139,250,0.08)', borderColor: 'rgba(167,139,250,0.2)', color: '#a78bfa' } : {}) }} onClick={() => setCf(p => ({ ...p, activity: a }))}>{a}</button>
                    ))}
                  </div>
                  <div style={s.fRow}>
                    <div style={s.fHalf}>
                      <div style={s.fl} className="mono">Duration (min)</div>
                      <input style={s.input} className="mono" type="number" inputMode="numeric" placeholder="--" value={cf.duration_min} onChange={e => setCf(p => ({ ...p, duration_min: e.target.value }))} />
                    </div>
                    <div style={s.fHalf}>
                      <div style={s.fl} className="mono">Distance (mi)</div>
                      <input style={s.input} className="mono" type="number" inputMode="decimal" placeholder="--" value={cf.distance} onChange={e => setCf(p => ({ ...p, distance: e.target.value }))} />
                    </div>
                  </div>
                  <input style={s.input} placeholder="Notes (optional)" value={cf.notes} onChange={e => setCf(p => ({ ...p, notes: e.target.value }))} />
                </>)}

                {/* ── BODY ── */}
                {addType === 'body' && (<>
                  <div style={s.fRow}>
                    <div style={s.fHalf}>
                      <div style={s.fl} className="mono">Weight (lbs)</div>
                      <input style={s.input} className="mono" type="number" inputMode="decimal" placeholder="--" value={bf.weight} onChange={e => setBf(p => ({ ...p, weight: e.target.value }))} />
                    </div>
                    <div style={s.fHalf}>
                      <div style={s.fl} className="mono">Body fat %</div>
                      <input style={s.input} className="mono" type="number" inputMode="decimal" placeholder="--" value={bf.body_fat} onChange={e => setBf(p => ({ ...p, body_fat: e.target.value }))} />
                    </div>
                  </div>
                  <input style={s.input} placeholder="Notes (optional)" value={bf.notes} onChange={e => setBf(p => ({ ...p, notes: e.target.value }))} />
                </>)}

                {/* Save — skip for nutrition quick add (handled inline) */}
                {!(addType === 'nutrition' && !nf.description) && (
                  <button style={{ ...s.saveBtn, borderColor: activeLog?.border, background: `linear-gradient(135deg, ${activeLog?.dim}, transparent)`, color: activeLog?.color, opacity: saving ? 0.5 : 1 }} onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : `Log ${activeLog?.label}`}
                  </button>
                )}
                {addType === 'nutrition' && !nf.description && savedMeals.length > 0 && (
                  <div className="mono" style={{ fontSize: '0.48rem', color: 'var(--text3)', textAlign: 'center', letterSpacing: '0.04em', opacity: 0.6 }}>
                    Tap a quick meal above or type a description to log manually
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
      <NomisChat pageContext={selectedDate ? `Calendar: viewing ${selectedDate}` : 'Calendar view'} />
    </Shell>
  )
}

function DetailSection({ title, color, items, empty, renderItem }) {
  return (
    <div style={s.detailSection}>
      <div style={s.dSecHeader}>
        <div style={{ ...s.dAccent, background: color }} />
        <span style={{ ...s.dSecTitle, color }} className="mono">{title}</span>
        <span style={s.dSecCount} className="mono">{items.length || 0}</span>
      </div>
      {items.length === 0
        ? <div style={s.dEmpty} className="mono">{empty}</div>
        : items.map((item, i) => <div key={i}>{renderItem(item)}</div>)
      }
    </div>
  )
}

const s = {
  page: { padding: '8px 0 40px' },
  toast: { position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 600, background: 'rgba(45,212,191,0.1)', border: '1px solid var(--teal-border)', borderRadius: '12px', padding: '10px 20px', fontSize: '0.6rem', color: 'var(--teal)', letterSpacing: '0.06em', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' },

  monthNav: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', padding: '20px 24px 24px' },
  monthArrow: { width: '30px', height: '30px', borderRadius: '8px', background: 'var(--bg2)', border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'var(--font-body)', boxShadow: '0 1px 4px rgba(0,0,0,0.12)' },
  monthCenter: { textAlign: 'center', minWidth: '160px' },
  monthName: { fontSize: '1.15rem', fontWeight: '600', color: '#fff', letterSpacing: '-0.01em' },

  dayLabels: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '0 24px', marginBottom: '8px' },
  dayLabel: { textAlign: 'center', fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase' },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', padding: '0 24px', marginBottom: '20px' },
  cellEmpty: { aspectRatio: '1', borderRadius: '8px' },
  cell: { aspectRatio: '1', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer', transition: 'all 0.15s', background: 'transparent', border: '1px solid transparent' },
  cellToday: { background: 'var(--cyan-dim)', border: '1px solid var(--cyan-border)' },
  cellSelected: { background: 'rgba(34,211,238,0.15)', border: '1px solid rgba(34,211,238,0.3)' },
  cellNum: { fontSize: '0.82rem', fontWeight: '500', lineHeight: 1 },
  dots: { display: 'flex', gap: '2px', alignItems: 'center' },
  dot: { width: '4px', height: '4px', borderRadius: '50%' },

  legend: { display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '12px', padding: '0 24px 24px' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.06em' },
  legendDot: { width: '5px', height: '5px', borderRadius: '50%' },

  detailPanel: { margin: '0 24px', background: 'rgba(38,42,51,0.75)', border: '1px solid var(--border)', borderRadius: '16px', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: '0 4px 20px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.02) inset', overflow: 'hidden' },
  detailHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', borderBottom: '1px solid var(--border)' },
  detailDate: { fontSize: '0.95rem', fontWeight: '600', color: '#fff' },
  detailClose: { width: '28px', height: '28px', borderRadius: '7px', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' },
  closeX1: { position: 'absolute', width: '14px', height: '1.5px', background: 'var(--text3)', borderRadius: '1px', transform: 'rotate(45deg)' },
  closeX2: { position: 'absolute', width: '14px', height: '1.5px', background: 'var(--text3)', borderRadius: '1px', transform: 'rotate(-45deg)' },
  detailLoading: { padding: '32px', textAlign: 'center', fontSize: '0.55rem', color: 'var(--text3)', letterSpacing: '0.1em' },
  detailContent: { padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: '16px' },

  detailSection: { display: 'flex', flexDirection: 'column', gap: '8px' },
  dSecHeader: { display: 'flex', alignItems: 'center', gap: '8px' },
  dAccent: { width: '3px', height: '14px', borderRadius: '2px' },
  dSecTitle: { fontSize: '0.52rem', letterSpacing: '0.1em', textTransform: 'uppercase' },
  dSecCount: { fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.06em', marginLeft: 'auto' },
  dEmpty: { fontSize: '0.55rem', color: 'var(--text3)', letterSpacing: '0.04em', padding: '4px 0 4px 11px', opacity: 0.6 },
  dRow: { padding: '8px 0 8px 11px', borderBottom: '1px solid var(--border)' },
  dTitle: { fontSize: '0.85rem', fontWeight: '500', color: 'var(--text)', display: 'block' },
  dMeta: { fontSize: '0.5rem', color: 'var(--text3)', letterSpacing: '0.04em', marginTop: '3px', display: 'block' },

  addSection: { borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '4px' },
  addLabel: { fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' },
  addGrid: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
  addTypeBtn: { padding: '8px 14px', borderRadius: '8px', border: '1px solid', fontSize: '0.68rem', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s' },

  // Modal
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  modal: { width: '100%', maxWidth: '480px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '20px 20px 0 0', maxHeight: '85vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 20px 12px' },
  modalTitle: { fontSize: '1rem', fontWeight: '700' },
  modalDate: { fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.06em', marginTop: '4px' },
  modalClose: { width: '28px', height: '28px', borderRadius: '7px', background: 'transparent', border: 'none', position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  // Form
  formBody: { padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' },
  fl: { fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '-4px' },
  flSm: { fontSize: '0.42rem', color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center', marginBottom: '4px' },
  fRow: { display: 'flex', gap: '10px' },
  fHalf: { flex: 1 },
  input: { width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border2)', background: 'var(--bg3)', color: 'var(--text)', fontSize: '0.88rem', fontFamily: 'var(--font-body)', outline: 'none' },
  inputSm: { width: '100%', padding: '10px 8px', borderRadius: '8px', border: '1px solid var(--border2)', background: 'var(--bg3)', color: 'var(--text)', fontSize: '0.82rem', textAlign: 'center', outline: 'none', fontFamily: 'var(--font-mono)' },
  macroGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' },
  macroWrap: { display: 'flex', flexDirection: 'column' },
  chipRow: { display: 'flex', flexWrap: 'wrap', gap: '5px' },
  chip: { padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text3)', fontSize: '0.72rem', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s' },
  chipSm: { padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text3)', fontSize: '0.6rem', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s' },
  divider: { height: '1px', background: 'var(--border)', margin: '4px 0' },

  // Quick meals in calendar
  quickGrid: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
  quickCard: { padding: '8px 12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s', flex: '0 0 calc(50% - 3px)' },
  quickName: { fontSize: '0.78rem', fontWeight: '600', color: 'var(--text)', marginBottom: '3px' },
  quickMacro: { fontSize: '0.45rem', color: 'var(--text3)', letterSpacing: '0.03em' },

  saveBtn: { width: '100%', padding: '15px', marginTop: '4px', borderRadius: '12px', border: '1px solid', fontFamily: 'var(--font-body)', fontSize: '0.88rem', fontWeight: '600', cursor: 'pointer', transition: 'opacity 0.15s' },
}