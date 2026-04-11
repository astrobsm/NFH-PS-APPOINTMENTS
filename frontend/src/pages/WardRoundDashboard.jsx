import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'

const STATUS_OPTIONS = ['scheduled', 'in_progress', 'completed', 'cancelled']
const STATUS_COLORS = {
  scheduled: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}
const STATUS_LABELS = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export default function WardRoundDashboard() {
  const navigate = useNavigate()
  const [rounds, setRounds] = useState([])
  const [filterDate, setFilterDate] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})

  const fetchRounds = useCallback(async (date, status) => {
    setLoading(true)
    try {
      const data = await api.getWardRounds(date || null, status || null)
      setRounds(data)
      setError('')
    } catch (err) {
      if (err.message.includes('expired') || err.message.includes('Invalid')) {
        localStorage.removeItem('admin_token')
        navigate('/admin', { replace: true })
        return
      }
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      navigate('/admin', { replace: true })
      return
    }
    fetchRounds('', '')
  }, [navigate, fetchRounds])

  const handleFilter = () => fetchRounds(filterDate, filterStatus)
  const handleClearFilter = () => {
    setFilterDate('')
    setFilterStatus('')
    fetchRounds('', '')
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this ward round?')) return
    try {
      await api.deleteWardRound(id)
      setRounds(rounds.filter(r => r.id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  const startEdit = (round) => {
    setEditingId(round.id)
    setEditForm({
      status: round.status,
      attending_doctor: round.attending_doctor || '',
      round_date: round.round_date,
      round_time: round.round_time || '',
      notes: round.notes || '',
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({})
  }

  const saveEdit = async (id) => {
    try {
      await api.updateWardRound(id, editForm)
      setEditingId(null)
      fetchRounds(filterDate, filterStatus)
    } catch (err) {
      setError(err.message)
    }
  }

  const buildWhatsAppUrl = (round) => {
    if (!round.phone_number) return null
    const phone = round.phone_number.replace(/[^0-9]/g, '')
    const procedures = Array.isArray(round.planned_procedures) ? round.planned_procedures : JSON.parse(round.planned_procedures || '[]')
    const procList = procedures.map(p => `• ${p}`).join('\n')
    const message = `Dear ${round.full_name},\n\nThis is from *Niger Foundation Hospital, Enugu* – Plastic Surgery Unit.\n\nYour ward round has been scheduled.\n\n🏥 Ward: ${round.ward}${round.bed_number ? ` (Bed ${round.bed_number})` : ''}\n📅 Date: ${round.round_date}${round.round_time ? `\n⏰ Time: ${round.round_time}` : ''}${round.attending_doctor ? `\n👨‍⚕️ Doctor: ${round.attending_doctor}` : ''}\n\n📋 *Planned Procedures:*\n${procList}\n\nThank you.`
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 relative z-10">
      <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-blue-800">Ward Rounds</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <button
            onClick={handleFilter}
            className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-800 transition"
          >
            Filter
          </button>
          <button
            onClick={handleClearFilter}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-300 transition"
          >
            Clear
          </button>
          <button
            onClick={() => navigate('/book-ward-round')}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-700 transition font-medium"
          >
            + New Ward Round
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 text-xl leading-none">&times;</button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading ward rounds...</div>
        ) : rounds.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No ward rounds found.{(filterDate || filterStatus) && ' Try clearing the filters.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-orange-700 text-white">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Patient</th>
                  <th className="px-4 py-3 text-left">Ward / Bed</th>
                  <th className="px-4 py-3 text-left">Procedures</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Time</th>
                  <th className="px-4 py-3 text-left">Doctor</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">WhatsApp</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rounds.map((round, i) => {
                  const procedures = Array.isArray(round.planned_procedures) ? round.planned_procedures : JSON.parse(round.planned_procedures || '[]')
                  return (
                    <tr key={round.id} className={i % 2 === 0 ? 'bg-white' : 'bg-orange-50/30'}>
                      <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                      <td className="px-4 py-3 font-medium">
                        {round.full_name}
                        <p className="text-xs text-gray-400">{round.gender}, {round.age}y</p>
                        {round.diagnosis && (
                          <p className="text-xs text-gray-400 mt-0.5" title={round.diagnosis}>
                            {round.diagnosis.length > 30 ? round.diagnosis.slice(0, 30) + '...' : round.diagnosis}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {round.ward}
                        {round.bed_number && <span className="text-gray-400 text-xs block">Bed {round.bed_number}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-48">
                          {procedures.map((proc, j) => (
                            <span key={j} className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap">
                              {proc}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {editingId === round.id ? (
                          <input
                            type="date"
                            value={editForm.round_date}
                            onChange={(e) => setEditForm({ ...editForm, round_date: e.target.value })}
                            className="border border-gray-300 rounded px-2 py-1 text-xs w-32"
                          />
                        ) : round.round_date}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {editingId === round.id ? (
                          <input
                            type="time"
                            value={editForm.round_time}
                            onChange={(e) => setEditForm({ ...editForm, round_time: e.target.value })}
                            className="border border-gray-300 rounded px-2 py-1 text-xs w-24"
                          />
                        ) : (round.round_time || '-')}
                      </td>
                      <td className="px-4 py-3">
                        {editingId === round.id ? (
                          <input
                            type="text"
                            value={editForm.attending_doctor}
                            onChange={(e) => setEditForm({ ...editForm, attending_doctor: e.target.value })}
                            placeholder="Doctor"
                            className="border border-gray-300 rounded px-2 py-1 text-xs w-28"
                          />
                        ) : (round.attending_doctor || '-')}
                      </td>
                      <td className="px-4 py-3">
                        {editingId === round.id ? (
                          <select
                            value={editForm.status}
                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                            className="border border-gray-300 rounded px-2 py-1 text-xs"
                          >
                            {STATUS_OPTIONS.map(s => (
                              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[round.status] || 'bg-gray-100 text-gray-700'}`}>
                            {STATUS_LABELS[round.status] || round.status}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {round.phone_number ? (
                          <a
                            href={buildWhatsAppUrl(round)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-500 hover:text-green-700 transition"
                            title="Send WhatsApp notification"
                          >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                          </a>
                        ) : (
                          <span className="text-gray-300 text-xs">No phone</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {editingId === round.id ? (
                            <>
                              <button
                                onClick={() => saveEdit(round.id)}
                                className="text-green-600 hover:text-green-800 transition text-xs font-medium"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="text-gray-400 hover:text-gray-600 transition text-xs font-medium"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEdit(round)}
                                className="text-blue-600 hover:text-blue-800 transition text-xs font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(round.id)}
                                className="text-red-400 hover:text-red-600 transition text-xs font-medium"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
