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

      const { data: superAdminCheck } = await supabase
        .from('profiles').select('is_app_admin')
        .eq('id', session?.user?.id).single()
      const superAdmin = superAdminCheck?.is_app_admin === true
      setIstSuperAdmin(superAdmin)

      const { data: meineRolleDaten } = await supabase
        .from('gym_members').select('role')
        .eq('gym_id', gymId).eq('user_id', session?.user?.id).maybeSingle()

      if (superAdmin) {
        setMeineRolle('admin')
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
  const { error } = await supabase.rpc('rolle_aendern', {
    ziel_user_id: userId,
    ziel_gym_id: gymId,
    neue_rolle: neueRolle
  })
  if (error) { setFehler('Fehler: ' + error.message); return }
  setMitglieder(mitglieder.map(m => m.user_id === userId ? { ...m, role: neueRolle } : m))
  zeigeErfolg('Rolle geändert!')
 }

  async function mitgliedEntfernen(userId) {
  if (!window.confirm('Mitglied wirklich entfernen?')) return
  const { error } = await supabase.rpc('mitglied_entfernen', {
    ziel_user_id: userId,
    ziel_gym_id: gymId
  })
  if (error) { setFehler('Fehler: ' + error.message); return }
  setMitglieder(mitglieder.filter(m => m.user_id !== userId))
 }

  async function nutzerkontoLoeschen(userId, username) {
    if (!window.confirm(`Konto von "${username}" wirklich löschen? Alle Daten (Ticks, Kommentare, Bewertungen) werden entfernt!`)) return
    await supabase.from('ticks').delete().eq('user_id', userId)
    await supabase.from('comments').delete().eq('user_id', userId)
    await supabase.from('route_ratings').delete().eq('user_id', userId)
    await supabase.from('gym_members').delete().eq('user_id', userId)
    await supabase.from('gym_bans').delete().eq('user_id', userId)
    await supabase.from('profiles').delete().eq('id', userId)
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

      {/* ── Zurück ── */}
      <Link to={`/halle/${gymId}`} style={{ color: '#aaa', textDecoration: 'none', fontSize: '0.9rem' }}>
        ← Zurück zur Halle
      </Link>

      {/* ── Header ── */}
      <div style={{ marginTop: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>⚙️ Einstellungen</h1>
          {istSuperAdmin && (
            <Link to="/superadmin" style={{
              background: 'rgba(255,107,0,0.1)', border: '1px solid #ff6b00',
              color: '#ff6b00', padding: '0.35rem 0.75rem', borderRadius: '8px',
              textDecoration: 'none', fontSize: '0.8rem', whiteSpace: 'nowrap', flexShrink: 0
            }}>👑 SuperAdmin</Link>
          )}
        </div>
        <p style={{ margin: '0.35rem 0 0', color: '#666', fontSize: '0.9rem' }}>
          für <strong style={{ color: '#ff6b00' }}>{halle?.name}</strong>
          {istSuperAdmin && (
            <span style={{
              marginLeft: '0.5rem', fontSize: '0.75rem', color: '#ff6b00',
              background: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.2)',
              borderRadius: '20px', padding: '0.1rem 0.5rem'
            }}>👑 Super Admin</span>
          )}
        </p>
      </div>

      {/* ── Hallenbild ── */}
      {istAdmin && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '10px',
              background: '#1a1a1a', border: '1px solid #2a2a2a',
              overflow: 'hidden', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '1.75rem', flexShrink: 0
            }}>
              {halle?.image_url
                ? <img src={halle.image_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : '🏟️'}
            </div>
            <div>
              <div style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Hallen-Logo (max. 5 MB)</div>
              <label style={{
                display: 'inline-block',
                background: 'rgba(255,107,0,0.1)', border: '1px solid #ff6b00',
                color: '#ff6b00', padding: '0.4rem 0.85rem', borderRadius: '8px',
                cursor: 'pointer', fontSize: '0.85rem'
              }}>
                {bildLaden ? '⏳ Lädt...' : '📷 Bild hochladen'}
                <input type="file" accept="image/*" onChange={hallenbildHochladen} style={{ display: 'none' }} />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ── Feedback ── */}
      {fehler && <p style={{ color: '#ff4444', marginBottom: '1rem', fontSize: '0.9rem' }}>{fehler}</p>}
      {erfolg && <p style={{ color: '#00c851', marginBottom: '1rem', fontSize: '0.9rem' }}>✅ {erfolg}</p>}

      {/* ── Mitglieder ── */}
      <h2 style={{ marginBottom: '0.75rem', fontSize: '1.1rem' }}>
        👥 Mitglieder ({mitglieder.length})
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '2rem' }}>
        {mitglieder.map(m => {
          const istIchSelbst = m.user_id === nutzer?.id
          const zielIstAdmin = m.role === 'admin' && !istSuperAdmin
          const username = m.profiles?.username || 'Unbekannt'

          return (
            <div key={m.user_id} className="card" style={{ padding: '0.85rem 1rem' }}>
              {/* Obere Zeile: Avatar + Name + Rolle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '50%',
                  background: '#ff6b00', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0, overflow: 'hidden'
                }}>
                  {m.profiles?.avatar_url
                    ? <img src={m.profiles.avatar_url} alt={username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : '🧗'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link to={`/halle/${gymId}/nutzer/${m.user_id}`} style={{ textDecoration: 'none' }}>
                    <strong style={{ color: 'white', fontSize: '0.95rem' }}>
                      {username}
                      {istIchSelbst && <span style={{ color: '#555', fontSize: '0.78rem', fontWeight: 'normal' }}> (du)</span>}
                    </strong>
                  </Link>
                  <div style={{ marginTop: '0.2rem' }}>
                    <span style={{
                      fontSize: '0.72rem', padding: '0.1rem 0.45rem', borderRadius: '20px',
                      background: m.role === 'admin' ? 'rgba(255,107,0,0.2)' :
                        m.role === 'moderator' ? 'rgba(100,149,237,0.2)' : 'rgba(255,255,255,0.05)',
                      color: m.role === 'admin' ? '#ff6b00' :
                        m.role === 'moderator' ? '#6495ED' : '#aaa'
                    }}>
                      {m.role === 'admin' ? '👑 Admin' : m.role === 'moderator' ? '🛡️ Mod' : '👤 Mitglied'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Aktionen – eigene Zeile, nur wenn nötig */}
              {istAdmin && !istIchSelbst && (
                <div style={{
                  display: 'flex', gap: '0.4rem', marginTop: '0.65rem',
                  paddingTop: '0.65rem', borderTop: '1px solid #1a1a1a',
                  flexWrap: 'wrap'
                }}>
                  {m.role === 'member' && (
                    <button onClick={() => rolleAendern(m.user_id, 'moderator')} style={aktionBtnStyle('#6495ED')}>
                      🛡️ Mod machen
                    </button>
                  )}
                  {m.role === 'moderator' && (
                    <button onClick={() => rolleAendern(m.user_id, 'member')} style={aktionBtnStyle('#aaa')}>
                      ↓ Mod entfernen
                    </button>
                  )}
                  {istSuperAdmin && m.role === 'admin' && (
                    <button onClick={() => rolleAendern(m.user_id, 'member')} style={aktionBtnStyle('#aaa')}>
                      ↓ Admin entfernen
                    </button>
                  )}
                  {!zielIstAdmin && (
                    <button onClick={() => mitgliedEntfernen(m.user_id)} style={aktionBtnStyle('#ff4444')}>
                      🚪 Entfernen
                    </button>
                  )}
                  {istSuperAdmin && (
                    <button
                      onClick={() => nutzerkontoLoeschen(m.user_id, username)}
                      style={{ ...aktionBtnStyle('#ff4444'), background: 'rgba(255,68,68,0.12)' }}
                    >
                      🗑️ Konto löschen
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Gefahrenzone ── */}
      {istAdmin && (
        <div style={{
          padding: '1.25rem', borderRadius: '12px',
          border: '1px solid rgba(255,68,68,0.3)',
          background: 'rgba(255,68,68,0.05)'
        }}>
          <h2 style={{ color: '#ff4444', marginBottom: '0.4rem', fontSize: '1.1rem' }}>⚠️ Gefahrenzone</h2>
          <p style={{ color: '#666', marginBottom: '1rem', fontSize: '0.85rem' }}>
            Das Löschen der Halle entfernt alle Sektionen, Routen und Daten unwiderruflich.
          </p>
          <button onClick={halleLoeschen} style={{
            background: 'rgba(255,68,68,0.1)', border: '1px solid #ff4444',
            color: '#ff4444', padding: '0.65rem 1.25rem',
            borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem'
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
  color, padding: '0.35rem 0.7rem',
  borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem'
})

export default HalleEinstellungen