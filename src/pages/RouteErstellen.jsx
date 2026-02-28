import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabase'

const farben = [
  { name: 'Gelb', hex: '#FFD700' },
  { name: 'Rot', hex: '#FF4444' },
  { name: 'Blau', hex: '#4488FF' },
  { name: 'Grün', hex: '#44BB44' },
  { name: 'Schwarz', hex: '#222222' },
  { name: 'Weiß', hex: '#EEEEEE' },
  { name: 'Orange', hex: '#FF6B00' },
  { name: 'Lila', hex: '#9944CC' },
  { name: 'Pink', hex: '#FF44AA' },
  { name: 'Braun', hex: '#8B4513' },
]

const grade = ['4A', '4B', '4C', '5A', '5B', '5C', '6A', '6A+', '6B', '6B+', '6C', '6C+', '7A', '7A+', '7B', '7B+', '7C', '7C+', '8A']

function RouteErstellen() {
  const { gymId } = useParams()
  const navigate = useNavigate()
  const [halle, setHalle] = useState(null)
  const [name, setName] = useState('')
  const [farbe, setFarbe] = useState('')
  const [grad, setGrad] = useState('')
  const [beschreibung, setBeschreibung] = useState('')
  const [laden, setLaden] = useState(false)
  const [fehler, setFehler] = useState('')

  useEffect(() => {
    async function halleLaden() {
      const { data } = await supabase
        .from('gyms')
        .select('*')
        .eq('id', gymId)
        .single()
      setHalle(data)
    }
    halleLaden()
  }, [gymId])

  async function routeErstellen() {
    if (!name.trim()) {
      setFehler('Name ist ein Pflichtfeld!')
      return
    }
    if (!farbe) {
      setFehler('Bitte wähle eine Grifffarbe!')
      return
    }
    if (!grad) {
      setFehler('Bitte wähle einen Schwierigkeitsgrad!')
      return
    }

    setLaden(true)
    setFehler('')

    const { data, error } = await supabase.from('routes').insert({
      gym_id: gymId,
      name: name.trim(),
      color: farbe,
      setter_grade: grad,
      description: beschreibung.trim(),
      is_active: true
    }).select().single()

    if (error) {
      setFehler('Fehler: ' + error.message)
      setLaden(false)
      return
    }

    navigate('/halle/' + gymId)
  }

  return (
    <div className="container" style={{ maxWidth: '600px' }}>
      <h1>🧗 Neue Route erstellen</h1>
      {halle && <p style={{ marginBottom: '2rem' }}>in <strong style={{ color: '#ff6b00' }}>{halle.name}</strong></p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Name */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#aaa' }}>Routenname *</label>
          <input
            type="text"
            placeholder="z.B. Gelber Riese"
            value={name}
            onChange={e => setName(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Grifffarbe */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.75rem', color: '#aaa' }}>Grifffarbe *</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {farben.map(f => (
              <div
                key={f.hex}
                onClick={() => setFarbe(f.hex)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
                  cursor: 'pointer'
                }}
              >
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: f.hex,
                  border: `3px solid ${farbe === f.hex ? '#ff6b00' : 'transparent'}`,
                  outline: farbe === f.hex ? '2px solid #ff6b00' : 'none',
                  transition: 'all 0.2s'
                }} />
                <span style={{ fontSize: '0.7rem', color: '#aaa' }}>{f.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Schwierigkeitsgrad */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.75rem', color: '#aaa' }}>Schwierigkeitsgrad *</label>
          <div style={{
            display: 'flex', gap: '0.5rem',
            overflowX: 'auto', paddingBottom: '0.5rem',
            scrollbarWidth: 'thin', scrollbarColor: '#ff6b00 #2a2a2a'
          }}>
            {grade.map(g => (
              <span
                key={g}
                onClick={() => setGrad(g)}
                style={{
                  padding: '0.4rem 0.9rem', borderRadius: '20px', cursor: 'pointer',
                  border: `1px solid ${grad === g ? '#ff6b00' : '#2a2a2a'}`,
                  background: grad === g ? 'rgba(255,107,0,0.15)' : '#111',
                  color: grad === g ? '#ff6b00' : '#aaa',
                  fontSize: '0.85rem', whiteSpace: 'nowrap',
                  transition: 'all 0.2s', flexShrink: 0
                }}
              >
                {g}
              </span>
            ))}
          </div>
        </div>

        {/* Beschreibung */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#aaa' }}>Beschreibung (optional)</label>
          <textarea
            placeholder="Tipps, Beta, besondere Merkmale..."
            value={beschreibung}
            onChange={e => setBeschreibung(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        {fehler && <p style={{ color: '#ff4444' }}>{fehler}</p>}

        <button
          className="btn"
          onClick={routeErstellen}
          disabled={laden}
          style={{ padding: '1rem' }}
        >
          {laden ? 'Erstellt...' : '🧗 Route erstellen'}
        </button>

      </div>
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

export default RouteErstellen