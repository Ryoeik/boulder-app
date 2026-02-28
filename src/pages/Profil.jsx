import { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabase'
import { Link } from 'react-router-dom'

// Fontainebleau-Grade in der richtigen Reihenfolge
// Wird für den Chart und die Sortierung gebraucht
const GRADE = ['4A','4B','4C','5A','5B','5C','6A','6A+','6B','6B+','6C','6C+','7A','7A+','7B','7B+','7C','7C+','8A']

// Farben für die drei Send-Arten
const TICK_FARBEN = {
  flash:       { bg: '#FFD700', text: '#000', label: '⚡ Flash' },
  second_try:  { bg: '#ff6b00', text: '#fff', label: '🔄 2nd Try' },
  done:        { bg: '#00c851', text: '#fff', label: '✅ Geschafft' },
}

function Profil() {
  const [nutzer, setNutzer]         = useState(null)
  const [profil, setProfil]         = useState(null)
  const [ticks, setSends]           = useState([])
  const [routen, setRouten]         = useState({})   // id → route objekt (als Map für schnellen Zugriff)
  const [heimhalle, setHeimhalle]   = useState(null)
  const [laden, setLaden]           = useState(true)

  // Bearbeitungs-States
  const [bearbeiten, setBearbeiten] = useState(false)
  const [username, setUsername]     = useState('')
  const [bio, setBio]               = useState('')
  const [speichern, setSpeichern]   = useState(false)
  const [fehler, setFehler]         = useState('')

  // Avatar Upload
  const [avatarLaden, setAvatarLaden] = useState(false)
  const dateiInput = useRef(null)

  // ─── Daten laden ────────────────────────────────────────────────────────────
  useEffect(() => {
    async function allesLaden() {
      // 1. Session holen
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) { setLaden(false); return }
      setNutzer(user)

      // 2. Profil aus unserer profiles-Tabelle laden
      //    .maybeSingle() statt .single() – wirft keinen Fehler wenn noch kein Profil existiert
      const { data: profilData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
      setProfil(profilData)
      setUsername(profilData?.username || '')
      setBio(profilData?.bio || '')

      // 3. Alle Sends des Nutzers laden
      const { data: tickDaten } = await supabase
        .from('ticks')
        .select('*')
        .eq('user_id', user.id)
        .order('ticked_at', { ascending: false })
      const alleSends = tickDaten || []
      setSends(alleSends)

      // 4. Zu jedem Tick die Route laden (Name, Grad, Farbe, gym_id)
      if (alleSends.length > 0) {
        const routenIds = [...new Set(alleSends.map(t => t.route_id))]
        const { data: routenDaten } = await supabase
          .from('routes')
          .select('id, name, setter_grade, color, section_id, gym_id')
          .in('id', routenIds)
        const routenMap = {}
        ;(routenDaten || []).forEach(r => { routenMap[r.id] = r })
        setRouten(routenMap)

        // 5. Heimhalle berechnen:
        //    Zähle pro gym_id wie viele Sends der Nutzer hat → höchste Zahl = Heimhalle
        const gymZaehler = {}
        alleSends.forEach(tick => {
          const route = routenMap[tick.route_id]
          if (route?.gym_id) {
            gymZaehler[route.gym_id] = (gymZaehler[route.gym_id] || 0) + 1
          }
        })
        const topGymId = Object.entries(gymZaehler).sort((a, b) => b[1] - a[1])[0]?.[0]
        if (topGymId) {
          const { data: gymData } = await supabase
            .from('gyms').select('id, name, city').eq('id', topGymId).single()
          setHeimhalle(gymData)
        }
      }

      setLaden(false)
    }
    allesLaden()
  }, [])

  // ─── Profil speichern ────────────────────────────────────────────────────────
  async function profilSpeichern() {
    setFehler('')
    if (username.trim().length < 3) {
      setFehler('Username muss mindestens 3 Zeichen lang sein.')
      return
    }
    setSpeichern(true)

    // upsert = insert wenn nicht vorhanden, update wenn vorhanden
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: nutzer.id, username: username.trim(), bio: bio.trim(), updated_at: new Date() })

    if (error?.code === '23505') {
      // 23505 = unique constraint violation → Username bereits vergeben
      setFehler('Dieser Username ist bereits vergeben.')
    } else if (error) {
      setFehler('Fehler beim Speichern. Bitte versuche es erneut.')
    } else {
      setProfil(prev => ({ ...prev, username: username.trim(), bio: bio.trim() }))
      setBearbeiten(false)
    }
    setSpeichern(false)
  }

  // ─── Avatar hochladen ────────────────────────────────────────────────────────
  async function avatarHochladen(e) {
    const datei = e.target.files[0]
    if (!datei) return

    // Client-seitige Prüfung (zusätzlich zur Bucket-Einstellung)
    if (datei.size > 5 * 1024 * 1024) {
      setFehler('Bild darf maximal 5 MB groß sein.')
      return
    }
    if (!datei.type.startsWith('image/')) {
      setFehler('Nur Bilddateien erlaubt.')
      return
    }

    setAvatarLaden(true)
    setFehler('')

    // Dateiname: userId/avatar.jpg (überschreibt immer das alte Bild)
    // So sammeln sich keine alten Bilder an
    const dateiEndung = datei.name.split('.').pop()
    const pfad = `${nutzer.id}/avatar.${dateiEndung}`

    const { error: uploadFehler } = await supabase.storage
      .from('avatars')
      .upload(pfad, datei, { upsert: true })  // upsert: true = überschreiben erlaubt

    if (uploadFehler) {
      setFehler('Upload fehlgeschlagen. Bitte versuche es erneut.')
      setAvatarLaden(false)
      return
    }

    // Öffentliche URL holen und im Profil speichern
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(pfad)

    await supabase
      .from('profiles')
      .upsert({ id: nutzer.id, avatar_url: publicUrl, updated_at: new Date() })

    setProfil(prev => ({ ...prev, avatar_url: publicUrl }))
    setAvatarLaden(false)
  }

  // ─── Chart-Daten berechnen ───────────────────────────────────────────────────

  // Schwierigkeitsverteilung: wie viele Sends pro Grad?
  const gradVerteilung = GRADE.map(grad => ({
    grad,
    anzahl: ticks.filter(t => routen[t.route_id]?.setter_grade === grad).length
  })).filter(g => g.anzahl > 0)  // Nur Grade mit mindestens 1 Tick anzeigen

  const maxGrad = Math.max(...gradVerteilung.map(g => g.anzahl), 1)

  // Sends pro Monat (letzte 6 Monate)
  const heute = new Date()
  const monate = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(heute.getFullYear(), heute.getMonth() - (5 - i), 1)
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('de-DE', { month: 'short' }),
      anzahl: 0
    }
  })
  ticks.forEach(tick => {
    const d = new Date(tick.ticked_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const monat = monate.find(m => m.key === key)
    if (monat) monat.anzahl++
  })
  const maxMonat = Math.max(...monate.map(m => m.anzahl), 1)

  // ─── Render ──────────────────────────────────────────────────────────────────
  if (laden) return <div className="container"><p>Lädt...</p></div>

  if (!nutzer) {
    return (
      <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>
        <h1>👤 Profil</h1>
        <p style={{ marginBottom: '2rem' }}>Du musst eingeloggt sein um dein Profil zu sehen.</p>
        <Link to="/login" className="btn">Zum Login</Link>
      </div>
    )
  }

  return (
    <div className="container" style={{ maxWidth: '800px' }}>

      {/* ── Profil Header ── */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>

        {/* Avatar */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div
            onClick={() => dateiInput.current?.click()}
            style={{
              width: '90px', height: '90px', borderRadius: '50%',
              background: profil?.avatar_url ? 'transparent' : '#ff6b00',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2.5rem', cursor: 'pointer', overflow: 'hidden',
              border: '3px solid #2a2a2a', position: 'relative'
            }}
          >
            {profil?.avatar_url
              ? <img src={profil.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : '🧗'
            }
            {/* Hover-Overlay */}
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: avatarLaden ? 1 : 0, transition: 'opacity 0.2s',
              fontSize: '1.2rem'
            }}>
              {avatarLaden ? '⏳' : '📷'}
            </div>
          </div>
          {/* Verstecktes File-Input */}
          <input
            ref={dateiInput}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={avatarHochladen}
          />
          <div style={{
            position: 'absolute', bottom: 0, right: 0,
            background: '#ff6b00', borderRadius: '50%',
            width: '26px', height: '26px', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: '0.8rem', cursor: 'pointer', border: '2px solid #111'
          }}
            onClick={() => dateiInput.current?.click()}
          >📷</div>
        </div>

        {/* Name + Bio */}
        <div style={{ flex: 1, minWidth: '200px' }}>
          {bearbeiten ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Username (min. 3 Zeichen)"
                maxLength={30}
                style={inputStyle}
              />
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Kurze Beschreibung über dich..."
                maxLength={200}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
              {fehler && <p style={{ color: '#ff4444', fontSize: '0.85rem', margin: 0 }}>{fehler}</p>}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn" onClick={profilSpeichern} disabled={speichern} style={{ fontSize: '0.9rem', padding: '0.4rem 1rem' }}>
                  {speichern ? 'Speichert...' : 'Speichern'}
                </button>
                <button onClick={() => { setBearbeiten(false); setFehler('') }} style={{
                  background: 'transparent', border: '1px solid #444',
                  color: '#aaa', padding: '0.4rem 1rem', borderRadius: '8px', cursor: 'pointer'
                }}>Abbrechen</button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h1 style={{ margin: 0, fontSize: '1.5rem' }}>
                  {profil?.username || nutzer.email}
                </h1>
                <button onClick={() => setBearbeiten(true)} style={{
                  background: 'transparent', border: '1px solid #333',
                  color: '#aaa', padding: '0.2rem 0.6rem',
                  borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem'
                }}>✏️ Bearbeiten</button>
              </div>
              {profil?.bio
                ? <p style={{ color: '#aaa', marginTop: '0.4rem' }}>{profil.bio}</p>
                : <p style={{ color: '#555', marginTop: '0.4rem', fontStyle: 'italic' }}>Noch keine Beschreibung – klick auf Bearbeiten</p>
              }
              <p style={{ color: '#555', fontSize: '0.85rem', marginTop: '0.4rem' }}>
                Mitglied seit {new Date(nutzer.created_at).toLocaleDateString('de-DE')}
              </p>
            </>
          )}
        </div>
      </div>

      {/* ── Heimhalle ── */}
      {heimhalle && (
        <div className="card" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🏠</span>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '0.1rem' }}>Heimhalle</div>
            <Link to={`/halle/${heimhalle.id}`} style={{ color: '#ff6b00', fontWeight: 'bold', textDecoration: 'none', fontSize: '1.1rem' }}>
              {heimhalle.name}
            </Link>
            <span style={{ color: '#666', fontSize: '0.85rem', marginLeft: '0.5rem' }}>📍 {heimhalle.city}</span>
          </div>
        </div>
      )}

      {/* ── Statistik-Kacheln ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { zahl: ticks.length,                                           label: 'Gesamt' },
          { zahl: ticks.filter(t => t.tick_type === 'flash').length,      label: '⚡ Flash' },
          { zahl: ticks.filter(t => t.tick_type === 'second_try').length, label: '🔄 2nd Try' },
          { zahl: ticks.filter(t => t.tick_type === 'done').length,       label: '✅ Geschafft' },
        ].map(({ zahl, label }) => (
          <div key={label} className="card" style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#ff6b00' }}>{zahl}</div>
            <div style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '0.2rem' }}>{label}</div>
          </div>
        ))}
      </div>

      {ticks.length > 0 && (
        <>
          {/* ── Schwierigkeitsverteilung ── */}
          <div className="card" style={{ marginBottom: '2rem' }}>
            <h2 style={{ marginBottom: '1.25rem' }}>📊 Schwierigkeitsverteilung</h2>
            {/*
              Reines CSS-Balkendiagramm – keine externe Library nötig.
              Jeder Balken ist ein div dessen Höhe relativ zum Maximum berechnet wird.
              align-items: flex-end sorgt dafür, dass die Balken unten ausgerichtet sind.
            */}
            <div style={{
              display: 'flex', alignItems: 'flex-end', gap: '6px',
              height: '120px', padding: '0 0.5rem'
            }}>
              {gradVerteilung.map(({ grad, anzahl }) => (
                <div key={grad} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.65rem', color: '#aaa' }}>{anzahl}</span>
                  <div style={{
                    width: '100%',
                    height: `${(anzahl / maxGrad) * 90}px`,
                    background: 'linear-gradient(to top, #ff6b00, #ff9f50)',
                    borderRadius: '4px 4px 0 0',
                    minHeight: '4px',
                    transition: 'height 0.3s'
                  }} />
                  <span style={{ fontSize: '0.65rem', color: '#aaa', transform: 'rotate(-45deg)', transformOrigin: 'center', whiteSpace: 'nowrap' }}>
                    {grad}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Sends pro Monat ── */}
          <div className="card" style={{ marginBottom: '2rem' }}>
            <h2 style={{ marginBottom: '1.25rem' }}>📅 Sends pro Monat</h2>
            {/*
              Linien-ähnlicher Chart als CSS-Balken (horizontal).
              Jede Zeile = ein Monat.
            */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {monate.map(({ label, anzahl }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ width: '35px', fontSize: '0.8rem', color: '#aaa', textAlign: 'right', flexShrink: 0 }}>{label}</span>
                  <div style={{ flex: 1, background: '#1a1a1a', borderRadius: '4px', height: '20px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${(anzahl / maxMonat) * 100}%`,
                      background: 'linear-gradient(to right, #ff6b00, #ff9f50)',
                      borderRadius: '4px',
                      minWidth: anzahl > 0 ? '4px' : '0',
                      transition: 'width 0.4s'
                    }} />
                  </div>
                  <span style={{ width: '20px', fontSize: '0.8rem', color: '#666' }}>{anzahl}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Send-Liste ── */}
      <h2 style={{ marginBottom: '1rem' }}>✅ Meine Sends</h2>
      {ticks.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Noch keine Routen gesendet.</p>
          <Link to="/" style={{ color: '#ff6b00' }}>Jetzt Hallen entdecken →</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '3rem' }}>
          {ticks.map(tick => {
            const route = routen[tick.route_id]
            const tickInfo = TICK_FARBEN[tick.tick_type] || TICK_FARBEN.done
            return (
              <Link
                key={tick.id}
                to={route ? `/route/${route.id}` : '#'}
                style={{ textDecoration: 'none' }}
              >
                <div className="card" style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  transition: 'border-color 0.2s'
                }}>
                  {/* Grifffarbe */}
                  <div style={{
                    width: '8px', alignSelf: 'stretch', borderRadius: '4px',
                    background: route?.color || '#444', flexShrink: 0
                  }} />
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: 'white' }}>{route?.name || 'Route gelöscht'}</strong>
                    <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.2rem' }}>
                      {new Date(tick.ticked_at).toLocaleDateString('de-DE')}
                    </div>
                  </div>
                  {/* Grad */}
                  {route?.setter_grade && (
                    <span style={{
                      background: 'rgba(255,107,0,0.15)', color: '#ff6b00',
                      padding: '0.2rem 0.6rem', borderRadius: '20px',
                      fontSize: '0.85rem', fontWeight: 'bold'
                    }}>{route.setter_grade}</span>
                  )}
                  {/* Send-Art Badge */}
                  <span style={{
                    background: tickInfo.bg, color: tickInfo.text,
                    padding: '0.2rem 0.6rem', borderRadius: '20px',
                    fontSize: '0.75rem', fontWeight: 'bold', whiteSpace: 'nowrap'
                  }}>{tickInfo.label}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '0.6rem 0.75rem',
  background: '#1a1a1a', border: '1px solid #2a2a2a',
  borderRadius: '8px', color: 'white', fontSize: '0.95rem',
  boxSizing: 'border-box'
}

export default Profil