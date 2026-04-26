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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Public Theatre Registry</h1>
            <p className="text-sm text-slate-600 mt-1">
              Anonymized list of scheduled surgical cases. No login required.
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

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">Patient</th>
                  <th className="text-left px-3 py-2 font-semibold">Procedure</th>
                  <th className="text-left px-3 py-2 font-semibold">Specialty</th>
                  <th className="text-left px-3 py-2 font-semibold">Surgeon</th>
                  <th className="text-left px-3 py-2 font-semibold">Date</th>
                  <th className="text-left px-3 py-2 font-semibold">Slot</th>
                  <th className="text-left px-3 py-2 font-semibold">Theatre</th>
                  <th className="text-left px-3 py-2 font-semibold">Class</th>
                  <th className="text-left px-3 py-2 font-semibold">Type</th>
                  <th className="text-left px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="text-center py-8 text-slate-500">Loading…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-8 text-slate-500">No bookings found.</td></tr>
                ) : rows.map(r => (
                  <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-slate-800">{r.patient_first_name || '—'}</td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-slate-500 mt-4 text-center">
          For privacy, only the patient's first name is shown. Full details are available to authorized hospital staff only.
        </p>
      </div>
    </div>
  )
}
