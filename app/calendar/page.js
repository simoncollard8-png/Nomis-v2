'use client'
import { useState, useEffect } from 'react'
import Shell from '../../components/Shell'
import NomisChat from '../../components/NomisChat'
import { dbRead } from '../../lib/api'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [monthData, setMonthData]       = useState({})
  const [dayDetail, setDayDetail]       = useState(null)
  const [loading, setLoading]           = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => { loadMonthData() }, [currentMonth])

  async function loadMonthData() {
    setLoading(true)
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastDay = new Date(year, month + 1, 0).getDate()
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`

    try {
      const [workouts, sleep, nutrition, cardio, bodyStats] = await Promise.all([
        dbRead('workouts', {}, { order: 'date', limit: 100 }),
        dbRead('sleep', {}, { order: 'date', limit: 100 }),
        dbRead('nutrition', {}, { order: 'date', limit: 200 }),
        dbRead('cardio', {}, { order: 'date', limit: 100 }),
        dbRead('body_stats', {}, { order: 'date', limit: 100 }),
      ])

      // Build a map of date -> what was logged
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

  return (
    <Shell title="Calendar">
      <div style={s.page}>

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
                        <span style={s.detailRowTitle}>{n.meal}{n.description ? ` — ${n.description}` : ''}</span>
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
                      <span style={s.detailRowTitle}>{sl.duration_hrs || sl.duration_hours}h sleep</span>
                      <span style={s.detailRowMeta} className="mono">{sl.quality || '--'}</span>
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

                {/* Backfill hint */}
                <div style={s.backfillHint} className="mono">
                  Use the NOMIS chat to backfill — "I did chest on {selectedDate}, bench 185x5"
                </div>
              </div>
            )}
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

  // Backfill hint
  backfillHint: {
    fontSize: '0.5rem', color: 'var(--text3)', letterSpacing: '0.04em',
    textAlign: 'center', padding: '8px 0 0', opacity: 0.6,
  },
}