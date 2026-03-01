import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'

function baueBaum(kommentare) {
  const map = {}
  kommentare.forEach(k => { map[k.id] = { ...k, antworten: [] } })
  const wurzeln = []
  kommentare.forEach(k => {
    if (k.parent_id && map[k.parent_id]) {
      map[k.parent_id].antworten.push(map[k.id])
    } else {
      wurzeln.push(map[k.id])
    }
  })
  return wurzeln
}

// gymId als Prop hinzugefügt damit der Link korrekt ist
function KommentarElement({ k, profil, nutzer, darfAllesLoeschen, tiefe, onAntwort, onLoeschen, gymId }) {
  const [antwortOffen, setAntwortOffen] = useState(false)
  const [antwortText, setAntwortText]   = useState('')
  const [senden, setSenden]             = useState(false)

  const p    = profil[k.user_id]
  const name = p?.username || 'Kletterer'
  const einrueckung = Math.min(tiefe, 4) * 20
  const darfLoeschen = nutzer && (nutzer.id === k.user_id || darfAllesLoeschen)

  async function antwortSenden() {
    if (!antwortText.trim()) return
    setSenden(true)
    await onAntwort(k.id, antwortText.trim())
    setAntwortText('')
    setAntwortOffen(false)
    setSenden(false)
  }

  return (
    <div style={{ marginLeft: `${einrueckung}px` }}>
      <div className="card" style={{ position: 'relative', marginBottom: '0.75rem' }}>

        {tiefe > 0 && (
          <div style={{
            position: 'absolute', left: '-13px', top: 0, bottom: 0,
            width: '2px', background: '#2a2a2a', borderRadius: '2px'
          }} />
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Link
            to={gymId ? `/halle/${gymId}/nutzer/${k.user_id}` : `/nutzer/${k.user_id}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', textDecoration: 'none' }}
          >
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: p?.avatar_url ? 'transparent' : '#ff6b00',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.9rem', flexShrink: 0, overflow: 'hidden',
              border: '2px solid #2a2a2a'
            }}>
              {p?.avatar_url
                ? <img src={p.avatar_url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : '🧗'
              }
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#ff6b00' }}>{name}</div>
              <div style={{ fontSize: '0.72rem', color: '#555' }}>
                {new Date(k.created_at).toLocaleDateString('de-DE', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}
              </div>
            </div>
          </Link>

          {darfLoeschen && (
            <button
              onClick={() => onLoeschen(k.id)}
              title={darfAllesLoeschen && nutzer.id !== k.user_id ? 'Als Moderator löschen' : 'Löschen'}
              style={{
                background: 'transparent', border: 'none',
                color: darfAllesLoeschen && nutzer.id !== k.user_id ? '#ff4444' : '#555',
                cursor: 'pointer', fontSize: '1rem', padding: 0
              }}
            >🗑️</button>
          )}
        </div>

        <p style={{ color: '#ddd', lineHeight: '1.5', margin: '0 0 0.5rem' }}>{k.text}</p>

        {k.video_url && (
          <video src={k.video_url} controls
            style={{ width: '100%', borderRadius: '8px', marginBottom: '0.5rem', maxHeight: '400px' }}
          />
        )}

        {nutzer && (
          <button
            onClick={() => setAntwortOffen(!antwortOffen)}
            style={{
              background: 'transparent', border: 'none',
              color: antwortOffen ? '#ff6b00' : '#555',
              cursor: 'pointer', fontSize: '0.8rem', padding: 0
            }}
          >
            💬 {antwortOffen ? 'Abbrechen' : 'Antworten'}
            {k.antworten.length > 0 && (
              <span style={{ marginLeft: '0.5rem', color: '#444' }}>
                · {k.antworten.length} Antwort{k.antworten.length > 1 ? 'en' : ''}
              </span>
            )}
          </button>
        )}

        {antwortOffen && (
          <div style={{ marginTop: '0.75rem' }}>
            <textarea
              value={antwortText}
              onChange={e => setAntwortText(e.target.value)}
              placeholder={`Antworte auf ${name}...`}
              rows={2}
              style={{
                width: '100%', padding: '0.6rem 0.75rem',
                borderRadius: '8px', border: '1px solid #2a2a2a',
                background: '#111', color: 'white',
                fontSize: '0.9rem', resize: 'vertical',
                boxSizing: 'border-box', marginBottom: '0.5rem'
              }}
            />
            <button
              className="btn" onClick={antwortSenden}
              disabled={senden || !antwortText.trim()}
              style={{ fontSize: '0.85rem', padding: '0.4rem 1rem', opacity: antwortText.trim() ? 1 : 0.5 }}
            >
              {senden ? 'Sendet...' : 'Antworten'}
            </button>
          </div>
        )}
      </div>

      {/* gymId wird rekursiv weitergegeben */}
      {k.antworten.map(antwort => (
        <KommentarElement
          key={antwort.id}
          k={antwort}
          profil={profil}
          nutzer={nutzer}
          darfAllesLoeschen={darfAllesLoeschen}
          tiefe={tiefe + 1}
          onAntwort={onAntwort}
          onLoeschen={onLoeschen}
          gymId={gymId}
        />
      ))}
    </div>
  )
}

function Kommentare({ routeId, gymId }) {
  const [alleKommentare, setAlleKommentare] = useState([])
  const [profil, setProfil]                 = useState({})
  const [nutzer, setNutzer]                 = useState(null)
  const [darfAllesLoeschen, setDarfAllesLoeschen] = useState(false)
  const [neuerKommentar, setNeuerKommentar] = useState('')
  const [laden, setLaden]                   = useState(true)
  const [senden, setSenden]                 = useState(false)

  useEffect(() => {
    async function datenLaden() {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user ?? null
      setNutzer(user)

      if (user && gymId) {
        const { data: mitglied } = await supabase
          .from('gym_members').select('role')
          .eq('gym_id', gymId).eq('user_id', user.id)
          .maybeSingle()
        const rolle = mitglied?.role
        setDarfAllesLoeschen(rolle === 'admin' || rolle === 'moderator')
      }

      const { data } = await supabase
        .from('comments').select('*').eq('route_id', routeId)
        .order('created_at', { ascending: true })
      const alle = data || []
      setAlleKommentare(alle)

      const userIds = [...new Set(alle.map(k => k.user_id))]
      if (userIds.length > 0) {
        const { data: profileDaten } = await supabase
          .from('profiles').select('id, username, avatar_url').in('id', userIds)
        const map = {}
        ;(profileDaten || []).forEach(p => { map[p.id] = p })
        setProfil(map)
      }

      setLaden(false)
    }
    datenLaden()
  }, [routeId, gymId])

  async function profilNachladen(userId) {
    if (profil[userId]) return
    const { data } = await supabase
      .from('profiles').select('id, username, avatar_url').eq('id', userId).maybeSingle()
    if (data) setProfil(prev => ({ ...prev, [userId]: data }))
  }

  async function kommentarSenden() {
    if (!neuerKommentar.trim()) return
    setSenden(true)
    const { data, error } = await supabase.from('comments').insert({
      route_id: routeId, user_id: nutzer.id,
      text: neuerKommentar.trim(), parent_id: null
    }).select().single()
    if (!error) {
      setAlleKommentare(prev => [...prev, data])
      setNeuerKommentar('')
      await profilNachladen(nutzer.id)
    }
    setSenden(false)
  }

  async function antwortSenden(parentId, text) {
    const { data, error } = await supabase.from('comments').insert({
      route_id: routeId, user_id: nutzer.id,
      text, parent_id: parentId
    }).select().single()
    if (!error) {
      setAlleKommentare(prev => [...prev, data])
      await profilNachladen(nutzer.id)
    }
  }

  async function kommentarLoeschen(id) {
    await supabase.from('comments').delete().eq('id', id)
    setAlleKommentare(prev => {
      const zuLoeschen = new Set()
      function sammeln(kid) {
        zuLoeschen.add(kid)
        prev.filter(k => k.parent_id === kid).forEach(k => sammeln(k.id))
      }
      sammeln(id)
      return prev.filter(k => !zuLoeschen.has(k.id))
    })
  }

  if (laden) return <p style={{ color: '#aaa' }}>Lädt Kommentare...</p>

  const baum = baueBaum(alleKommentare)
  const topLevel = alleKommentare.filter(k => !k.parent_id).length

  return (
    <div style={{ marginTop: '2rem' }}>
      <h2>💬 Kommentare ({topLevel})</h2>

      {nutzer ? (
        <div style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
          <textarea
            value={neuerKommentar}
            onChange={e => setNeuerKommentar(e.target.value)}
            placeholder="Schreibe einen Kommentar oder Beta-Tipp..."
            rows={3}
            style={{
              width: '100%', padding: '0.75rem',
              borderRadius: '8px', border: '1px solid #2a2a2a',
              background: '#1a1a1a', color: 'white',
              fontSize: '0.95rem', resize: 'vertical',
              boxSizing: 'border-box', marginBottom: '0.75rem'
            }}
          />
          <button
            className="btn" onClick={kommentarSenden}
            disabled={senden || !neuerKommentar.trim()}
            style={{ opacity: neuerKommentar.trim() ? 1 : 0.5 }}
          >
            {senden ? 'Sendet...' : 'Kommentar senden'}
          </button>
        </div>
      ) : (
        <p style={{ color: '#aaa', margin: '1rem 0' }}>
          <a href="/login" style={{ color: '#ff6b00' }}>Einloggen</a> um zu kommentieren
        </p>
      )}

      {baum.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Noch keine Kommentare – sei der Erste!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {baum.map(k => (
            <KommentarElement
              key={k.id}
              k={k}
              profil={profil}
              nutzer={nutzer}
              darfAllesLoeschen={darfAllesLoeschen}
              tiefe={0}
              onAntwort={antwortSenden}
              onLoeschen={kommentarLoeschen}
              gymId={gymId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default Kommentare