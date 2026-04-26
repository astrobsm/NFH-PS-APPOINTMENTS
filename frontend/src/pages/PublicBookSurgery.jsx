import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../utils/api'

export default function PublicBookSurgery() {
  const navigate = useNavigate()
  const [specialties, setSpecialties] = useState([])
  const [surgeons, setSurgeons] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)

  const [form, setForm] = useState({
    full_name: '',
    age: '',
    gender: '',
    procedure_name: '',
    diagnosis: '',
    specialty_id: '',
    surgeon_id: '',
    surgeon_name: '',
    theatre: '',
    surgery_class: '',
    slot_duration_hours: '',
    slot_start: '',
    preferred_date: '',
    urgency: 'ELECTIVE',
    has_extra_assistant: false,
    equipment_needed: '',
    ward: '',
    is_daycase: false,
    needs_blood: false,
    blood_units: '',
    anaesthesia_type: '',
    anaesthetist_name: '',
    notes: '',
  })

  // Existing bookings for the chosen surgery date — used to validate Small Theatre
  // (only available when the Large Theatre is booked at the same time).
  const [dayBookings, setDayBookings] = useState([])
  useEffect(() => {
    if (!form.preferred_date) { setDayBookings([]); return }
    api.getPublicSurgeries({ from: form.preferred_date, to: form.preferred_date })
      .then(setDayBookings).catch(() => setDayBookings([]))
  }, [form.preferred_date])

  useEffect(() => {
    api.getSpecialties().then(setSpecialties).catch(() => setSpecialties([]))
  }, [])

  useEffect(() => {
    if (!form.specialty_id) { setSurgeons([]); return }
    api.getSurgeons(form.specialty_id).then(setSurgeons).catch(() => setSurgeons([]))
    setForm(f => ({ ...f, surgeon_id: '', surgeon_name: '' }))
  }, [form.specialty_id])

  const change = (e) => {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
    setError('')
  }

  // When the user types/selects a surgeon name, try to match an existing surgeon
  const onSurgeonNameChange = (e) => {
    const name = e.target.value
    setError('')
    const match = surgeons.find(s => s.full_name.toLowerCase() === name.trim().toLowerCase())
    setForm(f => ({
      ...f,
      surgeon_name: name,
      surgeon_id: match ? String(match.id) : '',
    }))
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    const required = ['full_name', 'age', 'gender', 'procedure_name', 'preferred_date',
      'specialty_id', 'surgeon_name', 'theatre', 'ward', 'anaesthesia_type']
    for (const k of required) {
      if (!form[k]) { setError(`Please fill in: ${k.replace(/_/g, ' ')}`); return }
    }
    if (form.needs_blood && (!form.blood_units || parseInt(form.blood_units) < 1)) {
      setError('Please enter the number of blood units required'); return
    }

    // Combine time-only slot_start with the surgery date into an ISO datetime
    let slotIso = null
    if (form.slot_start) {
      const dt = new Date(`${form.preferred_date}T${form.slot_start}:00`)
      if (!isNaN(dt.getTime())) slotIso = dt.toISOString()
    }

    // Small Theatre availability rules
    if (form.theatre === 'SMALL') {
      if (!form.has_extra_assistant) {
        setError('Small Theatre is only available when the surgeon is bringing an external surgical assistant.')
        return
      }
      if (slotIso && form.slot_duration_hours) {
        const startMs = new Date(slotIso).getTime()
        const endMs = startMs + parseInt(form.slot_duration_hours) * 3600 * 1000
        const overlapsLarge = dayBookings.some(b => {
          if (b.theatre !== 'LARGE' || !b.slot_start || !b.slot_end) return false
          const bs = new Date(b.slot_start).getTime()
          const be = new Date(b.slot_end).getTime()
          return bs < endMs && be > startMs
        })
        if (!overlapsLarge) {
          setError('Small Theatre is only available when the Large Theatre is booked at the same time.')
          return
        }
        // Thursday 09:00–16:00 — Small Theatre is reserved for endoscopies
        const day = new Date(`${form.preferred_date}T00:00:00`).getDay() // 0=Sun, 4=Thu
        const [hh] = form.slot_start.split(':').map(Number)
        const inEndoWindow = day === 4 && hh >= 9 && hh < 16
        if (inEndoWindow) {
          const ok = window.confirm('On Thursdays 09:00–16:00 the Small Theatre is normally used for endoscopies. Booking it in this window requires confirmation from the scrub nurses. Submit anyway?')
          if (!ok) return
        }
      }
    }

    setLoading(true)
    try {
      // Resolve surgeon: if an exact match exists use it; otherwise upsert a new surgeon
      let surgeonId = form.surgeon_id
      const typedName = form.surgeon_name.trim()
      const match = surgeons.find(s => s.full_name.toLowerCase() === typedName.toLowerCase())
      if (match) {
        surgeonId = String(match.id)
      } else if (typedName.length >= 2) {
        try {
          const created = await api.upsertSurgeonPublic(typedName, parseInt(form.specialty_id))
          surgeonId = String(created.id)
          // Refresh the local list so the new surgeon appears in suggestions next time
          setSurgeons(prev => {
            if (prev.some(s => s.id === created.id)) return prev
            return [...prev, created].sort((a, b) => a.full_name.localeCompare(b.full_name))
          })
        } catch (err) {
          setError(err.message || 'Could not save surgeon name')
          setLoading(false)
          return
        }
      }

      const payload = {
        ...form,
        age: parseInt(form.age),
        slot_duration_hours: form.slot_duration_hours ? parseInt(form.slot_duration_hours) : null,
        specialty_id: form.specialty_id || null,
        surgeon_id: surgeonId || null,
        slot_start: slotIso,
        blood_units: form.needs_blood && form.blood_units ? parseInt(form.blood_units) : null,
        surgery_type: form.procedure_name,
      }
      delete payload.surgeon_name
      const result = await api.bookPublicSurgery(payload)
      setSuccess(result)
    } catch (err) {
      setError(err.message || 'Booking failed')
    } finally {
      setLoading(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Booking Submitted</h1>
          <p className="text-slate-600 mb-4">{success.message}</p>
          <div className="bg-slate-50 rounded-lg p-4 text-sm text-left mb-6 space-y-1">
            <div><strong>Reference:</strong> #{success.id}</div>
            <div><strong>Date:</strong> {success.preferred_date}</div>
            {success.theatre && <div><strong>Theatre:</strong> {success.theatre}</div>}
            <div><strong>Status:</strong> <span className="text-amber-700">{success.status}</span></div>
          </div>
          <div className="flex flex-col gap-2">
            <Link to="/theatre" className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium">
              View Public Registry
            </Link>
            <button onClick={() => { setSuccess(null); setForm(f => ({ ...f, full_name: '', procedure_name: '', notes: '' })) }}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium">
              Book Another
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Book a Surgery</h1>
            <p className="text-sm text-slate-600 mt-1">Public booking — no login required. Subject to confirmation.</p>
          </div>
          <Link to="/theatre" className="text-sm text-amber-700 hover:underline">← Back to Registry</Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>
        )}

        <form onSubmit={submit} className="space-y-6">
          {/* Patient */}
          <section className="bg-white rounded-xl shadow p-6">
            <h2 className="font-semibold text-slate-800 mb-4">Patient Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                <input name="full_name" value={form.full_name} onChange={change} required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Age *</label>
                <input type="number" min="0" name="age" value={form.age} onChange={change} required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Gender *</label>
                <select name="gender" value={form.gender} onChange={change} required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white">
                  <option value="">Select…</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </section>

          {/* Procedure */}
          <section className="bg-white rounded-xl shadow p-6">
            <h2 className="font-semibold text-slate-800 mb-4">Procedure</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1">Specialty *</label>
                  <select name="specialty_id" value={form.specialty_id} onChange={change} required
                    className="w-full border-2 border-amber-300 rounded-lg px-3 py-2.5 text-base text-slate-900 bg-white font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none cursor-pointer shadow-sm">
                    <option value="">— Select specialty —</option>
                    {specialties.map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                  </select>
                  {specialties.length === 0 && (
                    <p className="text-xs text-red-600 mt-1">No specialties available yet.</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1">Surgeon *</label>
                  <input
                    name="surgeon_name"
                    value={form.surgeon_name}
                    onChange={onSurgeonNameChange}
                    required
                    disabled={!form.specialty_id}
                    list="surgeon-suggestions"
                    autoComplete="off"
                    placeholder={form.specialty_id ? 'Type or pick surgeon’s name…' : 'Pick a specialty first'}
                    className="w-full border-2 border-amber-300 rounded-lg px-3 py-2.5 text-base text-slate-900 bg-white font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none shadow-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                  <datalist id="surgeon-suggestions">
                    {surgeons.map(su => <option key={su.id} value={su.full_name} />)}
                  </datalist>
                  {form.specialty_id && (
                    form.surgeon_id
                      ? <p className="text-xs text-emerald-700 mt-1">✓ Existing surgeon selected.</p>
                      : form.surgeon_name.trim().length >= 2
                        ? <p className="text-xs text-blue-700 mt-1">New surgeon — will be saved on submit and reusable next time.</p>
                        : <p className="text-xs text-slate-500 mt-1">Start typing — pick from suggestions or enter a new name.</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Procedure Name *</label>
                <input name="procedure_name" value={form.procedure_name} onChange={change} required
                  placeholder="e.g. Inguinal hernia repair"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Diagnosis</label>
                <input name="diagnosis" value={form.diagnosis} onChange={change}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2" />
              </div>
            </div>
          </section>

          {/* Scheduling */}
          <section className="bg-white rounded-xl shadow p-6">
            <h2 className="font-semibold text-slate-800 mb-4">Theatre & Schedule</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Theatre *</label>
                  <select name="theatre" value={form.theatre} onChange={change} required
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white">
                    <option value="">Select…</option>
                    <option value="SMALL">Small Theatre</option>
                    <option value="LARGE">Large Theatre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
                  <select name="surgery_class" value={form.surgery_class} onChange={change}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white">
                    <option value="">Select…</option>
                    <option value="MINOR">Minor</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="MAJOR">Major</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Urgency</label>
                  <select name="urgency" value={form.urgency} onChange={change}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white">
                    <option value="ELECTIVE">Elective</option>
                    <option value="URGENT">Urgent</option>
                    <option value="EMERGENCY">Emergency</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Slot Duration</label>
                  <select name="slot_duration_hours" value={form.slot_duration_hours} onChange={change}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white">
                    <option value="">Select…</option>
                    <option value="1">1 hour</option>
                    <option value="2">2 hours</option>
                    <option value="3">3 hours</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Slot Start</label>
                  <input type="time" name="slot_start" value={form.slot_start} onChange={change}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Surgery Date *</label>
                  <input type="date" name="preferred_date" min={today} value={form.preferred_date} onChange={change} required
                    className="w-full border border-slate-300 rounded-lg px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">Patient Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 cursor-pointer transition font-medium text-sm ${!form.is_daycase ? 'border-blue-500 bg-blue-50 text-blue-800 ring-2 ring-blue-200' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}>
                    <input type="radio" name="is_daycase" checked={!form.is_daycase}
                      onChange={() => setForm(f => ({ ...f, is_daycase: false }))}
                      className="sr-only" />
                    🏥 In-patient
                    <span className="text-xs text-slate-500 hidden sm:inline">(admitted)</span>
                  </label>
                  <label className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 cursor-pointer transition font-medium text-sm ${form.is_daycase ? 'border-purple-500 bg-purple-50 text-purple-800 ring-2 ring-purple-200' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}>
                    <input type="radio" name="is_daycase" checked={!!form.is_daycase}
                      onChange={() => setForm(f => ({ ...f, is_daycase: true }))}
                      className="sr-only" />
                    ☀️ Day-case
                    <span className="text-xs text-slate-500 hidden sm:inline">(same-day)</span>
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ward / Unit *</label>
                  <input name="ward" value={form.ward} onChange={change} required
                    placeholder="e.g. Surgical Ward A, Day-Case Unit"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2" />
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="has_extra_assistant" checked={!!form.has_extra_assistant} onChange={change}
                      className="w-5 h-5 text-amber-600 border-slate-300 rounded" />
                    <span className="text-sm font-medium text-slate-700">I have external surgical assistant</span>
                  </label>
                </div>
              </div>
              {form.theatre === 'SMALL' && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg p-3">
                  <strong>Note:</strong> Small Theatre is only available when the Large Theatre is booked at the same time and the surgeon is bringing an external surgical assistant.
                  On Thursdays 09:00–16:00 it is reserved for endoscopies — bookings in that window require confirmation from the scrub nurses.
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Anaesthesia Type *</label>
                <select name="anaesthesia_type" value={form.anaesthesia_type} onChange={change} required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white">
                  <option value="">Select…</option>
                  <option value="General Anaesthesia">General Anaesthesia</option>
                  <option value="Regional – Spinal">Regional – Spinal</option>
                  <option value="Regional – Epidural">Regional – Epidural</option>
                  <option value="Local Anaesthesia">Local Anaesthesia</option>
                  <option value="Sedation">Sedation</option>
                  <option value="Combined">Combined</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name of Anaesthetist</label>
                <input name="anaesthetist_name" value={form.anaesthetist_name} onChange={change}
                  placeholder="e.g. Dr. Adaeze Okafor"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="needs_blood" checked={!!form.needs_blood} onChange={change}
                      className="w-5 h-5 text-red-600 border-slate-300 rounded" />
                    <span className="text-sm font-medium text-slate-700">Need for blood</span>
                  </label>
                </div>
                {form.needs_blood && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Number of units *</label>
                    <input type="number" min="1" name="blood_units" value={form.blood_units} onChange={change}
                      placeholder="e.g. 2"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2" />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Special Equipments and Consumables Needed</label>
                <input name="equipment_needed" value={form.equipment_needed} onChange={change}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea name="notes" rows={3} value={form.notes} onChange={change}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2" />
              </div>
            </div>
          </section>

          <button type="submit" disabled={loading}
            className="w-full px-4 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-60 font-semibold shadow">
            {loading ? 'Submitting…' : 'Submit Booking Request'}
          </button>
        </form>
      </div>
    </div>
  )
}
