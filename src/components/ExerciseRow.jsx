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
  const [showDropdown, setShowDropdown] = useState(false)
  const [search, setSearch] = useState(exercise.exerciseName || '')

  const options = filterExercises(allExercises, {
    phase,
    patterns: dayPatterns,
    client,
  })

  // Filter by search text
  const filtered = search
    ? options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()))
    : options

  function handleField(field, value) {
    onUpdate({ ...exercise, [field]: value })
  }

  function handleSelect(name) {
    setSearch(name)
    setShowDropdown(false)
    onUpdate({ ...exercise, exerciseName: name })
  }

  function handleSearchChange(e) {
    const val = e.target.value
    setSearch(val)
    onUpdate({ ...exercise, exerciseName: val })
    setShowDropdown(true)
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
        {/* Editable exercise name with dropdown */}
        <div className="exercise-name-wrap" style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="type or select exercise…"
            value={search}
            onChange={handleSearchChange}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            style={{ fontSize: 13 }}
          />
          {showDropdown && filtered.length > 0 && (
            <div className="exercise-dropdown">
              {filtered.slice(0, 12).map(ex => (
                <div
                  key={ex.name}
                  className="exercise-dropdown-item"
                  onMouseDown={() => handleSelect(ex.name)}
                >
                  {ex.name}
                </div>
              ))}
              {filtered.length > 12 && (
                <div className="exercise-dropdown-more">
                  +{filtered.length - 12} more — keep typing to filter
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sets + Reps */}
        <div className="exercise-row-meta">
          <input
            type="text"
            placeholder="sets"
            value={exercise.sets}
            onChange={e => handleField('sets', e.target.value)}
          />
          <input
            type="text"
            placeholder="reps"
            value={exercise.reps}
            onChange={e => handleField('reps', e.target.value)}
          />
        </div>

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
