import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

function HalleErstellen() {
  const [name, setName] = useState('')
  const [stadt, setStadt] = useState('')
  const [adresse, setAdresse] = useState('')
  const [beschreibung, setBeschreibung] = useState('')
  const [laden, setLaden] = useState(false)
  const [fehler, setFehler] = useState('')
  const navigate = useNavigate()

  async function halleErstellen() {
    if (!name.trim() || !stadt.trim()) {
      setFehler('Name und Stadt sind Pflichtfelder!')
      return
    }

    setLaden(true)
    setFehler('')

    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      setFehler('Du musst eingeloggt sein!')
      setLaden(false)
      return
    }

    const { data, error } = await supabase.from('gyms').insert({
      name: name.trim(),
      city: stadt.trim(),
      address: adresse.trim(),
      description: beschreibung.trim(),
      created_by: session.user.id,
      is_certified: false
    }).select().single()

    if (error) {
      setFehler('Fehler: ' + error.message)
      setLaden(false)
      return
    }

    navigate('/halle/' + data.id)
  }

  return (
    <div className="container" style={{ maxWidth: '600px' }}>
      <h1>🏟️ Neue Halle erstellen</h1>
      <p style={{ marginBottom: '2rem' }}>Erstelle eine neue Boulderhalle für die Community</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Name */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#aaa' }}>
            Hallenname *
          </label>
          <input
            type="text"
            placeholder="z.B. Boulder World München"
            value={name}
            onChange={e => setName(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Stadt */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#aaa' }}>
            Stadt *
          </label>
          <input
            type="text"
            placeholder="z.B. München"
            value={stadt}
            onChange={e => setStadt(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Adresse */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#aaa' }}>
            Adresse (optional)
          </label>
          <input
            type="text"
            placeholder="z.B. Musterstraße 1"
            value={adresse}
            onChange={e => setAdresse(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Beschreibung */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#aaa' }}>
            Beschreibung (optional)
          </label>
          <textarea
            placeholder="Erzähl der Community etwas über diese Halle..."
            value={beschreibung}
            onChange={e => setBeschreibung(e.target.value)}
            rows={4}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        {/* Fehler */}
        {fehler && (
          <p style={{ color: '#ff4444' }}>{fehler}</p>
        )}

        {/* Info Box */}
        <div style={{
          background: 'rgba(255,107,0,0.1)',
          border: '1px solid rgba(255,107,0,0.3)',
          borderRadius: '8px',
          padding: '1rem'
        }}>
          <p style={{ color: '#ff6b00', fontSize: '0.9rem' }}>
            ℹ️ Neue Hallen starten als Community-Hallen. Du kannst später eine Zertifizierung beantragen.
          </p>
        </div>

        {/* Button */}
        <button
          className="btn"
          onClick={halleErstellen}
          disabled={laden}
          style={{ padding: '1rem' }}
        >
          {laden ? 'Erstellt...' : '🏟️ Halle erstellen'}
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

export default HalleErstellen