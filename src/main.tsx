import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
// Side-effect import: configures i18next before the first render.
import './i18n/index'
import './index.css'
import { registerServiceWorker } from './pwa/register'

const container = document.getElementById('root')

if (!container) {
  throw new Error('Missing #root element in index.html')
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

registerServiceWorker()
