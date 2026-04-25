import { useState } from 'react'
import { useAI } from '../hooks/useAI'

const ALLOWED = {
  patterns:         ['squat','lunge','hinge','push','pull','carry','core','rotation','explosive','locomotion','conditioning'],
  phases:           ['warmup','activation','primer','kpi','accessory','finisher','cooldown'],
  equipment:        ['barbell','dumbbell','cable','machine','kettlebell','bodyweight','band','landmine','medicine_ball','pull_up_bar','powerbag','rowing_machine','assault_bike','assault_treadmill','back_extension_bench','leg_press_machine','battle_ropes','foam_roller','sled'],
  intensity:        ['low','moderate','high'],
  skill_level:      ['beginner','intermediate','advanced'],
  goals:            ['hypertrophy','strength','fat_loss','mobility','stability','conditioning','health','explosive_power'],
  tags:             ['quads','hamstrings','glutes','lower_back','upper_back','lats','chest','shoulders','biceps','triceps','core','calves','adductors','abductors','posterior_chain','patterning','shoulder_health','balance','full_body','rear_delts'],
  joint_stress:     ['spine_friendly','spine_load','knee_friendly','knee_load','shoulder_friendly','shoulder_load','elbow_load','wrist_load','hip_load'],
  contraindications:['knee_pain','low_back_pain','shoulder_pain','elbow_pain','wrist_pain','avoid_overhead','avoid_spinal_flexion','avoid_deep_knee_flexion','avoid_knee_valgus','hypermobility','balance_deficit','avoid_instability'],
  spine_load:       ['low','moderate','high'],
}

const MULTI = ['patterns','phases','equipment','intensity','skill_level','goals','tags','joint_stress','contraindications']
const SINGLE = ['spine_load']

export default function AddExerciseModal({ onClose, onSave }) {
  const [name, setName] = useState('')
  const [step, setStep] = useState('name') // 'name' | 'review' | 'done'
  const [tagged, setTagged] = useState(null)
  const [unilateral, setUnilateral] = useState(false)
  const { tagExercise, loading, error } = useAI()

  async function handleAutoTag() {
    if (!name.trim()) return
    const result = await tagExercise(name.trim())
    if (result) {
      // Sanitize — remove any values not in taxonomy
      const clean = { ...result, name: name.trim(), unilateral: result.unilateral || false }
      for (const field of MULTI) {
        if (Array.isArray(clean[field])) {
          clean[field] = clean[field].filter(v => ALLOWED[field]?.includes(v))
        } else {
          clean[field] = []
        }
      }
      for (const field of SINGLE) {
        if (!ALLOWED[field]?.includes(clean[field])) clean[field] = 'low'
      }
      setTagged(clean)
      setUnilateral(!!clean.unilateral)
      setStep('review')
    }
  }

  function toggleTag(field, value) {
    setTagged(prev => {
      const current = prev[field] || []
      const next = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value]
      return { ...prev, [field]: next }
    })
  }

  function setSpineLoad(value) {
    setTagged(prev => ({ ...prev, spine_load: value }))
  }

  function handleSave() {
    const exercise = {
      ...tagged,
      unilateral,
      regression: tagged.regression || [],
      progression: tagged.progression || [],
    }
    // Load existing custom exercises from localStorage
    const existing = JSON.parse(localStorage.getItem('pb_custom_exercises') || '[]')
    // Remove if same name exists
    const updated = existing.filter(e => e.name.toLowerCase() !== exercise.name.toLowerCase())
    updated.push(exercise)
    localStorage.setItem('pb_custom_exercises', JSON.stringify(updated))
    onSave(exercise)
    setStep('done')
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 580, maxHeight: '85vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <span className="modal-title">Add exercise</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>×</button>
        </div>

        {step === 'name' && (
          <>
            <p className="text-sm text-muted" style={{ marginBottom: 12 }}>
              Type the exercise name. AI will auto-tag it — you review and adjust before saving.
            </p>
            <div className="field">
              <label>Exercise name</label>
              <input
                type="text"
                placeholder="e.g. Landmine Hack Squat"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAutoTag()}
                autoFocus
              />
            </div>
            {error && <p className="text-sm" style={{ color: 'var(--danger)', marginBottom: 8 }}>{error}</p>}
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleAutoTag}
                disabled={!name.trim() || loading}
              >
                {loading ? <><span className="loader" /> Tagging…</> : '✦ Auto-tag'}
              </button>
            </div>
          </>
        )}

        {step === 'review' && tagged && (
          <>
            <p className="text-sm text-muted" style={{ marginBottom: 14 }}>
              Review the AI tags for <strong style={{ color: 'var(--text)' }}>{tagged.name}</strong>.
              Toggle any tag to add or remove it.
            </p>

            {MULTI.map(field => (
              <div key={field} className="field">
                <label style={{ textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 11 }}>{field}</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {ALLOWED[field].map(val => (
                    <button
                      key={val}
                      className={`tag ${(tagged[field] || []).includes(val) ? 'tag-active' : ''}`}
                      style={{
                        cursor: 'pointer',
                        background: (tagged[field] || []).includes(val) ? 'var(--accent)' : 'var(--bg4)',
                        color: (tagged[field] || []).includes(val) ? '#fff' : 'var(--text2)',
                        border: (tagged[field] || []).includes(val) ? '1px solid var(--accent)' : '1px solid var(--border)',
                        padding: '4px 10px',
                        borderRadius: 20,
                        fontSize: 12,
                      }}
                      onClick={() => toggleTag(field, val)}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="field">
              <label style={{ textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 11 }}>spine_load (pick one)</label>
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                {ALLOWED.spine_load.map(val => (
                  <button
                    key={val}
                    style={{
                      cursor: 'pointer',
                      background: tagged.spine_load === val ? 'var(--accent)' : 'var(--bg4)',
                      color: tagged.spine_load === val ? '#fff' : 'var(--text2)',
                      border: tagged.spine_load === val ? '1px solid var(--accent)' : '1px solid var(--border)',
                      padding: '4px 14px',
                      borderRadius: 20,
                      fontSize: 12,
                    }}
                    onClick={() => setSpineLoad(val)}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label style={{ textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 11 }}>unilateral</label>
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                {['No', 'Yes'].map(v => (
                  <button
                    key={v}
                    style={{
                      cursor: 'pointer',
                      background: (v === 'Yes') === unilateral ? 'var(--accent)' : 'var(--bg4)',
                      color: (v === 'Yes') === unilateral ? '#fff' : 'var(--text2)',
                      border: (v === 'Yes') === unilateral ? '1px solid var(--accent)' : '1px solid var(--border)',
                      padding: '4px 14px',
                      borderRadius: 20,
                      fontSize: 12,
                    }}
                    onClick={() => setUnilateral(v === 'Yes')}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setStep('name')}>← Back</button>
              <button className="btn btn-primary" onClick={handleSave}>Save exercise</button>
            </div>
          </>
        )}

        {step === 'done' && (
          <>
            <p style={{ padding: '24px 0', textAlign: 'center', color: 'var(--success)', fontSize: 15 }}>
              ✓ Exercise saved to your custom library
            </p>
            <p className="text-sm text-muted" style={{ textAlign: 'center', marginBottom: 16 }}>
              It will appear in exercise dropdowns immediately.
              To make it permanent, export your custom exercises and I'll add them to the main database.
            </p>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setStep('name'); setName(''); setTagged(null) }}>
                Add another
              </button>
              <button className="btn btn-primary" onClick={onClose}>Done</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
