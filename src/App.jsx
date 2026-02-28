import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Startseite from './pages/Startseite'
import Hallen from './pages/Hallen'
import Profil from './pages/Profil'
import HalleDetail from './pages/HalleDetail'
import './index.css'

function App() {
  return (
    <BrowserRouter>
      <nav className="navbar">
        <Link to="/" className="navbar-logo">🧗 BoulderApp</Link>
        <div className="navbar-links">
          <Link to="/">Start</Link>
          <Link to="/hallen">Hallen</Link>
          <Link to="/profil">Profil</Link>
        </div>
      </nav>

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