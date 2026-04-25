import { useState, useCallback, useEffect, useRef } from 'react'
import ClientPanel from './components/ClientPanel'
import DayBlock from './components/DayBlock'
import SessionNoteModal from './components/SessionNoteModal'
import SettingsModal from './components/SettingsModal'
import ExportButton from './components/ExportButton'
import AddExerciseModal from './components/AddExerciseModal'
import ProgressionTable, { DEFAULT_WEEKS } from './components/ProgressionTable'
import { generateSplit, makeEmptyExercise, PHASE_DEFAULTS } from './logic/split'
import { applyProgression, WEEK_LABELS } from './logic/progression'
import { useAI } from './hooks/useAI'
import { useSheets } from './hooks/useSheets'
import baseExercises from './data/exercises.json'
import { filterExercises } from './logic/filter.js'

// ── Merge base DB with custom exercises from localStorage ─────────────────────
function loadAllExercises() {
  try {
    const custom = JSON.parse(localStorage.getItem('pb_custom_exercises') || '[]')
    const baseNames = new Set(baseExercises.map(e => e.name.toLowerCase()))
    const newCustom = custom.filter(e => !baseNames.has(e.name.toLowerCase()))
    return [...baseExercises, ...newCustom]
  } catch {
    return baseExercises
  }
}

// ── Save / load programs per client ──────────────────────────────────────────
function saveProgram(clientName, week, program) {
  if (!clientName || !program) return
  const key = `pb_program_${clientName.replace(/\s+/g, '_')}`
  localStorage.setItem(key, JSON.stringify({ week, program, savedAt: new Date().toISOString() }))
}

function loadProgram(clientName) {
  if (!clientName) return null
  const key = `pb_program_${clientName.replace(/\s+/g, '_')}`
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export default function App() {
  const [client, setClient] = useState(null)
  const [program, setProgram] = useState(null)
  const [activeDay, setActiveDay] = useState(0)
  const [week, setWeek] = useState(1)
  const [showSettings, setShowSettings] = useState(false)
  const [showAddExercise, setShowAddExercise] = useState(false)
  const [qualityReport, setQualityReport] = useState(null)
  const [showQuality, setShowQuality] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [allExercises, setAllExercises] = useState(loadAllExercises)
  const [savedIndicator, setSavedIndicator] = useState(false)
  const [progressionWeeks, setProgressionWeeks] = useState(DEFAULT_WEEKS)

  // Mobile client state
  const { fetchClients, fetchClient } = useSheets()
  const [mobileClients, setMobileClients] = useState([])
  const [mobileSelectedRow, setMobileSelectedRow] = useState('')
  const latestClientRef = useRef(null)

  useEffect(() => {
    fetchClients().then(list => setMobileClients(list))
  }, [])

  async function handleMobileSelect(e) {
    const row = e.target.value
    setMobileSelectedRow(row)
    if (!row) { setClient(null); latestClientRef.current = null; return }
    const c = await fetchClient(row)
    setClient(c)
    latestClientRef.current = c
  }

  const { generateExerciseNotes, qualityCheck, smartFill, aiLoading, error: aiError } = useAI()

  // ── Generate split ────────────────────────────────────────────────────────
  function handleGenerate(clientOverride) {
    const c = clientOverride || client
    if (!c) return

    // Check for saved program first
    const saved = loadProgram(c.name)
    if (saved) {
      const restore = window.confirm(`A saved program exists for ${c.name} (saved ${new Date(saved.savedAt).toLocaleDateString()}). Restore it?`)
      if (restore) {
        setProgram(null)
        setTimeout(() => {
          setProgram(saved.program)
          setWeek(saved.week || 1)
          setActiveDay(0)
          setQualityReport(null)
        }, 0)
        return
      }
    }

    const split = generateSplit(c)
    const initialised = split.map(day => ({
      ...day,
      phases: day.phases.map(ph => ({
        ...ph,
        exercises: ph.exercises.map(ex => ({
          ...ex,
          sets: PHASE_DEFAULTS[ph.phase]?.sets || '',
          reps: PHASE_DEFAULTS[ph.phase]?.reps || '',
        })),
      })),
    }))
    setProgram(null)
    setActiveDay(0)
    setWeek(1)
    setQualityReport(null)
    setProgressionWeeks(DEFAULT_WEEKS)
    setTimeout(() => setProgram(initialised), 0)
  }

  // ── Auto-save when program changes ────────────────────────────────────────
  useEffect(() => {
    if (program && client) {
      saveProgram(client.name, week, program)
      setSavedIndicator(true)
      const t = setTimeout(() => setSavedIndicator(false), 1500)
      return () => clearTimeout(t)
    }
  }, [program, week, client])

  function updateDay(dayIndex, updated) {
    setProgram(prev => {
      const next = [...prev]
      next[dayIndex] = updated
      return next
    })
  }

  const displayProgram = program
    ? applyProgression(program, week, 'normal')
    : null

  const handleGenerateNotes = useCallback(
    async (exerciseName, phase) => {
      if (!client) return ''
      return generateExerciseNotes(exerciseName, client, phase)
    },
    [client, generateExerciseNotes]
  )

  async function handleQualityCheck() {
    if (!program || !client) return
    setShowQuality(true)
    setQualityReport(null)
    const report = await qualityCheck(program, client)
    setQualityReport(report)
  }

  async function handleSmartFill() {
    if (!program || !client) return

    // How many exercises per phase (Rusin methodology)
    const PHASE_COUNT = {
      warmup: 3, activation: 3, primer: 2,
      kpi: 2, accessory: 4, finisher: 1, cooldown: 2,
    }

    // Superset groups for accessory
    const SUPERSET_GROUPS = ['A1', 'A2', 'B1', 'B2']

    // AI picks the BEST exercise for each slot (one per slot)
    const picks = await smartFill(program, client, allExercises)
    if (!picks || picks.length === 0) return

    // Build a map of AI picks by slot id
    const pickMap = {}
    picks.forEach(p => {
      const id = String(p.id || p.slotId || '')
      pickMap[id] = p
    })

    setProgram(prev => {
      const next = prev.map((day, di) => ({
        ...day,
        phases: day.phases.map((ph, pi) => {
          const slotId = String(di) + '_' + String(pi)
          const count = PHASE_COUNT[ph.phase] || 1
          const aiPick = pickMap[slotId]

          // Get filtered exercises for this slot
          const filtered = filterExercises(allExercises, {
            phase: ph.phase,
            patterns: ph.patterns,
            client,
          })

          const exercises = []

          // First exercise = AI pick (or top filtered if no AI pick)
          const firstEx = aiPick
            ? {
                id: crypto.randomUUID(),
                exerciseName: aiPick.exerciseName || aiPick.exercise_name || '',
                sets: PHASE_DEFAULTS[ph.phase]?.sets || '',
                reps: PHASE_DEFAULTS[ph.phase]?.reps || '',
                notes: aiPick.notes || '',
                showNotes: !!(aiPick.notes),
                supersetGroup: ph.phase === 'accessory' ? SUPERSET_GROUPS[0] : null,
              }
            : filtered.length > 0
              ? {
                  id: crypto.randomUUID(),
                  exerciseName: filtered[0].name,
                  sets: PHASE_DEFAULTS[ph.phase]?.sets || '',
                  reps: PHASE_DEFAULTS[ph.phase]?.reps || '',
                  notes: '',
                  showNotes: false,
                  supersetGroup: ph.phase === 'accessory' ? SUPERSET_GROUPS[0] : null,
                }
              : null

          if (firstEx && firstEx.exerciseName) exercises.push(firstEx)

          // For accessory: enforce Rusin superset pairing logic
          // A1/B1 = primary pattern, A2/B2 = opposing pattern
          if (ph.phase === 'accessory' && count === 4) {
            // Opposing pattern map
            const OPPOSING = {
              push: ['pull'], pull: ['push'],
              squat: ['hinge'], hinge: ['squat'],
              lunge: ['hinge', 'carry'], carry: ['core'],
              core: ['carry', 'rotation'], rotation: ['core'],
            }
            const primaryPatterns = ph.patterns.length > 0 ? ph.patterns : ['push']
            const opposingPatterns = primaryPatterns.flatMap(p => OPPOSING[p] || ['core'])

            const usedNames = new Set(exercises.map(e => e.exerciseName))

            // A2 — opposing pattern to AI pick
            const opposingFiltered = filterExercises(allExercises, {
              phase: ph.phase,
              patterns: opposingPatterns,
              client,
            }).filter(ex => !usedNames.has(ex.name))

            if (opposingFiltered[0]) {
              exercises.push({
                id: crypto.randomUUID(),
                exerciseName: opposingFiltered[0].name,
                sets: PHASE_DEFAULTS[ph.phase]?.sets || '',
                reps: PHASE_DEFAULTS[ph.phase]?.reps || '',
                notes: '', showNotes: false,
                supersetGroup: 'A2',
              })
              usedNames.add(opposingFiltered[0].name)
            }

            // B1 — second primary pattern exercise
            const b1Filtered = filterExercises(allExercises, {
              phase: ph.phase,
              patterns: primaryPatterns,
              client,
            }).filter(ex => !usedNames.has(ex.name))

            if (b1Filtered[0]) {
              exercises.push({
                id: crypto.randomUUID(),
                exerciseName: b1Filtered[0].name,
                sets: PHASE_DEFAULTS[ph.phase]?.sets || '',
                reps: PHASE_DEFAULTS[ph.phase]?.reps || '',
                notes: '', showNotes: false,
                supersetGroup: 'B1',
              })
              usedNames.add(b1Filtered[0].name)
            }

            // B2 — second opposing pattern exercise
            const b2Filtered = filterExercises(allExercises, {
              phase: ph.phase,
              patterns: opposingPatterns,
              client,
            }).filter(ex => !usedNames.has(ex.name))

            if (b2Filtered[0]) {
              exercises.push({
                id: crypto.randomUUID(),
                exerciseName: b2Filtered[0].name,
                sets: PHASE_DEFAULTS[ph.phase]?.sets || '',
                reps: PHASE_DEFAULTS[ph.phase]?.reps || '',
                notes: '', showNotes: false,
                supersetGroup: 'B2',
              })
            }
          } else {
            // Non-accessory: fill remaining from filtered list
            const usedNames = new Set(exercises.map(e => e.exerciseName))
            const remaining = filtered.filter(ex => !usedNames.has(ex.name))

            for (let i = 1; i < count && i - 1 < remaining.length; i++) {
              const ex = remaining[i - 1]
              exercises.push({
                id: crypto.randomUUID(),
                exerciseName: ex.name,
                sets: PHASE_DEFAULTS[ph.phase]?.sets || '',
                reps: PHASE_DEFAULTS[ph.phase]?.reps || '',
                notes: '', showNotes: false,
                supersetGroup: null,
              })
            }
          }

          if (exercises.length === 0) return ph
          return { ...ph, exercises }
        }),
      }))
      return next
    })
  }

  function handleDeleteProgram() {
    if (!client) return
    const confirm = window.confirm(`Delete saved program for ${client.name}? This cannot be undone.`)
    if (!confirm) return
    const key = `pb_program_${client.name.replace(/\s+/g, '_')}`
    localStorage.removeItem(key)
    setProgram(null)
    setActiveDay(0)
    setWeek(1)
  }

  function handleAddExerciseSave(newExercise) {
    setAllExercises(prev => {
      const filtered = prev.filter(e => e.name.toLowerCase() !== newExercise.name.toLowerCase())
      return [...filtered, newExercise]
    })
  }

  function handleExportCustom() {
    const custom = JSON.parse(localStorage.getItem('pb_custom_exercises') || '[]')
    const blob = new Blob([JSON.stringify(custom, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'custom_exercises.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div id="root">
      {/* Header */}
      <header className="app-header">
        <h1>Program Builder</h1>
        <div className="spacer" />
        {program && client && (
          <div className="week-tabs">
            {WEEK_LABELS.map((label, i) => (
              <button
                key={i}
                className={`week-tab ${week === i + 1 ? 'active' : ''}`}
                onClick={() => setWeek(i + 1)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {program && (
          <>
            {savedIndicator && (
              <span className="text-sm" style={{ color: 'var(--success)' }}>✓ saved</span>
            )}
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleSmartFill}
              disabled={aiLoading}
              title="AI fills all exercises"
            >
              {aiLoading ? <span className="loader" /> : '⚡ Smart fill'}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleQualityCheck}
              disabled={aiLoading}
            >
              {aiLoading ? <span className="loader" /> : '✦ Quality check'}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleDeleteProgram}
              title="Delete saved program"
              style={{ color: 'var(--danger)' }}
            >
              🗑
            </button>
            <ExportButton client={client} program={displayProgram || program} week={week} progressionWeeks={progressionWeeks} />
          </>
        )}
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setShowAddExercise(true)}
          title="Add custom exercise"
        >
          + Exercise
        </button>
        <button
          className="btn btn-ghost btn-icon"
          onClick={() => setShowSettings(true)}
          title="Settings"
        >
          ⚙
        </button>
      </header>

      {/* Mobile client bar */}
      <MobileClientBar
        clients={mobileClients}
        selectedClient={client}
        onSelect={handleMobileSelect}
        onGenerate={() => handleGenerate(latestClientRef.current)}
      />

      {/* Body */}
      <div className="app-body">
        <aside className={`client-panel${panelOpen ? ' open' : ''}`}>
          <ClientPanel
            client={client}
            onClientChange={(c) => { setClient(c); latestClientRef.current = c }}
            onGenerate={handleGenerate}
            panelOpen={panelOpen}
            setPanelOpen={setPanelOpen}
          />
        </aside>

        <main className="main-area">
          {!program ? (
            <div className="empty-state">
              <h2>No program yet</h2>
              <p>Select a client and click <strong>Generate Template</strong> to start.</p>
            </div>
          ) : (
            <>
              <div className="day-tabs">
                {program.map((day, i) => (
                  <button
                    key={i}
                    className={`day-tab ${activeDay === i ? 'active' : ''}`}
                    onClick={() => setActiveDay(i)}
                  >
                    {day.label}
                  </button>
                ))}
              </div>

              <div className="day-content">
                {aiError && (
                  <div
                    className="badge badge-warning"
                    style={{ display: 'block', marginBottom: 12, padding: '6px 10px', borderRadius: 6 }}
                  >
                    AI: {aiError}
                  </div>
                )}
                <DayBlock
                  day={(displayProgram || program)[activeDay]}
                  allExercises={allExercises}
                  client={client || DEFAULT_CLIENT}
                  onUpdate={updated => updateDay(activeDay, updated)}
                  onGenerateNotes={handleGenerateNotes}
                  aiLoading={aiLoading}
                />
              </div>

              {/* Progression table */}
              <div style={{ padding: '0 16px 24px', borderTop: '1px solid var(--border)', marginTop: 8 }}>
                <ProgressionTable
                  weeks={progressionWeeks}
                  onChange={setProgressionWeeks}
                />
              </div>
            </>
          )}
        </main>
      </div>

      <SessionNoteModal client={client} />

      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onExportCustom={handleExportCustom}
          customCount={JSON.parse(localStorage.getItem('pb_custom_exercises') || '[]').length}
        />
      )}

      {showAddExercise && (
        <AddExerciseModal
          onClose={() => setShowAddExercise(false)}
          onSave={handleAddExerciseSave}
        />
      )}

      {showQuality && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowQuality(false)}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <span className="modal-title">Quality Check — Rusin Methodology</span>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowQuality(false)}>×</button>
            </div>
            {!qualityReport ? (
              <div style={{ textAlign: 'center', padding: 32 }}>
                <span className="loader" />
                <p className="text-sm text-muted" style={{ marginTop: 12 }}>Analysing program…</p>
              </div>
            ) : (
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.7, maxHeight: 400, overflowY: 'auto' }}>
                {qualityReport}
              </div>
            )}
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowQuality(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const DEFAULT_CLIENT = {
  experience: 'beginner',
  equipment_available: ['barbell','dumbbell','cable','machine','kettlebell','bodyweight','band','landmine','medicine_ball','pull_up_bar','powerbag','rowing_machine','assault_bike','assault_treadmill','back_extension_bench','leg_press_machine','battle_ropes','foam_roller','sled'],
  injuries: [],
  medical_flags: [],
  likes: [],
  dislikes: [],
}

function MobileClientBar({ clients, selectedClient, onSelect, onGenerate }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)

  // Show all clients when search is empty, filter when typing
  const filtered = search.trim()
    ? clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : clients

  function handlePick(c) {
    setSearch(c.name)
    setOpen(false)
    onSelect({ target: { value: String(c._row) } })
  }

  function handleClear() {
    setSearch('')
    setOpen(true)
    onSelect({ target: { value: '' } })
  }

  return (
    <div className="mobile-client-bar">
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          placeholder="Tap to select client…"
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 300)}
          style={{ fontSize: 16, padding: '12px 40px 12px 14px' }}
          readOnly={false}
        />
        {search && (
          <button
            onMouseDown={e => { e.preventDefault(); handleClear() }}
            style={{
              position: 'absolute', right: 10, top: '50%',
              transform: 'translateY(-50%)',
              background: 'none', border: 'none',
              color: 'var(--text3)', fontSize: 18, cursor: 'pointer',
            }}
          >×</button>
        )}
        {open && filtered.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0, right: 0,
            background: 'var(--bg3)',
            border: '1px solid var(--border2)',
            borderRadius: 8,
            zIndex: 9999,
            maxHeight: '40vh',
            overflowY: 'auto',
            boxShadow: '0 8px 24px rgba(0,0,0,.5)',
            marginTop: 4,
          }}>
            {filtered.map((c, i) => (
              <div
                key={i}
                onMouseDown={() => handlePick(c)}
                style={{
                  padding: '13px 16px',
                  fontSize: 16,
                  color: 'var(--text)',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                }}
              >
                {c.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedClient && (
        <div className="mobile-client-info" style={{ marginTop: 8 }}>
          {selectedClient.age && <span className="tag">{selectedClient.age}y</span>}
          {selectedClient.sex && <span className="tag">{selectedClient.sex}</span>}
          {selectedClient.experience && <span className="tag">{selectedClient.experience}</span>}
          {(selectedClient.goals || []).map(g => <span key={g} className="tag goal">{g}</span>)}
          {(selectedClient.injuries || []).filter(i => i && i !== 'none').map(i => <span key={i} className="tag injury">{i}</span>)}
        </div>
      )}

      <button
        className="btn btn-primary"
        style={{ marginTop: 10, width: '100%', padding: 14, fontSize: 15 }}
        onClick={onGenerate}
        disabled={!selectedClient}
      >
        Generate Template
      </button>
    </div>
  )
}
