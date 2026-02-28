import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabase'

const GRADE = ['4A','4B','4C','5A','5B','5C','6A','6A+','6B','6B+','6C','6C+','7A','7A+','7B','7B+','7C','7C+','8A']

const TICK_FARBEN = {
  flash:      { bg: '#FFD700', text: '#000', label: '⚡ Flash' },
  second_try: { bg: '#ff6b00', text: '#fff', label: '🔄 2nd Try' },
  done:       { bg: '#00c851', text: '#fff', label: '✅ Geschafft' },
}

function NutzerProfil() {
  const { userId } = useParams()
  const [profil, setProfil]       = useState(null)
  const [ticks, setTicks]         = useState([])
  const [routen, setRouten]       = useState({})
  const [heimhalle, setHeimhalle] = useState(null)
  const [laden, setLaden]         = useState(true)
  const [ichSelbst, setIchSelbst] = useState(false)

  useEffect(() => {
    async function datenLaden() {
      // Prüfen ob man das eigene Profil aufruft → dann zu /profil weiterleiten
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.id === userId) setIchSelbst(true)

      // Profil laden
      const { data: profilData } = await supabase
        .from('profiles').select('*').eq('id', userId).maybeSingle()
      setProfil(profilData)

      // Sends laden
      const { data: tickDaten } = await supabase
        .from('ticks').select('*').eq('user_id', userId)
        .order('ticked_at', { ascending: false })
      const alleTicks = tickDaten || []
      setTicks(alleTicks)

      // Routen dazu laden
      if (alleTicks.length > 0) {
        const ids = [...new Set(alleTicks.map(t => t.route_id))]
        const { data: routenDaten } = await supabase
          .from('routes').select('id, name, setter_grade, color, gym_id')
          .in('id', ids)
        const map = {}
        ;(routenDaten || []).forEach(r => { map[r.id] = r })
        setRouten(map)

        // Heimhalle berechnen
        const gymZaehler = {}
        alleTicks.forEach(t => {
          const gym = map[t.route_id]?.gym_id
          if (gym) gymZaehler[gym] = (gymZaehler[gym] || 0) + 1
        })
        const topId = Object.entries(gymZaehler).sort((a,b) => b[1]-a[1])[0]?.[0]
        if (topId) {
          const { data: gymData } = await supabase
            .from('gyms').select('id, name, city').eq('id', topId).single()
          setHeimhalle(gymData)
        }
      }

      setLaden(false)
    }
    datenLaden()
  }, [userId])

  // Schwierigkeitsverteilung
  const gradVerteilung = GRADE.map(grad => ({
    grad,
    anzahl: ticks.filter(t => routen[t.route_id]?.setter_grade === grad).length
  })).filter(g => g.anzahl > 0)
  const maxGrad = Math.max(...gradVerteilung.map(g => g.anzahl), 1)

  if (laden) return <div className="container"><p>Lädt...</p></div>

  // Kein Profil gefunden (User existiert aber hat noch keins angelegt)
  const anzeigeName = profil?.username || '🧗 Unbekannter Kletterer'

  return (
    <div className="container" style={{ maxWidth: '700px' }}>

      {/* Hinweis wenn man sich selbst besucht */}
      {ichSelbst && (
        <div style={{
          background: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.3)',
          borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem',
          fontSize: '0.9rem', color: '#ff6b00'
        }}>
          Das ist dein eigenes Profil. <Link to="/profil" style={{ color: '#ff6b00', fontWeight: 'bold' }}>Hier bearbeiten →</Link>
        </div>
      )}

      {/* Profil Header */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {/* Avatar */}
        <div style={{
          width: '90px', height: '90px', borderRadius: '50%',
          background: profil?.avatar_url ? 'transparent' : '#ff6b00',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2.5rem', overflow: 'hidden', border: '3px solid #2a2a2a',
          flexShrink: 0
        }}>
          {profil?.avatar_url
            ? <img src={profil.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : '🧗'
          }
        </div>

        {/* Info */}
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: '0 0 0.25rem' }}>{anzeigeName}</h1>
          {profil?.bio
            ? <p style={{ color: '#aaa', margin: '0 0 0.4rem' }}>{profil.bio}</p>
            : <p style={{ color: '#555', fontStyle: 'italic', margin: '0 0 0.4rem' }}>Keine Beschreibung</p>
          }
          {heimhalle && (
            <Link to={`/halle/${heimhalle.id}`} style={{ color: '#666', fontSize: '0.85rem', textDecoration: 'none' }}>
              🏠 {heimhalle.name} · {heimhalle.city}
            </Link>
          )}
        </div>
      </div>

      {/* Statistik-Kacheln */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { zahl: ticks.length,                                           label: 'Sends' },
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

      {/* Schwierigkeitsverteilung */}
      {gradVerteilung.length > 0 && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1.25rem' }}>📊 Schwierigkeitsverteilung</h2>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '120px', padding: '0 0.5rem' }}>
            {gradVerteilung.map(({ grad, anzahl }) => (
              <div key={grad} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.65rem', color: '#aaa' }}>{anzahl}</span>
                <div style={{
                  width: '100%',
                  height: `${(anzahl / maxGrad) * 90}px`,
                  background: 'linear-gradient(to top, #ff6b00, #ff9f50)',
                  borderRadius: '4px 4px 0 0', minHeight: '4px'
                }} />
                <span style={{ fontSize: '0.65rem', color: '#aaa', transform: 'rotate(-45deg)', transformOrigin: 'center', whiteSpace: 'nowrap' }}>
                  {grad}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Send-Liste */}
      <h2 style={{ marginBottom: '1rem' }}>✅ Sends</h2>
      {ticks.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: '#666' }}>Noch keine Sends.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '3rem' }}>
          {ticks.map(tick => {
            const route = routen[tick.route_id]
            const tickInfo = TICK_FARBEN[tick.tick_type] || TICK_FARBEN.done
            return (
              <Link key={tick.id} to={route ? `/route/${route.id}` : '#'} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
                  {route?.setter_grade && (
                    <span style={{
                      background: 'rgba(255,107,0,0.15)', color: '#ff6b00',
                      padding: '0.2rem 0.6rem', borderRadius: '20px',
                      fontSize: '0.85rem', fontWeight: 'bold'
                    }}>{route.setter_grade}</span>
                  )}
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

export default NutzerProfil