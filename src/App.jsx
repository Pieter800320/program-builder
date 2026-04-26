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
  const [smartFillInfo, setSmartFillInfo] = useState(null)
  const [smartFillLoading, setSmartFillLoading] = useState(false)
  const [progressionWeeks, setProgressionWeeks] = useState(DEFAULT_WEEKS)
  const [editableClient, setEditableClient] = useState(null)

  // Sync editableClient whenever client loads
  useEffect(() => {
    if (client) setEditableClient(c => c?.name === client.name ? c : client)
  }, [client])
  const [profileOpen, setProfileOpen] = useState(true)
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

  function updateDayTitle(dayIndex, title) {
    setProgram(prev => {
      const next = [...prev]
      next[dayIndex] = { ...next[dayIndex], title }
      return next
    })
  }

  function addDay() {
    const dayNum = program.length + 1
    const newDay = {
      label: 'Day ' + dayNum,
      title: '',
      patterns: [],
      phases: [
        { phase: 'warmup',     patterns: [], exercises: [{ id: crypto.randomUUID(), exerciseName: '', sets: '', reps: '', notes: '', showNotes: false, supersetGroup: null }] },
        { phase: 'activation', patterns: [], exercises: [{ id: crypto.randomUUID(), exerciseName: '', sets: '', reps: '', notes: '', showNotes: false, supersetGroup: null }] },
        { phase: 'primer',     patterns: [], exercises: [{ id: crypto.randomUUID(), exerciseName: '', sets: '', reps: '', notes: '', showNotes: false, supersetGroup: null }] },
        { phase: 'kpi',        patterns: [], exercises: [{ id: crypto.randomUUID(), exerciseName: '', sets: '', reps: '', notes: '', showNotes: false, supersetGroup: null }] },
        { phase: 'accessory',  patterns: [], exercises: [{ id: crypto.randomUUID(), exerciseName: '', sets: '', reps: '', notes: '', showNotes: false, supersetGroup: null }] },
        { phase: 'finisher',   patterns: [], exercises: [{ id: crypto.randomUUID(), exerciseName: '', sets: '', reps: '', notes: '', showNotes: false, supersetGroup: null }] },
        { phase: 'cooldown',   patterns: [], exercises: [{ id: crypto.randomUUID(), exerciseName: '', sets: '', reps: '', notes: '', showNotes: false, supersetGroup: null }] },
      ]
    }
    setProgram(prev => [...prev, newDay])
    setActiveDay(program.length)
  }

  function clearDay(dayIndex) {
    setProgram(prev => {
      const next = [...prev]
      next[dayIndex] = {
        ...next[dayIndex],
        phases: next[dayIndex].phases.map(ph => ({
          ...ph,
          exercises: [{ id: crypto.randomUUID(), exerciseName: '', sets: '', reps: '', notes: '', showNotes: false, supersetGroup: null }],
        })),
      }
      return next
    })
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

  async function handleSmartFillAll() {
    if (!program || !client) return
    setSmartFillLoading(true)
    for (let i = 0; i < program.length; i++) {
      const result = await smartFill(program, client, allExercises, i)
      if (!result || !result.phases) continue
      setProgram(prev => {
        const next = [...prev]
        const day = { ...next[i] }
        if (result.suggestedPatterns && result.suggestedPatterns.length > 0) {
          day.patterns = result.suggestedPatterns
          day.title = result.suggestedPatterns.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' + ')
        }
        day.phases = day.phases.map(ph => {
          const aiExercises = result.phases[ph.phase]
          if (!aiExercises || aiExercises.length === 0) return ph
          return { ...ph, exercises: aiExercises.map(ex => ({
            id: crypto.randomUUID(),
            exerciseName: ex.exerciseName || '',
            sets: ex.sets || PHASE_DEFAULTS[ph.phase]?.sets || '',
            reps: ex.reps || PHASE_DEFAULTS[ph.phase]?.reps || '',
            notes: ex.notes || '',
            showNotes: !!(ex.notes),
            supersetGroup: ex.supersetGroup || null,
            aiGenerated: true,
          }))}
        })
        next[i] = day
        return next
      })
    }
    setSmartFillLoading(false)
    setSmartFillInfo({ archetype: 'All days filled' })
    setTimeout(() => setSmartFillInfo(null), 4000)
  }

  async function handleSmartFill() {
    if (!program || !client) return
    setSmartFillLoading(true)
    const result = await smartFill(program, client, allExercises, activeDay)
    if (!result || !result.phases) return

    const SUPERSET_ORDER = ['A1', 'A2', 'B1', 'B2']

    // Update the active day with AI-generated exercises
    setProgram(prev => {
      const next = [...prev]
      const day = { ...next[activeDay] }

      // Update patterns and title if AI suggested them
      if (result.suggestedPatterns && result.suggestedPatterns.length > 0) {
        day.patterns = result.suggestedPatterns
        day.title = result.suggestedPatterns
          .map(p => p.charAt(0).toUpperCase() + p.slice(1))
          .join(' + ')
      }

      day.phases = day.phases.map(ph => {
        const aiExercises = result.phases[ph.phase]
        if (!aiExercises || aiExercises.length === 0) return ph

        const exercises = aiExercises.map((ex, i) => ({
          id: crypto.randomUUID(),
          exerciseName: ex.exerciseName || '',
          sets: ex.sets || PHASE_DEFAULTS[ph.phase]?.sets || '',
          reps: ex.reps || PHASE_DEFAULTS[ph.phase]?.reps || '',
          notes: ex.notes || '',
          showNotes: !!(ex.notes),
          supersetGroup: ex.supersetGroup || null,
          aiGenerated: true,
        }))

        return { ...ph, exercises }
      })

      next[activeDay] = day
      return next
    })

    setSmartFillLoading(false)
    // Store detection info for display
    if (result && (result.archetype || result.dayType)) {
      setSmartFillInfo({ archetype: result.archetype, dayType: result.dayType })
      setTimeout(() => setSmartFillInfo(null), 5000)
    }
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
        <div className="app-header-title">
          <h1>Program Builder</h1>
          {savedIndicator && <span style={{ fontSize: 10, color: 'var(--success)', marginLeft: 8 }}>✓ saved</span>}
        </div>
        {program && (
          <nav className="app-header-nav">
            <button
              className="nav-btn"
              onClick={handleSmartFillAll}
              disabled={smartFillLoading}
              style={{
                color: smartFillLoading ? '#fff' : undefined,
                background: smartFillLoading ? 'var(--accent)' : 'transparent',
                borderRadius: smartFillLoading ? 4 : 0,
                padding: smartFillLoading ? '2px 10px' : undefined,
                transition: 'all .2s',
              }}
            >
              {smartFillLoading ? '⟳ Filling…' : 'Smart Fill'}
            </button>
            {smartFillInfo && !aiLoading && (
              <span style={{ fontSize: 10, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                {smartFillInfo.dayType} · {smartFillInfo.archetype}
              </span>
            )}
            <span className="nav-divider">|</span>
            <button className="nav-btn" onClick={handleQualityCheck} disabled={aiLoading}>
              Quality Check
            </button>
            <span className="nav-divider">|</span>
            <ExportButton client={editableClient || client} program={program} progressionWeeks={progressionWeeks} navMode={true} />
          </nav>
        )}
        <nav className="app-header-nav app-header-nav-secondary">
          <button className="nav-btn" onClick={() => setShowAddExercise(true)}>+ Exercise</button>
          <span className="nav-divider">|</span>
          <button className="nav-btn" onClick={() => setShowSettings(true)}>Settings</button>
        </nav>
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
              {smartFillLoading && (
                <div style={{
                  background: 'rgba(79,124,255,.08)',
                  border: '1px solid rgba(79,124,255,.3)',
                  borderRadius: 6,
                  margin: '8px 16px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 13,
                  color: 'var(--accent)',
                }}>
                  <span className="loader" />
                  Smart Fill is thinking — this may take 10–20 seconds…
                </div>
              )}
              {aiError && (
                <div className="badge badge-warning" style={{ display: 'block', margin: '8px 16px', padding: '6px 10px', borderRadius: 6 }}>
                  AI: {aiError}
                </div>
              )}

              {/* 1. Client Profile — collapsible */}
              <CollapsibleSection
                label="Client Profile"
                summary={null}
                open={profileOpen}
                onToggle={() => setProfileOpen(o => !o)}
              >
                <div style={{ padding: '0 16px 16px' }}>
                  <ClientProfileCard
                    client={editableClient || client}
                    onChange={c => setEditableClient(c)}
                  />
                </div>
              </CollapsibleSection>

              {/* 2. Progression Plan — collapsible */}
              <CollapsibleSection
                label="Progression Plan"
                summary={null}
                open={progressionOpen}
                onToggle={() => setProgressionOpen(o => !o)}
              >
                <div style={{ padding: '0 16px 16px' }}>
                  <ProgressionTable weeks={progressionWeeks} onChange={setProgressionWeeks} />
                </div>
              </CollapsibleSection>

              {/* 3. Session — collapsible with day tabs inside */}
              <CollapsibleSection
                label="Session"
                summary={null}
                open={sessionOpen}
                onToggle={() => setSessionOpen(o => !o)}
              >
                <div className="day-tabs-bar" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                  {program.map((day, i) => (
                    <button key={i} className={`day-tab ${activeDay === i ? 'active' : ''}`} onClick={() => setActiveDay(i)}>
                      {day.label}
                    </button>
                  ))}
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <button
                      onClick={addDay}
                      style={{
                        background: 'none', border: 'none',
                        fontSize: 11, color: 'var(--accent)',
                        cursor: 'pointer', padding: '0 10px',
                      }}
                    >
                      + Day
                    </button>
                    <button
                      onClick={() => clearDay(activeDay)}
                      style={{
                        background: 'none', border: 'none',
                        fontSize: 11, color: 'var(--text3)',
                        cursor: 'pointer', padding: '0 12px',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
                    >
                      Clear
                    </button>
                  </div>
                </div>
                {/* Pattern picker for active day */}
                <PatternPicker
                  day={program[activeDay]}
                  onUpdate={updated => updateDay(activeDay, updated)}
                />
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


    </div>
  )
}

const DEFAULT_CLIENT = {
  experience: 'beginner',
  equipment_available: ['barbell','dumbbell','cable','machine','kettlebell','bodyweight','band','landmine','medicine_ball','pull_up_bar','powerbag','rowing_machine','assault_bike','assault_treadmill','back_extension_bench','leg_press_machine','battle_ropes','foam_roller','sled'],
  injuries: [], medical_flags: [], likes: [], dislikes: [],
}

// ── Pattern Picker ────────────────────────────────────────────────────────────
const ALL_PATTERNS = [
  { id: 'push',         label: 'Push',         desc: 'Press, push-up, overhead' },
  { id: 'pull',         label: 'Pull',         desc: 'Row, pull-up, lat pulldown' },
  { id: 'squat',        label: 'Squat',        desc: 'Squat, leg press, goblet' },
  { id: 'hinge',        label: 'Hinge',        desc: 'Deadlift, RDL, swing' },
  { id: 'lunge',        label: 'Lunge',        desc: 'Split squat, step-up, reverse lunge' },
  { id: 'carry',        label: 'Carry',        desc: 'Farmer, suitcase, overhead carry' },
  { id: 'core',         label: 'Core',         desc: 'Plank, anti-rotation, stability' },
  { id: 'rotation',     label: 'Rotation',     desc: 'Cable twist, med ball, landmine' },
  { id: 'explosive',    label: 'Explosive',    desc: 'Jump, throw, clean, speed' },
  { id: 'conditioning', label: 'Conditioning', desc: 'Bike, row, complexes, intervals' },
  { id: 'locomotion',   label: 'Locomotion',   desc: 'Crawl, sled, agility, crawl patterns' },
]

function generateTitle(patterns) {
  if (!patterns || patterns.length === 0) return 'Rest / Recovery'
  const labels = patterns.map(p => {
    const found = ALL_PATTERNS.find(ap => ap.id === p)
    return found ? found.label : p
  })
  return labels.join(' + ')
}

function PatternPicker({ day, onUpdate }) {
  const [open, setOpen] = useState(false)
  const selected = day.patterns || []

  function toggle(patternId) {
    const next = selected.includes(patternId)
      ? selected.filter(p => p !== patternId)
      : [...selected, patternId]
    const title = generateTitle(next)
    onUpdate({ ...day, patterns: next, title })
  }

  return (
    <div style={{ padding: '8px 16px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
        onClick={() => setOpen(o => !o)}
      >
        <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>
          Focus patterns
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, flex: 1 }}>
          {selected.length === 0 ? (
            <span style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic' }}>none selected — tap to set</span>
          ) : selected.map(p => {
            const found = ALL_PATTERNS.find(ap => ap.id === p)
            return (
              <span key={p} style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 12,
                background: 'rgba(79,124,255,.15)', color: '#7fa3ff',
                border: '1px solid rgba(79,124,255,.3)',
              }}>
                {found ? found.label : p}
              </span>
            )
          })}
        </div>
        <span style={{ fontSize: 10, color: 'var(--text3)' }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{
          marginTop: 10,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 6,
        }}>
          {ALL_PATTERNS.map(p => {
            const checked = selected.includes(p.id)
            return (
              <div
                key={p.id}
                onClick={() => toggle(p.id)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  padding: '8px 10px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: checked ? 'rgba(79,124,255,.1)' : 'var(--bg3)',
                  border: checked ? '1px solid rgba(79,124,255,.4)' : '1px solid var(--border)',
                  transition: 'all .15s',
                }}
              >
                <div style={{
                  width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 1,
                  background: checked ? 'var(--accent)' : 'transparent',
                  border: checked ? '1px solid var(--accent)' : '1px solid var(--border2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {checked && <span style={{ color: '#fff', fontSize: 10, lineHeight: 1 }}>✓</span>}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: checked ? '#7fa3ff' : 'var(--text)' }}>
                    {p.label}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1 }}>
                    {p.desc}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
