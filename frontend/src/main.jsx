import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { syncQueue } from './utils/offlineQueue'

// Register service worker for PWA — force update on every load
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      reg.update()
    })
  })
}

// Auto-sync offline queue when coming back online
window.addEventListener('online', async () => {
  try {
    await syncQueue()
  } catch {
    // Silent fail — OfflineIndicator will show manual sync option
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
