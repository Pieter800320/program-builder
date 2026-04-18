import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx'
import { saveAs } from 'file-saver'
import { PHASE_LABELS } from '../logic/split'

export default function ExportButton({ client, program, week }) {
  async function handleExport() {
    const doc = buildDocument(client, program, week)
    const blob = await Packer.toBlob(doc)
    const name = client
      ? `${client.name.replace(/\s+/g, '_')}_Week${week}.docx`
      : `program_week${week}.docx`
    saveAs(blob, name)
  }

  return (
    <button className="btn btn-secondary" onClick={handleExport}>
      ↓ Export DOCX
    </button>
  )
}

function buildDocument(client, program, week) {
  const children = []

  // Title
  children.push(
    new Paragraph({
      text: client ? `Training Program — ${client.name}` : 'Training Program',
      heading: HeadingLevel.HEADING_1,
    })
  )
  children.push(
    new Paragraph({ text: `Week ${week} of 4`, style: 'Normal' })
  )
  children.push(new Paragraph({ text: '' }))

  // Client summary
  if (client) {
    children.push(new Paragraph({ text: 'Client Profile', heading: HeadingLevel.HEADING_2 }))
    const fields = [
      ['Goals', (client.goals || []).join(', ')],
      ['Experience', client.experience],
      ['Sessions/week', String(client.sessions_per_week || '')],
      ['Session length', client.session_duration ? `${client.session_duration} min` : ''],
      ['Injuries / flags', [...(client.injuries || []), ...(client.medical_flags || [])].join(', ') || 'None'],
      ['Specific goal', client.specific_goals],
    ].filter(([, v]) => v)

    for (const [label, value] of fields) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${label}: `, bold: true }),
            new TextRun({ text: value }),
          ],
        })
      )
    }
    children.push(new Paragraph({ text: '' }))
  }

  // Program days
  for (const day of program) {
    children.push(
      new Paragraph({ text: `${day.label} — ${day.title}`, heading: HeadingLevel.HEADING_2 })
    )

    for (const phaseBlock of day.phases) {
      const filled = phaseBlock.exercises.filter(ex => ex.exerciseName)
      if (!filled.length) continue

      children.push(
        new Paragraph({
          text: PHASE_LABELS[phaseBlock.phase] || phaseBlock.phase,
          heading: HeadingLevel.HEADING_3,
        })
      )

      // Table
      const rows = [
        new TableRow({
          children: ['Exercise', 'Sets', 'Reps', 'Notes'].map(text =>
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
            })
          ),
        }),
        ...filled.map(ex =>
          new TableRow({
            children: [ex.exerciseName, ex.sets, ex.reps, ex.notes].map(text =>
              new TableCell({
                children: [new Paragraph({ text: text || '' })],
              })
            ),
          })
        ),
      ]

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows,
        })
      )
      children.push(new Paragraph({ text: '' }))
    }
  }

  return new Document({ sections: [{ children }] })
}
