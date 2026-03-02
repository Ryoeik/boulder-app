import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

/**
 * STYLES 
 * Ein modernes Dark-Theme, das auf dem Handy wie eine native App wirkt.
 */
const styles = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '1rem',
    color: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
    padding: '0.5rem 0',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: '800',
    margin: 0,
    letterSpacing: '-0.03em',
  },
  searchBox: {
    position: 'sticky',
    top: '10px',
    zIndex: 100,
    marginBottom: '2rem',
  },
  searchInput: {
    width: '100%',
    padding: '0.85rem 1rem 0.85rem 2.8rem',
    background: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '14px',
    color: 'white',
    fontSize: '1rem',
    boxSizing: 'border-box',
    outline: 'none',
    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
  },
  sectionLabel: {
    fontSize: '0.7rem',
    fontWeight: '700',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: '0.75rem',
    display: 'block',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.85rem',
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.07)',
    textDecoration: 'none',
    marginBottom: '0.75rem',
    transition: 'transform 0.1s active',
  },
  imageWrapper: {
    width: '60px',
    height: '60px',
    borderRadius: '12px',
    background: '#222',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
    border: '1px solid #333',
  },
  badge: {
    fontSize: '0.65rem',
    background: 'rgba(0, 200, 81, 0.1)',
    color: '#00c851',
    padding: '2px 6px',
    borderRadius: '6px',
    fontWeight: 'bold',
  },
  btnJoin: {
    background: '#ff6b00',
    color: 'white',
    border: 'none',
    padding: '0.5rem 0.8rem',
    borderRadius: '10px',
    fontSize: '0.85rem',
    fontWeight: '700',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  }
};

function Hallen() {
  const [hallen, setHallen] = useState([]);
  const [gefiltert, setGefiltert] = useState([]);
  const [suche, setSuche] = useState('');
  const [nutzer, setNutzer] = useState(null);
  const [meineHallenIds, setMeineHallenIds] = useState([]);
  const [laden, setLaden] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function init() {
      // 1. User Session holen
      const { data: { session } } = await supabase.auth.getSession();
      setNutzer(session?.user ?? null);

      // 2. Hallen & Counts laden (Supabase Join Simulation)
      const { data: gyms } = await supabase
        .from('gyms')
        .select(`
          *,
          gym_members (id),
          routes (id)
        `)
        .order('name');

      if (gyms) {
        const aufbereiteteHallen = gyms.map(g => ({
          ...g,
          countMembers: g.gym_members?.length || 0,
          countRoutes: g.routes?.filter(r => r.is_active !== false).length || 0
        }));
        setHallen(aufbereiteteHallen);
        setGefiltert(aufbereiteteHallen);
      }

      // 3. Eigene Mitgliedschaften
      if (session?.user) {
        const { data: mine } = await supabase
          .from('gym_members')
          .select('gym_id')
          .eq('user_id', session.user.id);
        setMeineHallenIds((mine || []).map(m => m.gym_id));
      }
      setLaden(false);
    }
    init();
  }, []);

  const handleSuche = (val) => {
    setSuche(val);
    const q = val.toLowerCase();
    setGefiltert(hallen.filter(h => 
      h.name.toLowerCase().includes(q) || h.city.toLowerCase().includes(q)
    ));
  };

  const handleJoin = async (e, gymId) => {
    e.preventDefault();
    if (!nutzer) return navigate('/login');

    const { error } = await supabase.from('gym_members').insert({
      gym_id: gymId,
      user_id: nutzer.id,
      role: 'member'
    });

    if (!error) {
      setMeineHallenIds(prev => [...prev, gymId]);
      setHallen(prev => prev.map(h => 
        h.id === gymId ? { ...h, countMembers: h.countMembers + 1 } : h
      ));
    }
  };

  if (laden) return <div style={styles.container}>Lädt...</div>;

  const meineHallenList = gefiltert.filter(h => meineHallenIds.includes(h.id));
  const andereHallenList = gefiltert.filter(h => !meineHallenIds.includes(h.id));

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Hallen</h1>
        <Link to="/halle-erstellen" style={{ textDecoration: 'none', color: '#ff6b00', fontWeight: 'bold' }}>
          + Neu
        </Link>
      </header>

      <div style={styles.searchBox}>
        <span style={{ position: 'absolute', left: '1rem', top: '0.85rem', opacity: 0.4 }}>🔍</span>
        <input
          type="text"
          placeholder="Halle oder Stadt suchen..."
          style={styles.searchInput}
          value={suche}
          onChange={(e) => handleSuche(e.target.value)}
        />
      </div>

      {/* Favoriten (nur wenn keine aktive Suche) */}
      {!suche && meineHallenList.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <span style={styles.sectionLabel}>Meine Hallen</span>
          {meineHallenList.map(h => (
            <GymCard key={h.id} gym={h} isMember={true} onJoin={handleJoin} />
          ))}
        </div>
      )}

      {/* Entdecken Liste */}
      <div>
        <span style={styles.sectionLabel}>{suche ? 'Ergebnisse' : 'Alle Hallen'}</span>
        {andereHallenList.length > 0 ? (
          andereHallenList.map(h => (
            <GymCard key={h.id} gym={h} isMember={false} onJoin={handleJoin} />
          ))
        ) : (
          !meineHallenList.length && <p style={{ textAlign: 'center', color: '#444', marginTop: '2rem' }}>Keine Hallen gefunden.</p>
        )}
      </div>
    </div>
  );
}

/**
 * Unterkomponente für die Karte
 */
function GymCard({ gym, isMember, onJoin }) {
  return (
    <Link to={`/halle/${gym.id}`} style={styles.card}>
      <div style={styles.imageWrapper}>
        {gym.image_url ? (
          <img src={gym.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: '1.2rem' }}>🏟️</span>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {gym.name}
          </h3>
          {gym.is_certified && <span style={styles.badge}>PRO</span>}
        </div>
        <div style={{ fontSize: '0.8rem', color: '#888', margin: '2px 0' }}>📍 {gym.city}</div>
        <div style={{ fontSize: '0.75rem', color: '#555', display: 'flex', gap: '0.75rem' }}>
          <span>👥 {gym.countMembers}</span>
          <span>🧗 {gym.countRoutes} Routen</span>
        </div>
      </div>

      {!isMember ? (
        <button style={styles.btnJoin} onClick={(e) => onJoin(e, gym.id)}>
          Join
        </button>
      ) : (
        <span style={{ color: '#00c851', fontSize: '1.2rem' }}>✓</span>
      )}
    </Link>
  );
}

export default Hallen;