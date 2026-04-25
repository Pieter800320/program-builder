import { useState } from 'react'

export default function SettingsModal({ onClose, onExportCustom, customCount }) {
  const [apiKey, setApiKey] = useState(localStorage.getItem('pb_api_key') || '')
  const [gasUrl, setGasUrl] = useState(localStorage.getItem('pb_gas_url') || '')
  const [saved, setSaved] = useState(false)

  function handleSave() {
    localStorage.setItem('pb_api_key', apiKey.trim())
    localStorage.setItem('pb_gas_url', gasUrl.trim())
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 800)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <span className="modal-title">Settings</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>×</button>
        </div>

        <div className="settings-section">
          <h3>Anthropic API key</h3>
          <div className="field">
            <label>API key — stored in localStorage only</label>
            <input
              type="password"
              placeholder="sk-ant-…"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
            />
          </div>
          <p className="text-sm text-muted">
            Used for AI coaching cues, quality checks, and auto-tagging exercises.
          </p>
        </div>

        <div className="divider" />

        <div className="settings-section">
          <h3>Google Apps Script URL</h3>
          <div className="field">
            <label>Web App URL — paste after deploying Code.gs</label>
            <input
              type="url"
              placeholder="https://script.google.com/macros/s/…/exec"
              value={gasUrl}
              onChange={e => setGasUrl(e.target.value)}
            />
          </div>
          <p className="text-sm text-muted" style={{ marginBottom: 8 }}>
            Enables client sync from Google Sheets and session note saving.
          </p>
          <div
            style={{
              background: 'var(--bg3)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '10px 12px',
              fontSize: 12,
              color: 'var(--text2)',
            }}
          >
            <strong style={{ color: 'var(--text)' }}>Setup steps:</strong>
            <ol style={{ paddingLeft: 16, marginTop: 6, lineHeight: 1.8 }}>
              <li>Open <code>apps-script/Code.gs</code> from this repo</li>
              <li>In Google Apps Script editor, set <code>SHEET_ID</code> to your spreadsheet ID</li>
              <li>Deploy → New deployment → Web app</li>
              <li>Execute as: <strong>Me</strong> | Access: <strong>Anyone</strong></li>
              <li>Copy the URL and paste it above</li>
            </ol>
          </div>
        </div>

        <div className="settings-section">
          <h3>Custom exercises</h3>
          <p className="text-sm text-muted" style={{ marginBottom: 8 }}>
            {customCount || 0} custom exercise{customCount !== 1 ? 's' : ''} saved in this browser.
          </p>
          {customCount > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={onExportCustom}>
              ↓ Export custom exercises (.json)
            </button>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>
            {saved ? '✓ Saved' : 'Save settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
