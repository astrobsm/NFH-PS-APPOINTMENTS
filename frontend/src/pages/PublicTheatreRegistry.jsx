import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { api } from '../utils/api'

const STATUS_BADGE = {
  pending: 'bg-amber-100 text-amber-800 border border-amber-200',
  confirmed: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  completed: 'bg-blue-100 text-blue-800 border border-blue-200',
  cancelled: 'bg-gray-100 text-gray-700 border border-gray-200',
}

function fmtDate(d) {
  if (!d) return '—'
  const dt = new Date(d.length === 10 ? d + 'T00:00:00' : d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtTime(d) {
  if (!d) return ''
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return ''
  return dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export default function PublicTheatreRegistry() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [status, setStatus] = useState('')
  const [showQR, setShowQR] = useState(false)
  const [copied, setCopied] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [rescheduleRow, setRescheduleRow] = useState(null)
  const [newDate, setNewDate] = useState('')
  const [newSlotStart, setNewSlotStart] = useState('')
  const [newSlotHours, setNewSlotHours] = useState('')
  const [actionMsg, setActionMsg] = useState('')

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/theatre` : ''

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (from) params.from = from
      if (to) params.to = to
      if (status) params.status = status
      const data = await api.getPublicSurgeries(params)
      setRows(data || [])
    } catch (e) {
      setError(e.message || 'Failed to load registry')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // initial load

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const flash = (msg) => {
    setActionMsg(msg)
    setTimeout(() => setActionMsg(''), 3000)
  }

  const doAction = async (row, action) => {
    if (action === 'cancel' && !window.confirm(`Cancel surgery for ${row.patient_first_name || 'this patient'}?`)) return
    if (action === 'complete' && !window.confirm(`Mark surgery for ${row.patient_first_name || 'this patient'} as completed?`)) return
    setBusyId(row.id)
    setError('')
    try {
      await api.updatePublicSurgery(row.id, { action })
      flash(action === 'complete' ? 'Marked as completed.' : 'Surgery cancelled.')
      await load()
    } catch (e) {
      setError(e.message || 'Action failed')
    } finally {
      setBusyId(null)
    }
  }

  const openReschedule = (row) => {
    setRescheduleRow(row)
    setNewDate(row.preferred_date || '')
    setNewSlotStart('')
    setNewSlotHours(row.slot_duration_hours ? String(row.slot_duration_hours) : '')
    setError('')
  }

  const submitReschedule = async (e) => {
    e.preventDefault()
    if (!rescheduleRow || !newDate) { setError('Please pick a new date'); return }
    setBusyId(rescheduleRow.id)
    setError('')
    try {
      const payload = { action: 'reschedule', preferred_date: newDate }
      if (newSlotStart) {
        // Combine date + time into ISO string
        payload.slot_start = `${newDate}T${newSlotStart}:00`
      }
      if (newSlotHours) payload.slot_duration_hours = parseInt(newSlotHours)
      await api.updatePublicSurgery(rescheduleRow.id, payload)
      flash('Surgery rescheduled.')
      setRescheduleRow(null)
      await load()
    } catch (e) {
      setError(e.message || 'Reschedule failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800">NFH Theatre Registry</h1>
            <p className="text-sm text-slate-600 mt-1">
              Live registry of scheduled surgical cases. No login required.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/theatre/book"
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium shadow">
              + Book a Surgery
            </Link>
            <button onClick={copyLink}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium">
              {copied ? '✓ Link Copied' : 'Copy Share Link'}
            </button>
            <button onClick={() => setShowQR(s => !s)}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium">
              {showQR ? 'Hide QR' : 'Show QR'}
            </button>
          </div>
        </div>

        {showQR && (
          <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center mb-6">
            <QRCodeSVG value={shareUrl} size={180} />
            <p className="text-xs text-slate-500 mt-3 break-all text-center">{shareUrl}</p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow p-4 mb-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white">
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={load}
              className="w-full px-3 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 text-sm font-medium">
              Apply Filters
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>
        )}
        {actionMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg p-3 mb-4 text-sm">{actionMsg}</div>
        )}

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">Patient</th>
                  <th className="text-left px-3 py-2 font-semibold">Folder #</th>
                  <th className="text-left px-3 py-2 font-semibold">Procedure</th>
                  <th className="text-left px-3 py-2 font-semibold">Specialty</th>
                  <th className="text-left px-3 py-2 font-semibold">Surgeon</th>
                  <th className="text-left px-3 py-2 font-semibold">Date</th>
                  <th className="text-left px-3 py-2 font-semibold">Slot</th>
                  <th className="text-left px-3 py-2 font-semibold">Theatre</th>
                  <th className="text-left px-3 py-2 font-semibold">Class</th>
                  <th className="text-left px-3 py-2 font-semibold">Type</th>
                  <th className="text-left px-3 py-2 font-semibold">Status</th>
                  <th className="text-left px-3 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={12} className="text-center py-8 text-slate-500">Loading…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={12} className="text-center py-8 text-slate-500">No bookings found.</td></tr>
                ) : rows.map(r => (
                  <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-slate-800">{r.full_name || r.patient_first_name || '—'}</td>
                    <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{r.folder_number || '—'}</td>
                    <td className="px-3 py-2 text-slate-700">{r.procedure_name || '—'}</td>
                    <td className="px-3 py-2 text-slate-600">{r.specialty_name || '—'}</td>
                    <td className="px-3 py-2 text-slate-600">{r.surgeon_name || '—'}</td>
                    <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{fmtDate(r.preferred_date)}</td>
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                      {r.slot_start ? `${fmtTime(r.slot_start)} – ${fmtTime(r.slot_end)}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{r.theatre || '—'}</td>
                    <td className="px-3 py-2 text-slate-600">{r.surgery_class || '—'}</td>
                    <td className="px-3 py-2">
                      {r.is_daycase
                        ? <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800 border border-purple-200">Day-case</span>
                        : <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700 border border-slate-200">In-patient</span>}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_BADGE[r.status] || 'bg-slate-100 text-slate-700'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {r.status === 'completed' || r.status === 'cancelled' ? (
                        <span className="text-xs text-slate-400 italic">No actions</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          <button
                            onClick={() => doAction(r, 'complete')}
                            disabled={busyId === r.id}
                            title="Mark surgery as completed"
                            className="px-2 py-1 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                          >✓ Complete</button>
                          <button
                            onClick={() => openReschedule(r)}
                            disabled={busyId === r.id}
                            title="Reschedule — pick a new date"
                            className="px-2 py-1 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                          >↻ Reschedule</button>
                          <button
                            onClick={() => doAction(r, 'cancel')}
                            disabled={busyId === r.id}
                            title="Cancel this surgery"
                            className="px-2 py-1 text-xs font-semibold rounded bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50"
                          >✕ Cancel</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-slate-500 mt-4 text-center">
          Patient details are visible to anyone with this link. Restrict sharing to authorized hospital staff only.
        </p>
      </div>

      {/* Reschedule modal */}
      {rescheduleRow && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setRescheduleRow(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Reschedule Surgery</h3>
            <p className="text-sm text-slate-600 mb-4">
              Patient: <strong>{rescheduleRow.full_name || rescheduleRow.patient_first_name || '—'}</strong> · {rescheduleRow.procedure_name || ''}
              <br/>Current date: <strong>{fmtDate(rescheduleRow.preferred_date)}</strong>
            </p>
            <form onSubmit={submitReschedule} className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1">New Date *</label>
                <input type="date" required value={newDate} onChange={e => setNewDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full border-2 border-blue-300 rounded-lg px-3 py-2 text-slate-900 bg-white font-medium focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">New Start Time</label>
                  <input type="time" value={newSlotStart} onChange={e => setNewSlotStart(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Duration (hrs)</label>
                  <input type="number" min="1" max="12" value={newSlotHours} onChange={e => setNewSlotHours(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white" />
                </div>
              </div>
              <p className="text-xs text-slate-500">Leaving time/duration blank keeps the existing slot.</p>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setRescheduleRow(null)}
                  className="flex-1 px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium">
                  Cancel
                </button>
                <button type="submit" disabled={busyId === rescheduleRow.id}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50">
                  {busyId === rescheduleRow.id ? 'Saving…' : 'Reschedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
