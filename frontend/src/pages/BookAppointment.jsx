import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'

export default function BookAppointment() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [error, setError] = useState('')
  const [slots, setSlots] = useState([])

  const [form, setForm] = useState({
    appointment_date: '',
    visit_type: '',
    start_time: '',
    full_name: '',
    age: '',
    gender: '',
    visit_category: '',
    reason: '',
  })

  // Fetch available slots when date and visit type change
  useEffect(() => {
    if (form.appointment_date && form.visit_type) {
      setSlotsLoading(true)
      setSlots([])
      setForm(f => ({ ...f, start_time: '' }))

      api.getSlots(form.appointment_date, form.visit_type)
        .then(setSlots)
        .catch(err => setError(err.message))
        .finally(() => setSlotsLoading(false))
    }
  }, [form.appointment_date, form.visit_type])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const selectSlot = (startTime) => {
    setForm({ ...form, start_time: startTime })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.start_time) {
      setError('Please select a time slot')
      return
    }

    setLoading(true)
    try {
      const data = {
        ...form,
        age: parseInt(form.age),
        start_time: form.start_time + ':00',
      }
      const result = await api.bookAppointment(data)
      navigate('/confirmation', { state: { appointment: result } })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 relative z-10">
      <h1 className="text-2xl font-bold text-blue-800 mb-6">Book an Appointment</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Date & Visit Type */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="font-semibold text-gray-800 mb-4">1. Select Date &amp; Visit Type</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                name="appointment_date"
                value={form.appointment_date}
                min={today}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Visit Type</label>
              <select
                name="visit_type"
                value={form.visit_type}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">-- Select --</option>
                <option value="wound_care">Wound Care (30 min)</option>
                <option value="non_wound_care">Non-Wound Care (20 min)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Step 2: Time Slot */}
        {form.appointment_date && form.visit_type && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="font-semibold text-gray-800 mb-4">2. Select Time Slot</h2>
            {slotsLoading ? (
              <p className="text-gray-500">Loading available slots...</p>
            ) : slots.length === 0 ? (
              <p className="text-amber-600">
                No available slots for this date. The clinic may not be open or all slots are booked.
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot.start_time}
                    type="button"
                    onClick={() => selectSlot(slot.start_time)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${
                      form.start_time === slot.start_time
                        ? 'bg-blue-700 text-white border-blue-700 shadow-md'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                    }`}
                  >
                    {slot.start_time}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Patient Details */}
        {form.start_time && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="font-semibold text-gray-800 mb-4">3. Patient Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  name="full_name"
                  value={form.full_name}
                  onChange={handleChange}
                  required
                  maxLength={100}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Enter your full name"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                  <input
                    type="number"
                    name="age"
                    value={form.age}
                    onChange={handleChange}
                    required
                    min="0"
                    max="150"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="">-- Select --</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Visit Category</label>
                <select
                  name="visit_category"
                  value={form.visit_category}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">-- Select --</option>
                  <option value="first_time">First Time Visit</option>
                  <option value="follow_up">Follow-up Visit</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Visit <span className="text-gray-400">(Optional)</span>
                </label>
                <textarea
                  name="reason"
                  value={form.reason}
                  onChange={handleChange}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Briefly describe the reason for your visit..."
                />
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        {form.start_time && (
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-lg shadow-md transition disabled:opacity-50"
          >
            {loading ? 'Booking...' : 'Confirm Appointment'}
          </button>
        )}
      </form>
    </main>
  )
}
