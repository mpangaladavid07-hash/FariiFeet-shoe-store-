import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import AdminPage from './components/AdminPage.jsx'
import { LanguageProvider } from './lib/i18n'
import './index.css'

/**
 * Minimal routing without a router dependency: `/admin` (or `#/admin` for
 * static hosts that cannot rewrite paths) opens the PIN-protected order desk,
 * everything else is the storefront.
 */
const stripSlashes = (value) => String(value || '').replace(/\/+$/, '')
const isAdminRoute =
  stripSlashes(window.location.pathname) === '/admin' ||
  stripSlashes(window.location.hash.replace(/^#\/?/, '')) === 'admin'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LanguageProvider>{isAdminRoute ? <AdminPage /> : <App />}</LanguageProvider>
  </React.StrictMode>,
)
