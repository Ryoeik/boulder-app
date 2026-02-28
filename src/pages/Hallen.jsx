import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'

function Hallen() {
  const [hallen, setHallen] = useState([])
  const [laden, setLaden] = useState(true)

  useEffect(() => {
    async function hallenLaden() {
      const { data, error } = await supabase
        .from('gyms')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Fehler:', error)
      } else {
        setHallen(data)
      }
      setLaden(false)
    }
    hallenLaden()
  }, [])

  if (laden) return <div className="container"><p>Lädt...</p></div>

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>🏟️ Alle Hallen</h1>
          <p>Finde Boulderhallen in deiner Nähe</p>
        </div>
        <Link to="/halle-erstellen" className="btn">Halle erstellen</Link>
      </div>

      <div className="grid">
        {hallen.map(halle => (
          <Link to={`/halle/${halle.id}`} key={halle.id} style={{ textDecoration: 'none' }}>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h2 style={{ margin: 0 }}>{halle.name}</h2>
                {halle.is_certified && <span className="badge badge-green">✓ Zertifiziert</span>}
              </div>
              <p>📍 {halle.city}</p>
              {halle.description && <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>{halle.description}</p>}
            </div>
          </Link>
        ))}
      </div>

      {hallen.length === 0 && (
        <div style={{ textAlign: 'center', marginTop: '4rem' }}>
          <p style={{ marginBottom: '1rem' }}>Noch keine Hallen vorhanden.</p>
          <Link to="/halle-erstellen" className="btn">Halle erstellen</Link>
        </div>
      )}
    </div>
  )
}

export default Hallen