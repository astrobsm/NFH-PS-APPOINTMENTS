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

  const buildWhatsAppUrl = (apt) => {
    if (!apt.phone_number) return null
    const phone = apt.phone_number.replace(/[^0-9]/g, '')
    const date = apt.appointment_date
    const time = apt.start_time?.slice(0, 5)
    const message = `Dear ${apt.full_name},\n\nThis is a reminder from *Niger Foundation Hospital, Enugu* – Plastic Surgery/Wound Care Clinic.\n\nYour appointment details:\n📅 Date: ${date}\n⏰ Time: ${time}\n🏥 Visit Type: ${visitTypeLabel(apt.visit_type)}\n\nPlease arrive 5 minutes before your scheduled time.\n\nThank you.`
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
  }

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
                  <th className="px-4 py-3 text-left">WhatsApp</th>
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
                      {buildWhatsAppUrl(apt) ? (
                        <a
                          href={buildWhatsAppUrl(apt)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-500 hover:text-green-700 transition"
                          title={`Send WhatsApp reminder to ${apt.phone_number}`}
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
