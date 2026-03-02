import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'

function Startseite() {
  const [nutzer, setNutzer] = useState(null)
  const [meineHallen, setMeineHallen] = useState([])
  const [feed, setFeed] = useState([])
  const [laden, setLaden] = useState(true)

  useEffect(() => {
    async function datenLaden() {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      setNutzer(user)

      if (!user) { setLaden(false); return }

      // Meine Hallen laden
      const { data: mitgliedschaften } = await supabase
        .from('gym_members')
        .select('gym_id, role')
        .eq('user_id', user.id)

      const hallenIds = (mitgliedschaften || []).map(m => m.gym_id)

      if (hallenIds.length === 0) { setLaden(false); return }

      const { data: hallenData } = await supabase
        .from('gyms').select('*').in('id', hallenIds)
      setMeineHallen(hallenData || [])

      // Alle Routen in meinen Hallen
      const { data: routenData } = await supabase
        .from('routes').select('id, name, color, setter_grade, gym_id, is_active')
        .in('gym_id', hallenIds)
        .eq('is_active', true)

      const routenMap = {}
      ;(routenData || []).forEach(r => { routenMap[r.id] = r })

      // Sends von anderen Mitgliedern in meinen Hallen (letzte 50)
      const routenIds = (routenData || []).map(r => r.id)
      let feedItems = []

      if (routenIds.length > 0) {
        const { data: tickData } = await supabase
          .from('ticks')
          .select('*')
          .in('route_id', routenIds)
          .neq('user_id', user.id)
          .order('ticked_at', { ascending: false })
          .limit(50)

        // Beta Videos (Kommentare mit video_url)
        const { data: videoData } = await supabase
          .from('comments')
          .select('*')
          .in('route_id', routenIds)
          .neq('user_id', user.id)
          .not('video_url', 'is', null)
          .order('created_at', { ascending: false })
          .limit(20)

        // User IDs sammeln
        const userIds = [...new Set([
          ...(tickData || []).map(t => t.user_id),
          ...(videoData || []).map(v => v.user_id)
        ])]

        const { data: profileData } = await supabase
          .from('profiles').select('id, username, avatar_url').in('id', userIds)
        const profileMap = {}
        ;(profileData || []).forEach(p => { profileMap[p.id] = p })

        // Ticks als Feed Items
        feedItems = [
          ...(tickData || []).map(t => ({
            typ: 'tick',
            id: t.id,
            userId: t.user_id,
            profil: profileMap[t.user_id],
            route: routenMap[t.route_id],
            tickTyp: t.tick_type,
            datum: t.ticked_at
          })),
          ...(videoData || []).map(v => ({
            typ: 'video',
            id: v.id,
            userId: v.user_id,
            profil: profileMap[v.user_id],
            route: routenMap[v.route_id],
            videoUrl: v.video_url,
            datum: v.created_at
          }))
        ].sort((a, b) => new Date(b.datum) - new Date(a.datum))
      }

      setFeed(feedItems)
      setLaden(false)
    }
    datenLaden()
  }, [])

  if (laden) return <div className="container"><p>Lädt...</p></div>

  // Nicht eingeloggt
  if (!nutzer) {
    return (
      <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🪨</div>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Tote Boulder</h1>
        <p style={{ color: '#aaa', marginBottom: '2rem' }}>
          Die Community-App für Boulder-Fans.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link to="/login" className="btn">Einloggen</Link>
          <Link to="/hallen" className="btn btn-outline">Hallen entdecken</Link>
        </div>
      </div>
    )
  }

  // Keine Hallen beigetreten
  if (meineHallen.length === 0) {
    return (
      <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏠</div>
        <h1>Noch keine Hallen</h1>
        <p style={{ color: '#aaa', marginBottom: '2rem' }}>
          Tritt einer Halle bei um deinen Feed zu sehen.
        </p>
        <Link to="/hallen" className="btn">Hallen entdecken →</Link>
      </div>
    )
  }

  const TICK_INFO = {
    flash:      { label: '⚡ Flash',     bg: '#FFD700', text: '#000' },
    second_try: { label: '🔄 2nd Try',   bg: '#ff6b00', text: '#fff' },
    done:       { label: '✅ Geschafft', bg: '#00c851', text: '#fff' },
  }

  return (
    <div className="container" style={{ maxWidth: '600px' }}>

      {/* Meine Hallen */}
      <div style={{
        display: 'flex', gap: '0.75rem', overflowX: 'auto',
        paddingBottom: '0.5rem', marginBottom: '1.5rem',
        scrollbarWidth: 'none'
      }}>
        {meineHallen.map(halle => (
          <Link key={halle.id} to={`/halle/${halle.id}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
            <div style={{
              background: '#1a1a1a', border: '1px solid #2a2a2a',
              borderRadius: '10px', padding: '0.6rem 1rem',
              fontSize: '0.85rem', color: 'white', whiteSpace: 'nowrap'
            }}>
              🏠 {halle.name}
            </div>
          </Link>
        ))}
      </div>

      {/* Feed */}
      <h2 style={{ marginBottom: '1rem' }}>📰 Feed</h2>

      {feed.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#666' }}>Noch keine Aktivitäten in deinen Hallen.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {feed.map(item => {
            const profil = item.profil
            const name = profil?.username || 'Kletterer'
            const halle = meineHallen.find(h => h.id === item.route?.gym_id)

            return (
              <div key={item.id} className="card" style={{ padding: '1rem' }}>

                {/* Header: Avatar + Name + Datum */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <Link to={halle ? `/halle/${halle.id}/nutzer/${item.userId}` : `/nutzer/${item.userId}`}
                    style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: profil?.avatar_url ? 'transparent' : '#ff6b00',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1rem', overflow: 'hidden', flexShrink: 0,
                      border: '2px solid #2a2a2a'
                    }}>
                      {profil?.avatar_url
                        ? <img src={profil.avatar_url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : '🧗'}
                    </div>
                    <div>
                      <div style={{ color: '#ff6b00', fontWeight: 'bold', fontSize: '0.9rem' }}>{name}</div>
                      <div style={{ color: '#555', fontSize: '0.75rem' }}>
                        {new Date(item.datum).toLocaleDateString('de-DE', {
                          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                        })}
                        {halle && <span> · {halle.name}</span>}
                      </div>
                    </div>
                  </Link>
                </div>

                {/* Tick */}
                {item.typ === 'tick' && item.route && (
                  <Link to={`/route/${item.route.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      background: '#111', borderRadius: '8px', padding: '0.75rem'
                    }}>
                      <div style={{
                        width: '10px', alignSelf: 'stretch', borderRadius: '4px',
                        background: item.route.color, flexShrink: 0
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ color: 'white', fontWeight: 'bold', fontSize: '0.9rem' }}>
                          {item.route.name}
                        </div>
                        <div style={{ color: '#ff6b00', fontSize: '0.8rem' }}>{item.route.setter_grade}</div>
                      </div>
                      <span style={{
                        background: TICK_INFO[item.tickTyp]?.bg || '#444',
                        color: TICK_INFO[item.tickTyp]?.text || '#fff',
                        padding: '0.2rem 0.6rem', borderRadius: '20px',
                        fontSize: '0.75rem', fontWeight: 'bold'
                      }}>
                        {TICK_INFO[item.tickTyp]?.label || '✅'}
                      </span>
                    </div>
                  </Link>
                )}

                {/* Beta Video */}
                {item.typ === 'video' && item.route && (
                  <div>
                    <div style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                      🎬 Beta Video für <Link to={`/route/${item.route.id}`} style={{ color: '#ff6b00' }}>
                        {item.route.name} · {item.route.setter_grade}
                      </Link>
                    </div>
                    <video
                      src={item.videoUrl} controls
                      style={{ width: '100%', borderRadius: '8px', maxHeight: '300px' }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Startseite