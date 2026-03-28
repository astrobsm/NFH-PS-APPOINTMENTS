import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import OfflineIndicator from './components/OfflineIndicator'
import Home from './pages/Home'
import BookAppointment from './pages/BookAppointment'
import Confirmation from './pages/Confirmation'
import BookSurgery from './pages/BookSurgery'
import SurgeryConfirmation from './pages/SurgeryConfirmation'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import AdminSettings from './pages/AdminSettings'
import SurgeryDashboard from './pages/SurgeryDashboard'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 watermark-bg">
      <Header />
      <OfflineIndicator />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/book" element={<BookAppointment />} />
        <Route path="/confirmation" element={<Confirmation />} />
        <Route path="/book-surgery" element={<BookSurgery />} />
        <Route path="/surgery-confirmation" element={<SurgeryConfirmation />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/surgeries" element={<SurgeryDashboard />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
      </Routes>
    </div>
  )
}
