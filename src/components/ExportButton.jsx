import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, ShadingType,
  Header, Footer, PageNumber, TabStopType, TabStopPosition,
  PageBreak,
} from 'docx'
import { saveAs } from 'file-saver'
import { PHASE_LABELS } from '../logic/split'

// ── Constants ─────────────────────────────────────────────────────────────────
// A4 with 1" margins: content width = 11906 - 2880 = 9026 DXA
const PAGE_WIDTH   = 11906
const PAGE_HEIGHT  = 16838
const MARGIN       = 1440   // 1 inch
const CONTENT_W    = PAGE_WIDTH - MARGIN * 2   // 9026 DXA

// Exercise table column widths (must sum to CONTENT_W)
const COL_EX    = 4513   // 50% — exercise name
const COL_SETS  = 800    // ~9%
const COL_REPS  = 800    // ~9%
const COL_NOTES = 2913   // ~32%

// Phase colours (hex, no #)
const PHASE_COLOR = {
  warmup:     '0EA5E9',
  activation: '8B5CF6',
  primer:     '6366F1',
  kpi:        'F59E0B',
  accessory:  '10B981',
  finisher:   'EF4444',
  cooldown:   '64748B',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
// docx size is in half-points: 10pt = 20, 11pt = 22, 12pt = 24
const hp = pt => pt * 2

function noBorder() {
  const n = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
  return { top: n, bottom: n, left: n, right: n }
}

function thinBorder(color = 'E2E8F0') {
  const b = { style: BorderStyle.SINGLE, size: 1, color }
  return { top: b, bottom: b, left: b, right: b }
}

function txt(text, opts = {}) {
  return new TextRun({
    text: String(text || ''),
    font:    'Arial',
    size:    hp(opts.size || 10),
    bold:    opts.bold  || false,
    italics: opts.italic || false,
    color:   opts.color || '1A1A1A',
    characterSpacing: opts.spacing || 0,
  })
}

function para(children, opts = {}) {
  return new Paragraph({
    alignment: opts.align || AlignmentType.LEFT,
    spacing:   { before: opts.before || 0, after: opts.after || 0 },
    border:    opts.border || undefined,
    children:  Array.isArray(children) ? children : [children],
  })
}

function gap(dxa = 120) {
  return new Paragraph({ text: '', spacing: { before: 0, after: dxa } })
}

// ── Header — uses tab stop, no table ─────────────────────────────────────────
function buildHeader(clientName, week) {
  return new Header({
    children: [
      new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '1A1A1A', space: 4 } },
        spacing: { after: 0 },
        tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W }],
        children: [
          txt('TRAINING PROGRAM', { size: 11, bold: true, spacing: 60 }),
          txt(`   ·   Week ${week} of 4`, { size: 9, color: '888888' }),
          new TextRun({ text: '\t', font: 'Arial', size: hp(9) }),
          txt(clientName || '', { size: 10, bold: true }),
          txt(`   ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`, { size: 9, color: '888888' }),
        ],
      }),
      gap(160),
    ],
  })
}

// ── Footer ────────────────────────────────────────────────────────────────────
function buildFooter(week) {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0', space: 4 } },
        spacing: { before: 80 },
        children: [
          txt(`Week ${week} of 4   ·   `, { size: 8, color: 'AAAAAA' }),
          new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: hp(8), color: 'AAAAAA' }),
          txt(' / ', { size: 8, color: 'AAAAAA' }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], font: 'Arial', size: hp(8), color: 'AAAAAA' }),
        ],
      }),
    ],
  })
}

// ── Client info grid ──────────────────────────────────────────────────────────
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

  const cellW = Math.floor(CONTENT_W / 4)

  const row = new TableRow({
    children: cells.map(([label, value], i) =>
      new TableCell({
        width: { size: cellW, type: WidthType.DXA },
        borders: thinBorder('E2E8F0'),
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [
          para([txt(label.toUpperCase(), { size: 7, color: '999999', spacing: 60 })], { after: 30 }),
          para([txt(value, { size: 10, bold: true })]),
        ],
      })
    ),
  })

  return [
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [cellW, cellW, cellW, cellW],
      rows: [row],
    }),
    gap(240),
  ]
}

// ── Day heading ───────────────────────────────────────────────────────────────
function buildDayHeading(day, dayIndex, totalDays) {
  return [
    para(
      [
        txt(`DAY ${dayIndex + 1}   `, { size: 8, bold: true, color: '999999', spacing: 100 }),
        txt(`${dayIndex + 1} / ${totalDays}`, { size: 8, color: 'CCCCCC' }),
      ],
      { after: 40 }
    ),
    para([txt(day.title, { size: 14, bold: true })], { after: 120 }),
  ]
}

// ── Phase section ─────────────────────────────────────────────────────────────
function buildPhaseSection(phaseBlock) {
  const { phase, exercises } = phaseBlock
  const filled = exercises.filter(ex => ex.exerciseName)
  if (!filled.length) return []

  const color  = PHASE_COLOR[phase] || '888888'
  const label  = (PHASE_LABELS[phase] || phase).toUpperCase()
  const result = []

  // Phase label with coloured left border on paragraph
  result.push(
    new Paragraph({
      border: { left: { style: BorderStyle.SINGLE, size: 12, color, space: 8 } },
      spacing: { before: 0, after: 40 },
      children: [
        txt(label, { size: 8, bold: true, color, spacing: 80 }),
      ],
    })
  )

  // Table header row
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      ['Exercise', COL_EX],
      ['Sets', COL_SETS],
      ['Reps', COL_REPS],
      ['Notes', COL_NOTES],
    ].map(([label, w]) =>
      new TableCell({
        width: { size: w, type: WidthType.DXA },
        borders: {
          top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
          left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        },
        margins: { top: 40, bottom: 60, left: 0, right: 60 },
        children: [para([txt(label.toUpperCase(), { size: 7, color: '999999', spacing: 50 })])],
      })
    ),
  })

  // Exercise rows
  const exRows = filled.map((ex, i) => {
    const isLast = i === filled.length - 1
    const botBorder = isLast
      ? { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
      : { style: BorderStyle.SINGLE, size: 1, color: 'F0F0F0' }
    const cellBorders = {
      top:    { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: botBorder,
      left:   { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right:  { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    }
    const cellMargins = { top: 80, bottom: 80, left: 0, right: 60 }

    return new TableRow({
      children: [
        new TableCell({
          width: { size: COL_EX, type: WidthType.DXA },
          borders: cellBorders, margins: cellMargins,
          children: [para([txt(ex.exerciseName, { size: 10, bold: true })])],
        }),
        new TableCell({
          width: { size: COL_SETS, type: WidthType.DXA },
          borders: cellBorders, margins: cellMargins,
          children: [para([txt(ex.sets || '—', { size: 10 })])],
        }),
        new TableCell({
          width: { size: COL_REPS, type: WidthType.DXA },
          borders: cellBorders, margins: cellMargins,
          children: [para([txt(ex.reps || '—', { size: 10 })])],
        }),
        new TableCell({
          width: { size: COL_NOTES, type: WidthType.DXA },
          borders: cellBorders, margins: cellMargins,
          children: [para([txt(ex.notes || '', { size: 9, color: '888888', italic: true })])],
        }),
      ],
    })
  })

  result.push(
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [COL_EX, COL_SETS, COL_REPS, COL_NOTES],
      rows: [headerRow, ...exRows],
    })
  )
  result.push(gap(200))
  return result
}

// ── Main builder ──────────────────────────────────────────────────────────────
function buildDocument(client, program, week) {
  const sections = program.map((day, dayIndex) => {
    const children = []

    if (dayIndex === 0 && client) {
      children.push(...buildClientGrid(client))
    }

    children.push(...buildDayHeading(day, dayIndex, program.length))

    if (dayIndex === 0 && client?.specific_goals) {
      children.push(
        para([
          txt('Goal note:  ', { size: 9, bold: true, color: '888888' }),
          txt(client.specific_goals, { size: 9, color: '888888', italic: true }),
        ], { after: 200 })
      )
    }

    for (const phaseBlock of day.phases) {
      children.push(...buildPhaseSection(phaseBlock))
    }

    // Page break between days (except last)
    if (dayIndex < program.length - 1) {
      children.push(new Paragraph({ children: [new PageBreak()] }))
    }

    return {
      headers: { default: buildHeader(client?.name || '', week) },
      footers: { default: buildFooter(week) },
      properties: {
        page: {
          size:   { width: PAGE_WIDTH, height: PAGE_HEIGHT },
          margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
        },
      },
      children,
    }
  })

  return new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Arial', size: hp(10), color: '1A1A1A' },
          paragraph: { spacing: { after: 0 } },
        },
      },
    },
    sections,
  })
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ExportButton({ client, program, week }) {
  async function handleExport() {
    const doc  = buildDocument(client, program, week)
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
