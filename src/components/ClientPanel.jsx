import { useState, useEffect } from 'react'
import { useSheets } from '../hooks/useSheets'

export default function ClientPanel({ client, onClientChange, onGenerate }) {
  const [clients, setClients] = useState([])
  const [selectedRow, setSelectedRow] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const { fetchClients, fetchClient, loading, error } = useSheets()

  useEffect(() => {
    loadClients()
  }, [])

  async function loadClients() {
    const list = await fetchClients()
    setClients(list)
  }

  async function handleSelect(e) {
    const row = e.target.value
    setSelectedRow(row)
    if (!row) { onClientChange(null); return }
    const c = await fetchClient(row)
    onClientChange(c)
  }

  const noGas = !localStorage.getItem('pb_gas_url')

  return (
    <>
      <div className={`client-panel-inner`}>
      <div className="panel-header" onClick={() => setPanelOpen(o => !o)}>Client</div>
      <div className="panel-body">

        {noGas && (
          <div
            className="badge badge-warning"
            style={{ display: 'block', marginBottom: 10, padding: '6px 10px', borderRadius: 6 }}
          >
            Add Apps Script URL in Settings to sync clients from Sheets.
          </div>
        )}

        <div className="client-select-wrap">
          <label>Select client</label>
          <select value={selectedRow} onChange={handleSelect} disabled={loading}>
            <option value="">— choose —</option>
            {clients.map((c, i) => (
              <option key={i} value={c._row}>{c.name}</option>
            ))}
          </select>
          {loading && <div style={{ marginTop: 6 }}><span className="loader" /></div>}
          {error && <p className="text-sm" style={{ color: 'var(--danger)', marginTop: 6 }}>{error}</p>}
        </div>

        <button
          className="btn btn-ghost btn-sm"
          style={{ width: '100%', marginBottom: 12 }}
          onClick={loadClients}
          disabled={loading}
        >
          ↻ Refresh
        </button>

        {client && <ClientCard client={client} />}

        {!client && !noGas && (
          <p className="text-sm text-muted" style={{ textAlign: 'center', marginTop: 24 }}>
            Select a client to view their profile.
          </p>
        )}
      </div>

      <div className="panel-footer">
        <button
          className="btn btn-primary"
          style={{ width: '100%' }}
          onClick={onGenerate}
          disabled={!client}
        >
          Generate Template
        </button>
      </div>
    </>
  )
}

function ClientCard({ client }) {
  return (
    <div className="client-card">
      <div className="client-name">{client.name}</div>

      <div className="client-meta">
        {client.age && <span className="tag">{client.age}y</span>}
        {client.sex && <span className="tag">{client.sex}</span>}
        {client.experience && <span className="tag">{client.experience}</span>}
        {(client.goals || []).map(g => (
          <span key={g} className="tag goal">{g}</span>
        ))}
        {(client.injuries || []).filter(i => i && i !== 'none').map(i => (
          <span key={i} className="tag injury">{i}</span>
        ))}
      </div>

      <div className="section-title">Training</div>
      <InfoRow label="Sessions/week" value={client.sessions_per_week} />
      <InfoRow label="Session length" value={client.session_duration ? `${client.session_duration} min` : '—'} />
      <InfoRow label="Fitness level" value={client.fitness_level} />

      {client.specific_goals && (
        <>
          <div className="section-title" style={{ marginTop: 10 }}>Specific goal</div>
          <p className="text-sm text-muted">{client.specific_goals}</p>
        </>
      )}

      {client.schedule_preference && (
        <>
          <div className="section-title" style={{ marginTop: 10 }}>Schedule</div>
          <p className="text-sm text-muted">{client.schedule_preference}</p>
        </>
      )}

      {(client.additional_notes || client.concerns) && (
        <>
          <div className="section-title" style={{ marginTop: 10 }}>Notes</div>
          {client.concerns && <p className="text-sm text-muted">{client.concerns}</p>}
          {client.additional_notes && <p className="text-sm text-muted" style={{ marginTop: 4 }}>{client.additional_notes}</p>}
        </>
      )}

      {(client.session_notes || []).length > 0 && (
        <>
          <div className="section-title" style={{ marginTop: 10 }}>Session notes</div>
          <div className="notes-list">
            {client.session_notes.slice(-5).reverse().map((n, i) => (
              <div key={i} className="note-item">
                <div className="note-date">{n.timestamp}</div>
                {n.text}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div className="info-row">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
