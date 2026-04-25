import { useState } from 'react'

const DEFAULT_WEEKS = [
  {
    id: 1,
    label: 'Week 1',
    title: 'Learn & Groove',
    description: 'Dial in technique with conservative loading. Focus on movement quality over weight. Stop 2-3 reps short of failure on all sets.',
  },
  {
    id: 2,
    label: 'Week 2',
    title: 'Build',
    description: 'Small load or rep increases on KPI lifts. Add 1-2 reps or 2.5-5kg where technique allows. Accessories: add 1 set or 2 reps.',
  },
  {
    id: 3,
    label: 'Week 3',
    title: 'Progress',
    description: 'Best performance week. Push closer to true effort on KPI. Maintain clean technique — no grinding reps. This is your peak week.',
  },
  {
    id: 4,
    label: 'Week 4',
    title: 'Peak / Consolidate',
    description: 'Top-quality sets, no grinders. Maintain load from Week 3 but focus on execution. Reduce volume slightly if fatigued.',
  },
  {
    id: 5,
    label: 'Week 5',
    title: 'Deload',
    description: 'Active recovery. Reduce load by 40-50% OR cut volume in half (sets or reps). Same movements, same technique — just significantly lighter. Let the body absorb the previous 4 weeks.',
  },
]

export default function ProgressionTable({ weeks, onChange }) {
  const [editingId, setEditingId] = useState(null)

  function updateWeek(id, field, value) {
    onChange(weeks.map(w => w.id === id ? { ...w, [field]: value } : w))
  }

  function addWeek() {
    const nextId = Math.max(...weeks.map(w => w.id), 0) + 1
    onChange([...weeks, {
      id: nextId,
      label: `Week ${nextId}`,
      title: '',
      description: '',
    }])
    setEditingId(nextId)
  }

  function removeWeek(id) {
    if (weeks.length <= 1) return
    onChange(weeks.filter(w => w.id !== id))
    if (editingId === id) setEditingId(null)
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text2)' }}>
          Progression Plan
        </span>
        <button
          className="btn btn-ghost btn-sm"
          onClick={addWeek}
          style={{ fontSize: 12 }}
        >
          + Add week
        </button>
      </div>

      <div style={{
        border: '1px solid var(--border)',
        borderRadius: 8,
        overflow: 'hidden',
      }}>
        {weeks.map((week, i) => (
          <div
            key={week.id}
            style={{
              borderBottom: i < weeks.length - 1 ? '1px solid var(--border)' : 'none',
            }}
          >
            {/* Week header row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 14px',
                cursor: 'pointer',
                background: editingId === week.id ? 'var(--bg3)' : 'var(--bg2)',
                gap: 10,
                transition: 'background .15s',
              }}
              onClick={() => setEditingId(editingId === week.id ? null : week.id)}
            >
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--accent)',
                minWidth: 52,
                flexShrink: 0,
              }}>
                {week.label}
              </span>
              <span style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text)',
                flex: 1,
              }}>
                {week.title || <span style={{ color: 'var(--text3)', fontWeight: 400 }}>click to add title…</span>}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                {editingId === week.id ? '▲' : '▼'}
              </span>
              <button
                className="btn btn-ghost btn-icon"
                onClick={e => { e.stopPropagation(); removeWeek(week.id) }}
                style={{ fontSize: 14, color: 'var(--text3)', padding: '2px 6px' }}
                title="Remove week"
              >×</button>
            </div>

            {/* Editable fields */}
            {editingId === week.id && (
              <div style={{
                padding: '12px 14px',
                background: 'var(--bg)',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, display: 'block' }}>Week label</label>
                  <input
                    type="text"
                    value={week.label}
                    onChange={e => updateWeek(week.id, 'label', e.target.value)}
                    style={{ fontSize: 13 }}
                    placeholder="e.g. Week 1"
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, display: 'block' }}>Title / focus</label>
                  <input
                    type="text"
                    value={week.title}
                    onChange={e => updateWeek(week.id, 'title', e.target.value)}
                    style={{ fontSize: 13 }}
                    placeholder="e.g. Learn & Groove"
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, display: 'block' }}>Description</label>
                  <textarea
                    rows={3}
                    value={week.description}
                    onChange={e => updateWeek(week.id, 'description', e.target.value)}
                    style={{ fontSize: 12, resize: 'vertical' }}
                    placeholder="Describe what the client should focus on this week…"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export { DEFAULT_WEEKS }
