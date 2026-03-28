import { useLocation, Link, Navigate } from 'react-router-dom'

export default function SurgeryConfirmation() {
  const location = useLocation()
  const surgery = location.state?.surgery

  if (!surgery) {
    return <Navigate to="/book-surgery" replace />
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-12 relative z-10">
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Surgery Booking Submitted!</h1>
        <p className="text-gray-500 mb-6">Your surgery request has been received. The surgical team will contact you to confirm the date and provide further instructions.</p>

        {surgery._offline && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-4 py-3 mb-4 text-sm">
            <strong>Offline Booking:</strong> This booking has been saved locally and will be automatically synced to the server when your internet connection is restored.
          </div>
        )}

        <div className="text-left bg-gray-50 rounded-lg p-4 space-y-3 mb-6">
          <div className="flex justify-between border-b border-gray-200 pb-2">
            <span className="text-gray-500 text-sm">Reference #</span>
            <span className="font-semibold text-blue-700">{surgery.id}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 pb-2">
            <span className="text-gray-500 text-sm">Patient</span>
            <span className="font-semibold">{surgery.full_name}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 pb-2">
            <span className="text-gray-500 text-sm">Surgery Type</span>
            <span className="font-semibold">{surgery.surgery_type}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 pb-2">
            <span className="text-gray-500 text-sm">Preferred Date</span>
            <span className="font-semibold">{surgery.preferred_date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 text-sm">Status</span>
            <span className="font-semibold text-amber-600 capitalize">{surgery.status}</span>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-4 mb-4 text-left">
          <h3 className="text-sm font-bold text-blue-800 mb-2">IMPORTANT NOTICE:</h3>
          <p className="text-sm text-blue-700 leading-relaxed">
            Please arrive at least <strong>ONE (1) HOUR</strong> before your scheduled appointment time to enable you to:
          </p>
          <ul className="text-sm text-blue-700 mt-2 list-disc ml-5 space-y-1">
            <li>Get your vital signs taken</li>
            <li>Pay consultation fees</li>
            <li>Confirm the availability of wound care materials (for those who need wound care service)</li>
          </ul>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          You will receive a WhatsApp message or call to confirm your surgery date and pre-operative instructions.
        </p>

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
