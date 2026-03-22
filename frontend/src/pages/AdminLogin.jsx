import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSetup, setIsSetup] = useState(false)
  const [setupDone, setSetupDone] = useState(true)

  useEffect(() => {
    api.getSetupStatus().then(({ is_configured }) => {
      setSetupDone(is_configured)
      if (!is_configured) setIsSetup(true)
    }).catch(() => {})

    const token = localStorage.getItem('admin_token')
    if (token) navigate('/admin/dashboard', { replace: true })
  }, [navigate])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { access_token } = await api.adminLogin(password)
      localStorage.setItem('admin_token', access_token)
      navigate('/admin/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSetup = async (e) => {
    e.preventDefault()
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    setError('')
    try {
      await api.setup({ password })
      setSetupDone(true)
      setIsSetup(false)
      setPassword('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const needsSetup = isSetup && !setupDone

  return (
    <main className="max-w-sm mx-auto px-4 py-16 relative z-10">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-800">
            {needsSetup ? 'Admin Setup' : 'Admin Login'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {needsSetup
              ? 'Create your admin password to get started'
              : 'Enter your password to access the dashboard'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={needsSetup ? handleSetup : handleLogin}>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError('') }}
            placeholder={needsSetup ? 'Create admin password (min 6 chars)' : 'Enter admin password'}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Please wait...' : (needsSetup ? 'Create Admin Account' : 'Login')}
          </button>
        </form>
      </div>
    </main>
  )
}
