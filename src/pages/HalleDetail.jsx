import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import TickButton from '../components/TickButton'

function HalleDetail() {
  const { gymId: id } = useParams()
  const navigate = useNavigate()
  const [halle, setHalle] = useState(null)
  const [routen, setRouten] = useState([])
  const [sektionen, setSektionen] = useState([])
  const [laden, setLaden] = useState(true)
  const [bewertungen, setBewertungen] = useState({})
  const [nutzerRolle, setNutzerRolle] = useState(null)
  const [mitgliedschaft, setMitgliedschaft] = useState(null)
  const [beitretenLaden, setBeitretenLaden] = useState(false)
  const [vollbildSektion, setVollbildSektion] = useState(null)
  const [vollbildRouten, setVollbildRouten] = useState([])
  const [filterSektion, setFilterSektion] = useState('alle')
  const [filterGradVon, setFilterGradVon] = useState('')
  const [filterGradBis, setFilterGradBis] = useState('')
  const [filterSort, setFilterSort] = useState('neu')

  // Pinch-to-Zoom State
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const letzterPinch = useRef(null)
  const letzterPan = useRef(null)
  const bildContainerRef = useRef(null)

  const grade = ['4A', '4B', '4C', '5A', '5B', '5C', '6A', '6A+', '6B', '6B+', '6C', '6C+', '7A', '7A+', '7B', '7B+', '7C', '7C+', '8A']

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
      Object.keys(bewertungsMap).forEach(key => {
        bewertungsMap[key] = (bewertungsMap[key] / counts[key]).toFixed(1)
      })
      setBewertungen(bewertungsMap)

      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data: mitglied } = await supabase
          .from('gym_members').select('role')
          .eq('gym_id', id).eq('user_id', session.user.id).maybeSingle()
        setNutzerRolle(mitglied?.role || null)
        setMitgliedschaft(mitglied || null)
      }

      setLaden(false)
    }
    datenLaden()
  }, [id])

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
    await supabase.from('gym_members').delete().eq('gym_id', id).eq('user_id', session.user.id)
    setMitgliedschaft(null)
    setNutzerRolle(null)
    setBeitretenLaden(false)
  }

  async function vollbildOeffnen(sektion) {
    const { data: routenMitMarkern } = await supabase
      .from('routes')
      .select('id, name, color, setter_grade, marker_x, marker_y, marker_width, marker_height')
      .eq('section_id', sektion.id).eq('is_active', true)
      .not('marker_x', 'is', null)
    setVollbildRouten(routenMitMarkern || [])
    setVollbildSektion(sektion)
    // Zoom zurücksetzen beim Öffnen
    setZoom(1)
    setPanX(0)
    setPanY(0)
  }

  // ── Pinch-to-Zoom Touch Handler ───────────────────────────────────────────────
  function abstandZwischenTouches(touches) {
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  function mittelPunktZwischenTouches(touches) {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    }
  }

  function viewerTouchStart(e) {
    if (e.touches.length === 2) {
      // Pinch-Start: Abstand merken
      letzterPinch.current = {
        abstand: abstandZwischenTouches(e.touches),
        zoom,
        mittelX: mittelPunktZwischenTouches(e.touches).x,
        mittelY: mittelPunktZwischenTouches(e.touches).y,
      }
      letzterPan.current = null
    } else if (e.touches.length === 1 && zoom > 1) {
      // Pan bei gezoomtem Bild
      letzterPan.current = { x: e.touches[0].clientX - panX, y: e.touches[0].clientY - panY }
    }
  }

  function viewerTouchMove(e) {
    e.preventDefault()
    if (e.touches.length === 2 && letzterPinch.current) {
      // Pinch-Zoom berechnen
      const neuerAbstand = abstandZwischenTouches(e.touches)
      const skalierung = neuerAbstand / letzterPinch.current.abstand
      const neuerZoom = Math.max(1, Math.min(5, letzterPinch.current.zoom * skalierung))
      setZoom(neuerZoom)
      // Bei Zoom=1 Pan zurücksetzen
      if (neuerZoom === 1) { setPanX(0); setPanY(0) }
    } else if (e.touches.length === 1 && letzterPan.current && zoom > 1) {
      // Pan
      setPanX(e.touches[0].clientX - letzterPan.current.x)
      setPanY(e.touches[0].clientY - letzterPan.current.y)
    }
  }

  function viewerTouchEnd(e) {
    if (e.touches.length < 2) letzterPinch.current = null
    if (e.touches.length < 1) letzterPan.current = null
  }

  // Doppelklick zum Zoom zurücksetzen
  function doppelklickReset() {
    setZoom(1); setPanX(0); setPanY(0)
  }

  const istAdmin = nutzerRolle === 'admin' || nutzerRolle === 'moderator'

  const gefilterteRouten = routen
    .filter(r => {
      if (filterSektion !== 'alle' && r.section_id !== filterSektion) return false
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

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
        {!istAdmin && (
          mitgliedschaft ? (
            <button onClick={halleVerlassen} disabled={beitretenLaden}
              className="btn btn-outline" style={{ borderColor: '#ff4444', color: '#ff4444' }}>
              {beitretenLaden ? '...' : 'Verlassen'}
            </button>
          ) : (
            <button onClick={halleBetreten} disabled={beitretenLaden} className="btn">
              {beitretenLaden ? '...' : '🤝 Beitreten'}
            </button>
          )
        )}
        {istAdmin && (
          <Link to={`/halle/${id}/sektionen`} className="btn btn-outline">
            Sektionen & Routen
          </Link>
        )}
        <Link to={`/halle/${id}/ranking`} className="btn btn-outline">🏆 Ranking</Link>
        <Link to={`/halle/${id}/einstellungen`} className="btn btn-outline">⚙️ Einstellungen</Link>
      </div>

      {/* Sektionen Karussell */}
      {sektionen.filter(s => s.image_url).length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>🏔️ Wände</h2>
          <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem', scrollbarWidth: 'thin', scrollbarColor: '#ff6b00 #2a2a2a' }}>
            {sektionen.filter(s => s.image_url).map(sektion => (
              <div key={sektion.id} onClick={() => setFilterSektion(sektion.id)}
                style={{
                  flexShrink: 0, width: '200px', cursor: 'pointer',
                  borderRadius: '12px', overflow: 'hidden',
                  border: `2px solid ${filterSektion === sektion.id ? '#ff6b00' : 'transparent'}`,
                  transition: 'border-color 0.2s'
                }}
              >
                <div style={{ position: 'relative' }}>
                  <img src={sektion.image_url} alt={sektion.name}
                    onClick={e => { e.stopPropagation(); vollbildOeffnen(sektion) }}
                    style={{ width: '100%', height: '120px', objectFit: 'cover', display: 'block', cursor: 'zoom-in' }}
                  />
                  <div style={{
                    position: 'absolute', bottom: '6px', right: '6px',
                    background: 'rgba(0,0,0,0.6)', borderRadius: '4px',
                    padding: '2px 5px', fontSize: '0.7rem', color: 'white', pointerEvents: 'none'
                  }}>🔍 Wandplan</div>
                </div>
                <div style={{ padding: '0.5rem 0.75rem', background: filterSektion === sektion.id ? 'rgba(255,107,0,0.15)' : '#1a1a1a' }}>
                  <strong style={{ fontSize: '0.9rem', color: filterSektion === sektion.id ? '#ff6b00' : 'white' }}>
                    {sektion.name}
                  </strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filterleiste */}
      <div style={{
        marginTop: '2rem', padding: '1rem',
        background: '#1a1a1a', borderRadius: '12px', border: '1px solid #2a2a2a',
        display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end'
      }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.4rem', color: '#aaa', fontSize: '0.85rem' }}>Sektion</label>
          <select value={filterSektion} onChange={e => setFilterSektion(e.target.value)} style={selectStyle}>
            <option value="alle">Alle Sektionen</option>
            {sektionen.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.4rem', color: '#aaa', fontSize: '0.85rem' }}>Grad von</label>
          <select value={filterGradVon} onChange={e => setFilterGradVon(e.target.value)} style={selectStyle}>
            <option value="">Alle</option>
            {grade.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.4rem', color: '#aaa', fontSize: '0.85rem' }}>Grad bis</label>
          <select value={filterGradBis} onChange={e => setFilterGradBis(e.target.value)} style={selectStyle}>
            <option value="">Alle</option>
            {grade.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.4rem', color: '#aaa', fontSize: '0.85rem' }}>Sortierung</label>
          <select value={filterSort} onChange={e => setFilterSort(e.target.value)} style={selectStyle}>
            <option value="neu">Neueste zuerst</option>
            <option value="schwer">Schwerste zuerst</option>
            <option value="leicht">Leichteste zuerst</option>
          </select>
        </div>
        <button onClick={() => { setFilterSektion('alle'); setFilterGradVon(''); setFilterGradBis(''); setFilterSort('neu') }}
          style={{ background: 'transparent', border: '1px solid #444', color: '#aaa', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}>
          Zurücksetzen
        </button>
      </div>

      {/* Routen */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1.5rem 0 1rem' }}>
        <h2 style={{ margin: 0 }}>Routen ({gefilterteRouten.length})</h2>
      </div>

      {gefilterteRouten.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ marginBottom: '0.5rem' }}>Keine Routen gefunden.</p>
          {istAdmin && <Link to={`/halle/${id}/sektionen`} style={{ color: '#ff6b00' }}>Sektionen & Routen verwalten →</Link>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '3rem' }}>
          {gefilterteRouten.map(route => {
            const sektion = sektionen.find(s => s.id === route.section_id)
            return (
              <div key={route.id} className="card"
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', minHeight: '72px' }}
                onClick={() => navigate(`/route/${route.id}`)}
              >
                {route.image_url ? (
                  <img src={route.image_url} alt={route.name} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: '8px', alignSelf: 'stretch', borderRadius: '4px', backgroundColor: route.color, flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '1.1rem', color: 'white' }}>{route.name}</strong>
                    <span style={{ background: 'rgba(255,107,0,0.15)', color: '#ff6b00', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                      {route.setter_grade}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                    {sektion && <span style={{ fontSize: '0.8rem', color: '#666' }}>📍 {sektion.name}</span>}
                    {bewertungen[route.id] && <span style={{ fontSize: '0.8rem', color: '#FFD700' }}>⭐ {bewertungen[route.id]}</span>}
                    <span style={{ fontSize: '0.8rem', color: '#666' }}>💬 Details</span>
                  </div>
                </div>
                <div onClick={e => e.stopPropagation()}>
                  <TickButton routeId={route.id} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Vollbild Wandplan mit Pinch-to-Zoom ── */}
      {vollbildSektion && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '1rem',
            // Kein onClick auf dem Hintergrund beim Zoomen
          }}
        >
          {/* Header */}
          <div style={{
            width: '100%', maxWidth: '900px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '0.75rem', flexShrink: 0
          }}>
            <div>
              <h2 style={{ margin: 0, color: 'white', fontSize: '1rem' }}>
                🏔️ {vollbildSektion.name}
              </h2>
              <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '0.2rem' }}>
                {zoom > 1
                  ? `Zoom: ${zoom.toFixed(1)}× · Doppeltipp zum Zurücksetzen`
                  : 'Pinch zum Zoomen · Tippe auf Route für Details'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {zoom > 1 && (
                <button onClick={doppelklickReset} style={{
                  background: 'rgba(255,255,255,0.1)', border: 'none',
                  color: 'white', borderRadius: '8px', padding: '0.3rem 0.7rem',
                  cursor: 'pointer', fontSize: '0.8rem'
                }}>↩ Reset</button>
              )}
              <button onClick={() => setVollbildSektion(null)} style={{
                background: 'rgba(255,255,255,0.1)', border: 'none',
                color: 'white', borderRadius: '50%', width: '40px', height: '40px',
                cursor: 'pointer', fontSize: '1.2rem', flexShrink: 0
              }}>✕</button>
            </div>
          </div>

          {/* Bild-Container mit Zoom */}
          <div
            ref={bildContainerRef}
            onTouchStart={viewerTouchStart}
            onTouchMove={viewerTouchMove}
            onTouchEnd={viewerTouchEnd}
            onDoubleClick={doppelklickReset}
            style={{
              position: 'relative', maxWidth: '900px', width: '100%',
              maxHeight: '80vh', overflow: 'hidden',
              // Cursor zeigt ob pan möglich ist
              cursor: zoom > 1 ? 'grab' : 'default',
              touchAction: 'none'  // verhindert Browser-Zoom
            }}
          >
            <div style={{
              transform: `scale(${zoom}) translate(${panX / zoom}px, ${panY / zoom}px)`,
              transformOrigin: 'center center',
              transition: letzterPinch.current ? 'none' : 'transform 0.1s ease-out'
            }}>
              <img
                src={vollbildSektion.image_url}
                alt={vollbildSektion.name}
                style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain', display: 'block', borderRadius: '8px' }}
                draggable={false}
              />

              {/* Routen-Marker – nur bei zoom=1 klickbar damit Pinch nicht zu Route navigiert */}
              {vollbildRouten.map(route => (
                <RoutenRahmen
                  key={route.id}
                  route={route}
                  klickbar={zoom <= 1.2}
                  onClick={() => {
                    if (zoom > 1.2) return  // kein versehentlicher Klick beim Zoomen
                    setVollbildSektion(null)
                    navigate(`/route/${route.id}`)
                  }}
                />
              ))}
            </div>
          </div>

          {vollbildRouten.length === 0 && (
            <p style={{ color: '#555', fontSize: '0.8rem', marginTop: '0.75rem' }}>
              Noch keine Routen markiert
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function RoutenRahmen({ route, onClick, klickbar }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={klickbar ? onClick : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'absolute',
        left: `${route.marker_x}%`, top: `${route.marker_y}%`,
        width: `${route.marker_width}%`, height: `${route.marker_height}%`,
        border: `3px solid ${route.color}`, borderRadius: '6px',
        background: hovered ? `${route.color}44` : `${route.color}11`,
        boxSizing: 'border-box',
        cursor: klickbar ? 'pointer' : 'default',
        transition: 'background 0.15s', zIndex: 10
      }}
    >
      <div style={{
        position: 'absolute', bottom: '100%', left: '0', marginBottom: '3px',
        background: route.color, color: 'white', fontSize: '0.7rem',
        padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap',
        boxShadow: '0 1px 4px rgba(0,0,0,0.5)', pointerEvents: 'none'
      }}>
        {route.name} · {route.setter_grade}
      </div>
    </div>
  )
}

const selectStyle = {
  padding: '0.5rem 0.75rem', borderRadius: '8px',
  border: '1px solid #2a2a2a', background: '#111',
  color: 'white', fontSize: '0.9rem', cursor: 'pointer'
}

export default HalleDetail