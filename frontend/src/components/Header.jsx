import { Link, useLocation } from 'react-router-dom'

export default function Header() {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')

  return (
    <header className="bg-blue-800 text-white shadow-lg">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src="/NFH-LOGO.webp" alt="NFH Logo" className="w-10 h-10 rounded-full bg-white object-contain" />
          <div className="leading-tight">
            <span className="text-lg font-bold tracking-tight block">PS-Consultation</span>
            <span className="text-[10px] text-blue-200 block">Niger Foundation Hospital, Enugu</span>
          </div>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {isAdmin ? (
            <>
              <Link to="/admin/dashboard" className="hover:text-blue-200 transition">Appointments</Link>
              <Link to="/admin/surgeries" className="hover:text-blue-200 transition">Surgeries</Link>
              <Link to="/admin/settings" className="hover:text-blue-200 transition">Settings</Link>
              <button
                onClick={() => { localStorage.removeItem('admin_token'); window.location.href = '/' }}
                className="hover:text-blue-200 transition"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/" className="hover:text-blue-200 transition">Home</Link>
              <Link to="/book" className="hover:text-blue-200 transition">Book Visit</Link>
              <Link to="/book-surgery" className="hover:text-blue-200 transition">Book Surgery</Link>
              <Link to="/admin" className="text-blue-300 hover:text-white transition text-xs opacity-75">Admin</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
