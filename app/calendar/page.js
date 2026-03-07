'use client'
import { useState, useEffect } from 'react'
import Shell from '../../components/Shell'
import NomisChat from '../../components/NomisChat'
import { dbRead, dbWrite } from '../../lib/api'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const LOG_TYPES = [
  { key: 'workout',   label: 'Workout',   color: 'var(--cyan)',   colorDim: 'var(--cyan-dim)',   colorBorder: 'var(--cyan-border)' },
  { key: 'nutrition', label: 'Meal',      color: 'var(--orange)', colorDim: 'var(--orange-dim)', colorBorder: 'var(--orange-border)' },
  { key: 'sleep',     label: 'Sleep',     color: 'var(--teal)',   colorDim: 'var(--teal-dim)',   colorBorder: 'var(--teal-border)' },
  { key: 'cardio',    label: 'Cardio',    color: '#a78bfa',       colorDim: 'rgba(167,139,250,0.08)', colorBorder: 'rgba(167,139,250,0.2)' },
  { key: 'body',      label: 'Body Stats', color: 'var(--text2)', colorDim: 'rgba(145,152,165,0.08)', colorBorder: 'rgba(145,152,165,0.2)' },
]
const WORKOUT_TYPES = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body', 'Cardio']
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack']
const SLEEP_QUALITY = ['great', 'good', 'okay', 'poor', 'bad']

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [monthData, setMonthData]       = useState({})
  const [dayDetail, setDayDetail]       = useState(null)
  const [loading, setLoading]           = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)

  // Add modal
  const [showAdd, setShowAdd]         = useState(false)
  const [addType, setAddType]         = useState(null)
  const [saving, setSaving]           = useState(false)
  const [saveToast, setSaveToast]     = useState(null)

  // Form states
  const [workoutForm, setWorkoutForm] = useState({ muscle_group: 'Push', title: '', description: '', feeling: '', duration_min: '' })
  const [mealForm, setMealForm]       = useState({ meal: 'Lunch', description: '', calories: '', protein: '', carbs: '', fat: '' })
  const [sleepForm, setSleepForm]     = useState({ duration: '', quality: 'good', notes: '' })
  const [cardioForm, setCardioForm]   = useState({ activity: 'Walk', duration_min: '', distance: '', notes: '' })
  const [bodyForm, setBodyForm]       = useState({ weight: '', body_fat: '', notes: '' })

  useEffect(() => { loadMonthData() }, [currentMonth])

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
    } catch (err) {
      console.error('Calendar load error:', err)
    }
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
      console.error('Day detail error:', err)
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

  function openAddModal(typeKey) {
    setAddType(typeKey)
    setShowAdd(true)
    // Reset forms
    setWorkoutForm({ muscle_group: 'Push', title: '', description: '', feeling: '', duration_min: '' })
    setMealForm({ meal: 'Lunch', description: '', calories: '', protein: '', carbs: '', fat: '' })
    setSleepForm({ duration: '', quality: 'good', notes: '' })
    setCardioForm({ activity: 'Walk', duration_min: '', distance: '', notes: '' })
    setBodyForm({ weight: '', body_fat: '', notes: '' })
  }

  function showToast(msg) {
    setSaveToast(msg)
    setTimeout(() => setSaveToast(null), 2500)
  }

  async function handleSave() {
    if (!selectedDate || !addType) return
    setSaving(true)

    try {
      switch (addType) {
        case 'workout':
          if (!workoutForm.muscle_group) break
          await dbWrite('workouts', 'insert', {
            date: selectedDate,
            muscle_group: workoutForm.muscle_group,
            title: workoutForm.title || `${workoutForm.muscle_group} Day`,
            description: workoutForm.description || '',
            feeling: workoutForm.feeling || null,
            duration_min: parseInt(workoutForm.duration_min) || null,
          })
          showToast('Workout logged')
          break

        case 'nutrition':
          if (!mealForm.description) break
          await dbWrite('nutrition', 'insert', {
            date: selectedDate,
            meal: mealForm.meal.toLowerCase(),
            description: mealForm.description,
            calories: parseInt(mealForm.calories) || null,
            protein_g: parseInt(mealForm.protein) || null,
            carbs_g: parseInt(mealForm.carbs) || null,
            fat_g: parseInt(mealForm.fat) || null,
          })
          showToast('Meal logged')
          break

        case 'sleep':
          if (!sleepForm.duration) break
          await dbWrite('sleep', 'insert', {
            date: selectedDate,
            duration_hrs: parseFloat(sleepForm.duration) || null,
            quality: sleepForm.quality || null,
            notes: sleepForm.notes || '',
          })
          showToast('Sleep logged')
          break

        case 'cardio':
          if (!cardioForm.activity) break
          await dbWrite('cardio', 'insert', {
            date: selectedDate,
            activity: cardioForm.activity,
            duration_min: parseInt(cardioForm.duration_min) || null,
            distance_miles: parseFloat(cardioForm.distance) || null,
            notes: cardioForm.notes || '',
          })
          showToast('Cardio logged')
          break

        case 'body':
          if (!bodyForm.weight) break
          await dbWrite('body_stats', 'insert', {
            date: selectedDate,
            weight_lbs: parseFloat(bodyForm.weight) || null,
            body_fat_pct: parseFloat(bodyForm.body_fat) || null,
            notes: bodyForm.notes || '',
          })
          showToast('Body stats logged')
          break
      }

      setShowAdd(false)
      setAddType(null)
      await loadDayDetail(selectedDate)
      await loadMonthData()
    } catch (err) {
      console.error('Save error:', err)
      showToast('Failed to save')
    }
    setSaving(false)
  }

  // Build calendar grid
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayStr = new Date().toISOString().split('T')[0]

  const cells = []
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const selectedDateObj = selectedDate ? new Date(selectedDate + 'T12:00:00') : null
  const selectedLabel = selectedDateObj
    ? selectedDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : ''

  const activeLogType = LOG_TYPES.find(t => t.key === addType)

  return (
    <Shell title="Calendar">
      <div style={s.page}>

        {/* Save toast */}
        {saveToast && (
          <div style={s.toast} className="animate-fadeIn">
            <span className="mono">{saveToast}</span>
          </div>
        )}

        {/* Month nav */}
        <div style={s.monthNav}>
          <button style={s.monthArrow} onClick={() => shiftMonth(-1)}>&lt;</button>
          <div style={s.monthCenter}>
            <div style={s.monthName}>{MONTH_NAMES[month]} {year}</div>
          </div>
          <button style={s.monthArrow} onClick={() => shiftMonth(1)}>&gt;</button>
        </div>

        {/* Day labels */}
        <div style={s.dayLabels}>
          {DAY_LABELS.map(d => (
            <div key={d} style={s.dayLabel} className="mono">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={s.grid}>
          {cells.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} style={s.cellEmpty} />

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const data = monthData[dateStr] || {}
            const isToday = dateStr === todayStr
            const isSelected = dateStr === selectedDate
            const hasData = data.workout || data.sleep || data.nutrition || data.cardio || data.body

            return (
              <div
                key={dateStr}
                style={{
                  ...s.cell,
                  ...(isToday ? s.cellToday : {}),
                  ...(isSelected ? s.cellSelected : {}),
                }}
                onClick={() => loadDayDetail(dateStr)}
              >
                <div style={{
                  ...s.cellNum,
                  color: isSelected ? '#fff' : isToday ? 'var(--cyan)' : hasData ? 'var(--text)' : 'var(--text3)',
                }}>{day}</div>
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
          <div style={s.legendItem}><div style={{ ...s.legendDot, background: 'var(--cyan)' }} /><span className="mono">Workout</span></div>
          <div style={s.legendItem}><div style={{ ...s.legendDot, background: 'var(--orange)' }} /><span className="mono">Nutrition</span></div>
          <div style={s.legendItem}><div style={{ ...s.legendDot, background: 'var(--teal)' }} /><span className="mono">Sleep</span></div>
          <div style={s.legendItem}><div style={{ ...s.legendDot, background: '#a78bfa' }} /><span className="mono">Cardio</span></div>
          <div style={s.legendItem}><div style={{ ...s.legendDot, background: 'var(--text2)' }} /><span className="mono">Body</span></div>
        </div>

        {/* Day detail panel */}
        {selectedDate && (
          <div style={s.detailPanel} className="animate-fadeIn">
            <div style={s.detailHeader}>
              <div style={s.detailDate}>{selectedLabel}</div>
              <button style={s.detailClose} onClick={() => { setSelectedDate(null); setDayDetail(null) }}>
                <span style={s.closeX1} />
                <span style={s.closeX2} />
              </button>
            </div>

            {detailLoading ? (
              <div style={s.detailLoading} className="mono">Loading...</div>
            ) : dayDetail && (
              <div style={s.detailContent}>

                {/* Workouts */}
                <DetailSection
                  title="Workout"
                  color="var(--cyan)"
                  items={dayDetail.workouts}
                  empty="No workout logged"
                  renderItem={(w) => (
                    <div style={s.detailRow}>
                      <span style={s.detailRowTitle}>{w.title || w.muscle_group}</span>
                      <span style={s.detailRowMeta} className="mono">
                        {w.feeling && w.feeling}{w.duration_min ? ` / ${w.duration_min} min` : ''}
                      </span>
                    </div>
                  )}
                />

                {/* Nutrition */}
                <DetailSection
                  title="Nutrition"
                  color="var(--orange)"
                  items={dayDetail.nutrition}
                  empty="No meals logged"
                  renderItem={(n) => {
                    const cals = n.calories || '--'
                    const pro = n.protein_g || '--'
                    return (
                      <div style={s.detailRow}>
                        <span style={s.detailRowTitle}>{n.description || n.meal || 'Meal'}</span>
                        <span style={s.detailRowMeta} className="mono">{cals} cal / {pro}g protein</span>
                      </div>
                    )
                  }}
                />

                {/* Sleep */}
                <DetailSection
                  title="Sleep"
                  color="var(--teal)"
                  items={dayDetail.sleep}
                  empty="No sleep logged"
                  renderItem={(sl) => (
                    <div style={s.detailRow}>
                      <span style={s.detailRowTitle}>{sl.duration_hrs || sl.duration_hours}h</span>
                      <span style={s.detailRowMeta} className="mono">Quality: {sl.quality || '--'}</span>
                    </div>
                  )}
                />

                {/* Cardio */}
                <DetailSection
                  title="Cardio"
                  color="#a78bfa"
                  items={dayDetail.cardio}
                  empty="No cardio logged"
                  renderItem={(c) => (
                    <div style={s.detailRow}>
                      <span style={s.detailRowTitle}>{c.activity}</span>
                      <span style={s.detailRowMeta} className="mono">
                        {c.duration_min ? `${c.duration_min} min` : ''}{c.distance_miles ? ` / ${c.distance_miles} mi` : ''}
                      </span>
                    </div>
                  )}
                />

                {/* Body stats */}
                <DetailSection
                  title="Body"
                  color="var(--text2)"
                  items={dayDetail.bodyStats}
                  empty="No stats logged"
                  renderItem={(b) => (
                    <div style={s.detailRow}>
                      <span style={s.detailRowTitle}>{b.weight_lbs ? `${b.weight_lbs} lbs` : '--'}</span>
                      <span style={s.detailRowMeta} className="mono">{b.body_fat_pct ? `${b.body_fat_pct}% BF` : ''}</span>
                    </div>
                  )}
                />

                {/* Add data buttons */}
                <div style={s.addSection}>
                  <div style={s.addLabel} className="mono">Log data for this day</div>
                  <div style={s.addGrid}>
                    {LOG_TYPES.map(t => (
                      <button
                        key={t.key}
                        style={{
                          ...s.addTypeBtn,
                          borderColor: t.colorBorder,
                          background: t.colorDim,
                          color: t.color,
                        }}
                        onClick={() => openAddModal(t.key)}
                      >
                        + {t.label}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* ── Add Data Modal ── */}
        {showAdd && addType && (
          <div style={s.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) { setShowAdd(false); setAddType(null) } }}>
            <div style={s.modal} className="animate-fadeIn">
              <div style={s.modalHeader}>
                <div>
                  <span style={{ ...s.modalTitle, color: activeLogType?.color }}>Log {activeLogType?.label}</span>
                  <div className="mono" style={s.modalDate}>{selectedLabel}</div>
                </div>
                <button style={s.modalClose} onClick={() => { setShowAdd(false); setAddType(null) }}>
                  <span style={{ position: 'absolute', width: '14px', height: '1.5px', background: 'var(--text3)', transform: 'rotate(45deg)' }} />
                  <span style={{ position: 'absolute', width: '14px', height: '1.5px', background: 'var(--text3)', transform: 'rotate(-45deg)' }} />
                </button>
              </div>

              <div style={s.formBody}>

                {/* ── Workout form ── */}
                {addType === 'workout' && (
                  <>
                    <div style={s.formLabel} className="mono">Type</div>
                    <div style={s.chipRow}>
                      {WORKOUT_TYPES.map(t => (
                        <button key={t} style={{
                          ...s.chip,
                          ...(workoutForm.muscle_group === t ? { background: 'var(--cyan-dim)', borderColor: 'var(--cyan-border)', color: 'var(--cyan)' } : {}),
                        }} onClick={() => setWorkoutForm(p => ({ ...p, muscle_group: t }))}>{t}</button>
                      ))}
                    </div>
                    <input style={s.input} placeholder="Title (optional)" value={workoutForm.title} onChange={e => setWorkoutForm(p => ({ ...p, title: e.target.value }))} />
                    <input style={s.input} placeholder="Description — exercises, notes" value={workoutForm.description} onChange={e => setWorkoutForm(p => ({ ...p, description: e.target.value }))} />
                    <div style={s.inputRow}>
                      <div style={s.inputHalf}>
                        <div style={s.formLabel} className="mono">Duration (min)</div>
                        <input style={s.input} className="mono" type="number" inputMode="numeric" placeholder="--" value={workoutForm.duration_min} onChange={e => setWorkoutForm(p => ({ ...p, duration_min: e.target.value }))} />
                      </div>
                      <div style={s.inputHalf}>
                        <div style={s.formLabel} className="mono">Feeling</div>
                        <div style={s.chipRow}>
                          {['great','good','okay','rough'].map(f => (
                            <button key={f} style={{
                              ...s.chipSm,
                              ...(workoutForm.feeling === f ? { background: 'var(--cyan-dim)', borderColor: 'var(--cyan-border)', color: 'var(--cyan)' } : {}),
                            }} onClick={() => setWorkoutForm(p => ({ ...p, feeling: f }))}>{f}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* ── Meal form ── */}
                {addType === 'nutrition' && (
                  <>
                    <div style={s.formLabel} className="mono">Meal</div>
                    <div style={s.chipRow}>
                      {MEAL_TYPES.map(t => (
                        <button key={t} style={{
                          ...s.chip,
                          ...(mealForm.meal === t ? { background: 'var(--orange-dim)', borderColor: 'var(--orange-border)', color: 'var(--orange)' } : {}),
                        }} onClick={() => setMealForm(p => ({ ...p, meal: t }))}>{t}</button>
                      ))}
                    </div>
                    <input style={s.input} placeholder="What did you eat?" value={mealForm.description} onChange={e => setMealForm(p => ({ ...p, description: e.target.value }))} />
                    <div style={s.macroGrid}>
                      <div style={s.macroWrap}>
                        <div style={s.formLabelSm} className="mono">Cal</div>
                        <input style={s.inputSm} className="mono" type="number" inputMode="numeric" placeholder="--" value={mealForm.calories} onChange={e => setMealForm(p => ({ ...p, calories: e.target.value }))} />
                      </div>
                      <div style={s.macroWrap}>
                        <div style={s.formLabelSm} className="mono">Protein</div>
                        <input style={s.inputSm} className="mono" type="number" inputMode="numeric" placeholder="--" value={mealForm.protein} onChange={e => setMealForm(p => ({ ...p, protein: e.target.value }))} />
                      </div>
                      <div style={s.macroWrap}>
                        <div style={s.formLabelSm} className="mono">Carbs</div>
                        <input style={s.inputSm} className="mono" type="number" inputMode="numeric" placeholder="--" value={mealForm.carbs} onChange={e => setMealForm(p => ({ ...p, carbs: e.target.value }))} />
                      </div>
                      <div style={s.macroWrap}>
                        <div style={s.formLabelSm} className="mono">Fat</div>
                        <input style={s.inputSm} className="mono" type="number" inputMode="numeric" placeholder="--" value={mealForm.fat} onChange={e => setMealForm(p => ({ ...p, fat: e.target.value }))} />
                      </div>
                    </div>
                  </>
                )}

                {/* ── Sleep form ── */}
                {addType === 'sleep' && (
                  <>
                    <div style={s.formLabel} className="mono">Duration (hours)</div>
                    <input style={s.input} className="mono" type="number" inputMode="decimal" step="0.5" placeholder="7.5" value={sleepForm.duration} onChange={e => setSleepForm(p => ({ ...p, duration: e.target.value }))} />
                    <div style={s.formLabel} className="mono">Quality</div>
                    <div style={s.chipRow}>
                      {SLEEP_QUALITY.map(q => (
                        <button key={q} style={{
                          ...s.chip,
                          ...(sleepForm.quality === q ? { background: 'var(--teal-dim)', borderColor: 'var(--teal-border)', color: 'var(--teal)' } : {}),
                        }} onClick={() => setSleepForm(p => ({ ...p, quality: q }))}>{q}</button>
                      ))}
                    </div>
                    <input style={s.input} placeholder="Notes (optional)" value={sleepForm.notes} onChange={e => setSleepForm(p => ({ ...p, notes: e.target.value }))} />
                  </>
                )}

                {/* ── Cardio form ── */}
                {addType === 'cardio' && (
                  <>
                    <div style={s.formLabel} className="mono">Activity</div>
                    <div style={s.chipRow}>
                      {['Walk', 'Run', 'Bike', 'Swim', 'Hike', 'Row', 'Other'].map(a => (
                        <button key={a} style={{
                          ...s.chip,
                          ...(cardioForm.activity === a ? { background: 'rgba(167,139,250,0.08)', borderColor: 'rgba(167,139,250,0.2)', color: '#a78bfa' } : {}),
                        }} onClick={() => setCardioForm(p => ({ ...p, activity: a }))}>{a}</button>
                      ))}
                    </div>
                    <div style={s.inputRow}>
                      <div style={s.inputHalf}>
                        <div style={s.formLabel} className="mono">Duration (min)</div>
                        <input style={s.input} className="mono" type="number" inputMode="numeric" placeholder="--" value={cardioForm.duration_min} onChange={e => setCardioForm(p => ({ ...p, duration_min: e.target.value }))} />
                      </div>
                      <div style={s.inputHalf}>
                        <div style={s.formLabel} className="mono">Distance (mi)</div>
                        <input style={s.input} className="mono" type="number" inputMode="decimal" placeholder="--" value={cardioForm.distance} onChange={e => setCardioForm(p => ({ ...p, distance: e.target.value }))} />
                      </div>
                    </div>
                    <input style={s.input} placeholder="Notes (optional)" value={cardioForm.notes} onChange={e => setCardioForm(p => ({ ...p, notes: e.target.value }))} />
                  </>
                )}

                {/* ── Body stats form ── */}
                {addType === 'body' && (
                  <>
                    <div style={s.inputRow}>
                      <div style={s.inputHalf}>
                        <div style={s.formLabel} className="mono">Weight (lbs)</div>
                        <input style={s.input} className="mono" type="number" inputMode="decimal" placeholder="--" value={bodyForm.weight} onChange={e => setBodyForm(p => ({ ...p, weight: e.target.value }))} />
                      </div>
                      <div style={s.inputHalf}>
                        <div style={s.formLabel} className="mono">Body fat %</div>
                        <input style={s.input} className="mono" type="number" inputMode="decimal" placeholder="--" value={bodyForm.body_fat} onChange={e => setBodyForm(p => ({ ...p, body_fat: e.target.value }))} />
                      </div>
                    </div>
                    <input style={s.input} placeholder="Notes (optional)" value={bodyForm.notes} onChange={e => setBodyForm(p => ({ ...p, notes: e.target.value }))} />
                  </>
                )}

                {/* Save button */}
                <button
                  style={{
                    ...s.saveBtn,
                    borderColor: activeLogType?.colorBorder,
                    background: `linear-gradient(135deg, ${activeLogType?.colorDim}, transparent)`,
                    color: activeLogType?.color,
                    opacity: saving ? 0.5 : 1,
                  }}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : `Log ${activeLogType?.label}`}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
      <NomisChat pageContext={selectedDate ? `Calendar: viewing ${selectedDate}` : 'Calendar view'} />
    </Shell>
  )
}

// ── Detail section component ────────────────────────────────────────────────
function DetailSection({ title, color, items, empty, renderItem }) {
  return (
    <div style={s.detailSection}>
      <div style={s.detailSectionHeader}>
        <div style={{ ...s.detailAccent, background: color }} />
        <span style={{ ...s.detailSectionTitle, color }} className="mono">{title}</span>
        <span style={s.detailSectionCount} className="mono">{items.length || 0}</span>
      </div>
      {items.length === 0 ? (
        <div style={s.detailEmpty} className="mono">{empty}</div>
      ) : (
        items.map((item, i) => <div key={i}>{renderItem(item)}</div>)
      )}
    </div>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────────
const s = {
  page: { padding: '8px 0 40px' },

  // Toast
  toast: {
    position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
    zIndex: 600, background: 'rgba(45,212,191,0.1)', border: '1px solid var(--teal-border)',
    borderRadius: '12px', padding: '10px 20px',
    fontSize: '0.6rem', color: 'var(--teal)', letterSpacing: '0.06em',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
  },

  // Month nav
  monthNav: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: '24px', padding: '20px 24px 24px',
  },
  monthArrow: {
    width: '30px', height: '30px', borderRadius: '8px',
    background: 'var(--bg2)', border: '1px solid var(--border2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--text3)', fontSize: '0.72rem', cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
  },
  monthCenter: { textAlign: 'center', minWidth: '160px' },
  monthName: { fontSize: '1.15rem', fontWeight: '600', color: '#fff', letterSpacing: '-0.01em' },

  // Day labels
  dayLabels: {
    display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
    padding: '0 24px', marginBottom: '8px',
  },
  dayLabel: {
    textAlign: 'center', fontSize: '0.48rem', color: 'var(--text3)',
    letterSpacing: '0.1em', textTransform: 'uppercase',
  },

  // Grid
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '4px', padding: '0 24px', marginBottom: '20px',
  },
  cellEmpty: { aspectRatio: '1', borderRadius: '8px' },
  cell: {
    aspectRatio: '1', borderRadius: '10px', display: 'flex',
    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: '4px', cursor: 'pointer', transition: 'all 0.15s',
    background: 'transparent', border: '1px solid transparent',
  },
  cellToday: {
    background: 'var(--cyan-dim)', border: '1px solid var(--cyan-border)',
  },
  cellSelected: {
    background: 'rgba(34,211,238,0.15)', border: '1px solid rgba(34,211,238,0.3)',
  },
  cellNum: {
    fontSize: '0.82rem', fontWeight: '500', lineHeight: 1,
  },
  dots: {
    display: 'flex', gap: '2px', alignItems: 'center',
  },
  dot: {
    width: '4px', height: '4px', borderRadius: '50%',
  },

  // Legend
  legend: {
    display: 'flex', justifyContent: 'center', flexWrap: 'wrap',
    gap: '12px', padding: '0 24px 24px',
  },
  legendItem: {
    display: 'flex', alignItems: 'center', gap: '5px',
    fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.06em',
  },
  legendDot: {
    width: '5px', height: '5px', borderRadius: '50%',
  },

  // Detail panel
  detailPanel: {
    margin: '0 24px', background: 'rgba(38,42,51,0.75)',
    border: '1px solid var(--border)', borderRadius: '16px',
    backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.02) inset',
    overflow: 'hidden',
  },
  detailHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '18px 20px', borderBottom: '1px solid var(--border)',
  },
  detailDate: { fontSize: '0.95rem', fontWeight: '600', color: '#fff' },
  detailClose: {
    width: '28px', height: '28px', borderRadius: '7px',
    background: 'transparent', border: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', position: 'relative',
  },
  closeX1: {
    position: 'absolute', width: '14px', height: '1.5px',
    background: 'var(--text3)', borderRadius: '1px', transform: 'rotate(45deg)',
  },
  closeX2: {
    position: 'absolute', width: '14px', height: '1.5px',
    background: 'var(--text3)', borderRadius: '1px', transform: 'rotate(-45deg)',
  },
  detailLoading: {
    padding: '32px', textAlign: 'center', fontSize: '0.55rem',
    color: 'var(--text3)', letterSpacing: '0.1em',
  },
  detailContent: {
    padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: '16px',
  },

  // Detail sections
  detailSection: { display: 'flex', flexDirection: 'column', gap: '8px' },
  detailSectionHeader: {
    display: 'flex', alignItems: 'center', gap: '8px',
  },
  detailAccent: {
    width: '3px', height: '14px', borderRadius: '2px',
  },
  detailSectionTitle: {
    fontSize: '0.52rem', letterSpacing: '0.1em', textTransform: 'uppercase',
  },
  detailSectionCount: {
    fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.06em',
    marginLeft: 'auto',
  },
  detailEmpty: {
    fontSize: '0.55rem', color: 'var(--text3)', letterSpacing: '0.04em',
    padding: '4px 0 4px 11px', opacity: 0.6,
  },
  detailRow: {
    padding: '8px 0 8px 11px',
    borderBottom: '1px solid var(--border)',
  },
  detailRowTitle: {
    fontSize: '0.85rem', fontWeight: '500', color: 'var(--text)',
    display: 'block',
  },
  detailRowMeta: {
    fontSize: '0.5rem', color: 'var(--text3)', letterSpacing: '0.04em',
    marginTop: '3px', display: 'block',
  },

  // Add section
  addSection: {
    borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '4px',
  },
  addLabel: {
    fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.1em',
    textTransform: 'uppercase', marginBottom: '10px',
  },
  addGrid: {
    display: 'flex', flexWrap: 'wrap', gap: '6px',
  },
  addTypeBtn: {
    padding: '8px 14px', borderRadius: '8px', border: '1px solid',
    fontSize: '0.68rem', fontWeight: '500', cursor: 'pointer',
    fontFamily: 'var(--font-body)', transition: 'all 0.15s',
  },

  // Modal
  modalOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
    zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  },
  modal: {
    width: '100%', maxWidth: '480px', background: 'var(--bg2)',
    border: '1px solid var(--border2)', borderRadius: '20px 20px 0 0',
    maxHeight: '85vh', overflowY: 'auto',
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '20px 20px 12px',
  },
  modalTitle: { fontSize: '1rem', fontWeight: '700' },
  modalDate: { fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.06em', marginTop: '4px' },
  modalClose: {
    width: '28px', height: '28px', borderRadius: '7px', background: 'transparent',
    border: 'none', position: 'relative', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },

  // Form
  formBody: { padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' },
  formLabel: {
    fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.1em',
    textTransform: 'uppercase', marginBottom: '-4px',
  },
  formLabelSm: {
    fontSize: '0.42rem', color: 'var(--text3)', letterSpacing: '0.1em',
    textTransform: 'uppercase', textAlign: 'center', marginBottom: '4px',
  },
  input: {
    width: '100%', padding: '12px 14px', borderRadius: '10px',
    border: '1px solid var(--border2)', background: 'var(--bg3)',
    color: 'var(--text)', fontSize: '0.88rem', fontFamily: 'var(--font-body)',
    outline: 'none',
  },
  inputRow: { display: 'flex', gap: '10px' },
  inputHalf: { flex: 1 },
  inputSm: {
    width: '100%', padding: '10px 8px', borderRadius: '8px',
    border: '1px solid var(--border2)', background: 'var(--bg3)',
    color: 'var(--text)', fontSize: '0.82rem', textAlign: 'center',
    outline: 'none',
  },
  macroGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' },
  macroWrap: { display: 'flex', flexDirection: 'column' },
  chipRow: { display: 'flex', flexWrap: 'wrap', gap: '5px' },
  chip: {
    padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)',
    background: 'transparent', color: 'var(--text3)', fontSize: '0.72rem',
    fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font-body)',
    transition: 'all 0.15s',
  },
  chipSm: {
    padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--border)',
    background: 'transparent', color: 'var(--text3)', fontSize: '0.6rem',
    fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font-body)',
    transition: 'all 0.15s',
  },
  saveBtn: {
    width: '100%', padding: '15px', marginTop: '4px',
    borderRadius: '12px', border: '1px solid',
    fontFamily: 'var(--font-body)', fontSize: '0.88rem', fontWeight: '600',
    cursor: 'pointer', transition: 'opacity 0.15s',
  },
}