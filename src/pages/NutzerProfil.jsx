import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { climberXPBerechnen, levelBerechnen, levelAnzeige } from '../utils/xpSystem'
import LevelAnzeige from '../components/LevelAnzeige'

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

  const [besucher, setBesucher]       = useState(null)
  const [istAppAdmin, setIstAppAdmin] = useState(false)
  const [adminHallen, setAdminHallen] = useState([])
  const [zielRolle, setZielRolle]     = useState(null)

  const [bans, setBans]                   = useState([])
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

      const { data: profilData } = await supabase
        .from('profiles').select('*').eq('id', userId).maybeSingle()
      setProfil(profilData)

      const { data: tickDaten } = await supabase
        .from('ticks').select('*').eq('user_id', userId)
        .order('ticked_at', { ascending: false })
      const alleTicks = tickDaten || []

      if (alleTicks.length > 0) {
        const ids = [...new Set(alleTicks.map(t => t.route_id))]
        const { data: routenDaten } = await supabase
          .from('routes').select('id, name, setter_grade, color, gym_id').in('id', ids)
        const map = {}
        ;(routenDaten || []).forEach(r => { map[r.id] = r })
        setRouten(map)
        const aktiveTicks = alleTicks.filter(t => map[t.route_id])
        setTicks(aktiveTicks)

        const gymZaehler = {}
        aktiveTicks.forEach(t => {
          const gym = map[t.route_id]?.gym_id
          if (gym) gymZaehler[gym] = (gymZaehler[gym] || 0) + 1
        })
        const topId = Object.entries(gymZaehler).sort((a, b) => b[1] - a[1])[0]?.[0]
        if (topId) {
          const { data: gymData } = await supabase
            .from('gyms').select('id, name, city').eq('id', topId).single()
          setHeimhalle(gymData)
        }
      }

      if (ich && ich.id !== userId) {
        const { data: besucherProfil } = await supabase
          .from('profiles').select('is_app_admin').eq('id', ich.id).maybeSingle()
        setIstAppAdmin(besucherProfil?.is_app_admin === true)

        const { data: adminMitglied } = await supabase
          .from('gym_members').select('gym_id, role')
          .eq('user_id', ich.id).eq('role', 'admin')
        const hallenIds = (adminMitglied || []).map(m => m.gym_id)
        setAdminHallen(hallenIds)

        if (hallenIds.length > 0) {
          const { data: zielMitglied } = await supabase
            .from('gym_members').select('role')
            .eq('user_id', userId).in('gym_id', hallenIds).maybeSingle()
          setZielRolle(zielMitglied?.role || 'member')
        }

        const { data: banDaten } = await supabase
          .from('gym_bans').select('*, gyms(name)').eq('user_id', userId)
        setBans(banDaten || [])
      }

      setLaden(false)
    }
    datenLaden()
  }, [userId])

  async function banAusfuehren() {
    setBanFehler('')
    if (!banHalleId) { setBanFehler('Bitte eine Halle auswählen.'); return }
    setBanLaden(true)
    const { error } = await supabase.from('gym_bans').insert({
      gym_id: banHalleId, user_id: userId,
      banned_by: besucher.id, reason: banGrund.trim() || null
    })
    if (error?.code === '23505') {
      setBanFehler('Dieser Nutzer ist in dieser Halle bereits gebannt.')
    } else if (error) {
      setBanFehler('Fehler: ' + error.message)
    } else {
      const { data: neuerBan } = await supabase
        .from('gym_bans').select('*, gyms(name)')
        .eq('user_id', userId).eq('gym_id', banHalleId).single()
      setBans(prev => [...prev, neuerBan])
      setZeigeBanModal(false); setBanHalleId(''); setBanGrund('')
    }
    setBanLaden(false)
  }

  async function banAufheben(banId) {
    await supabase.from('gym_bans').delete().eq('id', banId)
    setBans(prev => prev.filter(b => b.id !== banId))
  }

  const darfBannen = !ichSelbst && (istAppAdmin || (adminHallen.length > 0 && zielRolle !== 'admin'))

  const [alleHallen, setAlleHallen] = useState([])
  useEffect(() => {
    async function hallenLaden() {
      if (!darfBannen) return
      if (istAppAdmin) {
        const { data } = await supabase
          .from('gym_members').select('gym_id, gyms(id, name)').eq('user_id', userId)
        setAlleHallen((data || []).map(m => m.gyms).filter(Boolean))
      } else {
        const { data } = await supabase.from('gyms').select('id, name').in('id', adminHallen)
        setAlleHallen(data || [])
      }
    }
    hallenLaden()
  }, [darfBannen, istAppAdmin, adminHallen, userId])

  const xp = climberXPBerechnen(ticks, routen)
  const { level } = levelBerechnen(xp)
  const { farbe, name: levelName } = levelAnzeige(level)

  const gradVerteilung = GRADE.map(grad => ({
    grad, anzahl: ticks.filter(t => routen[t.route_id]?.setter_grade === grad).length
  }))
  const gradVerteilungMitSends = gradVerteilung.filter(g => g.anzahl > 0)
  const maxGrad = Math.max(...gradVerteilung.map(g => g.anzahl), 1)

  const heute = new Date()
  const monate = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(heute.getFullYear(), heute.getMonth() - (5 - i), 1)
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('de-DE', { month: 'short' }), anzahl: 0
    }
  })
  ticks.forEach(tick => {
    const d = new Date(tick.ticked_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const monat = monate.find(m => m.key === key)
    if (monat) monat.anzahl++
  })
  const maxMonat = Math.max(...monate.map(m => m.anzahl), 1)

  if (laden) return <div className="container"><p>Lädt...</p></div>

  const anzeigeName = profil?.username || '🧗 Unbekannter Kletterer'

  return (
    <div className="container" style={{ maxWidth: '700px' }}>

      {ichSelbst && (
        <div style={{ background: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.3)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.9rem', color: '#ff6b00' }}>
          Das ist dein eigenes Profil. <Link to="/profil" style={{ color: '#ff6b00', fontWeight: 'bold' }}>Hier bearbeiten →</Link>
        </div>
      )}

      {/* Profil Header – zentriert */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.6rem', marginBottom: '2rem' }}>

        <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: profil?.avatar_url ? 'transparent' : '#ff6b00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', overflow: 'hidden', border: '3px solid #2a2a2a' }}>
          {profil?.avatar_url
            ? <img src={profil.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : '🧗'}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{anzeigeName}</h1>
          {darfBannen && (
            <button onClick={() => setZeigeBanModal(true)} style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', color: '#ff4444', padding: '0.3rem 0.8rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
              🚫 Bannen
            </button>
          )}
        </div>

        <span style={{ background: `${farbe}22`, border: `1px solid ${farbe}`, color: farbe, padding: '0.2rem 0.7rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>
          Lvl {level} · {levelName}
        </span>

        {profil?.bio
          ? <p style={{ color: '#aaa', margin: '0.1rem 0', fontSize: '0.9rem', maxWidth: '380px' }}>{profil.bio}</p>
          : <p style={{ color: '#555', fontStyle: 'italic', margin: '0.1rem 0', fontSize: '0.9rem' }}>Keine Beschreibung</p>
        }

        {heimhalle && (
          <Link to={`/halle/${heimhalle.id}`} style={{ textDecoration: 'none' }}>
            <div style={{ background: 'rgba(255,107,0,0.08)', border: '1px solid rgba(255,107,0,0.2)', borderRadius: '20px', padding: '0.25rem 0.85rem', fontSize: '0.8rem', color: '#ff6b00', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              🏠 {heimhalle.name} <span style={{ color: '#555' }}>· {heimhalle.city}</span>
            </div>
          </Link>
        )}

        <div style={{ width: '100%', height: '1px', background: '#1a1a1a', margin: '0.4rem 0' }} />

        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-around' }}>
          {[
            { zahl: ticks.length, label: 'Sends' },
            { zahl: ticks.filter(t => t.tick_type === 'flash').length, label: 'Flashes' },
            { zahl: ticks.filter(t => t.tick_type === 'second_try').length, label: '2nd Try' },
            { zahl: ticks.filter(t => t.tick_type === 'done').length, label: 'Done' },
          ].map(({ zahl, label }) => (
            <div key={label} style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#ff6b00', lineHeight: 1 }}>{zahl}</div>
              <div style={{ fontSize: '0.72rem', color: '#555', marginTop: '0.25rem' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Aktive Bans */}
      {darfBannen && bans.length > 0 && (
        <div className="card" style={{ marginBottom: '2rem', borderColor: 'rgba(255,68,68,0.3)' }}>
          <h3 style={{ marginBottom: '0.75rem', color: '#ff4444' }}>🚫 Aktive Bans</h3>
          {bans.map(ban => (
            <div key={ban.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #222' }}>
              <div>
                <span style={{ color: 'white', fontSize: '0.9rem' }}>{ban.gyms?.name}</span>
                {ban.reason && <span style={{ color: '#666', fontSize: '0.8rem', marginLeft: '0.5rem' }}>· {ban.reason}</span>}
              </div>
              <button onClick={() => banAufheben(ban.id)} style={{ background: 'transparent', border: '1px solid #333', color: '#aaa', padding: '0.2rem 0.6rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>Aufheben</button>
            </div>
          ))}
        </div>
      )}

      {/* XP Balken */}
      <LevelAnzeige xp={xp} titel="🧗 Climber Level" />

      {ticks.length > 0 && (
        <>
          {/* Sends pro Monat */}
          <div className="card" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1rem', color: '#aaa', letterSpacing: '0.1em' }}>SENDS PRO MONAT</h2>
              <span style={{ color: '#aaa', fontSize: '0.85rem' }}>{new Date().getFullYear()}</span>
            </div>
            <div style={{ position: 'relative' }}>
              {[0, 25, 50, 75, 100].map(pct => (
                <div key={pct} style={{ position: 'absolute', left: 0, right: 0, bottom: `${pct}%`, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
              ))}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '140px', padding: '0 0.25rem' }}>
                {monate.map(({ label, anzahl }) => (
                  <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    {anzahl > 0 && <span style={{ fontSize: '0.6rem', color: '#aaa' }}>{anzahl}</span>}
                    <div style={{ width: '100%', height: `${maxMonat > 0 ? (anzahl / maxMonat) * 110 : 0}px`, background: anzahl > 0 ? 'linear-gradient(to top, #4488ff, #44bbff)' : 'transparent', borderRadius: '3px 3px 0 0', minHeight: anzahl > 0 ? '4px' : '0', transition: 'height 0.4s', boxShadow: anzahl > 0 ? '0 0 8px rgba(68,136,255,0.4)' : 'none' }} />
                    <span style={{ fontSize: '0.6rem', color: '#555' }}>{label}</span>
                  </div>
                ))}
              </div>
              <svg viewBox={`0 0 ${monate.length * 28} 140`} preserveAspectRatio="none"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '140px', pointerEvents: 'none' }}>
                <polyline fill="none" stroke="#ff6b00" strokeWidth="1.5" strokeDasharray="3,2"
                  points={monate.map(({ anzahl }, i) => `${i * 28 + 14},${maxMonat > 0 ? 140 - (anzahl / maxMonat) * 110 : 140}`).join(' ')} />
                {monate.map(({ anzahl }, i) => {
                  if (anzahl === 0) return null
                  return <circle key={i} cx={i * 28 + 14} cy={maxMonat > 0 ? 140 - (anzahl / maxMonat) * 110 : 140} r="3" fill="#ff6b00" stroke="#111" strokeWidth="1.5" />
                })}
              </svg>
            </div>
          </div>

          {/* BY GRADES */}
          {gradVerteilungMitSends.length > 0 && (
            <div className="card" style={{ marginBottom: '2rem' }}>
              <h2 style={{ margin: '0 0 1.25rem', fontSize: '1rem', color: '#aaa', letterSpacing: '0.1em' }}>BY GRADES</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[...gradVerteilungMitSends].reverse().map(({ grad, anzahl }) => (
                  <div key={grad} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ width: '40px', fontSize: '0.8rem', color: '#aaa', textAlign: 'right', flexShrink: 0 }}>{grad}</span>
                    <div style={{ flex: 1, background: '#111', borderRadius: '3px', height: '18px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(anzahl / maxGrad) * 100}%`, background: 'linear-gradient(to right, #4488ff, #44bbcc)', borderRadius: '3px', transition: 'width 0.5s', boxShadow: '0 0 6px rgba(68,136,255,0.3)' }} />
                    </div>
                    <span style={{ width: '24px', fontSize: '0.8rem', color: '#aaa', textAlign: 'right', fontWeight: 'bold' }}>{anzahl}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
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
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ color: 'white' }}>{route?.name || 'Route gelöscht'}</strong>
                    <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.2rem' }}>{new Date(tick.ticked_at).toLocaleDateString('de-DE')}</div>
                  </div>
                  {route?.setter_grade && (
                    <span style={{ background: 'rgba(255,107,0,0.15)', color: '#ff6b00', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>{route.setter_grade}</span>
                  )}
                  <span style={{ background: tickInfo.bg, color: tickInfo.text, padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{tickInfo.label}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Ban Modal */}
      {zeigeBanModal && (
        <div onClick={() => setZeigeBanModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1a1a1a', borderRadius: '16px', border: '1px solid rgba(255,68,68,0.3)', width: '100%', maxWidth: '400px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, color: '#ff4444' }}>🚫 {anzeigeName} bannen</h2>
              <button onClick={() => setZeigeBanModal(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', color: '#aaa', fontSize: '0.85rem' }}>Halle *</label>
                <select value={banHalleId} onChange={e => setBanHalleId(e.target.value)} style={{ width: '100%', padding: '0.6rem 0.75rem', background: '#111', border: '1px solid #2a2a2a', borderRadius: '8px', color: 'white', fontSize: '0.95rem' }}>
                  <option value="">Halle auswählen...</option>
                  {alleHallen.map(h => {
                    const bereitsGebannt = bans.some(b => b.gym_id === h.id)
                    return <option key={h.id} value={h.id} disabled={bereitsGebannt}>{h.name}{bereitsGebannt ? ' (bereits gebannt)' : ''}</option>
                  })}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', color: '#aaa', fontSize: '0.85rem' }}>Grund (optional)</label>
                <textarea value={banGrund} onChange={e => setBanGrund(e.target.value)} placeholder="z.B. Wiederholtes Fehlverhalten..." rows={3} maxLength={200}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', background: '#111', border: '1px solid #2a2a2a', borderRadius: '8px', color: 'white', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              {banFehler && <p style={{ color: '#ff4444', fontSize: '0.85rem', margin: 0 }}>{banFehler}</p>}
              <button onClick={banAusfuehren} disabled={banLaden || !banHalleId} style={{ background: '#ff4444', border: 'none', color: 'white', padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold', opacity: banHalleId ? 1 : 0.5 }}>
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