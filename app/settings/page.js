'use client'
import { useState, useEffect } from 'react'
import Shell from '../../components/Shell'
import { dbRead, dbWrite } from '../../lib/api'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const WORKOUT_OPTIONS = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body', 'Cardio', 'Rest']

const DEFAULT_EQUIPMENT = [
  { name: 'Adjustable Dumbbells (5-55 lbs)', active: true },
  { name: 'Flat/Incline Bench', active: true },
  { name: 'Barbell', active: true },
  { name: 'Pull-up and Dip Station', active: true },
  { name: 'Bodyweight', active: true },
]

export default function Settings() {
  const [tab, setTab] = useState('schedule')
  const [schedule, setSchedule] = useState([])
  const [equipment, setEquipment] = useState(DEFAULT_EQUIPMENT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveToast, setSaveToast] = useState(null)
  const [newEquipment, setNewEquipment] = useState('')

  // Profile
  const [profile, setProfile] = useState({
    name: 'Simon',
    goal: 'Body recomposition',
    program: 'PPL Strength Recomp',
    calTarget: '2200',
    proteinTarget: '180',
  })

  useEffect(() => { loadSettings() }, [])

  async function loadSettings() {
    setLoading(true)
    try {
      // Load schedule
      const scheduleRows = await dbRead('user_schedule', {}, { order: 'id', limit: 7 })
      if (scheduleRows.length) {
        const mapped = DAYS.map(day => {
          const row = scheduleRows.find(r => r.day_of_week === day)
          return { day, muscle_group: row?.muscle_group || 'Rest', id: row?.id || null }
        })
        setSchedule(mapped)
      } else {
        // Default PPL schedule
        setSchedule([
          { day: 'Monday', muscle_group: 'Push', id: null },
          { day: 'Tuesday', muscle_group: 'Pull', id: null },
          { day: 'Wednesday', muscle_group: 'Legs', id: null },
          { day: 'Thursday', muscle_group: 'Push', id: null },
          { day: 'Friday', muscle_group: 'Pull', id: null },
          { day: 'Saturday', muscle_group: 'Legs', id: null },
          { day: 'Sunday', muscle_group: 'Rest', id: null },
        ])
      }

      // Load equipment from DB if stored
      const equipRows = await dbRead('user_equipment', {}, { limit: 20 })
      if (equipRows.length) {
        setEquipment(equipRows.map(e => ({ name: e.name, active: e.active !== false, id: e.id })))
      }
    } catch (err) {
      console.error('Settings load error:', err)
      // Use defaults
      setSchedule(DAYS.map((day, i) => ({
        day,
        muscle_group: ['Push', 'Pull', 'Legs', 'Push', 'Pull', 'Legs', 'Rest'][i],
        id: null,
      })))
    }
    setLoading(false)
  }

  async function saveSchedule() {
    setSaving(true)
    try {
      for (const entry of schedule) {
        if (entry.id) {
          await dbWrite('user_schedule', 'update', { muscle_group: entry.muscle_group }, { id: entry.id })
        } else {
          await dbWrite('user_schedule', 'insert', { day_of_week: entry.day, muscle_group: entry.muscle_group })
        }
      }
      showToast('Schedule saved')
      await loadSettings()
    } catch (err) {
      console.error('Save schedule error:', err)
      showToast('Failed to save')
    }
    setSaving(false)
  }

  async function saveEquipment() {
    setSaving(true)
    try {
      // For simplicity, delete and re-insert
      // In production you'd do upserts
      for (const item of equipment) {
        if (item.id) {
          await dbWrite('user_equipment', 'update', { name: item.name, active: item.active }, { id: item.id })
        } else {
          await dbWrite('user_equipment', 'insert', { name: item.name, active: item.active })
        }
      }
      showToast('Equipment saved')
      await loadSettings()
    } catch (err) {
      console.error('Save equipment error:', err)
      showToast('Failed to save')
    }
    setSaving(false)
  }

  function showToast(msg) {
    setSaveToast(msg)
    setTimeout(() => setSaveToast(null), 2500)
  }

  function updateScheduleDay(dayIndex, muscleGroup) {
    setSchedule(prev => prev.map((s, i) => i === dayIndex ? { ...s, muscle_group: muscleGroup } : s))
  }

  function toggleEquipment(index) {
    setEquipment(prev => prev.map((e, i) => i === index ? { ...e, active: !e.active } : e))
  }

  function addEquipment() {
    if (!newEquipment.trim()) return
    setEquipment(prev => [...prev, { name: newEquipment.trim(), active: true, id: null }])
    setNewEquipment('')
  }

  function removeEquipment(index) {
    setEquipment(prev => prev.filter((_, i) => i !== index))
  }

  const tabs = [
    { key: 'schedule', label: 'Schedule' },
    { key: 'equipment', label: 'Equipment' },
    { key: 'profile', label: 'Profile' },
    { key: 'system', label: 'System' },
  ]

  if (loading) return (
    <Shell title="Settings">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--text3)', letterSpacing: '0.12em' }}>LOADING...</span>
      </div>
    </Shell>
  )

  return (
    <Shell title="Settings">
      <div style={s.page}>

        {/* Save toast */}
        {saveToast && (
          <div style={s.toast} className="animate-fadeIn">
            <span className="mono">{saveToast}</span>
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
        </div>

        {/* ── SCHEDULE ── */}
        {tab === 'schedule' && (
          <div style={s.section}>
            <div className="section-label" style={s.sLabel}>Weekly schedule</div>
            <div className="card" style={s.scheduleCard}>
              {schedule.map((entry, i) => (
                <div key={entry.day} style={{
                  ...s.scheduleRow,
                  borderBottom: i < schedule.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={s.scheduleDay}>
                    <div style={s.scheduleDayName}>{entry.day}</div>
                    <div style={s.scheduleDayShort} className="mono">
                      {entry.day.slice(0, 3).toUpperCase()}
                    </div>
                  </div>
                  <div style={s.scheduleSelect}>
                    {WORKOUT_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        style={{
                          ...s.scheduleOption,
                          ...(entry.muscle_group === opt ? s.scheduleOptionActive : {}),
                          ...(entry.muscle_group === opt && opt === 'Rest' ? s.scheduleOptionRest : {}),
                        }}
                        onClick={() => updateScheduleDay(i, opt)}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button
              style={{ ...s.saveBtn, opacity: saving ? 0.5 : 1 }}
              onClick={saveSchedule}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save schedule'}
            </button>
          </div>
        )}

        {/* ── EQUIPMENT ── */}
        {tab === 'equipment' && (
          <div style={s.section}>
            <div className="section-label" style={s.sLabel}>Your equipment</div>
            <div className="mono" style={s.equipHint}>
              NOMIS uses this to suggest exercises you can actually do
            </div>
            <div className="card" style={s.equipCard}>
              {equipment.map((item, i) => (
                <div key={i} style={{
                  ...s.equipRow,
                  borderBottom: i < equipment.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={s.equipLeft} onClick={() => toggleEquipment(i)}>
                    <div style={{
                      ...s.equipToggle,
                      ...(item.active ? s.equipToggleOn : {}),
                    }}>
                      {item.active && <span style={s.equipCheck}>✓</span>}
                    </div>
                    <span style={{
                      ...s.equipName,
                      opacity: item.active ? 1 : 0.4,
                    }}>{item.name}</span>
                  </div>
                  <button style={s.equipRemove} onClick={() => removeEquipment(i)}>×</button>
                </div>
              ))}
            </div>

            {/* Add equipment */}
            <div style={s.addRow}>
              <input
                style={s.addInput}
                placeholder="Add equipment..."
                value={newEquipment}
                onChange={e => setNewEquipment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addEquipment() }}
              />
              <button style={s.addBtn} onClick={addEquipment}>+</button>
            </div>

            <button
              style={{ ...s.saveBtn, opacity: saving ? 0.5 : 1 }}
              onClick={saveEquipment}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save equipment'}
            </button>
          </div>
        )}

        {/* ── PROFILE ── */}
        {tab === 'profile' && (
          <div style={s.section}>
            <div className="section-label" style={s.sLabel}>Profile</div>
            <div className="card" style={s.profileCard}>
              <div style={s.profileRow}>
                <label style={s.profileLabel} className="mono">Name</label>
                <input
                  style={s.profileInput}
                  value={profile.name}
                  onChange={e => setProfile(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div style={s.profileRow}>
                <label style={s.profileLabel} className="mono">Goal</label>
                <input
                  style={s.profileInput}
                  value={profile.goal}
                  onChange={e => setProfile(prev => ({ ...prev, goal: e.target.value }))}
                />
              </div>
              <div style={s.profileRow}>
                <label style={s.profileLabel} className="mono">Program</label>
                <input
                  style={s.profileInput}
                  value={profile.program}
                  onChange={e => setProfile(prev => ({ ...prev, program: e.target.value }))}
                />
              </div>
              <div style={{ ...s.profileRow, borderBottom: 'none' }}>
                <label style={s.profileLabel} className="mono">Daily targets</label>
                <div style={s.targetRow}>
                  <div style={s.targetWrap}>
                    <input
                      style={s.targetInput} className="mono"
                      type="number" inputMode="numeric"
                      value={profile.calTarget}
                      onChange={e => setProfile(prev => ({ ...prev, calTarget: e.target.value }))}
                    />
                    <span style={s.targetUnit} className="mono">cal</span>
                  </div>
                  <div style={s.targetWrap}>
                    <input
                      style={s.targetInput} className="mono"
                      type="number" inputMode="numeric"
                      value={profile.proteinTarget}
                      onChange={e => setProfile(prev => ({ ...prev, proteinTarget: e.target.value }))}
                    />
                    <span style={s.targetUnit} className="mono">g protein</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mono" style={s.profileNote}>
              Profile data is used by NOMIS for personalized coaching
            </div>
          </div>
        )}

        {/* ── SYSTEM ── */}
        {tab === 'system' && (
          <div style={s.section}>
            <div className="section-label" style={s.sLabel}>System info</div>
            <div className="card" style={s.systemCard}>
              <div style={s.sysRow}>
                <span className="mono" style={s.sysLabel}>Version</span>
                <span className="mono" style={s.sysVal}>NOMIS v3.0</span>
              </div>
              <div style={s.sysRow}>
                <span className="mono" style={s.sysLabel}>AI Model</span>
                <span className="mono" style={s.sysVal}>Claude Sonnet 4.5</span>
              </div>
              <div style={s.sysRow}>
                <span className="mono" style={s.sysLabel}>Middleware</span>
                <div style={s.sysStatus}>
                  <div style={s.sysDot} />
                  <span className="mono" style={s.sysOnline}>Online</span>
                </div>
              </div>
              <div style={s.sysRow}>
                <span className="mono" style={s.sysLabel}>Database</span>
                <span className="mono" style={s.sysVal}>Supabase</span>
              </div>
              <div style={s.sysRow}>
                <span className="mono" style={s.sysLabel}>Hosting</span>
                <span className="mono" style={s.sysVal}>Vercel</span>
              </div>
              <div style={{ ...s.sysRow, borderBottom: 'none' }}>
                <span className="mono" style={s.sysLabel}>Stack</span>
                <span className="mono" style={s.sysVal}>Next.js 15 + Railway</span>
              </div>
            </div>

            <div className="section-label" style={{ ...s.sLabel, marginTop: '24px' }}>Data</div>
            <div className="card" style={s.systemCard}>
              <div style={s.sysRow}>
                <span className="mono" style={s.sysLabel}>Tables</span>
                <span className="mono" style={s.sysVal}>workouts, sleep, nutrition, cardio, body_stats, personal_records, supplements, peptides</span>
              </div>
              <div style={{ ...s.sysRow, borderBottom: 'none' }}>
                <span className="mono" style={s.sysLabel}>Context window</span>
                <span className="mono" style={s.sysVal}>30 days rolling</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </Shell>
  )
}

const s = {
  page: { padding: '8px 0 40px' },
  section: { marginBottom: '24px', padding: '0 24px' },
  sLabel: { marginBottom: '10px' },

  // Toast
  toast: {
    position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
    zIndex: 300, background: 'rgba(45,212,191,0.1)', border: '1px solid var(--teal-border)',
    borderRadius: '12px', padding: '10px 20px',
    fontSize: '0.6rem', color: 'var(--teal)', letterSpacing: '0.06em',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
  },

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

  // Schedule
  scheduleCard: { overflow: 'hidden' },
  scheduleRow: { padding: '14px 18px' },
  scheduleDay: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' },
  scheduleDayName: { fontSize: '0.9rem', fontWeight: '600', color: 'var(--text)' },
  scheduleDayShort: { fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.08em' },
  scheduleSelect: { display: 'flex', flexWrap: 'wrap', gap: '5px' },
  scheduleOption: {
    padding: '6px 10px', borderRadius: '7px', border: '1px solid var(--border)',
    background: 'transparent', color: 'var(--text3)', fontSize: '0.65rem',
    fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font-body)',
    transition: 'all 0.15s',
  },
  scheduleOptionActive: {
    background: 'var(--cyan-dim)', borderColor: 'var(--cyan-border)', color: 'var(--cyan)',
  },
  scheduleOptionRest: {
    background: 'var(--bg3)', borderColor: 'var(--border2)', color: 'var(--text3)',
  },

  // Save button
  saveBtn: {
    width: '100%', padding: '15px', marginTop: '16px',
    borderRadius: 'var(--radius-md)', border: '1px solid var(--teal-border)',
    background: 'linear-gradient(135deg, rgba(45,212,191,0.10), rgba(45,212,191,0.04))',
    color: 'var(--teal)', fontFamily: 'var(--font-body)',
    fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer',
    transition: 'opacity 0.15s',
  },

  // Equipment
  equipHint: {
    fontSize: '0.5rem', color: 'var(--text3)', letterSpacing: '0.04em',
    marginBottom: '12px', opacity: 0.7,
  },
  equipCard: { overflow: 'hidden' },
  equipRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 18px',
  },
  equipLeft: { display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', flex: 1 },
  equipToggle: {
    width: '20px', height: '20px', borderRadius: '6px',
    border: '1.5px solid var(--border3)', background: 'transparent',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s', flexShrink: 0,
  },
  equipToggleOn: {
    background: 'var(--teal-dim)', borderColor: 'var(--teal-border)',
  },
  equipCheck: { fontSize: '0.6rem', color: 'var(--teal)', fontWeight: '700' },
  equipName: { fontSize: '0.85rem', fontWeight: '500', color: 'var(--text)', transition: 'opacity 0.15s' },
  equipRemove: {
    width: '28px', height: '28px', borderRadius: '7px',
    background: 'transparent', border: '1px solid var(--border)',
    color: 'var(--text3)', fontSize: '0.9rem', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s',
  },

  // Add equipment
  addRow: { display: 'flex', gap: '8px', marginTop: '12px' },
  addInput: {
    flex: 1, padding: '12px 14px', borderRadius: '10px',
    border: '1px solid var(--border2)', background: 'var(--bg2)',
    color: 'var(--text)', fontSize: '0.85rem', fontFamily: 'var(--font-body)',
    outline: 'none',
  },
  addBtn: {
    width: '44px', height: '44px', borderRadius: '10px',
    border: '1px solid var(--border2)', background: 'var(--bg2)',
    color: 'var(--text3)', fontSize: '1.2rem', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },

  // Profile
  profileCard: { overflow: 'hidden' },
  profileRow: { padding: '16px 18px', borderBottom: '1px solid var(--border)' },
  profileLabel: {
    fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.1em',
    textTransform: 'uppercase', marginBottom: '8px', display: 'block',
  },
  profileInput: {
    width: '100%', padding: '10px 14px', borderRadius: '8px',
    border: '1px solid var(--border2)', background: 'var(--bg3)',
    color: 'var(--text)', fontSize: '0.88rem', fontFamily: 'var(--font-body)',
    outline: 'none',
  },
  targetRow: { display: 'flex', gap: '8px' },
  targetWrap: { flex: 1, position: 'relative' },
  targetInput: {
    width: '100%', padding: '10px 50px 10px 14px', borderRadius: '8px',
    border: '1px solid var(--border2)', background: 'var(--bg3)',
    color: 'var(--text)', fontSize: '0.88rem', textAlign: 'left',
    outline: 'none',
  },
  targetUnit: {
    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
    fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.04em',
    pointerEvents: 'none',
  },
  profileNote: {
    fontSize: '0.5rem', color: 'var(--text3)', letterSpacing: '0.04em',
    marginTop: '12px', opacity: 0.7, textAlign: 'center',
  },

  // System
  systemCard: { overflow: 'hidden' },
  sysRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 18px', borderBottom: '1px solid var(--border)',
  },
  sysLabel: { fontSize: '0.6rem', color: 'var(--text3)', letterSpacing: '0.06em', flexShrink: 0 },
  sysVal: { fontSize: '0.55rem', color: 'var(--text2)', letterSpacing: '0.04em', textAlign: 'right', maxWidth: '60%' },
  sysStatus: { display: 'flex', alignItems: 'center', gap: '6px' },
  sysDot: {
    width: '5px', height: '5px', borderRadius: '50%',
    background: 'var(--teal)', boxShadow: '0 0 6px rgba(45,212,191,0.3)',
  },
  sysOnline: { fontSize: '0.55rem', color: 'var(--teal)', letterSpacing: '0.08em' },
}