import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initStarfield } from './starfield.js'

const canvas = document.getElementById('starfield')
// ~2500 Sterne => dichter Holo-Look, 60fps. Erhoehbar via setCount().
const starfield = initStarfield(canvas, 2500)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Aufraeumen beim Entladen (HMR-sicher)
window.addEventListener('beforeunload', () => starfield.destroy())
