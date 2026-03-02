import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

function HalleEinstellungen() {
  const { gymId } = useParams()
  const navigate = useNavigate()
  
  // State Management
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
      setLaden(true)
      const { data: { session } } = await supabase.auth.getSession()
      const currentUser = session?.user ?? null
      setNutzer(currentUser)

      if (!currentUser) {
        setLaden(false)
        return
      }

      // 1. Halle laden
      const { data: halleData } = await supabase
        .from('gyms').select('*').eq('id', gymId).single()
      setHalle(halleData)

      // 2. Super Admin Status aus dem Profil prüfen
      const { data: profileData } = await supabase
        .from('profiles').select('is_app_admin')
        .eq('id', currentUser.id).single()
      
      const isGlobalAdmin = profileData?.is_app_admin === true
      setIstSuperAdmin(isGlobalAdmin)

      // 3. Meine lokale Rolle in dieser Halle laden
      const { data: meineRolleDaten } = await supabase
        .from('gym_members').select('role')
        .eq('gym_id', gymId).eq('user_id', currentUser.id).maybeSingle()

      setMeineRolle(meineRolleDaten?.role || null)
      
      // 4. Mitglieder laden (SuperAdmin darf alle sehen, RLS muss SELECT erlauben)
      const { data: mitgliederDaten } = await supabase
        .from('gym_members').select('*, profiles(username, avatar_url, id)')
        .eq('gym_id', gymId).order('created_at', { ascending: true })
      
      setMitglieder(mitgliederDaten || [])
      setLaden(false)
    }
    datenLaden()
  }, [gymId])

  // ZENTRALE BERECHTIGUNG
  const hatAdminRechte = meineRolle === 'admin' || istSuperAdmin

  // --- FUNKTIONEN ---

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

  async function mitgliedEntfernen(userId) {
    if (!window.confirm("Mitglied wirklich aus der Halle entfernen?")) return
    const { error } = await supabase
      .from('gym_members').delete()
      .eq('gym_id', gymId).eq('user_id', userId)

    if (error) { setFehler('Fehler: ' + error.message); return }
    setMitglieder(mitglieder.filter(m => m.user_id !== userId))
  }

  // EXKLUSIVE SUPERADMIN FUNKTION
  async function nutzerKontoLoeschen(userId, username) {
    if (!window.confirm(`⚠️ KRITISCH: Konto von "${username}" komplett löschen? Dies entfernt den Nutzer App-weit!`)) return

    const { error } = await supabase.from('profiles').delete().eq('id', userId)

    if (error) {
      setFehler('Fehler beim Löschen des Kontos: ' + error.message)
    } else {
      setMitglieder(mitglieder.filter(m => m.user_id !== userId))
      setErfolg('Benutzerkonto wurde gelöscht.')
    }
  }

  async function halleLoeschen() {
    if (!window.confirm(`Halle "${halle?.name}" wirklich löschen? Alle Routen und Daten gehen verloren!`)) return

    const { error } = await supabase.from('gyms').delete().eq('id', gymId)
    if (error) { 
      setFehler('Löschen fehlgeschlagen. Prüfe, ob noch Routen/Mitglieder existieren (Cascade Delete benötigt).'); 
      console.error(error);
      return 
    }
    navigate('/hallen')
  }

  // --- RENDERING ---

  if (laden) return <div className="container"><p>Lädt Admin-Bereich...</p></div>
  
  // Zugriff verweigert, wenn weder lokaler Admin noch SuperAdmin
  if (!hatAdminRechte) {
    return (
      <div className="container">
        <h1>Kein Zugriff</h1>
        <p>Du hast keine Administrator-Rechte für diese Halle.</p>
        <Link to={`/halle/${gymId}`}>Zurück zur Übersicht</Link>
      </div>
    )
  }

  return (
    <div className="container" style={{ maxWidth: '700px' }}>
      <Link to={`/halle/${gymId}`} style={{ color: '#aaa', textDecoration: 'none', fontSize: '0.9rem' }}>
        ← Zurück zur Halle
      </Link>

      <h1 style={{ marginTop: '0.5rem' }}>Hallen-Einstellungen</h1>
      <p style={{ marginBottom: '2rem' }}>
        Verwaltung für <strong style={{ color: '#ff6b00' }}>{halle?.name || 'Halle'}</strong>
        {istSuperAdmin && (
          <span style={{ 
            background: '#ff6b00', color: 'white', padding: '2px 8px', 
            borderRadius: '4px', fontSize: '0.7rem', marginLeft: '10px', verticalAlign: 'middle' 
          }}>
            SUPER-ADMIN MODUS
          </span>
        )}
      </p>

      {/* 1. Hallenbild */}
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
          <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '0.75rem' }}>Hallen-Logo ändern</p>
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

      {fehler && <p style={{ color: '#ff4444', background: 'rgba(255,68,68,0.1)', padding: '10px', borderRadius: '8px' }}>{fehler}</p>}
      {erfolg && <p style={{ color: '#00c851' }}>✅ {erfolg}</p>}

      {/* 2. Mitglieder-Verwaltung */}
      <h2 style={{ marginBottom: '1rem' }}>👥 Mitglieder ({mitglieder.length})</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '3rem' }}>
        {mitglieder.map(m => {
          const istIchSelbst = m.user_id === nutzer?.id
          return (
            <div key={m.user_id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#333', overflow: 'hidden' }}>
                {m.profiles?.avatar_url && <img src={m.profiles.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>

              <div style={{ flex: 1 }}>
                <strong style={{ color: 'white' }}>{m.profiles?.username || 'User'}</strong>
                <div style={{ fontSize: '0.75rem', color: m.role === 'admin' ? '#ff6b00' : '#aaa' }}>
                  {m.role === 'admin' ? '👑 Admin' : m.role === 'moderator' ? '🛡️ Moderator' : '👤 Mitglied'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '5px' }}>
                {!istIchSelbst && (
                  <>
                    <button onClick={() => rolleAendern(m.user_id, m.role === 'member' ? 'moderator' : 'member')} className="btn-small">
                      {m.role === 'member' ? '🛡️ +Mod' : '👤 -Mod'}
                    </button>
                    <button onClick={() => mitgliedEntfernen(m.user_id)} className="btn-small" style={{ color: '#ff4444' }}>🗑️ Raus</button>
                    
                    {/* Exklusiv SuperAdmin Button */}
                    {istSuperAdmin && (
                      <button 
                        onClick={() => nutzerKontoLoeschen(m.user_id, m.profiles?.username)}
                        style={{ background: '#ff4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '2px 5px', fontSize: '0.7rem' }}
                      >
                        LÖSCHEN
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 3. Gefahrzone */}
      <div style={{
        padding: '1.5rem', borderRadius: '12px',
        border: '1px solid rgba(255,68,68,0.3)',
        background: 'rgba(255,68,68,0.05)'
      }}>
        <h2 style={{ color: '#ff4444', marginBottom: '0.5rem' }}>⚠️ Gefahrenzone</h2>
        <p style={{ color: '#aaa', marginBottom: '1rem', fontSize: '0.9rem' }}>
          Diese Aktion löscht die gesamte Halle mit allen Routen, Fotos und Sektoren für alle Nutzer.
        </p>
        <button
          onClick={halleLoeschen}
          style={{
            background: '#ff4444', border: 'none', color: 'white', 
            padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
          }}
        >
          🗑️ Halle unwiderruflich löschen
        </button>
      </div>
    </div>
  )
}

export default HalleEinstellungen