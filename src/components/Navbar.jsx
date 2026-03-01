import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'

function Navbar() {
  const [nutzer, setNutzer] = useState(null)
  const [zeigeMenu, setZeigeMenu] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setNutzer(session?.user ?? null)
    })
    supabase.auth.onAuthStateChange((_event, session) => {
      setNutzer(session?.user ?? null)
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

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">🧗 BoulderApp</Link>
      <div className="navbar-links">
        <Link to="/">Start</Link>
        <Link to="/hallen">Hallen</Link>
        {nutzer ? (
          <>
            <Link to="/profil">Profil</Link>
            <span onClick={ausloggen} style={{ color: '#ff6b00', cursor: 'pointer' }}>
              Ausloggen
            </span>
          </>
        ) : (
          <Link to="/login">Login</Link>
        )}

        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setZeigeMenu(!zeigeMenu)}
            style={{
              background: 'transparent', border: '1px solid #2a2a2a',
              color: 'white', borderRadius: '8px',
              padding: '0.3rem 0.6rem', cursor: 'pointer',
              fontSize: '1rem', lineHeight: 1
            }}
          >
            ...
          </button>

          {zeigeMenu && (
            <div style={{
              position: 'absolute', top: '110%', right: 0,
              background: '#1a1a1a', border: '1px solid #2a2a2a',
              borderRadius: '10px', minWidth: '180px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              zIndex: 9999, overflow: 'hidden'
            }}>
              <Link
                to="/datenschutz"
                onClick={() => setZeigeMenu(false)}
                style={{
                  display: 'block', padding: '0.75rem 1rem',
                  color: '#aaa', textDecoration: 'none',
                  fontSize: '0.9rem', borderBottom: '1px solid #2a2a2a'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#2a2a2a'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                🔒 Datenschutz
              </Link>
              
                <Link
                to="/datenschutz"
                onClick={() => setZeigeMenu(false)}
                style={{
                  display: 'block', padding: '0.75rem 1rem',
                  color: '#aaa', textDecoration: 'none', fontSize: '0.9rem'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#2a2a2a'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                💻 GitHub
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar