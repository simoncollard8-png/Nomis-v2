'use client'
import { getLocalDate } from '../../lib/date'
import { useState, useEffect } from 'react'
import Shell from '../../components/Shell'
import NomisChat from '../../components/NomisChat'
import { getTodaysNutrition, getRecentNutrition, logNutrition, dbRead, dbWrite } from '../../lib/api'

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack']

export default function Nutrition() {
  const [todayMeals, setTodayMeals] = useState([])
  const [recentDays, setRecentDays] = useState([])
  const [savedMeals, setSavedMeals] = useState([])
  const [loading, setLoading]       = useState(true)
  const [showAdd, setShowAdd]       = useState(false)
  const [saving, setSaving]         = useState(false)
  const [quickToast, setQuickToast] = useState(null)
  const [showSaveToggle, setShowSaveToggle] = useState(false)
  const [saveName, setSaveName]     = useState('')

  // Edit mode
  const [editMode, setEditMode]       = useState(false)
  const [editingMeal, setEditingMeal] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showNewQuick, setShowNewQuick] = useState(false)

  // Edit form
  const [editName, setEditName]       = useState('')
  const [editType, setEditType]       = useState('snack')
  const [editCal, setEditCal]         = useState('')
  const [editProtein, setEditProtein] = useState('')
  const [editCarbs, setEditCarbs]     = useState('')
  const [editFat, setEditFat]         = useState('')

  // Log form
  const [meal, setMeal]         = useState('Lunch')
  const [desc, setDesc]         = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein]   = useState('')
  const [carbs, setCarbs]       = useState('')
  const [fat, setFat]           = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [today, recent, saved] = await Promise.all([
        getTodaysNutrition(),
        getRecentNutrition(30),
        dbRead('saved_meals', {}, { order: 'use_count', limit: 20 }),
      ])
      setTodayMeals(today || [])
      setSavedMeals(saved || [])

      const grouped = {}
      ;(recent || []).forEach(m => {
        if (!grouped[m.date]) grouped[m.date] = []
        grouped[m.date].push(m)
      })
      const days = Object.entries(grouped).map(([date, meals]) => ({
        date,
        meals,
        calories: meals.reduce((a, b) => a + (parseInt(b.calories) || 0), 0),
        protein: meals.reduce((a, b) => a + (parseInt(b.protein_g) || 0), 0),
        carbs: meals.reduce((a, b) => a + (parseInt(b.carbs_g) || 0), 0),
        fat: meals.reduce((a, b) => a + (parseInt(b.fat_g) || 0), 0),
      })).sort((a, b) => b.date.localeCompare(a.date))
      setRecentDays(days)
    } catch (err) {
      console.error('Nutrition load error:', err)
    }
    setLoading(false)
  }

  async function handleQuickAdd(savedMeal) {
    if (editMode) return
    const today = getLocalDate()
    try {
      await logNutrition({
        date: today,
        meal: savedMeal.meal_type || 'snack',
        description: savedMeal.name,
        calories: savedMeal.calories,
        protein_g: savedMeal.protein_g,
        carbs_g: savedMeal.carbs_g,
        fat_g: savedMeal.fat_g,
      })
      if (savedMeal.id) {
        await dbWrite('saved_meals', 'update', {
          use_count: (savedMeal.use_count || 0) + 1,
        }, { id: savedMeal.id })
      }
      showToast(`${savedMeal.name} logged`)
      await loadData()
    } catch (err) {
      console.error('Quick add error:', err)
      showToast('Failed to log')
    }
  }

  function openEditMeal(sm) {
    setEditingMeal(sm)
    setEditName(sm.name || '')
    setEditType(sm.meal_type || 'snack')
    setEditCal(sm.calories?.toString() || '')
    setEditProtein(sm.protein_g?.toString() || '')
    setEditCarbs(sm.carbs_g?.toString() || '')
    setEditFat(sm.fat_g?.toString() || '')
    setShowEditModal(true)
  }

  function openNewQuick() {
    setEditingMeal(null)
    setEditName('')
    setEditType('snack')
    setEditCal('')
    setEditProtein('')
    setEditCarbs('')
    setEditFat('')
    setShowNewQuick(true)
    setShowEditModal(true)
  }

  async function handleSaveEdit() {
    if (!editName.trim()) return
    setSaving(true)
    try {
      const data = {
        name: editName.trim(),
        meal_type: editType,
        description: editName.trim(),
        calories: parseInt(editCal) || null,
        protein_g: parseInt(editProtein) || null,
        carbs_g: parseInt(editCarbs) || null,
        fat_g: parseInt(editFat) || null,
      }

      if (editingMeal?.id) {
        await dbWrite('saved_meals', 'update', data, { id: editingMeal.id })
        showToast('Meal updated')
      } else {
        data.use_count = 0
        await dbWrite('saved_meals', 'insert', data)
        showToast('Meal added')
      }

      setShowEditModal(false)
      setShowNewQuick(false)
      setEditingMeal(null)
      await loadData()
    } catch (err) {
      console.error('Save edit error:', err)
      showToast('Failed to save')
    }
    setSaving(false)
  }

  async function handleDeleteMeal(sm) {
    if (!sm?.id) return
    try {
      await dbWrite('saved_meals', 'delete', {}, { id: sm.id })
      showToast(`${sm.name} removed`)
      setShowEditModal(false)
      setEditingMeal(null)
      await loadData()
    } catch (err) {
      console.error('Delete error:', err)
      showToast('Failed to delete')
    }
  }

  async function handleSave() {
    if (!desc.trim()) return
    setSaving(true)
    try {
      await logNutrition({
        date: getLocalDate(),
        meal: meal.toLowerCase(),
        description: desc,
        calories: calories || null,
        protein_g: protein || null,
        carbs_g: carbs || null,
        fat_g: fat || null,
      })

      if (showSaveToggle && saveName.trim()) {
        await dbWrite('saved_meals', 'insert', {
          name: saveName.trim(),
          meal_type: meal.toLowerCase(),
          description: desc,
          calories: parseInt(calories) || null,
          protein_g: parseInt(protein) || null,
          carbs_g: parseInt(carbs) || null,
          fat_g: parseInt(fat) || null,
          use_count: 1,
        })
      }

      setDesc(''); setCalories(''); setProtein(''); setCarbs(''); setFat('')
      setSaveName(''); setShowSaveToggle(false)
      setShowAdd(false)
      await loadData()
    } catch (err) {
      console.error('Save error:', err)
    }
    setSaving(false)
  }

  function showToast(msg) {
    setQuickToast(msg)
    setTimeout(() => setQuickToast(null), 2000)
  }

  const todayCals = todayMeals.reduce((a, b) => a + (parseInt(b.calories) || 0), 0)
  const todayProtein = todayMeals.reduce((a, b) => a + (parseInt(b.protein_g) || 0), 0)
  const todayCarbs = todayMeals.reduce((a, b) => a + (parseInt(b.carbs_g) || 0), 0)
  const todayFat = todayMeals.reduce((a, b) => a + (parseInt(b.fat_g) || 0), 0)

  if (loading) return (
    <Shell title="Nutrition">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--text3)', letterSpacing: '0.12em' }}>LOADING...</span>
      </div>
    </Shell>
  )

  return (
    <Shell title="Nutrition">
      <div style={s.page}>

        {quickToast && (
          <div style={s.toast} className="animate-fadeIn">
            <span className="mono">{quickToast}</span>
          </div>
        )}

        {/* Today's summary */}
        <div style={s.section}>
          <div className="section-label" style={s.sLabel}>Today</div>
          <div className="card" style={s.macroCard}>
            <div style={s.macroRow}>
              <div style={s.macroItem}>
                <div style={{ ...s.macroValue, color: 'var(--orange)' }} className="mono">{todayCals || '--'}</div>
                <div style={s.macroLabel} className="mono">Calories</div>
              </div>
              <div style={s.macroItem}>
                <div style={{ ...s.macroValue, color: 'var(--cyan)' }} className="mono">{todayProtein || '--'}</div>
                <div style={s.macroLabel} className="mono">Protein</div>
              </div>
              <div style={s.macroItem}>
                <div style={{ ...s.macroValue, color: 'var(--teal)' }} className="mono">{todayCarbs || '--'}</div>
                <div style={s.macroLabel} className="mono">Carbs</div>
              </div>
              <div style={{ ...s.macroItem, borderRight: 'none' }}>
                <div style={{ ...s.macroValue, color: '#a78bfa' }} className="mono">{todayFat || '--'}</div>
                <div style={s.macroLabel} className="mono">Fat</div>
              </div>
            </div>
            <div style={s.mealCount} className="mono">{todayMeals.length} meal{todayMeals.length !== 1 ? 's' : ''} logged</div>
          </div>
        </div>

        {/* Quick add */}
        <div style={s.section}>
          <div style={s.sectionHeader}>
            <span className="section-label">Quick add</span>
            <div style={s.quickActions}>
              <button
                style={{ ...s.editToggle, ...(editMode ? s.editToggleOn : {}) }}
                onClick={() => setEditMode(!editMode)}
                className="mono"
              >
                {editMode ? 'Done' : 'Edit'}
              </button>
            </div>
          </div>
          <div style={s.quickGrid}>
            {savedMeals.map((sm) => (
              <div
                key={sm.id}
                className="card-sm"
                style={{ ...s.quickCard, ...(editMode ? s.quickCardEdit : {}) }}
                onClick={() => editMode ? openEditMeal(sm) : handleQuickAdd(sm)}
              >
                {editMode && (
                  <div style={s.editBadge} className="mono">tap to edit</div>
                )}
                <div style={s.quickTop}>
                  <div style={s.quickName}>{sm.name}</div>
                  <div style={s.quickType} className="mono">{(sm.meal_type || 'snack').toUpperCase()}</div>
                </div>
                <div style={s.quickMacros}>
                  <span className="mono" style={s.quickMacro}>
                    <span style={{ color: 'var(--orange)' }}>{sm.calories || '--'}</span> cal
                  </span>
                  <span className="mono" style={s.quickMacro}>
                    <span style={{ color: 'var(--cyan)' }}>{sm.protein_g || '--'}</span>g P
                  </span>
                  <span className="mono" style={s.quickMacro}>
                    <span style={{ color: 'var(--teal)' }}>{sm.carbs_g || '--'}</span>g C
                  </span>
                  <span className="mono" style={s.quickMacro}>
                    <span style={{ color: '#a78bfa' }}>{sm.fat_g || '--'}</span>g F
                  </span>
                </div>
              </div>
            ))}

            {/* Add new quick meal card */}
            <div style={s.addQuickCard} onClick={openNewQuick}>
              <span style={s.addQuickPlus}>+</span>
              <span style={s.addQuickLabel}>Add quick meal</span>
            </div>
          </div>
        </div>

        {/* Today's meals */}
        <div style={s.section}>
          <div style={s.sectionHeader}>
            <span className="section-label">Meals</span>
            <button style={s.addBtn} onClick={() => setShowAdd(true)}>+ Log meal</button>
          </div>

          {todayMeals.length === 0 ? (
            <div className="card" style={s.emptyCard}>
              <div className="mono" style={s.emptyText}>No meals logged today</div>
              <div style={s.emptyHint}>Tap a quick meal above or use "+ Log meal"</div>
            </div>
          ) : (
            <div style={s.mealList}>
              {todayMeals.map((m, i) => (
                <div key={i} className="card-sm" style={s.mealCard}>
                  <div style={s.mealTop}>
                    <div>
                      <div style={s.mealType} className="mono">{(m.meal || 'Meal').toUpperCase()}</div>
                      <div style={s.mealDesc}>{m.description || '--'}</div>
                    </div>
                  </div>
                  <div style={s.mealMacros}>
                    <span style={s.mealMacro} className="mono"><span style={{ color: 'var(--orange)' }}>{m.calories || '--'}</span> cal</span>
                    <span style={s.mealMacro} className="mono"><span style={{ color: 'var(--cyan)' }}>{m.protein_g || '--'}</span>g P</span>
                    <span style={s.mealMacro} className="mono"><span style={{ color: 'var(--teal)' }}>{m.carbs_g || '--'}</span>g C</span>
                    <span style={s.mealMacro} className="mono"><span style={{ color: '#a78bfa' }}>{m.fat_g || '--'}</span>g F</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent days */}
        {recentDays.length > 1 && (
          <div style={s.section}>
            <div className="section-label" style={s.sLabel}>Recent days</div>
            <div className="card" style={s.recentCard}>
              {recentDays.slice(0, 7).map((day, i) => (
                <div key={day.date} style={{
                  ...s.recentRow,
                  borderBottom: i < Math.min(recentDays.length, 7) - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div>
                    <div style={s.recentDate}>{new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                    <div style={s.recentMeals} className="mono">{day.meals.length} meal{day.meals.length !== 1 ? 's' : ''}</div>
                  </div>
                  <div style={s.recentMacros}>
                    <span className="mono" style={{ ...s.recentVal, color: 'var(--orange)' }}>{day.calories}</span>
                    <span className="mono" style={{ ...s.recentVal, color: 'var(--cyan)' }}>{day.protein}g</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Edit / New Quick Meal Modal ── */}
        {showEditModal && (
          <div style={s.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) { setShowEditModal(false); setShowNewQuick(false); setEditingMeal(null) } }}>
            <div style={s.modal} className="animate-fadeIn">
              <div style={s.modalHeader}>
                <span style={s.modalTitle}>{editingMeal ? 'Edit Quick Meal' : 'New Quick Meal'}</span>
                <button style={s.modalClose} onClick={() => { setShowEditModal(false); setShowNewQuick(false); setEditingMeal(null) }}>
                  <span style={{ position: 'absolute', width: '14px', height: '1.5px', background: 'var(--text3)', transform: 'rotate(45deg)' }} />
                  <span style={{ position: 'absolute', width: '14px', height: '1.5px', background: 'var(--text3)', transform: 'rotate(-45deg)' }} />
                </button>
              </div>

              <div style={s.formBody}>
                <div style={s.formLabel} className="mono">Name</div>
                <input style={s.input} placeholder="e.g. Chicken & Rice" value={editName} onChange={e => setEditName(e.target.value)} />

                <div style={s.formLabel} className="mono">Meal type</div>
                <div style={s.typeRow}>
                  {MEAL_TYPES.map(t => (
                    <button key={t} style={{
                      ...s.typeBtn,
                      ...(editType === t.toLowerCase() ? s.typeBtnActive : {}),
                    }} onClick={() => setEditType(t.toLowerCase())}>{t}</button>
                  ))}
                </div>

                <div style={s.macroInputs}>
                  <div style={s.macroInputWrap}>
                    <label style={s.inputLabel} className="mono">Calories</label>
                    <input style={s.inputSm} className="mono" type="number" inputMode="numeric" placeholder="--" value={editCal} onChange={e => setEditCal(e.target.value)} />
                  </div>
                  <div style={s.macroInputWrap}>
                    <label style={s.inputLabel} className="mono">Protein</label>
                    <input style={s.inputSm} className="mono" type="number" inputMode="numeric" placeholder="--" value={editProtein} onChange={e => setEditProtein(e.target.value)} />
                  </div>
                  <div style={s.macroInputWrap}>
                    <label style={s.inputLabel} className="mono">Carbs</label>
                    <input style={s.inputSm} className="mono" type="number" inputMode="numeric" placeholder="--" value={editCarbs} onChange={e => setEditCarbs(e.target.value)} />
                  </div>
                  <div style={s.macroInputWrap}>
                    <label style={s.inputLabel} className="mono">Fat</label>
                    <input style={s.inputSm} className="mono" type="number" inputMode="numeric" placeholder="--" value={editFat} onChange={e => setEditFat(e.target.value)} />
                  </div>
                </div>

                <button
                  style={{ ...s.saveBtn, opacity: saving || !editName.trim() ? 0.4 : 1 }}
                  onClick={handleSaveEdit}
                  disabled={saving || !editName.trim()}
                >
                  {saving ? 'Saving...' : editingMeal ? 'Save changes' : 'Add quick meal'}
                </button>

                {editingMeal && (
                  <button style={s.deleteBtn} onClick={() => handleDeleteMeal(editingMeal)}>
                    Delete this meal
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Log Meal Modal ── */}
        {showAdd && (
          <div style={s.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setShowAdd(false) }}>
            <div style={s.modal} className="animate-fadeIn">
              <div style={s.modalHeader}>
                <span style={s.modalTitle}>Log Meal</span>
                <button style={s.modalClose} onClick={() => setShowAdd(false)}>
                  <span style={{ position: 'absolute', width: '14px', height: '1.5px', background: 'var(--text3)', transform: 'rotate(45deg)' }} />
                  <span style={{ position: 'absolute', width: '14px', height: '1.5px', background: 'var(--text3)', transform: 'rotate(-45deg)' }} />
                </button>
              </div>

              <div style={s.typeRow}>
                {MEAL_TYPES.map(t => (
                  <button key={t} style={{
                    ...s.typeBtn,
                    ...(meal === t ? s.typeBtnActive : {}),
                  }} onClick={() => setMeal(t)}>{t}</button>
                ))}
              </div>

              <div style={s.formBody}>
                <input style={s.input} placeholder="What did you eat?" value={desc} onChange={e => setDesc(e.target.value)} />

                <div style={s.macroInputs}>
                  <div style={s.macroInputWrap}>
                    <label style={s.inputLabel} className="mono">Calories</label>
                    <input style={s.inputSm} className="mono" type="number" inputMode="numeric" placeholder="--" value={calories} onChange={e => setCalories(e.target.value)} />
                  </div>
                  <div style={s.macroInputWrap}>
                    <label style={s.inputLabel} className="mono">Protein</label>
                    <input style={s.inputSm} className="mono" type="number" inputMode="numeric" placeholder="--" value={protein} onChange={e => setProtein(e.target.value)} />
                  </div>
                  <div style={s.macroInputWrap}>
                    <label style={s.inputLabel} className="mono">Carbs</label>
                    <input style={s.inputSm} className="mono" type="number" inputMode="numeric" placeholder="--" value={carbs} onChange={e => setCarbs(e.target.value)} />
                  </div>
                  <div style={s.macroInputWrap}>
                    <label style={s.inputLabel} className="mono">Fat</label>
                    <input style={s.inputSm} className="mono" type="number" inputMode="numeric" placeholder="--" value={fat} onChange={e => setFat(e.target.value)} />
                  </div>
                </div>

                <div
                  style={s.saveToggleRow}
                  onClick={() => {
                    setShowSaveToggle(!showSaveToggle)
                    if (!showSaveToggle && !saveName) setSaveName(desc)
                  }}
                >
                  <div style={{
                    ...s.toggleBox,
                    ...(showSaveToggle ? s.toggleBoxOn : {}),
                  }}>
                    {showSaveToggle && <span style={s.toggleCheck}>✓</span>}
                  </div>
                  <span style={s.saveToggleLabel}>Save as quick meal</span>
                </div>

                {showSaveToggle && (
                  <input
                    style={s.input}
                    placeholder="Quick meal name (e.g. Chicken & Rice)"
                    value={saveName}
                    onChange={e => setSaveName(e.target.value)}
                  />
                )}

                <div className="mono" style={s.formHint}>
                  Leave macros blank and NOMIS will estimate from the description
                </div>

                <button style={{ ...s.saveBtn, opacity: saving || !desc.trim() ? 0.4 : 1 }} onClick={handleSave} disabled={saving || !desc.trim()}>
                  {saving ? 'Saving...' : 'Log meal'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
      <NomisChat pageContext={`Nutrition page. Today: ${todayCals} cal, ${todayProtein}g protein, ${todayMeals.length} meals logged.`} />
    </Shell>
  )
}

const s = {
  page: { padding: '8px 0 40px' },
  section: { marginBottom: '24px' },
  sLabel: { padding: '0 24px', marginBottom: '10px' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px', marginBottom: '10px' },

  toast: {
    position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
    zIndex: 300, background: 'rgba(45,212,191,0.1)', border: '1px solid var(--teal-border)',
    borderRadius: '12px', padding: '10px 20px',
    fontSize: '0.6rem', color: 'var(--teal)', letterSpacing: '0.06em',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
  },

  macroCard: { margin: '0 24px', overflow: 'hidden' },
  macroRow: { display: 'flex', padding: '4px 0' },
  macroItem: { flex: 1, padding: '18px 0', textAlign: 'center', borderRight: '1px solid var(--border)' },
  macroValue: { fontSize: '1.1rem', fontWeight: '600', lineHeight: 1, marginBottom: '6px' },
  macroLabel: { fontSize: '0.42rem', color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase' },
  mealCount: { fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.06em', textAlign: 'center', padding: '8px 0 14px', borderTop: '1px solid var(--border)' },

  quickActions: { display: 'flex', gap: '8px', alignItems: 'center' },
  editToggle: {
    padding: '5px 12px', borderRadius: '6px', border: '1px solid var(--border)',
    background: 'transparent', color: 'var(--text3)', fontSize: '0.5rem',
    letterSpacing: '0.06em', cursor: 'pointer', transition: 'all 0.15s',
  },
  editToggleOn: {
    background: 'var(--cyan-dim)', borderColor: 'var(--cyan-border)', color: 'var(--cyan)',
  },
  quickGrid: { display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '0 24px' },
  quickCard: {
    padding: '12px 14px', cursor: 'pointer', transition: 'all 0.15s',
    flex: '0 0 calc(50% - 4px)', minWidth: '140px',
  },
  quickCardEdit: { borderColor: 'var(--cyan-border)', borderStyle: 'dashed' },
  editBadge: {
    fontSize: '0.4rem', color: 'var(--cyan)', letterSpacing: '0.08em',
    marginBottom: '6px', textTransform: 'uppercase',
  },
  quickTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' },
  quickName: { fontSize: '0.85rem', fontWeight: '600', color: 'var(--text)' },
  quickType: { fontSize: '0.4rem', color: 'var(--text3)', letterSpacing: '0.1em', flexShrink: 0, marginLeft: '8px' },
  quickMacros: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  quickMacro: { fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.03em' },

  addQuickCard: {
    flex: '0 0 calc(50% - 4px)', minWidth: '140px',
    border: '1.5px dashed var(--border2)', borderRadius: 'var(--radius-md)',
    padding: '12px 14px', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: '4px',
    cursor: 'pointer', transition: 'all 0.15s', minHeight: '80px',
  },
  addQuickPlus: { fontSize: '1.1rem', color: 'var(--text3)', fontWeight: '300', lineHeight: 1 },
  addQuickLabel: { fontSize: '0.65rem', color: 'var(--text3)' },

  addBtn: {
    padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--orange-border)',
    background: 'var(--orange-dim)', color: 'var(--orange)',
    fontFamily: 'var(--font-mono)', fontSize: '0.52rem', letterSpacing: '0.06em',
    cursor: 'pointer',
  },

  emptyCard: { margin: '0 24px', padding: '32px 20px', textAlign: 'center' },
  emptyText: { fontSize: '0.6rem', color: 'var(--text3)', letterSpacing: '0.06em', marginBottom: '6px' },
  emptyHint: { fontSize: '0.72rem', color: 'var(--text3)', opacity: 0.6 },

  mealList: { display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 24px' },
  mealCard: { padding: '14px 16px' },
  mealTop: { marginBottom: '10px' },
  mealType: { fontSize: '0.48rem', color: 'var(--orange)', letterSpacing: '0.1em', marginBottom: '4px' },
  mealDesc: { fontSize: '0.9rem', fontWeight: '500', color: 'var(--text)' },
  mealMacros: { display: 'flex', gap: '16px' },
  mealMacro: { fontSize: '0.52rem', color: 'var(--text3)', letterSpacing: '0.04em' },

  recentCard: { margin: '0 24px', overflow: 'hidden' },
  recentRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px' },
  recentDate: { fontSize: '0.85rem', fontWeight: '500', color: 'var(--text)' },
  recentMeals: { fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.04em', marginTop: '3px' },
  recentMacros: { display: 'flex', gap: '14px', alignItems: 'center' },
  recentVal: { fontSize: '0.6rem', fontWeight: '500', letterSpacing: '0.02em' },

  modalOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
    zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  },
  modal: {
    width: '100%', maxWidth: '480px', background: 'var(--bg2)',
    border: '1px solid var(--border2)', borderRadius: '20px 20px 0 0',
    maxHeight: '80vh', overflowY: 'auto',
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

  typeRow: { display: 'flex', gap: '6px', padding: '0 20px 16px' },
  typeBtn: {
    flex: 1, padding: '10px 0', borderRadius: '8px', border: '1px solid var(--border)',
    background: 'var(--bg3)', color: 'var(--text3)', fontSize: '0.72rem', fontWeight: '500',
    cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
    fontFamily: 'var(--font-body)',
  },
  typeBtnActive: {
    background: 'var(--orange-dim)', borderColor: 'var(--orange-border)', color: 'var(--orange)',
  },

  formBody: { padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' },
  formLabel: {
    fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.1em',
    textTransform: 'uppercase', marginBottom: '-4px',
  },
  input: {
    width: '100%', padding: '14px 16px', borderRadius: '10px',
    border: '1px solid var(--border2)', background: 'var(--bg3)',
    color: 'var(--text)', fontSize: '0.9rem', fontFamily: 'var(--font-body)',
    outline: 'none',
  },
  macroInputs: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' },
  macroInputWrap: { display: 'flex', flexDirection: 'column', gap: '4px' },
  inputLabel: { fontSize: '0.42rem', color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center' },
  inputSm: {
    width: '100%', padding: '10px 8px', borderRadius: '8px',
    border: '1px solid var(--border2)', background: 'var(--bg3)',
    color: 'var(--text)', fontSize: '0.82rem', textAlign: 'center', outline: 'none',
    fontFamily: 'var(--font-mono)',
  },

  saveToggleRow: {
    display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '4px 0',
  },
  toggleBox: {
    width: '20px', height: '20px', borderRadius: '6px',
    border: '1.5px solid var(--border3)', background: 'transparent',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s', flexShrink: 0,
  },
  toggleBoxOn: { background: 'var(--orange-dim)', borderColor: 'var(--orange-border)' },
  toggleCheck: { fontSize: '0.6rem', color: 'var(--orange)', fontWeight: '700' },
  saveToggleLabel: { fontSize: '0.78rem', color: 'var(--text2)', fontWeight: '500' },

  formHint: { fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.04em', textAlign: 'center', opacity: 0.7 },
  saveBtn: {
    width: '100%', padding: '15px', borderRadius: '12px',
    border: '1px solid var(--orange-border)',
    background: 'linear-gradient(135deg, rgba(251,146,60,0.10), rgba(251,146,60,0.04))',
    color: 'var(--orange)', fontFamily: 'var(--font-body)',
    fontSize: '0.88rem', fontWeight: '600', cursor: 'pointer',
  },
  deleteBtn: {
    width: '100%', padding: '13px', borderRadius: '12px',
    border: '1px solid rgba(248,113,113,0.2)',
    background: 'rgba(248,113,113,0.04)',
    color: 'var(--red)', fontFamily: 'var(--font-mono)',
    fontSize: '0.6rem', fontWeight: '500', cursor: 'pointer',
    letterSpacing: '0.04em',
  },
}