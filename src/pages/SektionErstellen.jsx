import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabase'

function SektionErstellen() {
  const { gymId } = useParams()
  const [halle, setHalle] = useState(null)
  const [sektionen, setSektionen] = useState([])
  const [bearbeiteSektion, setBearbeiteSektion] = useState(null)

  const [name, setName] = useState('')
  const [beschreibung, setBeschreibung] = useState('')
  const [bild, setBild] = useState(null)
  const [bildVorschau, setBildVorschau] = useState(null)
  const [laden, setLaden] = useState(false)
  const [fehler, setFehler] = useState('')
  const [zeigeForm, setZeigeForm] = useState(false)

  useEffect(() => {
    async function datenLaden() {
      const { data: halleData } = await supabase
        .from('gyms').select('*').eq('id', gymId).single()
      setHalle(halleData)

      const { data: sektionenData } = await supabase
        .from('sections').select('*').eq('gym_id', gymId)
        .order('created_at', { ascending: true })
      setSektionen(sektionenData || [])
    }
    datenLaden()
  }, [gymId])

  function formOeffnen(sektion = null) {
    if (sektion) {
      setBearbeiteSektion(sektion)
      setName(sektion.name)
      setBeschreibung(sektion.description || '')
      setBildVorschau(sektion.image_url || null)
    } else {
      setBearbeiteSektion(null)
      setName('')
      setBeschreibung('')
      setBildVorschau(null)
    }
    setBild(null)
    setFehler('')
    setZeigeForm(true)
  }

  function formSchliessen() {
    setZeigeForm(false)
    setBearbeiteSektion(null)
    setName('')
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

  async function sektionSpeichern() {
    if (!name.trim()) {
      setFehler('Name ist ein Pflichtfeld!')
      return
    }
    setLaden(true)
    setFehler('')

    let bildUrl = bearbeiteSektion?.image_url || null

    if (bild) {
      const dateiName = `sektionen/${Date.now()}-${bild.name}`
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

    const sektionDaten = {
      name: name.trim(),
      description: beschreibung.trim(),
      image_url: bildUrl
    }

    if (bearbeiteSektion) {
      const { data, error } = await supabase
        .from('sections').update(sektionDaten)
        .eq('id', bearbeiteSektion.id).select().single()

      if (error) { setFehler('Fehler: ' + error.message); setLaden(false); return }
      setSektionen(sektionen.map(s => s.id === data.id ? data : s))
    } else {
      const { data, error } = await supabase.from('sections').insert({
        ...sektionDaten, gym_id: gymId
      }).select().single()

      if (error) { setFehler('Fehler: ' + error.message); setLaden(false); return }
      setSektionen([...sektionen, data])
    }

    formSchliessen()
    setLaden(false)
  }

  async function sektionLoeschen(id) {
    await supabase.from('sections').delete().eq('id', id)
    setSektionen(sektionen.filter(s => s.id !== id))
  }

  return (
    <div className="container" style={{ maxWidth: '600px' }}>
      <Link to={`/halle/${gymId}`} style={{ color: '#aaa', textDecoration: 'none', fontSize: '0.9rem' }}>
        ← Zurück zur Halle
      </Link>

      <h1 style={{ marginTop: '0.5rem' }}>🏔️ Sektionen verwalten</h1>
      {halle && (
        <p style={{ marginBottom: '2rem' }}>
          für <strong style={{ color: '#ff6b00' }}>{halle.name}</strong>
        </p>
      )}

      {/* Bestehende Sektionen */}
      {sektionen.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2>Bestehende Sektionen</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {sektionen.map(sektion => (
              <div key={sektion.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {sektion.image_url ? (
                  <img src={sektion.image_url} alt={sektion.name} style={{
                    width: '60px', height: '60px', objectFit: 'cover',
                    borderRadius: '8px', flexShrink: 0
                  }} />
                ) : (
                  <div style={{
                    width: '60px', height: '60px', borderRadius: '8px',
                    background: '#2a2a2a', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0
                  }}>🏔️</div>
                )}
                <Link to={`/halle/${gymId}/sektion/${sektion.id}`} style={{ textDecoration: 'none', flex: 1 }}>
                  <strong style={{ color: 'white' }}>{sektion.name}</strong>
                  {sektion.description && (
                    <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>{sektion.description}</p>
                  )}
                </Link>
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <button
                    onClick={() => formOeffnen(sektion)}
                    style={{
                      background: 'transparent', border: '1px solid #ff6b00',
                      color: '#ff6b00', padding: '0.4rem 0.75rem',
                      borderRadius: '6px', cursor: 'pointer'
                    }}
                  >✏️</button>
                  <button
                    onClick={() => sektionLoeschen(sektion.id)}
                    style={{
                      background: 'transparent', border: '1px solid #ff4444',
                      color: '#ff4444', padding: '0.4rem 0.75rem',
                      borderRadius: '6px', cursor: 'pointer'
                    }}
                  >🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Button neue Sektion */}
      {!zeigeForm && (
        <button className="btn" onClick={() => formOeffnen()} style={{ marginBottom: '1.5rem' }}>
          Sektion erstellen
        </button>
      )}

      {/* Formular */}
      {zeigeForm && (
        <div className="card">
          <h2 style={{ marginBottom: '1.5rem' }}>
            {bearbeiteSektion ? 'Sektion bearbeiten' : 'Neue Sektion'}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#aaa' }}>Name *</label>
              <input type="text" placeholder="z.B. Wand A, Überhang, Slab-Bereich"
                value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#aaa' }}>Beschreibung (optional)</label>
              <textarea placeholder="z.B. Linke Seite der Halle..."
                value={beschreibung} onChange={e => setBeschreibung(e.target.value)}
                rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#aaa' }}>Wandbild (optional)</label>
              {bildVorschau ? (
                <div style={{ position: 'relative' }}>
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
              ) : (
                <label style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '0.5rem', padding: '1.5rem', borderRadius: '8px',
                  border: '2px dashed #2a2a2a', cursor: 'pointer', color: '#aaa'
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#ff6b00'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2a2a'}
                >
                  📷 Wandbild hochladen
                  <input type="file" accept="image/jpeg,image/png,image/webp"
                    onChange={bildAuswaehlen} style={{ display: 'none' }} />
                </label>
              )}
              <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>JPG, PNG oder WebP · max. 5 MB</p>
            </div>

            {fehler && <p style={{ color: '#ff4444' }}>{fehler}</p>}

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={formSchliessen}>
                Abbrechen
              </button>
              <button className="btn" style={{ flex: 1 }} onClick={sektionSpeichern} disabled={laden}>
                {laden ? 'Speichert...' : bearbeiteSektion ? 'Speichern' : 'Sektion erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {sektionen.length > 0 && !zeigeForm && (
        <div style={{
          marginTop: '2rem', padding: '1.5rem',
          background: 'rgba(0,200,81,0.1)', border: '1px solid rgba(0,200,81,0.3)',
          borderRadius: '12px', textAlign: 'center'
        }}>
          <p style={{ color: '#00c851', marginBottom: '1rem' }}>
            ✅ {sektionen.length} Sektion(en) angelegt!
          </p>
          <Link to={`/halle/${gymId}`} className="btn">Zur Halle</Link>
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

export default SektionErstellen