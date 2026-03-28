import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'

export default function BookAppointment() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [error, setError] = useState('')
  const [slots, setSlots] = useState([])
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [scrolledToEnd, setScrolledToEnd] = useState(false)
  const termsRef = useRef(null)

  const handleTermsScroll = () => {
    const el = termsRef.current
    if (el && el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
      setScrolledToEnd(true)
    }
  }

  const [form, setForm] = useState({
    appointment_date: '',
    visit_type: '',
    start_time: '',
    full_name: '',
    age: '',
    gender: '',
    phone_number: '',
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
    if (!acceptedTerms) {
      setError('Please read and accept the Terms and Conditions')
      return
    }

    setLoading(true)
    try {
      const phone = form.phone_number
        ? '+234' + form.phone_number.replace(/^0+/, '')
        : ''
      const data = {
        ...form,
        age: parseInt(form.age),
        start_time: form.start_time + ':00',
        phone_number: phone,
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number (WhatsApp)</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-100 text-gray-600 text-sm font-medium select-none">
                    +234
                  </span>
                  <input
                    type="tel"
                    name="phone_number"
                    value={form.phone_number}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '')
                      setForm({ ...form, phone_number: val })
                    }}
                    maxLength={11}
                    className="w-full border border-gray-300 rounded-r-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="e.g. 08012345678"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Enter your number without the country code</p>
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

        {/* Step 4: Terms and Conditions */}
        {form.start_time && form.full_name && form.age && form.gender && form.visit_category && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="font-semibold text-gray-800 mb-4">4. Terms &amp; Conditions</h2>
            <p className="text-sm text-gray-500 mb-3">Please read the terms below. You must scroll to the end to accept.</p>
            <div
              ref={termsRef}
              onScroll={handleTermsScroll}
              className="h-64 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50 text-sm text-gray-700 leading-relaxed"
            >
              <h3 className="text-center font-bold text-blue-800 mb-1">NIGER FOUNDATION HOSPITAL, ENUGU</h3>
              <h4 className="text-center font-semibold text-blue-700 mb-1">PLASTIC SURGERY / WOUND CARE CLINIC</h4>
              <h4 className="text-center font-semibold text-gray-800 mb-4">PATIENT APPOINTMENT TERMS AND CONDITIONS</h4>

              <p className="font-semibold mt-3 mb-1">1. Appointment Scheduling</p>
              <p>By booking an appointment through the PS-Consultation platform, the patient acknowledges and agrees to adhere strictly to the scheduled date and time selected.</p>

              <p className="font-semibold mt-3 mb-1">2. Punctuality Requirement</p>
              <p>Patients are required to arrive at the clinic not later than five (5) minutes before or five (5) minutes after their scheduled appointment time.</p>
              <p className="mt-1">Failure to comply with this time window shall be deemed as non-attendance or lateness beyond acceptable limits, and the appointment shall be considered forfeited.</p>

              <p className="font-semibold mt-3 mb-1">3. Missed or Late Appointments</p>
              <p>In the event that a patient:</p>
              <ul className="list-disc ml-5 mt-1">
                <li>Arrives later than five (5) minutes after the scheduled appointment time, or</li>
                <li>Fails to attend the appointment entirely,</li>
              </ul>
              <p className="mt-1">the patient shall:</p>
              <ul className="list-disc ml-5 mt-1">
                <li>Forfeit the scheduled time slot, and</li>
                <li>Either:
                  <ul className="list-disc ml-5 mt-1">
                    <li>Reschedule for another available date and time, or</li>
                    <li>Wait to be attended to only after all patients with valid scheduled appointments for that session have been fully attended to, subject to availability of clinic time.</li>
                  </ul>
                </li>
              </ul>
              <p className="mt-1">The clinic reserves the absolute right to determine whether such a patient can still be accommodated on the same day.</p>

              <p className="font-semibold mt-3 mb-1">4. No Guarantee of Immediate Consultation After Default</p>
              <p>Patients who miss their appointment time shall not be entitled to immediate consultation upon arrival and may experience significant delays or be required to return on another date.</p>

              <p className="font-semibold mt-3 mb-1">5. Respect for Clinical Order and Other Patients</p>
              <p>All appointments are structured to ensure:</p>
              <ul className="list-disc ml-5 mt-1">
                <li>Efficient patient flow</li>
                <li>Fairness to all patients</li>
                <li>Optimal clinical care delivery</li>
              </ul>
              <p className="mt-1">Patients agree to respect the appointment system and acknowledge that priority shall always be given to those who arrive within their designated time window.</p>

              <p className="font-semibold mt-3 mb-1">6. Clinic Authority</p>
              <p>The clinic management and attending medical team reserve the right to:</p>
              <ul className="list-disc ml-5 mt-1">
                <li>Enforce these terms without exception</li>
                <li>Modify schedules where necessary for clinical or operational reasons</li>
                <li>Decline consultation where non-compliance disrupts clinic workflow</li>
              </ul>

              <p className="font-semibold mt-3 mb-1">7. Acceptance of Terms</p>
              <p>By proceeding to book an appointment, the patient confirms that they have:</p>
              <ul className="list-disc ml-5 mt-1">
                <li>Read and understood these terms</li>
                <li>Agreed to comply fully with all stated conditions</li>
              </ul>

              <div className="mt-4 pt-3 border-t border-gray-300 text-center">
                <p className="font-semibold text-blue-800">Niger Foundation Hospital, Enugu</p>
                <p className="font-medium text-blue-700">Plastic Surgery / Wound Care Clinic</p>
                <p className="italic text-gray-600 mt-1">Committed to Excellence, Discipline, and Quality Patient Care</p>
              </div>
            </div>

            {!scrolledToEnd && (
              <p className="text-amber-600 text-sm mt-2 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                Please scroll to the end of the terms to enable acceptance
              </p>
            )}

            <label className={`flex items-center gap-2 mt-3 cursor-pointer ${!scrolledToEnd ? 'opacity-50 pointer-events-none' : ''}`}>
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                disabled={!scrolledToEnd}
                className="w-4 h-4 text-blue-700 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                I have read and agree to the Terms and Conditions
              </span>
            </label>
          </div>
        )}

        {/* Submit */}
        {form.start_time && acceptedTerms && (
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
