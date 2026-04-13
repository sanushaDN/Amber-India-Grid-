import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('[SW] Grid Link Established:', reg))
      .catch(err => console.log('[SW] Grid Link Failed:', err));
  });
}

/* V5.1 FORCED_SYNC_ACTIVE: TRUE */
