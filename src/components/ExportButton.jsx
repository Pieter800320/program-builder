import { useState } from 'react'

function getGasUrl() {
  return localStorage.getItem('pb_gas_url') || ''
}

export default function ExportButton({ client, program, week, progressionWeeks, navMode }) {
  const [loading, setLoading] = useState(false)
  const [docUrl, setDocUrl] = useState(null)
  const [folderUrl, setFolderUrl] = useState(null)
  const [error, setError] = useState(null)

  async function handleExport() {
    const url = getGasUrl()
    if (!url) {
      setError('No Apps Script URL in Settings.')
      return
    }
    if (!program || !client) return

    setLoading(true)
    setError(null)
    setDocUrl(null)

    try {
      const payload = JSON.stringify({
        clientName:    client.name,
        week,
        program,
        clientProfile: client,
        progressionWeeks: progressionWeeks || [],
      })

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `action=createDoc&payload=${encodeURIComponent(payload)}`,
      })

      const data = await res.json()

      if (data.ok && data.url) {
        setDocUrl(data.url)
        setFolderUrl(data.folderUrl || null)
        // Open the doc immediately
        window.open(data.url, '_blank')
      } else {
        setError(data.error || 'Failed to create document.')
      }
    } catch (e) {
      setError('Could not reach Apps Script.')
    } finally {
      setLoading(false)
    }
  }

  if (navMode) {
    return (
      <>
        <button
          className="nav-btn"
          onClick={handleExport}
          disabled={loading || !program || !client}
        >
          {loading ? 'Creating…' : docUrl ? '✓ Created' : 'Create'}
        </button>
        {docUrl && (
          <a href={docUrl} target="_blank" rel="noreferrer"
            className="nav-btn" style={{ color: 'var(--success)', textDecoration: 'none' }}>
            ↗
          </a>
        )}
      </>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        className="btn btn-secondary"
        onClick={handleExport}
        disabled={loading || !program || !client}
      >
        {loading ? <><span className="loader" /> Creating doc…</> : '↗ Share to Google Docs'}
      </button>
      {docUrl && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <a href={docUrl} target="_blank" rel="noreferrer"
            className="btn btn-ghost btn-sm" style={{ color: 'var(--success)' }}>
            ✓ Open doc
          </a>
          {folderUrl && (
            <a href={folderUrl} target="_blank" rel="noreferrer"
              className="btn btn-ghost btn-sm" style={{ color: 'var(--text3)' }}>
              📁 Clients folder
            </a>
          )}
        </div>
      )}
      {error && (
        <span className="text-sm" style={{ color: 'var(--danger)' }}>{error}</span>
      )}
    </div>
  )
}
