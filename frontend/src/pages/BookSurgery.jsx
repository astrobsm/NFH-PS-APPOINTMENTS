import { useState, useEffect, useRef } from 'react'
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

const RISK_LEVELS = ['Low', 'Moderate', 'High']
const NUTRITIONAL_STATUS = ['Well-nourished', 'Mild malnutrition', 'Moderate malnutrition', 'Severe malnutrition']
const ANAESTHESIA_TYPES = ['General Anaesthesia', 'Regional – Spinal', 'Regional – Epidural', 'Local Anaesthesia', 'Sedation', 'Combined']
const DIATHERMY_TYPES = ['Monopolar', 'Bipolar', 'Both']

const COMPULSORY_TESTS = [
  { key: 'hiv', label: 'HIV Screening' },
  { key: 'fbc', label: 'FBC (Full Blood Count)' },
  { key: 'seucr', label: 'SEUCR (Serum Electrolytes, Urea & Creatinine)' },
  { key: 'hcv', label: 'HCV (Hepatitis C Virus)' },
  { key: 'hbsag', label: 'HBsAg (Hepatitis B Surface Antigen)' },
]

const ADDITIONAL_TESTS_OPTIONS = [
  'ECG', 'Chest X-ray', 'Urinalysis', 'Fasting Blood Glucose', 'Coagulation Profile',
  'LFT (Liver Function Test)', 'Blood Grouping & Cross-matching', 'Serum Protein/Albumin',
  'Bleeding Time / Clotting Time', 'PT/INR', 'Blood Film', 'ESR/CRP',
]

const SPECIAL_INSTRUMENTS_OPTIONS = [
  'Dermatome', 'Mesher (Mesh Graft Knife)', 'Microsurgical Set', 'Skin Hooks',
  'Fine Forceps', 'Loupe Magnification', 'Doppler Probe', 'Oscillating Saw',
  'K-Wires', 'Plate & Screw Set', 'Tissue Expander', 'Liposuction Cannulae',
]

const DRESSING_MATERIALS_OPTIONS = [
  'Gauze', 'Paraffin Gauze (Jelonet)', 'Foam Dressings', 'Silver Dressings (Acticoat)',
  'Alginate Dressings', 'NPWT/VAC Dressings', 'Elastic Bandage', 'Crepe Bandage',
  'Adhesive Tape', 'Transparent Film (Tegaderm)', 'Steri-Strips', 'Cotton Wool',
]

const SOLUTIONS_OPTIONS = [
  'Normal Saline (0.9%)', 'Hydrogen Peroxide (H₂O₂)', 'Povidone Iodine (Betadine)',
  'Chlorhexidine', "Ringer's Lactate", 'Distilled Water', 'Acetic Acid Solution',
  'Silver Nitrate Solution', 'Dakin\'s Solution',
]

const READINESS_ITEMS = [
  { key: 'consent_signed', label: 'Informed consent form signed by patient/guardian' },
  { key: 'npo_confirmed', label: 'NPO (Nil per os/fasting) status confirmed' },
  { key: 'site_marked', label: 'Surgical site marked by operating surgeon' },
  { key: 'blood_available', label: 'Blood products available / cross-matched (if needed)' },
  { key: 'investigations_reviewed', label: 'All investigation results reviewed by surgeon' },
  { key: 'pre_medication', label: 'Pre-medication administered (if ordered)' },
  { key: 'iv_access', label: 'IV access established' },
  { key: 'allergies_documented', label: 'Allergies documented and communicated' },
  { key: 'anaesthesia_review', label: 'Pre-anaesthetic review completed' },
  { key: 'vitals_checked', label: 'Vital signs checked and documented' },
]

export default function BookSurgery() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [scrolledToEnd, setScrolledToEnd] = useState(false)
  const termsRef = useRef(null)
  const [educationLoading, setEducationLoading] = useState(false)

  // Patient search state
  const [patientQuery, setPatientQuery] = useState('')
  const [patientResults, setPatientResults] = useState([])
  const [showPatientDropdown, setShowPatientDropdown] = useState(false)
  const [searchingPatients, setSearchingPatients] = useState(false)
  const [isReturningPatient, setIsReturningPatient] = useState(false)
  const patientDropdownRef = useRef(null)

  // Custom input states
  const [customTest, setCustomTest] = useState('')
  const [customInstrument, setCustomInstrument] = useState('')
  const [customDressing, setCustomDressing] = useState('')
  const [customSolution, setCustomSolution] = useState('')

  // Main form state
  const [form, setForm] = useState({
    full_name: '',
    age: '',
    gender: '',
    phone_number: '',
    // Pre-operative planning
    diagnosis: '',
    bleeding_risk: '',
    bleeding_risk_notes: '',
    dvt_risk: '',
    dvt_risk_notes: '',
    nutritional_status: '',
    nutritional_notes: '',
    cardiovascular_risk: '',
    cardiovascular_notes: '',
    pressure_sore_risk: '',
    pressure_sore_notes: '',
    // Investigations
    compulsory_tests: { hiv: false, fbc: false, seucr: false, hcv: false, hbsag: false },
    additional_tests: [],
    // Procedure
    procedure_name: '',
    // Requirements
    anaesthesia_type: '',
    tourniquet: false,
    diathermy: false,
    diathermy_type: '',
    special_instruments: [],
    dressing_materials: [],
    solutions: [],
    // Date
    preferred_date: '',
    notes: '',
    // Readiness
    readiness: {},
    // Education
    pre_op_education: '',
    post_op_education: '',
  })

  const handleTermsScroll = () => {
    const el = termsRef.current
    if (el && el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
      setScrolledToEnd(true)
    }
  }

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
    const phone = patient.phone_number ? patient.phone_number.replace(/^\+234/, '').replace(/^234/, '') : ''
    setForm((f) => ({ ...f, full_name: patient.full_name, age: String(patient.age), gender: patient.gender, phone_number: phone }))
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
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
    setError('')
  }

  const toggleCompulsoryTest = (key) => {
    setForm(f => ({
      ...f,
      compulsory_tests: { ...f.compulsory_tests, [key]: !f.compulsory_tests[key] },
    }))
  }

  const toggleArrayItem = (field, item) => {
    setForm(f => ({
      ...f,
      [field]: f[field].includes(item)
        ? f[field].filter(x => x !== item)
        : [...f[field], item],
    }))
  }

  const addCustomItem = (field, value, setter) => {
    if (!value.trim()) return
    if (!form[field].includes(value.trim())) {
      setForm(f => ({ ...f, [field]: [...f[field], value.trim()] }))
    }
    setter('')
  }

  const toggleReadiness = (key) => {
    setForm(f => ({
      ...f,
      readiness: { ...f.readiness, [key]: !f.readiness[key] },
    }))
  }

  // Generate AI education
  const generateEducation = async () => {
    if (!form.procedure_name) {
      setError('Please select a procedure first to generate education material')
      return
    }
    setEducationLoading(true)
    try {
      const result = await api.generateSurgeryEducation(form.procedure_name, form.diagnosis)
      setForm(f => ({
        ...f,
        pre_op_education: result.pre_op_education,
        post_op_education: result.post_op_education,
      }))
    } catch (err) {
      setError('Failed to generate education: ' + err.message)
    } finally {
      setEducationLoading(false)
    }
  }

  const allCompulsoryChecked = Object.values(form.compulsory_tests).every(Boolean)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.full_name || !form.age || !form.gender) {
      setError('Please fill in all patient information fields')
      return
    }
    if (!form.diagnosis) {
      setError('Diagnosis is required in Pre-Operative Planning')
      return
    }
    if (!allCompulsoryChecked) {
      setError('All compulsory pre-operative investigations must be requested')
      return
    }
    if (!form.procedure_name) {
      setError('Please select the name of the procedure')
      return
    }
    if (!form.anaesthesia_type) {
      setError('Please select anaesthesia type')
      return
    }
    if (!form.preferred_date) {
      setError('Please select a surgery date')
      return
    }
    if (!acceptedTerms) {
      setError('Please read and accept the Terms and Conditions')
      return
    }

    setLoading(true)
    try {
      const phone = form.phone_number ? '+234' + form.phone_number.replace(/^0+/, '') : ''
      const data = {
        full_name: form.full_name,
        age: parseInt(form.age),
        gender: form.gender,
        phone_number: phone,
        surgery_type: form.procedure_name,
        diagnosis: form.diagnosis,
        preferred_date: form.preferred_date,
        notes: form.notes,
        procedure_name: form.procedure_name,
        pre_op_planning: {
          diagnosis: form.diagnosis,
          bleeding_risk: { level: form.bleeding_risk, notes: form.bleeding_risk_notes },
          dvt_risk: { level: form.dvt_risk, notes: form.dvt_risk_notes },
          nutritional_assessment: { status: form.nutritional_status, notes: form.nutritional_notes },
          cardiovascular_risk: { level: form.cardiovascular_risk, notes: form.cardiovascular_notes },
          pressure_sore_risk: { level: form.pressure_sore_risk, notes: form.pressure_sore_notes },
        },
        investigations: {
          compulsory: form.compulsory_tests,
          additional: form.additional_tests,
        },
        requirements: {
          anaesthesia_type: form.anaesthesia_type,
          tourniquet: form.tourniquet,
          diathermy: form.diathermy,
          diathermy_type: form.diathermy ? form.diathermy_type : null,
          special_instruments: form.special_instruments,
          dressing_materials: form.dressing_materials,
          solutions: form.solutions,
        },
        readiness_checklist: form.readiness,
        pre_op_education: form.pre_op_education,
        post_op_education: form.post_op_education,
      }
      const result = await api.bookSurgery(data)
      navigate('/surgery-confirmation', { state: { surgery: result } })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  // Check if essential fields are complete for showing terms
  const essentialComplete = form.full_name && form.age && form.gender && form.diagnosis
    && allCompulsoryChecked && form.procedure_name && form.anaesthesia_type && form.preferred_date

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 relative z-10">
      <h1 className="text-2xl font-bold text-blue-800 mb-2">Book a Surgery</h1>
      <p className="text-sm text-gray-500 mb-6">Complete pre-operative planning and booking form</p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ─── Section 1: Patient Information ─── */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-7 h-7 bg-blue-700 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
            Patient Information
          </h2>
          <div className="space-y-4">
            <div ref={patientDropdownRef} className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              {isReturningPatient ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-green-50 border border-green-300 rounded-lg px-3 py-2 text-gray-900">
                    <span className="font-medium">{form.full_name}</span>
                    <span className="text-xs text-green-600 ml-2">(Returning Patient)</span>
                  </div>
                  <button type="button" onClick={clearPatientSelection}
                    className="px-3 py-2 text-sm text-red-600 hover:text-red-800 border border-red-200 rounded-lg hover:bg-red-50 transition">
                    Clear
                  </button>
                </div>
              ) : (
                <>
                  <input type="text" value={patientQuery || form.full_name}
                    onChange={(e) => { setPatientQuery(e.target.value); setForm(f => ({ ...f, full_name: e.target.value })); setError('') }}
                    required maxLength={100} autoComplete="off"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Start typing to search existing patients..." />
                  {searchingPatients && <p className="text-xs text-gray-400 mt-1">Searching patients...</p>}
                  {!searchingPatients && patientQuery.length >= 2 && patientResults.length === 0 && (
                    <p className="text-xs text-gray-400 mt-1">No existing patients found — booking as new patient</p>
                  )}
                  {showPatientDropdown && (
                    <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {patientResults.map((p, i) => (
                        <li key={i} onClick={() => selectPatient(p)}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0">
                          <div className="font-medium text-gray-800">{p.full_name}</div>
                          <div className="text-xs text-gray-500">{p.gender}, Age {p.age}{p.phone_number ? ` • ${p.phone_number}` : ''}</div>
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
                <input type="number" name="age" value={form.age} onChange={handleChange} required min="0" max="150"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
                <select name="gender" value={form.gender} onChange={handleChange} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">-- Select --</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number (WhatsApp)</label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-100 text-gray-600 text-sm font-medium select-none">+234</span>
                <input type="tel" name="phone_number" value={form.phone_number}
                  onChange={(e) => { setForm(f => ({ ...f, phone_number: e.target.value.replace(/[^0-9]/g, '') })) }}
                  maxLength={11}
                  className="w-full border border-gray-300 rounded-r-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. 08012345678" />
              </div>
              <p className="text-xs text-gray-400 mt-1">Enter your number without the country code</p>
            </div>
          </div>
        </div>

        {/* ─── Section 2: Pre-Operative Planning ─── */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-7 h-7 bg-purple-700 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
            Pre-Operative Planning
          </h2>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis *</label>
              <textarea name="diagnosis" value={form.diagnosis} onChange={handleChange} rows={2} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="Enter the clinical diagnosis..." />
            </div>

            {/* Risk Assessments */}
            {[
              { field: 'bleeding_risk', label: 'Bleeding Risk Assessment', color: 'red', levels: RISK_LEVELS,
                guidance: 'Consider: anticoagulant use, bleeding disorders, liver disease, thrombocytopenia' },
              { field: 'dvt_risk', label: 'DVT Risk Assessment', color: 'orange', levels: RISK_LEVELS,
                guidance: 'Consider: immobility, obesity, malignancy, prior DVT, OCP use, age >40' },
              { field: 'nutritional_status', label: 'Nutritional Assessment', color: 'amber', levels: NUTRITIONAL_STATUS, isNutrition: true,
                guidance: 'Consider: BMI, serum albumin, weight loss history, dietary intake' },
              { field: 'cardiovascular_risk', label: 'Cardiovascular Risk Assessment', color: 'blue', levels: RISK_LEVELS,
                guidance: 'Consider: hypertension, diabetes, IHD, heart failure, ECG findings' },
              { field: 'pressure_sore_risk', label: 'Pressure Sore Risk Assessment', color: 'emerald', levels: RISK_LEVELS,
                guidance: 'Consider: mobility, nutrition, skin integrity, incontinence, sensory perception' },
            ].map(({ field, label, color, levels, guidance, isNutrition }) => (
              <div key={field} className={`border border-${color}-200 rounded-lg p-4 bg-${color}-50/30`}>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
                <p className="text-xs text-gray-500 mb-2 italic">{guidance}</p>
                <select name={field} value={form[field]} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-purple-500 outline-none mb-2">
                  <option value="">-- Select {isNutrition ? 'Status' : 'Risk Level'} --</option>
                  {levels.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <input type="text" name={`${field}_notes`} value={form[`${field}_notes`] || form[`${field === 'nutritional_status' ? 'nutritional' : field}_notes`] || ''}
                  onChange={(e) => setForm(f => ({ ...f, [`${field}_notes`]: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="Additional notes (optional)..." />
              </div>
            ))}
          </div>
        </div>

        {/* ─── Section 3: Pre-Operative Investigations ─── */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-7 h-7 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
            Pre-Operative Investigations
          </h2>

          <div className="mb-4">
            <h3 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              Compulsory Investigations (All Required)
            </h3>
            <div className="space-y-2">
              {COMPULSORY_TESTS.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-red-50 cursor-pointer">
                  <input type="checkbox" checked={form.compulsory_tests[key]}
                    onChange={() => toggleCompulsoryTest(key)}
                    className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500" />
                  <span className={`text-sm font-medium ${form.compulsory_tests[key] ? 'text-green-700' : 'text-gray-700'}`}>
                    {label}
                    {form.compulsory_tests[key] && <span className="ml-2 text-green-500 text-xs">✓ Requested</span>}
                  </span>
                </label>
              ))}
            </div>
            {!allCompulsoryChecked && (
              <p className="text-xs text-red-500 mt-2 font-medium">All compulsory investigations must be requested before booking</p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Additional Investigations (Optional)</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {ADDITIONAL_TESTS_OPTIONS.map(test => (
                <button key={test} type="button" onClick={() => toggleArrayItem('additional_tests', test)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                    form.additional_tests.includes(test)
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {test}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={customTest} onChange={(e) => setCustomTest(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomItem('additional_tests', customTest, setCustomTest) } }}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add other investigation..." />
              <button type="button" onClick={() => addCustomItem('additional_tests', customTest, setCustomTest)}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition">Add</button>
            </div>
            {form.additional_tests.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {form.additional_tests.map(test => (
                  <span key={test} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                    {test}
                    <button type="button" onClick={() => toggleArrayItem('additional_tests', test)}
                      className="text-blue-500 hover:text-blue-700 ml-1">&times;</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── Section 4: Procedure Details ─── */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-7 h-7 bg-teal-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
            Name of Procedure
          </h2>
          <select name="procedure_name" value={form.procedure_name} onChange={handleChange} required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-teal-500 outline-none">
            <option value="">-- Select Procedure --</option>
            {SURGERY_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>

        {/* ─── Section 5: Surgical Requirements ─── */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">5</span>
            Surgical Requirements Checklist
          </h2>
          <div className="space-y-5">
            {/* Anaesthesia */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Anaesthesia Type *</label>
              <select name="anaesthesia_type" value={form.anaesthesia_type} onChange={handleChange} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="">-- Select Anaesthesia --</option>
                {ANAESTHESIA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Tourniquet & Diathermy */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="tourniquet" checked={form.tourniquet} onChange={handleChange}
                    className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                  <span className="text-sm font-semibold text-gray-700">Use of Tourniquet</span>
                </label>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="diathermy" checked={form.diathermy} onChange={handleChange}
                    className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                  <span className="text-sm font-semibold text-gray-700">Use of Diathermy</span>
                </label>
                {form.diathermy && (
                  <select name="diathermy_type" value={form.diathermy_type} onChange={handleChange}
                    className="w-full mt-2 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="">-- Select Type --</option>
                    {DIATHERMY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                )}
              </div>
            </div>

            {/* Special Instruments */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Special Instruments Needed</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {SPECIAL_INSTRUMENTS_OPTIONS.map(item => (
                  <button key={item} type="button" onClick={() => toggleArrayItem('special_instruments', item)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                      form.special_instruments.includes(item)
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>{item}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={customInstrument} onChange={(e) => setCustomInstrument(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomItem('special_instruments', customInstrument, setCustomInstrument) } }}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Add other instrument..." />
                <button type="button" onClick={() => addCustomItem('special_instruments', customInstrument, setCustomInstrument)}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition">Add</button>
              </div>
              {form.special_instruments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.special_instruments.map(item => (
                    <span key={item} className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                      {item}
                      <button type="button" onClick={() => toggleArrayItem('special_instruments', item)} className="ml-1">&times;</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Dressing Materials */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Dressing Materials Needed</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {DRESSING_MATERIALS_OPTIONS.map(item => (
                  <button key={item} type="button" onClick={() => toggleArrayItem('dressing_materials', item)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                      form.dressing_materials.includes(item)
                        ? 'bg-green-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>{item}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={customDressing} onChange={(e) => setCustomDressing(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomItem('dressing_materials', customDressing, setCustomDressing) } }}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Add other dressing material..." />
                <button type="button" onClick={() => addCustomItem('dressing_materials', customDressing, setCustomDressing)}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition">Add</button>
              </div>
              {form.dressing_materials.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.dressing_materials.map(item => (
                    <span key={item} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                      {item}
                      <button type="button" onClick={() => toggleArrayItem('dressing_materials', item)} className="ml-1">&times;</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Solutions */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Solutions Needed</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {SOLUTIONS_OPTIONS.map(item => (
                  <button key={item} type="button" onClick={() => toggleArrayItem('solutions', item)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                      form.solutions.includes(item)
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>{item}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={customSolution} onChange={(e) => setCustomSolution(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomItem('solutions', customSolution, setCustomSolution) } }}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="Add other solution..." />
                <button type="button" onClick={() => addCustomItem('solutions', customSolution, setCustomSolution)}
                  className="px-4 py-2 bg-cyan-600 text-white text-sm rounded-lg hover:bg-cyan-700 transition">Add</button>
              </div>
              {form.solutions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.solutions.map(item => (
                    <span key={item} className="bg-cyan-100 text-cyan-800 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                      {item}
                      <button type="button" onClick={() => toggleArrayItem('solutions', item)} className="ml-1">&times;</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── Section 6: Surgery Date ─── */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-7 h-7 bg-amber-600 text-white rounded-full flex items-center justify-center text-xs font-bold">6</span>
            Date for Surgery
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Surgery Date *</label>
              <input type="date" name="preferred_date" value={form.preferred_date} min={today} onChange={handleChange} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-amber-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes <span className="text-gray-400">(Optional)</span></label>
              <textarea name="notes" value={form.notes} onChange={handleChange} rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="Any additional information or special requirements..." />
            </div>
          </div>
        </div>

        {/* ─── Section 7: Readiness Checklist ─── */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-7 h-7 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xs font-bold">7</span>
            Readiness Checklist
          </h2>
          <p className="text-xs text-gray-500 mb-3">Check each item as it is confirmed prior to surgery day</p>
          <div className="space-y-2">
            {READINESS_ITEMS.map(({ key, label }) => (
              <label key={key} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
                form.readiness[key] ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
              }`}>
                <input type="checkbox" checked={!!form.readiness[key]}
                  onChange={() => toggleReadiness(key)}
                  className="w-5 h-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500" />
                <span className={`text-sm ${form.readiness[key] ? 'text-emerald-800 font-medium' : 'text-gray-700'}`}>
                  {label}
                </span>
                {form.readiness[key] && <span className="ml-auto text-emerald-500 text-xs font-medium">✓ Ready</span>}
              </label>
            ))}
          </div>
        </div>

        {/* ─── Section 8: Patient Education (AI-Aided) ─── */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-7 h-7 bg-pink-600 text-white rounded-full flex items-center justify-center text-xs font-bold">8</span>
            Patient Education
            <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full ml-1">AI-Aided</span>
          </h2>
          <p className="text-sm text-gray-500 mb-4">Generate comprehensive pre-operative and post-operative education for the patient based on the planned procedure.</p>

          <button type="button" onClick={generateEducation} disabled={educationLoading || !form.procedure_name}
            className="w-full mb-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-semibold py-3 rounded-lg shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2">
            {educationLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Generating Education Material...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                Generate Education Material
              </>
            )}
          </button>

          {!form.procedure_name && (
            <p className="text-xs text-gray-400 text-center">Please select a procedure in Section 4 first</p>
          )}

          {form.pre_op_education && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                Pre-Operative Education
              </h3>
              <div className="bg-blue-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed border border-blue-100">
                {form.pre_op_education}
              </div>
            </div>
          )}

          {form.post_op_education && (
            <div>
              <h3 className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Post-Operative Education
              </h3>
              <div className="bg-green-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed border border-green-100">
                {form.post_op_education}
              </div>
            </div>
          )}
        </div>

        {/* ─── Section 9: Terms & Conditions ─── */}
        {essentialComplete && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 bg-gray-600 text-white rounded-full flex items-center justify-center text-xs font-bold">9</span>
              Terms &amp; Conditions
            </h2>
            <p className="text-sm text-gray-500 mb-3">Please read the terms below. You must scroll to the end to accept.</p>
            <div ref={termsRef} onScroll={handleTermsScroll}
              className="h-64 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50 text-sm text-gray-700 leading-relaxed">
              <h3 className="text-center font-bold text-blue-800 mb-1">NIGER FOUNDATION HOSPITAL, ENUGU</h3>
              <h4 className="text-center font-semibold text-blue-700 mb-1">PLASTIC SURGERY UNIT</h4>
              <h4 className="text-center font-semibold text-gray-800 mb-4">SURGERY BOOKING TERMS AND CONDITIONS</h4>

              <p className="font-semibold mt-3 mb-1">1. Surgery Scheduling</p>
              <p>By submitting a surgery booking request through this platform, the patient acknowledges that the preferred date is subject to availability and confirmation by the surgical team.</p>

              <p className="font-semibold mt-3 mb-1">2. Pre-Operative Requirements</p>
              <p>Patients are required to complete all pre-operative assessments and investigations as directed by the attending physician prior to the surgery date.</p>
              <p className="mt-1">Failure to complete pre-operative requirements may result in postponement of the surgery.</p>

              <p className="font-semibold mt-3 mb-1">3. Clinical Risk Assessments</p>
              <p>All risk assessments (bleeding, DVT, nutritional, cardiovascular, pressure sore) documented in this booking form are preliminary. Final risk stratification will be confirmed by the surgical team on the day of surgery.</p>

              <p className="font-semibold mt-3 mb-1">4. Investigations</p>
              <p>All compulsory pre-operative investigations must be completed and results available before the scheduled surgery date. Additional investigations may be required based on clinical assessment.</p>

              <p className="font-semibold mt-3 mb-1">5. Confirmation and Communication</p>
              <p>The surgical team will contact the patient via the provided phone number to:</p>
              <ul className="list-disc ml-5 mt-1">
                <li>Confirm the surgery date and time</li>
                <li>Provide pre-operative instructions</li>
                <li>Discuss any special preparations needed</li>
              </ul>

              <p className="font-semibold mt-3 mb-1">6. Cancellation Policy</p>
              <p>Patients must notify the hospital at least 48 hours before the scheduled surgery date if they need to reschedule or cancel.</p>

              <p className="font-semibold mt-3 mb-1">7. Informed Consent</p>
              <p>A separate informed consent form will be provided and must be signed by the patient (or legal guardian) before any surgical procedure is performed.</p>

              <p className="font-semibold mt-3 mb-1">8. Hospital Authority</p>
              <p>The hospital management and surgical team reserve the right to reschedule surgeries based on clinical priorities, modify surgical plans as medically necessary, and decline or postpone procedures if patient conditions are not optimal.</p>

              <p className="font-semibold mt-3 mb-1">9. Patient Education</p>
              <p>Patient education material provided through this platform is for informational purposes and does not replace direct medical consultation. Patients should discuss any concerns with their surgical team.</p>

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
              <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)}
                disabled={!scrolledToEnd}
                className="w-4 h-4 text-blue-700 border-gray-300 rounded focus:ring-blue-500" />
              <span className="text-sm font-medium text-gray-700">I have read and agree to the Terms and Conditions</span>
            </label>
          </div>
        )}

        {/* Submit */}
        {essentialComplete && acceptedTerms && (
          <button type="submit" disabled={loading}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-lg shadow-md transition disabled:opacity-50">
            {loading ? 'Submitting Surgery Booking...' : 'Submit Surgery Booking'}
          </button>
        )}
      </form>
    </main>
  )
}
