import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'

const PROCEDURE_OPTIONS = [
  'Regular Review',
  'Bedside Debridement',
  'NPWT (Negative Pressure Wound Therapy)',
  'Graft Inspection',
  'Flap Check',
  'Wound Assessment',
  'Dressing Change',
  'Suture Removal',
  'Drain Management',
  'Post-Op Review',
  'Discharge Planning',
  'Other',
]

export default function BookWardRound() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Patient search state
  const [patientQuery, setPatientQuery] = useState('')
  const [patientResults, setPatientResults] = useState([])
  const [showPatientDropdown, setShowPatientDropdown] = useState(false)
  const [searchingPatients, setSearchingPatients] = useState(false)
  const [isReturningPatient, setIsReturningPatient] = useState(false)
  const patientDropdownRef = useRef(null)

  const [form, setForm] = useState({
    full_name: '',
    age: '',
    gender: '',
    phone_number: '',
    ward: '',
    bed_number: '',
    diagnosis: '',
    round_date: '',
    round_time: '',
    attending_doctor: '',
    notes: '',
  })
  const [selectedProcedures, setSelectedProcedures] = useState([])
  const [customProcedure, setCustomProcedure] = useState('')

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      navigate('/admin', { replace: true })
    }
  }, [navigate])

  // Debounced patient search
  useEffect(() => {
    if (patientQuery.length < 2) {
      setPatientResults([])
      setShowPatientDropdown(false)
      return
    }
    const timer = setTimeout(async () => {
      setSearchingPatients(true)
      try {
        const results = await api.searchPatients(patientQuery)
        setPatientResults(results)
        setShowPatientDropdown(results.length > 0)
      } catch {
        setPatientResults([])
      } finally {
        setSearchingPatients(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [patientQuery])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (patientDropdownRef.current && !patientDropdownRef.current.contains(e.target)) {
        setShowPatientDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectPatient = (patient) => {
    const phone = patient.phone_number
      ? patient.phone_number.replace(/^\+234/, '').replace(/^234/, '')
      : ''
    setForm((f) => ({
      ...f,
      full_name: patient.full_name,
      age: String(patient.age),
      gender: patient.gender,
      phone_number: phone,
    }))
    setPatientQuery(patient.full_name)
    setShowPatientDropdown(false)
    setIsReturningPatient(true)
  }

  const clearPatientSelection = () => {
    setPatientQuery('')
    setIsReturningPatient(false)
    setForm((f) => ({ ...f, full_name: '', age: '', gender: '', phone_number: '' }))
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const toggleProcedure = (proc) => {
    setSelectedProcedures((prev) =>
      prev.includes(proc) ? prev.filter((p) => p !== proc) : [...prev, proc]
    )
  }

  const addCustomProcedure = () => {
    const trimmed = customProcedure.trim()
    if (trimmed && !selectedProcedures.includes(trimmed)) {
      setSelectedProcedures((prev) => [...prev, trimmed])
      setCustomProcedure('')
    }
  }

  const removeProcedure = (proc) => {
    setSelectedProcedures((prev) => prev.filter((p) => p !== proc))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.full_name || !form.age || !form.gender || !form.ward || !form.round_date) {
      setError('Please fill in all required fields')
      return
    }
    if (selectedProcedures.length === 0) {
      setError('Please select at least one planned procedure')
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
        phone_number: phone,
        planned_procedures: selectedProcedures,
        round_time: form.round_time ? form.round_time + ':00' : null,
      }
      const result = await api.bookWardRound(data)
      navigate('/ward-round-confirmation', { state: { wardRound: result } })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 relative z-10">
      <h1 className="text-2xl font-bold text-blue-800 mb-6">Schedule Ward Round</h1>

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
            <div ref={patientDropdownRef} className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              {isReturningPatient ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-green-50 border border-green-300 rounded-lg px-3 py-2 text-gray-900">
                    <span className="font-medium">{form.full_name}</span>
                    <span className="text-xs text-green-600 ml-2">(Returning Patient)</span>
                  </div>
                  <button
                    type="button"
                    onClick={clearPatientSelection}
                    className="px-3 py-2 text-sm text-red-600 hover:text-red-800 border border-red-200 rounded-lg hover:bg-red-50 transition"
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={patientQuery || form.full_name}
                    onChange={(e) => {
                      setPatientQuery(e.target.value)
                      setForm({ ...form, full_name: e.target.value })
                      setError('')
                    }}
                    required
                    maxLength={100}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Start typing to search existing patients..."
                    autoComplete="off"
                  />
                  {searchingPatients && (
                    <p className="text-xs text-gray-400 mt-1">Searching patients...</p>
                  )}
                  {!searchingPatients && patientQuery.length >= 2 && patientResults.length === 0 && (
                    <p className="text-xs text-gray-400 mt-1">No existing patients found — entering as new patient</p>
                  )}
                  {showPatientDropdown && (
                    <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {patientResults.map((p, i) => (
                        <li
                          key={i}
                          onClick={() => selectPatient(p)}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-800">{p.full_name}</div>
                          <div className="text-xs text-gray-500">
                            {p.gender}, Age {p.age}{p.phone_number ? ` • ${p.phone_number}` : ''}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
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
            </div>
          </div>
        </div>

        {/* Ward & Bed */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="font-semibold text-gray-800 mb-4">2. Ward Details</h2>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ward *</label>
                <input
                  type="text"
                  name="ward"
                  value={form.ward}
                  onChange={handleChange}
                  required
                  maxLength={100}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="e.g. Surgical Ward A"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bed Number</label>
                <input
                  type="text"
                  name="bed_number"
                  value={form.bed_number}
                  onChange={handleChange}
                  maxLength={20}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="e.g. B12"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis</label>
              <textarea
                name="diagnosis"
                value={form.diagnosis}
                onChange={handleChange}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Current diagnosis..."
              />
            </div>
          </div>
        </div>

        {/* Planned Procedures */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="font-semibold text-gray-800 mb-4">3. Planned Procedures *</h2>
          <p className="text-sm text-gray-500 mb-3">Select all procedures planned for this ward round. You can also add custom procedures.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
            {PROCEDURE_OPTIONS.map((proc) => (
              <button
                key={proc}
                type="button"
                onClick={() => toggleProcedure(proc)}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition text-left ${
                  selectedProcedures.includes(proc)
                    ? 'bg-orange-600 text-white border-orange-600 shadow-md'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-orange-400 hover:bg-orange-50'
                }`}
              >
                {proc}
              </button>
            ))}
          </div>

          {/* Custom procedure input */}
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={customProcedure}
              onChange={(e) => setCustomProcedure(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomProcedure() } }}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
              placeholder="Add custom procedure..."
            />
            <button
              type="button"
              onClick={addCustomProcedure}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              Add
            </button>
          </div>

          {/* Selected procedures */}
          {selectedProcedures.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium text-gray-700 mb-2">Selected ({selectedProcedures.length}):</p>
              <div className="flex flex-wrap gap-2">
                {selectedProcedures.map((proc) => (
                  <span key={proc} className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                    {proc}
                    <button
                      type="button"
                      onClick={() => removeProcedure(proc)}
                      className="text-orange-500 hover:text-orange-800 ml-1"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Schedule */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="font-semibold text-gray-800 mb-4">4. Schedule</h2>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Round Date *</label>
                <input
                  type="date"
                  name="round_date"
                  value={form.round_date}
                  min={today}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Round Time</label>
                <input
                  type="time"
                  name="round_time"
                  value={form.round_time}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Attending Doctor</label>
              <input
                type="text"
                name="attending_doctor"
                value={form.attending_doctor}
                onChange={handleChange}
                maxLength={100}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="e.g. Dr. Okoro"
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
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Any additional instructions or observations..."
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-lg shadow-md transition disabled:opacity-50"
        >
          {loading ? 'Scheduling...' : 'Schedule Ward Round'}
        </button>
      </form>
    </main>
  )
}
