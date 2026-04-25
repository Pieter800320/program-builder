import { useState, useRef, useEffect } from 'react'
import { filterExercises } from '../logic/filter'

const SUPERSET_COLORS = {
  A1: '#4f7cff', A2: '#4f7cff',
  B1: '#10b981', B2: '#10b981',
}

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
  const [search, setSearch] = useState(exercise.exerciseName || '')
  const [open, setOpen] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState({})
  const dropdownRef = useRef(null)
  const inputRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Keep search in sync when exercise changes externally (e.g. smart fill)
  useEffect(() => {
    setSearch(exercise.exerciseName || '')
  }, [exercise.exerciseName])

  const options = filterExercises(allExercises, {
    phase,
    patterns: dayPatterns,
    client,
    supersetGroup: exercise.supersetGroup || null,
  })

  // Filter by search text
  const filtered = search && search !== exercise.exerciseName
    ? options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()))
    : options

  function handleField(field, value) {
    onUpdate({ ...exercise, [field]: value })
  }

  function handleSelect(name) {
    setSearch(name)
    setOpen(false)
    onUpdate({ ...exercise, exerciseName: name })
    inputRef.current?.blur()
  }

  function openDropdown() {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const showAbove = spaceBelow < 220 && rect.top > 220
      setDropdownStyle({
        top: showAbove ? undefined : rect.bottom + 4,
        bottom: showAbove ? window.innerHeight - rect.top + 4 : undefined,
        left: rect.left,
        width: rect.width,
      })
    }
    setOpen(true)
  }

  function handleSearchChange(e) {
    const val = e.target.value
    setSearch(val)
    onUpdate({ ...exercise, exerciseName: val })
    openDropdown()
  }

  function handleClear() {
    setSearch('')
    onUpdate({ ...exercise, exerciseName: '' })
    setOpen(true)
    inputRef.current?.focus()
  }

  async function handleGenerateNotes() {
    if (!exercise.exerciseName || !onGenerateNotes) return
    const notes = await onGenerateNotes(exercise.exerciseName)
    if (notes) onUpdate({ ...exercise, notes, showNotes: true })
    setShowNotes(true)
  }

  const sg = exercise.supersetGroup

  return (
    <div>
      <div className="exercise-row">
        {/* Superset label badge */}
        {sg && (
          <div style={{
            background: SUPERSET_COLORS[sg] || 'var(--accent)',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: 4,
            alignSelf: 'center',
            flexShrink: 0,
            letterSpacing: '.04em',
            minWidth: 28,
            textAlign: 'center',
          }}>
            {sg}
          </div>
        )}

        {/* Searchable exercise input with dropdown */}
        <div
          ref={dropdownRef}
          className="exercise-name-wrap"
          style={{ position: 'relative', flex: 1 }}
        >
          <div style={{ position: 'relative' }}>
            <input
              ref={inputRef}
              type="text"
              placeholder="search or type exercise…"
              value={search}
              onChange={handleSearchChange}
              onFocus={() => openDropdown()}
              style={{ paddingRight: 28 }}
            />
            {search && (
              <button
                onMouseDown={e => { e.preventDefault(); handleClear() }}
                style={{
                  position: 'absolute', right: 8, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none',
                  color: 'var(--text3)', fontSize: 16,
                  cursor: 'pointer', lineHeight: 1, padding: 0,
                }}
              >×</button>
            )}
          </div>

          {open && filtered.length > 0 && (
            <div className="exercise-dropdown" style={dropdownStyle}>
              {/* Group header if opposing slot */}
              {(sg === 'A2' || sg === 'B2') && (
                <div style={{
                  padding: '6px 12px 4px',
                  fontSize: 10,
                  color: SUPERSET_COLORS[sg],
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '.06em',
                  borderBottom: '1px solid var(--border)',
                }}>
                  Opposing pattern shown first
                </div>
              )}
              {filtered.slice(0, 20).map(ex => (
                <div
                  key={ex.name}
                  className="exercise-dropdown-item"
                  onMouseDown={() => handleSelect(ex.name)}
                >
                  <span>{ex.name}</span>
                  {ex.unilateral && (
                    <span style={{ fontSize: 9, color: 'var(--text3)', marginLeft: 6 }}>unilateral</span>
                  )}
                </div>
              ))}
              {filtered.length > 20 && (
                <div className="exercise-dropdown-more">
                  +{filtered.length - 20} more — type to search
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
            className="btn btn-ghost btn-icon"
            title="AI coaching cues"
            onClick={handleGenerateNotes}
            disabled={!exercise.exerciseName || aiLoading}
          >
            {aiLoading ? <span className="loader" /> : '✦'}
          </button>
          <button
            className="btn btn-ghost btn-icon"
            title="Remove"
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
