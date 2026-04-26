import { useState } from 'react'
import ExerciseRow from './ExerciseRow'
import { makeEmptyExercise, PHASE_DEFAULTS, PHASE_COLORS, PHASE_LABELS } from '../logic/split'

const PHASE_EDUCATION = {
  warmup: {
    duration: '5-10 min',
    content: `Soft tissue work and general movement preparation. Raise core temperature and improve tissue extensibility — not exhaust the body.

Typical content:
  • Foam rolling on key areas (lats, glutes, thoracic spine)
  • Light cardio (bike, row, walk) to raise heart rate
  • Dynamic movement — moving through range, not holding static stretches

Rusin principle: The warmup is a precursor to everything that follows. Rushing it means your activation, primer and KPI will all suffer. 5-10 minutes is the minimum investment.`,
  },
  activation: {
    duration: '5-8 min — 2-3 sets of 5-10 reps',
    content: `Targeted muscle activation of the body's powerhouse muscles: glutes and lats primarily, plus any weak links specific to this client.

Typical content:
  • Glute activation (bridges, clamshells, banded walks)
  • Lat and upper back (face pulls, band pull-aparts, scapular push-ups)
  • Corrective work for known weak links or injury history

Rusin principle: High mind-muscle connection — squeeze the target muscle as hard as possible. Common mistake: doing too much here and causing pre-fatigue before the KPI. Activate, do not annihilate.`,
  },
  primer: {
    duration: '5-8 min — 2-3 sets of 2-5 reps MAX',
    content: `Two sub-phases that directly prepare the nervous system for the KPI.

Mechanical Primer: 1-2 movement-specific exercises at low load matching the KPI pattern. Grooves the motor pattern before loading it.

Neurological Primer: 1-2 explosive CNS-activating movements matched to the day:
  • Squat day → vertical jump or box jump
  • Hinge/deadlift day → broad jump or bound
  • Press day → med ball chest pass or slam
  • Pull day → explosive row

Rusin principle: Low volume, HIGH intent. Never exceed 15 total reps. The goal is neural activation, not fatigue. This phase separates good programs from great ones.`,
  },
  kpi: {
    duration: '15-25 min — 3-5 sets, 3-8 reps, 2-4 min rest',
    content: `The heart of the session. Where strength and hypertrophy are built. Everything before this was preparation for this moment.

Typical content:
  • 1-2 compound movements from the 6 foundational patterns (squat, hinge, push, pull, lunge, carry)
  • Heavy load relative to training goal
  • Low-to-moderate reps: 3-8 for strength, 6-12 for hypertrophy
  • Full rest periods — do not rush this

Rusin principle: The KPI is non-negotiable. Never compromise the primary movement for accessory volume. If short on time, cut the finisher — not the KPI. Select movements the client can execute with excellent technique under load and progress week over week.`,
  },
  accessory: {
    duration: '15-20 min — 3 sets of 8-15 reps, 45-90s rest between pairs',
    content: `2-4 exercises in antagonist superset pairs. Strategic pairing of opposing muscle groups allows one to recover while the other works — more volume, less fatigue.

Structure:
  • A1 + A2 = first superset pair (perform back-to-back, then rest 2-3 min)
  • B1 + B2 = second superset pair (perform back-to-back, then rest 2-3 min)

Pairing examples:
  • Push (A1) + Pull (A2) — e.g. DB Press + Cable Row
  • Knee dominant (A1) + Hip dominant (A2) — e.g. Split Squat + RDL
  • Bilateral (A1) + Unilateral (A2) — e.g. Bench Press + Single-arm Row
  • Vertical push (A1) + Vertical pull (A2) — e.g. OHP + Lat Pulldown

Rusin principle: Accessories complement the KPI — they do not compete with it. Moderate load, high tension, controlled tempo.`,
  },
  finisher: {
    duration: '5-10 min — 1 exercise or complex',
    content: `One high-density conditioning piece. Builds work capacity, creates metabolic stress, and develops mental toughness.

Typical content:
  • Loaded carries (farmer, suitcase, overhead) — Rusin's favourite finisher tool
  • Kettlebell or dumbbell complexes (chain of exercises, no rest between)
  • High-rep conditioning circuits
  • Interval machine work (bike, rower, ski erg)

Rusin principle: The finisher should feel hard but not break you. 5-10 minutes maximum. If you cannot execute the KPI well because of previous fatigue — you programmed it wrong. One exercise or complex, not a full workout.`,
  },
  cooldown: {
    duration: '5 min',
    content: `A 3-phase recovery sequence to begin adaptation and reduce soreness.

Phase 1 — Soft tissue: Light foam rolling or self-massage on trained areas
Phase 2 — Static stretching: 30-60 second holds on tight areas. This is the correct time for static stretching (not the warmup).
Phase 3 — Breathing: Diaphragmatic breathing to shift from sympathetic (training) to parasympathetic (recovery) state.

Rusin principle: Recovery begins the moment training ends. Clients who skip the cooldown consistently leave adaptation on the table. 5 minutes is the minimum.`,
  },
}

const SUPERSET_LABELS = ['A1', 'A2', 'B1', 'B2']
const SUPERSET_COLORS = { A1: '#4f7cff', A2: '#4f7cff', B1: '#10b981', B2: '#10b981' }

export default function PhaseSection({
  phaseBlock,
  allExercises,
  client,
  onUpdate,
  onGenerateNotes,
  aiLoading,
}) {
  const [open, setOpen] = useState(['kpi', 'accessory'].includes(phaseBlock.phase))
  const [showInfo, setShowInfo] = useState(false)

  const { phase, exercises, patterns } = phaseBlock
  const defaults = PHASE_DEFAULTS[phase]
  const color = PHASE_COLORS[phase]
  const label = PHASE_LABELS[phase]
  const edu = PHASE_EDUCATION[phase]

  function updateExercise(index, updated) {
    const next = [...exercises]
    next[index] = updated
    onUpdate({ ...phaseBlock, exercises: next })
  }

  function removeExercise(index) {
    const next = exercises.filter((_, i) => i !== index)
    onUpdate({ ...phaseBlock, exercises: next.length ? next : [makeEmptyExercise()] })
  }

  function addExercise(supersetGroup = null) {
    const ex = {
      ...makeEmptyExercise(),
      sets: defaults.sets,
      reps: defaults.reps,
      supersetGroup,
    }
    onUpdate({ ...phaseBlock, exercises: [...exercises, ex] })
  }

  const filledCount = exercises.filter(ex => ex.exerciseName).length
  const usedLabels = new Set(exercises.map(ex => ex.supersetGroup).filter(Boolean))
  const availableLabels = SUPERSET_LABELS.filter(l => !usedLabels.has(l))

  return (
    <div className="phase-block">
      <div className="phase-header" onClick={() => setOpen(o => !o)}>
        <div className="phase-dot" style={{ background: color }} />
        <span className="phase-label" style={{ color }}>{label}</span>
        {filledCount > 0 && (
          <span className="badge badge-success" style={{ marginLeft: 8 }}>{filledCount}</span>
        )}
        <button
          className="btn btn-ghost btn-icon"
          style={{ marginLeft: 'auto', fontSize: 13, padding: '2px 8px', color: showInfo ? color : 'var(--text3)' }}
          onClick={e => { e.stopPropagation(); setShowInfo(s => !s) }}
          title="Rusin methodology guide"
        >
          ℹ
        </button>
        <span className={`phase-chevron ${open ? 'open' : ''}`}>▶</span>
      </div>

      {showInfo && edu && (
        <div style={{
          background: 'var(--bg3)',
          borderBottom: '1px solid var(--border)',
          padding: '14px 16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '.06em' }}>
              {label} — Rusin Guide
            </span>
            {edu?.duration && (
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>{edu.duration}</span>
            )}
          </div>
          <pre style={{
            fontSize: 12,
            lineHeight: 1.8,
            color: 'var(--text2)',
            whiteSpace: 'pre-wrap',
            fontFamily: 'inherit',
            margin: 0,
          }}>
            {edu.content}
          </pre>
        </div>
      )}

      {open && (
        <div className="phase-body">
          {exercises.map((ex, i) => (
            <ExerciseRow
              key={ex.id}
              exercise={ex}
              phase={phase}
              dayPatterns={patterns}
              allExercises={allExercises}
              client={client}
              onUpdate={updated => updateExercise(i, updated)}
              onRemove={() => removeExercise(i)}
              onGenerateNotes={onGenerateNotes ? name => onGenerateNotes(name, phase) : null}
              aiLoading={aiLoading}
            />
          ))}

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            {phase === 'accessory' && availableLabels.map(sl => (
              <button
                key={sl}
                className="add-exercise-btn"
                style={{ width: 'auto', padding: '5px 14px', borderColor: SUPERSET_COLORS[sl], color: SUPERSET_COLORS[sl] }}
                onClick={() => addExercise(sl)}
              >
                + {sl}
              </button>
            ))}
            <button
              className="add-exercise-btn"
              style={{ flex: 1 }}
              onClick={() => addExercise(null)}
            >
              + add exercise
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
