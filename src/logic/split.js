/**
 * Generate a weekly training split template based on client profile.
 * Each day defines which movement patterns belong in each phase.
 * The filter engine uses these patterns to narrow the exercise dropdowns.
 */

const BASE_PHASES = ['warmup', 'activation', 'primer', 'kpi', 'accessory', 'finisher', 'cooldown']

// Default sets/reps per phase
export const PHASE_DEFAULTS = {
  warmup:     { sets: '',  reps: '',   rest: '',    duration: '5–10 min' },
  activation: { sets: '2', reps: '10', rest: '30s', duration: '5–8 min' },
  primer:     { sets: '3', reps: '5',  rest: '60s', duration: '5–8 min' },
  kpi:        { sets: '4', reps: '6',  rest: '3min',duration: '15–20 min' },
  accessory:  { sets: '3', reps: '12', rest: '90s', duration: '15–20 min' },
  finisher:   { sets: '3', reps: '15', rest: '45s', duration: '5–8 min' },
  cooldown:   { sets: '',  reps: '',   rest: '',    duration: '5 min' },
}

export const PHASE_COLORS = {
  warmup:     '#0ea5e9',
  activation: '#8b5cf6',
  primer:     '#6366f1',
  kpi:        '#f59e0b',
  accessory:  '#10b981',
  finisher:   '#ef4444',
  cooldown:   '#64748b',
}

export const PHASE_LABELS = {
  warmup:     'Warmup',
  activation: 'Activation',
  primer:     'Primer',
  kpi:        'KPI',
  accessory:  'Accessory',
  finisher:   'Finisher',
  cooldown:   'Cooldown',
}

function makeDay(label, title, patternMap) {
  // patternMap: { phase: [patterns] } — empty array means "any"
  const phases = BASE_PHASES.map(phase => ({
    phase,
    patterns: patternMap[phase] || [],
    exercises: [makeEmptyExercise()],
  }))
  return { label, title, phases }
}

export function makeEmptyExercise() {
  return {
    id: crypto.randomUUID(),
    exerciseName: '',
    sets: '',
    reps: '',
    notes: '',
    showNotes: false,
  }
}

export function generateSplit(client) {
  const n = Math.min(client.sessions_per_week || 3, 6)

  if (n <= 2) return twoDay()
  if (n === 3) return threeDay()
  if (n === 4) return fourDay()
  if (n === 5) return fiveDay()
  return sixDay()
}

function twoDay() {
  return [
    makeDay('Day 1', 'Full Body — Push Focus', {
      primer:    ['hinge'],
      kpi:       ['push', 'squat'],
      accessory: ['pull', 'core'],
      finisher:  ['conditioning'],
    }),
    makeDay('Day 2', 'Full Body — Pull Focus', {
      primer:    ['hinge'],
      kpi:       ['pull', 'hinge'],
      accessory: ['push', 'core'],
      finisher:  ['conditioning'],
    }),
  ]
}

function threeDay() {
  return [
    makeDay('Day 1', 'Push + Squat', {
      primer:    ['squat'],
      kpi:       ['push', 'squat'],
      accessory: ['push', 'core'],
      finisher:  ['conditioning'],
    }),
    makeDay('Day 2', 'Pull + Hinge', {
      primer:    ['hinge'],
      kpi:       ['pull', 'hinge'],
      accessory: ['pull', 'core'],
      finisher:  ['conditioning'],
    }),
    makeDay('Day 3', 'Full Body + Carry', {
      primer:    ['lunge'],
      kpi:       ['squat', 'pull'],
      accessory: ['push', 'carry'],
      finisher:  ['conditioning'],
    }),
  ]
}

function fourDay() {
  return [
    makeDay('Day 1', 'Upper — Push', {
      primer:    ['push'],
      kpi:       ['push'],
      accessory: ['push', 'core'],
      finisher:  ['conditioning'],
    }),
    makeDay('Day 2', 'Lower — Squat', {
      primer:    ['squat'],
      kpi:       ['squat', 'lunge'],
      accessory: ['hinge', 'core'],
      finisher:  ['conditioning'],
    }),
    makeDay('Day 3', 'Upper — Pull', {
      primer:    ['pull'],
      kpi:       ['pull'],
      accessory: ['pull', 'core'],
      finisher:  ['conditioning'],
    }),
    makeDay('Day 4', 'Lower — Hinge', {
      primer:    ['hinge'],
      kpi:       ['hinge', 'lunge'],
      accessory: ['squat', 'carry'],
      finisher:  ['conditioning'],
    }),
  ]
}

function fiveDay() {
  return [
    makeDay('Day 1', 'Upper — Push', {
      primer:    ['push'],
      kpi:       ['push'],
      accessory: ['push', 'core'],
      finisher:  ['conditioning'],
    }),
    makeDay('Day 2', 'Lower — Squat', {
      primer:    ['squat'],
      kpi:       ['squat', 'lunge'],
      accessory: ['hinge', 'core'],
      finisher:  ['conditioning'],
    }),
    makeDay('Day 3', 'Upper — Pull', {
      primer:    ['pull'],
      kpi:       ['pull'],
      accessory: ['pull', 'core'],
      finisher:  ['conditioning'],
    }),
    makeDay('Day 4', 'Lower — Hinge', {
      primer:    ['hinge'],
      kpi:       ['hinge', 'lunge'],
      accessory: ['squat', 'carry'],
      finisher:  ['conditioning'],
    }),
    makeDay('Day 5', 'Full Body + Conditioning', {
      primer:    ['hinge'],
      kpi:       ['squat', 'pull'],
      accessory: ['push', 'carry'],
      finisher:  ['conditioning', 'explosive'],
    }),
  ]
}

function sixDay() {
  const five = fiveDay()
  five.push(
    makeDay('Day 6', 'Active Recovery / Mobility', {
      warmup:    [],
      activation:['core'],
      kpi:       [],
      accessory: ['core', 'rotation'],
      cooldown:  [],
    })
  )
  return five
}
