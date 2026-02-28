import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import TickButton from '../components/TickButton'

const routen = [
  { id: 1, name: 'Gelber Riese', farbe: '#FFD700', grad: '6A', sterne: 4.2, ticks: 23 },
  { id: 2, name: 'Roter Drache', farbe: '#FF4444', grad: '7A', sterne: 4.8, ticks: 12 },
  { id: 3, name: 'Blauer Pfeil', farbe: '#4488FF', grad: '5C', sterne: 3.9, ticks: 45 },
  { id: 4, name: 'Grüner Weg', farbe: '#44BB44', grad: '6B+', sterne: 4.1, ticks: 31 },
  { id: 5, name: 'Schwarzer Turm', farbe: '#333333', grad: '7B', sterne: 4.9, ticks: 8 },
]

function HalleDetail() {
  const { id } = useParams()
  const [halle, setHalle] = useState(null)
  const [laden, setLaden] = useState(true)

  useEffect(() => {
    async function halleLaden() {
      const { data, error } = await supabase
        .from('gyms')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Fehler:', error)
      } else {
        setHalle(data)
      }
      setLaden(false)
    }

    halleLaden()
  }, [id])

  if (laden) return <div className="container"><p>Lädt...</p></div>
  if (!halle) return <div className="container"><h1>Halle nicht gefunden</h1></div>

  return (
    <div className="container">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <h1>{halle.name}</h1>
        {halle.is_certified && <span className="badge badge-green">✓ Zertifiziert</span>}
      </div>
      <p>📍 {halle.city}</p>

      <h2 style={{ marginTop: '2rem' }}>Routen</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {routen.map(route => (
          <div key={route.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '8px',
              height: '60px',
              borderRadius: '4px',
              backgroundColor: route.farbe,
              flexShrink: 0
            }} />
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
            <TickButton routeId={route.id} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default HalleDetail