import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const GRADE = ['?', '4A', '4B', '4C', '5A', '5B', '5C', '6A', '6A+', '6B', '6B+', '6C', '6C+', '7A', '7A+', '7B', '7B+', '7C', '7C+', '8A']

// Berechnet den gewichteten Durchschnittsgrad:
// - Setter-Grad zählt als 0.5 Stimmen (grobe Einschätzung)
// - Jede Kletterer-Bewertung zählt als 1.0 Stimme
function berechneKommunityGrad(grades, setterGrade) {
  const gueltig = grades.filter(g => g && GRADE.includes(g) && g !== '?')
  if (gueltig.length === 0 && !setterGrade) return null

  let summe = 0
  let gewicht = 0

  // Setter-Grad: halbe Gewichtung
  if (setterGrade && GRADE.includes(setterGrade) && setterGrade !== '?') {
    summe   += GRADE.indexOf(setterGrade) * 0.5
    gewicht += 0.5
  }

  // Kletterer-Bewertungen: volle Gewichtung
  gueltig.forEach(g => {
    summe   += GRADE.indexOf(g)
    gewicht += 1
  })

  if (gewicht === 0) return null
  return GRADE[Math.round(summe / gewicht)] || null
}

function TickButton({ routeId, setterGrade }) {
  const [nutzer, setNutzer]           = useState(null)
  const [tick, setTick]               = useState(null)
  const [rating, setRating]           = useState(null)
  const [zeigeModal, setZeigeModal]   = useState(false)
  const [gewaehlterTick, setGewaehlterTick] = useState(null)
  const [sterne, setSterne]           = useState(0)
  const [grad, setGrad]               = useState('')
  const [kommentar, setKommentar]     = useState('')
  const [laden, setLaden]             = useState(false)
  const [komunityGrad, setKommunityGrad] = useState(null)

  useEffect(() => {
    async function datenLaden() {
      const { data: { session } } = await supabase.auth.getSession()
      setNutzer(session?.user ?? null)

      if (session?.user) {
        const { data: tickData } = await supabase
          .from('ticks').select('*')
          .eq('route_id', routeId).eq('user_id', session.user.id).maybeSingle()
        setTick(tickData)

        const { data: ratingData } = await supabase
          .from('route_ratings').select('*')
          .eq('route_id', routeId).eq('user_id', session.user.id).maybeSingle()
        setRating(ratingData)

        if (tickData) setGewaehlterTick(tickData.tick_type)
        if (ratingData) {
          setSterne(ratingData.stars || 0)
          setGrad(ratingData.community_grade || '')
        }
      }

      // Alle Community-Grades laden um Durchschnitt zu berechnen
      const { data: alleRatings } = await supabase
        .from('route_ratings').select('community_grade').eq('route_id', routeId)
      if (alleRatings) {
        const kGrad = berechneKommunityGrad(alleRatings.map(r => r.community_grade), setterGrade)
        setKommunityGrad(kGrad)
      }
    }
    datenLaden()
  }, [routeId])

  function modalOeffnen() {
    setZeigeModal(true)
    document.body.style.overflow = 'hidden'
  }

  function modalSchliessen() {
    setZeigeModal(false)
    document.body.style.overflow = ''
  }

  async function tickSpeichern() {
    if (!gewaehlterTick) return
    setLaden(true)

    if (tick) {
      await supabase.from('ticks').update({ tick_type: gewaehlterTick }).eq('id', tick.id)
      setTick({ ...tick, tick_type: gewaehlterTick })
    } else {
      const { data } = await supabase.from('ticks').insert({
        route_id: routeId, user_id: nutzer.id, tick_type: gewaehlterTick
      }).select().single()
      setTick(data)
    }

    if (kommentar.trim()) {
      await supabase.from('comments').insert({
        route_id: routeId, user_id: nutzer.id, text: kommentar.trim()
      })
      setKommentar('')
    }

    if (sterne > 0 || grad) {
      await supabase.from('route_ratings').upsert({
        route_id: routeId, user_id: nutzer.id,
        stars: sterne || null, community_grade: grad || null
      }, { onConflict: 'user_id,route_id' })
      setRating({ stars: sterne, community_grade: grad })

      // Community-Grad neu berechnen
      const { data: alleRatings } = await supabase
        .from('route_ratings').select('community_grade').eq('route_id', routeId)
      if (alleRatings) {
        setKommunityGrad(berechneKommunityGrad(alleRatings.map(r => r.community_grade), setterGrade))
      }
    }

    modalSchliessen()
    setLaden(false)
  }

  async function tickLoeschen() {
    setLaden(true)
    await supabase.from('ticks').delete().eq('id', tick.id)
    setTick(null); setGewaehlterTick(null)
    setSterne(0); setGrad(''); setKommentar('')
    modalSchliessen()
    setLaden(false)
  }

  if (!nutzer) return <span style={{ color: '#666', fontSize: '0.85rem' }}>Login</span>

  const buttonInhalt = tick
    ? tick.tick_type === 'flash'      ? '⚡'
    : tick.tick_type === 'second_try' ? '🔄'
    : '✅'
    : 'Send'

  const buttonFarbe = tick
    ? tick.tick_type === 'flash'      ? '#FFD700'
    : tick.tick_type === 'second_try' ? '#ff6b00'
    : '#00c851'
    : '#444'

  return (
    <>
      <button
        onClick={e => { e.stopPropagation(); modalOeffnen() }}
        style={{
          background: buttonFarbe,
          color: tick?.tick_type === 'flash' ? '#000' : '#fff',
          border: 'none', borderRadius: '10px',
          width: '52px', height: '52px',
          fontSize: tick ? '1.4rem' : '0.75rem',
          fontWeight: 'bold', cursor: 'pointer', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.2s'
        }}
      >
        {buttonInhalt}
      </button>

      {zeigeModal && (
        <div onClick={modalSchliessen} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          zIndex: 9999
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#1a1a1a', borderRadius: '20px 20px 0 0',
            padding: '1.5rem 1.5rem 2.5rem', width: '100%', maxWidth: '480px',
            border: '1px solid #2a2a2a', maxHeight: '92vh', overflowY: 'auto'
          }}>
            {/* Handle */}
            <div style={{ width: '40px', height: '4px', background: '#2a2a2a', borderRadius: '2px', margin: '0 auto 1.25rem' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <button onClick={modalSchliessen} style={{ background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '1.5rem', padding: 0 }}>←</button>
              <h2 style={{ margin: 0 }}>{tick ? '✏️ Bewertung bearbeiten' : '🎉 Route geschafft!'}</h2>
            </div>

            {/* Tick Art */}
            <p style={{ marginBottom: '0.75rem', color: '#aaa', fontSize: '0.9rem' }}>Wie hast du sie geschafft? *</p>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {[
                { key: 'flash',      emoji: '⚡', label: 'Flash',   desc: '1. Versuch' },
                { key: 'second_try', emoji: '🔄', label: '2nd Try', desc: '2. Versuch' },
                { key: 'done',       emoji: '✅', label: 'Send',    desc: 'Mehrere Versuche' },
              ].map(option => (
                <div key={option.key} onClick={() => setGewaehlterTick(option.key)} style={{
                  flex: 1, padding: '0.75rem 0.5rem', borderRadius: '10px',
                  border: `2px solid ${gewaehlterTick === option.key ? '#ff6b00' : '#2a2a2a'}`,
                  background: gewaehlterTick === option.key ? 'rgba(255,107,0,0.1)' : 'transparent',
                  cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s'
                }}>
                  <div style={{ fontSize: '1.2rem' }}>{option.emoji}</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginTop: '0.25rem' }}>{option.label}</div>
                  <div style={{ fontSize: '0.7rem', color: '#aaa' }}>{option.desc}</div>
                </div>
              ))}
            </div>

            {/* Sterne */}
            <p style={{ marginBottom: '0.75rem', color: '#aaa', fontSize: '0.9rem' }}>Bewertung (optional)</p>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {[1,2,3,4,5].map(stern => (
                <span key={stern} onClick={() => setSterne(stern === sterne ? 0 : stern)}
                  style={{ fontSize: '2rem', cursor: 'pointer', color: stern <= sterne ? '#FFD700' : '#333', transition: 'color 0.2s' }}>★</span>
              ))}
            </div>

            {/* Schwierigkeitsgrad mit Setter-Markierung */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <p style={{ margin: 0, color: '#aaa', fontSize: '0.9rem' }}>Schwierigkeitsgrad (optional)</p>
              {komunityGrad && komunityGrad !== setterGrade && (
                <span style={{ fontSize: '0.75rem', color: '#aaa' }}>
                  Community: <strong style={{ color: '#ff6b00' }}>{komunityGrad}</strong>
                </span>
              )}
            </div>

            <div style={{
              display: 'flex', gap: '0.5rem', overflowX: 'auto',
              paddingBottom: '0.5rem', marginBottom: '0.5rem',
              scrollbarWidth: 'thin', scrollbarColor: '#ff6b00 #2a2a2a'
            }}>
              {GRADE.map(g => {
                const istSetter    = g === setterGrade
                const istGewaehlt  = grad === g
                const istKommunity = g === komunityGrad && !istSetter

                return (
                  <span key={g} onClick={() => setGrad(grad === g ? '' : g)} style={{
                    padding: '0.4rem 0.9rem', borderRadius: '20px', cursor: 'pointer',
                    flexShrink: 0, fontSize: '0.85rem', whiteSpace: 'nowrap',
                    transition: 'all 0.2s',
                    // Gewählt: orange Rahmen + Hintergrund
                    // Setter: leicht orange Hintergrund als Hinweis
                    // Community (wenn anders): leicht bläulich
                    border: istGewaehlt
                      ? '2px solid #ff6b00'
                      : istSetter
                      ? '1px solid rgba(255,107,0,0.5)'
                      : '1px solid #2a2a2a',
                    background: istGewaehlt
                      ? 'rgba(255,107,0,0.15)'
                      : istSetter
                      ? 'rgba(255,107,0,0.08)'
                      : 'transparent',
                    color: istGewaehlt
                      ? '#ff6b00'
                      : istSetter
                      ? 'rgba(255,150,50,0.9)'
                      : '#aaa',
                    fontWeight: istSetter || istGewaehlt ? 'bold' : 'normal',
                  }}>
                    {g}
                    {/* Kleiner Punkt unter dem Setter-Grad */}
                    {istSetter && !istGewaehlt && (
                      <span style={{ display: 'block', textAlign: 'center', fontSize: '0.4rem', marginTop: '-3px', color: '#ff6b00' }}>●</span>
                    )}
                  </span>
                )
              })}
            </div>

            {/* Legende */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.72rem', color: '#555' }}>
              <span>
                <span style={{ color: 'rgba(255,150,50,0.9)', fontWeight: 'bold' }}>● </span>
                Vom Routenersteller
              </span>
              {komunityGrad && (
                <span>
                  Community-Schnitt: <strong style={{ color: '#ff6b00' }}>{komunityGrad}</strong>
                </span>
              )}
            </div>

            {/* Kommentar */}
            <p style={{ marginBottom: '0.75rem', color: '#aaa', fontSize: '0.9rem' }}>Kommentar (optional)</p>
            <textarea value={kommentar} onChange={e => setKommentar(e.target.value)}
              placeholder="Beta, Tipps, Gedanken zur Route..."
              rows={3} style={{
                width: '100%', padding: '0.75rem', borderRadius: '8px',
                border: '1px solid #2a2a2a', background: '#111', color: 'white',
                fontSize: '0.95rem', resize: 'vertical',
                marginBottom: '1.5rem', boxSizing: 'border-box'
              }} />

            <div style={{ display: 'flex', gap: '1rem' }}>
              {tick && (
                <button className="btn btn-outline"
                  style={{ flex: 1, borderColor: '#ff4444', color: '#ff4444' }}
                  onClick={tickLoeschen} disabled={laden}>
                  Send löschen
                </button>
              )}
              <button className="btn"
                style={{ flex: 1, opacity: gewaehlterTick ? 1 : 0.5 }}
                onClick={tickSpeichern} disabled={!gewaehlterTick || laden}>
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