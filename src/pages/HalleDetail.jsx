import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import TickButton from '../components/TickButton'
import { farbName } from '../utils/farben'

function HalleDetail() {
  const { gymId: id } = useParams()
  const navigate = useNavigate()
  const [halle, setHalle] = useState(null)
  const [routen, setRouten] = useState([])
  const [sektionen, setSektionen] = useState([])
  const [laden, setLaden] = useState(true)
  const [bewertungen, setBewertungen] = useState({})
  const [nutzerRolle, setNutzerRolle] = useState(null)
  const [nutzerId, setNutzerId] = useState(null)
  const [vollbildBild, setVollbildBild] = useState(null)
  const [vollbildSektion, setVollbildSektion] = useState(null)
  const [vollbildMarker, setVollbildMarker] = useState([])
  const [mitgliedschaft, setMitgliedschaft] = useState(null)
  const [beitretenLaden, setBeitretenLaden] = useState(false)

  const [filterSektion, setFilterSektion] = useState('alle')
  const [filterGradVon, setFilterGradVon] = useState('')
  const [filterGradBis, setFilterGradBis] = useState('')
  const [filterSort, setFilterSort] = useState('neu')

  const grade = ['4A','4B','4C','5A','5B','5C','6A','6A+','6B','6B+','6C','6C+','7A','7A+','7B','7B+','7C','7C+','8A']

  useEffect(() => {
    async function datenLaden() {
      const { data: halleData } = await supabase
        .from('gyms').select('*').eq('id', id).single()
      setHalle(halleData)

      const { data: sektionenData } = await supabase
        .from('sections').select('*').eq('gym_id', id)
      setSektionen(sektionenData || [])

      const { data: routenData } = await supabase
        .from('routes').select('*').eq('gym_id', id).eq('is_active', true)
      setRouten(routenData || [])

      const { data: ratingsData } = await supabase
        .from('route_ratings').select('route_id, stars')
        .in('route_id', (routenData || []).map(r => r.id))

      const bewertungsMap = {}
      const counts = {}
      ;(ratingsData || []).forEach(r => {
        if (!bewertungsMap[r.route_id]) { bewertungsMap[r.route_id] = 0; counts[r.route_id] = 0 }
        bewertungsMap[r.route_id] += r.stars
        counts[r.route_id]++
      })
      Object.keys(bewertungsMap).forEach(id => {
        bewertungsMap[id] = (bewertungsMap[id] / counts[id]).toFixed(1)
      })
      setBewertungen(bewertungsMap)

      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setNutzerId(session.user.id)
        const { data: mitglied } = await supabase
          .from('gym_members').select('role')
          .eq('gym_id', id).eq('user_id', session.user.id).single()
        setNutzerRolle(mitglied?.role || null)
        setMitgliedschaft(mitglied || null)
      }

      setLaden(false)
    }
    datenLaden()
  }, [id])

  const istAdmin = nutzerRolle === 'admin' || nutzerRolle === 'moderator'

  async function halleBetreten() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { navigate('/login'); return }
    setBeitretenLaden(true)
    const { error } = await supabase.from('gym_members').insert({
      gym_id: id, user_id: session.user.id, role: 'member'
    })
    if (!error) { setMitgliedschaft({ role: 'member' }); setNutzerRolle('member') }
    setBeitretenLaden(false)
  }

  async function halleVerlassen() {
    const { data: { session } } = await supabase.auth.getSession()
    setBeitretenLaden(true)
    await supabase.from('gym_members').delete()
      .eq('gym_id', id).eq('user_id', session.user.id)
    setMitgliedschaft(null); setNutzerRolle(null)
    setBeitretenLaden(false)
  }

  // Sektionen mit gleichem Namen zusammenfassen
  const eindeutigeSektionen = sektionen.reduce((acc, s) => {
    if (!acc.find(x => x.name === s.name)) acc.push(s)
    return acc
  }, [])

  const gefilterteRouten = routen
    .filter(r => {
      if (filterSektion !== 'alle') {
        const sektionenMitName = sektionen.filter(s => s.name === filterSektion).map(s => s.id)
        if (!sektionenMitName.includes(r.section_id)) return false
      }
      if (filterGradVon && grade.indexOf(r.setter_grade) < grade.indexOf(filterGradVon)) return false
      if (filterGradBis && grade.indexOf(r.setter_grade) > grade.indexOf(filterGradBis)) return false
      return true
    })
    .sort((a, b) => {
      if (filterSort === 'neu') return new Date(b.created_at) - new Date(a.created_at)
      if (filterSort === 'schwer') return grade.indexOf(b.setter_grade) - grade.indexOf(a.setter_grade)
      if (filterSort === 'leicht') return grade.indexOf(a.setter_grade) - grade.indexOf(b.setter_grade)
      return 0
    })

  if (laden) return <div className="container"><p>Lädt...</p></div>
  if (!halle) return <div className="container"><h1>Halle nicht gefunden</h1></div>

  return (
    <div className="container">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
        <h1>{halle.name}</h1>
        {halle.is_certified && <span className="badge badge-green">✓ Zertifiziert</span>}
      </div>
      <p>📍 {halle.city}</p>

      {/* Buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
        {!istAdmin && (
          mitgliedschaft ? (
            <button onClick={halleVerlassen} disabled={beitretenLaden}
              className="btn btn-outline" style={{ borderColor: '#ff4444', color: '#ff4444' }}>
              {beitretenLaden ? '...' : 'Halle verlassen'}
            </button>
          ) : (
            <button onClick={halleBetreten} disabled={beitretenLaden} className="btn">
              {beitretenLaden ? '...' : '🤝 Beitreten'}
            </button>
          )
        )}
        {nutzerId && (
          <Link to={`/halle/${id}/nutzer/${nutzerId}`} className="btn btn-outline">
            👤 Mein Hallenprofil
          </Link>
        )}
        {istAdmin && (
          <Link to={`/halle/${id}/sektionen`} className="btn btn-outline">
            Sektionen & Routen verwalten
          </Link>
        )}
        <Link to={`/halle/${id}/ranking`} className="btn btn-outline">
          🏆 Ranking
        </Link>
        {istAdmin && (
          <Link to={`/halle/${id}/einstellungen`} className="btn btn-outline">
            ⚙️ Einstellungen
          </Link>
        )}
      </div>

      {/* Sektionen Karussell */}
      {sektionen.filter(s => s.image_url).length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>🏔️ Wände</h2>
          <div style={{
            display: 'flex', gap: '1rem',
            overflowX: 'auto', paddingBottom: '1rem',
            scrollbarWidth: 'thin', scrollbarColor: '#ff6b00 #2a2a2a'
          }}>
            {sektionen.filter(s => s.image_url).map(sektion => (
              <div key={sektion.id}
                onClick={() => setFilterSektion(sektion.name)}
                style={{
                  flexShrink: 0, width: '200px', cursor: 'pointer',
                  borderRadius: '12px', overflow: 'hidden',
                  border: `2px solid ${filterSektion === sektion.name ? '#ff6b00' : 'transparent'}`,
                  transition: 'border-color 0.2s'
                }}
              >
                <img src={sektion.image_url} alt={sektion.name}
                  onClick={async e => {
                    e.stopPropagation()
                    setVollbildBild(sektion.image_url)
                    setVollbildSektion(sektion)
                    const { data } = await supabase
                      .from('routes')
                      .select('id, name, color, setter_grade, marker_x, marker_y, marker_width, marker_height')
                      .eq('section_id', sektion.id)
                      .eq('is_active', true)
                      .not('marker_x', 'is', null)
                    setVollbildMarker(data || [])
                  }}
                  style={{ width: '100%', height: '120px', objectFit: 'cover', display: 'block', cursor: 'zoom-in' }}
                />
                <div style={{
                  padding: '0.5rem 0.75rem',
                  background: filterSektion === sektion.name ? 'rgba(255,107,0,0.15)' : '#1a1a1a'
                }}>
                  <strong style={{
                    fontSize: '0.9rem',
                    color: filterSektion === sektion.name ? '#ff6b00' : 'white'
                  }}>{sektion.name}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filterleiste – horizontal scrollbar */}
      <div style={{
        marginTop: '2rem',
        display: 'flex', gap: '0.75rem', alignItems: 'center',
        overflowX: 'auto', paddingBottom: '0.5rem',
        scrollbarWidth: 'none'
      }}>
        <select value={filterSektion}
          onChange={e => setFilterSektion(e.target.value)} style={selectStyle}>
          <option value="alle">Alle Sektionen</option>
          {eindeutigeSektionen.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>
        <select value={filterGradVon}
          onChange={e => setFilterGradVon(e.target.value)} style={selectStyle}>
          <option value="">Grad von</option>
          {grade.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={filterGradBis}
          onChange={e => setFilterGradBis(e.target.value)} style={selectStyle}>
          <option value="">Grad bis</option>
          {grade.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={filterSort}
          onChange={e => setFilterSort(e.target.value)} style={selectStyle}>
          <option value="neu">Neueste</option>
          <option value="schwer">Schwerste</option>
          <option value="leicht">Leichteste</option>
        </select>
        <button
          onClick={() => { setFilterSektion('alle'); setFilterGradVon(''); setFilterGradBis(''); setFilterSort('neu') }}
          style={{
            background: 'transparent', border: '1px solid #444',
            color: '#aaa', padding: '0.5rem 0.75rem',
            borderRadius: '8px', cursor: 'pointer', flexShrink: 0
          }}
        >✕</button>
      </div>

      {/* Routen */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1.5rem 0 1rem' }}>
        <h2 style={{ margin: 0 }}>Routen ({gefilterteRouten.length})</h2>
      </div>

      {gefilterteRouten.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ marginBottom: '0.5rem' }}>Keine Routen gefunden.</p>
          {istAdmin && (
            <Link to={`/halle/${id}/sektionen`} style={{ color: '#ff6b00' }}>
              Sektionen & Routen verwalten →
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '3rem' }}>
          {gefilterteRouten.map(route => {
            const sektion = sektionen.find(s => s.id === route.section_id)
            return (
              <div
                key={route.id}
                className="card"
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.75rem' }}
                onClick={() => navigate(`/route/${route.id}`)}
              >
                {/* Routenbild oder Farbbalken */}
                {route.image_url ? (
                  <img src={route.image_url} alt={route.name} style={{
                    width: '60px', height: '60px', objectFit: 'cover',
                    borderRadius: '8px', flexShrink: 0
                  }} />
                ) : (
                  <div style={{
                    width: '8px', alignSelf: 'stretch', borderRadius: '4px',
                    backgroundColor: route.color, flexShrink: 0
                  }} />
                )}

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Farbe als Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: route.color, flexShrink: 0 }} />
                    <strong style={{ color: 'white', fontSize: '0.95rem' }}>{farbName(route.color)}</strong>
                    <span style={{
                      background: 'rgba(255,107,0,0.15)', color: '#ff6b00',
                      padding: '0.15rem 0.5rem', borderRadius: '20px',
                      fontSize: '0.85rem', fontWeight: 'bold', flexShrink: 0
                    }}>
                      {route.setter_grade}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {sektion && <span style={{ fontSize: '0.8rem', color: '#666' }}>📍 {sektion.name}</span>}
                    {bewertungen[route.id] && (
                      <span style={{ fontSize: '0.8rem', color: '#FFD700' }}>⭐ {bewertungen[route.id]}</span>
                    )}
                  </div>
                </div>

                {/* Tick Button */}
                <div onClick={e => e.stopPropagation()} style={{ flexShrink: 0 }}>
                  <TickButton routeId={route.id} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Vollbild Viewer */}
      {vollbildBild && (
        <div onClick={() => { setVollbildBild(null); setVollbildMarker([]) }} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.95)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, cursor: 'zoom-out', padding: '1rem'
        }}>
          <button onClick={() => setVollbildBild(null)} style={{
            position: 'absolute', top: '1rem', right: '1rem',
            background: 'rgba(255,255,255,0.1)', border: 'none',
            color: 'white', borderRadius: '50%', width: '40px', height: '40px',
            cursor: 'pointer', fontSize: '1.2rem'
          }}>✕</button>
          <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '90vh' }}>
            <img src={vollbildBild} alt="Vollbild"
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px', display: 'block' }}
            />
            {vollbildMarker.map(r => (
              <div
                key={r.id}
                onClick={e => { e.stopPropagation(); setVollbildBild(null); navigate(`/route/${r.id}`) }}
                style={{
                  position: 'absolute',
                  left: `${r.marker_x}%`, top: `${r.marker_y}%`,
                  width: `${r.marker_width}%`, height: `${r.marker_height}%`,
                  border: `2px solid ${r.color}`,
                  borderRadius: '6px',
                  background: `${r.color}22`,
                  boxSizing: 'border-box',
                  cursor: 'pointer'
                }}
              >
                <div style={{
                  position: 'absolute', bottom: '100%', left: 0, marginBottom: '2px',
                  background: r.color, color: 'white',
                  fontSize: '0.7rem', fontWeight: 'bold',
                  padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap',
                  pointerEvents: 'none'
                }}>
                  {r.setter_grade}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const selectStyle = {
  padding: '0.5rem 0.75rem',
  borderRadius: '8px',
  border: '1px solid #2a2a2a',
  background: '#111',
  color: 'white',
  fontSize: '0.9rem',
  cursor: 'pointer',
  flexShrink: 0
}

export default HalleDetail