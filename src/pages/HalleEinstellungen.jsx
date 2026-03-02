import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

function HalleEinstellungen() {
  const { gymId } = useParams()
  const navigate = useNavigate()
  const [halle, setHalle] = useState(null)
  const [mitglieder, setMitglieder] = useState([])
  const [nutzer, setNutzer] = useState(null)
  const [meineRolle, setMeineRolle] = useState(null)
  const [istSuperAdmin, setIstSuperAdmin] = useState(false)
  const [laden, setLaden] = useState(true)
  const [fehler, setFehler] = useState('')
  const [erfolg, setErfolg] = useState('')
  const [bildLaden, setBildLaden] = useState(false)

  useEffect(() => {
    async function datenLaden() {
      const { data: { session } } = await supabase.auth.getSession()
      setNutzer(session?.user ?? null)

      const { data: halleData } = await supabase
        .from('gyms').select('*').eq('id', gymId).single()
      setHalle(halleData)

      // SuperAdmin prüfen
      const { data: superAdminCheck } = await supabase
        .from('profiles').select('is_app_admin')
        .eq('id', session?.user?.id).single()
      const superAdmin = superAdminCheck?.is_app_admin === true
      setIstSuperAdmin(superAdmin)

      // Meine Rolle in dieser Halle
      const { data: meineRolleDaten } = await supabase
        .from('gym_members').select('role')
        .eq('gym_id', gymId).eq('user_id', session?.user?.id).maybeSingle()

      if (superAdmin) {
        setMeineRolle('admin')
        // SuperAdmin ist noch kein Mitglied → automatisch als Admin eintragen
        if (!meineRolleDaten) {
          await supabase.from('gym_members').insert({
            gym_id: gymId, user_id: session.user.id, role: 'admin'
          })
        } else if (meineRolleDaten.role !== 'admin') {
          await supabase.from('gym_members').update({ role: 'admin' })
            .eq('gym_id', gymId).eq('user_id', session.user.id)
        }
      } else {
        setMeineRolle(meineRolleDaten?.role || null)
      }

      // Mitglieder laden
      const { data: mitgliederDaten } = await supabase
        .from('gym_members').select('*, profiles(id, username, avatar_url)')
        .eq('gym_id', gymId).order('created_at', { ascending: true })
      setMitglieder(mitgliederDaten || [])

      setLaden(false)
    }
    datenLaden()
  }, [gymId])

  const istAdmin = meineRolle === 'admin'

  function zeigeErfolg(msg) {
    setErfolg(msg)
    setTimeout(() => setErfolg(''), 2500)
  }

  async function hallenbildHochladen(e) {
    const datei = e.target.files[0]
    if (!datei) return
    if (datei.size > 5 * 1024 * 1024) { setFehler('Bild max. 5 MB'); return }
    setBildLaden(true)
    const endung = datei.name.split('.').pop()
    const pfad = `${gymId}/logo.${endung}`
    await supabase.storage.from('avatars').remove([pfad])
    const { error } = await supabase.storage.from('avatars').upload(pfad, datei, { upsert: true })
    if (error) { setFehler('Upload fehlgeschlagen'); setBildLaden(false); return }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(pfad)
    await supabase.from('gyms').update({ image_url: publicUrl }).eq('id', gymId)
    setHalle(prev => ({ ...prev, image_url: publicUrl }))
    zeigeErfolg('Bild gespeichert!')
    setBildLaden(false)
  }

  async function rolleAendern(userId, neueRolle) {
    const { error } = await supabase
      .from('gym_members').update({ role: neueRolle })
      .eq('gym_id', gymId).eq('user_id', userId)
    if (error) { setFehler('Fehler: ' + error.message); return }
    setMitglieder(mitglieder.map(m => m.user_id === userId ? { ...m, role: neueRolle } : m))
    zeigeErfolg('Rolle geändert!')
  }

  async function mitgliedEntfernen(userId) {
    if (!window.confirm('Mitglied wirklich entfernen?')) return
    const { error } = await supabase
      .from('gym_members').delete()
      .eq('gym_id', gymId).eq('user_id', userId)
    if (error) { setFehler('Fehler: ' + error.message); return }
    setMitglieder(mitglieder.filter(m => m.user_id !== userId))
  }

  // SuperAdmin only: Nutzerkonto komplett löschen
  async function nutzerkontoLoeschen(userId, username) {
    if (!window.confirm(`Konto von "${username}" wirklich löschen? Alle Daten (Ticks, Kommentare, Bewertungen) werden entfernt!`)) return

    // Alle Daten des Nutzers löschen
    await supabase.from('ticks').delete().eq('user_id', userId)
    await supabase.from('comments').delete().eq('user_id', userId)
    await supabase.from('route_ratings').delete().eq('user_id', userId)
    await supabase.from('gym_members').delete().eq('user_id', userId)
    await supabase.from('gym_bans').delete().eq('user_id', userId)
    await supabase.from('profiles').delete().eq('id', userId)

    // Auth-User löschen (nur via Admin-API möglich – hier nur Profil)
    // Hinweis: Auth-Account bleibt bestehen, kann sich aber nicht mehr einloggen
    // da Profil fehlt. Für vollständige Löschung: Supabase Dashboard > Auth > Users

    setMitglieder(mitglieder.filter(m => m.user_id !== userId))
    zeigeErfolg(`Konto von "${username}" gelöscht.`)
  }

  async function halleLoeschen() {
    if (!window.confirm(`Halle "${halle.name}" wirklich löschen? Das kann nicht rückgängig gemacht werden!`)) return
    const { error } = await supabase.from('gyms').delete().eq('id', gymId)
    if (error) { setFehler('Fehler: ' + error.message); return }
    navigate('/hallen')
  }

  if (laden) return <div className="container"><p>Lädt...</p></div>
  if (!meineRolle && !istSuperAdmin) return <div className="container"><h1>Kein Zugriff</h1></div>

  return (
    <div className="container" style={{ maxWidth: '700px', paddingBottom: '3rem' }}>
      <Link to={`/halle/${gymId}`} style={{ color: '#aaa', textDecoration: 'none', fontSize: '0.9rem' }}>
        ← Zurück zur Halle
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.5rem 0 0.25rem' }}>
        <h1>⚙️ Einstellungen</h1>
        {istSuperAdmin && (
          <Link to="/superadmin" style={{
            background: 'rgba(255,107,0,0.1)', border: '1px solid #ff6b00',
            color: '#ff6b00', padding: '0.4rem 0.85rem', borderRadius: '8px',
            textDecoration: 'none', fontSize: '0.85rem'
          }}>👑 SuperAdmin Panel</Link>
        )}
      </div>
      <p style={{ marginBottom: '2rem' }}>
        für <strong style={{ color: '#ff6b00' }}>{halle?.name}</strong>
        {istSuperAdmin && <span style={{ color: '#ff6b00', fontSize: '0.8rem', marginLeft: '0.5rem' }}>· 👑 Super Admin</span>}
      </p>

      {/* Hallenbild */}
      {istAdmin && (
        <div className="card" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '12px',
            background: '#1a1a1a', border: '1px solid #2a2a2a',
            overflow: 'hidden', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '2rem', flexShrink: 0
          }}>
            {halle?.image_url
              ? <img src={halle.image_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : '🏟️'}
          </div>
          <div>
            <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '0.75rem' }}>Hallen-Logo (max. 5 MB)</p>
            <label style={{
              background: 'rgba(255,107,0,0.1)', border: '1px solid #ff6b00',
              color: '#ff6b00', padding: '0.5rem 1rem', borderRadius: '8px',
              cursor: 'pointer', fontSize: '0.9rem'
            }}>
              {bildLaden ? '⏳ Lädt...' : '📷 Bild hochladen'}
              <input type="file" accept="image/*" onChange={hallenbildHochladen} style={{ display: 'none' }} />
            </label>
          </div>
        </div>
      )}

      {fehler && <p style={{ color: '#ff4444', marginBottom: '1rem' }}>{fehler}</p>}
      {erfolg && <p style={{ color: '#00c851', marginBottom: '1rem' }}>✅ {erfolg}</p>}

      {/* Mitglieder */}
      <h2 style={{ marginBottom: '1rem' }}>👥 Mitglieder ({mitglieder.length})</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
        {mitglieder.map(m => {
          const istIchSelbst = m.user_id === nutzer?.id
          const zielIstAdmin = m.role === 'admin' && !istSuperAdmin
          const username = m.profiles?.username || 'Unbekannt'

          return (
            <div key={m.user_id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: '#ff6b00', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0, overflow: 'hidden'
              }}>
                {m.profiles?.avatar_url
                  ? <img src={m.profiles.avatar_url} alt={username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : '🧗'}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <Link to={`/halle/${gymId}/nutzer/${m.user_id}`} style={{ textDecoration: 'none' }}>
                  <strong style={{ color: 'white' }}>
                    {username}
                    {istIchSelbst && <span style={{ color: '#666', fontSize: '0.8rem' }}> (du)</span>}
                  </strong>
                </Link>
                <div style={{ marginTop: '0.2rem' }}>
                  <span style={{
                    fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '20px',
                    background: m.role === 'admin' ? 'rgba(255,107,0,0.2)' :
                      m.role === 'moderator' ? 'rgba(100,149,237,0.2)' : 'rgba(255,255,255,0.05)',
                    color: m.role === 'admin' ? '#ff6b00' :
                      m.role === 'moderator' ? '#6495ED' : '#aaa'
                  }}>
                    {m.role === 'admin' ? '👑 Admin' : m.role === 'moderator' ? '🛡️ Mod' : '👤 Mitglied'}
                  </span>
                </div>
              </div>

              {/* Aktionen */}
              {istAdmin && !istIchSelbst && (
                <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {/* Rolle ändern */}
                  {m.role === 'member' && (
                    <button onClick={() => rolleAendern(m.user_id, 'moderator')} style={aktionBtnStyle('#6495ED')}>
                      🛡️ Mod
                    </button>
                  )}
                  {m.role === 'moderator' && (
                    <button onClick={() => rolleAendern(m.user_id, 'member')} style={aktionBtnStyle('#aaa')}>
                      Mod ↓
                    </button>
                  )}
                  {/* SuperAdmin kann auch Admins degradieren */}
                  {istSuperAdmin && m.role === 'admin' && (
                    <button onClick={() => rolleAendern(m.user_id, 'member')} style={aktionBtnStyle('#aaa')}>
                      Admin ↓
                    </button>
                  )}

                  {/* Aus Halle entfernen */}
                  {!zielIstAdmin && (
                    <button onClick={() => mitgliedEntfernen(m.user_id)} style={aktionBtnStyle('#ff4444')}>
                      🚪
                    </button>
                  )}

                  {/* Konto löschen – nur SuperAdmin */}
                  {istSuperAdmin && (
                    <button
                      onClick={() => nutzerkontoLoeschen(m.user_id, username)}
                      style={{ ...aktionBtnStyle('#ff4444'), background: 'rgba(255,68,68,0.15)', fontWeight: 'bold' }}
                      title="Konto komplett löschen"
                    >
                      🗑️ Konto
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Gefahrenzone */}
      {istAdmin && (
        <div style={{
          padding: '1.5rem', borderRadius: '12px',
          border: '1px solid rgba(255,68,68,0.3)',
          background: 'rgba(255,68,68,0.05)'
        }}>
          <h2 style={{ color: '#ff4444', marginBottom: '0.5rem' }}>⚠️ Gefahrenzone</h2>
          <p style={{ color: '#aaa', marginBottom: '1rem', fontSize: '0.9rem' }}>
            Das Löschen der Halle entfernt alle Sektionen, Routen und Daten unwiderruflich.
          </p>
          <button onClick={halleLoeschen} style={{
            background: 'rgba(255,68,68,0.1)', border: '1px solid #ff4444',
            color: '#ff4444', padding: '0.75rem 1.5rem',
            borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
          }}>
            🗑️ Halle löschen
          </button>
        </div>
      )}
    </div>
  )
}

const aktionBtnStyle = (color) => ({
  background: 'transparent', border: `1px solid ${color}`,
  color, padding: '0.3rem 0.6rem',
  borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem'
})

export default HalleEinstellungen