import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabase'

const GRADE = ['4A','4B','4C','5A','5B','5C','6A','6A+','6B','6B+','6C','6C+','7A','7A+','7B','7B+','7C','7C+','8A']

const TICK_FARBEN = {
  flash:      { bg: '#FFD700', text: '#000', label: '⚡ Flash' },
  second_try: { bg: '#ff6b00', text: '#fff', label: '🔄 2nd Try' },
  done:       { bg: '#00c851', text: '#fff', label: '✅ Geschafft' },
}

function NutzerProfil() {
  const { userId } = useParams()
  const [profil, setProfil]       = useState(null)
  const [ticks, setTicks]         = useState([])
  const [routen, setRouten]       = useState({})
  const [heimhalle, setHeimhalle] = useState(null)
  const [laden, setLaden]         = useState(true)
  const [ichSelbst, setIchSelbst] = useState(false)

  // Besucher-Infos (wer schaut sich das Profil an)
  const [besucher, setBesucher]           = useState(null)   // eingeloggter Nutzer
  const [istAppAdmin, setIstAppAdmin]     = useState(false)  // ist der Besucher App-Admin?
  const [adminHallen, setAdminHallen]     = useState([])     // Hallen in denen Besucher Admin ist
  const [zielRolle, setZielRolle]         = useState(null)   // Rolle des Profilinhabers (in gemeinsamen Hallen)

  // Ban-States
  const [bans, setBans]                   = useState([])     // aktuelle Bans des Profilinhabers
  const [zeigeBanModal, setZeigeBanModal] = useState(false)
  const [banHalleId, setBanHalleId]       = useState('')
  const [banGrund, setBanGrund]           = useState('')
  const [banLaden, setBanLaden]           = useState(false)
  const [banFehler, setBanFehler]         = useState('')

  useEffect(() => {
    async function datenLaden() {
      const { data: { session } } = await supabase.auth.getSession()
      const ich = session?.user ?? null
      setBesucher(ich)
      if (ich?.id === userId) setIchSelbst(true)

      // Profil des angezeigten Nutzers
      const { data: profilData } = await supabase
        .from('profiles').select('*').eq('id', userId).maybeSingle()
      setProfil(profilData)

      // Sends laden
      const { data: tickDaten } = await supabase
        .from('ticks').select('*').eq('user_id', userId)
        .order('ticked_at', { ascending: false })
      const alleTicks = tickDaten || []
      setTicks(alleTicks)

      if (alleTicks.length > 0) {
        const ids = [...new Set(alleTicks.map(t => t.route_id))]
        const { data: routenDaten } = await supabase
          .from('routes').select('id, name, setter_grade, color, gym_id').in('id', ids)
        const map = {}
        ;(routenDaten || []).forEach(r => { map[r.id] = r })
        setRouten(map)

        const gymZaehler = {}
        alleTicks.forEach(t => {
          const gym = map[t.route_id]?.gym_id
          if (gym) gymZaehler[gym] = (gymZaehler[gym] || 0) + 1
        })
        const topId = Object.entries(gymZaehler).sort((a,b) => b[1]-a[1])[0]?.[0]
        if (topId) {
          const { data: gymData } = await supabase
            .from('gyms').select('id, name, city').eq('id', topId).single()
          setHeimhalle(gymData)
        }
      }

      // ── Ban-Logik: nur wenn eingeloggt und nicht das eigene Profil ──
      if (ich && ich.id !== userId) {

        // 1. Ist der Besucher App-Admin?
        const { data: besucherProfil } = await supabase
          .from('profiles').select('is_app_admin').eq('id', ich.id).maybeSingle()
        const appAdmin = besucherProfil?.is_app_admin === true
        setIstAppAdmin(appAdmin)

        // 2. In welchen Hallen ist der Besucher Admin?
        const { data: adminMitglied } = await supabase
          .from('gym_members').select('gym_id, role')
          .eq('user_id', ich.id).eq('role', 'admin')
        const hallenIds = (adminMitglied || []).map(m => m.gym_id)
        setAdminHallen(hallenIds)

        // 3. Welche Rolle hat der Profilinhaber in diesen Hallen?
        //    (Admin darf Moderator bannen, aber nicht andere Admins)
        if (hallenIds.length > 0) {
          const { data: zielMitglied } = await supabase
            .from('gym_members').select('role')
            .eq('user_id', userId).in('gym_id', hallenIds)
            .maybeSingle()
          setZielRolle(zielMitglied?.role || 'member')
        }

        // 4. Bestehende Bans des Profilinhabers laden
        const { data: banDaten } = await supabase
          .from('gym_bans').select('*, gyms(name)')
          .eq('user_id', userId)
        setBans(banDaten || [])
      }

      setLaden(false)
    }
    datenLaden()
  }, [userId])

  // ── Ban ausführen ────────────────────────────────────────────────────────────
  async function banAusfuehren() {
    setBanFehler('')
    if (!banHalleId) { setBanFehler('Bitte eine Halle auswählen.'); return }
    setBanLaden(true)

    const { error } = await supabase.from('gym_bans').insert({
      gym_id:     banHalleId,
      user_id:    userId,
      banned_by:  besucher.id,
      reason:     banGrund.trim() || null
    })

    if (error?.code === '23505') {
      setBanFehler('Dieser Nutzer ist in dieser Halle bereits gebannt.')
    } else if (error) {
      setBanFehler('Fehler: ' + error.message)
    } else {
      // Ban lokal hinzufügen ohne neu zu laden
      const { data: neuerBan } = await supabase
        .from('gym_bans').select('*, gyms(name)')
        .eq('user_id', userId).eq('gym_id', banHalleId).single()
      setBans(prev => [...prev, neuerBan])
      setZeigeBanModal(false)
      setBanHalleId('')
      setBanGrund('')
    }
    setBanLaden(false)
  }

  // ── Ban aufheben ─────────────────────────────────────────────────────────────
  async function banAufheben(banId) {
    await supabase.from('gym_bans').delete().eq('id', banId)
    setBans(prev => prev.filter(b => b.id !== banId))
  }

  // ── Darf der Besucher bannen? ────────────────────────────────────────────────
  // App-Admin: immer (außer sich selbst, aber das ist schon durch ichSelbst gefiltert)
  // Hallen-Admin: ja, außer wenn Ziel auch Admin ist
  const darfBannen = !ichSelbst && (
    istAppAdmin || (adminHallen.length > 0 && zielRolle !== 'admin')
  )

  // Welche Hallen kann der Besucher für einen Ban auswählen?
  // App-Admin: alle Hallen des Profilinhabers
  // Hallen-Admin: nur seine eigenen Admin-Hallen
  const [alleHallen, setAlleHallen] = useState([])
  useEffect(() => {
    async function hallenLaden() {
      if (!darfBannen) return
      if (istAppAdmin) {
        // Alle Hallen in denen der Profilinhaber Mitglied ist
        const { data } = await supabase
          .from('gym_members').select('gym_id, gyms(id, name)')
          .eq('user_id', userId)
        setAlleHallen((data || []).map(m => m.gyms).filter(Boolean))
      } else {
        // Nur die Hallen in denen der Besucher Admin ist
        const { data } = await supabase
          .from('gyms').select('id, name').in('id', adminHallen)
        setAlleHallen(data || [])
      }
    }
    hallenLaden()
  }, [darfBannen, istAppAdmin, adminHallen, userId])

  // Grad-Chart
  const gradVerteilung = GRADE.map(grad => ({
    grad,
    anzahl: ticks.filter(t => routen[t.route_id]?.setter_grade === grad).length
  })).filter(g => g.anzahl > 0)
  const maxGrad = Math.max(...gradVerteilung.map(g => g.anzahl), 1)

  if (laden) return <div className="container"><p>Lädt...</p></div>

  const anzeigeName = profil?.username || '🧗 Unbekannter Kletterer'

  return (
    <div className="container" style={{ maxWidth: '700px' }}>

      {ichSelbst && (
        <div style={{
          background: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.3)',
          borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem',
          fontSize: '0.9rem', color: '#ff6b00'
        }}>
          Das ist dein eigenes Profil. <Link to="/profil" style={{ color: '#ff6b00', fontWeight: 'bold' }}>Hier bearbeiten →</Link>
        </div>
      )}

      {/* Profil Header */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <div style={{
          width: '90px', height: '90px', borderRadius: '50%',
          background: profil?.avatar_url ? 'transparent' : '#ff6b00',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2.5rem', overflow: 'hidden', border: '3px solid #2a2a2a', flexShrink: 0
        }}>
          {profil?.avatar_url
            ? <img src={profil.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : '🧗'
          }
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{anzeigeName}</h1>
            {/* Ban-Button – nur sichtbar wenn Besucher Berechtigung hat */}
            {darfBannen && (
              <button
                onClick={() => setZeigeBanModal(true)}
                style={{
                  background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)',
                  color: '#ff4444', padding: '0.3rem 0.8rem',
                  borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem'
                }}
              >🚫 Bannen</button>
            )}
          </div>
          {profil?.bio
            ? <p style={{ color: '#aaa', margin: '0.4rem 0' }}>{profil.bio}</p>
            : <p style={{ color: '#555', fontStyle: 'italic', margin: '0.4rem 0' }}>Keine Beschreibung</p>
          }
          {heimhalle && (
            <Link to={`/halle/${heimhalle.id}`} style={{ color: '#666', fontSize: '0.85rem', textDecoration: 'none' }}>
              🏠 {heimhalle.name} · {heimhalle.city}
            </Link>
          )}
        </div>
      </div>

      {/* Aktive Bans anzeigen (nur für App-Admin + Hallen-Admin sichtbar) */}
      {darfBannen && bans.length > 0 && (
        <div className="card" style={{ marginBottom: '2rem', borderColor: 'rgba(255,68,68,0.3)' }}>
          <h3 style={{ marginBottom: '0.75rem', color: '#ff4444' }}>🚫 Aktive Bans</h3>
          {bans.map(ban => (
            <div key={ban.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '0.5rem 0', borderBottom: '1px solid #222'
            }}>
              <div>
                <span style={{ color: 'white', fontSize: '0.9rem' }}>{ban.gyms?.name}</span>
                {ban.reason && <span style={{ color: '#666', fontSize: '0.8rem', marginLeft: '0.5rem' }}>· {ban.reason}</span>}
              </div>
              <button
                onClick={() => banAufheben(ban.id)}
                style={{
                  background: 'transparent', border: '1px solid #333',
                  color: '#aaa', padding: '0.2rem 0.6rem',
                  borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem'
                }}
              >Aufheben</button>
            </div>
          ))}
        </div>
      )}

      {/* Statistik-Kacheln */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { zahl: ticks.length,                                           label: 'Sends' },
          { zahl: ticks.filter(t => t.tick_type === 'flash').length,      label: '⚡ Flash' },
          { zahl: ticks.filter(t => t.tick_type === 'second_try').length, label: '🔄 2nd Try' },
          { zahl: ticks.filter(t => t.tick_type === 'done').length,       label: '✅ Geschafft' },
        ].map(({ zahl, label }) => (
          <div key={label} className="card" style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#ff6b00' }}>{zahl}</div>
            <div style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '0.2rem' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Schwierigkeitsverteilung */}
      {gradVerteilung.length > 0 && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1.25rem' }}>📊 Schwierigkeitsverteilung</h2>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '120px', padding: '0 0.5rem' }}>
            {gradVerteilung.map(({ grad, anzahl }) => (
              <div key={grad} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.65rem', color: '#aaa' }}>{anzahl}</span>
                <div style={{
                  width: '100%', height: `${(anzahl / maxGrad) * 90}px`,
                  background: 'linear-gradient(to top, #ff6b00, #ff9f50)',
                  borderRadius: '4px 4px 0 0', minHeight: '4px'
                }} />
                <span style={{ fontSize: '0.65rem', color: '#aaa', transform: 'rotate(-45deg)', transformOrigin: 'center', whiteSpace: 'nowrap' }}>
                  {grad}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Send-Liste */}
      <h2 style={{ marginBottom: '1rem' }}>✅ Sends</h2>
      {ticks.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: '#666' }}>Noch keine Sends.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '3rem' }}>
          {ticks.map(tick => {
            const route = routen[tick.route_id]
            const tickInfo = TICK_FARBEN[tick.tick_type] || TICK_FARBEN.done
            return (
              <Link key={tick.id} to={route ? `/route/${route.id}` : '#'} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '8px', alignSelf: 'stretch', borderRadius: '4px', background: route?.color || '#444', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: 'white' }}>{route?.name || 'Route gelöscht'}</strong>
                    <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.2rem' }}>
                      {new Date(tick.ticked_at).toLocaleDateString('de-DE')}
                    </div>
                  </div>
                  {route?.setter_grade && (
                    <span style={{ background: 'rgba(255,107,0,0.15)', color: '#ff6b00', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                      {route.setter_grade}
                    </span>
                  )}
                  <span style={{ background: tickInfo.bg, color: tickInfo.text, padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                    {tickInfo.label}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* ── Ban Modal ── */}
      {zeigeBanModal && (
        <div
          onClick={() => setZeigeBanModal(false)}
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
              width: '100%', maxWidth: '400px', padding: '1.5rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, color: '#ff4444' }}>🚫 {anzeigeName} bannen</h2>
              <button onClick={() => setZeigeBanModal(false)} style={{
                background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white',
                borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer'
              }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Hallen-Auswahl */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', color: '#aaa', fontSize: '0.85rem' }}>
                  Halle *
                </label>
                <select
                  value={banHalleId}
                  onChange={e => setBanHalleId(e.target.value)}
                  style={{
                    width: '100%', padding: '0.6rem 0.75rem',
                    background: '#111', border: '1px solid #2a2a2a',
                    borderRadius: '8px', color: 'white', fontSize: '0.95rem'
                  }}
                >
                  <option value="">Halle auswählen...</option>
                  {alleHallen.map(h => {
                    const bereitsGebannt = bans.some(b => b.gym_id === h.id)
                    return (
                      <option key={h.id} value={h.id} disabled={bereitsGebannt}>
                        {h.name}{bereitsGebannt ? ' (bereits gebannt)' : ''}
                      </option>
                    )
                  })}
                </select>
              </div>

              {/* Grund (optional) */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', color: '#aaa', fontSize: '0.85rem' }}>
                  Grund (optional)
                </label>
                <textarea
                  value={banGrund}
                  onChange={e => setBanGrund(e.target.value)}
                  placeholder="z.B. Wiederholtes Fehlverhalten..."
                  rows={3}
                  maxLength={200}
                  style={{
                    width: '100%', padding: '0.6rem 0.75rem',
                    background: '#111', border: '1px solid #2a2a2a',
                    borderRadius: '8px', color: 'white', fontSize: '0.9rem',
                    resize: 'vertical', boxSizing: 'border-box'
                  }}
                />
              </div>

              {banFehler && <p style={{ color: '#ff4444', fontSize: '0.85rem', margin: 0 }}>{banFehler}</p>}

              <button
                onClick={banAusfuehren}
                disabled={banLaden || !banHalleId}
                style={{
                  background: '#ff4444', border: 'none', color: 'white',
                  padding: '0.75rem', borderRadius: '8px', cursor: 'pointer',
                  fontSize: '1rem', fontWeight: 'bold',
                  opacity: banHalleId ? 1 : 0.5
                }}
              >
                {banLaden ? 'Wird gebannt...' : '🚫 Ban bestätigen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NutzerProfil