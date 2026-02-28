import { Link } from 'react-router-dom'

const hallen = [
  { id: 1, name: 'Boulder World München', ort: 'München', routen: 120, zertifiziert: true },
  { id: 2, name: 'Boulderhaus Hamburg', ort: 'Hamburg', routen: 85, zertifiziert: true },
  { id: 3, name: 'Community Wall Berlin', ort: 'Berlin', routen: 60, zertifiziert: false },
  { id: 4, name: 'Rockerei Stuttgart', ort: 'Stuttgart', routen: 95, zertifiziert: false },
]

function Startseite() {
  return (
    <div className="container">
      <h1>🧗 Hallen entdecken</h1>
      <p>Finde Boulderhallen in deiner Nähe</p>

      <div className="grid">
        {hallen.map(halle => (
          <Link to={`/halle/${halle.id}`} key={halle.id} style={{ textDecoration: 'none' }}>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h2 style={{ margin: 0 }}>{halle.name}</h2>
                {halle.zertifiziert && <span className="badge badge-green">✓ Zertifiziert</span>}
              </div>
              <p>📍 {halle.ort}</p>
              <p style={{ marginTop: '0.5rem' }}>🧗 {halle.routen} Routen</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default Startseite