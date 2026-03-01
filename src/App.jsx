import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'

// Komponenten
import Navbar from './components/Navbar'
import Disclaimer from './components/Disclaimer'

// Seiten
import Startseite from './pages/Startseite'
import Hallen from './pages/Hallen'
import Profil from './pages/Profil'
import NutzerProfil from './pages/NutzerProfil'
import HalleDetail from './pages/HalleDetail'
import HalleErstellen from './pages/HalleErstellen'
import HalleEinstellungen from './pages/HalleEinstellungen'
import SektionErstellen from './pages/SektionErstellen'
import SektionDetail from './pages/SektionDetail'
import WandplanEditor from './pages/WandplanEditor'
import RouteErstellen from './pages/RouteErstellen'
import RouteDetail from './pages/RouteDetail'
import Login from './pages/Login'
import Datenschutz from './pages/Datenschutz'
import HallenProfil from './pages/HallenProfil'

function App() {
  return (
    <BrowserRouter>
      <Disclaimer />
      <Navbar />

      <Routes>
        <Route path="/" element={<Startseite />} />
        <Route path="/hallen" element={<Hallen />} />
        <Route path="/profil" element={<Profil />} />
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
      </Routes>

      <footer style={{
        borderTop: '1px solid #1a1a1a', padding: '1.5rem',
        textAlign: 'center', marginTop: '3rem'
      }}>
        <a href="/datenschutz" style={{ color: '#555', fontSize: '0.85rem', textDecoration: 'none' }}>
          Datenschutz
        </a>
        <span style={{ color: '#333', margin: '0 0.75rem' }}>·</span>
        <span style={{ color: '#555', fontSize: '0.85rem' }}>
          BoulderApp – Ein privates Community-Projekt
        </span>
      </footer>
    </BrowserRouter>
  )
}

export default App