import { useState } from 'react'
import { useSheets } from '../hooks/useSheets'

export default function SessionNoteModal({ client }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [saved, setSaved] = useState(false)
  const { addNote, loading } = useSheets()

  async function handleSave() {
    if (!text.trim()) return
    const ok = await addNote({
      clientName: client?.name || 'Unknown',
      note: text.trim(),
      timestamp: new Date().toLocaleString('de-DE'),
    })
    if (ok) {
      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        setText('')
        setOpen(false)
      }, 1200)
    }
  }

  function handleClose() {
    setText('')
    setSaved(false)
    setOpen(false)
  }

  return (
    <>
      <button className="fab" onClick={() => setOpen(true)} title="Add session note">
        +
      </button>

      {open && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && handleClose()}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Session note</span>
              <button className="btn btn-ghost btn-icon" onClick={handleClose}>×</button>
            </div>

            {client ? (
              <p className="text-sm text-muted" style={{ marginBottom: 12 }}>
                Client: <strong style={{ color: 'var(--text)' }}>{client.name}</strong>
                <span style={{ marginLeft: 8 }}>{new Date().toLocaleDateString('de-DE')}</span>
              </p>
            ) : (
              <p className="text-sm" style={{ color: 'var(--warning)', marginBottom: 12 }}>
                No client selected — note will save with timestamp only.
              </p>
            )}

            {!localStorage.getItem('pb_gas_url') && (
              <p className="text-sm" style={{ color: 'var(--warning)', marginBottom: 12 }}>
                No Apps Script URL set. Note will not sync to Sheets.
              </p>
            )}

            <textarea
              rows={5}
              placeholder="Type your note here…"
              value={text}
              onChange={e => setText(e.target.value)}
              autoFocus
              style={{ resize: 'vertical' }}
            />

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={handleClose}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={!text.trim() || loading || saved}
              >
                {saved ? '✓ Saved' : loading ? <span className="loader" /> : 'Save note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
