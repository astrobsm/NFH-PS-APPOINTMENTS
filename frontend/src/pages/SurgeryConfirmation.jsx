import { useLocation, Link, Navigate } from 'react-router-dom'
import { useState } from 'react'
import { api } from '../utils/api'

export default function SurgeryConfirmation() {
  const location = useLocation()
  const surgery = location.state?.surgery
  const [pdfLoading, setPdfLoading] = useState(false)

  if (!surgery) {
    return <Navigate to="/book-surgery" replace />
  }

  const plan = surgery.pre_op_planning || {}
  const inv = surgery.investigations || {}
  const req = surgery.requirements || {}
  const readiness = surgery.readiness_checklist || {}

  const downloadPdf = async () => {
    if (surgery._offline) return
    setPdfLoading(true)
    try {
      const result = await api.getSurgeryPdf(surgery.id)
      const url = URL.createObjectURL(result.blob)
      const a = document.createElement('a')
      a.href = url
      a.download = result.filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Failed to generate PDF: ' + err.message)
    } finally {
      setPdfLoading(false)
    }
  }

  const shareWhatsApp = () => {
    const phone = surgery.phone_number ? surgery.phone_number.replace(/[^0-9]/g, '') : ''
    const text = encodeURIComponent(
      `*NIGER FOUNDATION HOSPITAL – SURGERY BOOKING*\n\n` +
      `Ref: NFH-SRG-${String(surgery.id).padStart(4, '0')}\n` +
      `Patient: ${surgery.full_name}\n` +
      `Procedure: ${surgery.procedure_name || surgery.surgery_type}\n` +
      `Diagnosis: ${plan.diagnosis || surgery.diagnosis || 'N/A'}\n` +
      `Preferred Date: ${surgery.preferred_date}\n` +
      `Status: ${(surgery.status || 'pending').toUpperCase()}\n\n` +
      `Anaesthesia: ${req.anaesthesia_type || 'TBD'}\n` +
      (req.tourniquet ? `Tourniquet: Yes\n` : '') +
      (req.diathermy ? `Diathermy: ${req.diathermy_type || 'Yes'}\n` : '') +
      `\nPlease arrive at least 1 hour before the scheduled time.\n` +
      `Niger Foundation Hospital, Enugu – Plastic Surgery Unit`
    )
    const url = phone
      ? `https://wa.me/${phone}?text=${text}`
      : `https://wa.me/?text=${text}`
    window.open(url, '_blank')
  }

  const riskBadge = (level) => {
    if (!level) return null
    const colors = {
      'Low Risk': 'bg-green-100 text-green-700',
      'Very Low Risk': 'bg-green-100 text-green-700',
      'Not at Risk': 'bg-green-100 text-green-700',
      'Medium Risk': 'bg-amber-100 text-amber-700',
      'Moderate Risk': 'bg-amber-100 text-amber-700',
      'At Risk': 'bg-amber-100 text-amber-700',
      'High Risk': 'bg-orange-100 text-orange-700',
      'Highest Risk': 'bg-red-100 text-red-700',
      'Very High Risk': 'bg-red-100 text-red-700',
      // Legacy support
      'Low': 'bg-green-100 text-green-700',
      'Moderate': 'bg-amber-100 text-amber-700',
      'High': 'bg-red-100 text-red-700',
    }
    return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${colors[level] || 'bg-gray-100 text-gray-600'}`}>{level}</span>
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 relative z-10">
      <div className="bg-white rounded-xl shadow-lg p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Surgery Booking Submitted!</h1>
          <p className="text-gray-500 text-sm">Reference: <span className="font-bold text-blue-700">NFH-SRG-{String(surgery.id).padStart(4, '0')}</span></p>
        </div>

        {surgery._offline && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-4 py-3 mb-4 text-sm">
            <strong>Offline Booking:</strong> This booking will sync automatically when your internet connection is restored.
          </div>
        )}

        {/* Patient Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-bold text-gray-700 mb-2">Patient Information</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-gray-500">Name:</span> <span className="font-medium">{surgery.full_name}</span></div>
            <div><span className="text-gray-500">Age/Gender:</span> <span className="font-medium">{surgery.age} / {surgery.gender}</span></div>
            <div><span className="text-gray-500">Phone:</span> <span className="font-medium">{surgery.phone_number || 'N/A'}</span></div>
            <div><span className="text-gray-500">Status:</span> <span className="font-semibold text-amber-600 capitalize">{surgery.status}</span></div>
          </div>
        </div>

        {/* Procedure & Date */}
        <div className="bg-purple-50 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-bold text-purple-800 mb-2">Procedure Details</h3>
          <div className="text-sm space-y-1">
            <div><span className="text-gray-500">Procedure:</span> <span className="font-semibold text-purple-700">{surgery.procedure_name || surgery.surgery_type}</span></div>
            <div><span className="text-gray-500">Preferred Date:</span> <span className="font-semibold">{surgery.preferred_date}</span></div>
            {(plan.diagnosis || surgery.diagnosis) && (
              <div><span className="text-gray-500">Diagnosis:</span> <span className="font-medium">{plan.diagnosis || surgery.diagnosis}</span></div>
            )}
          </div>
        </div>

        {/* Risk Assessments */}
        {(plan.bleeding_risk?.level || plan.dvt_risk?.level || plan.cardiovascular_risk?.level || plan.nutritional_assessment?.level || plan.pressure_sore_risk?.level) && (
          <div className="bg-red-50/50 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-bold text-red-800 mb-3">Risk Assessments (Validated Scoring Tools)</h3>
            <div className="space-y-2 text-sm">
              {plan.bleeding_risk?.level && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-gray-600 font-medium">🩸 Bleeding:</span>
                  <span className="text-xs text-gray-400">{plan.bleeding_risk.tool || 'Surgical Bleeding Risk'}</span>
                  {plan.bleeding_risk.score !== undefined && <span className="text-xs bg-white border rounded px-1.5 py-0.5">Score: {plan.bleeding_risk.score}</span>}
                  {riskBadge(plan.bleeding_risk.level)}
                </div>
              )}
              {plan.dvt_risk?.level && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-gray-600 font-medium">🦵 DVT:</span>
                  <span className="text-xs text-gray-400">{plan.dvt_risk.tool || 'Caprini Score'}</span>
                  {plan.dvt_risk.score !== undefined && <span className="text-xs bg-white border rounded px-1.5 py-0.5">Score: {plan.dvt_risk.score}</span>}
                  {riskBadge(plan.dvt_risk.level)}
                </div>
              )}
              {plan.nutritional_assessment?.level && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-gray-600 font-medium">🍽️ Nutritional:</span>
                  <span className="text-xs text-gray-400">{plan.nutritional_assessment.tool || 'MUST'}</span>
                  {plan.nutritional_assessment.score !== undefined && <span className="text-xs bg-white border rounded px-1.5 py-0.5">Score: {plan.nutritional_assessment.score}</span>}
                  {riskBadge(plan.nutritional_assessment.level)}
                </div>
              )}
              {plan.cardiovascular_risk?.level && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-gray-600 font-medium">❤️ Cardiovascular:</span>
                  <span className="text-xs text-gray-400">{plan.cardiovascular_risk.tool || 'RCRI'}</span>
                  {plan.cardiovascular_risk.score !== undefined && <span className="text-xs bg-white border rounded px-1.5 py-0.5">Score: {plan.cardiovascular_risk.score}</span>}
                  {riskBadge(plan.cardiovascular_risk.level)}
                </div>
              )}
              {plan.pressure_sore_risk?.level && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-gray-600 font-medium">🛏️ Pressure Sore:</span>
                  <span className="text-xs text-gray-400">{plan.pressure_sore_risk.tool || 'Waterlow'}</span>
                  {plan.pressure_sore_risk.score !== undefined && <span className="text-xs bg-white border rounded px-1.5 py-0.5">Score: {plan.pressure_sore_risk.score}</span>}
                  {riskBadge(plan.pressure_sore_risk.level)}
                </div>
              )}
            </div>
            {plan.nutritional_assessment?.meal_plan && (
              <div className="mt-2 text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
                🍲 7-Day Meal Plan generated (included in PDF)
              </div>
            )}
          </div>
        )}

        {/* Investigations */}
        {inv.compulsory && (
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-bold text-blue-800 mb-2">Investigations Requested</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries({hiv:'HIV', fbc:'FBC', seucr:'SEUCR', hcv:'HCV', hbsag:'HBsAg'}).map(([k, l]) => (
                <span key={k} className={`px-2 py-1 rounded text-xs font-medium ${inv.compulsory[k] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {inv.compulsory[k] ? '✓' : '✗'} {l}
                </span>
              ))}
            </div>
            {inv.additional?.length > 0 && (
              <div className="mt-2 text-xs text-gray-600">Additional: {inv.additional.join(', ')}</div>
            )}
          </div>
        )}

        {/* Requirements Summary */}
        {req.anaesthesia_type && (
          <div className="bg-indigo-50 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-bold text-indigo-800 mb-2">Surgical Requirements</h3>
            <div className="text-sm space-y-1">
              <div><span className="text-gray-500">Anaesthesia:</span> <span className="font-medium">{req.anaesthesia_type}</span></div>
              {req.tourniquet && <div className="text-gray-600">✓ Tourniquet required</div>}
              {req.diathermy && <div className="text-gray-600">✓ Diathermy: {req.diathermy_type || 'Yes'}</div>}
              {req.special_instruments?.length > 0 && <div className="text-gray-600">Instruments: {req.special_instruments.join(', ')}</div>}
              {req.dressing_materials?.length > 0 && <div className="text-gray-600">Dressings: {req.dressing_materials.join(', ')}</div>}
              {req.solutions?.length > 0 && <div className="text-gray-600">Solutions: {req.solutions.join(', ')}</div>}
            </div>
          </div>
        )}

        {/* Patient Education Preview */}
        {(surgery.pre_op_education || surgery.post_op_education) && (
          <div className="bg-pink-50 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-bold text-pink-800 mb-2">Patient Education Generated</h3>
            <p className="text-xs text-gray-600">Pre-operative and post-operative education material has been generated for this procedure. These are included in the full PDF booking document.</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <button onClick={downloadPdf} disabled={pdfLoading || surgery._offline}
            className="bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2">
            {pdfLoading ? (
              <><svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Generating PDF...</>
            ) : (
              <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> Download PDF</>
            )}
          </button>
          <button onClick={shareWhatsApp}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.612.638l4.67-1.228A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.315 0-4.458-.764-6.184-2.053l-.432-.34-2.773.73.74-2.698-.372-.449A9.945 9.945 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>
            Share on WhatsApp
          </button>
        </div>

        {/* Important Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4 text-left">
          <h3 className="text-sm font-bold text-blue-800 mb-1">IMPORTANT NOTICE:</h3>
          <p className="text-sm text-blue-700">Please arrive at least <strong>ONE (1) HOUR</strong> before your scheduled time. Complete all pre-operative investigations before the surgery date.</p>
        </div>

        <p className="text-sm text-gray-500 mb-4 text-center">
          You will receive a WhatsApp message or call to confirm your surgery date.
        </p>

        <Link to="/"
          className="block text-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-6 py-2 rounded-lg transition">
          Back to Home
        </Link>
      </div>
    </main>
  )
}
