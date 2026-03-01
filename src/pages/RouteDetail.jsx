import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import TickButton from '../components/TickButton'
import Kommentare from '../components/Kommentare'

const TICK_INFO = {
  flash:      { label: '⚡ Flash',     bg: '#FFD700', text: '#000' },
  second_try: { label: '🔄 2nd Try',   bg: '#ff6b00', text: '#fff' },
  done:       { label: '✅ Geschafft', bg: '#00c851', text: '#fff' },
}

function RouteDetail() {
  const { routeId } = useParams()
  const navigate = useNavigate()
  const [route, setRoute]         = useState(null)
  const [sektion, setSektion]     = useState(null)
  const [bewertung, setBewertung] = useState(null)
  const [sends, setSends]         = useState({ gesamt: 0, flash: 0, second_try: 0, done: 0 })
  const [nutzer, setNutzer]       = useState(null)
  const [laden, setLaden]         = useState(true)

  // Sends Popup
  const [zeigePopup, setZeigePopup]   = useState(false)
  const [popupLaden, setPopupLaden]   = useState(false)
  const [sendListe, setSendListe]     = useState([])

  // Beta Video
  const [zeigeVideoUpload, setZeigeVideoUpload] = useState(false)
  const [video, setVideo]             = useState(null)
  const [videoLaden, setVideoLaden]   = useState(false)
  const [videoFehler, setVideoFehler] = useState('')
  const [videoErfolg, setVideoErfolg] = useState('')

  // Wandplan Viewer
  const [zeigeWandplan, setZeigeWandplan]   = useState(false)
  const [wandplanRouten, setWandplanRouten] = useState([])
  const [zoom, setZoom]   = useState(1)
  const [panX, setPanX]   = useState(0)
  const [panY, setPanY]   = useState(0)
  const letzterPinch = useRef(null)
  const letzterPan   = useRef(null)

  useEffect(() => {
    async function datenLaden() {
      const { data: { session } } = await supabase.auth.getSession()
      setNutzer(session?.user ?? null)

      const { data: routeData } = await supabase
        .from('routes').select('*').eq('id', routeId).single()
      setRoute(routeData)

      if (routeData?.section_id) {
        const { data: sektionData } = await supabase
          .from('sections').select('*').eq('id', routeData.section_id).single()
        setSektion(sektionData)
      }

      const { data: ratingsData } = await supabase
        .from('route_ratings').select('stars').eq('route_id', routeId)
      if (ratingsData?.length > 0) {
        const avg = ratingsData.reduce((sum, r) => sum + r.stars, 0) / ratingsData.length
        setBewertung({ durchschnitt: avg.toFixed(1), anzahl: ratingsData.length })
      }

      const { data: tickData } = await supabase
        .from('ticks').select('tick_type').eq('route_id', routeId)
      if (tickData) {
        setSends({
          gesamt:     tickData.length,
          flash:      tickData.filter(t => t.tick_type === 'flash').length,
          second_try: tickData.filter(t => t.tick_type === 'second_try').length,
          done:       tickData.filter(t => t.tick_type === 'done').length,
        })
      }

      setLaden(false)
    }
    datenLaden()
  }, [routeId])

  // ── Wandplan öffnen ──────────────────────────────────────────────────────────
  async function wandplanOeffnen() {
    if (!sektion?.image_url) return

    const { data } = await supabase
      .from('routes')
      .select('id, name, color, setter_grade, marker_x, marker_y, marker_width, marker_height')
      .eq('section_id', route.section_id)
      .eq('is_active', true)
      .not('marker_x', 'is', null)

    setWandplanRouten(data || [])

    if (route.marker_x !== null) {
      // Starte stark gezoomt auf die Route
      const startZoom = 8
      const markerMitteX = route.marker_x + route.marker_width / 2  // z.B. 35%
      const markerMitteY = route.marker_y + route.marker_height / 2  // z.B. 60%
      // Abweichung von der Bildmitte (50%) in Prozent
      const abweichungX = markerMitteX - 50  // z.B. -15%
      const abweichungY = markerMitteY - 50  // z.B. 10%
      const istMobile = window.innerWidth < 768
      const bildBreite = Math.min(window.innerWidth, 900)
      const bildHoehe = istMobile ? window.innerWidth * 1.2 : window.innerHeight * 0.8
      const startPanX = -(abweichungX / 100) * bildBreite * startZoom
      const startPanY = -(abweichungY / 100) * bildHoehe * startZoom * (istMobile ? 0.5 : 0.65)

      // Sofort gezoomt auf Route öffnen
      setZoom(startZoom)
      setPanX(startPanX)
      setPanY(startPanY)
      setZeigeWandplan(true)

      // Dann smooth auf Zoom 1 rauszoomen
      setTimeout(() => {
        setZoom(1)
        setPanX(0)
        setPanY(0)
      }, 300)
    } else {
      setZoom(1); setPanX(0); setPanY(0)
      setZeigeWandplan(true)
    }
  }

  // ── Pinch-to-Zoom ────────────────────────────────────────────────────────────
  function abstand(touches) {
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  function viewerTouchStart(e) {
    if (e.touches.length === 2) {
      letzterPinch.current = { abstand: abstand(e.touches), zoom }
      letzterPan.current = null
    } else if (e.touches.length === 1 && zoom > 1) {
      letzterPan.current = { x: e.touches[0].clientX - panX, y: e.touches[0].clientY - panY }
    }
  }

  function viewerTouchMove(e) {
    e.preventDefault()
    if (e.touches.length === 2 && letzterPinch.current) {
      const neuerZoom = Math.max(1, Math.min(6, letzterPinch.current.zoom * (abstand(e.touches) / letzterPinch.current.abstand)))
      setZoom(neuerZoom)
      if (neuerZoom === 1) { setPanX(0); setPanY(0) }
    } else if (e.touches.length === 1 && letzterPan.current && zoom > 1) {
      setPanX(e.touches[0].clientX - letzterPan.current.x)
      setPanY(e.touches[0].clientY - letzterPan.current.y)
    }
  }

  function viewerTouchEnd(e) {
    if (e.touches.length < 2) letzterPinch.current = null
    if (e.touches.length < 1) letzterPan.current = null
  }

  function zoomZuruecksetzen() {
    setZoom(1); setPanX(0); setPanY(0)
  }

  // ── Sends Popup ──────────────────────────────────────────────────────────────
  async function popupOeffnen() {
    setZeigePopup(true); setPopupLaden(true)
    const { data: tickDaten } = await supabase
      .from('ticks').select('user_id, tick_type, ticked_at')
      .eq('route_id', routeId).order('ticked_at', { ascending: false })
    if (!tickDaten || tickDaten.length === 0) { setSendListe([]); setPopupLaden(false); return }
    const userIds = [...new Set(tickDaten.map(t => t.user_id))]
    const { data: profileDaten } = await supabase
      .from('profiles').select('id, username, avatar_url').in('id', userIds)
    const profileMap = {}
    ;(profileDaten || []).forEach(p => { profileMap[p.id] = p })
    setSendListe(tickDaten.map(t => ({
      user_id: t.user_id, tick_type: t.tick_type, ticked_at: t.ticked_at,
      username: profileMap[t.user_id]?.username || 'Kletterer',
      avatar_url: profileMap[t.user_id]?.avatar_url || null,
    })))
    setPopupLaden(false)
  }

  // ── Video ────────────────────────────────────────────────────────────────────
  function videoAuswaehlen(e) {
    const datei = e.target.files[0]
    if (!datei) return
    if (datei.size > 157286400) { setVideoFehler('Video ist zu groß! Maximum ist 150 MB.'); return }
    const videoEl = document.createElement('video')
    videoEl.preload = 'metadata'
    videoEl.onloadedmetadata = () => {
      URL.revokeObjectURL(videoEl.src)
      if (videoEl.duration > 90) { setVideoFehler('Video ist zu lang! Maximum ist 1:30 Minuten.'); return }
      setVideo(datei); setVideoFehler('')
    }
    videoEl.src = URL.createObjectURL(datei)
  }

  async function videoHochladen() {
    if (!video) return
    setVideoLaden(true); setVideoFehler('')
    const dateiName = `${Date.now()}-${video.name}`
    const { error: uploadError } = await supabase.storage.from('beta-videos').upload(dateiName, video)
    if (uploadError) { setVideoFehler('Upload fehlgeschlagen: ' + uploadError.message); setVideoLaden(false); return }
    const { data: urlData } = supabase.storage.from('beta-videos').getPublicUrl(dateiName)
    await supabase.from('comments').insert({
      route_id: routeId, user_id: nutzer.id, text: '🎬 Beta Video', video_url: urlData.publicUrl
    })
    setVideo(null); setZeigeVideoUpload(false)
    setVideoErfolg('✅ Beta Video erfolgreich hochgeladen!')
    setVideoLaden(false)
    setTimeout(() => setVideoErfolg(''), 3000)
  }

  if (laden) return <div className="container"><p>Lädt...</p></div>
  if (!route) return <div className="container"><h1>Route nicht gefunden</h1></div>
  console.log('route.marker_x:', route.marker_x, 'sektion:', sektion?.image_url, 'hatWandplan:', route.marker_x !== null && !!sektion?.image_url)

  // Hat diese Route einen Marker + Wandbild?
  const hatWandplan = route.marker_x !== null && sektion?.image_url

  return (
    <div className="container" style={{ maxWidth: '700px' }}>

      {route.gym_id && (
        <Link to={`/halle/${route.gym_id}`} style={{ color: '#aaa', textDecoration: 'none', fontSize: '0.9rem' }}>
          ← Zurück zur Halle
        </Link>
      )}

      <div className="card" style={{ marginTop: '1rem' }}>

        {/* Routenbild – klickbar wenn Wandplan vorhanden */}
        {route.image_url && (
          <div style={{ position: 'relative', marginBottom: '1rem' }}>
            <img
              src={route.image_url}
              alt={route.name}
              onClick={hatWandplan ? wandplanOeffnen : undefined}
              style={{
                width: '100%', maxHeight: '300px', objectFit: 'cover',
                borderRadius: '8px',
                cursor: hatWandplan ? 'zoom-out' : 'default',
              }}
            />
            {hatWandplan && (
              <div style={{
                position: 'absolute', bottom: '8px', right: '8px',
                background: 'rgba(0,0,0,0.65)', borderRadius: '6px',
                padding: '3px 8px', fontSize: '0.75rem', color: 'white',
                pointerEvents: 'none'
              }}>
                🔍 Wandplan
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <div style={{
            width: '12px', alignSelf: 'stretch', borderRadius: '6px',
            backgroundColor: route.color, flexShrink: 0, minHeight: '60px'
          }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h1 style={{ marginBottom: '0.25rem' }}>{route.name}</h1>
              <span style={{ color: '#ff6b00', fontWeight: 'bold', fontSize: '1.5rem' }}>{route.setter_grade}</span>
            </div>

            {sektion && (
              <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                📍 {sektion.name}
                {hatWandplan && (
                  <button onClick={wandplanOeffnen} style={{
                    background: 'transparent', border: 'none', color: '#ff6b00',
                    cursor: 'pointer', fontSize: '0.85rem', marginLeft: '0.5rem', padding: 0
                  }}>🗺️ im Wandplan</button>
                )}
              </p>
            )}

            {bewertung ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {[1,2,3,4,5].map(s => (
                    <span key={s} style={{ color: s <= Math.round(bewertung.durchschnitt) ? '#FFD700' : '#333', fontSize: '1.1rem' }}>★</span>
                  ))}
                </div>
                <span style={{ color: '#FFD700', fontWeight: 'bold' }}>{bewertung.durchschnitt}</span>
                <span style={{ color: '#666', fontSize: '0.85rem' }}>({bewertung.anzahl} Bewertungen)</span>
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.75rem' }}>Noch keine Bewertungen</p>
            )}

            <button
              onClick={sends.gesamt > 0 ? popupOeffnen : undefined}
              style={{
                background: 'transparent', border: 'none', padding: 0,
                cursor: sends.gesamt > 0 ? 'pointer' : 'default',
                marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem'
              }}
            >
              <span style={{ color: sends.gesamt > 0 ? '#ff6b00' : '#555', fontSize: '0.95rem', fontWeight: sends.gesamt > 0 ? 'bold' : 'normal' }}>
                🧗 {sends.gesamt} {sends.gesamt === 1 ? 'Send' : 'Sends'}
              </span>
              {sends.gesamt > 0 && (
                <span style={{ fontSize: '0.8rem', color: '#555' }}>
                  · {sends.flash > 0 ? `${sends.flash}⚡` : ''}{sends.second_try > 0 ? ` ${sends.second_try}🔄` : ''}{sends.done > 0 ? ` ${sends.done}✅` : ''}
                </span>
              )}
            </button>

            {route.description && <p style={{ marginBottom: '1rem' }}>{route.description}</p>}

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <TickButton routeId={route.id} />
              {nutzer && (
                <button className="btn btn-outline" onClick={() => setZeigeVideoUpload(!zeigeVideoUpload)}>
                  🎬 Beta hinzufügen
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Beta Video Upload */}
      {zeigeVideoUpload && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>🎬 Beta Video hochladen</h2>
          {!video ? (
            <label style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '0.5rem', padding: '2rem', borderRadius: '8px',
              border: '2px dashed #2a2a2a', cursor: 'pointer', color: '#aaa'
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#ff6b00'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2a2a'}
            >
              📹 Video aufnehmen oder hochladen
              <input type="file" accept="video/mp4,video/quicktime,video/mov"
                capture="environment" onChange={videoAuswaehlen} style={{ display: 'none' }} />
            </label>
          ) : (
            <div>
              <p style={{ color: '#00c851', marginBottom: '1rem' }}>✅ {video.name}</p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setVideo(null)}>Anderes Video</button>
                <button className="btn" style={{ flex: 1 }} onClick={videoHochladen} disabled={videoLaden}>
                  {videoLaden ? 'Lädt hoch...' : 'Hochladen'}
                </button>
              </div>
            </div>
          )}
          {videoFehler && <p style={{ color: '#ff4444', marginTop: '0.75rem' }}>{videoFehler}</p>}
          <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.75rem' }}>MP4 oder MOV · max. 150 MB · max. 1:30 Min</p>
        </div>
      )}

      {videoErfolg && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0,200,81,0.1)', border: '1px solid rgba(0,200,81,0.3)', borderRadius: '8px' }}>
          <p style={{ color: '#00c851' }}>{videoErfolg}</p>
        </div>
      )}

      <Kommentare routeId={route.id} gymId={route.gym_id} />

      {/* ── Sends Popup ── */}
      {zeigePopup && (
        <div onClick={() => setZeigePopup(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '1rem'
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#1a1a1a', borderRadius: '16px', border: '1px solid #2a2a2a',
            width: '100%', maxWidth: '420px', maxHeight: '80vh',
            display: 'flex', flexDirection: 'column', overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.25rem 1rem', borderBottom: '1px solid #2a2a2a' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.1rem' }}>🧗 Sends ({sends.gesamt})</h2>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
                  {sends.flash > 0      && <span style={badgeStyle('#FFD700', '#000')}>⚡ {sends.flash} Flash</span>}
                  {sends.second_try > 0 && <span style={badgeStyle('#ff6b00', '#fff')}>🔄 {sends.second_try} 2nd Try</span>}
                  {sends.done > 0       && <span style={badgeStyle('#00c851', '#fff')}>✅ {sends.done} Geschafft</span>}
                </div>
              </div>
              <button onClick={() => setZeigePopup(false)} style={{
                background: 'rgba(255,255,255,0.1)', border: 'none',
                color: 'white', borderRadius: '50%', width: '36px', height: '36px',
                cursor: 'pointer', fontSize: '1rem', flexShrink: 0
              }}>✕</button>
            </div>
            <div style={{ overflowY: 'auto', padding: '0.75rem 1.25rem' }}>
              {popupLaden ? (
                <p style={{ color: '#aaa', textAlign: 'center', padding: '2rem 0' }}>Lädt...</p>
              ) : sendListe.length === 0 ? (
                <p style={{ color: '#555', textAlign: 'center', padding: '2rem 0' }}>Noch keine Sends.</p>
              ) : (
                sendListe.map((s, i) => {
                  const info = TICK_INFO[s.tick_type] || TICK_INFO.done
                  return (
                    <Link key={i} to={`/nutzer/${s.user_id}`} onClick={() => setZeigePopup(false)} style={{ textDecoration: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0', borderBottom: '1px solid #222' }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '50%',
                          background: s.avatar_url ? 'transparent' : '#ff6b00',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1rem', overflow: 'hidden', flexShrink: 0, border: '2px solid #2a2a2a'
                        }}>
                          {s.avatar_url ? <img src={s.avatar_url} alt={s.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🧗'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: 'white', fontWeight: 'bold', fontSize: '0.9rem' }}>{s.username}</div>
                          <div style={{ color: '#555', fontSize: '0.75rem' }}>{new Date(s.ticked_at).toLocaleDateString('de-DE')}</div>
                        </div>
                        <span style={badgeStyle(info.bg, info.text)}>{info.label}</span>
                      </div>
                    </Link>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Wandplan Viewer ── */}
      {zeigeWandplan && sektion?.image_url && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.97)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '1rem'
        }}>
          {/* Header */}
          <div style={{
            width: '100%', maxWidth: '900px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '0.75rem', flexShrink: 0
          }}>
            <div>
              <h2 style={{ margin: 0, color: 'white', fontSize: '1rem' }}>🏔️ {sektion.name}</h2>
              <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '0.2rem' }}>
                {zoom > 1 ? `Zoom: ${zoom.toFixed(1)}× · Doppeltipp zum Zurücksetzen` : 'Pinch zum Zoomen'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {zoom > 1 && (
                <button onClick={zoomZuruecksetzen} style={{
                  background: 'rgba(255,255,255,0.1)', border: 'none',
                  color: 'white', borderRadius: '8px', padding: '0.3rem 0.7rem',
                  cursor: 'pointer', fontSize: '0.8rem'
                }}>↩ Reset</button>
              )}
              <button onClick={() => setZeigeWandplan(false)} style={{
                background: 'rgba(255,255,255,0.1)', border: 'none',
                color: 'white', borderRadius: '50%', width: '40px', height: '40px',
                cursor: 'pointer', fontSize: '1.2rem', flexShrink: 0
              }}>✕</button>
            </div>
          </div>

          {/* Bild mit Zoom */}
          <div
            onTouchStart={viewerTouchStart}
            onTouchMove={viewerTouchMove}
            onTouchEnd={viewerTouchEnd}
            onDoubleClick={zoomZuruecksetzen}
            style={{
              position: 'relative', maxWidth: '900px', width: '100%', maxHeight: '80vh',
              overflow: 'hidden', cursor: zoom > 1 ? 'grab' : 'default', touchAction: 'none'
            }}
          >
            <div style={{
              transform: `scale(${zoom}) translate(${panX / zoom}px, ${panY / zoom}px)`,
              transformOrigin: 'center center',
              transition: letzterPinch.current || letzterPan.current ? 'none' : 'transform 1.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
              <img
                src={sektion.image_url} alt={sektion.name}
                style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain', display: 'block', borderRadius: '8px' }}
                draggable={false}
              />

              {/* Alle Routen-Marker – aktuelle hervorgehoben */}
              {wandplanRouten.map(r => {
                const istAktuell = r.id === route.id
                return (
                  <div
                    key={r.id}
                    onClick={() => { setZeigeWandplan(false); navigate(`/route/${r.id}`) }}
                    style={{
                      cursor: 'pointer',

                    position: 'absolute',
                    left: `${r.marker_x}%`, top: `${r.marker_y}%`,
                    width: `${r.marker_width}%`, height: `${r.marker_height}%`,
                    border: `${istAktuell ? 4 : 2}px solid ${r.color}`,
                    borderRadius: '6px',
                    background: istAktuell ? `${r.color}44` : `${r.color}11`,
                    boxSizing: 'border-box',
                    zIndex: istAktuell ? 20 : 10,
                    // Pulsieren für die aktuelle Route
                    animation: istAktuell ? 'pulsieren 1.2s ease-in-out 4' : 'none'
                  }}>
                    {istAktuell && (
                     <div style={{
                      position: 'absolute', bottom: '100%', left: '0', marginBottom: '3px',
                      background: r.color, color: 'white',
                      fontSize: '0.8rem', fontWeight: 'bold',
                      padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.5)', pointerEvents: 'none'
                    }}>
                    </div>
                  )}
                  </div>
                )
              })}
            </div>
          </div>

          <style>{`
            @keyframes pulsieren {
              0%   { box-shadow: 0 0 0 0px ${route?.color}99; }
              50%  { box-shadow: 0 0 0 10px ${route?.color}00; }
              100% { box-shadow: 0 0 0 0px ${route?.color}00; }
            }
          `}</style>
        </div>
      )}
    </div>
  )
}

function badgeStyle(bg, color) {
  return {
    background: bg, color, padding: '0.15rem 0.6rem',
    borderRadius: '20px', fontSize: '0.75rem',
    fontWeight: 'bold', whiteSpace: 'nowrap'
  }
}

export default RouteDetail