import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabase'
import TickButton from '../components/TickButton'
import Kommentare from '../components/Kommentare'

function RouteDetail() {
  const { routeId } = useParams()
  const [route, setRoute] = useState(null)
  const [sektion, setSektion] = useState(null)
  const [bewertung, setBewertung] = useState(null)
  const [nutzer, setNutzer] = useState(null)
  const [laden, setLaden] = useState(true)

  // Beta Video
  const [zeigeVideoUpload, setZeigeVideoUpload] = useState(false)
  const [video, setVideo] = useState(null)
  const [videoLaden, setVideoLaden] = useState(false)
  const [videoFehler, setVideoFehler] = useState('')
  const [videoErfolg, setVideoErfolg] = useState('')

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

      // Bewertungen laden
      const { data: ratingsData } = await supabase
        .from('route_ratings')
        .select('stars')
        .eq('route_id', routeId)

      if (ratingsData && ratingsData.length > 0) {
        const avg = ratingsData.reduce((sum, r) => sum + r.stars, 0) / ratingsData.length
        setBewertung({ durchschnitt: avg.toFixed(1), anzahl: ratingsData.length })
      }

      setLaden(false)
    }
    datenLaden()
  }, [routeId])

  function videoAuswaehlen(e) {
    const datei = e.target.files[0]
    if (!datei) return

    if (datei.size > 157286400) {
      setVideoFehler('Video ist zu groß! Maximum ist 150 MB.')
      return
    }

    // Länge prüfen
    const videoEl = document.createElement('video')
    videoEl.preload = 'metadata'
    videoEl.onloadedmetadata = () => {
      URL.revokeObjectURL(videoEl.src)
      if (videoEl.duration > 90) {
        setVideoFehler('Video ist zu lang! Maximum ist 1:30 Minuten.')
        return
      }
      setVideo(datei)
      setVideoFehler('')
    }
    videoEl.src = URL.createObjectURL(datei)
  }

  async function videoHochladen() {
    if (!video) return
    setVideoLaden(true)
    setVideoFehler('')

    const dateiName = `${Date.now()}-${video.name}`
    const { error: uploadError } = await supabase.storage
      .from('beta-videos').upload(dateiName, video)

    if (uploadError) {
      setVideoFehler('Upload fehlgeschlagen: ' + uploadError.message)
      setVideoLaden(false)
      return
    }

    const { data: urlData } = supabase.storage
      .from('beta-videos').getPublicUrl(dateiName)

    await supabase.from('comments').insert({
      route_id: routeId,
      user_id: nutzer.id,
      text: '🎬 Beta Video',
      video_url: urlData.publicUrl
    })

    setVideo(null)
    setZeigeVideoUpload(false)
    setVideoErfolg('✅ Beta Video erfolgreich hochgeladen!')
    setVideoLaden(false)

    setTimeout(() => setVideoErfolg(''), 3000)
  }

  if (laden) return <div className="container"><p>Lädt...</p></div>
  if (!route) return <div className="container"><h1>Route nicht gefunden</h1></div>

  return (
    <div className="container" style={{ maxWidth: '700px' }}>

      {/* Zurück */}
      {route.gym_id && (
        <Link to={`/halle/${route.gym_id}`} style={{ color: '#aaa', textDecoration: 'none', fontSize: '0.9rem' }}>
          ← Zurück zur Halle
        </Link>
      )}

      {/* Route Header */}
      <div className="card" style={{ marginTop: '1rem' }}>

        {/* Bild */}
        {route.image_url && (
          <img src={route.image_url} alt={route.name} style={{
            width: '100%', maxHeight: '300px', objectFit: 'cover',
            borderRadius: '8px', marginBottom: '1rem'
          }} />
        )}

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <div style={{
            width: '12px', alignSelf: 'stretch', borderRadius: '6px',
            backgroundColor: route.color, flexShrink: 0, minHeight: '60px'
          }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h1 style={{ marginBottom: '0.25rem' }}>{route.name}</h1>
              <span style={{ color: '#ff6b00', fontWeight: 'bold', fontSize: '1.5rem' }}>
                {route.setter_grade}
              </span>
            </div>

            {sektion && <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>📍 {sektion.name}</p>}

            {/* Sterne Bewertung */}
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

            {route.description && <p style={{ marginBottom: '1rem' }}>{route.description}</p>}

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <TickButton routeId={route.id} />
              {nutzer && (
                <button
                  className="btn btn-outline"
                  onClick={() => setZeigeVideoUpload(!zeigeVideoUpload)}
                >
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
              <input
                type="file"
                accept="video/mp4,video/quicktime,video/mov"
                capture="environment"
                onChange={videoAuswaehlen}
                style={{ display: 'none' }}
              />
            </label>
          ) : (
            <div>
              <p style={{ color: '#00c851', marginBottom: '1rem' }}>✅ {video.name}</p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setVideo(null)}>
                  Anderes Video
                </button>
                <button className="btn" style={{ flex: 1 }} onClick={videoHochladen} disabled={videoLaden}>
                  {videoLaden ? 'Lädt hoch...' : 'Hochladen'}
                </button>
              </div>
            </div>
          )}

          {videoFehler && <p style={{ color: '#ff4444', marginTop: '0.75rem' }}>{videoFehler}</p>}
          <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.75rem' }}>
            MP4 oder MOV · max. 150 MB · max. 1:30 Min
          </p>
        </div>
      )}

      {videoErfolg && (
        <div style={{
          marginTop: '1rem', padding: '1rem', background: 'rgba(0,200,81,0.1)',
          border: '1px solid rgba(0,200,81,0.3)', borderRadius: '8px'
        }}>
          <p style={{ color: '#00c851' }}>{videoErfolg}</p>
        </div>
      )}

      {/* Kommentare */}
      <Kommentare routeId={route.id} />

    </div>
  )
}

export default RouteDetail