import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'

const SURGERY_TYPES = [
  'Wound Debridement',
  'Skin Grafting',
  'Flap Surgery',
  'Scar Revision',
  'Burn Reconstruction',
  'Keloid Excision',
  'Contracture Release',
  'Cleft Lip/Palate Repair',
  'Hand Surgery',
  'Breast Reconstruction',
  'Facial Reconstruction',
  'Laceration Repair',
  'Abscess Drainage',
  'Tumor Excision',
  'Other',
]

export default function BookSurgery() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
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
    full_name: '',
    age: '',
    gender: '',
    phone_number: '',
    surgery_type: '',
    diagnosis: '',
    preferred_date: '',
    notes: '',
  })

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.full_name || !form.age || !form.gender || !form.surgery_type || !form.preferred_date) {
      setError('Please fill in all required fields')
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
      const data = { ...form, age: parseInt(form.age), phone_number: phone }
      const result = await api.bookSurgery(data)
      navigate('/surgery-confirmation', { state: { surgery: result } })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  const formComplete = form.full_name && form.age && form.gender && form.surgery_type && form.preferred_date

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 relative z-10">
      <h1 className="text-2xl font-bold text-blue-800 mb-6">Book a Surgery</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient Information */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="font-semibold text-gray-800 mb-4">1. Patient Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input
                type="text"
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                required
                maxLength={100}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Enter patient's full name"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Age *</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
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
          </div>
        </div>

        {/* Surgery Details */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="font-semibold text-gray-800 mb-4">2. Surgery Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Surgery Type *</label>
              <select
                name="surgery_type"
                value={form.surgery_type}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">-- Select Surgery Type --</option>
                {SURGERY_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Diagnosis / Indication <span className="text-gray-400">(Optional)</span>
              </label>
              <textarea
                name="diagnosis"
                value={form.diagnosis}
                onChange={handleChange}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Briefly describe the diagnosis or indication for surgery..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Surgery Date *</label>
              <input
                type="date"
                name="preferred_date"
                value={form.preferred_date}
                min={today}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes <span className="text-gray-400">(Optional)</span>
              </label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Any additional information or special requirements..."
              />
            </div>
          </div>
        </div>

        {/* Terms and Conditions */}
        {formComplete && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="font-semibold text-gray-800 mb-4">3. Terms &amp; Conditions</h2>
            <p className="text-sm text-gray-500 mb-3">Please read the terms below. You must scroll to the end to accept.</p>
            <div
              ref={termsRef}
              onScroll={handleTermsScroll}
              className="h-64 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50 text-sm text-gray-700 leading-relaxed"
            >
              <h3 className="text-center font-bold text-blue-800 mb-1">NIGER FOUNDATION HOSPITAL, ENUGU</h3>
              <h4 className="text-center font-semibold text-blue-700 mb-1">PLASTIC SURGERY UNIT</h4>
              <h4 className="text-center font-semibold text-gray-800 mb-4">SURGERY BOOKING TERMS AND CONDITIONS</h4>

              <p className="font-semibold mt-3 mb-1">1. Surgery Scheduling</p>
              <p>By submitting a surgery booking request through this platform, the patient acknowledges that the preferred date is subject to availability and confirmation by the surgical team.</p>

              <p className="font-semibold mt-3 mb-1">2. Pre-Operative Requirements</p>
              <p>Patients are required to complete all pre-operative assessments and investigations as directed by the attending physician prior to the surgery date.</p>
              <p className="mt-1">Failure to complete pre-operative requirements may result in postponement of the surgery.</p>

              <p className="font-semibold mt-3 mb-1">3. Confirmation and Communication</p>
              <p>The surgical team will contact the patient via the provided phone number to:</p>
              <ul className="list-disc ml-5 mt-1">
                <li>Confirm the surgery date and time</li>
                <li>Provide pre-operative instructions</li>
                <li>Discuss any special preparations needed</li>
              </ul>

              <p className="font-semibold mt-3 mb-1">4. Cancellation Policy</p>
              <p>Patients must notify the hospital at least 48 hours before the scheduled surgery date if they need to reschedule or cancel.</p>
              <p className="mt-1">Late cancellations may affect future scheduling priority.</p>

              <p className="font-semibold mt-3 mb-1">5. Informed Consent</p>
              <p>A separate informed consent form will be provided and must be signed by the patient (or legal guardian) before any surgical procedure is performed.</p>

              <p className="font-semibold mt-3 mb-1">6. Hospital Authority</p>
              <p>The hospital management and surgical team reserve the right to:</p>
              <ul className="list-disc ml-5 mt-1">
                <li>Reschedule surgeries based on clinical priorities and emergencies</li>
                <li>Modify surgical plans as deemed medically necessary</li>
                <li>Decline or postpone procedures if patient conditions are not optimal</li>
              </ul>

              <p className="font-semibold mt-3 mb-1">7. Acceptance of Terms</p>
              <p>By submitting this surgery booking request, the patient confirms that they have:</p>
              <ul className="list-disc ml-5 mt-1">
                <li>Read and understood these terms</li>
                <li>Agreed to comply fully with all stated conditions</li>
              </ul>

              <div className="mt-4 pt-3 border-t border-gray-300 text-center">
                <p className="font-semibold text-blue-800">Niger Foundation Hospital, Enugu</p>
                <p className="font-medium text-blue-700">Plastic Surgery Unit</p>
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
        {formComplete && acceptedTerms && (
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-lg shadow-md transition disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Surgery Booking'}
          </button>
        )}
      </form>
    </main>
  )
}
