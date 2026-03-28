import { Link } from 'react-router-dom'

export default function Home() {
  const isAdmin = !!localStorage.getItem('admin_token')

  return (
    <main className="max-w-4xl mx-auto px-4 py-12 relative z-10">
      <div className="text-center mb-12">
        <img src="/NFH-LOGO.webp" alt="Niger Foundation Hospital Logo" className="w-24 h-24 mx-auto mb-4 object-contain" />
        <h1 className="text-3xl font-bold text-blue-800 mb-1">
          Niger Foundation Hospital, Enugu
        </h1>
        <h2 className="text-xl font-semibold text-blue-600 mb-4">
          Schedule PS-Consultation
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Book your plastic surgery/ woundcare clinic consultation appointment easily. Select a date, choose your visit type, and pick an available time slot.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-600">
          <h3 className="font-semibold text-blue-800 mb-2">Wound Care Consultation</h3>
          <p className="text-gray-600 text-sm mb-2">Duration: 30 minutes</p>
          <p className="text-gray-500 text-sm">
            Comprehensive wound assessment, treatment planning, and dressing.
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-teal-500">
          <h3 className="font-semibold text-teal-700 mb-2">Non-Wound Care Consultation</h3>
          <p className="text-gray-600 text-sm mb-2">Duration: 20 minutes</p>
          <p className="text-gray-500 text-sm">
            General consultation for non-wound related concerns.
          </p>
        </div>
      </div>

      {/* Surgery Booking Section - Admin Only */}
      {isAdmin && <div className="bg-white rounded-xl shadow-md p-8 mb-8 border-l-4 border-purple-600">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-purple-800 mb-2">Surgery Booking</h2>
            <p className="text-gray-600 mb-4">
              Need a surgical procedure? Submit a surgery booking request for procedures including wound debridement, skin grafting, scar revision, burn reconstruction, and more. Our surgical team will review your request and contact you to confirm the date.
            </p>
            <Link
              to="/book-surgery"
              className="inline-block bg-purple-700 hover:bg-purple-800 text-white font-semibold px-6 py-2 rounded-lg shadow-md transition transform hover:scale-105"
            >
              Book a Surgery
            </Link>
          </div>
        </div>
      </div>}

      <div className="bg-white rounded-xl shadow-md p-8 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Clinic Hours</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500">Morning Session</p>
            <p className="text-lg font-semibold text-blue-800">9:00 AM &ndash; 1:00 PM</p>
          </div>
          <div className="bg-gray-100 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500">Break</p>
            <p className="text-lg font-semibold text-gray-500">1:00 PM &ndash; 1:30 PM</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500">Afternoon Session</p>
            <p className="text-lg font-semibold text-blue-800">1:30 PM &ndash; 5:00 PM</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-8 mb-8 border-l-4 border-green-600">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-green-800 mb-2">QR Code for Patients</h2>
            <p className="text-gray-600 mb-4">
              Print or share the QR code with patients so they can easily scan and book their appointments. Includes step-by-step booking instructions.
            </p>
            <Link
              to="/qr-code"
              className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-lg shadow-md transition transform hover:scale-105"
            >
              View QR Code & Instructions
            </Link>
          </div>
        </div>
      </div>

      <div className="text-center flex flex-wrap justify-center gap-4">
        <Link
          to="/book"
          className="inline-block bg-blue-700 hover:bg-blue-800 text-white font-semibold px-8 py-3 rounded-lg shadow-md transition transform hover:scale-105"
        >
          Book an Appointment
        </Link>
        {isAdmin && (
          <Link
            to="/book-surgery"
            className="inline-block bg-purple-700 hover:bg-purple-800 text-white font-semibold px-8 py-3 rounded-lg shadow-md transition transform hover:scale-105"
          >
            Book a Surgery
          </Link>
        )}
      </div>
    </main>
  )
}
