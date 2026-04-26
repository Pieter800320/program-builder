import { useState, useCallback, useEffect, useRef } from 'react'
import ClientPanel from './components/ClientPanel'
import DayBlock from './components/DayBlock'
import SessionNoteModal from './components/SessionNoteModal'
import SettingsModal from './components/SettingsModal'
import ExportButton from './components/ExportButton'
import AddExerciseModal from './components/AddExerciseModal'
import ProgressionTable, { DEFAULT_WEEKS } from './components/ProgressionTable'
import ClientProfileCard from './components/ClientProfileCard'
import { generateSplit, makeEmptyExercise, PHASE_DEFAULTS } from './logic/split'
import { filterExercises } from './logic/filter.js'
import { useAI } from './hooks/useAI'
import { useSheets } from './hooks/useSheets'
import baseExercises from './data/exercises.json'

function loadAllExercises() {
  try {
    const custom = JSON.parse(localStorage.getItem('pb_custom_exercises') || '[]')
    const baseNames = new Set(baseExercises.map(e => e.name.toLowerCase()))
    return [...baseExercises, ...custom.filter(e => !baseNames.has(e.name.toLowerCase()))]
  } catch { return baseExercises }
}

function saveProgram(clientName, program, progressionWeeks) {
  if (!clientName || !program) return
  const key = `pb_program_${clientName.replace(/\s+/g, '_')}`
  localStorage.setItem(key, JSON.stringify({ program, progressionWeeks, savedAt: new Date().toISOString() }))
}

function loadProgram(clientName) {
  if (!clientName) return null
  const key = `pb_program_${clientName.replace(/\s+/g, '_')}`
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null }
  catch { return null }
}

export default function App() {
  const [client, setClient] = useState(null)
  const [program, setProgram] = useState(null)
  const [activeDay, setActiveDay] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [showAddExercise, setShowAddExercise] = useState(false)
  const [qualityReport, setQualityReport] = useState(null)
  const [showQuality, setShowQuality] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [allExercises, setAllExercises] = useState(loadAllExercises)
  const [savedIndicator, setSavedIndicator] = useState(false)
  const [progressionWeeks, setProgressionWeeks] = useState(DEFAULT_WEEKS)
  const [editableClient, setEditableClient] = useState(null)
  const [progressionOpen, setProgressionOpen] = useState(false)
  const [sessionOpen, setSessionOpen] = useState(true)
  const latestClientRef = useRef(null)

  const { fetchClients, fetchClient } = useSheets()
  const [mobileClients, setMobileClients] = useState([])
  useEffect(() => { fetchClients().then(list => setMobileClients(list)) }, [])

  async function handleMobileSelect(e) {
    const row = e.target.value
    if (!row) { setClient(null); latestClientRef.current = null; return }
    const c = await fetchClient(row)
    setClient(c); latestClientRef.current = c
  }

  const { generateExerciseNotes, qualityCheck, smartFill, aiLoading, error: aiError } = useAI()

  function handleGenerate(clientOverride) {
    const c = clientOverride || client
    if (!c) return
    if (!editableClient) setEditableClient(c)
    const saved = loadProgram(c.name)
    if (saved) {
      const restore = window.confirm(`Saved program found for ${c.name}. Restore it?`)
      if (restore) {
        setProgram(null)
        setTimeout(() => {
          setProgram(saved.program)
          setProgressionWeeks(saved.progressionWeeks || DEFAULT_WEEKS)
          setActiveDay(0)
          setQualityReport(null)
          setSessionOpen(true)
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
    setQualityReport(null)
    setProgressionWeeks(DEFAULT_WEEKS)
    setSessionOpen(true)
    setTimeout(() => setProgram(initialised), 0)
  }

  useEffect(() => {
    if (program && client) {
      saveProgram(client.name, program, progressionWeeks)
      setSavedIndicator(true)
      const t = setTimeout(() => setSavedIndicator(false), 1500)
      return () => clearTimeout(t)
    }
  }, [program, progressionWeeks, client])

  function updateDay(dayIndex, updated) {
    setProgram(prev => { const next = [...prev]; next[dayIndex] = updated; return next })
  }

  const handleGenerateNotes = useCallback(
    async (exerciseName, phase) => {
      if (!client) return ''
      return generateExerciseNotes(exerciseName, client, phase)
    }, [client, generateExerciseNotes]
  )

  async function handleQualityCheck() {
    if (!program || !client) return
    setShowQuality(true); setQualityReport(null)
    const report = await qualityCheck(program, client)
    setQualityReport(report)
  }

  async function handleSmartFill() {
    if (!program || !client) return
    const PHASE_COUNT = { warmup: 3, activation: 3, primer: 2, kpi: 2, accessory: 4, finisher: 1, cooldown: 2 }
    const SUPERSET_GROUPS = ['A1', 'A2', 'B1', 'B2']
    const picks = await smartFill(program, client, allExercises)
    if (!picks || picks.length === 0) return
    const pickMap = {}
    picks.forEach(p => { const id = String(p.id || p.slotId || ''); pickMap[id] = p })
    setProgram(prev => {
      const next = prev.map((day, di) => ({
        ...day,
        phases: day.phases.map((ph, pi) => {
          const slotId = String(di) + '_' + String(pi)
          const count = PHASE_COUNT[ph.phase] || 1
          const aiPick = pickMap[slotId]
          const filtered = filterExercises(allExercises, { phase: ph.phase, patterns: ph.patterns, client })
          const exercises = []
          const firstEx = aiPick
            ? { id: crypto.randomUUID(), exerciseName: aiPick.exerciseName || '', sets: PHASE_DEFAULTS[ph.phase]?.sets || '', reps: PHASE_DEFAULTS[ph.phase]?.reps || '', notes: aiPick.notes || '', showNotes: !!(aiPick.notes), supersetGroup: ph.phase === 'accessory' ? SUPERSET_GROUPS[0] : null }
            : filtered.length > 0 ? { id: crypto.randomUUID(), exerciseName: filtered[0].name, sets: PHASE_DEFAULTS[ph.phase]?.sets || '', reps: PHASE_DEFAULTS[ph.phase]?.reps || '', notes: '', showNotes: false, supersetGroup: ph.phase === 'accessory' ? SUPERSET_GROUPS[0] : null } : null
          if (firstEx && firstEx.exerciseName) exercises.push(firstEx)
          if (ph.phase === 'accessory' && count === 4) {
            const OPPOSING = { push: ['pull'], pull: ['push'], squat: ['hinge'], hinge: ['squat'], lunge: ['hinge', 'carry'], carry: ['core'], core: ['carry', 'rotation'], rotation: ['core'] }
            const primaryPatterns = ph.patterns.length > 0 ? ph.patterns : ['push']
            const opposingPatterns = primaryPatterns.flatMap(p => OPPOSING[p] || ['core'])
            const usedNames = new Set(exercises.map(e => e.exerciseName))
            const opposingFiltered = filterExercises(allExercises, { phase: ph.phase, patterns: opposingPatterns, client }).filter(ex => !usedNames.has(ex.name))
            if (opposingFiltered[0]) { exercises.push({ id: crypto.randomUUID(), exerciseName: opposingFiltered[0].name, sets: PHASE_DEFAULTS[ph.phase]?.sets || '', reps: PHASE_DEFAULTS[ph.phase]?.reps || '', notes: '', showNotes: false, supersetGroup: 'A2' }); usedNames.add(opposingFiltered[0].name) }
            const b1Filtered = filterExercises(allExercises, { phase: ph.phase, patterns: primaryPatterns, client }).filter(ex => !usedNames.has(ex.name))
            if (b1Filtered[0]) { exercises.push({ id: crypto.randomUUID(), exerciseName: b1Filtered[0].name, sets: PHASE_DEFAULTS[ph.phase]?.sets || '', reps: PHASE_DEFAULTS[ph.phase]?.reps || '', notes: '', showNotes: false, supersetGroup: 'B1' }); usedNames.add(b1Filtered[0].name) }
            const b2Filtered = filterExercises(allExercises, { phase: ph.phase, patterns: opposingPatterns, client }).filter(ex => !usedNames.has(ex.name))
            if (b2Filtered[0]) exercises.push({ id: crypto.randomUUID(), exerciseName: b2Filtered[0].name, sets: PHASE_DEFAULTS[ph.phase]?.sets || '', reps: PHASE_DEFAULTS[ph.phase]?.reps || '', notes: '', showNotes: false, supersetGroup: 'B2' })
          } else {
            const usedNames = new Set(exercises.map(e => e.exerciseName))
            const remaining = filtered.filter(ex => !usedNames.has(ex.name))
            for (let i = 1; i < count && i - 1 < remaining.length; i++) {
              exercises.push({ id: crypto.randomUUID(), exerciseName: remaining[i-1].name, sets: PHASE_DEFAULTS[ph.phase]?.sets || '', reps: PHASE_DEFAULTS[ph.phase]?.reps || '', notes: '', showNotes: false, supersetGroup: null })
            }
          }
          return exercises.length === 0 ? ph : { ...ph, exercises }
        }),
      }))
      return next
    })
  }

  function handleDeleteProgram() {
    if (!client) return
    if (!window.confirm(`Delete saved program for ${client.name}?`)) return
    localStorage.removeItem(`pb_program_${client.name.replace(/\s+/g, '_')}`)
    setProgram(null); setActiveDay(0)
  }

  function handleAddExerciseSave(newExercise) {
    setAllExercises(prev => [...prev.filter(e => e.name.toLowerCase() !== newExercise.name.toLowerCase()), newExercise])
  }

  function handleExportCustom() {
    const custom = JSON.parse(localStorage.getItem('pb_custom_exercises') || '[]')
    const blob = new Blob([JSON.stringify(custom, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'custom_exercises.json'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div id="root">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="app-header">
        <h1>Program Builder</h1>
        {program && <span className="header-divider" />}
        {program && (
          <>
            <button className="btn btn-ghost btn-sm" onClick={handleSmartFill} disabled={aiLoading} title="AI fills all exercises">
              {aiLoading ? <span className="loader" /> : 'Smart fill'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleQualityCheck} disabled={aiLoading}>
              {aiLoading ? <span className="loader" /> : 'Quality check'}
            </button>
            <ExportButton client={client} program={program} progressionWeeks={progressionWeeks} />
          </>
        )}
        <div className="spacer" />
        {savedIndicator && <span style={{ fontSize: 11, color: 'var(--success)' }}>Saved</span>}
        <button className="btn btn-ghost btn-sm" onClick={() => setShowAddExercise(true)}>+ Exercise</button>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowSettings(true)}>Settings</button>
      </header>

      {/* ── Mobile client bar ─────────────────────────────────────────────── */}
      <MobileClientBar
        clients={mobileClients}
        selectedClient={client}
        onSelect={handleMobileSelect}
        onGenerate={() => handleGenerate(latestClientRef.current)}
        onDelete={program ? handleDeleteProgram : null}
      />

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="app-body">
        <aside className="client-panel">
          <ClientPanel
            client={client}
            onClientChange={c => { setClient(c); latestClientRef.current = c }}
            onGenerate={handleGenerate}
            panelOpen={panelOpen}
            setPanelOpen={setPanelOpen}
            onDelete={program ? handleDeleteProgram : null}
          />
        </aside>

        <main className="main-area">
          {!program ? (
            <div className="empty-state">
              <h2>No program yet</h2>
              <p>Select a client and click Generate Template to start.</p>
            </div>
          ) : (
            <div className="main-scroll">
              {aiError && (
                <div className="badge badge-warning" style={{ display: 'block', margin: '8px 16px', padding: '6px 10px', borderRadius: 6 }}>
                  AI: {aiError}
                </div>
              )}

              {/* Day tabs */}
              <div className="day-tabs-bar">
                {program.map((day, i) => (
                  <button key={i} className={`day-tab ${activeDay === i ? 'active' : ''}`} onClick={() => setActiveDay(i)}>
                    {day.label}
                  </button>
                ))}
              </div>

              {/* Progression plan — collapsible */}
              <CollapsibleSection
                label="Progression Plan"
                summary={progressionWeeks.map(w => w.label).join(' · ')}
                open={progressionOpen}
                onToggle={() => setProgressionOpen(o => !o)}
              >
                <div style={{ padding: '0 16px 16px' }}>
                  <ProgressionTable weeks={progressionWeeks} onChange={setProgressionWeeks} />
                </div>
              </CollapsibleSection>

              {/* Session phases — collapsible */}
              <CollapsibleSection
                label={program[activeDay]?.title || `Day ${activeDay + 1}`}
                summary={null}
                open={sessionOpen}
                onToggle={() => setSessionOpen(o => !o)}
              >
                <div className="day-content">
                  <DayBlock
                    day={program[activeDay]}
                    allExercises={allExercises}
                    client={client || DEFAULT_CLIENT}
                    onUpdate={updated => updateDay(activeDay, updated)}
                    onGenerateNotes={handleGenerateNotes}
                    aiLoading={aiLoading}
                  />
                </div>
              </CollapsibleSection>
            </div>
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
        <AddExerciseModal onClose={() => setShowAddExercise(false)} onSave={handleAddExerciseSave} />
      )}
      {showQuality && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowQuality(false)}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <span className="modal-title">Quality Check</span>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowQuality(false)}>×</button>
            </div>
            {!qualityReport ? (
              <div style={{ textAlign: 'center', padding: 32 }}>
                <span className="loader" />
                <p className="text-sm" style={{ color: 'var(--text3)', marginTop: 12 }}>Analysing program…</p>
              </div>
            ) : (
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.7, maxHeight: 420, overflowY: 'auto' }}>
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

// ── Collapsible section ───────────────────────────────────────────────────────
function CollapsibleSection({ label, summary, open, onToggle, children }) {
  return (
    <div className="collapsible-section">
      <div className="collapsible-header" onClick={onToggle}>
        <span className="collapsible-label">{label}</span>
        {summary && <span className="collapsible-summary">{summary}</span>}
        <span className={`collapsible-chevron ${open ? 'open' : ''}`}>▶</span>
      </div>
      {open && <div className="collapsible-body">{children}</div>}
    </div>
  )
}

// ── Mobile client bar ─────────────────────────────────────────────────────────
function MobileClientBar({ clients, selectedClient, onSelect, onGenerate, onDelete }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const filtered = search.trim()
    ? clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : clients

  function handlePick(c) {
    setSearch(c.name)
    setOpen(false)
    onSelect({ target: { value: String(c._row) } })
    setExpanded(true)
  }

  function handleClear() {
    setSearch('')
    setOpen(true)
    onSelect({ target: { value: '' } })
    setExpanded(false)
  }

  return (
    <div className="mobile-client-bar" style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
      {/* Client selector row */}
      <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="text"
            placeholder="Select client…"
            value={search}
            onChange={e => { setSearch(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 300)}
            style={{ fontSize: 14, padding: '9px 36px 9px 12px' }}
          />
          {search && (
            <button
              onMouseDown={e => { e.preventDefault(); handleClear() }}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text3)', fontSize: 18, cursor: 'pointer' }}
            >×</button>
          )}
          {open && filtered.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 8, zIndex: 9999, maxHeight: '40vh', overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,.5)', marginTop: 4 }}>
              {filtered.map((c, i) => (
                <div key={i} onMouseDown={() => handlePick(c)} style={{ padding: '12px 16px', fontSize: 15, color: 'var(--text)', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                  {c.name}
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={onGenerate}
          disabled={!selectedClient}
          style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          Generate
        </button>
      </div>

      {/* Client profile — collapsible */}
      {selectedClient && (
        <div>
          <div
            onClick={() => setExpanded(o => !o)}
            style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', borderTop: '1px solid var(--border)' }}
          >
            <span style={{ fontWeight: 600, fontSize: 13 }}>{selectedClient.name}</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, flex: 1 }}>
              {selectedClient.age && <span className="tag">{selectedClient.age}y</span>}
              {selectedClient.experience && <span className="tag">{selectedClient.experience}</span>}
              {(selectedClient.goals || []).slice(0, 2).map(g => <span key={g} className="tag goal">{g}</span>)}
              {(selectedClient.injuries || []).filter(Boolean).slice(0, 2).map(i => <span key={i} className="tag injury">{i}</span>)}
            </div>
            <span style={{ fontSize: 10, color: 'var(--text3)', flexShrink: 0 }}>{expanded ? '▲' : '▼'}</span>
          </div>

          {expanded && (
            <div style={{ padding: '0 12px 12px', background: 'var(--bg)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', marginBottom: 8 }}>
                {selectedClient.session_duration && (
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>Session: <strong>{selectedClient.session_duration} min</strong></div>
                )}
                {selectedClient.sessions_per_week && (
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>Sessions/wk: <strong>{selectedClient.sessions_per_week}</strong></div>
                )}
                {selectedClient.fitness_level && (
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>Fitness: <strong>{selectedClient.fitness_level}</strong></div>
                )}
              </div>
              {selectedClient.specific_goals && (
                <p style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic', marginBottom: 8 }}>{selectedClient.specific_goals}</p>
              )}
              {selectedClient.concerns && (
                <p style={{ fontSize: 12, color: 'var(--text3)' }}>Concern: {selectedClient.concerns}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const DEFAULT_CLIENT = {
  experience: 'beginner',
  equipment_available: ['barbell','dumbbell','cable','machine','kettlebell','bodyweight','band','landmine','medicine_ball','pull_up_bar','powerbag','rowing_machine','assault_bike','assault_treadmill','back_extension_bench','leg_press_machine','battle_ropes','foam_roller','sled'],
  injuries: [], medical_flags: [], likes: [], dislikes: [],
}
