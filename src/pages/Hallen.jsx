import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

function Hallen() {
  const [hallen, setHallen] = useState([])
  const [gefiltert, setGefiltert] = useState([])
  const [suche, setSuche] = useState('')
  const [mitgliederMap, setMitgliederMap] = useState({})
  const [routenMap, setRoutenMap] = useState({})
  const [nutzer, setNutzer] = useState(null)
  const [meineHallenIds, setMeineHallenIds] = useState([])
  const [laden, setLaden] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function datenLaden() {
      const { data: { session } } = await supabase.auth.getSession()
      setNutzer(session?.user ?? null)

      const { data: hallenData } = await supabase
        .from('gyms').select('*').order('created_at', { ascending: false })
      setHallen(hallenData || [])
      setGefiltert(hallenData || [])

      // Mitglieder pro Halle
      const { data: mitglieder } = await supabase
        .from('gym_members').select('gym_id')
      const mMap = {}
      ;(mitglieder || []).forEach(m => {
        mMap[m.gym_id] = (mMap[m.gym_id] || 0) + 1
      })
      setMitgliederMap(mMap)

      // Routen pro Halle
      const { data: routen } = await supabase
        .from('routes').select('gym_id').eq('is_active', true)
      const rMap = {}
      ;(routen || []).forEach(r => {
        rMap[r.gym_id] = (rMap[r.gym_id] || 0) + 1
      })
      setRoutenMap(rMap)

      // Meine Hallen
      if (session?.user) {
        const { data: meine } = await supabase
          .from('gym_members').select('gym_id').eq('user_id', session.user.id)
        setMeineHallenIds((meine || []).map(m => m.gym_id))
      }

      setLaden(false)
    }
    datenLaden()
  }, [])

  function hallenFiltern(wert) {
    setSuche(wert)
    const q = wert.toLowerCase()
    setGefiltert(hallen.filter(h =>
      h.name.toLowerCase().includes(q) ||
      h.city.toLowerCase().includes(q)
    ))
  }

  async function halleBetreten(e, halleId) {
    e.preventDefault()
    e.stopPropagation()
    if (!nutzer) { navigate('/login'); return }
    await supabase.from('gym_members').insert({
      gym_id: halleId, user_id: nutzer.id, role: 'member'
    })
    setMeineHallenIds(prev => [...prev, halleId])
    setMitgliederMap(prev => ({ ...prev, [halleId]: (prev[halleId] || 0) + 1 }))
  }

  if (laden) return <div className="container"><p>Lädt...</p></div>

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0 }}>🏟️ Hallen</h1>
        <Link to="/halle-erstellen" className="btn">+ Halle erstellen</Link>
      </div>

      {/* Suche */}
      <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
        <input
          type="text"
          value={suche}
          onChange={e => hallenFiltern(e.target.value)}
          placeholder="🔍 Nach Name oder Stadt suchen..."
          style={{
            width: '100%', padding: '0.75rem 1rem',
            background: '#1a1a1a', border: '1px solid #2a2a2a',
            borderRadius: '10px', color: 'white', fontSize: '1rem',
            boxSizing: 'border-box'
          }}
        />
        {suche && (
          <button onClick={() => hallenFiltern('')} style={{
            position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
            background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '1rem'
          }}>✕</button>
        )}
      </div>

      {/* Meine Hallen */}
      {meineHallenIds.length > 0 && !suche && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1rem', color: '#aaa' }}>MEINE HALLEN</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {hallen.filter(h => meineHallenIds.includes(h.id)).map(halle => (
              <HallenKarte key={halle.id} halle={halle}
                mitglieder={mitgliederMap[halle.id] || 0}
                routen={routenMap[halle.id] || 0}
                istMitglied={true}
                onBetreten={halleBetreten}
              />
            ))}
          </div>
        </div>
      )}

      {/* Alle Hallen */}
      <div style={{ marginBottom: '2rem' }}>
        {!suche && meineHallenIds.length > 0 && (
          <h2 style={{ marginBottom: '1rem', fontSize: '1rem', color: '#aaa' }}>ALLE HALLEN</h2>
        )}
        {gefiltert.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: '#666' }}>Keine Hallen gefunden für "{suche}"</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {gefiltert.map(halle => (
              <HallenKarte key={halle.id} halle={halle}
                mitglieder={mitgliederMap[halle.id] || 0}
                routen={routenMap[halle.id] || 0}
                istMitglied={meineHallenIds.includes(halle.id)}
                onBetreten={halleBetreten}
              />
            ))}
          </div>
        )}
      </div>

      {hallen.length === 0 && (
        <div style={{ textAlign: 'center', marginTop: '4rem' }}>
          <p style={{ marginBottom: '1rem', color: '#666' }}>Noch keine Hallen vorhanden.</p>
          <Link to="/halle-erstellen" className="btn">Halle erstellen</Link>
        </div>
      )}
    </div>
  )
}

function HallenKarte({ halle, mitglieder, routen, istMitglied, onBetreten }) {
  return (
    <Link to={`/halle/${halle.id}`} style={{ textDecoration: 'none' }}>
      <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '1rem' }}>

        {/* Hallenbild oder Platzhalter */}
        <div style={{
          width: '70px', height: '70px', borderRadius: '10px',
          background: halle.image_url ? 'transparent' : '#1a1a1a',
          border: '1px solid #2a2a2a', flexShrink: 0, overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem'
        }}>
          {halle.image_url
            ? <img src={halle.image_url} alt={halle.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : '🏟️'}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <strong style={{ color: 'white', fontSize: '1rem' }}>{halle.name}</strong>
            {halle.is_certified && (
              <span style={{
                background: 'rgba(0,200,81,0.15)', color: '#00c851',
                fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px'
              }}>✓ Zertifiziert</span>
            )}
          </div>
          <div style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            📍 {halle.city}
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#555' }}>👥 {mitglieder}</span>
            <span style={{ fontSize: '0.8rem', color: '#555' }}>🧗 {routen} Routen</span>
          </div>
        </div>

        {/* Beitreten Button */}
        {!istMitglied && (
          <button
            onClick={e => onBetreten(e, halle.id)}
            style={{
              background: 'rgba(255,107,0,0.1)', border: '1px solid #ff6b00',
              color: '#ff6b00', padding: '0.4rem 0.75rem',
              borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem',
              flexShrink: 0, fontWeight: 'bold'
            }}
          >
            + Beitreten
          </button>
        )}
        {istMitglied && (
          <span style={{ color: '#00c851', fontSize: '0.8rem', flexShrink: 0 }}>✓ Dabei</span>
        )}
      </div>
    </Link>
  )
}

export default Hallen