const NOMIS_KEY = process.env.NEXT_PUBLIC_NOMIS_KEY

const headers = {
  'Content-Type': 'application/json',
  'x-nomis-key': NOMIS_KEY
}

import { getLocalDate } from '../lib/date'

// ── Core DB helpers ─────────────────────────────────────────────────────────

export async function dbRead(table, filters = {}, options = {}) {
  const params = new URLSearchParams()
  if (Object.keys(filters).length) params.append('filters', JSON.stringify(filters))
  if (options.order) params.append('order', options.order)
  if (options.limit) params.append('limit', options.limit)
  const res = await fetch(`/api/supabase/${table}?${params}`, { headers })
  const data = await res.json()
  return data.data || []
}

export async function dbWrite(table, action, data, filters = null) {
  const body = { table, action, data }
  if (filters) body.filters = filters
  const res = await fetch('/api/supabase', {
    method: 'POST', headers, body: JSON.stringify(body)
  })
  return await res.json()
}

export async function chat(message, history = [], image = null) {
  const body = { message }
  if (image) body.image = image
  const res = await fetch('/api/chat', {
    method: 'POST', headers,
    body: JSON.stringify(body)
  })
  return await res.json()
}

// ── Workout helpers ─────────────────────────────────────────────────────────

export async function getTodaysWorkout() {
  const today = getLocalDate()
  const rows = await dbRead('workouts', { date: today }, { limit: 1 })
  return rows[0] || null
}

export async function getTodaysSummary() {
  const today = getLocalDate()
  const [workouts, nutrition, sleep] = await Promise.all([
    dbRead('workouts', { date: today }, { limit: 1 }),
    dbRead('nutrition', { date: today }),
    dbRead('sleep', { date: today }, { limit: 1 })
  ])
  return { workout: workouts[0] || null, nutrition, sleep: sleep[0] || null }
}

export async function startWorkout(workout) {
  const res = await dbWrite('workouts', 'insert', {
    date: workout.date || getLocalDate(),
    title: workout.title || workout.muscle_group || 'Workout',
    muscle_group: workout.muscle_group || workout.type || null,
    exercises: workout.exercises || [],
    status: 'in_progress'
  })
  return res?.data?.[0] || null
}

export async function saveSets(workoutId, exercise, sets) {
  const rows = sets.map(s => ({
    workout_id: workoutId,
    exercise_name: exercise.name,
    muscle_group: exercise.muscle_group || null,
    set_number: s.set,
    weight_lbs: s.weight,
    reps: s.reps
  }))
  return dbWrite('workout_sets', 'upsert', rows)
}

export async function checkAndSavePR(exercise, sets) {
  if (!sets?.length) return null
  const maxWeight = Math.max(...sets.map(s => Number(s.weight) || 0))
  if (!maxWeight) return null
  const existing = await dbRead('personal_records', { exercise_name: exercise.name }, { limit: 1 })
  const currentPR = existing[0]?.weight_lbs || 0
  if (maxWeight > currentPR) {
    await dbWrite('personal_records', 'upsert', {
      exercise_name: exercise.name,
      weight_lbs: maxWeight,
      date: getLocalDate()
    })
    return maxWeight
  }
  return null
}

export async function getRecentWorkouts(days = 14) {
  return dbRead('workouts', {}, { order: 'date.desc', limit: days })
}

export async function getWorkoutSets(workoutId) {
  return dbRead('workout_sets', { workout_id: workoutId }, { order: 'set_number.asc' })
}

export async function getPersonalRecords() {
  return dbRead('personal_records', {}, { order: 'weight_lbs.desc' })
}

// ── Body / Sleep / Cardio helpers ───────────────────────────────────────────

export async function getRecentBodyStats(days = 14) {
  return dbRead('body_stats', {}, { order: 'date.desc', limit: days })
}

export async function getRecentSleep(days = 7) {
  return dbRead('sleep', {}, { order: 'date.desc', limit: days })
}

export async function getRecentCardio(days = 30) {
  return dbRead('cardio', {}, { order: 'date.desc', limit: days })
}

// ── Nutrition helpers ───────────────────────────────────────────────────────

export async function getTodaysNutrition() {
  const today = getLocalDate()
  return dbRead('nutrition', { date: today })
}

export async function getRecentNutrition(days = 30) {
  return dbRead('nutrition', {}, { order: 'date.desc', limit: days })
}

export async function logNutrition(entry) {
  return dbWrite('nutrition', 'insert', {
    date: entry.date || getLocalDate(),
    meal_type: entry.meal_type,
    description: entry.description || null,
    calories: entry.calories || 0,
    protein_g: entry.protein_g || 0,
    carbs_g: entry.carbs_g || 0,
    fat_g: entry.fat_g || 0
  })
}

// ── Exercise AI helpers (calls /api/exercise) ───────────────────────────────

export async function getExerciseInfo(exerciseName) {
  const res = await fetch('/api/exercise', {
    method: 'POST', headers,
    body: JSON.stringify({ type: 'info', exercise_name: exerciseName })
  })
  const json = await res.json()
  return json.data || null
}

export async function suggestExercises(muscleGroup, count = 5, context = '') {
  const res = await fetch('/api/exercise', {
    method: 'POST', headers,
    body: JSON.stringify({ type: 'suggest', muscle_group: muscleGroup, count, context })
  })
  const json = await res.json()
  return json.data || []
}

export async function getSwapOptions(exerciseName, context = '') {
  const res = await fetch('/api/exercise', {
    method: 'POST', headers,
    body: JSON.stringify({ type: 'swap', exercise_name: exerciseName, context })
  })
  const json = await res.json()
  return json.data || []
}