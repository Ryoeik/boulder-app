import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabase'

const farben = [
  { name: 'Gelb', hex: '#FFD700' },
  { name: 'Rot', hex: '#FF4444' },
  { name: 'Blau', hex: '#4488FF' },
  { name: 'Grün', hex: '#44BB44' },
  { name: 'Schwarz', hex: '#222222' },
  { name: 'Weiß', hex: '#EEEEEE' },
  { name: 'Orange', hex: '#FF6B00' },
  { name: 'Lila', hex: '#9944CC' },
  { name: 'Pink', hex: '#FF44AA' },
  { name: 'Braun', hex: '#8B4513' },
]

const grade = ['?', '4A', '4B', '4C', '5A', '5B', '5C', '6A', '6A+', '6B', '6B+', '6C', '6C+', '7A', '7A+', '7B', '7B+', '7C', '7C+', '8A']

function SektionDetail() {
  const { gymId, sektionId } = useParams()
  const [sektion, setSektion] = useState(null)
  const [routen, setRouten] = useState([])
  const [zeigeForm, setZeigeForm] = useState(false)
  const [bearbeiteRoute, setBearbeiteRoute] = useState(null)

  // Formular Felder
  const [name, setName] = useState('')
  const [farbe, setFarbe] = useState('')
  const [grad, setGrad] = useState('')
  const [beschreibung, setBeschreibung] = useState('')
  const [bild, setBild] = useState(null)
  const [bildVorschau, setBildVorschau] = useState(null)
  const [laden, setLaden] = useState(false)
  const [fehler, setFehler] = useState('')

  useEffect(() => {
    async function datenLaden() {
      const { data: sektionData } = await supabase
        .from('sections').select('*').eq('id', sektionId).single()
      setSektion(sektionData)

      const { data: routenData } = await supabase
        .from('routes').select('*').eq('section_id', sektionId)
        .order('created_at', { ascending: false })
      setRouten(routenData || [])
    }
    datenLaden()
  }, [sektionId])

  function formOeffnen(route = null) {
    if (route) {
      setBearbeiteRoute(route)
      setName(route.name)
      setFarbe(route.color || '')
      setGrad(route.setter_grade || '')
      setBeschreibung(route.description || '')
      setBildVorschau(route.image_url || null)
    } else {
      setBearbeiteRoute(null)
      setName('')
      setFarbe('')
      setGrad('')
      setBeschreibung('')
      setBildVorschau(null)
    }
    setBild(null)
    setFehler('')
    setZeigeForm(true)
  }

  function formSchliessen() {
    setZeigeForm(false)
    setBearbeiteRoute(null)
    setName('')
    setFarbe('')
    setGrad('')
    setBeschreibung('')
    setBild(null)
    setBildVorschau(null)
    setFehler('')
  }

  function bildAuswaehlen(e) {
    const datei = e.target.files[0]
    if (!datei) return
    if (datei.size > 5242880) {
      setFehler('Bild ist zu groß! Maximum ist 5 MB.')
      return
    }
    setBild(datei)
    setBildVorschau(URL.createObjectURL(datei))
    setFehler('')
  }

  async function routeSpeichern() {
    if (!farbe) { setFehler('Bitte Grifffarbe wählen!'); return }
    if (!grad) { setFehler('Bitte Schwierigkeitsgrad wählen!'); return }

    setLaden(true)
    setFehler('')

    let bildUrl = bearbeiteRoute?.image_url || null

    if (bild) {
      const dateiName = `${Date.now()}-${bild.name}`
      const { error: uploadError } = await supabase.storage
        .from('route-images').upload(dateiName, bild)

      if (uploadError) {
        setFehler('Bild-Upload fehlgeschlagen: ' + uploadError.message)
        setLaden(false)
        return
      }

      const { data: urlData } = supabase.storage
        .from('route-images').getPublicUrl(dateiName)
      bildUrl = urlData.publicUrl
    }

    const routeDaten = {
      name: name.trim() || 'Unbenannte Route',
      color: farbe,
      setter_grade: grad,
      description: beschreibung.trim(),
      image_url: bildUrl,
    }

    if (bearbeiteRoute) {
      // Bearbeiten
      const { data, error } = await supabase
        .from('routes').update(routeDaten)
        .eq('id', bearbeiteRoute.id).select().single()

      if (error) { setFehler('Fehler: ' + error.message); setLaden(false); return }
      setRouten(routen.map(r => r.id === data.id ? data : r))
    } else {
      // Neu erstellen
      const { data, error } = await supabase.from('routes').insert({
        ...routeDaten,
        section_id: sektionId,
        gym_id: gymId,
        is_active: true
      }).select().single()

      if (error) { setFehler('Fehler: ' + error.message); setLaden(false); return }
      setRouten([data, ...routen])
    }

    formSchliessen()
    setLaden(false)
  }

  async function routeLoeschen(id, imageUrl) {
    if (imageUrl) {
      const dateiName = imageUrl.split('/').pop()
      await supabase.storage.from('route-images').remove([dateiName])
    }
    await supabase.from('routes').delete().eq('id', id)
    setRouten(routen.filter(r => r.id !== id))
  }

  return (
    <div className="container" style={{ maxWidth: '700px' }}>
      <Link to={`/halle/${gymId}/sektionen`} style={{ color: '#aaa', textDecoration: 'none', fontSize: '0.9rem' }}>
        ← Zurück zu Sektionen
      </Link>
      <h1 style={{ marginTop: '0.5rem' }}>{sektion?.name}</h1>
      {sektion?.description && <p style={{ marginBottom: '1rem' }}>{sektion.description}</p>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '2rem 0 1rem' }}>
        <h2 style={{ margin: 0 }}>Routen ({routen.length})</h2>
        {!zeigeForm && (
          <button className="btn" onClick={() => formOeffnen()}>Route erstellen</button>
        )}
      </div>

      {/* Formular */}
      {zeigeForm && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>
            {bearbeiteRoute ? 'Route bearbeiten' : 'Neue Route'}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            <div>
             <label style={{ display: 'block', marginBottom: '0.5rem', color: '#aaa' }}>Name (optional)</label>
              <input type="text" placeholder="z.B. Gelber Riese" value={name}
                onChange={e => setName(e.target.value)} style={inputStyle} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.75rem', color: '#aaa' }}>Grifffarbe *</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                {farben.map(f => (
                  <div key={f.hex} onClick={() => setFarbe(f.hex)}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%', background: f.hex,
                      border: `3px solid ${farbe === f.hex ? '#ff6b00' : 'transparent'}`,
                      outline: farbe === f.hex ? '2px solid #ff6b00' : 'none', transition: 'all 0.2s'
                    }} />
                    <span style={{ fontSize: '0.7rem', color: '#aaa' }}>{f.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.75rem', color: '#aaa' }}>Schwierigkeitsgrad *</label>
              <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'thin', scrollbarColor: '#ff6b00 #2a2a2a' }}>
                {grade.map(g => (
                  <span key={g} onClick={() => setGrad(g)} style={{
                    padding: '0.4rem 0.9rem', borderRadius: '20px', cursor: 'pointer',
                    border: `1px solid ${grad === g ? '#ff6b00' : '#2a2a2a'}`,
                    background: grad === g ? 'rgba(255,107,0,0.15)' : '#111',
                    color: grad === g ? '#ff6b00' : '#aaa',
                    fontSize: '0.85rem', whiteSpace: 'nowrap', transition: 'all 0.2s', flexShrink: 0
                  }}>{g}</span>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#aaa' }}>Routenbild (optional)</label>
              {bildVorschau && (
                <div style={{ marginBottom: '0.75rem', position: 'relative' }}>
                  <img src={bildVorschau} alt="Vorschau" style={{
                    width: '100%', maxHeight: '200px', objectFit: 'cover',
                    borderRadius: '8px', border: '1px solid #2a2a2a'
                  }} />
                  <button onClick={() => { setBild(null); setBildVorschau(null) }}
                    style={{
                      position: 'absolute', top: '8px', right: '8px',
                      background: 'rgba(0,0,0,0.7)', border: 'none',
                      color: 'white', borderRadius: '50%', width: '28px', height: '28px',
                      cursor: 'pointer', fontSize: '1rem'
                    }}>✕</button>
                </div>
              )}
              {!bildVorschau && (
                <label style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '0.5rem', padding: '1.5rem', borderRadius: '8px',
                  border: '2px dashed #2a2a2a', cursor: 'pointer', color: '#aaa'
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#ff6b00'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2a2a'}
                >
                  📷 Foto aufnehmen oder hochladen
                  <input type="file" accept="image/jpeg,image/png,image/webp"
                    capture="environment" onChange={bildAuswaehlen} style={{ display: 'none' }} />
                </label>
              )}
              <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>JPG, PNG oder WebP · max. 5 MB</p>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#aaa' }}>Beschreibung (optional)</label>
              <textarea placeholder="Tipps, Beta..." value={beschreibung}
                onChange={e => setBeschreibung(e.target.value)} rows={2}
                style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            {fehler && <p style={{ color: '#ff4444' }}>{fehler}</p>}

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={formSchliessen}>
                Abbrechen
              </button>
              <button className="btn" style={{ flex: 1 }} onClick={routeSpeichern} disabled={laden}>
                {laden ? 'Speichert...' : bearbeiteRoute ? 'Speichern' : 'Route erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Routen Liste */}
      {routen.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Noch keine Routen in dieser Sektion.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {routen.map(route => (
            <div key={route.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {route.image_url ? (
                <img src={route.image_url} alt={route.name} style={{
                  width: '60px', height: '60px', objectFit: 'cover',
                  borderRadius: '8px', flexShrink: 0
                }} />
              ) : (
                <div style={{
                  width: '8px', height: '60px', borderRadius: '4px',
                  backgroundColor: route.color, flexShrink: 0
                }} />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '1.1rem' }}>{route.name}</strong>
                  <span style={{ color: '#ff6b00', fontWeight: 'bold' }}>{route.setter_grade}</span>
                </div>
                {route.description && <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>{route.description}</p>}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                <button
                  onClick={() => formOeffnen(route)}
                  style={{
                    background: 'transparent', border: '1px solid #ff6b00',
                    color: '#ff6b00', padding: '0.4rem 0.75rem',
                    borderRadius: '6px', cursor: 'pointer'
                  }}
                >
                  ✏️
                </button>
                <button
                  onClick={() => routeLoeschen(route.id, route.image_url)}
                  style={{
                    background: 'transparent', border: '1px solid #ff4444',
                    color: '#ff4444', padding: '0.4rem 0.75rem',
                    borderRadius: '6px', cursor: 'pointer'
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '0.75rem', borderRadius: '8px',
  border: '1px solid #2a2a2a', background: '#1a1a1a',
  color: 'white', fontSize: '1rem', boxSizing: 'border-box'
}

export default SektionDetail