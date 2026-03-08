'use client'
import { getLocalDate } from '../lib/date'
import { useState, useEffect, useCallback } from 'react'
import Shell from '../../components/Shell'
import NomisChat from '../../components/NomisChat'
import { dbRead, dbWrite, chat } from '../../lib/api'

export default function Stack() {
  const [stack, setStack]           = useState([])
  const [logs, setLogs]             = useState([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState('today')
  const [toast, setToast]           = useState(null)

  // Add/Edit
  const [showAdd, setShowAdd]       = useState(false)
  const [editing, setEditing]       = useState(null)
  const [saving, setSaving]         = useState(false)
  const [form, setForm]             = useState({ name: '', dose: '', timing: '', category: 'supplement', notes: '' })

  // AI
  const [showAI, setShowAI]         = useState(false)
  const [aiQuery, setAiQuery]       = useState('')
  const [aiResponse, setAiResponse] = useState(null)
  const [aiLoading, setAiLoading]   = useState(false)
  const [selectedSupp, setSelectedSupp] = useState(null)

  const today = getLocalDate()

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [stackData, logData] = await Promise.all([
        dbRead('supplement_stack', {}, { order: 'name', limit: 50 }),
        dbRead('supplement_logs', { date: today }, { limit: 100 }),
      ])
      setStack((stackData || []).filter(s => s.active !== false))
      setLogs(logData || [])
    } catch (err) {
      console.error('Stack load error:', err)
    }
    setLoading(false)
  }, [today])

  useEffect(() => { loadData() }, [loadData])

  function isTaken(supp) {
    return logs.some(l =>
      String(l.supplement_id) === String(supp.id) ||
      l.name?.toLowerCase().trim() === supp.name?.toLowerCase().trim()
    )
  }

  function getLogForSupp(supp) {
    return logs.find(l =>
      String(l.supplement_id) === String(supp.id) ||
      l.name?.toLowerCase().trim() === supp.name?.toLowerCase().trim()
    )
  }

  async function toggleTaken(supp) {
    const existing = getLogForSupp(supp)
    try {
      if (existing) {
        // Untake — delete the log
        await dbWrite('supplement_logs', 'delete', {}, { id: existing.id })
        // Update local state immediately
        setLogs(prev => prev.filter(l => l.id !== existing.id))
        notify(`${supp.name} unmarked`)
      } else {
        // Take — insert log
        const result = await dbWrite('supplement_logs', 'insert', {
          supplement_id: supp.id,
          name: supp.name,
          date: today,
          taken: true,
        })
        // Update local state immediately
        const newLog = result?.data?.[0] || { id: Date.now(), supplement_id: supp.id, name: supp.name, date: today, taken: true }
        setLogs(prev => [...prev, newLog])
        notify(`${supp.name} taken`)
      }
    } catch (err) {
      console.error('Toggle error:', err)
      notify('Failed to update')
      // Reload from DB on error
      await loadData()
    }
  }

  function openAdd() {
    setEditing(null)
    setForm({ name: '', dose: '', timing: '', category: 'supplement', notes: '' })
    setShowAdd(true)
  }

  function openEdit(supp) {
    setEditing(supp)
    setForm({
      name: supp.name || '',
      dose: supp.dose || '',
      timing: supp.timing || '',
      category: supp.category || 'supplement',
      notes: supp.notes || '',
    })
    setShowAdd(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const data = {
        name: form.name.trim(),
        dose: form.dose || null,
        timing: form.timing || null,
        category: form.category,
        notes: form.notes || null,
        active: true,
      }
      if (editing?.id) {
        await dbWrite('supplement_stack', 'update', data, { id: editing.id })
        notify('Updated')
      } else {
        await dbWrite('supplement_stack', 'insert', data)
        notify('Added to stack')
      }
      setShowAdd(false)
      setEditing(null)
      await loadData()
    } catch (err) {
      console.error('Save error:', err)
      notify('Failed to save')
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!editing?.id) return
    try {
      await dbWrite('supplement_stack', 'update', { active: false }, { id: editing.id })
      notify(`${editing.name} removed`)
      setShowAdd(false)
      setEditing(null)
      await loadData()
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  async function askNomis(query) {
    if (!query?.trim()) return
    setAiLoading(true)
    setAiResponse(null)
    try {
      const stackContext = stack.map(s => `${s.name} (${s.dose || 'no dose'}, ${s.timing || 'no timing'}, ${s.category})`).join(', ')
      const fullQuery = `
User's current supplement stack: ${stackContext || 'empty'}
User's goal: Body recomposition — build muscle, cut fat.
User's equipment: Home gym with dumbbells, bench, barbell, pull-up/dip station.

The user is asking about supplements/peptides. Give a direct, research-backed answer. Include: what it does, mechanism of action, optimal dose and timing, interactions with their current stack, and how it relates to their goals. Be specific and coaching-focused, not generic.

Question: ${query}
      `.trim()

      const res = await chat(fullQuery, [])
      setAiResponse(res.response || 'No response from NOMIS.')
    } catch {
      setAiResponse('Connection error. Try again.')
    }
    setAiLoading(false)
  }

  function openSuppInfo(supp) {
    setSelectedSupp(supp)
    setShowAI(true)
    setAiQuery('')
    setAiResponse(null)
    askNomis(`Tell me about ${supp.name}. What does it do, how does it help my goals, optimal dosing and timing, any interactions with my other supplements?`)
  }

  function notify(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }

  function updateForm(key, val) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  const takenCount = stack.filter(s => isTaken(s)).length
  const compliance = stack.length ? Math.round((takenCount / stack.length) * 100) : 0

  // Group by timing
  const morningItems = stack.filter(s => s.timing?.toLowerCase().includes('morning'))
  const afternoonItems = stack.filter(s => s.timing?.toLowerCase().includes('afternoon') || s.timing?.toLowerCase().includes('lunch'))
  const eveningItems = stack.filter(s => s.timing?.toLowerCase().includes('evening') || s.timing?.toLowerCase().includes('9pm') || s.timing?.toLowerCase().includes('8:30'))
  const otherItems = stack.filter(s =>
    !morningItems.includes(s) && !afternoonItems.includes(s) && !eveningItems.includes(s)
  )

  const timeGroups = [
    { label: 'Morning', items: morningItems, color: 'var(--orange)' },
    { label: 'Afternoon', items: afternoonItems, color: 'var(--cyan)' },
    { label: 'Evening', items: eveningItems, color: '#a78bfa' },
    { label: 'Other', items: otherItems, color: 'var(--text3)' },
  ].filter(g => g.items.length > 0)

  const tabs = [
    { key: 'today', label: 'Today' },
    { key: 'stack', label: 'My Stack' },
    { key: 'explore', label: 'Explore' },
  ]

  if (loading) return (
    <Shell title="Stack">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--text3)', letterSpacing: '0.12em' }}>LOADING...</span>
      </div>
    </Shell>
  )

  return (
    <Shell title="Stack">
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
        </div>

        {/* ── TODAY ── */}
        {tab === 'today' && (
          <>
            {/* Compliance */}
            <div style={s.section}>
              <div className="section-label" style={s.sLabel}>Daily compliance</div>
              <div className="card" style={s.compCard}>
                <div style={s.compTop}>
                  <div style={s.compLeft}>
                    <span style={{
                      ...s.compNum,
                      color: compliance === 100 ? 'var(--teal)' : compliance > 50 ? 'var(--cyan)' : 'var(--orange)',
                    }} className="mono">{compliance}%</span>
                    {compliance === 100 && <span style={s.compComplete} className="mono">ALL TAKEN</span>}
                  </div>
                  <div style={s.compMeta} className="mono">{takenCount} of {stack.length}</div>
                </div>
                <div style={s.compBar}>
                  <div style={{
                    ...s.compFill,
                    width: `${compliance}%`,
                    background: compliance === 100
                      ? 'linear-gradient(90deg, var(--teal), var(--cyan))'
                      : 'linear-gradient(90deg, var(--cyan), var(--teal))',
                  }} />
                </div>
              </div>
            </div>

            {/* Grouped checklist */}
            <div style={s.section}>
              <div style={s.sectionHeader}>
                <span className="section-label">Checklist</span>
                <button style={s.addSmBtn} onClick={openAdd} className="mono">+ Add</button>
              </div>

              {stack.length === 0 ? (
                <div className="card" style={s.emptyCard}>
                  <div className="mono" style={s.emptyText}>No supplements in your stack</div>
                  <div style={s.emptyHint}>Tap "+ Add" to build your stack, or explore below</div>
                </div>
              ) : (
                timeGroups.map(group => (
                  <div key={group.label} style={{ marginBottom: '12px' }}>
                    <div style={s.groupLabel}>
                      <div style={{ ...s.groupDot, background: group.color }} />
                      <span className="mono" style={{ ...s.groupText, color: group.color }}>{group.label.toUpperCase()}</span>
                      <span className="mono" style={s.groupCount}>
                        {group.items.filter(i => isTaken(i)).length}/{group.items.length}
                      </span>
                    </div>
                    <div className="card" style={s.checklistCard}>
                      {group.items.map((supp, i) => {
                        const taken = isTaken(supp)
                        return (
                          <div key={supp.id} style={{
                            ...s.checkRow,
                            borderBottom: i < group.items.length - 1 ? '1px solid var(--border)' : 'none',
                          }}>
                            <div style={s.checkLeft} onClick={() => toggleTaken(supp)}>
                              <div style={{
                                ...s.checkBox,
                                ...(taken ? s.checkBoxOn : {}),
                              }}>
                                {taken && <span style={s.checkMark}>✓</span>}
                              </div>
                              <div style={{ opacity: taken ? 0.45 : 1, transition: 'opacity 0.2s' }}>
                                <div style={{
                                  ...s.checkName,
                                  textDecoration: taken ? 'line-through' : 'none',
                                  textDecorationColor: 'var(--text3)',
                                }}>{supp.name}</div>
                                <div style={s.checkDose} className="mono">
                                  {supp.dose || supp.category}
                                </div>
                              </div>
                            </div>
                            <button style={s.infoBtn} onClick={() => openSuppInfo(supp)}>
                              <span style={s.infoBtnText} className="mono">?</span>
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* ── MY STACK ── */}
        {tab === 'stack' && (
          <div style={s.section}>
            <div style={s.sectionHeader}>
              <span className="section-label">Your stack</span>
              <button style={s.addSmBtn} onClick={openAdd} className="mono">+ Add</button>
            </div>

            {stack.length === 0 ? (
              <div className="card" style={s.emptyCard}>
                <div className="mono" style={s.emptyText}>Stack is empty</div>
              </div>
            ) : (
              <div style={s.stackList}>
                {stack.map((supp) => (
                  <div key={supp.id} className="card-sm" style={s.stackCard}>
                    <div style={s.stackCardTop}>
                      <div>
                        <div style={s.stackName}>{supp.name}</div>
                        <div style={s.stackDose} className="mono">{supp.dose || 'No dose set'}</div>
                      </div>
                      <span style={{
                        ...s.catBadge,
                        color: supp.category === 'peptide' ? '#a78bfa' : 'var(--cyan)',
                        background: supp.category === 'peptide' ? 'rgba(167,139,250,0.08)' : 'var(--cyan-dim)',
                        borderColor: supp.category === 'peptide' ? 'rgba(167,139,250,0.2)' : 'var(--cyan-border)',
                      }} className="mono">{supp.category}</span>
                    </div>
                    <div style={s.stackMeta}>
                      {supp.timing && <span className="mono" style={s.stackTiming}>{supp.timing}</span>}
                      {supp.notes && <span style={s.stackNotes}>{supp.notes}</span>}
                    </div>
                    <div style={s.stackActions}>
                      <button style={s.stackEditBtn} onClick={() => openEdit(supp)} className="mono">Edit</button>
                      <button style={s.stackInfoBtn} onClick={() => openSuppInfo(supp)} className="mono">Ask NOMIS</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── EXPLORE ── */}
        {tab === 'explore' && (
          <div style={s.section}>
            <div className="section-label" style={s.sLabel}>Ask NOMIS about supplements</div>
            <div className="card" style={s.exploreCard}>
              <div style={s.exploreHeader}>
                <div style={s.exploreOrb}>N</div>
                <div>
                  <div style={s.exploreTitle}>Supplement Intelligence</div>
                  <div style={s.exploreSub} className="mono">Research-backed answers personalized to your stack and goals</div>
                </div>
              </div>

              <div style={s.exploreInputRow}>
                <input
                  style={s.exploreInput}
                  placeholder="Ask anything — 'should I take ashwagandha?'"
                  value={aiQuery}
                  onChange={e => setAiQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') askNomis(aiQuery) }}
                />
                <button
                  style={{ ...s.exploreSend, opacity: aiLoading || !aiQuery.trim() ? 0.4 : 1 }}
                  onClick={() => askNomis(aiQuery)}
                  disabled={aiLoading || !aiQuery.trim()}
                >→</button>
              </div>

              {aiLoading && (
                <div style={s.aiLoading} className="mono">NOMIS is researching...</div>
              )}

              {aiResponse && !aiLoading && (
                <div style={s.aiResponse}>{aiResponse}</div>
              )}

              {!aiResponse && !aiLoading && (
                <div style={s.promptGrid}>
                  {[
                    'What supplements help with muscle recovery?',
                    'Should I add magnesium to my stack?',
                    'Best supplements for sleep quality?',
                    'What peptides help with body recomp?',
                    'Creatine timing and dosage?',
                    'How do my current supplements interact?',
                  ].map((prompt, i) => (
                    <div key={i} style={s.promptChip} onClick={() => { setAiQuery(prompt); askNomis(prompt) }}>
                      {prompt}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── AI Info Modal ── */}
        {showAI && (
          <div style={s.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) { setShowAI(false); setSelectedSupp(null); setAiResponse(null) } }}>
            <div style={s.modal} className="animate-fadeIn">
              <div style={s.modalHeader}>
                <div>
                  <span style={s.modalTitle}>{selectedSupp?.name || 'NOMIS Intelligence'}</span>
                  {selectedSupp?.dose && <div className="mono" style={s.modalSub}>{selectedSupp.dose} · {selectedSupp.timing || selectedSupp.category}</div>}
                </div>
                <button style={s.modalClose} onClick={() => { setShowAI(false); setSelectedSupp(null); setAiResponse(null) }}>
                  <span style={{ position: 'absolute', width: '14px', height: '1.5px', background: 'var(--text3)', transform: 'rotate(45deg)' }} />
                  <span style={{ position: 'absolute', width: '14px', height: '1.5px', background: 'var(--text3)', transform: 'rotate(-45deg)' }} />
                </button>
              </div>
              <div style={s.aiModalBody}>
                {aiLoading && <div style={s.aiLoading} className="mono">NOMIS is researching...</div>}
                {aiResponse && !aiLoading && <div style={s.aiModalResponse}>{aiResponse}</div>}
                <div style={s.followUp}>
                  <input
                    style={s.followUpInput}
                    placeholder="Ask a follow-up..."
                    value={aiQuery}
                    onChange={e => setAiQuery(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') askNomis(aiQuery) }}
                  />
                  <button
                    style={{ ...s.followUpSend, opacity: aiLoading || !aiQuery.trim() ? 0.4 : 1 }}
                    onClick={() => askNomis(aiQuery)}
                    disabled={aiLoading || !aiQuery.trim()}
                  >→</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Add/Edit Modal ── */}
        {showAdd && (
          <div style={s.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) { setShowAdd(false); setEditing(null) } }}>
            <div style={s.modal} className="animate-fadeIn">
              <div style={s.modalHeader}>
                <span style={s.modalTitle}>{editing ? 'Edit Supplement' : 'Add to Stack'}</span>
                <button style={s.modalClose} onClick={() => { setShowAdd(false); setEditing(null) }}>
                  <span style={{ position: 'absolute', width: '14px', height: '1.5px', background: 'var(--text3)', transform: 'rotate(45deg)' }} />
                  <span style={{ position: 'absolute', width: '14px', height: '1.5px', background: 'var(--text3)', transform: 'rotate(-45deg)' }} />
                </button>
              </div>
              <div style={s.formBody}>
                <div style={s.formLabel} className="mono">Name</div>
                <input style={s.input} placeholder="e.g. Creatine Monohydrate" value={form.name} onChange={e => updateForm('name', e.target.value)} />

                <div style={s.formLabel} className="mono">Category</div>
                <div style={s.catRow}>
                  {['supplement', 'peptide', 'vitamin', 'mineral', 'amino'].map(c => (
                    <button key={c} style={{
                      ...s.catChip,
                      ...(form.category === c ? s.catChipActive : {}),
                    }} onClick={() => updateForm('category', c)}>{c}</button>
                  ))}
                </div>

                <div style={s.formRow}>
                  <div style={s.formHalf}>
                    <div style={s.formLabel} className="mono">Dose</div>
                    <input style={s.input} placeholder="e.g. 5g" value={form.dose} onChange={e => updateForm('dose', e.target.value)} />
                  </div>
                  <div style={s.formHalf}>
                    <div style={s.formLabel} className="mono">Timing</div>
                    <input style={s.input} placeholder="e.g. Morning" value={form.timing} onChange={e => updateForm('timing', e.target.value)} />
                  </div>
                </div>

                <div style={s.formLabel} className="mono">Notes</div>
                <input style={s.input} placeholder="Optional notes" value={form.notes} onChange={e => updateForm('notes', e.target.value)} />

                <button
                  style={{ ...s.saveBtn, opacity: saving || !form.name.trim() ? 0.4 : 1 }}
                  onClick={handleSave}
                  disabled={saving || !form.name.trim()}
                >
                  {saving ? 'Saving...' : editing ? 'Save changes' : 'Add to stack'}
                </button>

                {editing && (
                  <button style={s.deleteBtn} onClick={handleDelete}>Remove from stack</button>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
      <NomisChat pageContext={`Stack page. ${stack.length} supplements, ${takenCount}/${stack.length} taken today. Stack: ${stack.map(s => s.name).join(', ')}`} />
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
    zIndex: 600, background: 'rgba(45,212,191,0.1)', border: '1px solid var(--teal-border)',
    borderRadius: '12px', padding: '10px 20px',
    fontSize: '0.6rem', color: 'var(--teal)', letterSpacing: '0.06em',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
  },

  tabBar: { display: 'flex', gap: '4px', padding: '16px 24px 24px' },
  tab: {
    padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)',
    background: 'transparent', color: 'var(--text3)', fontSize: '0.75rem',
    fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s',
  },
  tabActive: { background: 'var(--cyan-dim)', borderColor: 'var(--cyan-border)', color: 'var(--cyan)' },

  addSmBtn: {
    padding: '5px 12px', borderRadius: '6px', border: '1px solid var(--cyan-border)',
    background: 'var(--cyan-dim)', color: 'var(--cyan)', fontSize: '0.5rem',
    letterSpacing: '0.06em', cursor: 'pointer',
  },

  // Compliance
  compCard: { margin: '0 24px', padding: '20px', overflow: 'hidden' },
  compTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  compLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  compNum: { fontSize: '1.5rem', fontWeight: '700', lineHeight: 1 },
  compComplete: { fontSize: '0.48rem', color: 'var(--teal)', letterSpacing: '0.1em' },
  compMeta: { fontSize: '0.52rem', color: 'var(--text3)', letterSpacing: '0.06em' },
  compBar: { height: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '2px', overflow: 'hidden' },
  compFill: { height: '100%', borderRadius: '2px', transition: 'width 0.4s ease' },

  // Group labels
  groupLabel: {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '0 24px', marginBottom: '8px',
  },
  groupDot: { width: '6px', height: '6px', borderRadius: '50%' },
  groupText: { fontSize: '0.5rem', letterSpacing: '0.12em', fontWeight: '500' },
  groupCount: { fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.06em', marginLeft: 'auto' },

  // Checklist
  checklistCard: { margin: '0 24px', overflow: 'hidden' },
  checkRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 18px',
  },
  checkLeft: { display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', flex: 1 },
  checkBox: {
    width: '22px', height: '22px', borderRadius: '7px',
    border: '1.5px solid var(--border3)', background: 'transparent',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.2s', flexShrink: 0,
  },
  checkBoxOn: { background: 'var(--teal-dim)', borderColor: 'var(--teal-border)' },
  checkMark: { fontSize: '0.65rem', color: 'var(--teal)', fontWeight: '700' },
  checkName: { fontSize: '0.88rem', fontWeight: '500', color: 'var(--text)', transition: 'all 0.2s' },
  checkDose: { fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.04em', marginTop: '3px' },
  infoBtn: {
    width: '30px', height: '30px', borderRadius: '8px',
    background: 'var(--bg3)', border: '1px solid var(--border2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', flexShrink: 0,
  },
  infoBtnText: { fontSize: '0.7rem', color: 'var(--cyan)', fontWeight: '600' },

  // Stack list
  stackList: { display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 24px' },
  stackCard: { padding: '16px 18px' },
  stackCardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' },
  stackName: { fontSize: '0.92rem', fontWeight: '600', color: 'var(--text)' },
  stackDose: { fontSize: '0.52rem', color: 'var(--text3)', letterSpacing: '0.04em', marginTop: '3px' },
  catBadge: { fontSize: '0.42rem', padding: '3px 8px', borderRadius: '5px', border: '1px solid', letterSpacing: '0.08em', textTransform: 'uppercase' },
  stackMeta: { display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' },
  stackTiming: { fontSize: '0.52rem', color: 'var(--text3)', letterSpacing: '0.04em' },
  stackNotes: { fontSize: '0.75rem', color: 'var(--text2)', lineHeight: 1.4 },
  stackActions: { display: 'flex', gap: '8px' },
  stackEditBtn: {
    padding: '7px 14px', borderRadius: '7px', border: '1px solid var(--border)',
    background: 'transparent', color: 'var(--text3)', fontSize: '0.52rem',
    letterSpacing: '0.06em', cursor: 'pointer',
  },
  stackInfoBtn: {
    padding: '7px 14px', borderRadius: '7px', border: '1px solid var(--cyan-border)',
    background: 'var(--cyan-dim)', color: 'var(--cyan)', fontSize: '0.52rem',
    letterSpacing: '0.06em', cursor: 'pointer',
  },

  // Explore
  exploreCard: { margin: '0 24px', padding: '20px', overflow: 'hidden' },
  exploreHeader: { display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '20px' },
  exploreOrb: {
    width: '40px', height: '40px', borderRadius: '12px',
    background: 'linear-gradient(135deg, rgba(34,211,238,0.15), rgba(45,212,191,0.06))',
    border: '1px solid var(--cyan-border)',
    color: 'var(--cyan)', fontFamily: 'var(--font-body)',
    fontSize: '1rem', fontWeight: '700',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  exploreTitle: { fontSize: '0.95rem', fontWeight: '600', color: '#fff' },
  exploreSub: { fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.04em', marginTop: '3px' },
  exploreInputRow: { display: 'flex', gap: '8px', marginBottom: '16px' },
  exploreInput: {
    flex: 1, padding: '12px 14px', borderRadius: '10px',
    border: '1px solid var(--border2)', background: 'var(--bg3)',
    color: 'var(--text)', fontSize: '0.85rem', fontFamily: 'var(--font-body)', outline: 'none',
  },
  exploreSend: {
    width: '44px', height: '44px', borderRadius: '10px',
    background: 'var(--cyan-dim)', border: '1px solid var(--cyan-border)',
    color: 'var(--cyan)', fontSize: '1.2rem', fontWeight: '700',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-body)',
  },
  aiLoading: {
    padding: '20px', textAlign: 'center', fontSize: '0.55rem',
    color: 'var(--cyan)', letterSpacing: '0.08em',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  aiResponse: {
    fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.7,
    padding: '16px', background: 'var(--bg3)', borderRadius: '12px',
    border: '1px solid var(--border)', whiteSpace: 'pre-wrap',
  },
  promptGrid: { display: 'flex', flexDirection: 'column', gap: '6px' },
  promptChip: {
    padding: '10px 14px', background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--border)', borderRadius: '8px',
    fontSize: '0.78rem', color: 'var(--text3)', cursor: 'pointer', transition: 'all 0.15s',
  },

  // Empty
  emptyCard: { margin: '0 24px', padding: '40px 20px', textAlign: 'center' },
  emptyText: { fontSize: '0.6rem', color: 'var(--text3)', letterSpacing: '0.06em', marginBottom: '6px' },
  emptyHint: { fontSize: '0.72rem', color: 'var(--text3)', opacity: 0.6 },

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
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 20px 12px',
  },
  modalTitle: { fontSize: '1rem', fontWeight: '700', color: '#fff' },
  modalSub: { fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.06em', marginTop: '4px' },
  modalClose: {
    width: '28px', height: '28px', borderRadius: '7px', background: 'transparent',
    border: 'none', position: 'relative', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  aiModalBody: { padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' },
  aiModalResponse: { fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' },
  followUp: { display: 'flex', gap: '8px' },
  followUpInput: {
    flex: 1, padding: '11px 14px', borderRadius: '10px',
    border: '1px solid var(--border2)', background: 'var(--bg3)',
    color: 'var(--text)', fontSize: '0.82rem', fontFamily: 'var(--font-body)', outline: 'none',
  },
  followUpSend: {
    width: '40px', height: '40px', borderRadius: '10px',
    background: 'var(--cyan-dim)', border: '1px solid var(--cyan-border)',
    color: 'var(--cyan)', fontSize: '1.1rem', fontWeight: '700',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-body)',
  },

  // Form
  formBody: { padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' },
  formLabel: { fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '-4px' },
  formRow: { display: 'flex', gap: '10px' },
  formHalf: { flex: 1 },
  input: {
    width: '100%', padding: '12px 14px', borderRadius: '10px',
    border: '1px solid var(--border2)', background: 'var(--bg3)',
    color: 'var(--text)', fontSize: '0.88rem', fontFamily: 'var(--font-body)', outline: 'none',
  },
  catRow: { display: 'flex', flexWrap: 'wrap', gap: '5px' },
  catChip: {
    padding: '7px 12px', borderRadius: '7px', border: '1px solid var(--border)',
    background: 'transparent', color: 'var(--text3)', fontSize: '0.65rem',
    fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font-body)',
    textTransform: 'capitalize', transition: 'all 0.15s',
  },
  catChipActive: { background: 'var(--cyan-dim)', borderColor: 'var(--cyan-border)', color: 'var(--cyan)' },
  saveBtn: {
    width: '100%', padding: '15px', marginTop: '4px', borderRadius: '12px',
    border: '1px solid var(--cyan-border)',
    background: 'linear-gradient(135deg, rgba(34,211,238,0.10), rgba(45,212,191,0.05))',
    color: 'var(--cyan)', fontFamily: 'var(--font-body)',
    fontSize: '0.88rem', fontWeight: '600', cursor: 'pointer',
  },
  deleteBtn: {
    width: '100%', padding: '13px', borderRadius: '12px',
    border: '1px solid rgba(248,113,113,0.2)',
    background: 'rgba(248,113,113,0.04)',
    color: 'var(--red)', fontFamily: 'var(--font-mono)',
    fontSize: '0.6rem', fontWeight: '500', cursor: 'pointer', letterSpacing: '0.04em',
  },
}