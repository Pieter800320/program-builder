import { useState, useCallback } from 'react'
import ClientPanel from './components/ClientPanel'
import DayBlock from './components/DayBlock'
import SessionNoteModal from './components/SessionNoteModal'
import SettingsModal from './components/SettingsModal'
import ExportButton from './components/ExportButton'
import { generateSplit, makeEmptyExercise, PHASE_DEFAULTS } from './logic/split'
import { applyProgression, WEEK_LABELS } from './logic/progression'
import { useAI } from './hooks/useAI'
import allExercises from './data/exercises.json'

export default function App() {
  const [client, setClient] = useState(null)
  const [program, setProgram] = useState(null)      // array of day objects
  const [activeDay, setActiveDay] = useState(0)
  const [week, setWeek] = useState(1)
  const [adaptation, setAdaptation] = useState('normal')
  const [showSettings, setShowSettings] = useState(false)
  const [qualityReport, setQualityReport] = useState(null)
  const [showQuality, setShowQuality] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)

  const { generateExerciseNotes, qualityCheck, aiLoading, error: aiError } = useAI()

  // ── Generate split from client profile ──────────────────────────────────
  function handleGenerate() {
    if (!client) return
    const split = generateSplit(client)
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
    // Always fully reset so switching clients works correctly
    setProgram(null)
    setActiveDay(0)
    setWeek(1)
    setAdaptation('normal')
    setQualityReport(null)
    setTimeout(() => setProgram(initialised), 0)
  }

  // ── Update a day in the program ──────────────────────────────────────────
  function updateDay(dayIndex, updated) {
    setProgram(prev => {
      const next = [...prev]
      next[dayIndex] = updated
      return next
    })
  }

  // ── Apply progression to displayed program ───────────────────────────────
  // The base program is always stored clean; progression is applied on render
  const displayProgram = program
    ? applyProgression(program, week, adaptation)
    : null

  // ── AI: generate notes for one exercise ──────────────────────────────────
  const handleGenerateNotes = useCallback(
    async (exerciseName, phase) => {
      if (!client) return ''
      return generateExerciseNotes(exerciseName, client, phase)
    },
    [client, generateExerciseNotes]
  )

  // ── AI: quality check ─────────────────────────────────────────────────────
  async function handleQualityCheck() {
    if (!program || !client) return
    setShowQuality(true)
    setQualityReport(null)
    const report = await qualityCheck(program, client)
    setQualityReport(report)
  }

  return (
    <div id="root">
      {/* Header */}
      <header className="app-header">
        <h1>Program Builder</h1>
        <div className="spacer" />
        {program && client && (
          <>
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
            <select
              value={adaptation}
              onChange={e => setAdaptation(e.target.value)}
              style={{ width: 'auto', marginLeft: 8 }}
            >
              <option value="normal">Normal</option>
              <option value="fatigued">Client fatigued</option>
              <option value="progressing">Client progressing</option>
            </select>
          </>
        )}
        {program && (
          <>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleQualityCheck}
              disabled={aiLoading}
              style={{ marginLeft: 8 }}
            >
              {aiLoading ? <span className="loader" /> : '✦ Quality check'}
            </button>
            <ExportButton client={client} program={displayProgram || program} week={week} />
          </>
        )}
        <button
          className="btn btn-ghost btn-icon"
          onClick={() => setShowSettings(true)}
          style={{ marginLeft: 4 }}
          title="Settings"
        >
          ⚙
        </button>
      </header>

      {/* Body */}
      <div className="app-body">
        {/* Left panel */}
        <aside className={`client-panel${panelOpen ? " open" : ""}`}>
          <ClientPanel
            client={client}
            onClientChange={setClient}
            onGenerate={handleGenerate}
            panelOpen={panelOpen}
            setPanelOpen={setPanelOpen}
          />
        </aside>

        {/* Main content */}
        <main className="main-area">
          {!program ? (
            <div className="empty-state">
              <h2>No program yet</h2>
              <p>Select a client and click <strong>Generate Template</strong> to start.</p>
              {!localStorage.getItem('pb_gas_url') && (
                <p style={{ marginTop: 8 }}>
                  No Apps Script URL set — you can also build a program manually by configuring a client inline.{' '}
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowSettings(true)}
                  >
                    Open Settings
                  </button>
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Day tabs */}
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

              {/* Active day */}
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
                  onUpdate={updated => {
                    // Always update the base program (not the progression-applied one)
                    updateDay(activeDay, updated)
                  }}
                  onGenerateNotes={handleGenerateNotes}
                  aiLoading={aiLoading}
                />
              </div>
            </>
          )}
        </main>
      </div>

      {/* Floating session note button */}
      <SessionNoteModal client={client} />

      {/* Settings modal */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* Quality check modal */}
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

// Fallback client so exercise dropdowns work without a loaded profile
const DEFAULT_CLIENT = {
  experience: 'beginner',
  equipment_available: ['barbell', 'dumbbell', 'cable', 'machine', 'kettlebell', 'bodyweight', 'band', 'landmine', 'medicine_ball', 'pull_up_bar', 'powerbag', 'rowing_machine', 'assault_bike', 'assault_treadmill', 'back_extension_bench', 'leg_press_machine'],
  injuries: [],
  medical_flags: [],
  likes: [],
  dislikes: [],
}
