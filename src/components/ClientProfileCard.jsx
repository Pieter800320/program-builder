import { useState } from 'react'

export default function ClientProfileCard({ client, onChange }) {
  if (!client) return null

  function updateField(field, value) {
    onChange({ ...client, [field]: value })
  }

  function toggleGoal(goal) {
    const current = client.goals || []
    const next = current.includes(goal)
      ? current.filter(g => g !== goal)
      : [...current, goal]
    onChange({ ...client, goals: next })
  }

  function toggleInjury(injury) {
    const current = client.injuries || []
    const next = current.includes(injury)
      ? current.filter(i => i !== injury)
      : [...current, injury]
    onChange({ ...client, injuries: next })
  }

  const ALL_GOALS = [
    'hypertrophy', 'strength', 'fat_loss', 'mobility',
    'stability', 'conditioning', 'health', 'explosive_power',
  ]

  const ALL_INJURIES = [
    'knee_pain', 'low_back_pain', 'shoulder_pain',
    'elbow_pain', 'wrist_pain', 'hypermobility',
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Row 1: Name / Age / Sex / Experience */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 140px' }}>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Name</label>
              <input
                type="text"
                value={client.name || ''}
                onChange={e => updateField('name', e.target.value)}
                style={{ fontSize: 13 }}
              />
            </div>
            <div style={{ flex: '0 0 70px' }}>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Age</label>
              <input
                type="text"
                value={client.age || ''}
                onChange={e => updateField('age', e.target.value)}
                style={{ fontSize: 13 }}
              />
            </div>
            <div style={{ flex: '0 0 80px' }}>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Sex</label>
              <select
                value={client.sex || ''}
                onChange={e => updateField('sex', e.target.value)}
                style={{ fontSize: 13 }}
              >
                <option value="">—</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div style={{ flex: '1 1 120px' }}>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Experience</label>
              <select
                value={client.experience || ''}
                onChange={e => updateField('experience', e.target.value)}
                style={{ fontSize: 13 }}
              >
                <option value="">—</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div style={{ flex: '0 0 90px' }}>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Session (min)</label>
              <input
                type="text"
                value={client.session_duration || ''}
                onChange={e => updateField('session_duration', e.target.value)}
                style={{ fontSize: 13 }}
              />
            </div>
          </div>

          {/* Goals */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 6 }}>Goals</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ALL_GOALS.map(g => (
                <button
                  key={g}
                  onClick={() => toggleGoal(g)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    cursor: 'pointer',
                    border: (client.goals || []).includes(g)
                      ? '1px solid var(--accent)'
                      : '1px solid var(--border)',
                    background: (client.goals || []).includes(g)
                      ? 'rgba(79,124,255,.15)'
                      : 'var(--bg3)',
                    color: (client.goals || []).includes(g)
                      ? '#7fa3ff'
                      : 'var(--text2)',
                    fontFamily: 'inherit',
                  }}
                >
                  {g.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Injuries */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 6 }}>Injuries / flags</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ALL_INJURIES.map(inj => (
                <button
                  key={inj}
                  onClick={() => toggleInjury(inj)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    cursor: 'pointer',
                    border: (client.injuries || []).includes(inj)
                      ? '1px solid rgba(239,68,68,.5)'
                      : '1px solid var(--border)',
                    background: (client.injuries || []).includes(inj)
                      ? 'rgba(239,68,68,.12)'
                      : 'var(--bg3)',
                    color: (client.injuries || []).includes(inj)
                      ? '#f87171'
                      : 'var(--text2)',
                    fontFamily: 'inherit',
                  }}
                >
                  {inj.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Specific goal */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Specific goal</label>
            <textarea
              rows={2}
              value={client.specific_goals || ''}
              onChange={e => updateField('specific_goals', e.target.value)}
              style={{ fontSize: 12, resize: 'vertical' }}
              placeholder="e.g. Complete a pull-up, run 5km injury-free…"
            />
          </div>

          {/* Notes / concerns */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Notes / concerns</label>
            <textarea
              rows={2}
              value={client.concerns || ''}
              onChange={e => updateField('concerns', e.target.value)}
              style={{ fontSize: 12, resize: 'vertical' }}
              placeholder="Any concerns, limitations, lifestyle factors…"
            />
          </div>

    </div>
  )
}
