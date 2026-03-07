import { dbRead } from './api'

export async function buildContext() {
  try {
    const today = new Date()
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const cutoff = thirtyDaysAgo.toISOString().split('T')[0]
    const todayStr = today.toISOString().split('T')[0]

    // Fetch everything in parallel
    const [
      workouts,
      workoutSets,
      sleep,
      cardio,
      bodyStats,
      prs,
      programs,
      supplements,
      peptides,
    ] = await Promise.allSettled([
      dbRead('workouts', {}, { order: 'date', limit: 30 }),
      dbRead('workout_sets', {}, { order: 'created_at', limit: 100 }),
      dbRead('sleep', {}, { order: 'date', limit: 30 }),
      dbRead('cardio', {}, { order: 'date', limit: 30 }),
      dbRead('body_stats', {}, { order: 'date', limit: 30 }),
      dbRead('personal_records', { category: 'strength' }, { order: 'date', limit: 50 }),
      dbRead('programs', { active: true }),
      dbRead('supplements', {}, { limit: 20 }),
      dbRead('peptide_cycles', {}, { limit: 5 }),
    ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : []))

    // Build PR map (best per exercise)
    const prMap = {}
    prs.forEach(pr => {
      if (!prMap[pr.metric] || parseFloat(pr.value) > parseFloat(prMap[pr.metric].value)) {
        prMap[pr.metric] = pr
      }
    })

    // Sleep stats
    const recentSleep = sleep.slice(-14)
    const avgSleep = recentSleep.length
      ? (recentSleep.reduce((a, b) => a + parseFloat(b.duration_hrs || 0), 0) / recentSleep.length).toFixed(1)
      : null
    const avgSleepQuality = recentSleep.length
      ? (recentSleep.reduce((a, b) => a + parseInt(b.quality || 3), 0) / recentSleep.length).toFixed(1)
      : null

    // Body stats
    const latestBody = bodyStats[bodyStats.length - 1]
    const firstBody  = bodyStats[0]
    const weightChange = latestBody && firstBody && latestBody.weight_lbs && firstBody.weight_lbs
      ? (parseFloat(latestBody.weight_lbs) - parseFloat(firstBody.weight_lbs)).toFixed(1)
      : null

    // Workout frequency
    const workoutDays = workouts.length
    const lastWorkout = workouts[workouts.length - 1]
    const daysSinceWorkout = lastWorkout
      ? Math.floor((new Date(todayStr) - new Date(lastWorkout.date)) / (1000 * 60 * 60 * 24))
      : null

    // Cardio stats
    const totalCardioMin = cardio.reduce((a, b) => a + parseInt(b.duration_min || 0), 0)
    const totalMiles = cardio.reduce((a, b) => a + parseFloat(b.distance_miles || 0), 0).toFixed(1)

    // Top PRs
    const topPRs = Object.values(prMap)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10)
      .map(pr => `${pr.metric}: ${pr.value} ${pr.unit}`)
      .join(', ')

    // Active program
    const activeProgram = programs[0]

    // Supplement list
    const suppList = supplements.map(s => s.name).join(', ')

    // Active peptide cycle
    const activePeptide = peptides[0]

    const context = `
=== NOMIS SYSTEM CONTEXT ===
You are NOMIS, Simon's personal AI trainer and life optimization assistant.
You have full access to Simon's health data for the last 30 days.
Today is ${todayStr}. Be direct, specific, and coaching-focused.
Do not be generic — reference Simon's actual data when answering.
Keep responses concise but substantive. Use Simon's real numbers.

=== SIMON'S PROFILE ===
Name: Simon
Current Program: ${activeProgram?.name || 'PPL Strength Recomp'}
Goal: Body recomposition — build muscle, cut fat simultaneously

=== WORKOUT DATA (Last 30 days) ===
Total sessions logged: ${workoutDays}
Days since last workout: ${daysSinceWorkout !== null ? daysSinceWorkout : 'unknown'}
Last session: ${lastWorkout ? `${lastWorkout.date} — ${lastWorkout.title || lastWorkout.muscle_group}` : 'none logged'}

=== PERSONAL RECORDS ===
${topPRs || 'No PRs logged yet'}

=== SLEEP DATA (Last 14 days) ===
Average duration: ${avgSleep ? `${avgSleep} hours` : 'no data'}
Average quality: ${avgSleepQuality ? `${avgSleepQuality}/5` : 'no data'}
Recent entries: ${recentSleep.slice(-5).map(s => `${s.date}: ${s.duration_hrs}h (quality ${s.quality}/5)`).join(', ') || 'none'}

=== BODY STATS ===
Current weight: ${latestBody?.weight_lbs ? `${latestBody.weight_lbs} lbs` : 'no data'}
Body fat: ${latestBody?.body_fat_pct ? `${latestBody.body_fat_pct}%` : 'no data'}
30-day weight change: ${weightChange ? `${parseFloat(weightChange) > 0 ? '+' : ''}${weightChange} lbs` : 'insufficient data'}
Last logged: ${latestBody?.date || 'never'}

=== CARDIO (Last 30 days) ===
Total sessions: ${cardio.length}
Total time: ${totalCardioMin} minutes
Total distance: ${totalMiles} miles
Activities: ${[...new Set(cardio.map(c => c.activity))].join(', ') || 'none logged'}

=== SUPPLEMENTS ===
${suppList || 'No supplements logged yet'}

=== PEPTIDES ===
${activePeptide ? `Active cycle: ${activePeptide.peptide_name || 'logged'} — started ${activePeptide.start_date}` : 'No active peptide cycle logged'}

=== END CONTEXT ===
`
    return context.trim()
  } catch (err) {
    return `
=== NOMIS SYSTEM CONTEXT ===
You are NOMIS, Simon's personal AI trainer and life optimization assistant.
Today is ${new Date().toISOString().split('T')[0]}.
Data context is temporarily unavailable — answer based on general fitness knowledge and ask Simon to share relevant details.
=== END CONTEXT ===
`.trim()
  }
}
