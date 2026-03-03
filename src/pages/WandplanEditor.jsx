import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabase'

const FARBEN = [
  { name: 'Gelb',    hex: '#FFD700' },
  { name: 'Rot',     hex: '#FF4444' },
  { name: 'Blau',    hex: '#4488FF' },
  { name: 'Grün',    hex: '#44BB44' },
  { name: 'Schwarz', hex: '#222222' },
  { name: 'Weiß',    hex: '#EEEEEE' },
  { name: 'Orange',  hex: '#FF6B00' },
  { name: 'Lila',    hex: '#9944CC' },
  { name: 'Pink',    hex: '#FF44AA' },
  { name: 'Braun',   hex: '#8B4513' },
]
const GRADE = ['?','4A','4B','4C','5A','5B','5C','6A','6A+','6B','6B+','6C','6C+','7A','7A+','7B','7B+','7C','7C+','8A']

function BottomSheet({ offen, onClose, kinder, titel }) {
  if (!offen) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)' }} />
      <div style={{ position: 'relative', background: '#111', borderRadius: '20px 20px 0 0', border: '1px solid #2a2a2a', padding: '0 1.25rem 2rem', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ width: '40px', height: '4px', background: '#333', borderRadius: '2px', margin: '12px auto 0' }} />
        {titel && <h2 style={{ margin: '1rem 0 1.25rem', fontSize: '1.1rem' }}>{titel}</h2>}
        {kinder}
      </div>
    </div>
  )
}

function WandplanEditor() {
  const { gymId, sektionId } = useParams()
  const [sektion, setSektion]           = useState(null)
  const [routen, setRouten]             = useState([])
  const [archiviertRouten, setArchiviertRouten] = useState([])
  const [aktivesRild, setAktivesBild]   = useState(null)
  const [marker, setMarker]             = useState([])
  const [zieheMarker, setZieheMarker]   = useState(null)
  const [laden, setLaden]               = useState(true)
  const [fortschritt, setFortschritt]   = useState('')
  const [zoom, setZoom]                 = useState(1)
  const [panX, setPanX]                 = useState(0)
  const [panY, setPanY]                 = useState(0)
  const [highlightRoute, setHighlightRoute] = useState(null)
  const [filterFarbe, setFilterFarbe]   = useState('')
  const [filterSort, setFilterSort]     = useState('datum_neu')

  // Markier-Modus: null = aus, 'neu' = neue Route, routeId = bestehende Route
  const [markierModus, setMarkierModus] = useState(null)

  const [zeigeRoutenPanel, setZeigeRoutenPanel] = useState(false)
  const [zeigeArchiv, setZeigeArchiv]   = useState(false)
  const [zeigeInfo, setZeigeInfo]       = useState(false)
  const [zeigeMarkierenSheet, setZeigeMarkierenSheet] = useState(false)

  const [neueRouteFormular, setNeueRouteFormular] = useState(null)
  const [neueRouteName, setNeueRouteName] = useState('')
  const [neueRouteGrad, setNeueRouteGrad] = useState('6A')
  const [neueRouteFarbe, setNeueRouteFarbe] = useState('#FF4444')
  const [neueRouteBeschreibung, setNeueRouteBeschreibung] = useState('')
  const [neueRouteBild, setNeueRouteBild] = useState(null)
  const [neueRouteBildVorschau, setNeueRouteBildVorschau] = useState(null)
  const [neueRouteSpeichern, setNeueRouteSpeichern] = useState(false)
  const [neueRouteFehler, setNeueRouteFehler] = useState({})

  const [bearbeiteRoute, setBearbeiteRoute] = useState(null)
  const [bearbeiteName, setBearbeiteName] = useState('')
  const [bearbeiteGrad, setBearbeiteGrad] = useState('')
  const [bearbeiteFarbe, setBearbeiteFarbe] = useState('')
  const [bearbeiteBeschreibung, setBearbeiteBeschreibung] = useState('')
  const [bearbeiteLaden, setBearbeiteLaden] = useState(false)

  const bildRef         = useRef(null)
  const containerRef    = useRef(null)
  const wrapperRef      = useRef(null)
  const letzterPinch    = useRef(null)
  const letzterPan      = useRef(null)
  const zoomRef         = useRef(zoom)
  const panXRef         = useRef(panX)
  const panYRef         = useRef(panY)
  const markierModusRef = useRef(markierModus)

  useEffect(() => { zoomRef.current = zoom }, [zoom])
  useEffect(() => { panXRef.current = panX }, [panX])
  useEffect(() => { panYRef.current = panY }, [panY])
  useEffect(() => { markierModusRef.current = markierModus }, [markierModus])

  useEffect(() => {
    async function datenLaden() {
      const { data: sektionData } = await supabase.from('sections').select('*').eq('id', sektionId).single()
      setSektion(sektionData)
      if (sektionData?.image_url) setAktivesBild(sektionData.image_url)
      const { data: routenData } = await supabase.from('routes').select('*').eq('section_id', sektionId).eq('is_active', true)
      setRouten(routenData || [])
      const { data: archivData } = await supabase.from('routes').select('*').eq('section_id', sektionId).eq('is_active', false)
      setArchiviertRouten(archivData || [])
      const markerDaten = (routenData || [])
        .filter(r => r.marker_x !== null)
        .map(r => ({ routeId: r.id, x: r.marker_x, y: r.marker_y, width: r.marker_width, height: r.marker_height, color: r.color, name: r.name }))
      setMarker(markerDaten)
      setLaden(false)
    }
    datenLaden()
  }, [sektionId])

  // ── Koordinaten ──────────────────────────────────────────────────────────────
  function koordinatenAusProzent(clientX, clientY) {
    const cont = containerRef.current
    if (!cont) return { x: 0, y: 0 }
    const rect = cont.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width)  * 100)),
      y: Math.max(0, Math.min(100, ((clientY - rect.top)  / rect.height) * 100))
    }
  }

  function panGrenzen(nx, ny, z) {
    const cont = containerRef.current
    if (!cont) return { x: nx, y: ny }
    const maxX = (cont.offsetWidth  * (z - 1)) / 2
    const maxY = (cont.offsetHeight * (z - 1)) / 2
    return { x: Math.max(-maxX, Math.min(maxX, nx)), y: Math.max(-maxY, Math.min(maxY, ny)) }
  }

  // ── Maus ─────────────────────────────────────────────────────────────────────
  function mausStart(e) {
    if (!markierModusRef.current) return
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

  // ── Touch ────────────────────────────────────────────────────────────────────
  function pinchAbstand(t) {
    return Math.sqrt((t[0].clientX-t[1].clientX)**2 + (t[0].clientY-t[1].clientY)**2)
  }
  function pinchMitte(t) {
    return { x: (t[0].clientX+t[1].clientX)/2, y: (t[0].clientY+t[1].clientY)/2 }
  }

  function editorTouchStart(e) {
    if (e.touches.length === 2) {
      e.preventDefault()
      const m = pinchMitte(e.touches)
      letzterPinch.current = { abstand: pinchAbstand(e.touches), zoom: zoomRef.current, panX: panXRef.current, panY: panYRef.current, x: m.x, y: m.y }
      letzterPan.current = null
      setZieheMarker(null)
    } else if (e.touches.length === 1) {
      e.preventDefault()
      letzterPan.current = null
      if (markierModusRef.current) {
        const { x, y } = koordinatenAusProzent(e.touches[0].clientX, e.touches[0].clientY)
        setZieheMarker({ startX: x, startY: y, x, y, width: 0, height: 0 })
      } else if (zoomRef.current > 1) {
        letzterPan.current = { x: e.touches[0].clientX - panXRef.current, y: e.touches[0].clientY - panYRef.current }
      }
    }
  }

  function editorTouchMove(e) {
    e.preventDefault()
    if (e.touches.length === 2 && letzterPinch.current) {
      const neuerZoom = Math.max(1, Math.min(5, letzterPinch.current.zoom * (pinchAbstand(e.touches) / letzterPinch.current.abstand)))
      if (neuerZoom === 1) { setZoom(1); setPanX(0); setPanY(0) }
      else {
        const wrap = wrapperRef.current
        if (wrap) {
          const rect = wrap.getBoundingClientRect()
          const m = pinchMitte(e.touches)
          const ox = m.x - (rect.left + rect.width/2)
          const oy = m.y - (rect.top  + rect.height/2)
          const f = neuerZoom / letzterPinch.current.zoom
          const { x, y } = panGrenzen(ox-(ox-letzterPinch.current.panX)*f, oy-(oy-letzterPinch.current.panY)*f, neuerZoom)
          setPanX(x); setPanY(y)
        }
        setZoom(neuerZoom)
      }
    } else if (e.touches.length === 1) {
      if (letzterPan.current) {
        const { x, y } = panGrenzen(e.touches[0].clientX - letzterPan.current.x, e.touches[0].clientY - letzterPan.current.y, zoomRef.current)
        setPanX(x); setPanY(y)
      } else if (zieheMarker) {
        const { x, y } = koordinatenAusProzent(e.touches[0].clientX, e.touches[0].clientY)
        setZieheMarker(prev => ({
          ...prev,
          x: Math.min(prev.startX, x), y: Math.min(prev.startY, y),
          width: Math.abs(x - prev.startX), height: Math.abs(y - prev.startY)
        }))
      }
    }
  }

  function editorTouchEnd(e) {
    if (e.touches.length < 2) letzterPinch.current = null
    if (e.touches.length === 0) { letzterPan.current = null; markerFertigstellen() }
  }

  function zoomZuruecksetzen() { setZoom(1); setPanX(0); setPanY(0) }

  // ── Marker Fertigstellen + direkt speichern ───────────────────────────────────
  async function markerFertigstellen() {
    if (!zieheMarker) return
    if (zieheMarker.width < 2 || zieheMarker.height < 2) { setZieheMarker(null); return }
    const modus = markierModusRef.current
    if (!modus) { setZieheMarker(null); return }

    if (modus === 'neu') {
      setNeueRouteFormular({ x: zieheMarker.x, y: zieheMarker.y, width: zieheMarker.width, height: zieheMarker.height })
      setNeueRouteName(''); setNeueRouteGrad('6A'); setNeueRouteFarbe('#FF4444')
      setNeueRouteBeschreibung(''); setNeueRouteBild(null); setNeueRouteBildVorschau(null)
    } else {
      const route = routen.find(r => r.id === modus)
      const neuerMarker = { routeId: modus, x: zieheMarker.x, y: zieheMarker.y, width: zieheMarker.width, height: zieheMarker.height, color: route?.color || '#ff6b00', name: route?.name || '' }
      setMarker(prev => [...prev.filter(m => m.routeId !== modus), neuerMarker])
      setMarkierModus(null)
      setFortschritt('📍 Markierung wird gespeichert...')
      await supabase.from('routes').update({ marker_x: neuerMarker.x, marker_y: neuerMarker.y, marker_width: neuerMarker.width, marker_height: neuerMarker.height }).eq('id', modus)
      const blob = await bildAusschnittErstellen(neuerMarker)
      if (blob) {
        const dateiName = `${modus}-marker.jpg`
        await supabase.storage.from('route-images').remove([dateiName])
        const { error } = await supabase.storage.from('route-images').upload(dateiName, blob, { contentType: 'image/jpeg' })
        if (!error) {
          const { data: urlData } = supabase.storage.from('route-images').getPublicUrl(dateiName)
          await supabase.from('routes').update({ image_url: urlData.publicUrl }).eq('id', modus)
        }
      }
      setFortschritt('')
    }
    setZieheMarker(null)
  }

  // ── Neue Route erstellen ─────────────────────────────────────────────────────
  async function neueRouteErstellen() {
    const fehler = {}
    if (!neueRouteFarbe) fehler.farbe = true
    if (!neueRouteGrad)  fehler.grad  = true
    if (Object.keys(fehler).length > 0) { setNeueRouteFehler(fehler); return }
    setNeueRouteFehler({})
    setNeueRouteSpeichern(true)
    let imageUrl = null
    if (neueRouteBild) {
      const endung = neueRouteBild.name.split('.').pop()
      const dateiName = `${sektionId}-${Date.now()}.${endung}`
      const { error: uploadFehler } = await supabase.storage.from('route-images').upload(dateiName, neueRouteBild)
      if (!uploadFehler) {
        const { data: urlData } = supabase.storage.from('route-images').getPublicUrl(dateiName)
        imageUrl = urlData.publicUrl
      }
    }
    const { data: neueRoute, error } = await supabase.from('routes').insert({
      name: neueRouteName.trim() || 'Unbenannte Route',
      setter_grade: neueRouteGrad, color: neueRouteFarbe,
      description: neueRouteBeschreibung.trim(), image_url: imageUrl,
      gym_id: gymId, section_id: sektionId, is_active: true,
      marker_x: neueRouteFormular.x, marker_y: neueRouteFormular.y,
      marker_width: neueRouteFormular.width, marker_height: neueRouteFormular.height
    }).select().single()
    if (!error && neueRoute) {
      setRouten(prev => [...prev, neueRoute])
      const neuerMarker = { routeId: neueRoute.id, x: neueRouteFormular.x, y: neueRouteFormular.y, width: neueRouteFormular.width, height: neueRouteFormular.height, color: neueRouteFarbe, name: neueRoute.name }
      setMarker(prev => [...prev, neuerMarker])
      setFortschritt('📸 Erstelle Vorschaubild...')
      const blob = await bildAusschnittErstellen(neuerMarker)
      if (blob) {
        const dateiName = `${neueRoute.id}-marker.jpg`
        await supabase.storage.from('route-images').remove([dateiName])
        const { error: upErr } = await supabase.storage.from('route-images').upload(dateiName, blob, { contentType: 'image/jpeg' })
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('route-images').getPublicUrl(dateiName)
          await supabase.from('routes').update({ image_url: urlData.publicUrl }).eq('id', neueRoute.id)
        }
      }
      setFortschritt('')
    }
    setNeueRouteFormular(null)
    setMarkierModus(null)
    setNeueRouteSpeichern(false)
  }

  // ── Route bearbeiten ─────────────────────────────────────────────────────────
  function routeBearbeitenOeffnen(route) {
    setBearbeiteRoute(route)
    setBearbeiteName(route.name || '')
    setBearbeiteGrad(route.setter_grade || '6A')
    setBearbeiteFarbe(route.color || '#FF4444')
    setBearbeiteBeschreibung(route.description || '')
  }
  async function routeBearbeitenSpeichern() {
    setBearbeiteLaden(true)
    const { error } = await supabase.from('routes').update({
      name: bearbeiteName.trim() || 'Unbenannte Route', setter_grade: bearbeiteGrad,
      color: bearbeiteFarbe, description: bearbeiteBeschreibung.trim()
    }).eq('id', bearbeiteRoute.id)
    if (!error) {
      setRouten(prev => prev.map(r => r.id === bearbeiteRoute.id ? { ...r, name: bearbeiteName.trim() || 'Unbenannte Route', setter_grade: bearbeiteGrad, color: bearbeiteFarbe, description: bearbeiteBeschreibung.trim() } : r))
      setMarker(prev => prev.map(m => m.routeId === bearbeiteRoute.id ? { ...m, name: bearbeiteName.trim() || 'Unbenannte Route', color: bearbeiteFarbe } : m))
    }
    setBearbeiteRoute(null)
    setBearbeiteLaden(false)
  }
  async function routeArchivieren(id) {
    const archivRoute = routen.find(r => r.id === id)
    await supabase.storage.from('route-images').remove([`${id}-marker.jpg`])
    await supabase.from('routes').update({ is_active: false, marker_x: null, marker_y: null, marker_width: null, marker_height: null, image_url: null }).eq('id', id)
    setRouten(prev => prev.filter(r => r.id !== id))
    setMarker(prev => prev.filter(m => m.routeId !== id))
    if (archivRoute) setArchiviertRouten(prev => [...prev, { ...archivRoute, is_active: false, image_url: null }])
    setBearbeiteRoute(null)
  }
  async function routeLoeschen(id, imageUrl) {
    if (!window.confirm('Route wirklich löschen?')) return
    if (imageUrl) await supabase.storage.from('route-images').remove([imageUrl.split('/').pop()])
    await supabase.storage.from('route-images').remove([`${id}-marker.jpg`])
    await supabase.from('routes').delete().eq('id', id)
    setRouten(prev => prev.filter(r => r.id !== id))
    setMarker(prev => prev.filter(m => m.routeId !== id))
    setBearbeiteRoute(null)
  }
  async function routeWiederherstellen(id) {
    await supabase.from('routes').update({ is_active: true }).eq('id', id)
    setArchiviertRouten(prev => prev.filter(r => r.id !== id))
    const { data } = await supabase.from('routes').select('*').eq('id', id).single()
    if (data) setRouten(prev => [...prev, data])
  }
  function markerLoeschen(routeId) { setMarker(prev => prev.filter(m => m.routeId !== routeId)) }
  function routeHighlight(routeId) {
    setHighlightRoute(routeId)
    setTimeout(() => setHighlightRoute(null), 1200)
  }

  // ── Bild-Ausschnitt ──────────────────────────────────────────────────────────
  async function bildAusschnittErstellen(m) {
    return new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const zielBreite = Math.max(400, Math.round(img.naturalWidth * (m.width / 100)))
        const zielHoehe  = Math.round(zielBreite * (m.height / m.width))
        const canvas = document.createElement('canvas')
        canvas.width = zielBreite; canvas.height = zielHoehe
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, (m.x/100)*img.naturalWidth, (m.y/100)*img.naturalHeight, (m.width/100)*img.naturalWidth, (m.height/100)*img.naturalHeight, 0, 0, zielBreite, zielHoehe)
        canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.85)
      }
      img.onerror = () => resolve(null)
      img.src = aktivesRild
    })
  }

  const gefilterteRouten = routen
    .filter(r => filterFarbe ? r.color === filterFarbe : true)
    .sort((a, b) => {
      if (filterSort === 'name') return (a.name || '').localeCompare(b.name || '')
      if (filterSort === 'grad') return GRADE.indexOf(a.setter_grade) - GRADE.indexOf(b.setter_grade)
      if (filterSort === 'datum_alt') return new Date(a.created_at) - new Date(b.created_at)
      return new Date(b.created_at) - new Date(a.created_at)
    })

  const nichtMarkierteRouten = routen.filter(r => !marker.some(m => m.routeId === r.id))
  const istMarkierAktiv = markierModus !== null

  if (laden) return <div className="container"><p>Lädt...</p></div>

  return (
    <div className="container" style={{ maxWidth: '900px', paddingBottom: '6rem', paddingTop: '0' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0' }}>
        <Link to={`/halle/${gymId}/sektionen`} style={{ color: '#aaa', textDecoration: 'none', fontSize: '1.2rem', flexShrink: 0, lineHeight: 1 }}>←</Link>
        <h1 style={{ fontSize: '1.15rem', margin: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          🗺️ {sektion?.name}
        </h1>
      </div>

      {/* Fortschritt */}
      {fortschritt && (
        <div style={{ background: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.3)', borderRadius: '8px', padding: '0.45rem 0.85rem', marginBottom: '0.5rem', fontSize: '0.82rem', color: '#ff6b00' }}>
          {fortschritt}
        </div>
      )}

      {/* Markier-Modus Banner */}
      {istMarkierAktiv && (
        <div style={{ background: 'rgba(255,107,0,0.1)', border: '1px solid #ff6b00', borderRadius: '10px', padding: '0.55rem 0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.83rem', color: '#ff6b00' }}>
            {markierModus === 'neu'
              ? '✋ Rechteck auf dem Bild ziehen → neue Route'
              : `✋ Rechteck ziehen für „${routen.find(r => r.id === markierModus)?.name}"`}
          </span>
          <button onClick={() => { setMarkierModus(null); setZieheMarker(null) }} style={{ background: 'transparent', border: '1px solid #ff6b00', color: '#ff6b00', borderRadius: '6px', padding: '0.2rem 0.55rem', cursor: 'pointer', fontSize: '0.78rem', flexShrink: 0 }}>✕</button>
        </div>
      )}

      {aktivesRild ? (
        <div>
          {/* Zoom Controls */}
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.4rem', alignItems: 'center' }}>
            <button onClick={() => { const z=Math.min(5,zoom+0.5); setZoom(z); const {x,y}=panGrenzen(panX,panY,z); setPanX(x); setPanY(y) }} style={zoomBtnStyle}>+</button>
            <button onClick={() => { const z=Math.max(1,zoom-0.5); if(z===1){setZoom(1);setPanX(0);setPanY(0)}else{setZoom(z);const {x,y}=panGrenzen(panX,panY,z);setPanX(x);setPanY(y)} }} style={zoomBtnStyle}>−</button>
            {zoom > 1 && <button onClick={zoomZuruecksetzen} style={zoomBtnStyle}>↩</button>}
            <span style={{ fontSize: '0.75rem', color: '#555' }}>{zoom.toFixed(1)}×</span>
            <span style={{ fontSize: '0.7rem', color: '#444', marginLeft: 'auto' }}>
              {istMarkierAktiv ? '→ Rechteck ziehen' : zoom > 1 ? 'Pinch = Zoom · Pan = 1 Finger' : 'Pinch = Zoom'}
            </span>
          </div>

          {/* Bild */}
          <div ref={wrapperRef} style={{ overflow: 'hidden', borderRadius: '12px', border: `2px solid ${istMarkierAktiv ? '#ff6b00' : '#2a2a2a'}`, transition: 'border-color 0.2s' }}>
            <div
              ref={containerRef}
              style={{
                position: 'relative', userSelect: 'none', touchAction: 'none',
                cursor: istMarkierAktiv ? 'crosshair' : zoom > 1 ? 'grab' : 'default',
                transform: `scale(${zoom}) translate(${panX/zoom}px, ${panY/zoom}px)`,
                transformOrigin: 'center center',
                transition: letzterPinch.current ? 'none' : 'transform 0.1s',
              }}
              onMouseDown={mausStart}
              onMouseMove={mausBewegen}
              onMouseUp={mausEnde}
              onMouseLeave={mausEnde}
              onTouchStart={editorTouchStart}
              onTouchMove={editorTouchMove}
              onTouchEnd={editorTouchEnd}
              onTouchCancel={editorTouchEnd}
            >
              <img ref={bildRef} src={aktivesRild} alt="Wandplan" style={{ width: '100%', display: 'block' }} draggable={false} />
              {marker.map(m => (
                <div key={m.routeId} style={{
                  position: 'absolute', left: `${m.x}%`, top: `${m.y}%`, width: `${m.width}%`, height: `${m.height}%`,
                  border: `3px solid ${m.color}`, borderRadius: '6px',
                  background: highlightRoute === m.routeId ? `${m.color}88` : `${m.color}22`,
                  boxSizing: 'border-box', pointerEvents: 'none',
                  boxShadow: highlightRoute === m.routeId ? `0 0 16px ${m.color}` : 'none',
                  transition: 'background 0.15s, box-shadow 0.15s'
                }} />
              ))}
              {zieheMarker && (
                <div style={{
                  position: 'absolute', left: `${zieheMarker.x}%`, top: `${zieheMarker.y}%`,
                  width: `${zieheMarker.width}%`, height: `${zieheMarker.height}%`,
                  border: '3px dashed #ff6b00', borderRadius: '6px',
                  background: 'rgba(255,107,0,0.15)', boxSizing: 'border-box', pointerEvents: 'none'
                }} />
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Kein Wandbild vorhanden.</p>
          <Link to={`/halle/${gymId}/sektionen`} style={{ color: '#ff6b00' }}>Bild hochladen →</Link>
        </div>
      )}

      {/* ── Action Buttons: 2×2 Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.65rem' }}>

        {/* Markieren */}
        <button onClick={() => {
          const nichtMarkiert = routen.filter(r => !marker.some(m => m.routeId === r.id))
          if (nichtMarkiert.length === 0) { setMarkierModus('neu') }
          else { setZeigeMarkierenSheet(true) }
        }} style={{
          background: istMarkierAktiv ? 'rgba(255,107,0,0.15)' : '#1a1a1a',
          border: `1px solid ${istMarkierAktiv ? '#ff6b00' : '#2a2a2a'}`,
          color: istMarkierAktiv ? '#ff6b00' : 'white',
          borderRadius: '10px', padding: '0.7rem 0.5rem', cursor: 'pointer',
          fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontWeight: istMarkierAktiv ? '600' : 'normal'
        }}>
          📍 Markieren
        </button>

        {/* Routen */}
        <button onClick={() => setZeigeRoutenPanel(!zeigeRoutenPanel)} style={{
          background: zeigeRoutenPanel ? '#1f1f1f' : '#1a1a1a',
          border: `1px solid ${zeigeRoutenPanel ? '#444' : '#2a2a2a'}`, color: 'white',
          borderRadius: '10px', padding: '0.7rem 0.5rem', cursor: 'pointer',
          fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
        }}>
          🧗 Routen ({routen.length})
        </button>

        {/* Archiv */}
        <button onClick={() => setZeigeArchiv(true)} style={{
          background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888',
          borderRadius: '10px', padding: '0.7rem 0.5rem', cursor: 'pointer',
          fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
        }}>
          📦 Archiv ({archiviertRouten.length})
        </button>

        {/* Info */}
        <button onClick={() => setZeigeInfo(true)} style={{
          background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#666',
          borderRadius: '10px', padding: '0.7rem 0.5rem', cursor: 'pointer',
          fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
        }}>
          ℹ️ Hilfe
        </button>
      </div>

      {/* ── Routen Panel ── */}
      {zeigeRoutenPanel && (
        <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '12px', marginTop: '0.5rem', padding: '0.85rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
            <select value={filterFarbe} onChange={e => setFilterFarbe(e.target.value)} style={filterStyle}>
              <option value="">Alle Farben</option>
              {FARBEN.map(f => <option key={f.hex} value={f.hex}>{f.name}</option>)}
            </select>
            <select value={filterSort} onChange={e => setFilterSort(e.target.value)} style={filterStyle}>
              <option value="datum_neu">Neueste zuerst</option>
              <option value="datum_alt">Älteste zuerst</option>
              <option value="name">Name A–Z</option>
              <option value="grad">Grad</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '260px', overflowY: 'auto' }}>
            {gefilterteRouten.length === 0 && <p style={{ color: '#555', fontSize: '0.85rem' }}>Keine Routen gefunden.</p>}
            {gefilterteRouten.map(route => {
              const hatMarker = marker.some(m => m.routeId === route.id)
              const istGewaehlt = markierModus === route.id
              return (
                <div key={route.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.55rem 0.7rem', borderRadius: '8px', background: istGewaehlt ? 'rgba(255,107,0,0.1)' : '#0a0a0a', border: `1px solid ${istGewaehlt ? '#ff6b00' : '#1a1a1a'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, cursor: 'pointer', minWidth: 0 }}
                    onClick={() => {
                      if (hatMarker) { routeHighlight(route.id) }
                      else { setMarkierModus(istGewaehlt ? null : route.id); setZeigeRoutenPanel(false) }
                    }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: route.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: '0.83rem', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{route.name || 'Unbenannte Route'}</span>
                    <span style={{ fontSize: '0.73rem', color: '#ff6b00', flexShrink: 0 }}>{route.setter_grade}</span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: hatMarker ? '#00c851' : '#555', flexShrink: 0 }}>{hatMarker ? '✓' : '📍'}</span>
                  {hatMarker && <button onClick={() => markerLoeschen(route.id)} style={iconBtnStyle('#ff4444')}>✕</button>}
                  <button onClick={() => routeBearbeitenOeffnen(route)} style={iconBtnStyle('#aaa')}>✏️</button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Markieren Auswahl Sheet ── */}
      <BottomSheet offen={zeigeMarkierenSheet} onClose={() => setZeigeMarkierenSheet(false)} titel="📍 Was markieren?">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <button onClick={() => { setMarkierModus('neu'); setZeigeMarkierenSheet(false) }} style={{ background: '#1a1a1a', border: '1px solid #ff6b00', color: '#ff6b00', borderRadius: '10px', padding: '0.8rem 1rem', cursor: 'pointer', fontSize: '0.9rem', textAlign: 'left' }}>
            ➕ Neue Route erstellen & markieren
          </button>
          {nichtMarkierteRouten.length > 0 && (
            <>
              <p style={{ color: '#555', fontSize: '0.78rem', margin: '0.25rem 0 0' }}>Noch nicht markierte Routen:</p>
              {nichtMarkierteRouten.map(route => (
                <button key={route.id} onClick={() => { setMarkierModus(route.id); setZeigeMarkierenSheet(false) }} style={{ background: '#0a0a0a', border: '1px solid #2a2a2a', color: 'white', borderRadius: '10px', padding: '0.65rem 1rem', cursor: 'pointer', fontSize: '0.85rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: route.color, flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{route.name || 'Unbenannte Route'}</span>
                  <span style={{ color: '#ff6b00', fontSize: '0.8rem' }}>{route.setter_grade}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </BottomSheet>

      {/* ── Archiv Sheet ── */}
      <BottomSheet offen={zeigeArchiv} onClose={() => setZeigeArchiv(false)} titel={`📦 Archiv (${archiviertRouten.length})`}
        kinder={
          <div>
            {archiviertRouten.length === 0
              ? <p style={{ color: '#555', textAlign: 'center', padding: '2rem 0' }}>Keine archivierten Routen.</p>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                  {archiviertRouten.map(route => (
                    <div key={route.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: '10px', background: '#0a0a0a', border: '1px solid #1a1a1a', opacity: 0.8 }}>
                      {route.image_url
                        ? <img src={route.image_url} alt={route.name} style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />
                        : <div style={{ width: '6px', height: '44px', borderRadius: '3px', background: route.color, flexShrink: 0 }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: '#aaa', fontWeight: 'bold', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{route.name || 'Unbenannte Route'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#555' }}>{route.setter_grade}</div>
                      </div>
                      <button onClick={() => routeWiederherstellen(route.id)} style={{ background: 'transparent', border: '1px solid #00c851', color: '#00c851', padding: '0.4rem 0.65rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', flexShrink: 0 }}>♻️ Wiederherstellen</button>
                    </div>
                  ))}
                </div>
            }
          </div>
        }
      />

      {/* ── Info Sheet ── */}
      <BottomSheet offen={zeigeInfo} onClose={() => setZeigeInfo(false)} titel="ℹ️ So funktioniert der Wandplan"
        kinder={
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: '#aaa', fontSize: '0.88rem', marginBottom: '1rem' }}>
            {[
              ['📍', 'Tippe auf "Markieren" – wähle ob du eine neue Route erstellen oder eine bestehende markieren willst.'],
              ['✋', 'Im Markier-Modus: Rechteck auf dem Bild ziehen. Du kannst vorher reinzoomen!'],
              ['🔍', '2 Finger = Pinch-Zoom. Im Zoom mit 1 Finger panen (außerhalb Markier-Modus).'],
              ['✓', 'Markierungen werden sofort automatisch gespeichert.'],
              ['✕', 'Im Routenpanel ✕ = Markierung entfernen, ✏️ = Route bearbeiten.'],
            ].map(([emoji, text]) => (
              <div key={emoji} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{emoji}</span>
                <p style={{ margin: 0 }}>{text}</p>
              </div>
            ))}
            <button className="btn" onClick={() => setZeigeInfo(false)} style={{ width: '100%', marginTop: '0.5rem' }}>Verstanden</button>
          </div>
        }
      />

      {/* ── Neue Route Sheet ── */}
      <BottomSheet offen={!!neueRouteFormular} onClose={() => setNeueRouteFormular(null)} titel="🧗 Neue Route erstellen"
        kinder={
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', marginBottom: '1rem' }}>
            <div>
              <label style={labelStyle}>Routenname</label>
              <input value={neueRouteName} onChange={e => setNeueRouteName(e.target.value)} placeholder="z.B. Gelber Riese" maxLength={50} autoFocus style={inputStyle} />
            </div>
            <div>
              <label style={{ ...labelStyle, color: neueRouteFehler.farbe ? '#ff4444' : '#aaa' }}>Grifffarbe {neueRouteFehler.farbe && '– Bitte wählen!'}</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
                {FARBEN.map(f => (
                  <div key={f.hex} onClick={() => setNeueRouteFarbe(f.hex)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', cursor: 'pointer' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: f.hex, border: `3px solid ${neueRouteFarbe === f.hex ? '#ff6b00' : 'transparent'}`, outline: neueRouteFarbe === f.hex ? '2px solid #ff6b00' : 'none' }} />
                    <span style={{ fontSize: '0.6rem', color: '#aaa' }}>{f.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label style={{ ...labelStyle, color: neueRouteFehler.grad ? '#ff4444' : '#aaa' }}>Schwierigkeitsgrad {neueRouteFehler.grad && '– Bitte wählen!'}</label>
              <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.4rem' }}>
                {GRADE.map(g => (
                  <span key={g} onClick={() => setNeueRouteGrad(g)} style={{ padding: '0.35rem 0.8rem', borderRadius: '20px', cursor: 'pointer', flexShrink: 0, border: `1px solid ${neueRouteGrad === g ? '#ff6b00' : '#2a2a2a'}`, background: neueRouteGrad === g ? 'rgba(255,107,0,0.15)' : '#0a0a0a', color: neueRouteGrad === g ? '#ff6b00' : '#aaa', fontSize: '0.83rem' }}>{g}</span>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Foto (optional)</label>
              {neueRouteBildVorschau ? (
                <div style={{ position: 'relative' }}>
                  <img src={neueRouteBildVorschau} alt="Vorschau" style={{ width: '100%', maxHeight: '130px', objectFit: 'cover', borderRadius: '8px' }} />
                  <button onClick={() => { setNeueRouteBild(null); setNeueRouteBildVorschau(null) }} style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.7)', border: 'none', color: 'white', borderRadius: '50%', width: '26px', height: '26px', cursor: 'pointer' }}>✕</button>
                </div>
              ) : (
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.85rem', borderRadius: '8px', border: '2px dashed #2a2a2a', cursor: 'pointer', color: '#aaa', fontSize: '0.85rem' }}>
                  📷 Foto hochladen
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { const f=e.target.files[0]; if(!f) return; setNeueRouteBild(f); setNeueRouteBildVorschau(URL.createObjectURL(f)) }} style={{ display: 'none' }} />
                </label>
              )}
            </div>
            <div>
              <label style={labelStyle}>Beschreibung (optional)</label>
              <textarea value={neueRouteBeschreibung} onChange={e => setNeueRouteBeschreibung(e.target.value)} placeholder="Tipps, Beta..." rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: '0.65rem' }}>
              <button className="btn" onClick={neueRouteErstellen} disabled={neueRouteSpeichern} style={{ flex: 1, padding: '0.85rem' }}>
                {neueRouteSpeichern ? '⏳ Erstellt...' : '✅ Route erstellen'}
              </button>
              <button className="btn btn-outline" onClick={() => setNeueRouteFormular(null)} style={{ flex: 1, padding: '0.85rem' }}>Abbrechen</button>
            </div>
          </div>
        }
      />

      {/* ── Route Bearbeiten Sheet ── */}
      <BottomSheet offen={!!bearbeiteRoute} onClose={() => setBearbeiteRoute(null)} titel="✏️ Route bearbeiten"
        kinder={
          bearbeiteRoute && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', marginBottom: '1rem' }}>
              <div>
                <label style={labelStyle}>Routenname</label>
                <input value={bearbeiteName} onChange={e => setBearbeiteName(e.target.value)} placeholder="Unbenannte Route" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Grifffarbe</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
                  {FARBEN.map(f => (
                    <div key={f.hex} onClick={() => setBearbeiteFarbe(f.hex)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', cursor: 'pointer' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: f.hex, border: `3px solid ${bearbeiteFarbe === f.hex ? '#ff6b00' : 'transparent'}`, outline: bearbeiteFarbe === f.hex ? '2px solid #ff6b00' : 'none' }} />
                      <span style={{ fontSize: '0.6rem', color: '#aaa' }}>{f.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Schwierigkeitsgrad</label>
                <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.4rem' }}>
                  {GRADE.map(g => (
                    <span key={g} onClick={() => setBearbeiteGrad(g)} style={{ padding: '0.35rem 0.8rem', borderRadius: '20px', cursor: 'pointer', flexShrink: 0, border: `1px solid ${bearbeiteGrad === g ? '#ff6b00' : '#2a2a2a'}`, background: bearbeiteGrad === g ? 'rgba(255,107,0,0.15)' : '#0a0a0a', color: bearbeiteGrad === g ? '#ff6b00' : '#aaa', fontSize: '0.83rem' }}>{g}</span>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Beschreibung</label>
                <textarea value={bearbeiteBeschreibung} onChange={e => setBearbeiteBeschreibung(e.target.value)} placeholder="Tipps, Beta..." rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <button className="btn" onClick={routeBearbeitenSpeichern} disabled={bearbeiteLaden} style={{ flex: 1 }}>{bearbeiteLaden ? '⏳' : '✅ Speichern'}</button>
                <button className="btn btn-outline" onClick={() => setBearbeiteRoute(null)} style={{ flex: 1 }}>Abbrechen</button>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid #1a1a1a', paddingTop: '0.85rem' }}>
                <button onClick={() => routeArchivieren(bearbeiteRoute.id)} style={{ flex: 1, background: 'transparent', border: '1px solid #888', color: '#888', padding: '0.55rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.83rem' }}>📦 Archivieren</button>
                <button onClick={() => routeLoeschen(bearbeiteRoute.id, bearbeiteRoute.image_url)} style={{ flex: 1, background: 'transparent', border: '1px solid #ff4444', color: '#ff4444', padding: '0.55rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.83rem' }}>🗑️ Löschen</button>
              </div>
            </div>
          )
        }
      />
    </div>
  )
}

const inputStyle  = { padding: '0.75rem', borderRadius: '8px', border: '1px solid #2a2a2a', background: '#1a1a1a', color: 'white', fontSize: '1rem', width: '100%', boxSizing: 'border-box' }
const labelStyle  = { display: 'block', marginBottom: '0.45rem', color: '#aaa', fontSize: '0.88rem' }
const filterStyle = { padding: '0.4rem 0.6rem', borderRadius: '8px', border: '1px solid #2a2a2a', background: '#1a1a1a', color: 'white', fontSize: '0.8rem', cursor: 'pointer' }
const zoomBtnStyle = { background: '#1a1a1a', border: '1px solid #2a2a2a', color: 'white', borderRadius: '6px', padding: '0.3rem 0.65rem', cursor: 'pointer', fontSize: '0.9rem' }
const iconBtnStyle = (color) => ({ background: 'transparent', border: 'none', color, cursor: 'pointer', fontSize: '0.85rem', padding: '0.1rem', flexShrink: 0 })

export default WandplanEditor