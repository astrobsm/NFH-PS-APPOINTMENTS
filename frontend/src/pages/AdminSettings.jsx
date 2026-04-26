import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function AdminSettings() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [newPassword, setNewPassword] = useState('')

  // Master data: specialties & surgeons
  const [specialties, setSpecialties] = useState([])
  const [surgeons, setSurgeons] = useState([])
  const [newSpecialty, setNewSpecialty] = useState('')
  const [newSurgeon, setNewSurgeon] = useState({ full_name: '', specialty_id: '' })
  const [mdError, setMdError] = useState('')

  const loadMasterData = async () => {
    try {
      const [sp, su] = await Promise.all([api.getSpecialties(), api.getSurgeons()])
      setSpecialties(sp || [])
      setSurgeons(su || [])
    } catch (e) {
      setMdError(e.message || 'Failed to load master data')
    }
  }

  useEffect(() => { loadMasterData() }, [])

  const addSpecialty = async () => {
    setMdError('')
    if (!newSpecialty.trim()) { setMdError('Specialty name required'); return }
    try {
      await api.createSpecialty(newSpecialty.trim())
      setNewSpecialty('')
      loadMasterData()
    } catch (e) { setMdError(e.message) }
  }

  const removeSpecialty = async (id) => {
    if (!window.confirm('Delete this specialty? All linked surgeons will also be removed.')) return
    try { await api.deleteSpecialty(id); loadMasterData() }
    catch (e) { setMdError(e.message) }
  }

  const addSurgeon = async () => {
    setMdError('')
    if (!newSurgeon.full_name.trim() || !newSurgeon.specialty_id) {
      setMdError('Surgeon name and specialty are required'); return
    }
    try {
      await api.createSurgeon(newSurgeon.full_name.trim(), parseInt(newSurgeon.specialty_id))
      setNewSurgeon({ full_name: '', specialty_id: '' })
      loadMasterData()
    } catch (e) { setMdError(e.message) }
  }

  const removeSurgeon = async (id) => {
    if (!window.confirm('Delete this surgeon?')) return
    try { await api.deleteSurgeon(id); loadMasterData() }
    catch (e) { setMdError(e.message) }
  }

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      navigate('/admin', { replace: true })
      return
    }

    api.getSettings()
      .then(data => {
        // Normalize time strings to HH:MM
        setSettings({
          ...data,
          morning_start: data.morning_start?.slice(0, 5) || '09:00',
          morning_end: data.morning_end?.slice(0, 5) || '13:00',
          afternoon_start: data.afternoon_start?.slice(0, 5) || '13:30',
          afternoon_end: data.afternoon_end?.slice(0, 5) || '17:00',
        })
      })
      .catch(err => {
        if (err.message.includes('expired') || err.message.includes('Invalid')) {
          localStorage.removeItem('admin_token')
          navigate('/admin', { replace: true })
          return
        }
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [navigate])

  const toggleDay = (day) => {
    if (!settings) return
    const days = settings.clinic_days.includes(day)
      ? settings.clinic_days.filter(d => d !== day)
      : [...settings.clinic_days, day]
    setSettings({ ...settings, clinic_days: days })
  }

  const handleTimeChange = (field, value) => {
    setSettings({ ...settings, [field]: value })
  }

  const handleSave = async () => {
    if (settings.clinic_days.length === 0) {
      setError('Please select at least one clinic day')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const data = {
        clinic_days: settings.clinic_days,
        morning_start: settings.morning_start + ':00',
        morning_end: settings.morning_end + ':00',
        afternoon_start: settings.afternoon_start + ':00',
        afternoon_end: settings.afternoon_end + ':00',
      }
      if (newPassword) {
        if (newPassword.length < 6) {
          setError('Password must be at least 6 characters')
          setSaving(false)
          return
        }
        data.new_password = newPassword
      }
      await api.updateSettings(data)
      setSuccess('Settings saved successfully!')
      setNewPassword('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-8 text-center text-gray-500">
        Loading settings...
      </main>
    )
  }

  if (!settings) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-8 text-center text-red-500">
        {error || 'Failed to load settings'}
      </main>
    )
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 relative z-10">
      <h1 className="text-2xl font-bold text-blue-800 mb-6">Clinic Settings</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">{success}</div>
      )}

      {/* Clinic Days */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h2 className="font-semibold text-gray-800 mb-4">Clinic Days</h2>
        <p className="text-sm text-gray-500 mb-3">Select the days your clinic is open for appointments.</p>
        <div className="flex flex-wrap gap-2">
          {ALL_DAYS.map(day => (
            <button
              key={day}
              onClick={() => toggleDay(day)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                settings.clinic_days.includes(day)
                  ? 'bg-blue-700 text-white border-blue-700'
                  : 'bg-white text-gray-500 border-gray-300 hover:border-blue-400'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      {/* Clinic Hours */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h2 className="font-semibold text-gray-800 mb-4">Clinic Hours</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Morning Start</label>
            <input
              type="time"
              value={settings.morning_start}
              onChange={(e) => handleTimeChange('morning_start', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Morning End (Break Start)</label>
            <input
              type="time"
              value={settings.morning_end}
              onChange={(e) => handleTimeChange('morning_end', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Afternoon Start (After Break)</label>
            <input
              type="time"
              value={settings.afternoon_start}
              onChange={(e) => handleTimeChange('afternoon_start', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Afternoon End</label>
            <input
              type="time"
              value={settings.afternoon_end}
              onChange={(e) => handleTimeChange('afternoon_end', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Specialties & Surgeons */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h2 className="font-semibold text-gray-800 mb-4">Specialties & Surgeons</h2>
        {mdError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-3 text-sm">{mdError}</div>
        )}

        {/* Specialties */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Specialties</h3>
          <div className="flex gap-2 mb-3">
            <input type="text" value={newSpecialty} onChange={(e) => setNewSpecialty(e.target.value)}
              placeholder="e.g. Orthopaedics"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2" />
            <button onClick={addSpecialty} type="button"
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-medium">
              Add
            </button>
          </div>
          {specialties.length === 0 ? (
            <p className="text-xs text-gray-500">No specialties yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
              {specialties.map(sp => (
                <li key={sp.id} className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm text-gray-800">{sp.name}</span>
                  <button onClick={() => removeSpecialty(sp.id)} type="button"
                    className="text-xs text-red-600 hover:underline">Delete</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Surgeons */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Surgeons</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
            <input type="text" value={newSurgeon.full_name}
              onChange={(e) => setNewSurgeon({ ...newSurgeon, full_name: e.target.value })}
              placeholder="Surgeon full name"
              className="md:col-span-1 border border-gray-300 rounded-lg px-3 py-2" />
            <select value={newSurgeon.specialty_id}
              onChange={(e) => setNewSurgeon({ ...newSurgeon, specialty_id: e.target.value })}
              className="md:col-span-1 border border-gray-300 rounded-lg px-3 py-2 bg-white">
              <option value="">Select specialty…</option>
              {specialties.map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
            </select>
            <button onClick={addSurgeon} type="button"
              className="md:col-span-1 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-medium">
              Add Surgeon
            </button>
          </div>
          {surgeons.length === 0 ? (
            <p className="text-xs text-gray-500">No surgeons yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
              {surgeons.map(su => {
                const sp = specialties.find(s => s.id === su.specialty_id)
                return (
                  <li key={su.id} className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm text-gray-800">
                      {su.full_name}
                      <span className="text-xs text-gray-500 ml-2">({sp ? sp.name : 'unknown specialty'})</span>
                    </span>
                    <button onClick={() => removeSurgeon(su.id)} type="button"
                      className="text-xs text-red-600 hover:underline">Delete</button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h2 className="font-semibold text-gray-800 mb-4">Change Admin Password</h2>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Leave blank to keep current password"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-lg shadow-md transition disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </main>
  )
}
