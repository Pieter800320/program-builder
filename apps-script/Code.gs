/**
 * Program Builder — Google Apps Script backend
 *
 * SETUP:
 * 1. Open script.google.com and create a new project
 * 2. Paste this file as Code.gs
 * 3. Set SHEET_ID below to your Google Sheets spreadsheet ID
 *    (the long string in the URL: /spreadsheets/d/THIS_PART/edit)
 * 4. Set INTAKE_SHEET_NAME to your form responses tab name
 * 5. Deploy → New deployment → Web app
 *    Execute as: Me | Access: Anyone
 * 6. Copy the /exec URL into Program Builder Settings
 */

const SHEET_ID          = 'YOUR_SPREADSHEET_ID_HERE'
const INTAKE_SHEET_NAME = 'Form Responses 1'   // adjust if different
const NOTES_SHEET_NAME  = 'Session Notes'

// ── Column map — adjust indices to match your form column order ──────────────
// 0-indexed. Timestamp is always col 0 from Google Forms.
const COL = {
  timestamp:           0,
  name:                1,
  age:                 2,
  sex:                 3,
  goals:               4,
  specific_goals:      5,
  experience:          6,
  training_history:    7,
  injuries:            8,
  sessions_per_week:   9,
  session_duration:    10,
  schedule_preference: 11,
  equipment_available: 12,
  equipment_preferred: 13,
  likes_dislikes:      14,
  activity_level:      15,
  sleep:               16,
  stress:              17,
  success_metrics:     18,
  concerns:            19,
  additional_notes:    20,
  fitness_level:       21,
}

// ── Taxonomy mappings ─────────────────────────────────────────────────────────
const GOAL_MAP = {
  'lose weight': 'fat_loss', 'fat loss': 'fat_loss', 'weight loss': 'fat_loss',
  'lose fat': 'fat_loss', 'burn fat': 'fat_loss',
  'build muscle': 'hypertrophy', 'muscle': 'hypertrophy', 'gain muscle': 'hypertrophy',
  'hypertrophy': 'hypertrophy', 'toning': 'hypertrophy',
  'strength': 'strength', 'get stronger': 'strength', 'powerlifting': 'strength',
  'mobility': 'mobility', 'flexibility': 'mobility', 'stretching': 'mobility',
  'health': 'health', 'general health': 'health', 'wellness': 'health',
  'conditioning': 'conditioning', 'cardio': 'conditioning', 'endurance': 'conditioning',
  'stability': 'stability', 'balance': 'stability',
  'explosive': 'explosive_power', 'athletic': 'explosive_power', 'speed': 'explosive_power',
}

const EXPERIENCE_MAP = {
  'beginner': 'beginner', 'new': 'beginner', 'novice': 'beginner', 'no experience': 'beginner',
  'intermediate': 'intermediate', 'some experience': 'intermediate', '1-3 years': 'intermediate',
  'advanced': 'advanced', 'experienced': 'advanced', '3+ years': 'advanced',
}

const EQUIPMENT_MAP = {
  'barbell': 'barbell', 'barbells': 'barbell',
  'dumbbell': 'dumbbell', 'dumbbells': 'dumbbell',
  'cable': 'cable', 'cables': 'cable', 'cable machine': 'cable',
  'machine': 'machine', 'machines': 'machine',
  'kettlebell': 'kettlebell', 'kettlebells': 'kettlebell',
  'bodyweight': 'bodyweight', 'body weight': 'bodyweight', 'no equipment': 'bodyweight',
  'band': 'band', 'bands': 'band', 'resistance band': 'band',
  'landmine': 'landmine',
  'medicine ball': 'medicine_ball', 'med ball': 'medicine_ball',
  'pull up bar': 'pull_up_bar', 'pull-up bar': 'pull_up_bar',
  'powerbag': 'powerbag', 'power bag': 'powerbag',
  'rowing machine': 'rowing_machine', 'rower': 'rowing_machine',
  'assault bike': 'assault_bike', 'air bike': 'assault_bike',
  'assault treadmill': 'assault_treadmill',
  'back extension': 'back_extension_bench', 'hyperextension': 'back_extension_bench',
  'leg press': 'leg_press_machine',
}

const INJURY_MAP = {
  'knee': 'knee_pain', 'knee pain': 'knee_pain', 'knees': 'knee_pain',
  'back': 'low_back_pain', 'lower back': 'low_back_pain', 'back pain': 'low_back_pain',
  'shoulder': 'shoulder_pain', 'shoulder pain': 'shoulder_pain', 'shoulders': 'shoulder_pain',
  'elbow': 'elbow_pain', 'elbow pain': 'elbow_pain',
  'wrist': 'wrist_pain', 'wrist pain': 'wrist_pain',
  'hypermobility': 'hypermobility',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function normalizeArray(raw, mapObj) {
  if (!raw) return []
  return raw.split(/[,;\/\n]/)
    .map(s => s.trim().toLowerCase())
    .map(s => {
      for (const [k, v] of Object.entries(mapObj)) {
        if (s.includes(k)) return v
      }
      return null
    })
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i) // dedupe
}

function normalizeFirst(raw, mapObj, fallback) {
  if (!raw) return fallback
  const lower = raw.trim().toLowerCase()
  for (const [k, v] of Object.entries(mapObj)) {
    if (lower.includes(k)) return v
  }
  return fallback
}

function normalizeLevel(raw) {
  if (!raw) return 'moderate'
  const l = raw.toLowerCase()
  if (l.includes('low') || l.includes('poor') || l.includes('high stress')) return 'low'
  if (l.includes('high') || l.includes('very') || l.includes('good')) return 'high'
  return 'moderate'
}

function rowToClient(row, rowIndex) {
  return {
    _row: rowIndex,
    created_at:          row[COL.timestamp] ? row[COL.timestamp].toString() : '',
    name:                row[COL.name] || '',
    age:                 parseInt(row[COL.age]) || null,
    sex:                 row[COL.sex] ? row[COL.sex].toString().toLowerCase() : 'other',
    goals:               normalizeArray(row[COL.goals], GOAL_MAP),
    specific_goals:      row[COL.specific_goals] || '',
    experience:          normalizeFirst(row[COL.experience], EXPERIENCE_MAP, 'beginner'),
    training_history:    row[COL.training_history] ? [row[COL.training_history].toString()] : [],
    injuries:            normalizeArray(row[COL.injuries], INJURY_MAP),
    medical_flags:       [],
    sessions_per_week:   parseInt(row[COL.sessions_per_week]) || 3,
    session_duration:    parseInt(row[COL.session_duration]) || 60,
    schedule_preference: row[COL.schedule_preference] || '',
    equipment_available: normalizeArray(row[COL.equipment_available], EQUIPMENT_MAP),
    equipment_preferred: normalizeArray(row[COL.equipment_preferred], EQUIPMENT_MAP),
    likes:               [],
    dislikes:            [],
    activity_level:      normalizeLevel(row[COL.activity_level]),
    sleep:               normalizeLevel(row[COL.sleep]),
    stress:              normalizeLevel(row[COL.stress]),
    success_metrics:     row[COL.success_metrics] || '',
    concerns:            row[COL.concerns] || '',
    additional_notes:    [row[COL.additional_notes], row[COL.fitness_level]]
                           .filter(Boolean).join(' | '),
    fitness_level:       normalizeLevel(row[COL.fitness_level]),
  }
}

function getOrCreateNotesSheet(ss) {
  let sheet = ss.getSheetByName(NOTES_SHEET_NAME)
  if (!sheet) {
    sheet = ss.insertSheet(NOTES_SHEET_NAME)
    sheet.appendRow(['Timestamp', 'Client Name', 'Note'])
    sheet.setFrozenRows(1)
  }
  return sheet
}

function getSessionNotes(ss, clientName) {
  const sheet = ss.getSheetByName(NOTES_SHEET_NAME)
  if (!sheet) return []
  const rows = sheet.getDataRange().getValues().slice(1)
  return rows
    .filter(r => r[1] && r[1].toString().toLowerCase() === clientName.toLowerCase())
    .map(r => ({ timestamp: r[0].toString(), text: r[2].toString() }))
    .slice(-20) // last 20 notes
}

// ── Handlers ──────────────────────────────────────────────────────────────────
function handleGetClients(ss) {
  const sheet = ss.getSheetByName(INTAKE_SHEET_NAME)
  if (!sheet) return { clients: [] }

  const rows = sheet.getDataRange().getValues()
  const dataRows = rows.slice(1) // skip header

  const clients = dataRows
    .map((row, i) => ({ _row: i + 2, name: row[COL.name] || `Row ${i + 2}` }))
    .filter(c => c.name)

  return { clients }
}

function handleGetClient(ss, row) {
  const sheet = ss.getSheetByName(INTAKE_SHEET_NAME)
  if (!sheet) return { client: null }

  const rowIndex = parseInt(row)
  const rowData = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0]
  const client = rowToClient(rowData, rowIndex)

  // Attach session notes
  client.session_notes = getSessionNotes(ss, client.name)

  return { client }
}

function handleAddNote(ss, params) {
  const sheet = getOrCreateNotesSheet(ss)
  sheet.appendRow([
    params.timestamp || new Date().toISOString(),
    params.clientName || '',
    params.note || '',
  ])
  return { ok: true }
}

// ── Entry points ──────────────────────────────────────────────────────────────
function doGet(e) {
  const ss = SpreadsheetApp.openById(SHEET_ID)
  const action = e.parameter.action

  let result
  if (action === 'getClients') {
    result = handleGetClients(ss)
  } else if (action === 'getClient') {
    result = handleGetClient(ss, e.parameter.row)
  } else {
    result = { error: 'Unknown action' }
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON)
}

function doPost(e) {
  const ss = SpreadsheetApp.openById(SHEET_ID)
  const params = e.parameter

  let result
  if (params.action === 'addNote') {
    result = handleAddNote(ss, params)
  } else {
    result = { error: 'Unknown action' }
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON)
}
