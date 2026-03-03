import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [passwort, setPasswort] = useState('')
  const [eingegebenerCode, setEingegebenerCode] = useState('')
  const [istRegistrierung, setIstRegistrierung] = useState(false)
  const [schritt, setSchritt] = useState('email') // 'email' | 'code' | 'passwort'
  const [laden, setLaden] = useState(false)
  const [nachricht, setNachricht] = useState('')

    // Schritt 1: Code anfordern
    async function codeAnfordern() {
    setLaden(true)
    setNachricht('')

    // Prüfen ob E-Mail bereits registriert ist
    const { data: bereitsRegistriert } = await supabase
      .from('registration_codes')
      .select('id')
      .eq('email', email)
      .eq('used', true)
      .maybeSingle() // ← maybeSingle statt single!

    if (bereitsRegistriert) {
      setNachricht('Fehler: Diese E-Mail ist bereits registriert. Bitte einloggen.')
      setLaden(false)
      return
    }

    const { error } = await supabase.functions.invoke('send-registration-code', {
      body: { email }
    })

    if (error) {
      setNachricht('Fehler: Code konnte nicht gesendet werden.')
    } else {
      setNachricht('Code wurde an den Admin gesendet. Du erhältst ihn gleich.')
      setSchritt('code')
    }
    setLaden(false)
  }

  // Schritt 2: Code prüfen
  async function codePruefen() {
    setLaden(true)
    setNachricht('')
    const { data, error } = await supabase
      .from('registration_codes')
      .select('*')
      .eq('code', eingegebenerCode.trim())
      .eq('email', email)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .single()

    if (error || !data) {
      setNachricht('Fehler: Ungültiger oder abgelaufener Code.')
    } else {
      setSchritt('passwort')
      setNachricht('')
    }
    setLaden(false)
  }

  // Schritt 3: Registrieren
  async function registrieren() {
    setLaden(true)
    setNachricht('')

    const { data: codeData } = await supabase
      .from('registration_codes')
      .select('id')
      .eq('code', eingegebenerCode.trim())
      .eq('email', email)
      .eq('used', false)
      .single()

    const { error } = await supabase.auth.signUp({ email, password: passwort })

    if (error) {
      setNachricht('Fehler: ' + error.message)
    } else {
      await supabase
        .from('registration_codes')
        .update({ used: true })
        .eq('id', codeData.id)
      setNachricht('✓ Konto erstellt! Bitte bestätige deine E-Mail.')
    }
    setLaden(false)
  }

  // Login
  async function einloggen() {
    setLaden(true)
    setNachricht('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: passwort })
    if (error) {
      setNachricht('Fehler: ' + error.message)
    } else {
      navigate('/')
    }
    setLaden(false)
  }

  function handleSubmit() {
    if (!istRegistrierung) return einloggen()
    if (schritt === 'email') return codeAnfordern()
    if (schritt === 'code') return codePruefen()
    if (schritt === 'passwort') return registrieren()
  }

  function zurueck() {
    setSchritt('email')
    setNachricht('')
    setEingegebenerCode('')
  }

  return (
    <div className="container" style={{ maxWidth: '400px' }}>
      <h1>{istRegistrierung ? 'Registrieren' : 'Login'}</h1>
      <p style={{ marginBottom: '2rem' }}>
        {!istRegistrierung && 'Melde dich an'}
        {istRegistrierung && schritt === 'email' && 'Gib deine E-Mail ein'}
        {istRegistrierung && schritt === 'code' && 'Code eingeben'}
        {istRegistrierung && schritt === 'passwort' && 'Passwort festlegen'}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {(schritt === 'email' || !istRegistrierung) && (
          <input
            type="email"
            placeholder="E-Mail"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={inputStyle}
          />
        )}

        {istRegistrierung && schritt === 'code' && (
          <input
            type="text"
            placeholder="6-stelliger Code"
            value={eingegebenerCode}
            onChange={e => setEingegebenerCode(e.target.value)}
            maxLength={6}
            style={{ ...inputStyle, letterSpacing: '0.5rem', fontSize: '1.4rem', textAlign: 'center' }}
          />
        )}

        {(!istRegistrierung || schritt === 'passwort') && (
          <input
            type="password"
            placeholder="Passwort"
            value={passwort}
            onChange={e => setPasswort(e.target.value)}
            style={inputStyle}
          />
        )}

        <button className="btn" onClick={handleSubmit} disabled={laden}>
          {laden ? 'Lädt...' :
            !istRegistrierung ? 'Einloggen' :
            schritt === 'email' ? 'Code anfordern' :
            schritt === 'code' ? 'Code bestätigen' :
            'Konto erstellen'}
        </button>

        {istRegistrierung && schritt !== 'email' && (
          <button onClick={zurueck} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
            ← Zurück
          </button>
        )}

        {nachricht && (
          <p style={{ color: nachricht.includes('Fehler') ? '#ff4444' : '#00c851' }}>
            {nachricht}
          </p>
        )}

        <p style={{ textAlign: 'center' }}>
          {istRegistrierung ? 'Schon ein Konto?' : 'Noch kein Konto?'}{' '}
          <span
            onClick={() => { setIstRegistrierung(!istRegistrierung); setSchritt('email'); setNachricht('') }}
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