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

// ─── CAPRINI DVT RISK SCORE ───
const CAPRINI = [
  { pts: 1, items: [
    { key: 'age_41_60', label: 'Age 41–60' },
    { key: 'minor_surgery', label: 'Minor surgery planned' },
    { key: 'bmi_gt_25', label: 'BMI > 25' },
    { key: 'swollen_legs', label: 'Swollen legs (current)' },
    { key: 'varicose_veins', label: 'Varicose veins' },
    { key: 'pregnancy', label: 'Pregnancy or postpartum (<1 mo)' },
    { key: 'ocp_hrt', label: 'OCP / HRT use' },
    { key: 'sepsis', label: 'Sepsis (≤1 mo)' },
    { key: 'lung_disease', label: 'Serious lung disease incl. pneumonia / COPD' },
    { key: 'acute_mi', label: 'Acute myocardial infarction' },
    { key: 'chf', label: 'Congestive heart failure (≤1 mo)' },
    { key: 'ibd', label: 'History of inflammatory bowel disease' },
    { key: 'bed_rest', label: 'Medical patient currently at bed rest' },
  ]},
  { pts: 2, items: [
    { key: 'age_61_74', label: 'Age 61–74' },
    { key: 'major_surgery', label: 'Major open surgery (>45 min)' },
    { key: 'laparoscopic', label: 'Laparoscopic surgery (>45 min)' },
    { key: 'malignancy', label: 'Malignancy (present or previous)' },
    { key: 'confined_bed', label: 'Confined to bed (>72 hours)' },
    { key: 'immobilizing_cast', label: 'Immobilizing plaster cast (≤1 mo)' },
    { key: 'central_line', label: 'Central venous access' },
  ]},
  { pts: 3, items: [
    { key: 'age_75', label: 'Age ≥75' },
    { key: 'dvt_pe_history', label: 'History of DVT/PE' },
    { key: 'family_thrombosis', label: 'Family history of thrombosis' },
    { key: 'factor_v', label: 'Factor V Leiden positive' },
    { key: 'prothrombin_20210a', label: 'Prothrombin 20210A positive' },
    { key: 'lupus_anticoag', label: 'Lupus anticoagulant positive' },
    { key: 'anticardiolipin', label: 'Anticardiolipin antibodies elevated' },
    { key: 'homocysteine', label: 'Elevated serum homocysteine' },
    { key: 'hit', label: 'Heparin-induced thrombocytopenia (HIT)' },
    { key: 'other_thrombophilia', label: 'Other congenital/acquired thrombophilia' },
  ]},
  { pts: 5, items: [
    { key: 'stroke', label: 'Stroke (≤1 mo)' },
    { key: 'arthroplasty', label: 'Elective major lower extremity arthroplasty' },
    { key: 'fracture', label: 'Hip, pelvis, or leg fracture (≤1 mo)' },
    { key: 'spinal_injury', label: 'Acute spinal cord injury (≤1 mo)' },
  ]},
]

// ─── MUST (Malnutrition Universal Screening Tool) ───
const MUST_BMI = [
  { value: '0', label: 'BMI > 20 kg/m² (Score 0)' },
  { value: '1', label: 'BMI 18.5 – 20 kg/m² (Score 1)' },
  { value: '2', label: 'BMI < 18.5 kg/m² (Score 2)' },
]
const MUST_WEIGHT = [
  { value: '0', label: 'Unplanned weight loss < 5% in 3–6 months (Score 0)' },
  { value: '1', label: 'Unplanned weight loss 5–10% (Score 1)' },
  { value: '2', label: 'Unplanned weight loss > 10% (Score 2)' },
]

// ─── RCRI (Revised Cardiac Risk Index — Lee Index) ───
const RCRI_ITEMS = [
  { key: 'high_risk_surg', label: 'High-risk surgery (intraperitoneal, intrathoracic, suprainguinal vascular)' },
  { key: 'ihd', label: 'History of ischaemic heart disease' },
  { key: 'chf', label: 'History of congestive heart failure' },
  { key: 'cvd', label: 'History of cerebrovascular disease (stroke / TIA)' },
  { key: 'insulin', label: 'Pre-operative insulin treatment for diabetes mellitus' },
  { key: 'creatinine', label: 'Pre-operative serum creatinine > 2 mg/dL (177 µmol/L)' },
]

// ─── WATERLOW PRESSURE SORE RISK SCORE ───
const WL_BUILD = [
  { v: '0', l: 'Average build/weight for height' },
  { v: '1', l: 'Above average' },
  { v: '2', l: 'Obese' },
  { v: '3', l: 'Below average' },
]
const WL_SKIN = [
  { v: '0', l: 'Healthy' },
  { v: '1', l: 'Tissue paper / Dry / Oedematous / Clammy' },
  { v: '2', l: 'Discoloured (Grade 1)' },
  { v: '3', l: 'Broken / Spot (Grade 2–4)' },
]
const WL_CONTINENCE = [
  { v: '0', l: 'Complete / Catheterised' },
  { v: '1', l: 'Urinary incontinence' },
  { v: '2', l: 'Faecal incontinence' },
  { v: '3', l: 'Doubly incontinent' },
]
const WL_MOBILITY = [
  { v: '0', l: 'Fully mobile' },
  { v: '1', l: 'Restless / Fidgety' },
  { v: '2', l: 'Apathetic' },
  { v: '3', l: 'Restricted' },
  { v: '4', l: 'Inert / Traction' },
  { v: '5', l: 'Chairbound' },
]
const WL_APPETITE = [
  { v: '0', l: 'Average appetite' },
  { v: '1', l: 'Poor' },
  { v: '2', l: 'NG tube / Fluids only' },
  { v: '3', l: 'NBM / Anorexic' },
]
const WL_TISSUE = [
  { key: 'cachexia', label: 'Terminal cachexia', p: 8 },
  { key: 'cardiac_fail', label: 'Cardiac failure', p: 5 },
  { key: 'pvd', label: 'Peripheral vascular disease', p: 5 },
  { key: 'anaemia', label: 'Anaemia', p: 2 },
  { key: 'smoking', label: 'Smoking', p: 1 },
]
const WL_NEURO = [
  { v: '0', l: 'None' },
  { v: '4', l: 'Diabetes / MS / CVA' },
  { v: '5', l: 'Motor / Sensory deficit' },
  { v: '6', l: 'Paraplegia' },
]
const WL_SURGERY = [
  { v: '0', l: 'None' },
  { v: '5', l: 'Orthopaedic below waist / On table >2 hrs' },
  { v: '8', l: 'On table >6 hrs' },
]
const WL_MEDS = [
  { key: 'cytotoxics', label: 'Cytotoxics', p: 4 },
  { key: 'steroids', label: 'High-dose steroids', p: 4 },
  { key: 'anti_inflam', label: 'Anti-inflammatory agents', p: 4 },
]

// ─── SURGICAL BLEEDING RISK ASSESSMENT ───
const BLEED_1PT = [
  { key: 'age_gt_65', label: 'Age > 65 years' },
  { key: 'antiplatelet', label: 'Antiplatelet therapy (Aspirin, Clopidogrel)' },
  { key: 'inr_high', label: 'INR > 1.5' },
  { key: 'low_platelets', label: 'Platelet count < 100 × 10⁹/L' },
  { key: 'active_cancer', label: 'Active cancer' },
  { key: 'prior_bleed', label: 'Prior major bleeding event' },
  { key: 'anemia', label: 'Anaemia (Hb < 10 g/dL)' },
]
const BLEED_2PT = [
  { key: 'anticoagulant', label: 'Active anticoagulant therapy (Warfarin, Heparin, DOAC)' },
  { key: 'bleeding_disorder', label: 'Known bleeding disorder (Haemophilia, vWD, etc.)' },
  { key: 'liver_disease', label: 'Liver disease / Cirrhosis' },
  { key: 'renal_failure', label: 'Renal failure (GFR < 30 mL/min)' },
]

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
  const [educationPdfLoading, setEducationPdfLoading] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)
  const [expandedPanel, setExpandedPanel] = useState(null)

  // Specialties / Surgeons (master data)
  const [specialties, setSpecialties] = useState([])
  const [surgeons, setSurgeons] = useState([])

  // Auth check — admin only
  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      navigate('/admin', { replace: true })
    }
  }, [navigate])

  // Load specialties on mount
  useEffect(() => {
    api.getSpecialties().then(setSpecialties).catch(() => setSpecialties([]))
  }, [])
  const [mealPlan, setMealPlan] = useState(null)
  const [mealPlanLoading, setMealPlanLoading] = useState(false)
  const [showMealPlan, setShowMealPlan] = useState(false)

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
    // Caprini DVT score items
    caprini: {},
    // MUST nutritional score
    must_bmi: '',
    must_weight_loss: '',
    must_acute_disease: false,
    // RCRI cardiovascular score items
    rcri: {},
    // Waterlow pressure sore score
    wl_build: '', wl_skin: '', wl_continence: '', wl_mobility: '', wl_appetite: '',
    wl_tissue: {}, wl_neuro: '', wl_surgery: '', wl_meds: {},
    // Bleeding risk items
    bleeding: {},
    bleeding_notes: '',
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
    // Theatre / scheduling
    specialty_id: '',
    surgeon_id: '',
    theatre: '',
    surgery_class: '',
    slot_duration_hours: '',
    slot_start: '',
    has_extra_assistant: false,
    urgency: 'ELECTIVE',
    equipment_needed: '',
    ward: '',
    is_daycase: false,
    // Readiness
    readiness: {},
    // Education
    pre_op_education: '',
    post_op_education: '',
  })

  // ─── SCORING CALCULATORS ───
  const calcCaprini = () => {
    let s = 0
    CAPRINI.forEach(g => g.items.forEach(i => { if (form.caprini[i.key]) s += g.pts }))
    return s
  }
  const capriniRisk = (s) => {
    if (s <= 1) return { level: 'Low Risk', color: 'green', pct: '' }
    if (s === 2) return { level: 'Moderate Risk', color: 'amber', pct: '' }
    if (s <= 4) return { level: 'High Risk', color: 'orange', pct: '' }
    return { level: 'Highest Risk', color: 'red', pct: '' }
  }

  const calcMust = () => (parseInt(form.must_bmi) || 0) + (parseInt(form.must_weight_loss) || 0) + (form.must_acute_disease ? 2 : 0)
  const mustRisk = (s) => {
    if (s === 0) return { level: 'Low Risk', color: 'green', action: 'Routine clinical care. Repeat screening weekly (hospital) or monthly (community).' }
    if (s === 1) return { level: 'Medium Risk', color: 'amber', action: 'Observe — document dietary intake for 3 days. If adequate, little concern. If inadequate, improve and increase overall nutritional intake.' }
    return { level: 'High Risk', color: 'red', action: 'Treat — refer to dietitian/nutritional support team. Improve and increase overall nutritional intake. Monitor and review care plan weekly.' }
  }

  const calcRcri = () => RCRI_ITEMS.reduce((s, i) => s + (form.rcri[i.key] ? 1 : 0), 0)
  const rcriRisk = (s) => {
    if (s === 0) return { level: 'Very Low Risk', color: 'green', pct: '~3.9% MACE' }
    if (s === 1) return { level: 'Low Risk', color: 'green', pct: '~6.0% MACE' }
    if (s === 2) return { level: 'Moderate Risk', color: 'amber', pct: '~10.1% MACE' }
    return { level: 'High Risk', color: 'red', pct: '≥15% MACE' }
  }

  const calcWaterlow = () => {
    let s = 0
    s += parseInt(form.wl_build) || 0
    s += parseInt(form.wl_skin) || 0
    // Sex from gender
    if (form.gender === 'Male') s += 1
    else if (form.gender === 'Female') s += 2
    // Age
    const age = parseInt(form.age) || 0
    if (age >= 80) s += 5
    else if (age >= 75) s += 4
    else if (age >= 65) s += 3
    else if (age >= 50) s += 2
    else if (age >= 14) s += 1
    s += parseInt(form.wl_continence) || 0
    s += parseInt(form.wl_mobility) || 0
    s += parseInt(form.wl_appetite) || 0
    WL_TISSUE.forEach(i => { if (form.wl_tissue[i.key]) s += i.p })
    s += parseInt(form.wl_neuro) || 0
    s += parseInt(form.wl_surgery) || 0
    WL_MEDS.forEach(i => { if (form.wl_meds[i.key]) s += i.p })
    return s
  }
  const waterlowRisk = (s) => {
    if (s < 10) return { level: 'Not at Risk', color: 'green' }
    if (s <= 14) return { level: 'At Risk', color: 'amber' }
    if (s <= 19) return { level: 'High Risk', color: 'orange' }
    return { level: 'Very High Risk', color: 'red' }
  }

  const calcBleeding = () => {
    let s = 0
    BLEED_1PT.forEach(i => { if (form.bleeding[i.key]) s += 1 })
    BLEED_2PT.forEach(i => { if (form.bleeding[i.key]) s += 2 })
    return s
  }
  const bleedingRisk = (s) => {
    if (s <= 1) return { level: 'Low Risk', color: 'green' }
    if (s <= 3) return { level: 'Moderate Risk', color: 'amber' }
    return { level: 'High Risk', color: 'red' }
  }

  const scoreBadge = (risk) => {
    const colors = { green: 'bg-green-100 text-green-800', amber: 'bg-amber-100 text-amber-800', orange: 'bg-orange-100 text-orange-800', red: 'bg-red-100 text-red-800' }
    return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${colors[risk.color]}`}>{risk.level}</span>
  }

  // ─── SCORING TOGGLES ───
  const toggleScoreItem = (section, key) => {
    setForm(f => ({ ...f, [section]: { ...f[section], [key]: !f[section]?.[key] } }))
  }
  const togglePanel = (panel) => setExpandedPanel(expandedPanel === panel ? null : panel)

  // ─── MEAL PLAN GENERATION ───
  const generateMealPlan = async () => {
    setMealPlanLoading(true)
    try {
      const mustScore = calcMust()
      const mustR = mustRisk(mustScore)
      const result = await api.generateMealPlan({
        must_score: mustScore,
        must_risk: mustR.level,
        age: form.age,
        gender: form.gender,
        diagnosis: form.diagnosis,
      })
      setMealPlan(result.meal_plan)
      setShowMealPlan(true)
    } catch (err) {
      setError('Failed to generate meal plan: ' + err.message)
    } finally {
      setMealPlanLoading(false)
    }
  }

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

  // Existing bookings for the chosen surgery date — used to prevent slot collisions.
  const [dayBookings, setDayBookings] = useState([])
  useEffect(() => {
    if (!form.preferred_date) { setDayBookings([]); return }
    api.getPublicSurgeries({ from: form.preferred_date, to: form.preferred_date })
      .then(setDayBookings).catch(() => setDayBookings([]))
  }, [form.preferred_date])

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

  // Load surgeons when specialty changes
  useEffect(() => {
    if (!form.specialty_id) { setSurgeons([]); return }
    api.getSurgeons(form.specialty_id)
      .then(setSurgeons)
      .catch(() => setSurgeons([]))
    // Reset surgeon when specialty changes
    setForm(f => ({ ...f, surgeon_id: '' }))
  }, [form.specialty_id])

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

  // ─── SAVE / LOAD DRAFT (localStorage) ───
  const DRAFT_KEY = 'nfh_surgery_draft'

  const saveDraft = () => {
    try {
      const draftData = { form, mealPlan, acceptedTerms, scrolledToEnd, isReturningPatient, patientQuery, savedAt: new Date().toISOString() }
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData))
      setDraftSaved(true)
      setTimeout(() => setDraftSaved(false), 3000)
    } catch {
      setError('Failed to save draft')
    }
  }

  const loadDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return false
      const draft = JSON.parse(raw)
      if (draft.form) setForm(draft.form)
      if (draft.mealPlan) setMealPlan(draft.mealPlan)
      if (draft.acceptedTerms) setAcceptedTerms(draft.acceptedTerms)
      if (draft.scrolledToEnd) setScrolledToEnd(draft.scrolledToEnd)
      if (draft.isReturningPatient) setIsReturningPatient(draft.isReturningPatient)
      if (draft.patientQuery) setPatientQuery(draft.patientQuery)
      return true
    } catch {
      return false
    }
  }

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY)
  }

  // Load draft on mount
  useEffect(() => {
    const hasDraft = localStorage.getItem(DRAFT_KEY)
    if (hasDraft) {
      const loaded = loadDraft()
      if (loaded) setDraftSaved(false)
    }
  }, [])

  // ─── EDUCATION PDF DOWNLOAD ───
  const downloadEducationPdf = async () => {
    if (!form.pre_op_education && !form.post_op_education) return
    setEducationPdfLoading(true)
    try {
      const result = await api.getEducationPdf({
        patient_name: form.full_name,
        procedure: form.procedure_name,
        diagnosis: form.diagnosis,
        pre_op_education: form.pre_op_education,
        post_op_education: form.post_op_education,
      })
      const url = URL.createObjectURL(result.blob)
      const a = document.createElement('a')
      a.href = url
      a.download = result.filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError('Failed to generate education PDF: ' + err.message)
    } finally {
      setEducationPdfLoading(false)
    }
  }

  // ─── SHARE EDUCATION ON WHATSAPP ───
  const shareEducationWhatsApp = () => {
    const phone = form.phone_number ? form.phone_number.replace(/[^0-9]/g, '') : ''
    const fullPhone = phone ? `234${phone}` : ''

    let text = `*NIGER FOUNDATION HOSPITAL, ENUGU*\n*Plastic Surgery Unit — Patient Education*\n\n`
    text += `Patient: ${form.full_name || 'N/A'}\n`
    text += `Procedure: ${form.procedure_name || 'N/A'}\n\n`

    if (form.pre_op_education) {
      text += `📘 *PRE-OPERATIVE EDUCATION*\n\n${form.pre_op_education}\n\n`
    }
    if (form.post_op_education) {
      text += `📗 *POST-OPERATIVE EDUCATION*\n\n${form.post_op_education}\n\n`
    }

    text += `_This information is provided for your guidance. Please discuss any concerns with your surgical team._\n`
    text += `\n— Niger Foundation Hospital, Enugu`

    const encoded = encodeURIComponent(text)
    const url = fullPhone
      ? `https://wa.me/${fullPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`
    window.open(url, '_blank')
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
    if (!form.specialty_id) {
      setError('Please select a specialty')
      return
    }
    if (!form.surgeon_id) {
      setError('Please select a surgeon')
      return
    }
    if (!form.theatre) {
      setError('Please select a theatre')
      return
    }
    if (!form.ward) {
      setError('Please select the ward / unit')
      return
    }
    if (!acceptedTerms) {
      setError('Please read and accept the Terms and Conditions')
      return
    }

    setLoading(true)
    try {
      const phone = form.phone_number ? '+234' + form.phone_number.replace(/^0+/, '') : ''

      // Combine time-only slot_start with the surgery date
      let slotIso = null
      if (form.slot_start && form.preferred_date) {
        const dt = new Date(`${form.preferred_date}T${form.slot_start}:00`)
        if (!isNaN(dt.getTime())) slotIso = dt.toISOString()
      }

      // Small Theatre availability rules
      if (form.theatre === 'SMALL') {
        if (!form.has_extra_assistant) {
          setLoading(false)
          setError('Small Theatre is only available when the surgeon is bringing an external surgical assistant.')
          return
        }
        if (slotIso && form.slot_duration_hours) {
          const startMs = new Date(slotIso).getTime()
          const endMs = startMs + parseInt(form.slot_duration_hours) * 3600 * 1000
          let dayBookings = []
          try {
            dayBookings = await api.getPublicSurgeries({ from: form.preferred_date, to: form.preferred_date })
          } catch { /* network issue — backend will still validate */ }
          const overlapsLarge = dayBookings.some(b => {
            if (b.theatre !== 'LARGE' || !b.slot_start || !b.slot_end) return false
            const bs = new Date(b.slot_start).getTime()
            const be = new Date(b.slot_end).getTime()
            return bs < endMs && be > startMs
          })
          if (!overlapsLarge) {
            setLoading(false)
            setError('Small Theatre is only available when the Large Theatre is booked at the same time.')
            return
          }
          const day = new Date(`${form.preferred_date}T00:00:00`).getDay()
          const [hh] = form.slot_start.split(':').map(Number)
          if (day === 4 && hh >= 9 && hh < 16) {
            const ok = window.confirm('On Thursdays 09:00–16:00 the Small Theatre is normally used for endoscopies. Booking it in this window requires confirmation from the scrub nurses. Submit anyway?')
            if (!ok) { setLoading(false); return }
          }
        }
      }

      // Per-theatre slot conflict (any theatre): once a slot is taken on a given
      // date, nobody else can book an overlapping slot in the same theatre.
      if (slotIso && form.slot_duration_hours && form.theatre) {
        const startMs = new Date(slotIso).getTime()
        const endMs = startMs + parseInt(form.slot_duration_hours) * 3600 * 1000
        const conflict = dayBookings.find(b => {
          if (b.theatre !== form.theatre || !b.slot_start || !b.slot_end) return false
          const st = String(b.status || '').toLowerCase()
          if (st && !['pending', 'confirmed'].includes(st)) return false
          const bs = new Date(b.slot_start).getTime()
          const be = new Date(b.slot_end).getTime()
          return bs < endMs && be > startMs
        })
        if (conflict) {
          const cs = new Date(conflict.slot_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          const ce = new Date(conflict.slot_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          setLoading(false)
          setError(`That time is already taken in the ${form.theatre} Theatre on ${form.preferred_date} (${cs}–${ce}). Please pick a different start time or duration.`)
          return
        }
      }

      const capScore = calcCaprini()
      const mustScore = calcMust()
      const rcriScore = calcRcri()
      const wlScore = calcWaterlow()
      const bleedScore = calcBleeding()

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
          bleeding_risk: {
            tool: 'Surgical Bleeding Risk Score',
            score: bleedScore,
            level: bleedingRisk(bleedScore).level,
            items: form.bleeding,
            notes: form.bleeding_notes,
          },
          dvt_risk: {
            tool: 'Caprini Score',
            score: capScore,
            level: capriniRisk(capScore).level,
            items: form.caprini,
          },
          nutritional_assessment: {
            tool: 'MUST (Malnutrition Universal Screening Tool)',
            score: mustScore,
            level: mustRisk(mustScore).level,
            bmi_score: form.must_bmi,
            weight_loss_score: form.must_weight_loss,
            acute_disease: form.must_acute_disease,
            meal_plan: mealPlan || null,
          },
          cardiovascular_risk: {
            tool: 'RCRI (Lee Index)',
            score: rcriScore,
            level: rcriRisk(rcriScore).level,
            items: form.rcri,
          },
          pressure_sore_risk: {
            tool: 'Waterlow Score',
            score: wlScore,
            level: waterlowRisk(wlScore).level,
            items: {
              build: form.wl_build, skin: form.wl_skin, continence: form.wl_continence,
              mobility: form.wl_mobility, appetite: form.wl_appetite, tissue: form.wl_tissue,
              neuro: form.wl_neuro, surgery: form.wl_surgery, meds: form.wl_meds,
            },
          },
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
        // Theatre fields
        specialty_id: form.specialty_id || null,
        surgeon_id: form.surgeon_id || null,
        theatre: form.theatre || null,
        surgery_class: form.surgery_class || null,
        slot_duration_hours: form.slot_duration_hours ? parseInt(form.slot_duration_hours) : null,
        slot_start: slotIso,
        has_extra_assistant: !!form.has_extra_assistant,
        urgency: form.urgency || 'ELECTIVE',
        equipment_needed: form.equipment_needed || null,
        ward: form.ward || null,
        is_daycase: !!form.is_daycase,
        needs_blood: !!form.needs_blood,
        blood_units: form.needs_blood && form.blood_units ? parseInt(form.blood_units) : null,
        anaesthesia_type: form.anaesthesia_type || null,
        anaesthetist_name: form.anaesthetist_name || null,
        folder_number: form.folder_number || null,
      }
      const result = await api.bookSurgery(data)
      clearDraft()
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

  // Computed scores for display
  const capScore = calcCaprini()
  const capRisk = capriniRisk(capScore)
  const mustScore = calcMust()
  const mustR = mustRisk(mustScore)
  const rcriScore = calcRcri()
  const rcriR = rcriRisk(rcriScore)
  const wlScore = calcWaterlow()
  const wlRisk = waterlowRisk(wlScore)
  const bleedScore = calcBleeding()
  const bleedR = bleedingRisk(bleedScore)

  // Helper: render a WL select
  const wlSelect = (field, options, label) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <select value={form[field]} onChange={(e) => setForm(f => ({ ...f, [field]: e.target.value }))}
        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white focus:ring-2 focus:ring-emerald-400 outline-none">
        <option value="">-- Select --</option>
        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  )

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 relative z-10">
      <h1 className="text-2xl font-bold text-blue-800 mb-2">Book a Surgery</h1>
      <p className="text-sm text-gray-500 mb-6">Complete pre-operative planning and booking form</p>

      {localStorage.getItem(DRAFT_KEY) && !draftSaved && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg mb-4 flex items-center justify-between">
          <span className="text-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Draft loaded — continue where you left off
          </span>
          <button type="button" onClick={() => { clearDraft(); window.location.reload() }}
            className="text-xs text-amber-600 hover:text-amber-800 underline">
            Start Fresh
          </button>
        </div>
      )}

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
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Folder Number</label>
                <input type="text" name="folder_number" value={form.folder_number} onChange={handleChange}
                  placeholder="e.g. NFH/2026/01234"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
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
          </div>
        </div>

        {/* ─── Section 2: Pre-Operative Planning (Validated Scoring Tools) ─── */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-7 h-7 bg-purple-700 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
            Pre-Operative Planning
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full ml-1">Validated Scoring Tools</span>
          </h2>
          <div className="space-y-4">
            {/* Diagnosis */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis *</label>
              <textarea name="diagnosis" value={form.diagnosis} onChange={handleChange} rows={2} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="Enter the clinical diagnosis..." />
            </div>

            {/* ── Bleeding Risk Assessment ── */}
            <div className="border border-red-200 rounded-lg overflow-hidden">
              <button type="button" onClick={() => togglePanel('bleeding')}
                className="w-full flex items-center justify-between px-4 py-3 bg-red-50 hover:bg-red-100 transition text-left">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-red-900">🩸 Bleeding Risk Assessment</span>
                  <span className="text-xs bg-white text-gray-500 px-2 py-0.5 rounded border">Score: {bleedScore}</span>
                  {scoreBadge(bleedR)}
                </div>
                <svg className={`w-5 h-5 text-red-400 transition-transform ${expandedPanel === 'bleeding' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {expandedPanel === 'bleeding' && (
                <div className="p-4 space-y-3 bg-white">
                  <p className="text-xs text-gray-500 italic">Adapted surgical bleeding risk assessment. Check all that apply.</p>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">1 Point Each:</p>
                    {BLEED_1PT.map(i => (
                      <label key={i.key} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-red-50 cursor-pointer">
                        <input type="checkbox" checked={!!form.bleeding[i.key]} onChange={() => toggleScoreItem('bleeding', i.key)}
                          className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500" />
                        <span className="text-sm text-gray-700">{i.label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">2 Points Each:</p>
                    {BLEED_2PT.map(i => (
                      <label key={i.key} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-red-50 cursor-pointer">
                        <input type="checkbox" checked={!!form.bleeding[i.key]} onChange={() => toggleScoreItem('bleeding', i.key)}
                          className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500" />
                        <span className="text-sm text-gray-700">{i.label}</span>
                      </label>
                    ))}
                  </div>
                  <input type="text" name="bleeding_notes" value={form.bleeding_notes} onChange={handleChange}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-red-300"
                    placeholder="Additional notes (e.g. specific medications, lab values)..." />
                  <div className="bg-red-50 rounded p-2 text-xs text-red-800">
                    <strong>Interpretation:</strong> 0–1 = Low Risk | 2–3 = Moderate Risk | ≥4 = High Risk
                  </div>
                </div>
              )}
            </div>

            {/* ── DVT Risk — Caprini Score ── */}
            <div className="border border-orange-200 rounded-lg overflow-hidden">
              <button type="button" onClick={() => togglePanel('caprini')}
                className="w-full flex items-center justify-between px-4 py-3 bg-orange-50 hover:bg-orange-100 transition text-left">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-orange-900">🦵 DVT Risk — Caprini Score</span>
                  <span className="text-xs bg-white text-gray-500 px-2 py-0.5 rounded border">Score: {capScore}</span>
                  {scoreBadge(capRisk)}
                </div>
                <svg className={`w-5 h-5 text-orange-400 transition-transform ${expandedPanel === 'caprini' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {expandedPanel === 'caprini' && (
                <div className="p-4 space-y-3 bg-white">
                  <p className="text-xs text-gray-500 italic">Caprini VTE Risk Assessment Model (2005). Check all risk factors that apply.</p>
                  {CAPRINI.map(group => (
                    <div key={group.pts} className="space-y-1">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{group.pts} Point{group.pts > 1 ? 's' : ''} Each:</p>
                      {group.items.map(i => (
                        <label key={i.key} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-orange-50 cursor-pointer">
                          <input type="checkbox" checked={!!form.caprini[i.key]} onChange={() => toggleScoreItem('caprini', i.key)}
                            className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500" />
                          <span className="text-sm text-gray-700">{i.label}</span>
                        </label>
                      ))}
                    </div>
                  ))}
                  <div className="bg-orange-50 rounded p-2 text-xs text-orange-800">
                    <strong>Interpretation:</strong> 0–1 = Low | 2 = Moderate | 3–4 = High | ≥5 = Highest Risk. <br />
                    <strong>Prophylaxis:</strong> Low = early ambulation | Moderate = SCDs ± LMWH | High/Highest = LMWH + SCDs
                  </div>
                </div>
              )}
            </div>

            {/* ── Nutritional Assessment — MUST Score ── */}
            <div className="border border-amber-200 rounded-lg overflow-hidden">
              <button type="button" onClick={() => togglePanel('must')}
                className="w-full flex items-center justify-between px-4 py-3 bg-amber-50 hover:bg-amber-100 transition text-left">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-amber-900">🍽️ Nutritional — MUST Score</span>
                  <span className="text-xs bg-white text-gray-500 px-2 py-0.5 rounded border">Score: {mustScore}</span>
                  {scoreBadge(mustR)}
                </div>
                <svg className={`w-5 h-5 text-amber-400 transition-transform ${expandedPanel === 'must' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {expandedPanel === 'must' && (
                <div className="p-4 space-y-4 bg-white">
                  <p className="text-xs text-gray-500 italic">Malnutrition Universal Screening Tool (BAPEN). Complete all 3 steps.</p>
                  {/* Step 1: BMI */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Step 1: BMI Score</label>
                    <select value={form.must_bmi} onChange={(e) => setForm(f => ({ ...f, must_bmi: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-amber-400 outline-none">
                      <option value="">-- Select BMI Range --</option>
                      {MUST_BMI.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  {/* Step 2: Weight Loss */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Step 2: Unplanned Weight Loss</label>
                    <select value={form.must_weight_loss} onChange={(e) => setForm(f => ({ ...f, must_weight_loss: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-amber-400 outline-none">
                      <option value="">-- Select Weight Loss --</option>
                      {MUST_WEIGHT.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  {/* Step 3: Acute Disease */}
                  <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={form.must_acute_disease}
                        onChange={() => setForm(f => ({ ...f, must_acute_disease: !f.must_acute_disease }))}
                        className="w-5 h-5 text-amber-600 border-gray-300 rounded focus:ring-amber-500" />
                      <div>
                        <span className="text-sm font-semibold text-gray-700">Step 3: Acute Disease Effect (Score +2)</span>
                        <p className="text-xs text-gray-500">Patient is acutely ill AND there has been or is likely to be no nutritional intake for &gt;5 days</p>
                      </div>
                    </label>
                  </div>
                  {/* MUST Result */}
                  <div className={`rounded p-3 ${mustR.color === 'green' ? 'bg-green-50' : mustR.color === 'amber' ? 'bg-amber-50' : 'bg-red-50'}`}>
                    <p className={`font-bold text-sm ${mustR.color === 'green' ? 'text-green-800' : mustR.color === 'amber' ? 'text-amber-800' : 'text-red-800'}`}>
                      Total MUST Score: {mustScore} — {mustR.level}
                    </p>
                    <p className="text-xs text-gray-700 mt-1">{mustR.action}</p>
                  </div>
                  {/* Meal Plan Button */}
                  {mustScore >= 1 && (
                    <div className="border-t border-amber-200 pt-3">
                      <button type="button" onClick={generateMealPlan} disabled={mealPlanLoading}
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-3 rounded-lg shadow transition disabled:opacity-50 flex items-center justify-center gap-2">
                        {mealPlanLoading ? (
                          <><svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Generating Meal Plan...</>
                        ) : (
                          <>🍲 Generate 7-Day Meal Plan (SE Nigeria)</>
                        )}
                      </button>
                      <p className="text-xs text-gray-500 mt-1 text-center">Based on Food Composition Table for Africa &amp; foods available in South-East Nigeria</p>

                      {mealPlan && (
                        <div className="mt-3">
                          <button type="button" onClick={() => setShowMealPlan(!showMealPlan)}
                            className="text-sm font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1">
                            <svg className={`w-4 h-4 transition-transform ${showMealPlan ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            {showMealPlan ? 'Hide' : 'View'} 7-Day Meal Plan
                          </button>
                          {showMealPlan && (
                            <div className="mt-2 space-y-3">
                              <div className="bg-amber-50 rounded p-2 text-xs text-amber-800">
                                <strong>Daily Target:</strong> ~{mealPlan.calorie_target} kcal | Protein: {mealPlan.protein_target}
                              </div>
                              {mealPlan.days.map((day, idx) => (
                                <div key={idx} className="border border-amber-100 rounded-lg overflow-hidden">
                                  <div className="bg-amber-100 px-3 py-2 font-semibold text-sm text-amber-900">{day.day}</div>
                                  <div className="p-3 space-y-2 text-sm">
                                    {[
                                      { time: '🌅 Breakfast', meal: day.breakfast },
                                      { time: '🍎 Mid-Morning', meal: day.mid_morning },
                                      { time: '☀️ Lunch', meal: day.lunch },
                                      { time: '🍌 Afternoon', meal: day.afternoon },
                                      { time: '🌙 Dinner', meal: day.dinner },
                                      { time: '😴 Bedtime', meal: day.bedtime },
                                    ].map(({ time, meal }) => meal && (
                                      <div key={time} className="flex gap-2">
                                        <span className="font-medium text-gray-600 w-28 shrink-0">{time}</span>
                                        <div>
                                          <span className="text-gray-800">{meal.meal}</span>
                                          <span className="text-xs text-gray-400 ml-2">({meal.calories} kcal, {meal.protein} protein)</span>
                                          {meal.notes && <p className="text-xs text-gray-500 italic">{meal.notes}</p>}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                              {mealPlan.supplements && (
                                <div className="bg-blue-50 rounded p-3 text-xs text-blue-800">
                                  <strong>Recommended Supplements:</strong> {mealPlan.supplements.join(', ')}
                                </div>
                              )}
                              {mealPlan.notes && (
                                <p className="text-xs text-gray-500 italic">{mealPlan.notes}</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Cardiovascular Risk — RCRI (Lee Index) ── */}
            <div className="border border-blue-200 rounded-lg overflow-hidden">
              <button type="button" onClick={() => togglePanel('rcri')}
                className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 hover:bg-blue-100 transition text-left">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-blue-900">❤️ Cardiovascular — RCRI (Lee Index)</span>
                  <span className="text-xs bg-white text-gray-500 px-2 py-0.5 rounded border">Score: {rcriScore}</span>
                  {scoreBadge(rcriR)}
                  {rcriR.pct && <span className="text-xs text-gray-400">{rcriR.pct}</span>}
                </div>
                <svg className={`w-5 h-5 text-blue-400 transition-transform ${expandedPanel === 'rcri' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {expandedPanel === 'rcri' && (
                <div className="p-4 space-y-3 bg-white">
                  <p className="text-xs text-gray-500 italic">Revised Cardiac Risk Index (Lee et al., 1999). 6 independent predictors of major cardiac events. Check all that apply.</p>
                  <div className="space-y-1">
                    {RCRI_ITEMS.map(i => (
                      <label key={i.key} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-blue-50 cursor-pointer">
                        <input type="checkbox" checked={!!form.rcri[i.key]} onChange={() => toggleScoreItem('rcri', i.key)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                        <span className="text-sm text-gray-700">{i.label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="bg-blue-50 rounded p-2 text-xs text-blue-800">
                    <strong>Interpretation:</strong> 0 = Very Low (~3.9%) | 1 = Low (~6%) | 2 = Moderate (~10.1%) | ≥3 = High (≥15%) risk of Major Adverse Cardiac Events (MACE).
                  </div>
                </div>
              )}
            </div>

            {/* ── Pressure Sore Risk — Waterlow Score ── */}
            <div className="border border-emerald-200 rounded-lg overflow-hidden">
              <button type="button" onClick={() => togglePanel('waterlow')}
                className="w-full flex items-center justify-between px-4 py-3 bg-emerald-50 hover:bg-emerald-100 transition text-left">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-emerald-900">🛏️ Pressure Sore — Waterlow Score</span>
                  <span className="text-xs bg-white text-gray-500 px-2 py-0.5 rounded border">Score: {wlScore}</span>
                  {scoreBadge(wlRisk)}
                </div>
                <svg className={`w-5 h-5 text-emerald-400 transition-transform ${expandedPanel === 'waterlow' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {expandedPanel === 'waterlow' && (
                <div className="p-4 space-y-3 bg-white">
                  <p className="text-xs text-gray-500 italic">Waterlow Pressure Ulcer Risk Assessment (Waterlow, 1985). Age/sex auto-calculated from Section 1.</p>
                  {form.age && form.gender && (
                    <div className="bg-gray-50 rounded p-2 text-xs text-gray-600">
                      Auto-scored: Gender ({form.gender} = {form.gender === 'Male' ? 1 : 2} pts) + Age ({form.age}y = {parseInt(form.age) >= 80 ? 5 : parseInt(form.age) >= 75 ? 4 : parseInt(form.age) >= 65 ? 3 : parseInt(form.age) >= 50 ? 2 : parseInt(form.age) >= 14 ? 1 : 0} pts)
                    </div>
                  )}
                  <div className="grid md:grid-cols-2 gap-3">
                    {wlSelect('wl_build', WL_BUILD, 'Build / Weight for Height')}
                    {wlSelect('wl_skin', WL_SKIN, 'Skin Type / Visual Risk')}
                    {wlSelect('wl_continence', WL_CONTINENCE, 'Continence')}
                    {wlSelect('wl_mobility', WL_MOBILITY, 'Mobility')}
                    {wlSelect('wl_appetite', WL_APPETITE, 'Appetite')}
                    {wlSelect('wl_neuro', WL_NEURO, 'Neurological Deficit')}
                    {wlSelect('wl_surgery', WL_SURGERY, 'Major Surgery / Trauma')}
                  </div>
                  {/* Tissue Malnutrition Risks */}
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Tissue Malnutrition (Special Risks):</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {WL_TISSUE.map(i => (
                        <label key={i.key} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={!!form.wl_tissue[i.key]} onChange={() => toggleScoreItem('wl_tissue', i.key)}
                            className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500" />
                          <span className="text-xs text-gray-700">{i.label} (+{i.p})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {/* Medication Risks */}
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Medication Risks:</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {WL_MEDS.map(i => (
                        <label key={i.key} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={!!form.wl_meds[i.key]} onChange={() => toggleScoreItem('wl_meds', i.key)}
                            className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500" />
                          <span className="text-xs text-gray-700">{i.label} (+{i.p})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="bg-emerald-50 rounded p-2 text-xs text-emerald-800">
                    <strong>Interpretation:</strong> &lt;10 = Not at risk | 10–14 = At risk | 15–19 = High risk | 20+ = Very high risk
                  </div>
                </div>
              )}
            </div>
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
            Date, Theatre & Team
          </h2>
          <div className="space-y-4 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Specialty *</label>
                <select name="specialty_id" value={form.specialty_id} onChange={handleChange} required
                  className="w-full border-2 border-amber-300 rounded-lg px-3 py-2.5 text-base text-gray-900 bg-white font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none cursor-pointer shadow-sm">
                  <option value="">— Select specialty —</option>
                  {specialties.map(sp => (
                    <option key={sp.id} value={sp.id}>{sp.name}</option>
                  ))}
                </select>
                {specialties.length === 0 && (
                  <p className="text-xs text-red-600 mt-1">No specialties yet — add them in Admin Settings.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Surgeon *</label>
                <select name="surgeon_id" value={form.surgeon_id} onChange={handleChange} required disabled={!form.specialty_id}
                  className="w-full border-2 border-amber-300 rounded-lg px-3 py-2.5 text-base text-gray-900 bg-white font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none cursor-pointer shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed">
                  <option value="">{form.specialty_id ? '— Select surgeon —' : 'Pick a specialty first'}</option>
                  {surgeons.map(su => (
                    <option key={su.id} value={su.id}>{su.full_name}</option>
                  ))}
                </select>
                {form.specialty_id && surgeons.length === 0 && (
                  <p className="text-xs text-red-600 mt-1">No surgeons listed for this specialty — add in Admin Settings.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Theatre *</label>
                <select name="theatre" value={form.theatre} onChange={handleChange} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-amber-500 outline-none">
                  <option value="">Select theatre…</option>
                  <option value="SMALL">Small Theatre</option>
                  <option value="LARGE">Large Theatre</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Surgery Class</label>
                <select name="surgery_class" value={form.surgery_class} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-amber-500 outline-none">
                  <option value="">Select class…</option>
                  <option value="MINOR">Minor</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="MAJOR">Major</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
                <select name="urgency" value={form.urgency} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-amber-500 outline-none">
                  <option value="ELECTIVE">Elective</option>
                  <option value="URGENT">Urgent</option>
                  <option value="EMERGENCY">Emergency</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slot Duration (hours)</label>
                <select name="slot_duration_hours" value={form.slot_duration_hours} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-amber-500 outline-none">
                  <option value="">Select…</option>
                  <option value="1">1 hour</option>
                  <option value="2">2 hours</option>
                  <option value="3">3 hours</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slot Start (date & time)</label>
                <input type="datetime-local" name="slot_start" value={form.slot_start} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-amber-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Surgery Date *</label>
                <input type="date" name="preferred_date" value={form.preferred_date} min={today} onChange={handleChange} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-amber-500 outline-none" />
              </div>
            </div>

            {form.preferred_date && form.theatre && (() => {
              const taken = dayBookings
                .filter(b => b.theatre === form.theatre && b.slot_start && b.slot_end)
                .filter(b => { const st = String(b.status || '').toLowerCase(); return !st || ['pending', 'confirmed'].includes(st) })
                .sort((a, b) => new Date(a.slot_start) - new Date(b.slot_start))
              if (taken.length === 0) {
                return (
                  <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                    ✓ No slots booked yet in the {form.theatre} Theatre on {form.preferred_date}. Pick any time.
                  </p>
                )
              }
              return (
                <div className="text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <div className="font-semibold text-amber-800 mb-1">Already booked in {form.theatre} Theatre on {form.preferred_date} (avoid these times):</div>
                  <ul className="flex flex-wrap gap-1.5">
                    {taken.map(b => {
                      const cs = new Date(b.slot_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      const ce = new Date(b.slot_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      return <li key={b.id} className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">{cs}–{ce}</li>
                    })}
                  </ul>
                </div>
              )
            })()}

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Patient Type *</label>
              <div className="grid grid-cols-2 gap-2 max-w-md">
                <label className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 cursor-pointer transition font-medium text-sm ${!form.is_daycase ? 'border-blue-500 bg-blue-50 text-blue-800 ring-2 ring-blue-200' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'}`}>
                  <input type="radio" name="is_daycase" checked={!form.is_daycase}
                    onChange={() => setForm(f => ({ ...f, is_daycase: false }))}
                    className="sr-only" />
                  🏥 In-patient
                  <span className="text-xs text-gray-500 hidden sm:inline">(admitted)</span>
                </label>
                <label className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 cursor-pointer transition font-medium text-sm ${form.is_daycase ? 'border-purple-500 bg-purple-50 text-purple-800 ring-2 ring-purple-200' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'}`}>
                  <input type="radio" name="is_daycase" checked={!!form.is_daycase}
                    onChange={() => setForm(f => ({ ...f, is_daycase: true }))}
                    className="sr-only" />
                  ☀️ Day-case
                  <span className="text-xs text-gray-500 hidden sm:inline">(same-day discharge)</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ward / Unit *</label>
                <input type="text" name="ward" value={form.ward} onChange={handleChange} required
                  placeholder="e.g. Surgical Ward A, Day-Case Unit"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-amber-500 outline-none" />
              </div>
              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="has_extra_assistant" checked={!!form.has_extra_assistant} onChange={handleChange}
                    className="w-5 h-5 text-amber-600 border-gray-300 rounded focus:ring-amber-500" />
                  <span className="text-sm font-medium text-gray-700">Extra assistant required</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Needed <span className="text-gray-400">(Optional)</span></label>
              <input type="text" name="equipment_needed" value={form.equipment_needed} onChange={handleChange}
                placeholder="e.g. C-arm, Microscope, Image intensifier"
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

          {/* Education Share Buttons — PDF Download + WhatsApp */}
          {(form.pre_op_education || form.post_op_education) && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-3">Share education material with patient:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button type="button" onClick={downloadEducationPdf} disabled={educationPdfLoading}
                  className="flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50">
                  {educationPdfLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      Generating PDF...
                    </>
                  ) : (
                    <>📥 Download PDF (A4)</>
                  )}
                </button>
                <button type="button" onClick={shareEducationWhatsApp}
                  className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-lg transition">
                  📱 Share on WhatsApp
                </button>
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
              <p>All risk assessments (Caprini DVT Score, MUST Nutritional Score, RCRI Cardiovascular Index, Waterlow Pressure Sore Score, Surgical Bleeding Risk Score) documented in this booking form are based on validated clinical tools. Final risk stratification will be confirmed by the surgical team on the day of surgery.</p>

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

              <p className="font-semibold mt-3 mb-1">9. Patient Education &amp; Nutritional Support</p>
              <p>Patient education material and nutritional meal plans provided through this platform are for informational purposes and are based on validated guidelines (MUST, West African Food Composition Table). They do not replace direct medical or dietetic consultation.</p>

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

        {/* ─── Save Draft + Confirm Booking ─── */}
        <div className="space-y-3">
          {/* Save Draft — always visible */}
          <button type="button" onClick={saveDraft}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-lg shadow-md transition flex items-center justify-center gap-2">
            {draftSaved ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Draft Saved!
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                Save Draft (Continue Later)
              </>
            )}
          </button>

          {/* Confirm Booking — only when complete */}
          {essentialComplete && acceptedTerms && (
            <button type="submit" disabled={loading}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-lg shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Confirming Surgery Booking...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Confirm Surgery Booking
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </main>
  )
}
