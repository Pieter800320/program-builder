import { useState, useEffect, useRef } from 'react'
import { filterExercises } from '../logic/filter'

const SUPERSET_COLORS = {
  A1: '#4f7cff', A2: '#4f7cff',
  B1: '#10b981', B2: '#10b981',
}

// ── Centered exercise picker modal ────────────────────────────────────────────
function ExercisePicker({ options, onSelect, onClose, supersetGroup }) {
  const [search, setSearch] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const filtered = search.trim()
    ? options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()))
    : options

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,.7)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        width: '100%',
        maxWidth: 480,
        maxHeight: '75vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
        }}>
          {supersetGroup && (
            <span style={{
              background: SUPERSET_COLORS[supersetGroup] || 'var(--accent)',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: 4,
            }}>{supersetGroup}</span>
          )}
          <input
            ref={inputRef}
            type="text"
            placeholder="Search exercises…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, fontSize: 15, padding: '8px 12px' }}
          />
          <button
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            style={{ fontSize: 18, flexShrink: 0 }}
          >×</button>
        </div>

        {/* Opposing pattern hint */}
        {(supersetGroup === 'A2' || supersetGroup === 'B2') && (
          <div style={{
            padding: '6px 16px',
            fontSize: 11,
            color: SUPERSET_COLORS[supersetGroup],
            background: 'var(--bg3)',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}>
            ↕ Opposing pattern shown first
          </div>
        )}

        {/* Exercise list */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
              No exercises found — try a different search
            </div>
          ) : (
            filtered.map(ex => (
              <div
                key={ex.name}
                onClick={() => onSelect(ex.name)}
                style={{
                  padding: '13px 16px',
                  fontSize: 14,
                  color: 'var(--text)',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'background .1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span>{ex.name}</span>
                <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 8, flexShrink: 0 }}>
                  {ex.patterns.join(' · ')}
                  {ex.unilateral ? ' · unilateral' : ''}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Count */}
        <div style={{
          padding: '8px 16px',
          fontSize: 11,
          color: 'var(--text3)',
          borderTop: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          {filtered.length} exercise{filtered.length !== 1 ? 's' : ''}
          {search ? ` matching "${search}"` : ''}
        </div>
      </div>
    </div>
  )
}

// ── Exercise row ──────────────────────────────────────────────────────────────
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
  const [showPicker, setShowPicker] = useState(false)

  useEffect(() => {
    // Sync exercise name if changed externally (e.g. smart fill)
  }, [exercise.exerciseName])

  const options = filterExercises(allExercises, {
    phase,
    patterns: dayPatterns,
    client,
    supersetGroup: exercise.supersetGroup || null,
  })

  function handleField(field, value) {
    onUpdate({ ...exercise, [field]: value })
  }

  function handleSelect(name) {
    onUpdate({ ...exercise, exerciseName: name })
    setShowPicker(false)
  }

  function handleClear(e) {
    e.stopPropagation()
    onUpdate({ ...exercise, exerciseName: '' })
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
        {/* Superset badge */}
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

        {/* Exercise name — tap to open picker */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <button
            onClick={() => setShowPicker(true)}
            style={{
              width: '100%',
              background: 'var(--bg3)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '8px 32px 8px 10px',
              textAlign: 'left',
              color: exercise.exerciseName ? 'var(--text)' : 'var(--text3)',
              fontSize: 13,
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              transition: 'border-color .15s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            {exercise.exerciseName || 'tap to select exercise…'}
            {exercise.exerciseName && (
              <span
                onClick={handleClear}
                style={{
                  position: 'absolute', right: 8, top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text3)', fontSize: 16,
                  lineHeight: 1,
                }}
              >×</span>
            )}
          </button>
          {exercise.exerciseName && !allExercises.some(
            ex => ex.name.toLowerCase() === exercise.exerciseName.toLowerCase()
          ) && (
            <span style={{ fontSize: 10, color: 'var(--warning)', paddingLeft: 4 }}>
              ⚠ not in database — consider adding via + Exercise
            </span>
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
          >{showNotes ? '▲' : '▼'}</button>
          <button
            className="btn btn-ghost btn-icon"
            title="AI coaching cues"
            onClick={handleGenerateNotes}
            disabled={!exercise.exerciseName || aiLoading}
          >{aiLoading ? <span className="loader" /> : '✦'}</button>
          <button
            className="btn btn-ghost btn-icon"
            title="Remove"
            onClick={onRemove}
          >×</button>
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

      {showPicker && (
        <ExercisePicker
          options={options}
          onSelect={handleSelect}
          onClose={() => setShowPicker(false)}
          supersetGroup={sg}
        />
      )}
    </div>
  )
}
