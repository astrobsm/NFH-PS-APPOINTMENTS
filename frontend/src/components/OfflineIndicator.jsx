import { useState, useEffect } from 'react'
import { getQueueCount, syncQueue } from '../utils/offlineQueue'

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true)
      // Auto-sync when coming back online
      handleSync()
    }
    const goOffline = () => setIsOnline(false)

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)

    // Check queue count
    updateCount()

    // Listen for sync success from service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SYNC_SUCCESS') {
          updateCount()
        }
      })
    }

    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  const updateCount = async () => {
    try {
      const count = await getQueueCount()
      setPendingCount(count)
    } catch {
      // IndexedDB not available
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setSyncMessage('')
    try {
      const synced = await syncQueue()
      if (synced > 0) {
        setSyncMessage(`${synced} booking${synced > 1 ? 's' : ''} synced successfully!`)
        setTimeout(() => setSyncMessage(''), 5000)
      }
    } catch {
      // Sync failed
    } finally {
      setSyncing(false)
      updateCount()
    }
  }

  return (
    <>
      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728M5.636 18.364a9 9 0 010-12.728M12 9v4m0 4h.01" />
          </svg>
          You are offline — Bookings will be saved and synced when you reconnect
        </div>
      )}

      {/* Pending sync banner */}
      {isOnline && pendingCount > 0 && (
        <div className="bg-blue-600 text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2">
          <span>{pendingCount} pending booking{pendingCount > 1 ? 's' : ''} to sync</span>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="bg-white text-blue-600 px-3 py-0.5 rounded text-xs font-bold hover:bg-blue-50 transition disabled:opacity-50"
          >
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      )}

      {/* Sync success message */}
      {syncMessage && (
        <div className="bg-green-600 text-white text-center py-2 px-4 text-sm font-medium">
          {syncMessage}
        </div>
      )}
    </>
  )
}
