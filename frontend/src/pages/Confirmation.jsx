import { useLocation, Link, Navigate } from 'react-router-dom'

export default function Confirmation() {
  const location = useLocation()
  const appointment = location.state?.appointment

  if (!appointment) {
    return <Navigate to="/book" replace />
  }

  const visitTypeLabel = appointment.visit_type === 'wound_care' ? 'Wound Care' : 'Non-Wound Care'
  const categoryLabel = appointment.visit_category === 'first_time' ? 'First Time' : 'Follow-up'

  return (
    <main className="max-w-lg mx-auto px-4 py-12 relative z-10">
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Appointment Confirmed!</h1>
        <p className="text-gray-500 mb-6">Your consultation has been scheduled successfully.</p>

        <div className="text-left bg-gray-50 rounded-lg p-4 space-y-3 mb-6">
          <div className="flex justify-between border-b border-gray-200 pb-2">
            <span className="text-gray-500 text-sm">Reference #</span>
            <span className="font-semibold text-blue-700">{appointment.id}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 pb-2">
            <span className="text-gray-500 text-sm">Patient</span>
            <span className="font-semibold">{appointment.full_name}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 pb-2">
            <span className="text-gray-500 text-sm">Date</span>
            <span className="font-semibold">{appointment.appointment_date}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 pb-2">
            <span className="text-gray-500 text-sm">Time</span>
            <span className="font-semibold">
              {appointment.start_time?.slice(0, 5)} &ndash; {appointment.end_time?.slice(0, 5)}
            </span>
          </div>
          <div className="flex justify-between border-b border-gray-200 pb-2">
            <span className="text-gray-500 text-sm">Visit Type</span>
            <span className="font-semibold">{visitTypeLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 text-sm">Category</span>
            <span className="font-semibold">{categoryLabel}</span>
          </div>
        </div>

        <Link
          to="/"
          className="inline-block bg-blue-700 hover:bg-blue-800 text-white font-semibold px-6 py-2 rounded-lg transition"
        >
          Back to Home
        </Link>
      </div>
    </main>
  )
}
