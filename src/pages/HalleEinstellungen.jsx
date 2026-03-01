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

      // Super Admin prüfen
      const { data: superAdminCheck } = await supabase
        .from('profiles').select('is_app_admin')
        .eq('id', session?.user?.id).single()
      const superAdmin = superAdminCheck?.is_app_admin === true
      setIstSuperAdmin(superAdmin)

      // Meine Rolle in dieser Halle
      const { data: meineRolleDaten } = await supabase
        .from('gym_members').select('role')
        .eq('gym_id', gymId).eq('user_id', session?.user?.id).single()

      if (superAdmin) {
        setMeineRolle('admin')
      } else {
        setMeineRolle(meineRolleDaten?.role || null)
      }

      // Mitglieder laden
      const { data: mitgliederDaten } = await supabase
        .from('gym_members').select('*, profiles(username, avatar_url)')
        .eq('gym_id', gymId).order('created_at', { ascending: true })
      setMitglieder(mitgliederDaten || [])

      setLaden(false)
    }
    datenLaden()
  }, [gymId])

  const istAdmin = meineRolle === 'admin'

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
    const { error } = await supabase
      .from('gym_members').delete()
      .eq('gym_id', gymId).eq('user_id', userId)

    if (error) { setFehler('Fehler: ' + error.message); return }
    setMitglieder(mitglieder.filter(m => m.user_id !== userId))
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
    <div className="container" style={{ maxWidth: '700px' }}>
      <Link to={`/halle/${gymId}`} style={{ color: '#aaa', textDecoration: 'none', fontSize: '0.9rem' }}>
        ← Zurück zur Halle
      </Link>

      <h1 style={{ marginTop: '0.5rem' }}>⚙️ Einstellungen</h1>
      <p style={{ marginBottom: '2rem' }}>
        für <strong style={{ color: '#ff6b00' }}>{halle?.name}</strong>
        {istSuperAdmin && <span style={{ color: '#ff6b00', fontSize: '0.8rem', marginLeft: '0.5rem' }}>👑 Super Admin</span>}
      </p>

      {fehler && <p style={{ color: '#ff4444', marginBottom: '1rem' }}>{fehler}</p>}
      {erfolg && <p style={{ color: '#00c851', marginBottom: '1rem' }}>✅ {erfolg}</p>}

      {/* Mitglieder */}
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
                <strong style={{ color: 'white' }}>
                  {m.profiles?.username || 'Unbekannter Nutzer'}
                  {istIchSelbst && <span style={{ color: '#666', fontSize: '0.8rem' }}> (du)</span>}
                </strong>
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

              {istAdmin && !istIchSelbst && (
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  {m.role === 'member' && (
                    <button
                      onClick={() => rolleAendern(m.user_id, 'moderator')}
                      style={{
                        background: 'rgba(100,149,237,0.1)', border: '1px solid #6495ED',
                        color: '#6495ED', padding: '0.3rem 0.6rem',
                        borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem'
                      }}
                    >🛡️ Mod</button>
                  )}
                  {m.role === 'moderator' && (
                    <button
                      onClick={() => rolleAendern(m.user_id, 'member')}
                      style={{
                        background: 'transparent', border: '1px solid #444',
                        color: '#aaa', padding: '0.3rem 0.6rem',
                        borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem'
                      }}
                    >Mod entfernen</button>
                  )}
                  {!zielIstAdmin && (
                    <button
                      onClick={() => mitgliedEntfernen(m.user_id)}
                      style={{
                        background: 'transparent', border: '1px solid #ff4444',
                        color: '#ff4444', padding: '0.3rem 0.6rem',
                        borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem'
                      }}
                    >🗑️</button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Halle löschen */}
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