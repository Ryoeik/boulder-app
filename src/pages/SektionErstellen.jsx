import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabase'

function SektionErstellen() {
  const { gymId } = useParams()
  const [halle, setHalle] = useState(null)
  const [sektionen, setSektionen] = useState([])
  const [name, setName] = useState('')
  const [beschreibung, setBeschreibung] = useState('')
  const [laden, setLaden] = useState(false)
  const [fehler, setFehler] = useState('')

  useEffect(() => {
    async function datenLaden() {
      const { data: halleData } = await supabase
        .from('gyms')
        .select('*')
        .eq('id', gymId)
        .single()
      setHalle(halleData)

      const { data: sektionenData } = await supabase
        .from('sections')
        .select('*')
        .eq('gym_id', gymId)
        .order('created_at', { ascending: true })
      setSektionen(sektionenData || [])
    }
    datenLaden()
  }, [gymId])

  async function sektionErstellen() {
    if (!name.trim()) {
      setFehler('Name ist ein Pflichtfeld!')
      return
    }
    setLaden(true)
    setFehler('')

    const { data, error } = await supabase.from('sections').insert({
      gym_id: gymId,
      name: name.trim(),
      description: beschreibung.trim()
    }).select().single()

    if (error) {
      setFehler('Fehler: ' + error.message)
      setLaden(false)
      return
    }

    setSektionen([...sektionen, data])
    setName('')
    setBeschreibung('')
    setLaden(false)
  }

  async function sektionLoeschen(id) {
    await supabase.from('sections').delete().eq('id', id)
    setSektionen(sektionen.filter(s => s.id !== id))
  }

  return (
    <div className="container" style={{ maxWidth: '600px' }}>
      <Link to={`/halle/${gymId}`} style={{ color: '#aaa', textDecoration: 'none', fontSize: '0.9rem' }}>
        ← Zurück zur Halle
      </Link>

      <h1 style={{ marginTop: '0.5rem' }}>🏔️ Sektionen verwalten</h1>
      {halle && (
        <p style={{ marginBottom: '2rem' }}>
          für <strong style={{ color: '#ff6b00' }}>{halle.name}</strong>
        </p>
      )}

      {/* Bestehende Sektionen */}
      {sektionen.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2>Bestehende Sektionen</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {sektionen.map(sektion => (
              <div key={sektion.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Link to={`/halle/${gymId}/sektion/${sektion.id}`} style={{ textDecoration: 'none', flex: 1 }}>
                  <strong style={{ color: 'white' }}>{sektion.name}</strong>
                  {sektion.description && (
                    <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>{sektion.description}</p>
                  )}
                </Link>
                <button
                  onClick={() => sektionLoeschen(sektion.id)}
                  style={{
                    background: 'transparent', border: '1px solid #ff4444',
                    color: '#ff4444', padding: '0.4rem 0.75rem',
                    borderRadius: '6px', cursor: 'pointer', flexShrink: 0,
                    marginLeft: '1rem'
                  }}
                >
                  Löschen
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Neue Sektion */}
      <h2>Neue Sektion</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#aaa' }}>Name *</label>
          <input
            type="text"
            placeholder="z.B. Wand A, Überhang, Slab-Bereich"
            value={name}
            onChange={e => setName(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#aaa' }}>Beschreibung (optional)</label>
          <textarea
            placeholder="z.B. Linke Seite der Halle, hohe Wand..."
            value={beschreibung}
            onChange={e => setBeschreibung(e.target.value)}
            rows={2}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        {fehler && <p style={{ color: '#ff4444' }}>{fehler}</p>}

        <button className="btn" onClick={sektionErstellen} disabled={laden} style={{ padding: '1rem' }}>
          {laden ? 'Erstellt...' : 'Sektion erstellen'}
        </button>
      </div>

      {/* Weiter */}
      {sektionen.length > 0 && (
        <div style={{
          marginTop: '2rem', padding: '1.5rem',
          background: 'rgba(0,200,81,0.1)', border: '1px solid rgba(0,200,81,0.3)',
          borderRadius: '12px', textAlign: 'center'
        }}>
          <p style={{ color: '#00c851', marginBottom: '1rem' }}>
            ✅ {sektionen.length} Sektion(en) angelegt!
          </p>
          <Link to={`/halle/${gymId}`} className="btn">Zur Halle</Link>
        </div>
      )}
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '0.75rem',
  borderRadius: '8px',
  border: '1px solid #2a2a2a',
  background: '#1a1a1a',
  color: 'white',
  fontSize: '1rem',
  boxSizing: 'border-box'
}

export default SektionErstellen