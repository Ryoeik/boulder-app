import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabase'

function WandplanEditor() {
  const { gymId, sektionId } = useParams()
  const [sektion, setSektion] = useState(null)
  const [routen, setRouten] = useState([])
  const [aktivesRild, setAktivesBild] = useState(null)
  const [marker, setMarker] = useState([])
  const [zieheMarker, setZieheMarker] = useState(null)
  const [gewaehlteRoute, setGewaehlteRoute] = useState(null)
  const [laden, setLaden] = useState(true)
  const [gespeichert, setGespeichert] = useState(false)
  const bildRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    async function datenLaden() {
      const { data: sektionData } = await supabase
        .from('sections').select('*').eq('id', sektionId).single()
      setSektion(sektionData)
      if (sektionData?.image_url) setAktivesBild(sektionData.image_url)

      const { data: routenData } = await supabase
        .from('routes').select('*').eq('section_id', sektionId)
      setRouten(routenData || [])

      // Bestehende Marker laden
      const markerDaten = (routenData || [])
        .filter(r => r.marker_x !== null)
        .map(r => ({
          routeId: r.id,
          x: r.marker_x,
          y: r.marker_y,
          width: r.marker_width,
          height: r.marker_height,
          color: r.color,
          name: r.name
        }))
      setMarker(markerDaten)
      setLaden(false)
    }
    datenLaden()
  }, [sektionId])

  function mausStart(e) {
    if (!gewaehlteRoute) return
    e.preventDefault()

    const rect = containerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    setZieheMarker({ startX: x, startY: y, x, y, width: 0, height: 0 })
  }

  function mausBewegen(e) {
    if (!zieheMarker) return
    e.preventDefault()

    const rect = containerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    setZieheMarker(prev => ({
      ...prev,
      x: Math.min(prev.startX, x),
      y: Math.min(prev.startY, y),
      width: Math.abs(x - prev.startX),
      height: Math.abs(y - prev.startY)
    }))
  }

  function mausEnde() {
    if (!zieheMarker || !gewaehlteRoute) return
    if (zieheMarker.width < 1 || zieheMarker.height < 1) {
      setZieheMarker(null)
      return
    }

    const route = routen.find(r => r.id === gewaehlteRoute)
    const neuerMarker = {
      routeId: gewaehlteRoute,
      x: zieheMarker.x,
      y: zieheMarker.y,
      width: zieheMarker.width,
      height: zieheMarker.height,
      color: route?.color || '#ff6b00',
      name: route?.name || ''
    }

    setMarker(prev => [...prev.filter(m => m.routeId !== gewaehlteRoute), neuerMarker])
    setZieheMarker(null)
  }

  function markerLoeschen(routeId) {
    setMarker(prev => prev.filter(m => m.routeId !== routeId))
  }

  async function speichern() {
    setLaden(true)

    for (const m of marker) {
      await supabase.from('routes').update({
        marker_x: m.x,
        marker_y: m.y,
        marker_width: m.width,
        marker_height: m.height
      }).eq('id', m.routeId)
    }

    // Gelöschte Marker zurücksetzen
    const markierteRouteIds = marker.map(m => m.routeId)
    const nichtMarkierteRouten = routen.filter(r => !markierteRouteIds.includes(r.id))
    for (const r of nichtMarkierteRouten) {
      await supabase.from('routes').update({
        marker_x: null, marker_y: null,
        marker_width: null, marker_height: null
      }).eq('id', r.id)
    }

    setGespeichert(true)
    setTimeout(() => setGespeichert(false), 2000)
    setLaden(false)
  }

  if (laden) return <div className="container"><p>Lädt...</p></div>

  return (
    <div className="container" style={{ maxWidth: '900px' }}>
      <Link to={`/halle/${gymId}/sektionen`} style={{ color: '#aaa', textDecoration: 'none', fontSize: '0.9rem' }}>
        ← Zurück zu Sektionen
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.5rem 0 1.5rem' }}>
        <h1>🗺️ Wandplan: {sektion?.name}</h1>
        <button className="btn" onClick={speichern} disabled={laden}>
          {gespeichert ? '✅ Gespeichert!' : 'Speichern'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>

        {/* Bild mit Markern */}
        <div style={{ flex: 2, minWidth: '300px' }}>
          {aktivesRild ? (
            <div
              ref={containerRef}
              style={{ position: 'relative', cursor: gewaehlteRoute ? 'crosshair' : 'default', userSelect: 'none' }}
              onMouseDown={mausStart}
              onMouseMove={mausBewegen}
              onMouseUp={mausEnde}
              onMouseLeave={mausEnde}
            >
              <img
                ref={bildRef}
                src={aktivesRild}
                alt="Wandplan"
                style={{ width: '100%', display: 'block', borderRadius: '12px' }}
                draggable={false}
              />

              {/* Bestehende Marker */}
              {marker.map(m => (
                <div
                  key={m.routeId}
                  style={{
                    position: 'absolute',
                    left: `${m.x}%`, top: `${m.y}%`,
                    width: `${m.width}%`, height: `${m.height}%`,
                    border: `3px solid ${m.color}`,
                    borderRadius: '6px',
                    background: `${m.color}22`,
                    boxSizing: 'border-box',
                    pointerEvents: 'none'
                  }}
                >
                  <span style={{
                    position: 'absolute', top: '-22px', left: '0',
                    background: m.color, color: 'white',
                    fontSize: '0.7rem', padding: '1px 6px',
                    borderRadius: '4px', whiteSpace: 'nowrap'
                  }}>{m.name || 'Route'}</span>
                </div>
              ))}

              {/* Marker der gerade gezogen wird */}
              {zieheMarker && (
                <div style={{
                  position: 'absolute',
                  left: `${zieheMarker.x}%`, top: `${zieheMarker.y}%`,
                  width: `${zieheMarker.width}%`, height: `${zieheMarker.height}%`,
                  border: '3px dashed #ff6b00',
                  borderRadius: '6px',
                  background: 'rgba(255,107,0,0.1)',
                  boxSizing: 'border-box',
                  pointerEvents: 'none'
                }} />
              )}
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p>Kein Wandbild vorhanden.</p>
              <Link to={`/halle/${gymId}/sektionen`} style={{ color: '#ff6b00' }}>
                Bild in Sektionen hochladen →
              </Link>
            </div>
          )}
        </div>

        {/* Routen Liste */}
        <div style={{ flex: 1, minWidth: '220px' }}>
          <h2 style={{ marginBottom: '1rem' }}>Routen</h2>
          <p style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '1rem' }}>
            Route auswählen → auf dem Bild Rechteck ziehen
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {routen.map(route => {
              const hatMarker = marker.some(m => m.routeId === route.id)
              const istAktiv = gewaehlteRoute === route.id
              return (
                <div
                  key={route.id}
                  style={{
                    padding: '0.75rem', borderRadius: '8px', cursor: 'pointer',
                    border: `2px solid ${istAktiv ? '#ff6b00' : hatMarker ? route.color : '#2a2a2a'}`,
                    background: istAktiv ? 'rgba(255,107,0,0.1)' : 'transparent',
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => setGewaehlteRoute(istAktiv ? null : route.id)}
                >
                  <div style={{
                    width: '12px', height: '12px', borderRadius: '50%',
                    background: route.color, flexShrink: 0
                  }} />
                  <span style={{ flex: 1, fontSize: '0.9rem', color: 'white' }}>{route.name}</span>
                  {hatMarker && (
                    <button
                      onClick={e => { e.stopPropagation(); markerLoeschen(route.id) }}
                      style={{
                        background: 'transparent', border: 'none',
                        color: '#ff4444', cursor: 'pointer', fontSize: '1rem'
                      }}
                    >✕</button>
                  )}
                  {hatMarker && <span style={{ fontSize: '0.7rem', color: '#00c851' }}>✓</span>}
                </div>
              )
            })}
          </div>

          {routen.length === 0 && (
            <p style={{ color: '#666', fontSize: '0.9rem' }}>
              Noch keine Routen in dieser Sektion.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default WandplanEditor