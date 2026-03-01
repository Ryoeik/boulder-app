import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabase'

// Punkte pro Grad – je höher der Grad desto mehr Punkte
const GRAD_PUNKTE = {
  '4A': 1, '4B': 2, '4C': 3,
  '5A': 4, '5B': 5, '5C': 6,
  '6A': 7, '6A+': 8, '6B': 9, '6B+': 10, '6C': 11, '6C+': 12,
  '7A': 13, '7A+': 14, '7B': 15, '7B+': 16, '7C': 17, '7C+': 18,
  '8A': 19
}

// Medaillen für die Top 3
const MEDAILLE = { 0: '🥇', 1: '🥈', 2: '🥉' }

function Ranking() {
  const { gymId } = useParams()
  const [halle, setHalle]     = useState(null)
  const [rangliste, setRangliste] = useState([])
  const [laden, setLaden]     = useState(true)
  const [ichUserId, setIchUserId] = useState(null)

  useEffect(() => {
    async function datenLaden() {
      // Eingeloggten Nutzer holen
      const { data: { session } } = await supabase.auth.getSession()
      setIchUserId(session?.user?.id ?? null)

      // Halle laden
      const { data: halleData } = await supabase
        .from('gyms').select('id, name, city').eq('id', gymId).single()
      setHalle(halleData)

      // Alle Mitglieder der Halle laden
      const { data: mitglieder } = await supabase
        .from('gym_members').select('user_id')
        .eq('gym_id', gymId)
      const mitgliederIds = (mitglieder || []).map(m => m.user_id)

      if (mitgliederIds.length === 0) { setLaden(false); return }

      // Alle Ticks der Mitglieder für Routen dieser Halle laden
      const { data: ticks } = await supabase
        .from('ticks')
        .select('user_id, route_id')
        .in('user_id', mitgliederIds)

      // Routen dieser Halle laden (um gym_id zu filtern + Grad zu haben)
      const { data: routen } = await supabase
        .from('routes')
        .select('id, setter_grade, gym_id')
        .eq('gym_id', gymId)
        .eq('is_active', true)

      const routenMap = {}
      ;(routen || []).forEach(r => { routenMap[r.id] = r })

      // Profile aller Mitglieder laden
      const { data: profileDaten } = await supabase
        .from('profiles').select('id, username, avatar_url')
        .in('id', mitgliederIds)
      const profileMap = {}
      ;(profileDaten || []).forEach(p => { profileMap[p.id] = p })

      // Punkte pro Nutzer berechnen
      // Nur Ticks für Routen dieser Halle zählen
      const punkteMap = {}
      mitgliederIds.forEach(id => { punkteMap[id] = 0 })

      ;(ticks || []).forEach(tick => {
        const route = routenMap[tick.route_id]
        if (!route) return  // Route nicht in dieser Halle
        const punkte = GRAD_PUNKTE[route.setter_grade] || 0
        punkteMap[tick.user_id] = (punkteMap[tick.user_id] || 0) + punkte
      })

      // Rangliste bauen und sortieren
      const liste = mitgliederIds.map(userId => ({
        userId,
        username:   profileMap[userId]?.username || 'Kletterer',
        avatar_url: profileMap[userId]?.avatar_url || null,
        punkte:     punkteMap[userId] || 0,
        sends:      (ticks || []).filter(t => t.user_id === userId && routenMap[t.route_id]).length
      }))
      .sort((a, b) => b.punkte - a.punkte)

      setRangliste(liste)
      setLaden(false)
    }
    datenLaden()
  }, [gymId])

  if (laden) return <div className="container"><p>Lädt...</p></div>

  // Eigene Position finden
  const meinePosition = rangliste.findIndex(r => r.userId === ichUserId)

  return (
    <div className="container" style={{ maxWidth: '700px' }}>
      <Link to={`/halle/${gymId}`} style={{ color: '#aaa', textDecoration: 'none', fontSize: '0.9rem' }}>
        ← Zurück zur Halle
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.5rem 0 0.25rem' }}>
        <h1 style={{ margin: 0 }}>🏆 Ranking</h1>
      </div>
      <p style={{ color: '#666', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        {halle?.name} · {rangliste.length} Mitglieder
      </p>

      {/* Eigene Position – nur wenn eingeloggt und in der Liste */}
      {ichUserId && meinePosition >= 0 && (
        <div style={{
          background: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.3)',
          borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', gap: '1rem'
        }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ff6b00', flexShrink: 0 }}>
            #{meinePosition + 1}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ color: 'white', fontWeight: 'bold' }}>Deine Position</div>
            <div style={{ color: '#aaa', fontSize: '0.85rem' }}>
              {rangliste[meinePosition].punkte} Punkte · {rangliste[meinePosition].sends} Sends
            </div>
          </div>
          {meinePosition < rangliste.length - 1 && (
            <div style={{ color: '#555', fontSize: '0.8rem', textAlign: 'right' }}>
              {rangliste[meinePosition + 1]
                ? `+${rangliste[meinePosition].punkte - rangliste[meinePosition + 1].punkte} vor #${meinePosition + 2}`
                : ''
              }
            </div>
          )}
        </div>
      )}

      {/* Rangliste */}
      {rangliste.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#666' }}>Noch keine Sends in dieser Halle.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {rangliste.map((nutzer, index) => {
            const istIch = nutzer.userId === ichUserId
            return (
              <Link
                key={nutzer.userId}
                to={`/nutzer/${nutzer.userId}`}
                style={{ textDecoration: 'none' }}
              >
                <div
                  className="card"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    // Eigener Eintrag leicht hervorheben
                    border: istIch ? '1px solid rgba(255,107,0,0.4)' : undefined,
                    background: istIch ? 'rgba(255,107,0,0.05)' : undefined,
                    transition: 'opacity 0.2s'
                  }}
                >
                  {/* Platzierung */}
                  <div style={{
                    width: '36px', textAlign: 'center', flexShrink: 0,
                    fontSize: index < 3 ? '1.5rem' : '1rem',
                    fontWeight: 'bold',
                    color: index < 3 ? 'white' : '#555'
                  }}>
                    {index < 3 ? MEDAILLE[index] : `#${index + 1}`}
                  </div>

                  {/* Avatar */}
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '50%',
                    background: nutzer.avatar_url ? 'transparent' : '#ff6b00',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.2rem', overflow: 'hidden',
                    border: '2px solid #2a2a2a', flexShrink: 0
                  }}>
                    {nutzer.avatar_url
                      ? <img src={nutzer.avatar_url} alt={nutzer.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : '🧗'
                    }
                  </div>

                  {/* Name + Sends */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'white', fontWeight: istIch ? 'bold' : 'normal', fontSize: '0.95rem' }}>
                      {nutzer.username}
                      {istIch && <span style={{ color: '#ff6b00', fontSize: '0.75rem', marginLeft: '0.4rem' }}>• du</span>}
                    </div>
                    <div style={{ color: '#555', fontSize: '0.8rem', marginTop: '0.1rem' }}>
                      {nutzer.sends} {nutzer.sends === 1 ? 'Send' : 'Sends'}
                    </div>
                  </div>

                  {/* Punkte */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{
                      fontSize: '1.1rem', fontWeight: 'bold',
                      color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#ff6b00'
                    }}>
                      {nutzer.punkte}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#555' }}>Punkte</div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Punktesystem Erklärung */}
      <div className="card" style={{ marginTop: '2rem', marginBottom: '3rem' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '0.95rem', color: '#aaa' }}>📊 Punktesystem</h3>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '0.5rem'
        }}>
          {Object.entries(GRAD_PUNKTE).map(([grad, punkte]) => (
            <div key={grad} style={{
              textAlign: 'center', padding: '0.4rem',
              background: '#111', borderRadius: '6px'
            }}>
              <div style={{ fontSize: '0.8rem', color: '#ff6b00', fontWeight: 'bold' }}>{grad}</div>
              <div style={{ fontSize: '0.72rem', color: '#555' }}>{punkte} Pkt</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Ranking