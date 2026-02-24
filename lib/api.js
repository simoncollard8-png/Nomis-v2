const MIDDLEWARE_URL = process.env.NEXT_PUBLIC_MIDDLEWARE_URL
const NOMIS_KEY = process.env.NEXT_PUBLIC_NOMIS_KEY

const headers = {
  'Content-Type': 'application/json',
  'x-nomis-key': NOMIS_KEY
}

// Read from any table
export async function dbRead(table, filters = {}, options = {}) {
  const params = new URLSearchParams()
  if (Object.keys(filters).length) params.append('filters', JSON.stringify(filters))
  if (options.order) params.append('order', options.order)
  if (options.limit) params.append('limit', options.limit)

  const res = await fetch(`${MIDDLEWARE_URL}/supabase/${table}?${params}`, { headers })
  const data = await res.json()
  return data.data || []
}

// Write to any table
export async function dbWrite(table, action, data, filters = null) {
  const body = { table, action, data }
  if (filters) body.filters = filters

  const res = await fetch(`${MIDDLEWARE_URL}/supabase`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })
  const result = await res.json()
  return result
}

// Chat with NOMIS
export async function chat(message, history = []) {
  const res = await fetch(`${MIDDLEWARE_URL}/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message, conversation_history: history })
  })
  return await res.json()
}

// Get today's workout plan
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

  return {
    program: program.name,
    program_id: program.id,
    plan_id: plan.id,
    day: today,
    muscle_group: plan.muscle_group,
    exercises
  }
}

// Start a workout session
export async function startWorkout(workout) {
  const today = new Date().toISOString().split('T')[0]
  const result = await dbWrite('workouts', 'insert', {
    date: today,
    muscle_group: workout.muscle_group,
    title: `${workout.day} — ${workout.muscle_group}`,
    description: workout.exercises.map(e => e.name).join(', '),
    feeling: null,
    duration_min: null
  })
  return result.data?.[0] || null
}

// Save completed sets for an exercise
export async function saveSets(workoutId, exercise, setData) {
  const setsToSave = setData
    .filter(s => s.weight || s.reps)
    .map(s => ({
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

// Check and save personal records
export async function checkAndSavePR(exercise, setData) {
  const today = new Date().toISOString().split('T')[0]
  const maxWeight = Math.max(...setData.map(s => parseFloat(s.weight) || 0))
  if (!maxWeight) return null

  const existing = await dbRead('personal_records', {
    category: 'strength',
    metric: exercise.name
  })

  const currentPR = existing.length ? Math.max(...existing.map(r => parseFloat(r.value) || 0)) : 0

  if (maxWeight > currentPR) {
    await dbWrite('personal_records', 'insert', {
      category: 'strength',
      metric: exercise.name,
      value: maxWeight,
      unit: 'lbs',
      date: today,
      notes: `New PR — ${maxWeight} lbs`
    })
    return maxWeight
  }
  return null
}

// Get recent workouts
export async function getRecentWorkouts(limit = 7) {
  return await dbRead('workouts', {}, { order: 'date', limit })
}

// Get personal records
export async function getPersonalRecords() {
  return await dbRead('personal_records', { category: 'strength' }, { order: 'date' })
}

// Log sleep
export async function logSleep(data) {
  return await dbWrite('sleep', 'insert', {
    date: data.date || new Date().toISOString().split('T')[0],
    duration_hrs: data.duration_hrs,
    quality: data.quality,
    bedtime: data.bedtime || null,
    wake_time: data.wake_time || null,
    notes: data.notes || null
  })
}

// Log cardio
export async function logCardio(data) {
  return await dbWrite('cardio', 'insert', {
    date: data.date || new Date().toISOString().split('T')[0],
    activity: data.activity,
    duration_min: data.duration_min,
    distance_miles: data.distance_miles || null,
    avg_heart_rate: data.avg_heart_rate || null,
    calories_burned: data.calories_burned || null,
    notes: data.notes || null
  })
}

// Log body stats
export async function logBodyStats(data) {
  return await dbWrite('body_stats', 'insert', {
    date: data.date || new Date().toISOString().split('T')[0],
    weight_lbs: data.weight_lbs,
    body_fat_pct: data.body_fat_pct || null,
    notes: data.notes || null
  })
}
