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

  useEffect(() => {
    async function datenLaden() {
      const { data: { session } } = await supabase.auth.getSession()
      setNutzer(session?.user ?? null)

      const { data: halleData } = await supabase
        .from('gyms').select('*').eq('id', gymId).single()
      setHalle(halleData)

      // Super Admin Status aus dem Profil prüfen
      const { data: profileData } = await supabase
        .from('profiles').select('is_app_admin')
        .eq('id', session?.user?.id).single()
      
      const superAdmin = profileData?.is_app_admin === true
      setIstSuperAdmin(superAdmin)

      // Meine lokale Rolle in dieser Halle laden
      const { data: meineRolleDaten } = await supabase
        .from('gym_members').select('role')
        .eq('gym_id', gymId).eq('user_id', session?.user?.id).single()

      setMeineRolle(meineRolleDaten?.role || null)
      
      // Mitglieder laden
      const { data: mitgliederDaten } = await supabase
        .from('gym_members').select('*, profiles(username, avatar_url, id)')
        .eq('gym_id', gymId).order('created_at', { ascending: true })
      setMitglieder(mitgliederDaten || [])

      setLaden(false)
    }
    datenLaden()
  }, [gymId])

  // Berechtigung: Entweder lokaler Admin ODER globaler SuperAdmin
  const hatAdminRechte = meineRolle === 'admin' || istSuperAdmin
  const [bildLaden, setBildLaden] = useState(false)

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
    setErfolg('Bild gespeichert!')
    setTimeout(() => setErfolg(''), 2000)
    setBildLaden(false)
  }

  async function rolleAendern(userId, neueRolle) {
    const { error } = await supabase
      .from('gym_members').update({ role: neueRolle })
      .eq('gym_id', gymId).eq('user_id', userId)

    if (error) { setFehler('Fehler: ' + error.message); return }

    setMitglieder(mitglieder.map(m =>
      m.user_id === userId ? { ...m, role: neueRolle } : m
    ))
    setErfolg('Rolle geändert!')
    setTimeout(() => setErfolg(''), 2000)
  }

  // Löscht nur die Verbindung zur Halle
  async function mitgliedEntfernen(userId) {
    if (!window.confirm("Mitglied wirklich aus der Halle entfernen?")) return
    const { error } = await supabase
      .from('gym_members').delete()
      .eq('gym_id', gymId).eq('user_id', userId)

    if (error) { setFehler('Fehler: ' + error.message); return }
    setMitglieder(mitglieder.filter(m => m.user_id !== userId))
  }

  // SuperAdmin-Funktion: Löscht den kompletten Account (Profil)
  async function nutzerKontoLoeschen(userId, username) {
    if (!window.confirm(`VORSICHT: Willst du das Konto von "${username}" wirklich komplett löschen? Das löscht alle seine Daten App-weit!`)) return

    // Hinweis: Supabase Auth-User können nur über Edge Functions oder Admin API gelöscht werden.
    // Dieser Call löscht den Eintrag in der 'profiles' Tabelle. 
    // Durch 'ON DELETE CASCADE' in der DB werden meist auch die gym_members gelöscht.
    const { error } = await supabase.from('profiles').delete().eq('id', userId)

    if (error) {
      setFehler('Fehler beim Löschen des Kontos: ' + error.message)
    } else {
      setMitglieder(mitglieder.filter(m => m.user_id !== userId))
      setErfolg('Konto erfolgreich gelöscht.')
    }
  }

  async function halleLoeschen() {
    if (!window.confirm(`Halle "${halle.name}" wirklich löschen? Das kann nicht rückgängig gemacht werden!`)) return

    const { error } = await supabase.from('gyms').delete().eq('id', gymId)
    if (error) { setFehler('Fehler: ' + error.message); return }
    navigate('/hallen')
  }

  if (laden) return <div className="container"><p>Lädt...</p></div>
  if (!hatAdminRechte) return <div className="container"><h1>Kein Zugriff</h1></div>

  return (
    <div className="container" style={{ maxWidth: '700px' }}>
      <Link to={`/halle/${gymId}`} style={{ color: '#aaa', textDecoration: 'none', fontSize: '0.9rem' }}>
        ← Zurück zur Halle
      </Link>

      <h1 style={{ marginTop: '0.5rem' }}>Einstellungen</h1>
      <p style={{ marginBottom: '2rem' }}>
        für <strong style={{ color: '#ff6b00' }}>{halle?.name}</strong>
        {istSuperAdmin && <span style={{ color: '#ff6b00', fontSize: '0.8rem', marginLeft: '0.5rem' }}>👑 Super Admin Modus</span>}
      </p>

      {/* Hallenbild - Nur für Hallen-Admins oder SuperAdmin */}
      {hatAdminRechte && (
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
            <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
              Hallen-Logo oder Bild (max. 5 MB)
            </p>
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

      {/* Mitgliederliste */}
      <h2 style={{ marginBottom: '1rem' }}>👥 Mitglieder ({mitglieder.length})</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
        {mitglieder.map(m => {
          const istIchSelbst = m.user_id === nutzer?.id
          const zielIstAdmin = m.role === 'admin'

          return (
            <div key={m.user_id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: '#ff6b00', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0,
                overflow: 'hidden'
              }}>
                {m.profiles?.avatar_url
                  ? <img src={m.profiles.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : '🧗'}
              </div>

              <div style={{ flex: 1 }}>
                <Link to={`/halle/${gymId}/nutzer/${m.user_id}`} style={{ textDecoration: 'none' }}>
                 <strong style={{ color: 'white' }}>
                   {m.profiles?.username || 'Unbekannter Nutzer'}
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
                    {m.role === 'admin' ? '👑 Admin' :
                      m.role === 'moderator' ? '🛡️ Moderator' : '👤 Mitglied'}
                  </span>
                </div>
              </div>

              {/* Steuerungs-Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                {/* Rollenverwaltung (nur für lokale Admins oder SuperAdmins) */}
                {hatAdminRechte && !istIchSelbst && (
                  <>
                    {m.role === 'member' && (
                      <button onClick={() => rolleAendern(m.user_id, 'moderator')} className="btn-small">🛡️ Mod</button>
                    )}
                    {m.role === 'moderator' && (
                      <button onClick={() => rolleAendern(m.user_id, 'member')} className="btn-small">Mod entfernen</button>
                    )}
                    
                    {/* Aus Halle entfernen */}
                    {!zielIstAdmin && (
                      <button onClick={() => mitgliedEntfernen(m.user_id)} style={{ color: '#ff4444', border: '1px solid #ff4444' }} className="btn-small">🗑️</button>
                    )}
                  </>
                )}

                {/* SUPERADMIN SPECIAL: Komplettes Konto löschen */}
                {istSuperAdmin && !istIchSelbst && (
                  <button 
                    onClick={() => nutzerKontoLoeschen(m.user_id, m.profiles?.username)}
                    style={{ background: '#ff4444', color: 'white', border: 'none' }} 
                    className="btn-small"
                    title="Gesamtes Benutzerkonto löschen"
                  >
                    💀 KONTO LÖSCHEN
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Halle löschen Bereich */}
      {hatAdminRechte && (
        <div style={{
          padding: '1.5rem', borderRadius: '12px',
          border: '1px solid rgba(255,68,68,0.3)',
          background: 'rgba(255,68,68,0.05)'
        }}>
          <h2 style={{ color: '#ff4444', marginBottom: '0.5rem' }}>⚠️ Gefahrenzone</h2>
          <p style={{ color: '#aaa', marginBottom: '1rem', fontSize: '0.9rem' }}>
            {istSuperAdmin ? "Als SuperAdmin kannst du diese Halle für alle löschen." : "Das Löschen der Halle entfernt alle Sektionen und Routen unwiderruflich."}
          </p>
          <button
            onClick={halleLoeschen}
            style={{
              background: 'rgba(255,68,68,0.1)', border: '1px solid #ff4444',
              color: '#ff4444', padding: '0.75rem 1.5rem',
              borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
            }}
          >
            🗑️ Halle löschen
          </button>
        </div>
      )}
    </div>
  )
}

export default HalleEinstellungen