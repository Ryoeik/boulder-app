import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { Link } from 'react-router-dom'

function Profil() {
  const [nutzer, setNutzer] = useState(null)
  const [laden, setLaden] = useState(true)

  useEffect(() => {
    async function nutzerLaden() {
      const { data: { session } } = await supabase.auth.getSession()
      setNutzer(session?.user ?? null)
      setLaden(false)
    }
    nutzerLaden()
  }, [])

  if (laden) return <div className="container"><p>Lädt...</p></div>

  if (!nutzer) {
    return (
      <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>
        <h1>👤 Profil</h1>
        <p style={{ marginBottom: '2rem' }}>Du musst eingeloggt sein um dein Profil zu sehen.</p>
        <Link to="/login" className="btn">Zum Login</Link>
      </div>
    )
  }

  return (
    <div className="container">
      {/* Profil Header */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: '#ff6b00',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem',
          flexShrink: 0
        }}>
          🧗
        </div>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>{nutzer.email}</h1>
          <p>Mitglied seit {new Date(nutzer.created_at).toLocaleDateString('de-DE')}</p>
        </div>
      </div>

      {/* Statistiken */}
      <h2>📊 Statistiken</h2>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '2rem' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ff6b00' }}>0</div>
          <p>Routen getickt</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ff6b00' }}>0</div>
          <p>Flash</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ff6b00' }}>0</div>
          <p>Bewertungen</p>
        </div>
      </div>

      {/* Ticks */}
      <h2>✅ Meine Ticks</h2>
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <p>Noch keine Routen getickt.</p>
        <Link to="/" style={{ color: '#ff6b00' }}>Jetzt Hallen entdecken →</Link>
      </div>
    </div>
  )
}

export default Profil