import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import Startseite from './pages/Startseite'
import Hallen from './pages/Hallen'
import Profil from './pages/Profil'
import HalleDetail from './pages/HalleDetail'
import Login from './pages/Login'
import './index.css'
import HalleErstellen from './pages/HalleErstellen'
import RouteErstellen from './pages/RouteErstellen'
import SektionErstellen from './pages/SektionErstellen'
import SektionDetail from './pages/SektionDetail'
import RouteDetail from './pages/RouteDetail'
import WandplanEditor from './pages/WandplanEditor'

function App() {
  const [nutzer, setNutzer] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setNutzer(session?.user ?? null)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      setNutzer(session?.user ?? null)
    })
  }, [])

  async function ausloggen() {
    await supabase.auth.signOut()
  }

  return (
    <BrowserRouter>
      <nav className="navbar">
        <Link to="/" className="navbar-logo">🧗 BoulderApp</Link>
        <div className="navbar-links">
          <Link to="/">Start</Link>
          <Link to="/hallen">Hallen</Link>
          {nutzer ? (
            <>
              <Link to="/profil">Profil</Link>
              <span
                onClick={ausloggen}
                style={{ color: '#ff6b00', cursor: 'pointer' }}
              >
                Ausloggen
              </span>
            </>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Startseite />} />
        <Route path="/hallen" element={<Hallen />} />
        <Route path="/profil" element={<Profil />} />
        <Route path="/halle/:gymId" element={<HalleDetail />} />
        <Route path="/halle/:gymId/route-erstellen" element={<RouteErstellen />} />
        <Route path="/halle/:gymId/sektionen" element={<SektionErstellen />} />
        <Route path="/login" element={<Login />} />
        <Route path="/halle-erstellen" element={<HalleErstellen />} />
        <Route path="/halle/:gymId/sektion/:sektionId" element={<SektionDetail />} />
        <Route path="/route/:routeId" element={<RouteDetail />} />
        <Route path="/halle/:gymId/sektion/:sektionId/wandplan" element={<WandplanEditor />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App