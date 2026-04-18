import { useState } from 'react'
import { filterExercises } from '../logic/filter'

export default function ExerciseRow({
  exercise,
  phase,
  dayPatterns,
  allExercises,
  client,
  onUpdate,
  onRemove,
  onGenerateNotes,
  aiLoading,
}) {
  const [showNotes, setShowNotes] = useState(exercise.showNotes || false)

  const options = filterExercises(allExercises, {
    phase,
    patterns: dayPatterns,
    client,
  })

  // Always include current selection even if it no longer passes filter
  const inOptions = options.some(o => o.name === exercise.exerciseName)
  const allOptions = inOptions
    ? options
    : exercise.exerciseName
      ? [{ name: exercise.exerciseName, _score: 0 }, ...options]
      : options

  function handleField(field, value) {
    onUpdate({ ...exercise, [field]: value })
  }

  async function handleGenerateNotes() {
    if (!exercise.exerciseName || !onGenerateNotes) return
    const notes = await onGenerateNotes(exercise.exerciseName)
    if (notes) onUpdate({ ...exercise, notes, showNotes: true })
    setShowNotes(true)
  }

  return (
    <div>
      <div className="exercise-row">
        {/* Exercise dropdown */}
        <select
          value={exercise.exerciseName}
          onChange={e => handleField('exerciseName', e.target.value)}
        >
          <option value="">— select exercise —</option>
          {allOptions.map(ex => (
            <option key={ex.name} value={ex.name}>{ex.name}</option>
          ))}
        </select>

        {/* Sets */}
        <input
          type="text"
          placeholder="sets"
          value={exercise.sets}
          onChange={e => handleField('sets', e.target.value)}
        />

        {/* Reps */}
        <input
          type="text"
          placeholder="reps"
          value={exercise.reps}
          onChange={e => handleField('reps', e.target.value)}
        />

        {/* Actions */}
        <div className="ex-actions">
          <button
            className="btn btn-ghost btn-icon"
            title="Toggle notes"
            onClick={() => setShowNotes(s => !s)}
          >
            {showNotes ? '▲' : '▼'}
          </button>
          <button
            className="btn btn-ghost btn-icon ex-note-btn"
            title="AI coaching cues"
            onClick={handleGenerateNotes}
            disabled={!exercise.exerciseName || aiLoading}
          >
            {aiLoading ? <span className="loader" /> : '✦'}
          </button>
          <button
            className="btn btn-ghost btn-icon"
            title="Remove exercise"
            onClick={onRemove}
          >
            ×
          </button>
        </div>
      </div>

      {showNotes && (
        <div className="exercise-notes-row">
          <textarea
            rows={2}
            placeholder="Coaching cues, tempo, notes…"
            value={exercise.notes}
            onChange={e => handleField('notes', e.target.value)}
          />
        </div>
      )}
    </div>
  )
}
