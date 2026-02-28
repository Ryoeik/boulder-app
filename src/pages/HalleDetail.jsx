import { useParams } from 'react-router-dom'

const hallen = [
  { id: '1', name: 'Boulder World München', ort: 'München', zertifiziert: true },
  { id: '2', name: 'Boulderhaus Hamburg', ort: 'Hamburg', zertifiziert: true },
  { id: '3', name: 'Community Wall Berlin', ort: 'Berlin', zertifiziert: false },
  { id: '4', name: 'Rockerei Stuttgart', ort: 'Stuttgart', zertifiziert: false },
]

const routen = [
  { id: 1, name: 'Gelber Riese', farbe: '#FFD700', grad: '6A', sterne: 4.2, ticks: 23 },
  { id: 2, name: 'Roter Drache', farbe: '#FF4444', grad: '7A', sterne: 4.8, ticks: 12 },
  { id: 3, name: 'Blauer Pfeil', farbe: '#4488FF', grad: '5C', sterne: 3.9, ticks: 45 },
  { id: 4, name: 'Grüner Weg', farbe: '#44BB44', grad: '6B+', sterne: 4.1, ticks: 31 },
  { id: 5, name: 'Schwarzer Turm', farbe: '#333333', grad: '7B', sterne: 4.9, ticks: 8 },
]

function HalleDetail() {
  const { id } = useParams()
  const halle = hallen.find(h => h.id === id)

  if (!halle) return <div className="container"><h1>Halle nicht gefunden</h1></div>

  return (
    <div className="container">
      {/* Hallen-Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <h1>{halle.name}</h1>
        {halle.zertifiziert && <span className="badge badge-green">✓ Zertifiziert</span>}
      </div>
      <p>📍 {halle.ort}</p>

      {/* Routen */}
      <h2 style={{ marginTop: '2rem' }}>Routen</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {routen.map(route => (
          <div key={route.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Farbbalken links */}
            <div style={{
              width: '8px',
              height: '60px',
              borderRadius: '4px',
              backgroundColor: route.farbe,
              flexShrink: 0
            }} />

            {/* Route Info */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '1.1rem' }}>{route.name}</strong>
                <span className="grade" style={{ color: '#ff6b00' }}>{route.grad}</span>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.3rem' }}>
                <span>⭐ {route.sterne}</span>
                <span>✓ {route.ticks} Ticks</span>
              </div>
            </div>

            {/* Tick Button */}
            <button className="btn">Geschafft!</button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default HalleDetail