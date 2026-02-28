import { useState } from 'react'
import { supabase } from '../supabase'

function Login() {
  const [email, setEmail] = useState('')
  const [passwort, setPasswort] = useState('')
  const [istRegistrierung, setIstRegistrierung] = useState(false)
  const [laden, setLaden] = useState(false)
  const [nachricht, setNachricht] = useState('')

  async function handleSubmit() {
    setLaden(true)
    setNachricht('')

    if (istRegistrierung) {
      const { error } = await supabase.auth.signUp({ email, password: passwort })
      if (error) {
        setNachricht('Fehler: ' + error.message)
      } else {
        setNachricht('✅ Bestätigungsmail gesendet! Bitte prüfe dein Postfach.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password: passwort })
      if (error) {
        setNachricht('Fehler: ' + error.message)
      } else {
        setNachricht('✅ Erfolgreich eingeloggt!')
      }
    }
    setLaden(false)
  }

  return (
    <div className="container" style={{ maxWidth: '400px' }}>
      <h1>{istRegistrierung ? '📝 Registrieren' : '🔐 Login'}</h1>
      <p style={{ marginBottom: '2rem' }}>
        {istRegistrierung ? 'Erstelle ein neues Konto' : 'Melde dich an'}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input
          type="email"
          placeholder="E-Mail"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Passwort"
          value={passwort}
          onChange={e => setPasswort(e.target.value)}
          style={inputStyle}
        />

        <button className="btn" onClick={handleSubmit} disabled={laden}>
          {laden ? 'Lädt...' : istRegistrierung ? 'Registrieren' : 'Einloggen'}
        </button>

        {nachricht && (
          <p style={{ color: nachricht.includes('Fehler') ? '#ff4444' : '#00c851' }}>
            {nachricht}
          </p>
        )}

        <p style={{ textAlign: 'center' }}>
          {istRegistrierung ? 'Schon ein Konto?' : 'Noch kein Konto?'}{' '}
          <span
            onClick={() => setIstRegistrierung(!istRegistrierung)}
            style={{ color: '#ff6b00', cursor: 'pointer' }}
          >
            {istRegistrierung ? 'Einloggen' : 'Registrieren'}
          </span>
        </p>
      </div>
    </div>
  )
}

const inputStyle = {
  padding: '0.75rem',
  borderRadius: '8px',
  border: '1px solid #2a2a2a',
  background: '#1a1a1a',
  color: 'white',
  fontSize: '1rem',
}

export default Login