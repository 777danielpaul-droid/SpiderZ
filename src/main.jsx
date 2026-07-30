import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { ScrollToPlugin } from "gsap/ScrollToPlugin"
import App from './App.jsx'
import { AuthProvider } from './lib/auth.jsx'
import './index.css'
import './mobile.css'

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin)

if ("scrollRestoration" in history) history.scrollRestoration = "manual"

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)

// Starfield asynchron laden (optional, darf React nicht blockieren)
const canvas = document.getElementById('starfield')
if (canvas) {
  setTimeout(() => {
    import('./starfield.js').then(({ initStarfield }) => {
      const starfield = initStarfield(canvas, 8000)
      window.addEventListener('beforeunload', () => starfield.destroy())
    }).catch(() => { /* Starfield ist optional */ })
  }, 0)
}
