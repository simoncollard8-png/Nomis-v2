'use client'
import { useState, useEffect, useRef } from 'react'
import Nav from '../../../components/Nav'
import NomisChat from '../../../components/NomisChat'
import { logNutrition, getTodaysNutrition, getRecentNutrition, chat } from '../../../lib/api'

const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Pre-Workout', 'Post-Workout']

const GOALS = {
  calories: 2800,
  protein_g: 220,
  carbs_g: 280,
  fat_g: 80,
  water_oz: 100,
}

function MacroRing({ label, current, goal, color }) {
  const pct  = Math.min((current / goal) * 100, 100)
  const r    = 28
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  return (
    <div style={rs.ringWrap}>
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="5" />
        <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 36 36)"
          style={{ filter: `drop-shadow(0 0 4px ${color}88)`, transition: 'stroke-dasharray 0.6s ease' }} />
        <text x="36" y="40" textAnchor="middle"
          style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', fill: color, fontWeight: '500' }}>
          {Math.round(pct)}%
        </text>
      </svg>
      <div style={rs.ringLabel}>{label}</div>
      <div style={{ ...rs.ringVal, color }}>{current}<span style={rs.ringGoal}>/{goal}</span></div>
    </div>
  )
}

function MacroBar({ label, current, goal, color, unit = 'g' }) {
  const pct = Math.min((current / goal) * 100, 100)
  const over = current > goal
  return (
    <div style={bs.barWrap}>
      <div style={bs.barHeader}>
        <span style={bs.barLabel}>{label}</span>
        <span style={{ ...bs.barVal, color: over ? 'var(--red)' : color }}>
          {current}{unit} <span style={bs.barGoal}>/ {goal}{unit}</span>
        </span>
      </div>
      <div style={bs.barTrack}>
        <div style={{ ...bs.barFill, width: `${pct}%`, background: over ? 'var(--red)' : color,
          boxShadow: `0 0 6px ${over ? 'var(--red)' : color}88` }} />
      </div>
    </div>
  )
}

export default function Diet() {
  const [tab, setTab]           = useState('today')
  const [todayMeals, setTodayMeals] = useState([])
  const [history, setHistory]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [water, setWater]       = useState(0)
  const [parsing, setParsing]   = useState(false)
  const [nlInput, setNlInput]   = useState('')
  const [form, setForm]         = useState({
    date: new Date().toISOString().split('T')[0],
    meal: 'Lunch',
    description: '',
    calories: '',
    protein_g: '',
    carbs_g: '',
    fat_g: '',
    notes: '',
  })

  useEffect(() => {
    loadData()
    const savedWater = localStorage.getItem('nomis_water_' + new Date().toISOString().split('T')[0])
    if (savedWater) setWater(parseInt(savedWater))
  }, [])

  async function loadData() {
    const [today, hist] = await Promise.all([getTodaysNutrition(), getRecentNutrition(14)])
    setTodayMeals(today)
    setHistory(hist)
    setLoading(false)
  }

  function setF(key, val) { setForm(prev => ({ ...prev, [key]: val })) }

  async function handleSave() {
    if (!form.description && !form.calories) return
    setSaving(true)
    await logNutrition(form)
    setSaved(true)
    const updated = await getTodaysNutrition()
    setTodayMeals(updated)
    setForm(prev => ({ ...prev, description: '', calories: '', protein_g: '', carbs_g: '', fat_g: '', notes: '' }))
    setSaving(false)
    setTimeout(() => setSaved(false), 2500)
  }

  // Natural language parse via NOMIS
  async function handleNLParse() {
    if (!nlInput.trim()) return
    setParsing(true)
    try {
      const prompt = `Parse this food entry and return ONLY a JSON object with these fields (no explanation, no markdown):
{
  "meal": "Breakfast|Lunch|Dinner|Snack|Pre-Workout|Post-Workout",
  "description": "what was eaten",
  "calories": number or null,
  "protein_g": number or null,
  "carbs_g": number or null,
  "fat_g": number or null
}

Food entry: "${nlInput}"

Use your knowledge of typical nutritional values. Make reasonable estimates. Return only the JSON.`
      const res = await chat(prompt, [])
      if (res.response) {
        const cleaned = res.response.replace(/```json|```/g, '').trim()
        const parsed = JSON.parse(cleaned)
        setForm(prev => ({
          ...prev,
          meal: parsed.meal || prev.meal,
          description: parsed.description || nlInput,
          calories: parsed.calories?.toString() || '',
          protein_g: parsed.protein_g?.toString() || '',
          carbs_g: parsed.carbs_g?.toString() || '',
          fat_g: parsed.fat_g?.toString() || '',
        }))
        setNlInput('')
      }
    } catch (e) {
      setForm(prev => ({ ...prev, description: nlInput }))
    }
    setParsing(false)
  }

  function addWater(oz) {
    const newVal = Math.max(0, water + oz)
    setWater(newVal)
    localStorage.setItem('nomis_water_' + new Date().toISOString().split('T')[0], newVal)
  }

  // Today totals
  const totals = todayMeals.reduce((acc, m) => ({
    calories:  acc.calories  + (parseInt(m.calories)   || 0),
    protein_g: acc.protein_g + (parseFloat(m.protein_g) || 0),
    carbs_g:   acc.carbs_g   + (parseFloat(m.carbs_g)   || 0),
    fat_g:     acc.fat_g     + (parseFloat(m.fat_g)     || 0),
  }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 })

  const calPct = Math.round((totals.calories / GOALS.calories) * 100)

  // 7-day protein avg
  const last7 = history.slice(-7)
  const avgProtein = last7.length
    ? Math.round(last7.reduce((a,b) => a + (parseFloat(b.protein_g)||0), 0) / last7.length)
    : null

  const pageContext = `
User is on the Diet page.
Today's totals: ${totals.calories} cal, ${totals.protein_g}g protein, ${totals.carbs_g}g carbs, ${totals.fat_g}g fat.
Goals: ${GOALS.calories} cal, ${GOALS.protein_g}g protein.
Water: ${water} oz / ${GOALS.water_oz} oz goal.
Meals logged today: ${todayMeals.length}.
7-day avg protein: ${avgProtein || 'unknown'}g.
  `.trim()

  return (
    <div className="app-shell">
      <Nav />
      <main className="main-content">
        <div style={s.page}>
          <header className="pwa-header" style={s.header}>
            <div>
              <div className="page-title">DIET</div>
              <div className="page-sub">Macros · Meals · Water · Trends</div>
            </div>
            <div style={s.calBadge}>
              <div style={{ ...s.calNum, color: calPct >= 100 ? 'var(--red)' : 'var(--green)' }}>
                {totals.calories}
              </div>
              <div style={s.calLabel}>/ {GOALS.calories} kcal</div>
            </div>
          </header>
          <div className="progress-track">
            <div className="progress-fill" style={{
              width: `${Math.min(calPct, 100)}%`,
              background: calPct >= 100 ? 'var(--red)' : 'linear-gradient(90deg, var(--green), var(--cyan))',
              color: 'var(--green)'
            }} />
          </div>

          <div style={s.tabs}>
            {[['today','TODAY'],['log','LOG FOOD'],['water','WATER'],['trends','TRENDS']].map(([t,l]) => (
              <button key={t} style={{ ...s.tab, ...(tab===t ? s.tabActive:{}) }} onClick={() => setTab(t)}>{l}</button>
            ))}
          </div>

          {/* TODAY TAB */}
          {tab === 'today' && (
            <div style={s.body}>
              {/* Macro rings */}
              <div style={s.ringsRow}>
                <MacroRing label="PROTEIN" current={Math.round(totals.protein_g)} goal={GOALS.protein_g} color="var(--green)" />
                <MacroRing label="CARBS"   current={Math.round(totals.carbs_g)}   goal={GOALS.carbs_g}   color="var(--cyan)" />
                <MacroRing label="FAT"     current={Math.round(totals.fat_g)}     goal={GOALS.fat_g}     color="var(--orange)" />
                <MacroRing label="WATER"   current={water}                        goal={GOALS.water_oz}  color="var(--purple)" />
              </div>

              {/* Macro bars */}
              <div style={s.barsCard}>
                <MacroBar label="CALORIES" current={totals.calories}             goal={GOALS.calories}  color="var(--green)"  unit=" kcal" />
                <MacroBar label="PROTEIN"  current={Math.round(totals.protein_g)} goal={GOALS.protein_g} color="var(--green)"  />
                <MacroBar label="CARBS"    current={Math.round(totals.carbs_g)}   goal={GOALS.carbs_g}   color="var(--cyan)"   />
                <MacroBar label="FAT"      current={Math.round(totals.fat_g)}     goal={GOALS.fat_g}     color="var(--orange)" />
              </div>

              {/* Meals list */}
              <div style={s.mealsSection}>
                <div className="section-label">// TODAY'S MEALS ({todayMeals.length})</div>
                {todayMeals.length === 0 && (
                  <div style={s.empty}>Nothing logged yet — use Log Food tab or tell NOMIS what you ate</div>
                )}
                {todayMeals.map((m, i) => (
                  <div key={i} style={s.mealRow}>
                    <div style={s.mealLeft}>
                      <div style={s.mealTag}>{m.meal || 'Meal'}</div>
                      <div style={s.mealDesc}>{m.description || '—'}</div>
                    </div>
                    <div style={s.mealMacros}>
                      {m.calories && <span style={s.mealStat}>{m.calories} kcal</span>}
                      {m.protein_g && <span style={{ ...s.mealStat, color: 'var(--green)' }}>{m.protein_g}g P</span>}
                    </div>
                  </div>
                ))}
              </div>

              {/* NOMIS guidance */}
              {totals.protein_g < GOALS.protein_g * 0.5 && (
                <div style={s.alertCard}>
                  <span style={s.alertIcon}>⚡</span>
                  <span style={s.alertText}>
                    You're only {Math.round(totals.protein_g)}g into your {GOALS.protein_g}g protein goal.
                    {totals.calories < GOALS.calories * 0.4 ? ' And calories are low too — make sure you eat.' : ' Prioritize protein in your next meal.'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* LOG FOOD TAB */}
          {tab === 'log' && (
            <div style={s.body}>
              {/* Natural language input */}
              <div style={s.nlCard}>
                <div className="section-label">// TELL NOMIS WHAT YOU ATE</div>
                <div style={s.nlRow}>
                  <input
                    style={s.nlInput}
                    placeholder="e.g. 6 eggs, 2 cups rice, chicken breast and broccoli..."
                    value={nlInput}
                    onChange={e => setNlInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleNLParse()}
                  />
                  <button style={s.nlBtn} onClick={handleNLParse} disabled={parsing}>
                    {parsing ? '...' : '→'}
                  </button>
                </div>
                <div style={s.nlHint}>NOMIS will estimate macros automatically · Then review and save</div>
              </div>

              {/* Manual form */}
              <div style={s.formCard}>
                <div className="section-label">// MANUAL ENTRY</div>

                <div style={s.fieldRow}>
                  <div style={s.field}>
                    <label style={s.label}>DATE</label>
                    <input className="nomis-input" type="date" value={form.date} onChange={e => setF('date', e.target.value)} />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>MEAL</label>
                    <select className="nomis-select" value={form.meal} onChange={e => setF('meal', e.target.value)}>
                      {MEALS.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                </div>

                <div style={s.field}>
                  <label style={s.label}>DESCRIPTION</label>
                  <input className="nomis-input" type="text" placeholder="What did you eat?" value={form.description} onChange={e => setF('description', e.target.value)} />
                </div>

                <div style={s.fieldGrid4}>
                  <div style={s.field}>
                    <label style={s.label}>CALORIES</label>
                    <input className="nomis-input" type="number" placeholder="500" value={form.calories} onChange={e => setF('calories', e.target.value)} />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>PROTEIN (g)</label>
                    <input className="nomis-input" type="number" placeholder="40" value={form.protein_g} onChange={e => setF('protein_g', e.target.value)} />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>CARBS (g)</label>
                    <input className="nomis-input" type="number" placeholder="60" value={form.carbs_g} onChange={e => setF('carbs_g', e.target.value)} />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>FAT (g)</label>
                    <input className="nomis-input" type="number" placeholder="15" value={form.fat_g} onChange={e => setF('fat_g', e.target.value)} />
                  </div>
                </div>

                <div style={s.field}>
                  <label style={s.label}>NOTES (optional)</label>
                  <input className="nomis-input" type="text" placeholder="Cheat meal, restaurant, homemade..." value={form.notes} onChange={e => setF('notes', e.target.value)} />
                </div>

                <button className="nomis-btn" style={{ opacity: saving ? 0.5 : 1 }} onClick={handleSave} disabled={saving}>
                  {saving ? '● SAVING...' : saved ? '✓ SAVED' : '+ LOG MEAL'}
                </button>
              </div>
            </div>
          )}

          {/* WATER TAB */}
          {tab === 'water' && (
            <div style={s.body}>
              <div style={s.waterCard}>
                <div style={s.waterDisplay}>
                  <div style={s.waterNum}>{water}</div>
                  <div style={s.waterUnit}>oz</div>
                  <div style={s.waterGoal}>/ {GOALS.water_oz} oz goal</div>
                </div>

                <div style={s.waterBar}>
                  <div style={{ ...s.waterFill, width: `${Math.min((water/GOALS.water_oz)*100, 100)}%` }} />
                </div>

                <div style={s.waterBtns}>
                  {[8, 12, 16, 20, 32].map(oz => (
                    <button key={oz} style={s.waterBtn} onClick={() => addWater(oz)}>
                      +{oz} oz
                    </button>
                  ))}
                </div>

                <div style={s.waterSources}>
                  <div className="section-label" style={{ marginBottom: '12px' }}>// ALL LIQUIDS COUNT</div>
                  {[
                    { name: 'Water',         oz: 16 },
                    { name: 'Protein Shake', oz: 12 },
                    { name: 'Coffee',        oz: 8  },
                    { name: 'Tea',           oz: 8  },
                    { name: 'Sparkling',     oz: 12 },
                  ].map(src => (
                    <div key={src.name} style={s.sourceRow}>
                      <span style={s.sourceName}>{src.name}</span>
                      <button style={s.sourceBtn} onClick={() => addWater(src.oz)}>+ {src.oz} oz</button>
                    </div>
                  ))}
                </div>

                <button style={s.waterReset} onClick={() => { setWater(0); localStorage.setItem('nomis_water_' + new Date().toISOString().split('T')[0], 0) }}>
                  Reset Today
                </button>
              </div>
            </div>
          )}

          {/* TRENDS TAB */}
          {tab === 'trends' && (
            <div style={s.body}>
              <div className="section-label">// LAST 14 DAYS</div>

              {/* 7-day averages */}
              <div style={s.avgRow}>
                <div style={s.avgCard}>
                  <div style={s.avgVal}>{last7.length ? Math.round(last7.reduce((a,b) => a+(parseInt(b.calories)||0),0)/last7.length) : '—'}</div>
                  <div style={s.avgLbl}>AVG CALORIES</div>
                </div>
                <div style={s.avgCard}>
                  <div style={{ ...s.avgVal, color: 'var(--green)' }}>{avgProtein || '—'}g</div>
                  <div style={s.avgLbl}>AVG PROTEIN</div>
                </div>
                <div style={s.avgCard}>
                  <div style={{ ...s.avgVal, color: 'var(--cyan)' }}>
                    {last7.length ? Math.round(last7.reduce((a,b) => a+(parseFloat(b.carbs_g)||0),0)/last7.length) : '—'}g
                  </div>
                  <div style={s.avgLbl}>AVG CARBS</div>
                </div>
              </div>

              {/* History list */}
              {history.length === 0 && <div style={s.empty}>No nutrition history yet</div>}
              {[...new Set(history.map(h => h.date))].slice(0,14).map(date => {
                const dayMeals = history.filter(h => h.date === date)
                const dayTotals = dayMeals.reduce((acc,m) => ({
                  cal: acc.cal + (parseInt(m.calories)||0),
                  pro: acc.pro + (parseFloat(m.protein_g)||0),
                }), { cal: 0, pro: 0 })
                return (
                  <div key={date} style={s.trendRow}>
                    <div style={s.trendDate}>{new Date(date).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</div>
                    <div style={s.trendBars}>
                      <div style={s.trendBar}>
                        <div style={{ ...s.trendFill, width: `${Math.min((dayTotals.cal/GOALS.calories)*100,100)}%`, background: 'var(--green)' }} />
                      </div>
                    </div>
                    <div style={s.trendStats}>
                      <span style={s.trendCal}>{dayTotals.cal} kcal</span>
                      <span style={{ ...s.trendPro, color: dayTotals.pro >= GOALS.protein_g ? 'var(--green)' : 'var(--text3)' }}>
                        {Math.round(dayTotals.pro)}g P
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

        </div>
      </main>
      <NomisChat pageContext={pageContext} />
    </div>
  )
}

const s = {
  page: { minHeight:'100dvh', background:'var(--bg)', paddingBottom:'40px' },
  header: { display:'flex', alignItems:'flex-start', justifyContent:'space-between', padding:'24px 24px 18px', borderBottom:'1px solid var(--border)' },
  calBadge: { display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'2px' },
  calNum: { fontFamily:'var(--font-mono)', fontSize:'1.4rem', fontWeight:'500', lineHeight:1 },
  calLabel: { fontFamily:'var(--font-mono)', fontSize:'0.44rem', color:'var(--text3)', letterSpacing:'0.08em' },
  tabs: { display:'flex', borderBottom:'1px solid var(--border)', overflowX:'auto' },
  tab: { flex:1, padding:'12px 8px', background:'transparent', border:'none', borderBottom:'2px solid transparent', fontFamily:'var(--font-mono)', fontSize:'0.5rem', color:'var(--text3)', letterSpacing:'0.08em', cursor:'pointer', transition:'all 0.15s', whiteSpace:'nowrap' },
  tabActive: { color:'var(--green)', borderBottomColor:'var(--green)' },
  body: { padding:'20px', display:'flex', flexDirection:'column', gap:'14px' },
  ringsRow: { display:'flex', justifyContent:'space-around', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'14px', padding:'20px 10px' },
  barsCard: { background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'14px', padding:'18px', display:'flex', flexDirection:'column', gap:'12px' },
  mealsSection: {},
  mealRow: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 0', borderBottom:'1px solid var(--border)' },
  mealLeft: { flex:1, minWidth:0 },
  mealTag: { fontFamily:'var(--font-mono)', fontSize:'0.46rem', color:'var(--text3)', letterSpacing:'0.1em', marginBottom:'2px' },
  mealDesc: { fontFamily:'var(--font-display)', fontSize:'0.88rem', color:'var(--text)', fontWeight:'500', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
  mealMacros: { display:'flex', gap:'8px', alignItems:'center', flexShrink:0, marginLeft:'12px' },
  mealStat: { fontFamily:'var(--font-mono)', fontSize:'0.55rem', color:'var(--text2)', letterSpacing:'0.04em' },
  alertCard: { display:'flex', gap:'10px', alignItems:'flex-start', background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.18)', borderRadius:'12px', padding:'14px' },
  alertIcon: { fontSize:'1rem', flexShrink:0, marginTop:'1px' },
  alertText: { fontFamily:'var(--font-display)', fontSize:'0.82rem', color:'var(--text2)', lineHeight:1.5 },
  nlCard: { background:'linear-gradient(135deg,rgba(34,212,138,0.05),var(--bg2))', border:'1px solid rgba(34,212,138,0.15)', borderRadius:'14px', padding:'18px' },
  nlRow: { display:'flex', gap:'8px', marginBottom:'8px' },
  nlInput: { flex:1, background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:'9px', padding:'11px 14px', color:'var(--text)', fontFamily:'var(--font-display)', fontSize:'0.88rem', outline:'none' },
  nlBtn: { width:'44px', height:'44px', background:'var(--green-dim)', border:'1px solid var(--green-glow)', borderRadius:'9px', color:'var(--green)', fontSize:'1.2rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontFamily:'var(--font-display)', fontWeight:'700' },
  nlHint: { fontFamily:'var(--font-mono)', fontSize:'0.46rem', color:'var(--text4)', letterSpacing:'0.06em' },
  formCard: { background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'14px', padding:'18px' },
  fieldRow: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' },
  fieldGrid4: { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px' },
  field: { display:'flex', flexDirection:'column', gap:'6px', marginBottom:'12px' },
  label: { fontFamily:'var(--font-mono)', fontSize:'0.46rem', color:'var(--text3)', letterSpacing:'0.12em' },
  waterCard: { background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'14px', padding:'24px', display:'flex', flexDirection:'column', gap:'20px', alignItems:'center' },
  waterDisplay: { textAlign:'center' },
  waterNum: { fontFamily:'var(--font-mono)', fontSize:'3rem', fontWeight:'500', color:'var(--purple)', lineHeight:1 },
  waterUnit: { fontFamily:'var(--font-mono)', fontSize:'0.8rem', color:'var(--text3)', letterSpacing:'0.1em' },
  waterGoal: { fontFamily:'var(--font-mono)', fontSize:'0.52rem', color:'var(--text4)', marginTop:'4px', letterSpacing:'0.06em' },
  waterBar: { width:'100%', height:'6px', background:'var(--border)', borderRadius:'3px', overflow:'hidden' },
  waterFill: { height:'100%', background:'var(--purple)', borderRadius:'3px', transition:'width 0.4s ease', boxShadow:'0 0 8px rgba(167,139,250,0.5)' },
  waterBtns: { display:'flex', gap:'8px', flexWrap:'wrap', justifyContent:'center', width:'100%' },
  waterBtn: { padding:'9px 14px', background:'rgba(167,139,250,0.08)', border:'1px solid rgba(167,139,250,0.25)', borderRadius:'9px', color:'var(--purple)', fontFamily:'var(--font-mono)', fontSize:'0.6rem', letterSpacing:'0.06em', cursor:'pointer', transition:'all 0.15s' },
  waterSources: { width:'100%' },
  sourceRow: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--border)' },
  sourceName: { fontFamily:'var(--font-display)', fontSize:'0.88rem', color:'var(--text)' },
  sourceBtn: { padding:'6px 12px', background:'rgba(167,139,250,0.08)', border:'1px solid rgba(167,139,250,0.2)', borderRadius:'7px', color:'var(--purple)', fontFamily:'var(--font-mono)', fontSize:'0.52rem', cursor:'pointer' },
  waterReset: { background:'transparent', border:'1px solid var(--border)', borderRadius:'8px', padding:'8px 16px', color:'var(--text4)', fontFamily:'var(--font-mono)', fontSize:'0.5rem', letterSpacing:'0.08em', cursor:'pointer' },
  avgRow: { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'8px' },
  avgCard: { background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'10px', padding:'14px', textAlign:'center' },
  avgVal: { fontFamily:'var(--font-mono)', fontSize:'1.1rem', fontWeight:'500', color:'var(--green)', lineHeight:1, marginBottom:'4px' },
  avgLbl: { fontFamily:'var(--font-mono)', fontSize:'0.42rem', color:'var(--text4)', letterSpacing:'0.1em' },
  empty: { padding:'40px 20px', textAlign:'center', fontFamily:'var(--font-mono)', fontSize:'0.58rem', color:'var(--text4)', letterSpacing:'0.08em' },
  trendRow: { display:'flex', alignItems:'center', gap:'12px', padding:'10px 0', borderBottom:'1px solid var(--border)' },
  trendDate: { fontFamily:'var(--font-mono)', fontSize:'0.55rem', color:'var(--text2)', width:'80px', flexShrink:0 },
  trendBars: { flex:1 },
  trendBar: { height:'4px', background:'var(--border)', borderRadius:'2px', overflow:'hidden' },
  trendFill: { height:'100%', borderRadius:'2px', transition:'width 0.4s ease' },
  trendStats: { display:'flex', gap:'8px', flexShrink:0 },
  trendCal: { fontFamily:'var(--font-mono)', fontSize:'0.55rem', color:'var(--text2)' },
  trendPro: { fontFamily:'var(--font-mono)', fontSize:'0.55rem', letterSpacing:'0.04em' },
}

const rs = {
  ringWrap: { display:'flex', flexDirection:'column', alignItems:'center', gap:'4px' },
  ringLabel: { fontFamily:'var(--font-mono)', fontSize:'0.42rem', color:'var(--text4)', letterSpacing:'0.1em' },
  ringVal: { fontFamily:'var(--font-mono)', fontSize:'0.62rem', lineHeight:1 },
  ringGoal: { color:'var(--text4)' },
}

const bs = {
  barWrap: { display:'flex', flexDirection:'column', gap:'5px' },
  barHeader: { display:'flex', justifyContent:'space-between', alignItems:'center' },
  barLabel: { fontFamily:'var(--font-mono)', fontSize:'0.48rem', color:'var(--text3)', letterSpacing:'0.1em' },
  barVal: { fontFamily:'var(--font-mono)', fontSize:'0.62rem', fontWeight:'500' },
  barGoal: { color:'var(--text4)', fontWeight:'400' },
  barTrack: { height:'5px', background:'rgba(255,255,255,0.04)', borderRadius:'3px', overflow:'hidden' },
  barFill: { height:'100%', borderRadius:'3px', transition:'width 0.5s ease' },
}
