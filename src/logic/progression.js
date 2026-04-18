/**
 * Apply a 4-week progression model to a program.
 * Week 1: baseline
 * Week 2: +volume (reps +2)
 * Week 3: +intensity (load note added)
 * Week 4: deload (volume -20%, finisher optional)
 */

export const WEEK_LABELS = ['Week 1', 'Week 2', 'Week 3', 'Week 4']

export function applyProgression(days, week, adaptation = 'normal') {
  return days.map(day => ({
    ...day,
    phases: day.phases.map(phaseBlock => ({
      ...phaseBlock,
      exercises: phaseBlock.exercises.map(ex => {
        if (!ex.exerciseName) return ex
        return adjustExercise(ex, phaseBlock.phase, week, adaptation)
      }),
    })),
  }))
}

function adjustExercise(ex, phase, week, adaptation) {
  const baseReps = parseInt(ex.reps) || 0
  const baseSets = parseInt(ex.sets) || 0

  // Deload overrides everything
  if (week === 4 || adaptation === 'fatigued') {
    const deloadReps = baseReps > 0 ? Math.max(baseReps - 2, 5) : ''
    const deloadSets = baseSets > 0 ? Math.max(baseSets - 1, 2) : ''
    return {
      ...ex,
      sets: String(deloadSets || ex.sets),
      reps: String(deloadReps || ex.reps),
      notes: ex.notes
        ? ex.notes + ' | Deload: reduce load ~30%'
        : 'Deload: reduce load ~30%',
    }
  }

  if (adaptation === 'progressing') {
    return {
      ...ex,
      notes: ex.notes
        ? ex.notes + ' | Progress: increase load if last set felt easy'
        : 'Progress: increase load if last set felt easy',
    }
  }

  // Normal progression
  if (week === 1) return ex

  if (week === 2) {
    // Volume: +2 reps on accessory/finisher, +1 set on KPI
    if (phase === 'kpi') {
      return { ...ex, sets: String(baseSets + 1 || ex.sets) }
    }
    if (['accessory', 'finisher'].includes(phase)) {
      return { ...ex, reps: String(baseReps + 2 || ex.reps) }
    }
  }

  if (week === 3) {
    // Intensity: note to increase load, keep volume
    return {
      ...ex,
      notes: ex.notes
        ? ex.notes + ' | W3: increase load 5–10%, maintain reps'
        : 'W3: increase load 5–10%, maintain reps',
    }
  }

  return ex
}
