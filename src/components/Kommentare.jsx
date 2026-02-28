import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function Kommentare({ routeId }) {
  const [kommentare, setKommentare] = useState([])
  const [nutzer, setNutzer] = useState(null)
  const [neuerKommentar, setNeuerKommentar] = useState('')
  const [laden, setLaden] = useState(true)
  const [senden, setSenden] = useState(false)

  useEffect(() => {
    async function datenLaden() {
      const { data: { session } } = await supabase.auth.getSession()
      setNutzer(session?.user ?? null)

      const { data } = await supabase
        .from('comments')
        .select('*')
        .eq('route_id', routeId)
        .order('created_at', { ascending: false })
      setKommentare(data || [])
      setLaden(false)
    }
    datenLaden()
  }, [routeId])

  async function kommentarSenden() {
    if (!neuerKommentar.trim()) return
    setSenden(true)

    const { data, error } = await supabase.from('comments').insert({
      route_id: routeId,
      user_id: nutzer.id,
      text: neuerKommentar.trim()
    }).select().single()

    if (!error) {
      setKommentare([data, ...kommentare])
      setNeuerKommentar('')
    }
    setSenden(false)
  }

  async function kommentarLoeschen(id) {
    await supabase.from('comments').delete().eq('id', id)
    setKommentare(kommentare.filter(k => k.id !== id))
  }

  if (laden) return <p style={{ color: '#aaa' }}>Lädt Kommentare...</p>

  return (
    <div style={{ marginTop: '2rem' }}>
      <h2>💬 Kommentare ({kommentare.length})</h2>

      {/* Neuer Kommentar */}
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
            className="btn"
            onClick={kommentarSenden}
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

      {/* Kommentarliste */}
      {kommentare.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Noch keine Kommentare – sei der Erste!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {kommentare.map(k => (
            <div key={k.id} className="card" style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: '#ff6b00', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '1rem', flexShrink: 0
                  }}>
                    🧗
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: '#aaa' }}>
                      {new Date(k.created_at).toLocaleDateString('de-DE', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
                {nutzer?.id === k.user_id && (
                  <button
                    onClick={() => kommentarLoeschen(k.id)}
                    style={{
                      background: 'transparent', border: 'none',
                      color: '#555', cursor: 'pointer', fontSize: '1.2rem',
                      padding: '0'
                    }}
                  >
                    🗑️
                  </button>
                )}
              </div>
              <p style={{ color: '#ddd', lineHeight: '1.5' }}>{k.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Kommentare