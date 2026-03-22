import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState([])
  const [filterDate, setFilterDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchAppointments = useCallback(async (date) => {
    setLoading(true)
    try {
      const data = await api.getAppointments(date || null)
      setAppointments(data)
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
    fetchAppointments('')
  }, [navigate, fetchAppointments])

  const handleFilter = () => fetchAppointments(filterDate)

  const handleClearFilter = () => {
    setFilterDate('')
    fetchAppointments('')
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this appointment?')) return
    try {
      await api.deleteAppointment(id)
      setAppointments(appointments.filter(a => a.id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  const handleExportPdf = async () => {
    if (!filterDate) {
      setError('Please select a date to export the schedule as PDF')
      return
    }
    try {
      const { blob, filename } = await api.exportPdf(filterDate)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch (err) {
      setError(err.message)
    }
  }

  const visitTypeLabel = (t) => t === 'wound_care' ? 'Wound Care' : 'Non-Wound Care'
  const categoryLabel = (c) => c === 'first_time' ? 'First Time' : 'Follow-up'

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 relative z-10">
      <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-blue-800">Appointments Dashboard</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white outline-none focus:ring-2 focus:ring-blue-500"
          />
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
            onClick={handleExportPdf}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export PDF
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
          <div className="p-8 text-center text-gray-500">Loading appointments...</div>
        ) : appointments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No appointments found.{filterDate && ' Try clearing the date filter.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-blue-800 text-white">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Time</th>
                  <th className="px-4 py-3 text-left">Patient</th>
                  <th className="px-4 py-3 text-left">Age</th>
                  <th className="px-4 py-3 text-left">Gender</th>
                  <th className="px-4 py-3 text-left">Visit Type</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Reason</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {appointments.map((apt, i) => (
                  <tr key={apt.id} className={i % 2 === 0 ? 'bg-white' : 'bg-blue-50/30'}>
                    <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{apt.appointment_date}</td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      {apt.start_time?.slice(0, 5)} &ndash; {apt.end_time?.slice(0, 5)}
                    </td>
                    <td className="px-4 py-3 font-medium">{apt.full_name}</td>
                    <td className="px-4 py-3">{apt.age}</td>
                    <td className="px-4 py-3">{apt.gender}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        apt.visit_type === 'wound_care'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-teal-100 text-teal-700'
                      }`}>
                        {visitTypeLabel(apt.visit_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3">{categoryLabel(apt.visit_category)}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[150px] truncate" title={apt.reason}>
                      {apt.reason || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(apt.id)}
                        className="text-red-400 hover:text-red-600 transition"
                        title="Delete appointment"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-500">
        Total: {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
      </div>
    </main>
  )
}
