import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function TickButton({ routeId }) {
  const [nutzer, setNutzer] = useState(null)
  const [tick, setTick] = useState(null)
  const [rating, setRating] = useState(null)
  const [zeigeModal, setZeigeModal] = useState(false)
  const [gewaehlterTick, setGewaehlterTick] = useState(null)
  const [sterne, setSterne] = useState(0)
  const [grad, setGrad] = useState('')
  const [kommentar, setKommentar] = useState('')
  const [laden, setLaden] = useState(false)

  const grade = ['?', '4A', '4B', '4C', '5A', '5B', '5C', '6A', '6A+', '6B', '6B+', '6C', '6C+', '7A', '7A+', '7B', '7B+', '7C', '7C+', '8A']

  useEffect(() => {
    async function datenLaden() {
      const { data: { session } } = await supabase.auth.getSession()
      setNutzer(session?.user ?? null)

      if (session?.user) {
        const { data: tickData } = await supabase
          .from('ticks').select('*')
          .eq('route_id', routeId).eq('user_id', session.user.id).single()
        setTick(tickData)

        const { data: ratingData } = await supabase
          .from('route_ratings').select('*')
          .eq('route_id', routeId).eq('user_id', session.user.id).single()
        setRating(ratingData)

        if (tickData) setGewaehlterTick(tickData.tick_type)
        if (ratingData) {
          setSterne(ratingData.stars || 0)
          setGrad(ratingData.community_grade || '')
        }
      }
    }
    datenLaden()
  }, [routeId])

  function modalOeffnen() {
    setZeigeModal(true)
    document.body.style.overflow = 'hidden'
    document.body.classList.add('modal-offen')
  }

  function modalSchliessen() {
    setZeigeModal(false)
    document.body.style.overflow = ''
    document.body.classList.remove('modal-offen')
  }

  async function tickSpeichern() {
    if (!gewaehlterTick) return
    setLaden(true)

    // Tick speichern oder updaten
    if (tick) {
      await supabase.from('ticks').update({ tick_type: gewaehlterTick }).eq('id', tick.id)
      setTick({ ...tick, tick_type: gewaehlterTick })
    } else {
      const { data } = await supabase.from('ticks').insert({
        route_id: routeId,
        user_id: nutzer.id,
        tick_type: gewaehlterTick
      }).select().single()
      setTick(data)
    }

    // Kommentar speichern
    if (kommentar.trim()) {
      await supabase.from('comments').insert({
        route_id: routeId,
        user_id: nutzer.id,
        text: kommentar.trim()
      })
      setKommentar('')
    }

    // Bewertung speichern
    if (sterne > 0 || grad) {
      await supabase.from('route_ratings').upsert({
        route_id: routeId,
        user_id: nutzer.id,
        stars: sterne || null,
        community_grade: grad || null
      }, { onConflict: 'user_id,route_id' })
      setRating({ stars: sterne, community_grade: grad })
    }

    modalSchliessen()
    setLaden(false)
  }

  async function tickLoeschen() {
    setLaden(true)
    await supabase.from('ticks').delete().eq('id', tick.id)
    setTick(null)
    setGewaehlterTick(null)
    setSterne(0)
    setGrad('')
    setKommentar('')
    modalSchliessen()
    setLaden(false)
  }

  if (!nutzer) {
    return <span style={{ color: '#666', fontSize: '0.85rem' }}>Login zum Ticken</span>
  }

  return (
    <>
      <button
        className="btn"
        style={{ background: tick ? '#00c851' : undefined }}
        onClick={modalOeffnen}
      >
        {tick ? (
          tick.tick_type === 'flash' ? '⚡ Flash' :
          tick.tick_type === 'second_try' ? '2️⃣ 2. Versuch' : '✅ Geschafft'
        ) : 'Geschafft!'}
      </button>

      {zeigeModal && (
        <div
          onClick={modalSchliessen}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '1rem',
            pointerEvents: 'all'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#1a1a1a', borderRadius: '16px',
              padding: '2rem', width: '100%', maxWidth: '420px',
              border: '1px solid #2a2a2a',
              maxHeight: '90vh', overflowY: 'auto',
              pointerEvents: 'all'
            }}
          >
            {/* Header mit Zurück Pfeil */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <button
                onClick={modalSchliessen}
                style={{
                  background: 'transparent', border: 'none',
                  color: '#aaa', cursor: 'pointer', fontSize: '1.5rem',
                  padding: '0', lineHeight: 1
                }}
              >
                ←
              </button>
              <h2 style={{ margin: 0 }}>
                {tick ? '✏️ Bewertung bearbeiten' : '🎉 Route geschafft!'}
              </h2>
            </div>

            {/* Tick Art */}
            <p style={{ marginBottom: '0.75rem', color: '#aaa' }}>Wie hast du sie geschafft? *</p>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {[
                { key: 'flash', emoji: '⚡', label: 'Flash', desc: '1. Versuch' },
                { key: 'second_try', emoji: '2️⃣', label: '2. Versuch', desc: '2. Versuch' },
                { key: 'geschafft', emoji: '✅', label: 'Geschafft', desc: 'Mehrere Versuche' },
              ].map(option => (
                <div
                  key={option.key}
                  onClick={() => setGewaehlterTick(option.key)}
                  style={{
                    flex: 1, padding: '0.75rem 0.5rem', borderRadius: '10px',
                    border: `2px solid ${gewaehlterTick === option.key ? '#ff6b00' : '#2a2a2a'}`,
                    background: gewaehlterTick === option.key ? 'rgba(255,107,0,0.1)' : 'transparent',
                    cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontSize: '1.2rem' }}>{option.emoji}</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginTop: '0.25rem' }}>{option.label}</div>
                  <div style={{ fontSize: '0.7rem', color: '#aaa' }}>{option.desc}</div>
                </div>
              ))}
            </div>

            {/* Sterne */}
            <p style={{ marginBottom: '0.75rem', color: '#aaa' }}>Bewertung (optional)</p>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {[1, 2, 3, 4, 5].map(stern => (
                <span
                  key={stern}
                  onClick={() => setSterne(stern === sterne ? 0 : stern)}
                  style={{
                    fontSize: '2rem', cursor: 'pointer',
                    color: stern <= sterne ? '#FFD700' : '#333',
                    transition: 'color 0.2s'
                  }}
                >★</span>
              ))}
            </div>

            {/* Schwierigkeitsgrad */}
            <p style={{ marginBottom: '0.75rem', color: '#aaa' }}>Schwierigkeitsgrad (optional)</p>
            <div style={{
              display: 'flex', gap: '0.5rem',
              overflowX: 'auto', paddingBottom: '0.5rem',
              marginBottom: '1.5rem',
              scrollbarWidth: 'thin', scrollbarColor: '#ff6b00 #2a2a2a'
            }}>
              {grade.map(g => (
                <span
                  key={g}
                  onClick={() => setGrad(grad === g ? '' : g)}
                  style={{
                    padding: '0.4rem 0.9rem', borderRadius: '20px', cursor: 'pointer',
                    border: `1px solid ${grad === g ? '#ff6b00' : '#2a2a2a'}`,
                    background: grad === g ? 'rgba(255,107,0,0.15)' : '#111',
                    color: grad === g ? '#ff6b00' : '#aaa',
                    fontSize: '0.85rem', whiteSpace: 'nowrap',
                    transition: 'all 0.2s', flexShrink: 0
                  }}
                >{g}</span>
              ))}
            </div>

            {/* Kommentar */}
            <p style={{ marginBottom: '0.75rem', color: '#aaa' }}>Kommentar (optional)</p>
            <textarea
              value={kommentar}
              onChange={e => setKommentar(e.target.value)}
              placeholder="Beta, Tipps, Gedanken zur Route..."
              rows={3}
              style={{
                width: '100%', padding: '0.75rem',
                borderRadius: '8px', border: '1px solid #2a2a2a',
                background: '#111', color: 'white',
                fontSize: '0.95rem', resize: 'vertical',
                marginBottom: '1.5rem', boxSizing: 'border-box'
              }}
            />

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '1rem' }}>
              {tick && (
                <button
                  className="btn btn-outline"
                  style={{ flex: 1, borderColor: '#ff4444', color: '#ff4444' }}
                  onClick={tickLoeschen}
                  disabled={laden}
                >
                  Tick löschen
                </button>
              )}
              <button
                className="btn"
                style={{ flex: 1, opacity: gewaehlterTick ? 1 : 0.5 }}
                onClick={tickSpeichern}
                disabled={!gewaehlterTick || laden}
              >
                {laden ? 'Speichert...' : tick ? 'Aktualisieren' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default TickButton