import { useState, useCallback } from 'react'

/**
 * Hook for all Google Sheets / Apps Script operations.
 * GAS_URL is stored in localStorage and set via Settings modal.
 *
 * All GET requests use URL params (simple request, CORS-safe).
 * All POST requests use application/x-www-form-urlencoded (simple request, CORS-safe).
 */

function getGasUrl() {
  return localStorage.getItem('pb_gas_url') || ''
}

function toFormBody(obj) {
  return Object.entries(obj)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
}

export function useSheets() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchClients = useCallback(async () => {
    const url = getGasUrl()
    if (!url) return []
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${url}?action=getClients`)
      const data = await res.json()
      return data.clients || []
    } catch (e) {
      setError('Could not reach Apps Script. Check the URL in Settings.')
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchClient = useCallback(async (rowIndex) => {
    const url = getGasUrl()
    if (!url) return null
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${url}?action=getClient&row=${rowIndex}`)
      const data = await res.json()
      return data.client || null
    } catch (e) {
      setError('Failed to load client.')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const addNote = useCallback(async ({ clientName, note, timestamp }) => {
    const url = getGasUrl()
    if (!url) return false
    setLoading(true)
    setError(null)
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: toFormBody({
          action: 'addNote',
          clientName,
          note,
          timestamp: timestamp || new Date().toISOString(),
        }),
      })
      return true
    } catch (e) {
      setError('Failed to save note.')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return { fetchClients, fetchClient, addNote, loading, error }
}
