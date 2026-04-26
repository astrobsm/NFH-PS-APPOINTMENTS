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
import BookWardRound from './pages/BookWardRound'
import WardRoundConfirmation from './pages/WardRoundConfirmation'
import WardRoundDashboard from './pages/WardRoundDashboard'
import QRCodePage from './pages/QRCodePage'
import PublicTheatreRegistry from './pages/PublicTheatreRegistry'
import PublicBookSurgery from './pages/PublicBookSurgery'
import TheatrePortal from './pages/TheatrePortal'

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
        <Route path="/qr-code" element={<QRCodePage />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/surgeries" element={<SurgeryDashboard />} />
        <Route path="/book-ward-round" element={<BookWardRound />} />
        <Route path="/ward-round-confirmation" element={<WardRoundConfirmation />} />
        <Route path="/admin/ward-rounds" element={<WardRoundDashboard />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
        {/* Public theatre booking & registry (no login) */}
        <Route path="/theatre/portal" element={<TheatrePortal />} />
        <Route path="/theatre" element={<PublicTheatreRegistry />} />
        <Route path="/theatre/book" element={<PublicBookSurgery />} />
      </Routes>
    </div>
  )
}
