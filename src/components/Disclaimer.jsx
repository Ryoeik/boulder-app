import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

function Disclaimer() {
  const [zeigeDisclaimer, setZeigeDisclaimer] = useState(false)

  useEffect(() => {
    const bestaetigt = localStorage.getItem('disclaimer-bestaetigt')
    if (!bestaetigt) setZeigeDisclaimer(true)
  }, [])

  function bestaetigen() {
    localStorage.setItem('disclaimer-bestaetigt', 'true')
    setZeigeDisclaimer(false)
  }

  if (!zeigeDisclaimer) return null

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 99999, padding: '1rem'
    }}>
      <div style={{
        background: '#1a1a1a', borderRadius: '16px',
        border: '1px solid #2a2a2a',
        width: '100%', maxWidth: '500px',
        padding: '2rem', maxHeight: '90vh', overflowY: 'auto'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '3rem' }}>🧗</div>
          <h1 style={{ fontSize: '1.5rem', marginTop: '0.5rem' }}>BoulderApp</h1>
        </div>

        <div style={{
          background: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.3)',
          borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem'
        }}>
          <h2 style={{ color: '#ff6b00', marginBottom: '0.75rem', fontSize: '1rem' }}>
            ⚠️ Hinweis
          </h2>
          <p style={{ color: '#aaa', lineHeight: '1.7', fontSize: '0.9rem' }}>
            BoulderApp ist ein <strong style={{ color: 'white' }}>privates Amateur-Projekt</strong> ohne
            kommerzielle Absichten. Die App wird von einer Privatperson entwickelt und betrieben.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            'Es wird keine Haftung für die Richtigkeit oder Vollständigkeit der Inhalte übernommen.',
            'Die App kann jederzeit ohne Vorankündigung geändert oder eingestellt werden.',
            'Deine E-Mail-Adresse wird für den Login gespeichert. Keine Weitergabe an Dritte.',
            'Keine Werbung, kein Tracking, keine Weitergabe von Daten.'
          ].map((text, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <span style={{ color: '#ff6b00', flexShrink: 0 }}>•</span>
              <p style={{ color: '#aaa', fontSize: '0.9rem', lineHeight: '1.6' }}>{text}</p>
            </div>
          ))}
        </div>

        <p style={{ color: '#666', fontSize: '0.8rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          Mit dem Klick auf "Verstanden" akzeptierst du die{' '}
          <Link to="/datenschutz" onClick={bestaetigen} style={{ color: '#ff6b00' }}>
            Datenschutzerklärung
          </Link>.
        </p>

        <button
          onClick={bestaetigen}
          className="btn"
          style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}
        >
          ✅ Verstanden & Weiter
        </button>
      </div>
    </div>
  )
}

export default Disclaimer