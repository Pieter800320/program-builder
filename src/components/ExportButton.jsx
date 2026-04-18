import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, ShadingType,
  Header, Footer, PageNumber, NumberFormat,
  convertInchesToTwip, convertMillimetersToTwip,
} from 'docx'
import { saveAs } from 'file-saver'
import { PHASE_LABELS } from '../logic/split'

const BLACK  = '1A1A1A'
const GRAY   = '888888'
const LGRAY  = 'F0F0F0'
const WHITE  = 'FFFFFF'
const MGRAY  = 'CCCCCC'

const PHASE_HEX = {
  warmup:     '0EA5E9',
  activation: '8B5CF6',
  primer:     '6366F1',
  kpi:        'F59E0B',
  accessory:  '10B981',
  finisher:   'EF4444',
  cooldown:   '64748B',
}

const PHASE_TIMES = {
  warmup:     '5–10 min',
  activation: '5–8 min',
  primer:     '5–8 min',
  kpi:        '15–20 min',
  accessory:  '15–20 min',
  finisher:   '5–8 min',
  cooldown:   '5 min',
}

const pt   = n => n * 20
const twip = convertInchesToTwip
const mm   = convertMillimetersToTwip

function noBorder() {
  const n = { style: BorderStyle.NONE, size: 0, color: WHITE }
  return { top: n, bottom: n, left: n, right: n }
}

function run(text, opts = {}) {
  return new TextRun({
    text: text || '',
    font: 'Calibri',
    size: pt(opts.size || 10),
    bold: opts.bold || false,
    italics: opts.italic || false,
    color: opts.color || BLACK,
    characterSpacing: opts.spacing || 0,
  })
}

function emptyPara(after = 80) {
  return new Paragraph({ text: '', spacing: { after } })
}

function buildHeader(client, week) {
  return new Header({
    children: [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          ...noBorder(),
          bottom: { style: BorderStyle.SINGLE, size: 6, color: BLACK },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: noBorder(),
                children: [
                  new Paragraph({
                    spacing: { after: 60 },
                    children: [
                      run('TRAINING PROGRAM', { size: 12, bold: true, spacing: 80 }),
                      run(`   ·   Week ${week} of 4`, { size: 9, color: GRAY }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                borders: noBorder(),
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    spacing: { after: 60 },
                    children: [
                      run(client?.name || '', { size: 10, bold: true }),
                      run(`   ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`, { size: 9, color: GRAY }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      emptyPara(120),
    ],
  })
}

function buildFooter(week) {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 2, color: LGRAY } },
        spacing: { before: 60 },
        children: [
          run(`Week ${week} of 4   ·   `, { size: 8, color: GRAY }),
          new TextRun({ children: [PageNumber.CURRENT], font: 'Calibri', size: pt(8), color: GRAY }),
          run(' / ', { size: 8, color: GRAY }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], font: 'Calibri', size: pt(8), color: GRAY }),
        ],
      }),
    ],
  })
}

function buildClientGrid(client) {
  const injuries = [...(client.injuries || []), ...(client.medical_flags || [])]
    .filter(Boolean).join(', ') || 'None'
  const goals = (client.goals || []).join(', ') || '—'

  const cells = [
    ['Goals',           goals],
    ['Experience',      client.experience || '—'],
    ['Injuries / flags', injuries],
    ['Session length',  client.session_duration ? `${client.session_duration} min` : '—'],
  ]

  const borderThin = { style: BorderStyle.SINGLE, size: 2, color: LGRAY }
  const borderNone = { style: BorderStyle.NONE, size: 0, color: WHITE }

  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: cells.map(([label, value], i) =>
            new TableCell({
              borders: {
                top: borderThin, bottom: borderThin,
                left: borderThin,
                right: i === cells.length - 1 ? borderThin : borderNone,
              },
              margins: { top: mm(2.5), bottom: mm(2.5), left: mm(3.5), right: mm(3.5) },
              children: [
                new Paragraph({
                  spacing: { after: 30 },
                  children: [run(label.toUpperCase(), { size: 7.5, color: GRAY, spacing: 60 })],
                }),
                new Paragraph({
                  children: [run(value, { size: 10, bold: true })],
                }),
              ],
            })
          ),
        }),
      ],
    }),
    emptyPara(220),
  ]
}

function buildDayHeader(day, dayIndex, totalDays) {
  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: noBorder(),
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: noBorder(),
              children: [
                new Paragraph({
                  spacing: { after: 30 },
                  children: [run(`DAY ${dayIndex + 1}`, { size: 8, bold: true, color: GRAY, spacing: 100 })],
                }),
                new Paragraph({
                  spacing: { after: 80 },
                  children: [run(day.title, { size: 14, bold: true })],
                }),
              ],
            }),
            new TableCell({
              borders: noBorder(),
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [run(`${dayIndex + 1} / ${totalDays}`, { size: 9, color: GRAY })],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    emptyPara(40),
  ]
}

function buildPhaseSection(phaseBlock) {
  const { phase, exercises } = phaseBlock
  const filled = exercises.filter(ex => ex.exerciseName)
  if (!filled.length) return []

  const hex   = PHASE_HEX[phase]    || '888888'
  const label = PHASE_LABELS[phase] || phase
  const time  = PHASE_TIMES[phase]  || ''
  const result = []

  // Phase label with colour accent bar
  result.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: noBorder(),
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: mm(5), type: WidthType.DXA },
              borders: noBorder(),
              shading: { type: ShadingType.SOLID, color: hex },
              children: [new Paragraph({ text: '' })],
            }),
            new TableCell({
              borders: noBorder(),
              margins: { left: mm(3) },
              children: [
                new Paragraph({
                  children: [
                    run(label.toUpperCase(), { size: 8.5, bold: true, color: hex, spacing: 80 }),
                    run(`   ${time}`, { size: 8.5, color: GRAY }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    })
  )
  result.push(emptyPara(50))

  // Table header
  const colWidths = [44, 9, 9, 38]
  const colLabels = ['Exercise', 'Sets', 'Reps', 'Notes']
  const headerRow = new TableRow({
    tableHeader: true,
    children: colLabels.map((text, i) =>
      new TableCell({
        width: { size: colWidths[i], type: WidthType.PERCENTAGE },
        borders: {
          top:    { style: BorderStyle.NONE,   size: 0, color: WHITE },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: MGRAY },
          left:   { style: BorderStyle.NONE,   size: 0, color: WHITE },
          right:  { style: BorderStyle.NONE,   size: 0, color: WHITE },
        },
        margins: { top: mm(1), bottom: mm(2), left: mm(0), right: mm(2) },
        children: [
          new Paragraph({
            children: [run(text.toUpperCase(), { size: 7.5, color: GRAY, spacing: 50 })],
          }),
        ],
      })
    ),
  })

  // Exercise rows
  const exerciseRows = filled.map((ex, i) => {
    const isLast = i === filled.length - 1
    const botBorder = isLast
      ? { style: BorderStyle.NONE,   size: 0, color: WHITE }
      : { style: BorderStyle.SINGLE, size: 1, color: LGRAY }
    const cellBorders = {
      top:    { style: BorderStyle.NONE, size: 0, color: WHITE },
      bottom: botBorder,
      left:   { style: BorderStyle.NONE, size: 0, color: WHITE },
      right:  { style: BorderStyle.NONE, size: 0, color: WHITE },
    }
    const cellMargins = { top: mm(2.5), bottom: mm(2.5), left: mm(0), right: mm(2) }

    return new TableRow({
      children: [
        new TableCell({
          borders: cellBorders, margins: cellMargins,
          children: [new Paragraph({ children: [run(ex.exerciseName, { size: 10, bold: true })] })],
        }),
        new TableCell({
          borders: cellBorders, margins: cellMargins,
          children: [new Paragraph({ children: [run(ex.sets || '—', { size: 10 })] })],
        }),
        new TableCell({
          borders: cellBorders, margins: cellMargins,
          children: [new Paragraph({ children: [run(ex.reps || '—', { size: 10 })] })],
        }),
        new TableCell({
          borders: cellBorders, margins: cellMargins,
          children: [new Paragraph({ children: [run(ex.notes || '', { size: 9, color: GRAY, italic: true })] })],
        }),
      ],
    })
  })

  result.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [headerRow, ...exerciseRows],
    })
  )
  result.push(emptyPara(180))
  return result
}

function buildDocument(client, program, week) {
  const sections = program.map((day, dayIndex) => {
    const children = []

    if (dayIndex === 0 && client) {
      children.push(...buildClientGrid(client))
    }

    children.push(...buildDayHeader(day, dayIndex, program.length))

    if (dayIndex === 0 && client?.specific_goals) {
      children.push(
        new Paragraph({
          spacing: { after: 180 },
          children: [
            run('Goal note:  ', { size: 9, bold: true, color: GRAY }),
            run(client.specific_goals, { size: 9, color: GRAY, italic: true }),
          ],
        })
      )
    }

    for (const phaseBlock of day.phases) {
      children.push(...buildPhaseSection(phaseBlock))
    }

    return {
      headers: { default: buildHeader(client, week) },
      footers: { default: buildFooter(week) },
      properties: {
        page: {
          margin: {
            top:    twip(0.85),
            bottom: twip(0.85),
            left:   twip(0.95),
            right:  twip(0.95),
          },
        },
      },
      children,
    }
  })

  return new Document({ sections })
}

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