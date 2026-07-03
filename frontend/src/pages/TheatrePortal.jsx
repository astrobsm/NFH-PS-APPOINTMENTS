import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'

/**
 * Single shareable hub for surgeons & nurses:
 *  - View NFH Theatre Registry  (/theatre)
 *  - Book a Surgery (Public)       (/theatre/book)
 *  - Install as a PWA              (Add to Home Screen)
 *  - Share link / QR code
 *
 * Share this URL:  <origin>/theatre/portal
 */
export default function TheatrePortal() {
  const [installEvt, setInstallEvt] = useState(null)
  const [installed, setInstalled] = useState(false)
  const [copied, setCopied] = useState(false)
  const portalUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/theatre/portal`
    : ''

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setInstallEvt(e)
    }
    const installedHandler = () => { setInstalled(true); setInstallEvt(null) }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', installedHandler)
    // Detect already-installed (display-mode standalone)
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  const handleInstall = async () => {
    if (!installEvt) return
    installEvt.prompt()
    const { outcome } = await installEvt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setInstallEvt(null)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(portalUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'NFH Theatre Portal',
          text: 'Niger Foundation Hospital — Theatre Booking & Registry',
          url: portalUrl,
        })
      } catch { /* user cancelled */ }
    } else {
      handleCopy()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-blue-50 relative z-10">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-lg mb-4 overflow-hidden">
            <img src="/nfh-logo-dc.png" alt="NFH Logo" className="w-16 h-16 object-contain" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
            NFH Theatre Portal
          </h1>
          <p className="text-slate-600 mt-2 max-w-2xl mx-auto">
            Niger Foundation Hospital, Enugu — Shared access for surgeons & nurses.
            View the live theatre registry or book a surgery, no login required.
          </p>
        </div>

        {/* Action cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          <Link
            to="/theatre"
            className="group bg-white rounded-2xl shadow-md hover:shadow-xl border-2 border-transparent hover:border-blue-400 transition-all p-6 flex flex-col"
          >
            <div className="w-14 h-14 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">
              📋
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">View NFH Theatre Registry</h2>
            <p className="text-sm text-slate-600 flex-1">
              See all booked surgeries, theatre allocations, surgeons, ward and day-case status.
            </p>
            <span className="mt-4 inline-flex items-center text-blue-700 font-semibold">
              Open Registry →
            </span>
          </Link>

          <Link
            to="/theatre/book"
            className="group bg-white rounded-2xl shadow-md hover:shadow-xl border-2 border-transparent hover:border-amber-400 transition-all p-6 flex flex-col"
          >
            <div className="w-14 h-14 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">
              ➕
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Book a Surgery</h2>
            <p className="text-sm text-slate-600 flex-1">
              Submit a new theatre booking — patient details, specialty, surgeon, theatre & slot.
            </p>
            <span className="mt-4 inline-flex items-center text-amber-700 font-semibold">
              Start Booking →
            </span>
          </Link>
        </div>

        {/* Install / Share panel */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            📱 Install &amp; Share
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Install */}
            <div className="border border-slate-200 rounded-lg p-4 flex flex-col">
              <p className="text-sm font-semibold text-slate-800 mb-1">Install as App</p>
              <p className="text-xs text-slate-600 flex-1 mb-3">
                Add to your phone or desktop home screen for quick offline access.
              </p>
              {installed ? (
                <span className="text-xs font-semibold text-green-700">✓ Already installed</span>
              ) : installEvt ? (
                <button
                  onClick={handleInstall}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 rounded-lg text-sm"
                >
                  Install App
                </button>
              ) : (
                <p className="text-xs text-slate-500">
                  On iPhone: tap <strong>Share</strong> → <strong>Add to Home Screen</strong>.<br/>
                  On Android/desktop: use the browser's install icon in the address bar.
                </p>
              )}
            </div>

            {/* Share link */}
            <div className="border border-slate-200 rounded-lg p-4 flex flex-col">
              <p className="text-sm font-semibold text-slate-800 mb-1">Share Link</p>
              <p className="text-xs text-slate-600 break-all bg-slate-50 px-2 py-1 rounded mb-3 font-mono">
                {portalUrl}
              </p>
              <div className="flex gap-2 mt-auto">
                <button
                  onClick={handleCopy}
                  className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2 px-3 rounded-lg text-sm"
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
                <button
                  onClick={handleShare}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 px-3 rounded-lg text-sm"
                >
                  Share
                </button>
              </div>
            </div>

            {/* QR code */}
            <div className="border border-slate-200 rounded-lg p-4 flex flex-col items-center">
              <p className="text-sm font-semibold text-slate-800 mb-2">Scan QR</p>
              <div className="bg-white p-2 border border-slate-200 rounded">
                <QRCodeSVG value={portalUrl} size={120} level="M" />
              </div>
              <p className="text-xs text-slate-500 mt-2 text-center">Scan to open on mobile</p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Niger Foundation Hospital, Enugu — Theatre Portal
        </p>
      </div>
    </div>
  )
}
