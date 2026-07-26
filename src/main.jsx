import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import './mobile.css' // Mobile-Stacking (<=767px) — zuletzt laden, gewinnt
import { initStarfield } from './starfield.js'

const canvas = document.getElementById('starfield')
// ~8000 Sterne => krasser Holo-Look mit Parallax, 60fps. Erhoehbar via setCount().
const starfield = initStarfield(canvas, 8000)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Aufraeumen beim Entladen (HMR-sicher)
window.addEventListener('beforeunload', () => starfield.destroy())
