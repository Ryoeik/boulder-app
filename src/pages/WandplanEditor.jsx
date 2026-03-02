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
  const [speichernLaden, setSpeichernLaden] = useState(false)
  const [gespeichert, setGespeichert] = useState(false)
  const [fortschritt, setFortschritt] = useState('')
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const bildRef = useRef(null)
  const containerRef = useRef(null)
  const letzterPinch = useRef(null)
  const letzterPan = useRef(null)

  useEffect(() => {
    async function datenLaden() {
      const { data: sektionData } = await supabase
        .from('sections').select('*').eq('id', sektionId).single()
      setSektion(sektionData)
      if (sektionData?.image_url) setAktivesBild(sektionData.image_url)

      const { data: routenData } = await supabase
        .from('routes').select('*').eq('section_id', sektionId)
      setRouten(routenData || [])

      const markerDaten = (routenData || [])
        .filter(r => r.marker_x !== null)
        .map(r => ({
          routeId: r.id,
          x: r.marker_x, y: r.marker_y,
          width: r.marker_width, height: r.marker_height,
          color: r.color, name: r.name
        }))
      setMarker(markerDaten)
      setLaden(false)
    }
    datenLaden()
  }, [sektionId])

  function koordinatenAusProzent(clientX, clientY) {
    const rect = containerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100))
    return { x, y }
  }

  function mausStart(e) {
    if (!gewaehlteRoute) return
    e.preventDefault()
    const { x, y } = koordinatenAusProzent(e.clientX, e.clientY)
    setZieheMarker({ startX: x, startY: y, x, y, width: 0, height: 0 })
  }

  function mausBewegen(e) {
    if (!zieheMarker) return
    e.preventDefault()
    const { x, y } = koordinatenAusProzent(e.clientX, e.clientY)
    setZieheMarker(prev => ({
      ...prev,
      x: Math.min(prev.startX, x), y: Math.min(prev.startY, y),
      width: Math.abs(x - prev.startX), height: Math.abs(y - prev.startY)
    }))
  }

  function mausEnde() { markerFertigstellen() }

  function touchStart(e) {
    if (!gewaehlteRoute || e.touches.length !== 1) return
    e.preventDefault()
    const touch = e.touches[0]
    const { x, y } = koordinatenAusProzent(touch.clientX, touch.clientY)
    setZieheMarker({ startX: x, startY: y, x, y, width: 0, height: 0 })
  }

  function touchBewegen(e) {
    if (!zieheMarker || e.touches.length !== 1) return
    e.preventDefault()
    const touch = e.touches[0]
    const { x, y } = koordinatenAusProzent(touch.clientX, touch.clientY)
    setZieheMarker(prev => ({
      ...prev,
      x: Math.min(prev.startX, x), y: Math.min(prev.startY, y),
      width: Math.abs(x - prev.startX), height: Math.abs(y - prev.startY)
    }))
  }

  function touchEnde() { markerFertigstellen() }

  function pinchAbstand(touches) {
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  function editorTouchStart(e) {
    if (gewaehlteRoute && e.touches.length === 1) {
      touchStart(e)
    } else if (e.touches.length === 2) {
      letzterPinch.current = { abstand: pinchAbstand(e.touches), zoom }
      letzterPan.current = null
    } else if (e.touches.length === 1 && zoom > 1) {
      letzterPan.current = { x: e.touches[0].clientX - panX, y: e.touches[0].clientY - panY }
    }
  }

  function editorTouchMove(e) {
    if (gewaehlteRoute && e.touches.length === 1) {
      touchBewegen(e)
      return
    }
    e.preventDefault()
    if (e.touches.length === 2 && letzterPinch.current) {
      const neuerZoom = Math.max(1, Math.min(5, letzterPinch.current.zoom * (pinchAbstand(e.touches) / letzterPinch.current.abstand)))
      setZoom(neuerZoom)
      if (neuerZoom === 1) { setPanX(0); setPanY(0) }
    } else if (e.touches.length === 1 && letzterPan.current && zoom > 1) {
      setPanX(e.touches[0].clientX - letzterPan.current.x)
      setPanY(e.touches[0].clientY - letzterPan.current.y)
    }
  }

  function editorTouchEnd(e) {
    if (gewaehlteRoute) { touchEnde(); return }
    if (e.touches.length < 2) letzterPinch.current = null
    if (e.touches.length < 1) letzterPan.current = null
  }

  function zoomZuruecksetzen() {
    setZoom(1); setPanX(0); setPanY(0)
  }

  function markerFertigstellen() {
    if (!zieheMarker || !gewaehlteRoute) return
    if (zieheMarker.width < 2 || zieheMarker.height < 2) {
      setZieheMarker(null)
      return
    }
    const route = routen.find(r => r.id === gewaehlteRoute)
    const neuerMarker = {
      routeId: gewaehlteRoute,
      x: zieheMarker.x, y: zieheMarker.y,
      width: zieheMarker.width, height: zieheMarker.height,
      color: route?.color || '#ff6b00',
      name: route?.name || ''
    }
    setMarker(prev => [...prev.filter(m => m.routeId !== gewaehlteRoute), neuerMarker])
    setZieheMarker(null)
    setGewaehlteRoute(null)
  }

  function markerLoeschen(routeId) {
    setMarker(prev => prev.filter(m => m.routeId !== routeId))
  }

  async function bildAusschnittErstellen(m) {
    return new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const zielBreite = Math.max(400, Math.round(img.naturalWidth * (m.width / 100)))
        const zielHoehe  = Math.round(zielBreite * (m.height / m.width))
        const canvas = document.createElement('canvas')
        canvas.width  = zielBreite
        canvas.height = zielHoehe
        const ctx = canvas.getContext('2d')
        const quellX = (m.x / 100) * img.naturalWidth
        const quellY = (m.y / 100) * img.naturalHeight
        const quellB = (m.width  / 100) * img.naturalWidth
        const quellH = (m.height / 100) * img.naturalHeight
        ctx.drawImage(img, quellX, quellY, quellB, quellH, 0, 0, zielBreite, zielHoehe)
        canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.85)
      }
      img.onerror = () => resolve(null)
      img.src = aktivesRild
    })
  }

  async function speichern() {
    setSpeichernLaden(true)
    setFortschritt('Speichere Marker...')
    for (const m of marker) {
      setFortschritt(`📸 Erstelle Bild für "${m.name}"...`)
      const blob = await bildAusschnittErstellen(m)
      let imageUrl = null
      if (blob) {
        const dateiName = `${m.routeId}-marker.jpg`
        await supabase.storage.from('route-images').remove([dateiName])
        const { error: uploadError } = await supabase.storage
          .from('route-images').upload(dateiName, blob, { contentType: 'image/jpeg' })
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('route-images').getPublicUrl(dateiName)
          imageUrl = urlData.publicUrl
        }
      }
      await supabase.from('routes').update({
        marker_x: m.x, marker_y: m.y,
        marker_width: m.width, marker_height: m.height,
        ...(imageUrl ? { image_url: imageUrl } : {})
      }).eq('id', m.routeId)
    }
    const markierteRouteIds = marker.map(m => m.routeId)
    const nichtMarkierteRouten = routen.filter(r => !markierteRouteIds.includes(r.id))
    for (const r of nichtMarkierteRouten) {
      setFortschritt(`🗑️ Entferne Marker von "${r.name}"...`)
      await supabase.from('routes').update({
        marker_x: null, marker_y: null,
        marker_width: null, marker_height: null,
        image_url: null
      }).eq('id', r.id)
      await supabase.storage.from('route-images').remove([`${r.id}-marker.jpg`])
    }
    setFortschritt('')
    setGespeichert(true)
    setTimeout(() => setGespeichert(false), 2000)
    setSpeichernLaden(false)
  }

  if (laden) return <div className="container"><p>Lädt...</p></div>

  return (
    <div className="container" style={{ maxWidth: '900px' }}>
      <Link to={`/halle/${gymId}/sektionen`} style={{ color: '#aaa', textDecoration: 'none', fontSize: '0.9rem' }}>
        ← Zurück zu Sektionen
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.5rem 0 1.5rem' }}>
        <h1>🗺️ Wandplan: {sektion?.name}</h1>
        <button className="btn" onClick={speichern} disabled={speichernLaden}>
          {gespeichert ? '✅ Gespeichert!' : speichernLaden ? '⏳ Speichert...' : 'Speichern'}
        </button>
      </div>

      {fortschritt && (
        <div style={{
          background: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.3)',
          borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem',
          fontSize: '0.85rem', color: '#ff6b00'
        }}>
          {fortschritt}
        </div>
      )}

      <div style={{
        background: 'rgba(255,107,0,0.08)', border: '1px solid rgba(255,107,0,0.2)',
        borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.5rem',
        fontSize: '0.85rem', color: '#aaa'
      }}>
        📱 <strong style={{ color: '#ff6b00' }}>Mobile:</strong> Route antippen → mit Finger Rechteck ziehen<br />
        🖥️ <strong style={{ color: '#ff6b00' }}>Desktop:</strong> Route auswählen → mit Maus Rechteck ziehen<br />
        🔍 <strong style={{ color: '#ff6b00' }}>Zoom:</strong> Pinch zum Zoomen oder + / − Buttons
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>

        {/* Bild mit Markern */}
        <div style={{ flex: 2, minWidth: '300px' }}>
          {aktivesRild ? (
            <>
              {/* Zoom Controls */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                <button onClick={() => setZoom(z => Math.min(5, z + 0.5))} style={zoomBtnStyle}>+</button>
                <button onClick={() => setZoom(z => Math.max(1, z - 0.5))} style={zoomBtnStyle}>−</button>
                {zoom > 1 && <button onClick={zoomZuruecksetzen} style={zoomBtnStyle}>↩ Reset</button>}
                <span style={{ fontSize: '0.8rem', color: '#555' }}>{zoom.toFixed(1)}×</span>
              </div>

              {/* Bild Container mit Overflow hidden */}
              <div style={{ overflow: 'hidden', borderRadius: '12px' }}>
                <div
                  ref={containerRef}
                  style={{
                    position: 'relative',
                    cursor: gewaehlteRoute ? 'crosshair' : zoom > 1 ? 'grab' : 'default',
                    userSelect: 'none',
                    touchAction: 'none',
                    transform: `scale(${zoom}) translate(${panX / zoom}px, ${panY / zoom}px)`,
                    transformOrigin: 'top left',
                    transition: letzterPinch.current ? 'none' : 'transform 0.1s'
                  }}
                  onMouseDown={e => {
                    if (!gewaehlteRoute && zoom > 1) {
                      letzterPan.current = { x: e.clientX - panX, y: e.clientY - panY }
                    } else {
                      mausStart(e)
                    }
                  }}
                  onMouseMove={e => {
                    if (letzterPan.current && !gewaehlteRoute) {
                      setPanX(e.clientX - letzterPan.current.x)
                      setPanY(e.clientY - letzterPan.current.y)
                    } else {
                      mausBewegen(e)
                    }
                  }}
                  onMouseUp={() => { letzterPan.current = null; mausEnde() }}
                  onMouseLeave={() => { letzterPan.current = null; mausEnde() }}
                  onTouchStart={editorTouchStart}
                  onTouchMove={editorTouchMove}
                  onTouchEnd={editorTouchEnd}
                  onTouchCancel={editorTouchEnd}
                >
                  <img
                    ref={bildRef}
                    src={aktivesRild}
                    alt="Wandplan"
                    style={{ width: '100%', display: 'block', borderRadius: '12px' }}
                    draggable={false}
                  />

                  {marker.map(m => (
                    <div key={m.routeId} style={{
                      position: 'absolute',
                      left: `${m.x}%`, top: `${m.y}%`,
                      width: `${m.width}%`, height: `${m.height}%`,
                      border: `3px solid ${m.color}`, borderRadius: '6px',
                      background: `${m.color}22`, boxSizing: 'border-box', pointerEvents: 'none'
                    }}>
                      <span style={{
                        position: 'absolute', top: '-22px', left: '0',
                        background: m.color, color: 'white',
                        fontSize: '0.7rem', padding: '1px 6px',
                        borderRadius: '4px', whiteSpace: 'nowrap'
                      }}>{m.name || 'Route'}</span>
                    </div>
                  ))}

                  {zieheMarker && (
                    <div style={{
                      position: 'absolute',
                      left: `${zieheMarker.x}%`, top: `${zieheMarker.y}%`,
                      width: `${zieheMarker.width}%`, height: `${zieheMarker.height}%`,
                      border: '3px dashed #ff6b00', borderRadius: '6px',
                      background: 'rgba(255,107,0,0.15)', boxSizing: 'border-box', pointerEvents: 'none'
                    }} />
                  )}
                </div>
              </div>
            </>
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
          <h2 style={{ marginBottom: '0.5rem' }}>Routen</h2>
          <p style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '1rem' }}>
            Antippen → Rechteck ziehen
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {routen.map(route => {
              const hatMarker = marker.some(m => m.routeId === route.id)
              const istAktiv = gewaehlteRoute === route.id
              return (
                <div key={route.id}
                  style={{
                    padding: '0.75rem', borderRadius: '8px', cursor: 'pointer',
                    border: `2px solid ${istAktiv ? '#ff6b00' : hatMarker ? route.color : '#2a2a2a'}`,
                    background: istAktiv ? 'rgba(255,107,0,0.1)' : 'transparent',
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => setGewaehlteRoute(istAktiv ? null : route.id)}
                >
                  {route.image_url ? (
                    <img src={route.image_url} alt={route.name}
                      style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: route.color, flexShrink: 0 }} />
                  )}
                  <span style={{ flex: 1, fontSize: '0.9rem', color: 'white' }}>{route.name}</span>
                  {hatMarker && (
                    <button onClick={e => { e.stopPropagation(); markerLoeschen(route.id) }}
                      style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
                  )}
                  {hatMarker && <span style={{ fontSize: '0.7rem', color: '#00c851' }}>✓</span>}
                </div>
              )
            })}
          </div>
          {routen.length === 0 && (
            <p style={{ color: '#666', fontSize: '0.9rem' }}>Noch keine Routen in dieser Sektion.</p>
          )}
        </div>
      </div>
    </div>
  )
}

const zoomBtnStyle = {
  background: '#1a1a1a', border: '1px solid #2a2a2a',
  color: 'white', borderRadius: '6px', padding: '0.3rem 0.7rem',
  cursor: 'pointer', fontSize: '0.9rem'
}

export default WandplanEditor