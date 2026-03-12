import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export function authenticate(request) {
  const token = request.headers.get('x-nomis-key')
  return token && token === process.env.NOMIS_API_KEY
}

export async function loadChatHistory(limit = 50) {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('role, content')
      .order('created_at', { ascending: true })
      .limit(limit)
    if (error) return []
    return (data || []).map(msg => ({ role: msg.role, content: msg.content }))
  } catch { return [] }
}

export async function saveMessage(role, content, parsedData = null) {
  try {
    await supabase.from('chat_messages').insert({ role, content, parsed_data: parsedData })
  } catch (err) { console.error('Message save error:', err) }
}

export async function loadUserContext() {
  const context = []
  try {
    const { data: workouts } = await supabase.from('workouts').select('*').order('date', { ascending: false }).limit(5)
    if (workouts?.length) {
      context.push('RECENT WORKOUTS:\n' + workouts.map(w =>
        `- ${w.date}: ${w.title || w.muscle_group} ${w.feeling ? `(${w.feeling})` : ''}`
      ).join('\n'))
    }

    const { data: stats } = await supabase.from('body_stats').select('*').order('date', { ascending: false }).limit(1)
    if (stats?.length) {
      const s = stats[0]
      context.push(`CURRENT STATS: ${s.weight_lbs}lbs${s.body_fat_pct ? `, ${s.body_fat_pct}% BF` : ''} (${s.date})`)
    }

    const { data: sleep } = await supabase.from('sleep').select('*').order('date', { ascending: false }).limit(3)
    if (sleep?.length) {
      context.push('RECENT SLEEP:\n' + sleep.map(s =>
        `- ${s.date}: ${s.duration_hrs || s.duration_hours}hrs (${s.quality})`
      ).join('\n'))
    }

    const { data: peptides } = await supabase.from('peptide_cycles').select('*').eq('status', 'active').limit(1)
    if (peptides?.length) {
      const p = peptides[0]
      context.push(`ACTIVE PEPTIDE CYCLE: ${p.stack_name} — started ${p.start_date}, ${p.cycle_days} day cycle. ${p.dose_details || ''}`)
    }

    const today = new Date().toISOString().split('T')[0]
    const { data: meals } = await supabase.from('nutrition').select('*').eq('date', today)
    if (meals?.length) {
      const totals = meals.reduce((acc, m) => ({
        cal: acc.cal + (m.calories || 0),
        pro: acc.pro + (m.protein_g || 0),
        carb: acc.carb + (m.carbs_g || 0),
        fat: acc.fat + (m.fat_g || 0)
      }), { cal: 0, pro: 0, carb: 0, fat: 0 })
      context.push(`TODAY'S NUTRITION: ${totals.cal} cal, ${totals.pro}g protein, ${totals.carb}g carbs, ${totals.fat}g fat (${meals.length} meals logged)`)
    }
  } catch (err) { console.error('Context load error:', err) }

  return context.join('\n\n')
}