import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'

const STATUS_OPTIONS = ['pending', 'confirmed', 'completed', 'cancelled']
const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

export default function SurgeryDashboard() {
  const navigate = useNavigate()
  const [surgeries, setSurgeries] = useState([])
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})

  const fetchSurgeries = useCallback(async (status) => {
    setLoading(true)
    try {
      const data = await api.getSurgeries(status || null)
      setSurgeries(data)
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
    fetchSurgeries('')
  }, [navigate, fetchSurgeries])

  const handleFilter = () => fetchSurgeries(filterStatus)
  const handleClearFilter = () => {
    setFilterStatus('')
    fetchSurgeries('')
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this surgery booking?')) return
    try {
      await api.deleteSurgery(id)
      setSurgeries(surgeries.filter(s => s.id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  const startEdit = (surgery) => {
    setEditingId(surgery.id)
    setEditForm({
      status: surgery.status,
      surgeon_name: surgery.surgeon_name || '',
      preferred_date: surgery.preferred_date,
      notes: surgery.notes || '',
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({})
  }

  const saveEdit = async (id) => {
    try {
      await api.updateSurgery(id, editForm)
      setEditingId(null)
      fetchSurgeries(filterStatus)
    } catch (err) {
      setError(err.message)
    }
  }

  const buildWhatsAppUrl = (surg, messageType) => {
    if (!surg.phone_number) return null
    const phone = surg.phone_number.replace(/[^0-9]/g, '')
    let message = ''
    if (messageType === 'confirm') {
      message = `Dear ${surg.full_name},\n\nThis is from *Niger Foundation Hospital, Enugu* – Plastic Surgery Unit.\n\nYour surgery booking has been *CONFIRMED*.\n\n🏥 Surgery: ${surg.surgery_type}\n📅 Date: ${surg.preferred_date}${surg.surgeon_name ? `\n👨‍⚕️ Surgeon: ${surg.surgeon_name}` : ''}\n\n⚠️ *IMPORTANT:* Please arrive at least *ONE (1) HOUR* before your scheduled appointment time to enable you to:\n• Get your vital signs taken\n• Pay consultation fees\n• Confirm the availability of wound care materials (for those who need wound care service)\n\nPlease ensure all pre-operative requirements are completed before the surgery date.\n\nThank you.`
    } else {
      message = `Dear ${surg.full_name},\n\nThis is a reminder from *Niger Foundation Hospital, Enugu* – Plastic Surgery Unit.\n\nYour upcoming surgery details:\n🏥 Surgery: ${surg.surgery_type}\n📅 Date: ${surg.preferred_date}${surg.surgeon_name ? `\n👨‍⚕️ Surgeon: ${surg.surgeon_name}` : ''}\n\n⚠️ *IMPORTANT:* Please arrive at least *ONE (1) HOUR* before your scheduled appointment time to enable you to:\n• Get your vital signs taken\n• Pay consultation fees\n• Confirm the availability of wound care materials (for those who need wound care service)\n\nPlease ensure all pre-operative requirements are completed.\n\nThank you.`
    }
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 relative z-10">
      <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-blue-800">Surgery Bookings</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
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
          <div className="p-8 text-center text-gray-500">Loading surgery bookings...</div>
        ) : surgeries.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No surgery bookings found.{filterStatus && ' Try clearing the filter.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-blue-800 text-white">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Patient</th>
                  <th className="px-4 py-3 text-left">Age</th>
                  <th className="px-4 py-3 text-left">Gender</th>
                  <th className="px-4 py-3 text-left">Surgery Type</th>
                  <th className="px-4 py-3 text-left">Preferred Date</th>
                  <th className="px-4 py-3 text-left">Surgeon</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">WhatsApp</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {surgeries.map((surg, i) => (
                  <tr key={surg.id} className={i % 2 === 0 ? 'bg-white' : 'bg-blue-50/30'}>
                    <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3 font-medium">
                      {surg.full_name}
                      {surg.diagnosis && (
                        <p className="text-xs text-gray-400 mt-0.5" title={surg.diagnosis}>
                          {surg.diagnosis.length > 30 ? surg.diagnosis.slice(0, 30) + '...' : surg.diagnosis}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">{surg.age}</td>
                    <td className="px-4 py-3">{surg.gender}</td>
                    <td className="px-4 py-3">{surg.surgery_type}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {editingId === surg.id ? (
                        <input
                          type="date"
                          value={editForm.preferred_date}
                          onChange={(e) => setEditForm({ ...editForm, preferred_date: e.target.value })}
                          className="border border-gray-300 rounded px-2 py-1 text-xs w-32"
                        />
                      ) : surg.preferred_date}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === surg.id ? (
                        <input
                          type="text"
                          value={editForm.surgeon_name}
                          onChange={(e) => setEditForm({ ...editForm, surgeon_name: e.target.value })}
                          placeholder="Surgeon name"
                          className="border border-gray-300 rounded px-2 py-1 text-xs w-28"
                        />
                      ) : (surg.surgeon_name || '-')}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === surg.id ? (
                        <select
                          value={editForm.status}
                          onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                          className="border border-gray-300 rounded px-2 py-1 text-xs"
                        >
                          {STATUS_OPTIONS.map(s => (
                            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[surg.status] || 'bg-gray-100 text-gray-700'}`}>
                          {surg.status.charAt(0).toUpperCase() + surg.status.slice(1)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {surg.phone_number ? (
                        <div className="flex gap-1">
                          <a
                            href={buildWhatsAppUrl(surg, 'remind')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-500 hover:text-green-700 transition"
                            title="Send WhatsApp reminder"
                          >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                          </a>
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">No phone</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {editingId === surg.id ? (
                          <>
                            <button
                              onClick={() => saveEdit(surg.id)}
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
                              onClick={() => startEdit(surg)}
                              className="text-blue-500 hover:text-blue-700 transition"
                              title="Edit surgery booking"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(surg.id)}
                              className="text-red-400 hover:text-red-600 transition"
                              title="Delete surgery booking"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-500">
        Total: {surgeries.length} surgery booking{surgeries.length !== 1 ? 's' : ''}
      </div>
    </main>
  )
}
