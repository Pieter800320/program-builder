import PhaseSection from './PhaseSection'

export default function DayBlock({
  day,
  allExercises,
  client,
  onUpdate,
  onGenerateNotes,
  aiLoading,
}) {
  function updatePhase(phaseIndex, updated) {
    const phases = [...day.phases]
    phases[phaseIndex] = updated
    onUpdate({ ...day, phases })
  }

  return (
    <div>
      <div className="flex gap-8" style={{ marginBottom: 12, alignItems: 'center' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600 }}>{day.title}</h2>
      </div>

      {day.phases.map((phaseBlock, i) => (
        <PhaseSection
          key={phaseBlock.phase}
          phaseBlock={phaseBlock}
          allExercises={allExercises}
          client={client}
          onUpdate={updated => updatePhase(i, updated)}
          onGenerateNotes={onGenerateNotes}
          aiLoading={aiLoading}
        />
      ))}
    </div>
  )
}
