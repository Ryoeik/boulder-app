import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

function AccountLoeschen({ nutzer }) {
  const navigate = useNavigate()
  const [zeigeModal, setZeigeModal] = useState(false)
  const [schritt, setSchritt] = useState(1)
  const [bilderBehalten, setBilderBehalten] = useState(null)
  const [bestaetigung, setBestaetigung] = useState('')
  const [laden, setLaden] = useState(false)
  const [fehler, setFehler] = useState('')

  // Admin-Hallen mit Sektionsbildern
  const [adminHallenMitBildern, setAdminHallenMitBildern] = useState([])
  const [hallenGeladen, setHallenGeladen] = useState(false)

  useEffect(() => {
    async function adminHallenPruefen() {
      if (!nutzer?.id) return

      // Hallen wo Nutzer Admin ist
      const { data: adminMitgliedschaften } = await supabase
        .from('gym_members')
        .select('gym_id')
        .eq('user_id', nutzer.id)
        .eq('role', 'admin')

      if (!adminMitgliedschaften?.length) {
        setHallenGeladen(true)
        return
      }

      const gymIds = adminMitgliedschaften.map(m => m.gym_id)

      // Sektionen mit Bildern in diesen Hallen
      const { data: sektionenMitBildern } = await supabase
        .from('sections')
        .select('gym_id, name, image_url')
        .in('gym_id', gymIds)
        .not('image_url', 'is', null)

      if (!sektionenMitBildern?.length) {
        setHallenGeladen(true)
        return
      }

      // Hallennamen laden
      const { data: hallenData } = await supabase
        .from('gyms')
        .select('id, name')
        .in('id', gymIds)

      // Gruppieren nach Halle
      const gruppiertNachHalle = gymIds.map(gymId => {
        const halle = hallenData?.find(h => h.id === gymId)
        const bilder = sektionenMitBildern.filter(s => s.gym_id === gymId)
        return bilder.length > 0 ? { gymId, halleName: halle?.name || gymId, anzahlBilder: bilder.length } : null
      }).filter(Boolean)

      setAdminHallenMitBildern(gruppiertNachHalle)
      setHallenGeladen(true)
    }

    adminHallenPruefen()
  }, [nutzer?.id])

  function modalOeffnen() {
    setZeigeModal(true)
    setSchritt(adminHallenMitBildern.length > 0 ? 1 : 2)
    setBilderBehalten(adminHallenMitBildern.length > 0 ? null : false)
    setBestaetigung('')
    setFehler('')
  }

  async function accountLoeschen() {
    if (bestaetigung !== 'LÖSCHEN') {
      setFehler('Bitte tippe LÖSCHEN ein um fortzufahren.')
      return
    }

    setLaden(true)
    setFehler('')

    try {
      // 1. Profilbild löschen
      if (nutzer?.id) {
        await supabase.storage.from('avatars').remove([
          `${nutzer.id}/avatar.jpg`,
          `${nutzer.id}/avatar.png`,
          `${nutzer.id}/avatar.webp`
        ])
      }

      // 2. Beta-Videos löschen
      const { data: kommentare } = await supabase
        .from('comments')
        .select('video_url')
        .eq('user_id', nutzer.id)
        .not('video_url', 'is', null)

      for (const k of (kommentare || [])) {
        if (k.video_url) {
          const dateiName = k.video_url.split('/').pop()
          await supabase.storage.from('beta-videos').remove([dateiName])
        }
      }

      // 3. Sektionsbilder löschen falls gewünscht
      if (!bilderBehalten && adminHallenMitBildern.length > 0) {
        const gymIds = adminHallenMitBildern.map(h => h.gymId)
        const { data: sektionen } = await supabase
          .from('sections')
          .select('image_url')
          .in('gym_id', gymIds)
          .not('image_url', 'is', null)

        for (const s of (sektionen || [])) {
          if (s.image_url) {
            // Pfad aus URL extrahieren
            const url = new URL(s.image_url)
            const pfad = url.pathname.split('/route-images/')[1]
            if (pfad) await supabase.storage.from('route-images').remove([pfad])
          }
        }
      }

      // 4. RPC aufrufen (Admin-Transfer + DB-Einträge löschen)
      const { error } = await supabase.rpc('delete_user_account', {
        user_id: nutzer.id,
        bilder_loeschen: !bilderBehalten
      })

      if (error) {
        setFehler('Fehler: ' + error.message)
        setLaden(false)
        return
      }

      // 5. Ausloggen
      await supabase.auth.signOut()
      navigate('/')

    } catch (e) {
      setFehler('Unbekannter Fehler: ' + e.message)
      setLaden(false)
    }
  }

  const hatBilderWarnung = adminHallenMitBildern.length > 0

  return (
    <>
      <div style={{
        marginTop: '2rem', marginBottom: '3rem',
        padding: '1.5rem', borderRadius: '12px',
        border: '1px solid rgba(255,68,68,0.3)',
        background: 'rgba(255,68,68,0.05)'
      }}>
        <h2 style={{ color: '#ff4444', marginBottom: '0.5rem' }}>⚠️ Account löschen</h2>
        <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Dein Account, Profil, Ticks, Kommentare und Bewertungen werden unwiderruflich gelöscht.
        </p>
        <button
          onClick={modalOeffnen}
          disabled={!hallenGeladen}
          style={{
            background: 'rgba(255,68,68,0.1)', border: '1px solid #ff4444',
            color: '#ff4444', padding: '0.75rem 1.5rem',
            borderRadius: '8px', cursor: hallenGeladen ? 'pointer' : 'not-allowed',
            fontWeight: 'bold', opacity: hallenGeladen ? 1 : 0.6
          }}
        >
          🗑️ Account löschen
        </button>
      </div>

      {zeigeModal && (
        <div
          onClick={() => !laden && setZeigeModal(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '1rem'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#1a1a1a', borderRadius: '16px',
              border: '1px solid rgba(255,68,68,0.3)',
              width: '100%', maxWidth: '480px', padding: '2rem',
              maxHeight: '90vh', overflowY: 'auto'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ color: '#ff4444', margin: 0 }}>🗑️ Account löschen</h2>
              {!laden && (
                <button onClick={() => setZeigeModal(false)} style={{
                  background: 'rgba(255,255,255,0.1)', border: 'none',
                  color: 'white', borderRadius: '50%', width: '32px', height: '32px',
                  cursor: 'pointer'
                }}>✕</button>
              )}
            </div>

            {/* Schrittanzeige */}
            {hatBilderWarnung && (
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {[1, 2].map(s => (
                  <div key={s} style={{
                    flex: 1, height: '3px', borderRadius: '2px',
                    background: schritt >= s ? '#ff4444' : '#2a2a2a'
                  }} />
                ))}
              </div>
            )}

            {/* Schritt 1: Bilder-Warnung (nur wenn Admin mit Sektionsbildern) */}
            {schritt === 1 && hatBilderWarnung && (
              <div>
                <div style={{
                  background: 'rgba(255,107,0,0.08)', border: '1px solid rgba(255,107,0,0.3)',
                  borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem'
                }}>
                  <p style={{ color: '#ff6b00', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    📷 Du bist Admin in {adminHallenMitBildern.length === 1 ? 'einer Halle' : `${adminHallenMitBildern.length} Hallen`} mit Sektionsbildern
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {adminHallenMitBildern.map(h => (
                      <p key={h.gymId} style={{ color: '#aaa', fontSize: '0.85rem', margin: 0 }}>
                        • <strong style={{ color: 'white' }}>{h.halleName}</strong> — {h.anzahlBilder} Sektionsbild{h.anzahlBilder !== 1 ? 'er' : ''}
                      </p>
                    ))}
                  </div>
                </div>

                <p style={{ color: '#aaa', marginBottom: '1rem', fontSize: '0.9rem', lineHeight: '1.6' }}>
                  Was soll mit den Sektionsbildern passieren?
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <div
                    onClick={() => setBilderBehalten(false)}
                    style={{
                      padding: '1rem', borderRadius: '10px', cursor: 'pointer',
                      border: `2px solid ${bilderBehalten === false ? '#ff4444' : '#2a2a2a'}`,
                      background: bilderBehalten === false ? 'rgba(255,68,68,0.1)' : 'transparent'
                    }}
                  >
                    <strong style={{ color: bilderBehalten === false ? '#ff4444' : 'white' }}>
                      🗑️ Alles löschen
                    </strong>
                    <p style={{ color: '#aaa', fontSize: '0.85rem', marginTop: '0.25rem', margin: '0.25rem 0 0' }}>
                      Account + alle Sektionsbilder werden unwiderruflich gelöscht.
                    </p>
                  </div>

                  <div
                    onClick={() => setBilderBehalten(true)}
                    style={{
                      padding: '1rem', borderRadius: '10px', cursor: 'pointer',
                      border: `2px solid ${bilderBehalten === true ? '#ff6b00' : '#2a2a2a'}`,
                      background: bilderBehalten === true ? 'rgba(255,107,0,0.1)' : 'transparent'
                    }}
                  >
                    <strong style={{ color: bilderBehalten === true ? '#ff6b00' : 'white' }}>
                      📷 Sektionsbilder behalten
                    </strong>
                    <p style={{ color: '#aaa', fontSize: '0.85rem', marginTop: '0.25rem', margin: '0.25rem 0 0' }}>
                      Dein Account wird gelöscht, die Sektionsbilder bleiben für die Hallen erhalten.
                    </p>
                  </div>
                </div>

                {bilderBehalten !== null && (
                  <button className="btn" onClick={() => setSchritt(2)} style={{ width: '100%', padding: '1rem' }}>
                    Weiter →
                  </button>
                )}
              </div>
            )}

            {/* Schritt 2: Bestätigung */}
            {schritt === 2 && (
              <div>
                <div style={{
                  background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)',
                  borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem'
                }}>
                  <p style={{ color: '#ff4444', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    ⚠️ Diese Aktion kann nicht rückgängig gemacht werden!
                  </p>
                  <p style={{ color: '#aaa', fontSize: '0.85rem', lineHeight: '1.6', margin: 0 }}>
                    Folgendes wird gelöscht: Dein Profil, alle Ticks, Kommentare, Bewertungen und dein Profilbild.
                    {!bilderBehalten && hatBilderWarnung && ' Zusätzlich alle Sektionsbilder deiner Admin-Hallen.'}
                    {' '}Hallen ohne andere Mitglieder werden ebenfalls gelöscht.
                    {' '}Dein Admin-Status wird automatisch an das älteste Mitglied übertragen.
                  </p>
                </div>

                <p style={{ color: '#aaa', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                  Tippe <strong style={{ color: 'white' }}>LÖSCHEN</strong> um fortzufahren:
                </p>
                <input
                  type="text"
                  value={bestaetigung}
                  onChange={e => setBestaetigung(e.target.value)}
                  placeholder="LÖSCHEN"
                  style={{
                    width: '100%', padding: '0.75rem',
                    background: '#111', border: '1px solid #2a2a2a',
                    borderRadius: '8px', color: 'white', fontSize: '1rem',
                    marginBottom: '1rem', boxSizing: 'border-box'
                  }}
                />

                {fehler && <p style={{ color: '#ff4444', marginBottom: '1rem' }}>{fehler}</p>}

                <div style={{ display: 'flex', gap: '1rem' }}>
                  {hatBilderWarnung && (
                    <button
                      onClick={() => setSchritt(1)}
                      style={{
                        flex: 1, background: 'transparent', border: '1px solid #444',
                        color: '#aaa', padding: '0.75rem', borderRadius: '8px', cursor: 'pointer'
                      }}
                    >← Zurück</button>
                  )}
                  <button
                    onClick={accountLoeschen}
                    disabled={laden || bestaetigung !== 'LÖSCHEN'}
                    style={{
                      flex: 2, background: '#ff4444', border: 'none',
                      color: 'white', padding: '0.75rem', borderRadius: '8px',
                      cursor: bestaetigung === 'LÖSCHEN' && !laden ? 'pointer' : 'not-allowed',
                      fontWeight: 'bold',
                      opacity: bestaetigung === 'LÖSCHEN' && !laden ? 1 : 0.5
                    }}
                  >
                    {laden ? 'Wird gelöscht...' : '🗑️ Account endgültig löschen'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default AccountLoeschen