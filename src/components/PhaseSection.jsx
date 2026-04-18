import { useState } from 'react'
import ExerciseRow from './ExerciseRow'
import { makeEmptyExercise, PHASE_DEFAULTS, PHASE_COLORS, PHASE_LABELS } from '../logic/split'

export default function PhaseSection({
  phaseBlock,
  allExercises,
  client,
  onUpdate,
  onGenerateNotes,
  aiLoading,
}) {
  const [open, setOpen] = useState(
    ['kpi', 'accessory'].includes(phaseBlock.phase)
  )

  const { phase, exercises, patterns } = phaseBlock
  const defaults = PHASE_DEFAULTS[phase]
  const color = PHASE_COLORS[phase]
  const label = PHASE_LABELS[phase]

  function updateExercise(index, updated) {
    const next = [...exercises]
    next[index] = updated
    onUpdate({ ...phaseBlock, exercises: next })
  }

  function removeExercise(index) {
    const next = exercises.filter((_, i) => i !== index)
    onUpdate({ ...phaseBlock, exercises: next.length ? next : [makeEmptyExercise()] })
  }

  function addExercise() {
    const ex = makeEmptyExercise()
    // Apply phase defaults
    ex.sets = defaults.sets
    ex.reps = defaults.reps
    onUpdate({ ...phaseBlock, exercises: [...exercises, ex] })
  }

  const filledCount = exercises.filter(ex => ex.exerciseName).length

  return (
    <div className="phase-block">
      <div className="phase-header" onClick={() => setOpen(o => !o)}>
        <div className="phase-dot" style={{ background: color }} />
        <span className="phase-label" style={{ color }}>{label}</span>
        {defaults.duration && (
          <span className="phase-meta">{defaults.duration}</span>
        )}
        {defaults.sets && (
          <span className="phase-meta" style={{ marginLeft: 8 }}>
            {defaults.sets}×{defaults.reps}
          </span>
        )}
        {filledCount > 0 && (
          <span
            className="badge badge-success"
            style={{ marginLeft: 8 }}
          >
            {filledCount}
          </span>
        )}
        <span className={`phase-chevron ${open ? 'open' : ''}`}>▶</span>
      </div>

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
              onGenerateNotes={
                onGenerateNotes
                  ? name => onGenerateNotes(name, phase)
                  : null
              }
              aiLoading={aiLoading}
            />
          ))}
          <button className="add-exercise-btn" onClick={addExercise}>
            + add exercise
          </button>
        </div>
      )}
    </div>
  )
}
