import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { hallenXPBerechnen } from '../utils/xpSystem'
import LevelAnzeige from '../components/LevelAnzeige'

const GRADE = ['?','4A','4B','4C','5A','5B','5C','6A','6A+','6B','6B+','6C','6C+','7A','7A+','7B','7B+','7C','7C+','8A']

const TICK_FARBEN = {
  flash:      { bg: '#FFD700', text: '#000', label: '⚡ Flash' },
  second_try: { bg: '#ff6b00', text: '#fff', label: '🔄 2nd Try' },
  done:       { bg: '#00c851', text: '#fff', label: '✅ Geschafft' },
}

function HallenProfil() {
  const { gymId, userId } = useParams()
  const [profil, setProfil] = useState(null)
  const [halle, setHalle] = useState(null)
  const [mitglied, setMitglied] = useState(null)
  const [ticks, setTicks] = useState([])
  const [routen, setRouten] = useState({})
  const [ichSelbst, setIchSelbst] = useState(false)
  const [laden, setLaden] = useState(true)

  useEffect(() => {
    async function datenLaden() {
      // Eingeloggter Nutzer
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.id === userId) setIchSelbst(true)

      // Profil laden
      const { data: profilData } = await supabase
        .from('profiles').select('*').eq('id', userId).maybeSingle()
      setProfil(profilData)

      // Halle laden
      const { data: halleData } = await supabase
        .from('gyms').select('*').eq('id', gymId).single()
      setHalle(halleData)

      // Mitgliedschaft laden (für Beitrittsdatum und Rolle)
      const { data: mitgliedData } = await supabase
        .from('gym_members').select('*')
        .eq('gym_id', gymId).eq('user_id', userId).maybeSingle()
      setMitglied(mitgliedData)

      // Ticks in dieser Halle laden
      const { data: routenInHalle } = await supabase
        .from('routes').select('id, name, setter_grade, color, section_id')
        .eq('gym_id', gymId)

      const routenMap = {}
      ;(routenInHalle || []).forEach(r => { routenMap[r.id] = r })
      setRouten(routenMap)

      const routenIds = (routenInHalle || []).map(r => r.id)
      if (routenIds.length > 0) {
        const { data: tickDaten } = await supabase
          .from('ticks').select('*')
          .eq('user_id', userId)
          .in('route_id', routenIds)
          .order('ticked_at', { ascending: false })
        setTicks(tickDaten || [])
      }

      setLaden(false)
    }
    datenLaden()
  }, [gymId, userId])

  // XP berechnen
  const xp = hallenXPBerechnen(ticks, routen)

  const anzeigeName = profil?.username || '🧗 Unbekannter Kletterer'

  // Schwierigkeitsverteilung
  const gradVerteilung = GRADE.map(grad => ({
    grad,
    anzahl: ticks.filter(t => routen[t.route_id]?.setter_grade === grad).length
  })).filter(g => g.anzahl > 0)
  const maxGrad = Math.max(...gradVerteilung.map(g => g.anzahl), 1)

  if (laden) return <div className="container"><p>Lädt...</p></div>

  return (
    <div className="container" style={{ maxWidth: '700px' }}>
      <Link to={`/halle/${gymId}`} style={{ color: '#aaa', textDecoration: 'none', fontSize: '0.9rem' }}>
        ← Zurück zur Halle
      </Link>

      {ichSelbst && (
        <div style={{
          background: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.3)',
          borderRadius: '8px', padding: '0.75rem 1rem', marginTop: '0.5rem',
          fontSize: '0.9rem', color: '#ff6b00'
        }}>
          Das ist dein Hallenprofil. <Link to="/profil" style={{ color: '#ff6b00', fontWeight: 'bold' }}>Zum Hauptprofil →</Link>
        </div>
      )}

      {/* Profil Header */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%',
          background: profil?.avatar_url ? 'transparent' : '#ff6b00',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2rem', overflow: 'hidden', border: '3px solid #2a2a2a', flexShrink: 0
        }}>
          {profil?.avatar_url
            ? <img src={profil.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : '🧗'}
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: '1.4rem' }}>{anzeigeName}</h1>
          <p style={{ color: '#aaa', margin: '0.25rem 0', fontSize: '0.9rem' }}>
            🏠 {halle?.name} · {halle?.city}
          </p>
          {mitglied ? (
            <p style={{ color: '#666', fontSize: '0.85rem', margin: '0.25rem 0' }}>
              Mitglied seit {new Date(mitglied.created_at).toLocaleDateString('de-DE')}
              {' '}·{' '}
              <span style={{
                color: mitglied.role === 'admin' ? '#ff6b00' :
                  mitglied.role === 'moderator' ? '#6495ED' : '#aaa'
              }}>
                {mitglied.role === 'admin' ? '👑 Admin' :
                  mitglied.role === 'moderator' ? '🛡️ Moderator' : '👤 Mitglied'}
              </span>
            </p>
          ) : (
            <p style={{ color: '#666', fontSize: '0.85rem' }}>Kein Mitglied dieser Halle</p>
          )}
        </div>
      </div>

      {/* Hallen Level */}
      <LevelAnzeige xp={xp} titel="Hallen-Level" />

      {/* Statistik Kacheln */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { zahl: ticks.length, label: 'Sends' },
          { zahl: ticks.filter(t => t.tick_type === 'flash').length, label: '⚡ Flash' },
          { zahl: ticks.filter(t => t.tick_type === 'second_try').length, label: '🔄 2nd Try' },
          { zahl: ticks.filter(t => t.tick_type === 'done').length, label: '✅ Geschafft' },
        ].map(({ zahl, label }) => (
          <div key={label} className="card" style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#ff6b00' }}>{zahl}</div>
            <div style={{ fontSize: '0.75rem', color: '#aaa', marginTop: '0.2rem' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Schwierigkeitsverteilung */}
      {gradVerteilung.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ marginBottom: '1.25rem' }}>📊 Schwierigkeitsverteilung</h2>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '100px' }}>
            {gradVerteilung.map(({ grad, anzahl }) => (
              <div key={grad} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.6rem', color: '#aaa' }}>{anzahl}</span>
                <div style={{
                  width: '100%', height: `${(anzahl / maxGrad) * 80}px`,
                  background: 'linear-gradient(to top, #ff6b00, #ff9f50)',
                  borderRadius: '4px 4px 0 0', minHeight: '4px'
                }} />
                <span style={{ fontSize: '0.6rem', color: '#aaa', transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>
                  {grad}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Send Liste */}
      <h2 style={{ marginBottom: '1rem' }}>✅ Sends in dieser Halle</h2>
      {ticks.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: '#666' }}>Noch keine Routen in dieser Halle gesendet.</p>
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
                      padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold'
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

export default HallenProfil