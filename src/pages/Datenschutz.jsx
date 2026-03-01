import { Link } from 'react-router-dom'

function Datenschutz() {
  return (
    <div className="container" style={{ maxWidth: '700px' }}>
      <Link to="/" style={{ color: '#aaa', textDecoration: 'none', fontSize: '0.9rem' }}>
        ← Zurück
      </Link>
      <h1 style={{ marginTop: '0.5rem' }}>🔒 Datenschutzerklärung</h1>
      <p style={{ color: '#aaa', marginBottom: '2rem' }}>Stand: März 2026</p>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2>1. Allgemeine Hinweise</h2>
        <p style={{ color: '#aaa', lineHeight: '1.7' }}>
          BoulderApp ist ein privates, nicht-kommerzielles Community-Projekt ohne Gewinnabsicht.
          Es wird von einer Privatperson betrieben und dient ausschließlich der Boulder-Community
          als Plattform zum Austausch. Es besteht keinerlei Haftung für die Richtigkeit,
          Vollständigkeit oder Aktualität der bereitgestellten Inhalte.
        </p>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2>2. Welche Daten werden gespeichert?</h2>
        <p style={{ color: '#aaa', lineHeight: '1.7', marginBottom: '1rem' }}>
          Folgende Daten werden beim Erstellen eines Accounts gespeichert:
        </p>
        <ul style={{ color: '#aaa', lineHeight: '2', paddingLeft: '1.5rem' }}>
          <li>E-Mail-Adresse (für Login)</li>
          <li>Freiwillig angegebener Benutzername</li>
          <li>Freiwillig hochgeladene Profilbilder</li>
          <li>Hochgeladene Routenbilder und Videos</li>
          <li>Aktivitäten wie gekletterte Routen, Bewertungen und Kommentare</li>
        </ul>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2>3. Wo werden Daten gespeichert?</h2>
        <p style={{ color: '#aaa', lineHeight: '1.7' }}>
          Alle Daten werden über <strong style={{ color: 'white' }}>Supabase</strong> gespeichert,
          einem Datenbankdienst mit Servern in der EU (Frankfurt, Deutschland).
          Supabase ist DSGVO-konform. Weitere Informationen unter{' '}
          <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer"
            style={{ color: '#ff6b00' }}>supabase.com/privacy</a>.
        </p>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2>4. Weitergabe an Dritte</h2>
        <p style={{ color: '#aaa', lineHeight: '1.7' }}>
          Deine Daten werden nicht an Dritte weitergegeben, verkauft oder für Werbezwecke genutzt.
          Die App enthält keine Werbung und kein Tracking.
        </p>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2>5. Deine Rechte</h2>
        <p style={{ color: '#aaa', lineHeight: '1.7' }}>
          Du hast jederzeit das Recht deine Daten einzusehen, zu berichtigen oder zu löschen.
          Um deinen Account und alle damit verbundenen Daten zu löschen, kannst du dich
          über dein Profil abmelden. Für eine vollständige Datenlöschung wende dich an
          den Betreiber über GitHub.
        </p>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2>6. Cookies</h2>
        <p style={{ color: '#aaa', lineHeight: '1.7' }}>
          Die App verwendet nur technisch notwendige Cookies für den Login-Status.
          Es werden keine Tracking- oder Werbe-Cookies verwendet.
        </p>
      </div>

      <div className="card" style={{ marginBottom: '3rem' }}>
        <h2>7. Kontakt</h2>
        <p style={{ color: '#aaa', lineHeight: '1.7' }}>
          Bei Fragen zum Datenschutz oder zur Löschung deiner Daten wende dich an den
          Betreiber über das GitHub Repository:{' '}
          <a href="https://github.com/Ryoeik/boulder-app" target="_blank" rel="noopener noreferrer"
            style={{ color: '#ff6b00' }}>github.com/Ryoeik/boulder-app</a>
        </p>
      </div>
    </div>
  )
}

export default Datenschutz