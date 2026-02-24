const MIDDLEWARE_URL = process.env.NEXT_PUBLIC_MIDDLEWARE_URL
const NOMIS_KEY = process.env.NEXT_PUBLIC_NOMIS_KEY

const headers = {
  'Content-Type': 'application/json',
  'x-nomis-key': NOMIS_KEY
}

export async function dbRead(table, filters = {}, options = {}) {
  const params = new URLSearchParams()
  if (Object.keys(filters).length) params.append('filters', JSON.stringify(filters))
  if (options.order) params.append('order', options.order)
  if (options.limit) params.append('limit', options.limit)
  const res = await fetch(`${MIDDLEWARE_URL}/supabase/${table}?${params}`, { headers })
  const data = await res.json()
  return data.data || []
}

export async function dbWrite(table, action, data, filters = null) {
  const body = { table, action, data }
  if (filters) body.filters = filters
  const res = await fetch(`${MIDDLEWARE_URL}/supabase`, {
    method: 'POST', headers, body: JSON.stringify(body)
  })
  return await res.json()
}

export async function chat(message, history = []) {
  const res = await fetch(`${MIDDLEWARE_URL}/chat`, {
    method: 'POST', headers,
    body: JSON.stringify({ message, conversation_history: history })
  })
  return await res.json()
}

export async function getTodaysWorkout() {
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const today = days[new Date().getDay()]
  const programs = await dbRead('programs', { active: true })
  if (!programs.length) return null
  const program = programs[0]
  const plans = await dbRead('workout_plans', { program_id: program.id, day_of_week: today })
  if (!plans.length) return null
  const plan = plans[0]
  const planExercises = await dbRead('workout_plan_exercises', { plan_id: plan.id }, { order: 'order_index' })
  const allExercises = await dbRead('exercises')
  const exerciseMap = Object.fromEntries(allExercises.map(e => [e.id, e]))
  const exercises = planExercises.map(pe => ({
    id: pe.id,
    exercise_id: pe.exercise_id,
    name: exerciseMap[pe.exercise_id]?.name || 'Unknown',
    muscle_group: exerciseMap[pe.exercise_id]?.muscle_group || '',
    equipment: exerciseMap[pe.exercise_id]?.equipment || '',
    sets: pe.target_sets,
    reps: pe.target_reps,
    notes: pe.notes,
    done: false
  }))
  return { program: program.name, program_id: program.id, plan_id: plan.id, day: today, muscle_group: plan.muscle_group, exercises }
}

export async function startWorkout(workout) {
  const today = new Date().toISOString().split('T')[0]
  const result = await dbWrite('workouts', 'insert', {
    date: today,
    muscle_group: workout.muscle_group,
    title: `${workout.day} — ${workout.muscle_group}`,
    description: workout.exercises.map(e => e.name).join(', '),
    feeling: null, duration_min: null
  })
  return result.data?.[0] || null
}

export async function saveSets(workoutId, exercise, setData) {
  const setsToSave = setData.filter(s => s.weight || s.reps).map(s => ({
    workout_id: workoutId,
    exercise_id: exercise.exercise_id,
    exercise_name: exercise.name,
    set_number: s.set,
    reps_completed: parseInt(s.reps) || null,
    weight_lbs: parseFloat(s.weight) || null,
    notes: null
  }))
  if (!setsToSave.length) return null
  return await dbWrite('workout_sets', 'insert', setsToSave)
}

export async function checkAndSavePR(exercise, setData) {
  const today = new Date().toISOString().split('T')[0]
  const maxWeight = Math.max(...setData.map(s => parseFloat(s.weight) || 0))
  if (!maxWeight) return null
  const existing = await dbRead('personal_records', { category: 'strength', metric: exercise.name })
  const currentPR = existing.length ? Math.max(...existing.map(r => parseFloat(r.value) || 0)) : 0
  if (maxWeight > currentPR) {
    await dbWrite('personal_records', 'insert', {
      category: 'strength', metric: exercise.name, value: maxWeight,
      unit: 'lbs', date: today, notes: `New PR — ${maxWeight} lbs`
    })
    return maxWeight
  }
  return null
}

export async function getRecentWorkouts(limit = 30) {
  return await dbRead('workouts', {}, { order: 'date', limit })
}

export async function getWorkoutSets(workoutId) {
  return await dbRead('workout_sets', { workout_id: workoutId }, { order: 'created_at' })
}

export async function getPersonalRecords() {
  return await dbRead('personal_records', { category: 'strength' }, { order: 'date' })
}

export async function getRecentSleep(limit = 14) {
  return await dbRead('sleep', {}, { order: 'date', limit })
}

export async function getRecentCardio(limit = 14) {
  return await dbRead('cardio', {}, { order: 'date', limit })
}

export async function getRecentBodyStats(limit = 14) {
  return await dbRead('body_stats', {}, { order: 'date', limit })
}

export async function logSleep(data) {
  return await dbWrite('sleep', 'insert', {
    date: data.date || new Date().toISOString().split('T')[0],
    duration_hrs: parseFloat(data.duration_hrs),
    quality: data.quality || null,
    bedtime: data.bedtime || null,
    wake_time: data.wake_time || null,
    notes: data.notes || null
  })
}

export async function logCardio(data) {
  return await dbWrite('cardio', 'insert', {
    date: data.date || new Date().toISOString().split('T')[0],
    activity: data.activity,
    duration_min: parseInt(data.duration_min) || null,
    distance_miles: parseFloat(data.distance_miles) || null,
    avg_heart_rate: parseInt(data.avg_heart_rate) || null,
    calories_burned: parseInt(data.calories_burned) || null,
    notes: data.notes || null
  })
}

export async function logBodyStats(data) {
  return await dbWrite('body_stats', 'insert', {
    date: data.date || new Date().toISOString().split('T')[0],
    weight_lbs: parseFloat(data.weight_lbs) || null,
    body_fat_pct: parseFloat(data.body_fat_pct) || null,
    chest_in: parseFloat(data.chest_in) || null,
    waist_in: parseFloat(data.waist_in) || null,
    hips_in: parseFloat(data.hips_in) || null,
    arms_in: parseFloat(data.arms_in) || null,
    thighs_in: parseFloat(data.thighs_in) || null,
    notes: data.notes || null
  })
}

export async function logNutrition(data) {
  return await dbWrite('nutrition', 'insert', {
    date: data.date || new Date().toISOString().split('T')[0],
    meal: data.meal || null,
    description: data.description || null,
    calories: parseInt(data.calories) || null,
    protein_g: parseFloat(data.protein_g) || null,
    carbs_g: parseFloat(data.carbs_g) || null,
    fat_g: parseFloat(data.fat_g) || null,
    sodium_mg: parseInt(data.sodium_mg) || null,
    notes: data.notes || null
  })
}

export async function getTodaysNutrition() {
  const today = new Date().toISOString().split('T')[0]
  return await dbRead('nutrition', { date: today }, { order: 'created_at' })
}

export async function getRecentNutrition(limit = 7) {
  return await dbRead('nutrition', {}, { order: 'date', limit })
}

export async function logSupplement(data) {
  return await dbWrite('supplement_logs', 'insert', {
    date: data.date || new Date().toISOString().split('T')[0],
    supplement_id: data.supplement_id || null,
    name: data.name,
    dose: data.dose || null,
    notes: data.notes || null
  })
}

export async function getSupplements() {
  return await dbRead('supplements', {}, { order: 'name' })
}

export async function getPeptideCycles() {
  return await dbRead('peptide_cycles', {}, { order: 'start_date', limit: 10 })
}

export async function logPeptideDose(data) {
  return await dbWrite('peptide_logs', 'insert', {
    cycle_id: data.cycle_id,
    date: data.date || new Date().toISOString().split('T')[0],
    time_taken: data.time_taken || null,
    dose_mcg: data.dose_mcg || null,
    notes: data.notes || null
  })
}

export async function getTodaysSummary() {
  const today = new Date().toISOString().split('T')[0]
  const [workouts, sleep, cardio, bodyStats, nutrition] = await Promise.all([
    dbRead('workouts', { date: today }),
    dbRead('sleep', { date: today }),
    dbRead('cardio', { date: today }),
    dbRead('body_stats', { date: today }),
    dbRead('nutrition', { date: today }),
  ])
  return { workouts, sleep, cardio, bodyStats, nutrition, date: today }
}

export async function getDashboardData() {
  const [workouts, sleep, cardio, bodyStats] = await Promise.all([
    getRecentWorkouts(7),
    getRecentSleep(7),
    getRecentCardio(7),
    getRecentBodyStats(14),
  ])
  return { workouts, sleep, cardio, bodyStats }
}

export async function getExerciseInfo(exercise_name) {
  const res = await fetch(`${MIDDLEWARE_URL}/exercises`, {
    method: 'POST', headers,
    body: JSON.stringify({ type: 'info', exercise_name })
  })
  const data = await res.json()
  return data.data || null
}

export async function suggestExercises(muscle_group, count = 5, context = '') {
  const res = await fetch(`${MIDDLEWARE_URL}/exercises`, {
    method: 'POST', headers,
    body: JSON.stringify({ type: 'suggest', muscle_group, count, context })
  })
  const data = await res.json()
  return data.data || []
}

export async function getSwapOptions(exercise_name, context = '') {
  const res = await fetch(`${MIDDLEWARE_URL}/exercises`, {
    method: 'POST', headers,
    body: JSON.stringify({ type: 'swap', exercise_name, context })
  })
  const data = await res.json()
  return data.data || []
}
