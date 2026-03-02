import { useState, useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { supabase } from './supabase'
import './index.css'

// Komponenten, die sofort da sein müssen (Navbar & Disclaimer)
import Navbar from './components/Navbar'
import Disclaimer from './components/Disclaimer'

// Seiten mit Lazy Loading importieren
const Startseite = lazy(() => import('./pages/Startseite'))
const Hallen = lazy(() => import('./pages/Hallen'))
const Profil = lazy(() => import('./pages/Profil'))
const NutzerProfil = lazy(() => import('./pages/NutzerProfil'))
const HalleDetail = lazy(() => import('./pages/HalleDetail'))
const HalleErstellen = lazy(() => import('./pages/HalleErstellen'))
const HalleEinstellungen = lazy(() => import('./pages/HalleEinstellungen'))
const SektionErstellen = lazy(() => import('./pages/SektionErstellen'))
const SektionDetail = lazy(() => import('./pages/SektionDetail'))
const WandplanEditor = lazy(() => import('./pages/WandplanEditor'))
const RouteErstellen = lazy(() => import('./pages/RouteErstellen'))
const RouteDetail = lazy(() => import('./pages/RouteDetail'))
const Login = lazy(() => import('./pages/Login'))
const Datenschutz = lazy(() => import('./pages/Datenschutz'))
const HallenProfil = lazy(() => import('./pages/HallenProfil'))
const Ranking = lazy(() => import('./pages/Ranking'))

// Ein einfacher Lade-Indikator
const PageLoader = () => (
  <div className="loader-container">
    <div className="loader-spinner"></div>
    <div style={{ letterSpacing: '1px', textTransform: 'uppercase', fontSize: '0.7rem' }}>
      Wird geladen...
    </div>
  </div>
)

function App() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <BrowserRouter>
      <Disclaimer />
      <Navbar />

      {/* Suspense fängt das Warten auf die "Lazy" Komponenten ab */}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Startseite />} />
          <Route path="/hallen" element={<Hallen />} />
          <Route path="/profil" element={<Profil session={session} />} />
          <Route path="/nutzer/:userId" element={<NutzerProfil />} />
          <Route path="/halle/:gymId" element={<HalleDetail />} />
          <Route path="/halle-erstellen" element={<HalleErstellen />} />
          <Route path="/halle/:gymId/einstellungen" element={<HalleEinstellungen />} />
          <Route path="/halle/:gymId/sektionen" element={<SektionErstellen />} />
          <Route path="/halle/:gymId/sektion/:sektionId" element={<SektionDetail />} />
          <Route path="/halle/:gymId/sektion/:sektionId/wandplan" element={<WandplanEditor />} />
          <Route path="/halle/:gymId/route-erstellen" element={<RouteErstellen />} />
          <Route path="/route/:routeId" element={<RouteDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/datenschutz" element={<Datenschutz />} />
          <Route path="/halle/:gymId/nutzer/:userId" element={<HallenProfil />} />
          <Route path="/halle/:gymId/ranking" element={<Ranking />} />
        </Routes>
      </Suspense>

      <footer style={{
        borderTop: '1px solid #1a1a1a', padding: '1.5rem',
        textAlign: 'center', marginTop: '3rem'
      }}>
        <a href="/datenschutz" style={{ color: '#555', fontSize: '0.85rem', textDecoration: 'none' }}>
          Datenschutz
        </a>
        <span style={{ color: '#333', margin: '0 0.75rem' }}>·</span>
        <span style={{ color: '#555', fontSize: '0.85rem' }}>
          Toter Boulder – Ein privates Community-Projekt
        </span>
      </footer>
    </BrowserRouter>
  )
}

export default App