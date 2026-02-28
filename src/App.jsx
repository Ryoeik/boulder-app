import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Startseite from './pages/Startseite'
import Hallen from './pages/Hallen'
import Profil from './pages/Profil'
import HalleDetail from './pages/HalleDetail'

function App() {
  return (
    <BrowserRouter>
      {/* Navigation oben */}
      <nav style={{ padding: '1rem', background: '#1a1a2e', display: 'flex', gap: '1rem' }}>
        <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>🏠 Start</Link>
        <Link to="/hallen" style={{ color: 'white', textDecoration: 'none' }}>🏟️ Hallen</Link>
        <Link to="/profil" style={{ color: 'white', textDecoration: 'none' }}>👤 Profil</Link>
      </nav>

      {/* Seiten */}
      <Routes>
        <Route path="/" element={<Startseite />} />
        <Route path="/hallen" element={<Hallen />} />
        <Route path="/profil" element={<Profil />} />
        <Route path="/halle/:id" element={<HalleDetail />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
