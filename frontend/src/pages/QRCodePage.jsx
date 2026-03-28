import { useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Link } from 'react-router-dom'

export default function QRCodePage() {
  const printRef = useRef(null)
  const bookingUrl = `${window.location.origin}/book`

  const handlePrint = () => {
    const content = printRef.current
    if (!content) return
    const win = window.open('', '_blank')
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>NFH PS-Consultation - QR Code</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', system-ui, -apple-system, sans-serif; padding: 40px; color: #1e293b; }
          .container { max-width: 700px; margin: 0 auto; text-align: center; }
          .logo { width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 16px; }
          h1 { color: #1e40af; font-size: 22px; margin-bottom: 4px; }
          h2 { color: #2563eb; font-size: 16px; margin-bottom: 24px; font-weight: 600; }
          .qr-box { display: inline-block; padding: 24px; border: 3px solid #1e40af; border-radius: 16px; margin-bottom: 24px; }
          .url { color: #1e40af; font-size: 13px; margin-top: 12px; word-break: break-all; font-weight: 600; }
          .scan-label { color: #1e40af; font-size: 18px; font-weight: 700; margin-bottom: 16px; }
          .divider { border: none; border-top: 2px solid #e2e8f0; margin: 24px 0; }
          .instructions { text-align: left; max-width: 540px; margin: 0 auto; }
          .instructions h3 { color: #1e40af; font-size: 16px; margin-bottom: 16px; }
          .step { display: flex; gap: 12px; margin-bottom: 14px; align-items: flex-start; }
          .step-num { background: #1e40af; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0; }
          .step-text { font-size: 14px; line-height: 1.5; padding-top: 3px; }
          .step-text strong { color: #1e40af; }
          .footer { margin-top: 32px; padding-top: 16px; border-top: 2px solid #e2e8f0; font-size: 12px; color: #64748b; }
          .footer strong { color: #1e40af; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        ${content.innerHTML}
      </body>
      </html>
    `)
    win.document.close()
    win.focus()
    win.print()
    win.close()
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Book PS-Consultation at Niger Foundation Hospital',
          text: 'Scan the QR code or visit this link to book your clinic appointment at Niger Foundation Hospital, Enugu — Plastic Surgery/Wound Care Clinic.',
          url: bookingUrl,
        })
      } catch {
        // User cancelled share
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(bookingUrl)
      alert('Booking link copied to clipboard!')
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 relative z-10">
      {/* Action buttons */}
      <div className="flex flex-wrap items-center justify-between mb-6 gap-3">
        <h1 className="text-2xl font-bold text-blue-800">QR Code & Booking Guide</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-800 transition flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
          <button
            onClick={handleShare}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share Link
          </button>
        </div>
      </div>

      {/* Printable content */}
      <div ref={printRef}>
        <div className="container" style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <div className="bg-white rounded-xl shadow-lg p-8">
            {/* Header */}
            <img src="/NFH-LOGO.webp" alt="NFH Logo" className="w-20 h-20 mx-auto mb-3 rounded-full object-contain" style={{ width: 80, height: 80, borderRadius: '50%', margin: '0 auto 16px' }} />
            <h1 style={{ color: '#1e40af', fontSize: 22, marginBottom: 4 }} className="text-2xl font-bold text-blue-800 mb-1">
              Niger Foundation Hospital, Enugu
            </h1>
            <h2 style={{ color: '#2563eb', fontSize: 16, marginBottom: 24, fontWeight: 600 }} className="text-lg font-semibold text-blue-600 mb-6">
              Plastic Surgery / Wound Care Clinic
            </h2>

            {/* QR Code */}
            <p style={{ color: '#1e40af', fontSize: 18, fontWeight: 700, marginBottom: 16 }} className="text-blue-800 text-lg font-bold mb-4">
              Scan to Book Your Appointment
            </p>
            <div style={{ display: 'inline-block', padding: 24, border: '3px solid #1e40af', borderRadius: 16, marginBottom: 24 }} className="inline-block p-6 border-[3px] border-blue-800 rounded-2xl mb-6">
              <QRCodeSVG
                value={bookingUrl}
                size={220}
                level="H"
                includeMargin={false}
                fgColor="#1e293b"
                bgColor="#ffffff"
              />
              <p style={{ color: '#1e40af', fontSize: 13, marginTop: 12, wordBreak: 'break-all', fontWeight: 600 }} className="text-blue-700 text-xs mt-3 font-semibold break-all">
                {bookingUrl}
              </p>
            </div>

            {/* Divider */}
            <hr style={{ border: 'none', borderTop: '2px solid #e2e8f0', margin: '24px 0' }} className="border-0 border-t-2 border-gray-200 my-6" />

            {/* Step by step instructions */}
            <div style={{ textAlign: 'left', maxWidth: 540, margin: '0 auto' }} className="text-left max-w-lg mx-auto">
              <h3 style={{ color: '#1e40af', fontSize: 16, marginBottom: 16 }} className="text-blue-800 font-bold text-base mb-4">
                How to Book & Track Your Appointment
              </h3>

              {[
                { title: 'Scan the QR Code', desc: 'Open your phone camera or any QR scanner app and point it at the code above. Tap the link that appears to open the booking page.' },
                { title: 'Select Date & Visit Type', desc: 'Choose your preferred appointment date and select either <strong>Wound Care</strong> (30 min) or <strong>Non-Wound Care</strong> (20 min) consultation.' },
                { title: 'Pick a Time Slot', desc: 'Available time slots will be displayed. Tap on your preferred time slot to select it.' },
                { title: 'Enter Your Details', desc: 'Fill in your full name, age, gender, phone number (WhatsApp), visit category (First Time or Follow-up), and reason for visit.' },
                { title: 'Accept Terms & Conditions', desc: 'Scroll through the terms and conditions to the end, then check the acceptance box.' },
                { title: 'Submit Your Booking', desc: 'Tap the <strong>"Confirm Booking"</strong> button. You will see a confirmation page with your appointment reference number.' },
                { title: 'Save Your Reference Number', desc: 'Take a screenshot or note down your reference number. You will need it to identify your appointment.' },
                { title: 'Arrive 1 Hour Early', desc: 'On appointment day, arrive at least <strong>ONE (1) HOUR</strong> before your scheduled time to get vital signs taken, pay consultation fees, and confirm availability of wound care materials.' },
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'flex-start' }} className="flex gap-3 mb-3.5 items-start">
                  <span
                    style={{ background: '#1e40af', color: 'white', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}
                    className="bg-blue-800 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  >
                    {i + 1}
                  </span>
                  <div style={{ fontSize: 14, lineHeight: 1.5, paddingTop: 3 }} className="text-sm leading-relaxed pt-0.5">
                    <strong style={{ color: '#1e40af' }} className="text-blue-800">{step.title}</strong>
                    <br />
                    <span dangerouslySetInnerHTML={{ __html: step.desc }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{ marginTop: 32, paddingTop: 16, borderTop: '2px solid #e2e8f0', fontSize: 12, color: '#64748b' }} className="mt-8 pt-4 border-t-2 border-gray-200 text-xs text-gray-500">
              <p><strong style={{ color: '#1e40af' }} className="text-blue-800">Niger Foundation Hospital, Enugu</strong></p>
              <p>Plastic Surgery / Wound Care Clinic</p>
              <p className="italic mt-1" style={{ fontStyle: 'italic', marginTop: 4 }}>Committed to Excellence, Discipline, and Quality Patient Care</p>
            </div>
          </div>
        </div>
      </div>

      {/* Back link */}
      <div className="text-center mt-6">
        <Link to="/" className="text-blue-700 hover:text-blue-800 text-sm font-medium transition">
          &larr; Back to Home
        </Link>
      </div>
    </main>
  )
}
