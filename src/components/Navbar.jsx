import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../supabase'

function Navbar() {
  const [nutzer, setNutzer] = useState(null)
  const [profil, setProfil] = useState(null)
  const [zeigeMenu, setZeigeMenu] = useState(false)
  const menuRef = useRef(null)
  const location = useLocation()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setNutzer(session?.user ?? null)
      if (session?.user) {
        const { data } = await supabase.from('profiles').select('username, avatar_url').eq('id', session.user.id).maybeSingle()
        setProfil(data)
      }
    })
    supabase.auth.onAuthStateChange(async (_event, session) => {
      setNutzer(session?.user ?? null)
      if (session?.user) {
        const { data } = await supabase.from('profiles').select('username, avatar_url').eq('id', session.user.id).maybeSingle()
        setProfil(data)
      } else {
        setProfil(null)
      }
    })

    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setZeigeMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function ausloggen() {
    await supabase.auth.signOut()
    setZeigeMenu(false)
  }

  const aktiv = (pfad) => location.pathname === pfad

  return (
    <>
      {/* Top Bar */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #1a1a1a',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 1rem', height: '52px'
      }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '1.3rem' }}>🪨</span>
          <span style={{ color: '#ff6b00', fontWeight: 'bold', fontSize: '1rem' }}>Tote Boulder</span>
        </Link>

        {/* Menü */}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button onClick={() => setZeigeMenu(!zeigeMenu)} style={{
            background: 'transparent', border: 'none',
            cursor: 'pointer', padding: '0.25rem', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {profil?.avatar_url ? (
              <img src={profil.avatar_url} alt="Avatar" style={{
                width: '32px', height: '32px', borderRadius: '50%',
                objectFit: 'cover', border: '2px solid #ff6b00'
              }} />
            ) : (
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: '#1a1a1a', border: '2px solid #2a2a2a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem', color: 'white'
              }}>☰</div>
            )}
          </button>

          {zeigeMenu && (
            <div style={{
              position: 'absolute', top: '110%', right: 0,
              background: '#111', border: '1px solid #2a2a2a',
              borderRadius: '12px', minWidth: '180px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              zIndex: 9999, overflow: 'hidden'
            }}>
              {nutzer ? (
                <>
                  {profil?.username && (
                    <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #1a1a1a' }}>
                      <div style={{ fontSize: '0.75rem', color: '#555' }}>Eingeloggt als</div>
                      <div style={{ color: 'white', fontWeight: 'bold', fontSize: '0.9rem' }}>{profil.username}</div>
                    </div>
                  )}
                  <MenuItem to="/profil" onClick={() => setZeigeMenu(false)}>👤 Profil</MenuItem>
                  <div onClick={ausloggen} style={menuItemStyle}>🚪 Ausloggen</div>
                </>
              ) : (
                <MenuItem to="/login" onClick={() => setZeigeMenu(false)}>🔑 Login</MenuItem>
              )}
              <MenuItem to="/datenschutz" onClick={() => setZeigeMenu(false)}>🔒 Datenschutz</MenuItem>
              <MenuItem to="/hallen" onClick={() => setZeigeMenu(false)}>💻 GitHub</MenuItem>
            </div>
          )}
        </div>
      </nav>

      {/* Bottom Nav */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(12px)',
        borderTop: '1px solid #1a1a1a',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        height: '60px', padding: '0 0.5rem'
      }}>
        <BottomNavItem to="/" label="Feed" emoji="🏠" aktiv={aktiv('/')} />
        <BottomNavItem to="/hallen" label="Hallen" emoji="🏟️" aktiv={aktiv('/hallen')} />
        {nutzer
          ? <BottomNavItem to="/profil" label="Profil" emoji="👤" aktiv={aktiv('/profil')} />
          : <BottomNavItem to="/login" label="Login" emoji="🔑" aktiv={aktiv('/login')} />
        }
      </div>

      {/* Spacer für Bottom Nav */}
      <div style={{ height: '60px' }} />
    </>
  )
}

function BottomNavItem({ to, label, emoji, aktiv }) {
  return (
    <Link to={to} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: '0.15rem', textDecoration: 'none', flex: 1, padding: '0.4rem 0'
    }}>
      <span style={{ fontSize: '1.4rem' }}>{emoji}</span>
      <span style={{
        fontSize: '0.65rem',
        color: aktiv ? '#ff6b00' : '#555',
        fontWeight: aktiv ? 'bold' : 'normal'
      }}>{label}</span>
      {aktiv && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#ff6b00' }} />}
    </Link>
  )
}

function MenuItem({ to, onClick, children }) {
  return (
    <Link to={to} onClick={onClick} style={menuItemStyle}>
      {children}
    </Link>
  )
}

const menuItemStyle = {
  display: 'block', padding: '0.75rem 1rem',
  color: '#aaa', textDecoration: 'none',
  fontSize: '0.9rem', borderBottom: '1px solid #1a1a1a',
  cursor: 'pointer'
}

export default Navbar