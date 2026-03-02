import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabase'

function SektionDetail() {
  const { gymId, sektionId } = useParams()
  const [sektion, setSektion] = useState(null)
  const [routen, setRouten]   = useState([])
  const [laden, setLaden]     = useState(true)

  useEffect(() => {
    async function datenLaden() {
      const { data: sektionData } = await supabase
        .from('sections').select('*').eq('id', sektionId).single()
      setSektion(sektionData)

      const { data: routenData } = await supabase
        .from('routes').select('*').eq('section_id', sektionId).eq('is_active', true)
        .order('created_at', { ascending: false })
      setRouten(routenData || [])
      setLaden(false)
    }
    datenLaden()
  }, [sektionId])

  if (laden) return <div className="container"><p>Lädt...</p></div>

  return (
    <div className="container" style={{ maxWidth: '700px', paddingBottom: '3rem' }}>
      <Link to={`/halle/${gymId}/sektionen`} style={{ color: '#aaa', textDecoration: 'none', fontSize: '0.9rem' }}>
        ← Zurück zu Sektionen
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.5rem 0 0.25rem' }}>
        <h1 style={{ margin: 0 }}>{sektion?.name}</h1>
      </div>
      {sektion?.description && <p style={{ color: '#aaa', marginBottom: '1rem' }}>{sektion.description}</p>}

      <Link to={`/halle/${gymId}/sektion/${sektionId}/wandplan`} className="btn" style={{ display: 'inline-block', marginBottom: '2rem' }}>
        🗺️ Wandplan & Routen verwalten
      </Link>

      <h2 style={{ marginBottom: '1rem' }}>Routen ({routen.length})</h2>

      {routen.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#555', marginBottom: '0.5rem' }}>Noch keine Routen – erstelle sie im Wandplan.</p>
          <Link to={`/halle/${gymId}/sektion/${sektionId}/wandplan`} style={{ color: '#ff6b00' }}>
            Zum Wandplan →
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {routen.map(route => (
            <Link key={route.id} to={`/route/${route.id}`} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                background: '#111', borderRadius: '12px', padding: '0.75rem',
                border: '1px solid #1a1a1a', cursor: 'pointer'
              }}>
                {route.image_url ? (
                  <img src={route.image_url} alt={route.name} style={{
                    width: '52px', height: '52px', objectFit: 'cover',
                    borderRadius: '8px', flexShrink: 0
                  }} />
                ) : (
                  <div style={{ width: '6px', height: '52px', borderRadius: '3px', backgroundColor: route.color, flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 'bold', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {route.name || 'Unbenannte Route'}
                  </div>
                  {route.description && (
                    <p style={{ fontSize: '0.8rem', color: '#555', margin: '0.2rem 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {route.description}
                    </p>
                  )}
                </div>
                <span style={{ color: '#ff6b00', fontWeight: 'bold', flexShrink: 0 }}>{route.setter_grade}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default SektionDetail