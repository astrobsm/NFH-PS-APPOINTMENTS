import { useLocation, Link, Navigate } from 'react-router-dom'

export default function WardRoundConfirmation() {
  const location = useLocation()
  const round = location.state?.wardRound

  if (!round) {
    return <Navigate to="/book-ward-round" replace />
  }

  const procedures = Array.isArray(round.planned_procedures)
    ? round.planned_procedures
    : JSON.parse(round.planned_procedures || '[]')

  return (
    <main className="max-w-lg mx-auto px-4 py-12 relative z-10">
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Ward Round Scheduled!</h1>
        <p className="text-gray-500 mb-6">The ward round has been added to the schedule successfully.</p>

        <div className="text-left bg-gray-50 rounded-lg p-4 space-y-3 mb-6">
          <div className="flex justify-between border-b border-gray-200 pb-2">
            <span className="text-gray-500 text-sm">Reference #</span>
            <span className="font-semibold text-blue-700">{round.id}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 pb-2">
            <span className="text-gray-500 text-sm">Patient</span>
            <span className="font-semibold">{round.full_name}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 pb-2">
            <span className="text-gray-500 text-sm">Ward</span>
            <span className="font-semibold">{round.ward}{round.bed_number ? ` — Bed ${round.bed_number}` : ''}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 pb-2">
            <span className="text-gray-500 text-sm">Round Date</span>
            <span className="font-semibold">{round.round_date}</span>
          </div>
          {round.round_time && (
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="text-gray-500 text-sm">Round Time</span>
              <span className="font-semibold">{round.round_time}</span>
            </div>
          )}
          {round.attending_doctor && (
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="text-gray-500 text-sm">Attending Doctor</span>
              <span className="font-semibold">{round.attending_doctor}</span>
            </div>
          )}
          <div className="border-b border-gray-200 pb-2">
            <span className="text-gray-500 text-sm block mb-1">Planned Procedures</span>
            <div className="flex flex-wrap gap-1">
              {procedures.map((proc, i) => (
                <span key={i} className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full text-xs font-medium">
                  {proc}
                </span>
              ))}
            </div>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 text-sm">Status</span>
            <span className="font-semibold text-blue-600 capitalize">{round.status}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/book-ward-round"
            className="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-6 py-2 rounded-lg shadow-md transition"
          >
            Schedule Another
          </Link>
          <Link
            to="/admin/ward-rounds"
            className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-6 py-2 rounded-lg shadow-md transition"
          >
            View All Ward Rounds
          </Link>
          <Link
            to="/"
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-6 py-2 rounded-lg shadow-md transition"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  )
}
