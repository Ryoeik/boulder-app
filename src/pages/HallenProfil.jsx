import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { hallenXPBerechnen, levelBerechnen, levelAnzeige } from '../utils/xpSystem'
import LevelAnzeige from '../components/LevelAnzeige'

const GRADE = ['?','4A','4B','4C','5A','5B','5C','6A','6A+','6B','6B+','6C','6C+','7A','7A+','7B','7B+','7C','7C+','8A']

const TICK_FARBEN = {
  flash:      { bg: '#FFD700', text: '#000', label: '⚡ Flash' },
  second_try: { bg: '#ff6b00', text: '#fff', label: '🔄 2nd Try' },
  done:       { bg: '#00c851', text: '#fff', label: '✅ Geschafft' },
}

function HallenProfil() {
  const { gymId, userId } = useParams()
  const [profil, setProfil]     = useState(null)
  const [halle, setHalle]       = useState(null)
  const [mitglied, setMitglied] = useState(null)
  const [ticks, setTicks]       = useState([])
  const [routen, setRouten]     = useState({})
  const [ichSelbst, setIchSelbst] = useState(false)
  const [laden, setLaden]       = useState(true)

  useEffect(() => {
    async function datenLaden() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.id === userId) setIchSelbst(true)

      const { data: profilData } = await supabase
        .from('profiles').select('*').eq('id', userId).maybeSingle()
      setProfil(profilData)

      const { data: halleData } = await supabase
        .from('gyms').select('*').eq('id', gymId).single()
      setHalle(halleData)

      const { data: mitgliedData } = await supabase
        .from('gym_members').select('*')
        .eq('gym_id', gymId).eq('user_id', userId).maybeSingle()
      setMitglied(mitgliedData)

      const { data: routenInHalle } = await supabase
        .from('routes').select('id, name, setter_grade, color, section_id')
        .eq('gym_id', gymId).eq('is_active', true)

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

  const xp = hallenXPBerechnen(ticks, routen)
  const { level } = levelBerechnen(xp)
  const { farbe, name } = levelAnzeige(level)

  const anzeigeName = profil?.username || '🧗 Unbekannter Kletterer'

  // Chart-Daten – 1:1 aus Profil.jsx
  const gradVerteilung = GRADE.map(grad => ({
    grad,
    anzahl: ticks.filter(t => routen[t.route_id]?.setter_grade === grad).length
  }))
  const maxGrad = Math.max(...gradVerteilung.map(g => g.anzahl), 1)

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
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <div style={{
          width: '90px', height: '90px', borderRadius: '50%',
          background: profil?.avatar_url ? 'transparent' : '#ff6b00',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2.5rem', overflow: 'hidden', border: '3px solid #2a2a2a', flexShrink: 0
        }}>
          {profil?.avatar_url
            ? <img src={profil.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : '🧗'}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: '0 0 0.3rem 0', fontSize: '1.5rem' }}>{anzeigeName}</h1>

          {/* Level-Badge – eigene Zeile für Mobil */}
          <div style={{ marginBottom: '0.4rem' }}>
            <span style={{
              display: 'inline-block',
              background: `${farbe}22`, border: `1px solid ${farbe}`,
              color: farbe, padding: '0.2rem 0.7rem',
              borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold'
            }}>
              Lvl {level} · {name}
            </span>
          </div>

          {profil?.bio
            ? <p style={{ color: '#aaa', margin: '0.25rem 0', fontSize: '0.9rem' }}>{profil.bio}</p>
            : <p style={{ color: '#555', fontStyle: 'italic', margin: '0.25rem 0', fontSize: '0.9rem' }}>Keine Beschreibung</p>
          }

          <p style={{ color: '#666', margin: '0.25rem 0', fontSize: '0.85rem' }}>
            🏠 {halle?.name} · {halle?.city}
          </p>

          {mitglied ? (
            <p style={{ color: '#666', fontSize: '0.85rem', margin: '0.15rem 0' }}>
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
            <p style={{ color: '#666', fontSize: '0.85rem', margin: '0.15rem 0' }}>Kein Mitglied dieser Halle</p>
          )}
        </div>
      </div>

      {/* XP Balken */}
      <LevelAnzeige xp={xp} titel="Hallen-Level" />

      {ticks.length > 0 && (
        <>
          {/* Sends pro Monat – 1:1 aus Profil.jsx */}
          <div className="card" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1rem', color: '#aaa', letterSpacing: '0.1em' }}>SENDS PRO MONAT</h2>
              <span style={{ color: '#aaa', fontSize: '0.85rem' }}>{new Date().getFullYear()}</span>
            </div>
            <div style={{ position: 'relative' }}>
              {[0, 25, 50, 75, 100].map(pct => (
                <div key={pct} style={{
                  position: 'absolute', left: 0, right: 0,
                  bottom: `${pct}%`, height: '1px',
                  background: 'rgba(255,255,255,0.05)'
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
              <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '140px', pointerEvents: 'none' }}>
                <polyline
                  fill="none" stroke="#44ccff" strokeWidth="1.5" strokeDasharray="3,2"
                  points={monate.map(({ anzahl }, i) => {
                    const x = (i / (monate.length - 1)) * 100
                    const y = maxMonat > 0 ? 140 - (anzahl / maxMonat) * 110 : 140
                    return `${x}%,${y}`
                  }).join(' ')}
                />
                {monate.map(({ anzahl }, i) => {
                  if (anzahl === 0) return null
                  const x = (i / (monate.length - 1)) * 100
                  const y = maxMonat > 0 ? 140 - (anzahl / maxMonat) * 110 : 140
                  return <circle key={i} cx={`${x}%`} cy={y} r="3" fill="#44ccff" stroke="#111" strokeWidth="1.5" />
                })}
              </svg>
            </div>
          </div>

          {/* By Grades – 1:1 aus Profil.jsx */}
          <div className="card" style={{ marginBottom: '2rem' }}>
            <h2 style={{ margin: '0 0 1.25rem', fontSize: '1rem', color: '#aaa', letterSpacing: '0.1em' }}>BY GRADES</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[...gradVerteilung].reverse().map(({ grad, anzahl }) => (
                <div key={grad} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ width: '40px', fontSize: '0.8rem', color: '#aaa', textAlign: 'right', flexShrink: 0 }}>{grad}</span>
                  <div style={{ flex: 1, background: '#111', borderRadius: '3px', height: '18px', overflow: 'hidden', position: 'relative' }}>
                    <div style={{
                      height: '100%',
                      width: `${(anzahl / maxGrad) * 100}%`,
                      background: 'linear-gradient(to right, #4488ff, #44bbcc)',
                      borderRadius: '3px',
                      transition: 'width 0.5s',
                      boxShadow: '0 0 6px rgba(68,136,255,0.3)'
                    }} />
                  </div>
                  <span style={{ width: '24px', fontSize: '0.8rem', color: '#555', textAlign: 'right' }}>{anzahl}</span>
                </div>
              ))}
            </div>
          </div>
        </>
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
                  <div style={{ flex: 1, minWidth: 0 }}>
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

export default HallenProfil