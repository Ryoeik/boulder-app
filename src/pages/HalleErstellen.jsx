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

    // Ersteller wird automatisch Admin der Halle
    await supabase.from('gym_members').insert({
      gym_id: data.id,
      user_id: session.user.id,
      role: 'admin'
    })

    navigate('/halle/' + data.id)
  }

  return (
    <div style={pageWrapper}>
      <div style={cardStyle}>
        
        {/* Header mit Zurück-Button */}
        <header style={headerStyle}>
          <button 
            onClick={() => navigate(-1)} 
            style={backButtonStyle}
            title="Zurück"
          >
            ←
          </button>
          
          <div style={iconCircle}>🏟️</div>
          <h1 style={titleStyle}>Neue Halle erstellen</h1>
          <p style={subtitleStyle}>Bereichere die Community mit einem neuen Boulder-Spot.</p>
        </header>

        <div style={formContainer}>
          {/* Sektion: Basis Infos */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Hallenname <span style={{color: '#ff6b00'}}>*</span></label>
            <input
              type="text"
              placeholder="z.B. Boulder World München"
              value={name}
              onChange={e => setName(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={rowStyle}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Stadt <span style={{color: '#ff6b00'}}>*</span></label>
              <input
                type="text"
                placeholder="z.B. München"
                value={stadt}
                onChange={e => setStadt(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Adresse (optional)</label>
              <input
                type="text"
                placeholder="Musterstraße 1"
                value={adresse}
                onChange={e => setAdresse(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={sectionStyle}>
            <label style={labelStyle}>Beschreibung</label>
            <textarea
              placeholder="Was macht diese Halle besonders? (Griffe, Atmosphäre, Kaffee...)"
              value={beschreibung}
              onChange={e => setBeschreibung(e.target.value)}
              rows={4}
              style={{ ...inputStyle, resize: 'none' }}
            />
          </div>

          {/* Info Box */}
          <div style={infoBoxStyle}>
            <span style={{ fontSize: '1.2rem' }}>ℹ️</span>
            <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: '1.4' }}>
              Neue Hallen starten als <strong>Community-Projekt</strong>. Du wirst automatisch <strong>Admin</strong> der Halle. Offizielle Hallenbetreiber können später die Verifizierung beantragen.
            </p>
          </div>

          {/* Fehleranzeige */}
          {fehler && (
            <div style={errorContainer}>
              ⚠️ {fehler}
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={halleErstellen}
            disabled={laden}
            style={{
              ...submitButtonStyle,
              opacity: laden ? 0.6 : 1,
              cursor: laden ? 'not-allowed' : 'pointer'
            }}
          >
            {laden ? 'Halle wird registriert...' : 'Halle jetzt veröffentlichen'}
          </button>
        </div>
      </div>
    </div>
  )
}

// --- Styles ---

const pageWrapper = {
  padding: '40px 20px',
  display: 'flex',
  justifyContent: 'center',
  minHeight: '80vh'
}

const cardStyle = {
  width: '100%',
  maxWidth: '550px',
  background: '#111',
  borderRadius: '24px',
  border: '1px solid #222',
  boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
  overflow: 'hidden',
  position: 'relative'
}

const headerStyle = {
  padding: '40px 40px 20px 40px',
  textAlign: 'center',
  background: 'linear-gradient(to bottom, #1a1a1a, #111)',
  position: 'relative'
}

const backButtonStyle = {
  position: 'absolute',
  left: '20px',
  top: '20px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid #333',
  color: 'white',
  width: '40px',
  height: '40px',
  borderRadius: '12px',
  cursor: 'pointer',
  fontSize: '1.2rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.2s'
}

const iconCircle = {
  width: '60px',
  height: '60px',
  background: 'rgba(255,107,0,0.1)',
  borderRadius: '18px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '2rem',
  margin: '0 auto 15px auto',
  border: '1px solid rgba(255,107,0,0.2)'
}

const titleStyle = {
  fontSize: '1.5rem',
  fontWeight: '800',
  color: 'white',
  margin: '0 0 8px 0',
  letterSpacing: '-0.5px'
}

const subtitleStyle = {
  color: '#666',
  fontSize: '0.9rem',
  margin: 0
}

const formContainer = {
  padding: '20px 40px 40px 40px',
  display: 'flex',
  flexDirection: 'column',
  gap: '20px'
}

const sectionStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px'
}

const rowStyle = {
  display: 'flex',
  gap: '15px',
  flexWrap: 'wrap'
}

const labelStyle = {
  fontSize: '0.75rem',
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  color: '#444',
  marginLeft: '4px'
}

const inputStyle = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: '12px',
  border: '1px solid #222',
  background: '#0a0a0a',
  color: 'white',
  fontSize: '1rem',
  boxSizing: 'border-box',
  transition: 'all 0.2s ease',
  outline: 'none'
}

const infoBoxStyle = {
  background: 'rgba(255,107,0,0.05)',
  border: '1px solid rgba(255,107,0,0.15)',
  borderRadius: '14px',
  padding: '15px',
  display: 'flex',
  gap: '12px',
  alignItems: 'center',
  color: '#ff6b00'
}

const errorContainer = {
  background: 'rgba(255,68,68,0.1)',
  border: '1px solid rgba(255,68,68,0.2)',
  color: '#ff4444',
  padding: '12px',
  borderRadius: '10px',
  fontSize: '0.85rem',
  textAlign: 'center'
}

const submitButtonStyle = {
  marginTop: '10px',
  padding: '16px',
  borderRadius: '14px',
  border: 'none',
  background: '#ff6b00',
  color: 'white',
  fontSize: '1rem',
  fontWeight: '700',
  boxShadow: '0 4px 15px rgba(255,107,0,0.3)',
  transition: 'transform 0.2s ease, background 0.2s ease'
}

export default HalleErstellen