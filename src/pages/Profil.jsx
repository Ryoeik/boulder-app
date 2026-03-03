import { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabase'
import { Link } from 'react-router-dom'
import AccountLoeschen from '../components/AccountLoeschen'
import { climberXPBerechnen } from '../utils/xpSystem'
import LevelAnzeige from '../components/LevelAnzeige'

const GRADE = ['4A','4B','4C','5A','5B','5C','6A','6A+','6B','6B+','6C','6C+','7A','7A+','7B','7B+','7C','7C+','8A']

const TICK_FARBEN = {
  flash:       { bg: '#FFD700', text: '#000', label: '⚡ Flash' },
  second_try:  { bg: '#ff6b00', text: '#fff', label: '🔄 2nd Try' },
  done:        { bg: '#00c851', text: '#fff', label: '✅ Geschafft' },
}

function Profil() {
  const [nutzer, setNutzer]         = useState(null)
  const [profil, setProfil]         = useState(null)
  const [ticks, setSends]           = useState([])
  const [routen, setRouten]         = useState({})
  const [heimhalle, setHeimhalle]   = useState(null)
  const [laden, setLaden]           = useState(true)
  const [filterGrad, setFilterGrad] = useState('')
  const [filterDatum, setFilterDatum] = useState('')

  const [bearbeiten, setBearbeiten] = useState(false)
  const [username, setUsername]     = useState('')
  const [bio, setBio]               = useState('')
  const [speichern, setSpeichern]   = useState(false)
  const [fehler, setFehler]         = useState('')

  const [avatarLaden, setAvatarLaden] = useState(false)
  const dateiInput = useRef(null)

  // ─── Daten laden ────────────────────────────────────────────────────────────
  useEffect(() => {
    async function allesLaden() {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) { setLaden(false); return }
      setNutzer(user)

      const { data: profilData } = await supabase
        .from('profiles').select('*').eq('id', user.id).maybeSingle()
      setProfil(profilData)
      setUsername(profilData?.username || '')
      setBio(profilData?.bio || '')

      const { data: tickDaten } = await supabase
        .from('ticks').select('*').eq('user_id', user.id)
        .order('ticked_at', { ascending: false })
      const alleSends = tickDaten || []
      setSends(alleSends)

      if (alleSends.length > 0) {
        const routenIds = [...new Set(alleSends.map(t => t.route_id))]
        const { data: routenDaten } = await supabase
          .from('routes').select('id, name, setter_grade, color, section_id, gym_id').in('id', routenIds)
        const routenMap = {}
        ;(routenDaten || []).forEach(r => { routenMap[r.id] = r })
        setRouten(routenMap)

        // Nur Ticks behalten deren Route noch existiert
        const aktiveTicks = alleSends.filter(t => routenMap[t.route_id])
        setSends(aktiveTicks)

        const gymZaehler = {}
        alleSends.forEach(tick => {
          const route = routenMap[tick.route_id]
          if (route?.gym_id) gymZaehler[route.gym_id] = (gymZaehler[route.gym_id] || 0) + 1
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
    const { error } = await supabase.from('profiles')
      .upsert({ id: nutzer.id, username: username.trim(), bio: bio.trim(), updated_at: new Date() })
    if (error?.code === '23505') {
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
    if (datei.size > 5 * 1024 * 1024) { setFehler('Bild darf maximal 5 MB groß sein.'); return }
    if (!datei.type.startsWith('image/')) { setFehler('Nur Bilddateien erlaubt.'); return }
    setAvatarLaden(true); setFehler('')
    const dateiEndung = datei.name.split('.').pop()
    const pfad = `${nutzer.id}/avatar.${dateiEndung}`
    const { error: uploadFehler } = await supabase.storage.from('avatars').upload(pfad, datei, { upsert: true })
    if (uploadFehler) { setFehler('Upload fehlgeschlagen. Bitte versuche es erneut.'); setAvatarLaden(false); return }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(pfad)
    await supabase.from('profiles').upsert({ id: nutzer.id, avatar_url: publicUrl, updated_at: new Date() })
    setProfil(prev => ({ ...prev, avatar_url: publicUrl }))
    setAvatarLaden(false)
  }

  // ─── Chart-Daten berechnen ───────────────────────────────────────────────────
  const climberXP = climberXPBerechnen(ticks, routen)

  // BY GRADES – nur Grade mit mind. 1 Send anzeigen
  const gradVerteilung = GRADE.map(grad => ({
    grad,
    anzahl: ticks.filter(t => routen[t.route_id]?.setter_grade === grad).length
  }))
  const gradVerteilungMitSends = gradVerteilung.filter(g => g.anzahl > 0)
  const maxGrad = Math.max(...gradVerteilung.map(g => g.anzahl), 1)

  // Sends pro Monat
  const heute = new Date()
  const monate = Array.from({ length: 12 }, (_, i) => {
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
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        {bearbeiten ? (
          /* Bearbeitungs-Modus */
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div onClick={() => dateiInput.current?.click()} style={{
                width: '80px', height: '80px', borderRadius: '50%',
                background: profil?.avatar_url ? 'transparent' : '#ff6b00',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2rem', cursor: 'pointer', overflow: 'hidden',
                border: '3px solid #2a2a2a', position: 'relative'
              }}>
                {profil?.avatar_url
                  ? <img src={profil.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : '🧗'}
                <div style={{
                  position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: avatarLaden ? 1 : 0, transition: 'opacity 0.2s', fontSize: '1.2rem'
                }}>{avatarLaden ? '⏳' : '📷'}</div>
              </div>
              <div style={{
                position: 'absolute', bottom: 0, right: 0, background: '#ff6b00',
                borderRadius: '50%', width: '24px', height: '24px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', cursor: 'pointer', border: '2px solid #111'
              }} onClick={() => dateiInput.current?.click()}>📷</div>
              <input ref={dateiInput} type="file" accept="image/*" style={{ display: 'none' }} onChange={avatarHochladen} />
            </div>
            <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input value={username} onChange={e => setUsername(e.target.value)}
                placeholder="Username (min. 3 Zeichen)" maxLength={30} style={inputStyle} />
              <textarea value={bio} onChange={e => setBio(e.target.value)}
                placeholder="Kurze Beschreibung über dich..." maxLength={200} rows={3}
                style={{ ...inputStyle, resize: 'vertical' }} />
              {fehler && <p style={{ color: '#ff4444', fontSize: '0.85rem', margin: 0 }}>{fehler}</p>}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn" onClick={profilSpeichern} disabled={speichern} style={{ flex: 1 }}>
                  {speichern ? '⏳' : '✅ Speichern'}
                </button>
                <button className="btn btn-outline" onClick={() => setBearbeiten(false)} style={{ flex: 1 }}>
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Anzeige-Modus – zentriert */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.6rem' }}>

            {/* Avatar mit Kamera-Overlay */}
            <div style={{ position: 'relative', marginBottom: '0.25rem' }}>
              <div onClick={() => dateiInput.current?.click()} style={{
                width: '90px', height: '90px', borderRadius: '50%',
                background: profil?.avatar_url ? 'transparent' : '#ff6b00',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2.5rem', cursor: 'pointer', overflow: 'hidden',
                border: '3px solid #2a2a2a', position: 'relative'
              }}>
                {profil?.avatar_url
                  ? <img src={profil.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : '🧗'}
                <div style={{
                  position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: avatarLaden ? 1 : 0, transition: 'opacity 0.2s', fontSize: '1.2rem'
                }}>{avatarLaden ? '⏳' : '📷'}</div>
              </div>
              <div style={{
                position: 'absolute', bottom: 0, right: 0, background: '#ff6b00',
                borderRadius: '50%', width: '26px', height: '26px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.8rem', cursor: 'pointer', border: '2px solid #111'
              }} onClick={() => dateiInput.current?.click()}>📷</div>
              <input ref={dateiInput} type="file" accept="image/*" style={{ display: 'none' }} onChange={avatarHochladen} />
            </div>

            {/* Name */}
            <h1 style={{ margin: 0, fontSize: '1.5rem' }}>
              {profil?.username || 'Kein Username'}
            </h1>

            {/* Bearbeiten-Button – subtil */}
            <button onClick={() => setBearbeiten(true)} style={{
              background: 'transparent', border: '1px solid #2a2a2a',
              color: '#555', borderRadius: '6px', padding: '0.2rem 0.7rem',
              cursor: 'pointer', fontSize: '0.78rem'
            }}>✏️ Bearbeiten</button>

            {/* Bio */}
            {profil?.bio ? (
              <p style={{ color: '#aaa', fontSize: '0.88rem', margin: '0.1rem 0', lineHeight: 1.5, maxWidth: '380px' }}>
                {profil.bio}
              </p>
            ) : (
              <p style={{ color: '#3a3a3a', fontSize: '0.82rem', margin: '0.1rem 0', fontStyle: 'italic' }}>
                Noch keine Bio – klicke auf Bearbeiten.
              </p>
            )}

            {/* Heimhalle */}
            {heimhalle && (
              <Link to={`/halle/${heimhalle.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: 'rgba(255,107,0,0.08)', border: '1px solid rgba(255,107,0,0.2)',
                  borderRadius: '20px', padding: '0.25rem 0.85rem',
                  fontSize: '0.8rem', color: '#ff6b00',
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem'
                }}>
                  🏠 {heimhalle.name}
                  <span style={{ color: '#555' }}>· {heimhalle.city}</span>
                </div>
              </Link>
            )}

            {/* Trennlinie */}
            <div style={{ width: '100%', height: '1px', background: '#1a1a1a', margin: '0.4rem 0' }} />

            {/* Statistiken – 3 Kacheln */}
            <div style={{ display: 'flex', width: '100%', justifyContent: 'space-around' }}>
              {[
                { zahl: ticks.length, label: 'Sends' },
                { zahl: ticks.filter(t => t.tick_type === 'flash').length, label: 'Flashes' },
                { zahl: ticks.length > 0
                    ? (routen[ticks.reduce((best, t) =>
                        GRADE.indexOf(routen[t.route_id]?.setter_grade) > GRADE.indexOf(routen[best.route_id]?.setter_grade) ? t : best,
                        ticks[0])?.route_id]?.setter_grade || '–')
                    : '–',
                  label: 'Bester Grad' },
              ].map(({ zahl, label }) => (
                <div key={label} style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#ff6b00', lineHeight: 1 }}>{zahl}</div>
                  <div style={{ fontSize: '0.72rem', color: '#555', marginTop: '0.25rem' }}>{label}</div>
                </div>
              ))}
            </div>

          </div>
        )}
      </div>

      {/* ── Climber Level ── */}
      <LevelAnzeige xp={climberXP} titel="🧗 Climber Level" />

      {ticks.length > 0 && (
        <>
          {/* ── Sends pro Monat ── */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1rem', color: '#aaa', letterSpacing: '0.1em' }}>SENDS PRO MONAT</h2>
              <span style={{ color: '#aaa', fontSize: '0.85rem' }}>{new Date().getFullYear()}</span>
            </div>
            <div style={{ position: 'relative' }}>
              {[0, 25, 50, 75, 100].map(pct => (
                <div key={pct} style={{
                  position: 'absolute', left: 0, right: 0,
                  bottom: `${pct}%`, height: '1px', background: 'rgba(255,255,255,0.05)'
                }} />
              ))}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '140px', padding: '0 0.25rem' }}>
                {monate.map(({ label, anzahl }) => (
                  <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    {anzahl > 0 && <span style={{ fontSize: '0.6rem', color: '#aaa' }}>{anzahl}</span>}
                    <div style={{
                      width: '100%',
                      height: `${maxMonat > 0 ? (anzahl / maxMonat) * 110 : 0}px`,
                      background: anzahl > 0 ? 'linear-gradient(to top, #4488ff, #44bbff)' : 'transparent',
                      borderRadius: '3px 3px 0 0',
                      minHeight: anzahl > 0 ? '4px' : '0',
                      transition: 'height 0.4s',
                      boxShadow: anzahl > 0 ? '0 0 8px rgba(68,136,255,0.4)' : 'none'
                    }} />
                    <span style={{ fontSize: '0.6rem', color: '#555' }}>{label}</span>
                  </div>
                ))}
              </div>
              <svg viewBox={`0 0 ${monate.length * 28} 140`} preserveAspectRatio="none"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '140px', pointerEvents: 'none' }}>
                <polyline
                  fill="none" stroke="#ff6b00" strokeWidth="1.5" strokeDasharray="3,2"
                  points={monate.map(({ anzahl }, i) => {
                    const x = i * 28 + 14
                    const y = maxMonat > 0 ? 140 - (anzahl / maxMonat) * 110 : 140
                    return `${x},${y}`
                  }).join(' ')}
                />
                {monate.map(({ anzahl }, i) => {
                  if (anzahl === 0) return null
                  const x = i * 28 + 14
                  const y = maxMonat > 0 ? 140 - (anzahl / maxMonat) * 110 : 140
                  return <circle key={i} cx={x} cy={y} r="3" fill="#ff6b00" stroke="#111" strokeWidth="1.5" />
                })}
              </svg>
            </div>
          </div>

          {/* ── BY GRADES – nur Grade mit Sends ── */}
          {gradVerteilungMitSends.length > 0 && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#aaa', letterSpacing: '0.1em' }}>BY GRADES</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[...gradVerteilungMitSends].reverse().map(({ grad, anzahl }) => (
                  <div key={grad} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ width: '40px', fontSize: '0.8rem', color: '#aaa', textAlign: 'right', flexShrink: 0 }}>{grad}</span>
                    <div style={{ flex: 1, background: '#111', borderRadius: '3px', height: '18px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${(anzahl / maxGrad) * 100}%`,
                        background: 'linear-gradient(to right, #4488ff, #44bbcc)',
                        borderRadius: '3px', transition: 'width 0.5s',
                        boxShadow: '0 0 6px rgba(68,136,255,0.3)'
                      }} />
                    </div>
                    <span style={{ width: '24px', fontSize: '0.8rem', color: '#aaa', textAlign: 'right', fontWeight: 'bold' }}>{anzahl}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Send-Liste ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h2 style={{ margin: 0 }}>✅ Meine Sends</h2>
      </div>

      {/* Filter */}
      <div style={{
        display: 'flex', gap: '0.75rem', alignItems: 'center',
        overflowX: 'auto', paddingBottom: '0.5rem',
        scrollbarWidth: 'none', marginBottom: '1rem'
      }}>
        <select value={filterGrad} onChange={e => setFilterGrad(e.target.value)} style={filterSelectStyle}>
          <option value="">Alle Grade</option>
          {GRADE.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={filterDatum} onChange={e => setFilterDatum(e.target.value)} style={filterSelectStyle}>
          <option value="">Alle Zeit</option>
          <option value="7">Letzte 7 Tage</option>
          <option value="30">Letzter Monat</option>
          <option value="90">Letzte 3 Monate</option>
          <option value="365">Letztes Jahr</option>
        </select>
        {(filterGrad || filterDatum) && (
          <button onClick={() => { setFilterGrad(''); setFilterDatum('') }} style={{
            background: 'transparent', border: '1px solid #444',
            color: '#aaa', padding: '0.5rem 0.75rem',
            borderRadius: '8px', cursor: 'pointer', flexShrink: 0
          }}>✕</button>
        )}
      </div>

      {ticks.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Noch keine Routen gesendet.</p>
          <Link to="/" style={{ color: '#ff6b00' }}>Jetzt Hallen entdecken →</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '3rem' }}>
          {ticks.filter(tick => {
            const route = routen[tick.route_id]
            if (filterGrad && route?.setter_grade !== filterGrad) return false
            if (filterDatum) {
              const tage = parseInt(filterDatum)
              const grenze = new Date()
              grenze.setDate(grenze.getDate() - tage)
              if (new Date(tick.ticked_at) < grenze) return false
            }
            return true
          }).map(tick => {
            const route = routen[tick.route_id]
            const tickInfo = TICK_FARBEN[tick.tick_type] || TICK_FARBEN.done
            return (
              <Link key={tick.id} to={route ? `/route/${route.id}` : '#'} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', transition: 'border-color 0.2s' }}>
                  <div style={{ width: '6px', alignSelf: 'stretch', borderRadius: '3px', background: route?.color || '#333', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ color: 'white', fontSize: '0.95rem' }}>{route?.name || 'Route gelöscht'}</strong>
                    <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '0.15rem' }}>
                      {new Date(tick.ticked_at).toLocaleDateString('de-DE')}
                    </div>
                  </div>
                  {route?.setter_grade && (
                    <span style={{ background: 'rgba(255,107,0,0.15)', color: '#ff6b00', padding: '0.15rem 0.5rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', flexShrink: 0 }}>
                      {route.setter_grade}
                    </span>
                  )}
                  <span style={{ background: tickInfo.bg, color: tickInfo.text, padding: '0.15rem 0.5rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 'bold', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {tickInfo.label}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* ── Account löschen ── */}
      <AccountLoeschen nutzer={nutzer} />
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '0.6rem 0.75rem',
  background: '#1a1a1a', border: '1px solid #2a2a2a',
  borderRadius: '8px', color: 'white', fontSize: '0.95rem',
  boxSizing: 'border-box'
}

const filterSelectStyle = {
  padding: '0.5rem 0.75rem', borderRadius: '8px',
  border: '1px solid #2a2a2a', background: '#111',
  color: 'white', fontSize: '0.9rem', cursor: 'pointer', flexShrink: 0
}

export default Profil