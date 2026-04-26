import { useState } from 'react'

const PHASE_LABELS = {
  warmup: 'Warmup',
  activation: 'Activation',
  primer: 'Primer',
  kpi: 'KPI',
  accessory: 'Accessories',
  finisher: 'Finisher',
  cooldown: 'Cooldown',
}

const PHASE_COLORS = {
  warmup: '#0EA5E9',
  activation: '#8B5CF6',
  primer: '#6366F1',
  kpi: '#F59E0B',
  accessory: '#10B981',
  finisher: '#EF4444',
  cooldown: '#64748B',
}

function clean(s) {
  return s ? s.replace(/_/g, ' ') : ''
}

function buildHTML(client, program, progressionWeeks) {
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const goals = (client.goals || []).map(clean).join(', ') || '—'
  const injuries = [...(client.injuries || []), ...(client.medical_flags || [])].map(clean).join(', ') || 'None'

  // ── CSS ──────────────────────────────────────────────────────────────────
  const css = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, sans-serif;
      font-size: 10pt;
      color: #1a1a1a;
      background: #fff;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
    }
    h1 {
      font-size: 22pt;
      font-weight: 700;
      letter-spacing: .04em;
      margin-bottom: 4px;
    }
    .subtitle {
      font-size: 10pt;
      color: #888;
      margin-bottom: 24px;
    }
    .profile-label {
      font-size: 7pt;
      color: #999;
      text-transform: uppercase;
      letter-spacing: .06em;
      margin-top: 10px;
      margin-bottom: 2px;
    }
    .profile-value {
      font-size: 9pt;
      color: #1a1a1a;
      margin-bottom: 0;
    }
    .specific-goal {
      font-size: 9pt;
      color: #555;
      font-style: italic;
      margin-top: 10px;
    }
    .section-title {
      font-size: 11pt;
      font-weight: 700;
      margin: 28px 0 10px;
    }
    .prog-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
    }
    .prog-table th {
      font-size: 7pt;
      color: #999;
      text-transform: uppercase;
      text-align: left;
      padding: 5px 8px;
      border: 0.5px solid #ddd;
      background: #f9f9f9;
      font-weight: normal;
    }
    .prog-table td {
      font-size: 9pt;
      color: #1a1a1a;
      padding: 7px 8px;
      border: 0.5px solid #ddd;
      vertical-align: top;
    }
    .prog-table td.desc {
      color: #444;
    }
    .day-section {
      page-break-before: always;
      padding-top: 20px;
    }
    .day-section:first-of-type {
      page-break-before: avoid;
    }
    .day-heading {
      font-size: 13pt;
      font-weight: 700;
      margin-bottom: 16px;
      padding-bottom: 6px;
      border-bottom: 1.5px solid #1a1a1a;
    }
    .phase-block {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    .phase-label {
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .08em;
      margin-bottom: 6px;
      padding-left: 8px;
    }
    .ex-table {
      width: 100%;
      border-collapse: collapse;
    }
    .ex-table th {
      font-size: 7pt;
      color: #999;
      text-transform: uppercase;
      letter-spacing: .04em;
      text-align: left;
      padding: 3px 0 5px;
      border-bottom: 0.5px solid #ddd;
      font-weight: normal;
    }
    .ex-table th.centre { text-align: center; }
    .ex-table td {
      font-size: 10pt;
      padding: 7px 0;
      border-bottom: 0.5px solid #f0f0f0;
      vertical-align: top;
    }
    .ex-table td.sets, .ex-table td.reps {
      text-align: center;
      width: 60px;
    }
    .ex-table td.notes {
      font-size: 8.5pt;
      color: #666;
      padding-left: 12px;
    }
    .ex-name { font-weight: 700; }
    .superset-badge {
      display: inline-block;
      font-size: 8pt;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 3px;
      margin-right: 6px;
      color: #fff;
    }
    .badge-A { background: #4f7cff; }
    .badge-B { background: #10b981; }
    @media print {
      body { padding: 20px; }
      .day-section { page-break-before: always; }
      .phase-block { page-break-inside: avoid; }
    }
  `

  // ── Profile section ───────────────────────────────────────────────────────
  const profileHTML = `
    <h1>TRAINING PROGRAM</h1>
    <div class="subtitle">${client.name} &nbsp;·&nbsp; ${date}</div>

    <div class="profile-label">Goals</div>
    <div class="profile-value">${goals}</div>

    <div class="profile-label">Experience</div>
    <div class="profile-value">${clean(client.experience || '—')}</div>

    <div class="profile-label">Injuries / flags</div>
    <div class="profile-value">${injuries}</div>

    <div class="profile-label">Session length</div>
    <div class="profile-value">${client.session_duration ? client.session_duration + ' min' : '—'}</div>

    ${client.specific_goals ? `<div class="specific-goal">${client.specific_goals}</div>` : ''}
    ${client.concerns ? `<div class="specific-goal" style="color:#888;">${client.concerns}</div>` : ''}
  `

  // ── Progression table ─────────────────────────────────────────────────────
  const progRows = (progressionWeeks || []).map(w => `
    <tr>
      <td>${w.label || ''}</td>
      <td>${w.title || ''}</td>
      <td class="desc">${w.description || ''}</td>
    </tr>
  `).join('')

  const progressionHTML = progressionWeeks && progressionWeeks.length > 0 ? `
    <div class="section-title">${progressionWeeks.length}-Week Progression Plan</div>
    <table class="prog-table">
      <thead>
        <tr>
          <th style="width:80px">Week</th>
          <th style="width:120px">Focus</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>${progRows}</tbody>
    </table>
  ` : ''

  // ── Program days ──────────────────────────────────────────────────────────
  const daysHTML = program.map((day, di) => {
    const phasesHTML = day.phases.map(ph => {
      const filled = (ph.exercises || []).filter(ex => ex.exerciseName)
      if (!filled.length) return ''

      const color = PHASE_COLORS[ph.phase] || '#888'
      const label = PHASE_LABELS[ph.phase] || ph.phase

      const exRows = filled.map(ex => {
        const sg = ex.supersetGroup
        const badgeClass = sg ? (sg.startsWith('A') ? 'badge-A' : 'badge-B') : ''
        const badge = sg ? `<span class="superset-badge ${badgeClass}">${sg}</span>` : ''
        return `
          <tr>
            <td class="ex-name">${badge}${ex.exerciseName || ''}</td>
            <td class="sets">${ex.sets || '—'}</td>
            <td class="reps">${ex.reps || '—'}</td>
            <td class="notes">${ex.notes || ''}</td>
          </tr>
        `
      }).join('')

      return `
        <div class="phase-block">
          <div class="phase-label" style="color:${color}; border-left: 3px solid ${color};">${label}</div>
          <table class="ex-table">
            <thead>
              <tr>
                <th>Exercise</th>
                <th class="centre" style="width:60px">Sets</th>
                <th class="centre" style="width:60px">Reps</th>
                <th style="padding-left:12px">Notes</th>
              </tr>
            </thead>
            <tbody>${exRows}</tbody>
          </table>
        </div>
      `
    }).join('')

    return `
      <div class="day-section">
        <div class="day-heading">Day ${di + 1} &nbsp;—&nbsp; ${day.title || ''}</div>
        ${phasesHTML}
      </div>
    `
  }).join('')

  // ── Assemble full document ────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${client.name} — Training Program</title>
  <style>${css}</style>
</head>
<body>
  ${profileHTML}
  ${progressionHTML}
  ${daysHTML}
</body>
</html>`
}

export default function ExportButton({ client, program, progressionWeeks, navMode }) {
  const [done, setDone] = useState(false)

  function handleExport() {
    if (!program || !client) return

    const html = buildHTML(client, program, progressionWeeks || [])
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = (client.name || 'program').replace(/\s+/g, '_') + '_Training_Program.html'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    setDone(true)
    setTimeout(() => setDone(false), 3000)
  }

  if (navMode) {
    return (
      <button
        className="nav-btn"
        onClick={handleExport}
        disabled={!program || !client}
        style={done ? { color: 'var(--success)' } : {}}
      >
        {done ? '✓ Downloaded' : 'Create'}
      </button>
    )
  }

  return (
    <button
      className="btn btn-secondary"
      onClick={handleExport}
      disabled={!program || !client}
    >
      {done ? '✓ Downloaded' : '↓ Download Program'}
    </button>
  )
}
