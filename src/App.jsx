import { useState, useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabase'
import './index.css'

import Navbar from './components/Navbar'
import Disclaimer from './components/Disclaimer'

const Startseite         = lazy(() => import('./pages/Startseite'))
const Hallen             = lazy(() => import('./pages/Hallen'))
const Profil             = lazy(() => import('./pages/Profil'))
const NutzerProfil       = lazy(() => import('./pages/NutzerProfil'))
const HalleDetail        = lazy(() => import('./pages/HalleDetail'))
const HalleErstellen     = lazy(() => import('./pages/HalleErstellen'))
const HalleEinstellungen = lazy(() => import('./pages/HalleEinstellungen'))
const SektionErstellen   = lazy(() => import('./pages/SektionErstellen'))
const SektionDetail      = lazy(() => import('./pages/SektionDetail'))
const WandplanEditor     = lazy(() => import('./pages/WandplanEditor'))
const RouteDetail        = lazy(() => import('./pages/RouteDetail'))
const Login              = lazy(() => import('./pages/Login'))
const Datenschutz        = lazy(() => import('./pages/Datenschutz'))
const HallenProfil       = lazy(() => import('./pages/HallenProfil'))
const Ranking            = lazy(() => import('./pages/Ranking'))
const SuperAdminPanel    = lazy(() => import('./pages/SuperAdminPanel'))

const PageLoader = () => (
  <div className="loader-container">
    <div className="loader-spinner"></div>
    <div style={{ letterSpacing: '1px', textTransform: 'uppercase', fontSize: '0.7rem' }}>
      Wird geladen...
    </div>
  </div>
)

// NEU: Schützt alle Routen – leitet nicht eingeloggte User zu /login weiter
function ProtectedRoute({ session, children }) {
  // Noch am Laden (session ist null beim ersten Render)
  if (session === undefined) return <PageLoader />
  if (!session) return <Navigate to="/login" replace />
  return children
}

function App() {
  const [session, setSession] = useState(undefined) // undefined = lädt noch

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session ?? null))
    return () => subscription.unsubscribe()
  }, [])

  // Wrapper damit session nicht immer mitgegeben werden muss
  const P = ({ children }) => <ProtectedRoute session={session}>{children}</ProtectedRoute>

  return (
    <BrowserRouter>
      <Disclaimer />
      <Navbar />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Öffentliche Routen */}
          <Route path="/login"       element={<Login />} />
          <Route path="/datenschutz" element={<Datenschutz />} />

          {/* Geschützte Routen */}
          <Route path="/"                                         element={<P><Startseite /></P>} />
          <Route path="/hallen"                                   element={<P><Hallen /></P>} />
          <Route path="/profil"                                   element={<P><Profil session={session} /></P>} />
          <Route path="/nutzer/:userId"                           element={<P><NutzerProfil /></P>} />
          <Route path="/halle/:gymId"                             element={<P><HalleDetail /></P>} />
          <Route path="/halle-erstellen"                          element={<P><HalleErstellen /></P>} />
          <Route path="/halle/:gymId/einstellungen"               element={<P><HalleEinstellungen /></P>} />
          <Route path="/halle/:gymId/sektionen"                   element={<P><SektionErstellen /></P>} />
          <Route path="/halle/:gymId/sektion/:sektionId"          element={<P><SektionDetail /></P>} />
          <Route path="/halle/:gymId/sektion/:sektionId/wandplan" element={<P><WandplanEditor /></P>} />
          <Route path="/route/:routeId"                           element={<P><RouteDetail /></P>} />
          <Route path="/halle/:gymId/nutzer/:userId"              element={<P><HallenProfil /></P>} />
          <Route path="/halle/:gymId/ranking"                     element={<P><Ranking /></P>} />
          <Route path="/superadmin"                               element={<P><SuperAdminPanel /></P>} />
        </Routes>
      </Suspense>

      <footer style={{ borderTop: '1px solid #1a1a1a', padding: '1.5rem', textAlign: 'center', marginTop: '3rem' }}>
        <a href="/datenschutz" style={{ color: '#555', fontSize: '0.85rem', textDecoration: 'none' }}>Datenschutz</a>
        <span style={{ color: '#333', margin: '0 0.75rem' }}>·</span>
        <span style={{ color: '#555', fontSize: '0.85rem' }}>Toter Boulder – Ein privates Community-Projekt</span>
      </footer>
    </BrowserRouter>
  )
}

export default App