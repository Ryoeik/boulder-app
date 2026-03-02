import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

function SuperAdminPanel() {
  const navigate = useNavigate()
  const [istSuperAdmin, setIstSuperAdmin] = useState(false)
  const [laden, setLaden] = useState(true)
  const [hallen, setHallen] = useState([])
  const [nutzer, setNutzer] = useState([])
  const [tab, setTab] = useState('hallen') // 'hallen' | 'nutzer'
  const [sucheHalle, setSucheHalle] = useState('')
  const [sucheNutzer, setSucheNutzer] = useState('')
  const [fehler, setFehler] = useState('')
  const [erfolg, setErfolg] = useState('')

  useEffect(() => {
    async function datenLaden() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { navigate('/login'); return }

      const { data: profil } = await supabase
        .from('profiles').select('is_app_admin').eq('id', session.user.id).single()

      if (!profil?.is_app_admin) { navigate('/'); return }
      setIstSuperAdmin(true)

      const [{ data: hallenData }, { data: nutzerData }] = await Promise.all([
        supabase.from('gyms').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false })
      ])

      setHallen(hallenData || [])
      setNutzer(nutzerData || [])
      setLaden(false)
    }
    datenLaden()
  }, [])

  function zeigeErfolg(msg) { setErfolg(msg); setTimeout(() => setErfolg(''), 3000) }

  async function halleLoeschen(gymId, gymName) {
    if (!window.confirm(`Halle "${gymName}" wirklich löschen? Alle Daten gehen verloren!`)) return
    const { error } = await supabase.from('gyms').delete().eq('id', gymId)
    if (error) { setFehler('Fehler: ' + error.message); return }
    setHallen(prev => prev.filter(h => h.id !== gymId))
    zeigeErfolg(`Halle "${gymName}" gelöscht.`)
  }

  async function nutzerkontoLoeschen(userId, username) {
    if (!window.confirm(`Konto von "${username}" wirklich löschen? Ticks, Kommentare und Bewertungen werden entfernt!`)) return

    await supabase.from('ticks').delete().eq('user_id', userId)
    await supabase.from('comments').delete().eq('user_id', userId)
    await supabase.from('route_ratings').delete().eq('user_id', userId)
    await supabase.from('gym_members').delete().eq('user_id', userId)
    await supabase.from('gym_bans').delete().eq('user_id', userId)
    await supabase.from('profiles').delete().eq('id', userId)

    setNutzer(prev => prev.filter(n => n.id !== userId))
    zeigeErfolg(`Konto "${username}" gelöscht. Auth-Account muss manuell im Supabase Dashboard entfernt werden.`)
  }

  async function superAdminToggle(userId, username, aktuellerWert) {
    const neuerWert = !aktuellerWert
    const { error } = await supabase
      .from('profiles').update({ is_app_admin: neuerWert }).eq('id', userId)
    if (error) { setFehler('Fehler: ' + error.message); return }
    setNutzer(prev => prev.map(n => n.id === userId ? { ...n, is_app_admin: neuerWert } : n))
    zeigeErfolg(`${username} ist jetzt ${neuerWert ? 'Super Admin' : 'normaler Nutzer'}.`)
  }

  const gefilterteHallen = hallen.filter(h =>
    h.name?.toLowerCase().includes(sucheHalle.toLowerCase()) ||
    h.city?.toLowerCase().includes(sucheHalle.toLowerCase())
  )

  const gefilterteNutzer = nutzer.filter(n =>
    n.username?.toLowerCase().includes(sucheNutzer.toLowerCase()) ||
    n.email?.toLowerCase().includes(sucheNutzer.toLowerCase())
  )

  if (laden) return <div className="container"><p>Lädt...</p></div>
  if (!istSuperAdmin) return null

  return (
    <div className="container" style={{ maxWidth: '800px', paddingBottom: '3rem' }}>
      <Link to="/" style={{ color: '#aaa', textDecoration: 'none', fontSize: '0.9rem' }}>← Startseite</Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '0.5rem 0 0.25rem' }}>
        <h1>👑 Super Admin Panel</h1>
      </div>
      <p style={{ color: '#555', marginBottom: '2rem', fontSize: '0.9rem' }}>
        {hallen.length} Hallen · {nutzer.length} Nutzer
      </p>

      {fehler && <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid #ff4444', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#ff4444' }}>{fehler}</div>}
      {erfolg && <div style={{ background: 'rgba(0,200,81,0.1)', border: '1px solid #00c851', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#00c851' }}>✅ {erfolg}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {[['hallen', `🏟️ Hallen (${hallen.length})`], ['nutzer', `👥 Nutzer (${nutzer.length})`]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            background: tab === key ? 'rgba(255,107,0,0.15)' : '#1a1a1a',
            border: `1px solid ${tab === key ? '#ff6b00' : '#2a2a2a'}`,
            color: tab === key ? '#ff6b00' : '#aaa',
            padding: '0.6rem 1.2rem', borderRadius: '10px',
            cursor: 'pointer', fontWeight: tab === key ? 'bold' : 'normal'
          }}>{label}</button>
        ))}
      </div>

      {/* ── Hallen Tab ── */}
      {tab === 'hallen' && (
        <div>
          <input
            value={sucheHalle} onChange={e => setSucheHalle(e.target.value)}
            placeholder="🔍 Halle suchen..."
            style={inputStyle}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
            {gefilterteHallen.map(halle => (
              <div key={halle.id} style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                background: '#111', borderRadius: '12px', padding: '0.75rem 1rem',
                border: '1px solid #1a1a1a'
              }}>
                {/* Bild */}
                <div style={{
                  width: '44px', height: '44px', borderRadius: '8px',
                  background: '#1a1a1a', border: '1px solid #2a2a2a',
                  overflow: 'hidden', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0
                }}>
                  {halle.image_url
                    ? <img src={halle.image_url} alt={halle.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : '🏟️'}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link to={`/halle/${halle.id}`} style={{ textDecoration: 'none' }}>
                    <strong style={{ color: 'white' }}>{halle.name}</strong>
                  </Link>
                  <div style={{ fontSize: '0.8rem', color: '#555', marginTop: '0.15rem' }}>
                    📍 {halle.city} · {new Date(halle.created_at).toLocaleDateString('de-DE')}
                    {halle.is_certified && <span style={{ color: '#00c851', marginLeft: '0.5rem' }}>✓ Zertifiziert</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <Link to={`/halle/${halle.id}/einstellungen`} style={{
                    background: 'rgba(255,107,0,0.1)', border: '1px solid #ff6b00',
                    color: '#ff6b00', padding: '0.35rem 0.7rem',
                    borderRadius: '6px', textDecoration: 'none', fontSize: '0.8rem'
                  }}>⚙️</Link>
                  <button onClick={() => halleLoeschen(halle.id, halle.name)} style={{
                    background: 'rgba(255,68,68,0.1)', border: '1px solid #ff4444',
                    color: '#ff4444', padding: '0.35rem 0.7rem',
                    borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem'
                  }}>🗑️</button>
                </div>
              </div>
            ))}
            {gefilterteHallen.length === 0 && <p style={{ color: '#555', textAlign: 'center', padding: '2rem' }}>Keine Hallen gefunden.</p>}
          </div>
        </div>
      )}

      {/* ── Nutzer Tab ── */}
      {tab === 'nutzer' && (
        <div>
          <input
            value={sucheNutzer} onChange={e => setSucheNutzer(e.target.value)}
            placeholder="🔍 Nutzer suchen..."
            style={inputStyle}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
            {gefilterteNutzer.map(n => (
              <div key={n.id} style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                background: '#111', borderRadius: '12px', padding: '0.75rem 1rem',
                border: `1px solid ${n.is_app_admin ? 'rgba(255,107,0,0.3)' : '#1a1a1a'}`
              }}>
                {/* Avatar */}
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: n.is_app_admin ? '#ff6b00' : '#2a2a2a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.1rem', flexShrink: 0, overflow: 'hidden'
                }}>
                  {n.avatar_url
                    ? <img src={n.avatar_url} alt={n.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (n.is_app_admin ? '👑' : '🧗')}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link to={`/nutzer/${n.id}`} style={{ textDecoration: 'none' }}>
                    <strong style={{ color: n.is_app_admin ? '#ff6b00' : 'white' }}>
                      {n.username || 'Kein Username'}
                      {n.is_app_admin && <span style={{ fontSize: '0.75rem', marginLeft: '0.4rem' }}>👑</span>}
                    </strong>
                  </Link>
                  <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '0.15rem' }}>
                    Beitritt: {new Date(n.created_at).toLocaleDateString('de-DE')}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {/* Super Admin Status togglen */}
                  <button
                    onClick={() => superAdminToggle(n.id, n.username, n.is_app_admin)}
                    style={{
                      background: n.is_app_admin ? 'rgba(255,107,0,0.15)' : 'transparent',
                      border: `1px solid ${n.is_app_admin ? '#ff6b00' : '#444'}`,
                      color: n.is_app_admin ? '#ff6b00' : '#666',
                      padding: '0.3rem 0.6rem', borderRadius: '6px',
                      cursor: 'pointer', fontSize: '0.75rem'
                    }}
                    title={n.is_app_admin ? 'Super Admin entfernen' : 'Zu Super Admin machen'}
                  >
                    {n.is_app_admin ? '👑 SA' : '👑 +'}
                  </button>

                  {/* Konto löschen */}
                  <button
                    onClick={() => nutzerkontoLoeschen(n.id, n.username || 'Unbekannt')}
                    style={{
                      background: 'rgba(255,68,68,0.1)', border: '1px solid #ff4444',
                      color: '#ff4444', padding: '0.3rem 0.6rem',
                      borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem'
                    }}
                  >🗑️ Konto</button>
                </div>
              </div>
            ))}
            {gefilterteNutzer.length === 0 && <p style={{ color: '#555', textAlign: 'center', padding: '2rem' }}>Keine Nutzer gefunden.</p>}
          </div>
        </div>
      )}

      {/* Hinweis Auth */}
      <div style={{
        marginTop: '2rem', padding: '1rem', borderRadius: '8px',
        background: 'rgba(255,107,0,0.05)', border: '1px solid rgba(255,107,0,0.15)',
        fontSize: '0.8rem', color: '#666'
      }}>
        ⚠️ Beim Löschen eines Kontos werden alle App-Daten entfernt. Der Auth-Account (Login) muss zusätzlich manuell im <strong style={{ color: '#aaa' }}>Supabase Dashboard → Authentication → Users</strong> gelöscht werden.
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '0.75rem 1rem', borderRadius: '10px',
  border: '1px solid #2a2a2a', background: '#111',
  color: 'white', fontSize: '0.9rem', boxSizing: 'border-box'
}

export default SuperAdminPanel