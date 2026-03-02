import { levelBerechnen, levelAnzeige } from '../utils/xpSystem'

function LevelAnzeige({ xp, titel = 'Climber Level', kompakt = false }) {
  const { level, xpImLevel, xpGesamt } = levelBerechnen(xp)
  const { farbe, name } = levelAnzeige(level)

  if (kompakt) {
    return (
      <span style={{
        background: `${farbe}22`, border: `1px solid ${farbe}`,
        color: farbe, padding: '0.2rem 0.6rem',
        borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold'
      }}>
        Lvl {level} · {name}
      </span>
    )
  }

  return (
    <div className="card" style={{ marginBottom: '1.25rem', padding: '0.85rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '1.1rem' }}>
            {level >= 10 ? '🏆' : level >= 7 ? '💎' : level >= 4 ? '⭐' : '🌱'}
          </span>
          <span style={{ fontSize: '0.85rem', color: '#aaa' }}>{titel}</span>
          <span style={{ fontSize: '1rem', fontWeight: 'bold', color: farbe }}>Level {level}</span>
          <span style={{
            background: `${farbe}22`, border: `1px solid ${farbe}`,
            color: farbe, padding: '0.1rem 0.45rem',
            borderRadius: '20px', fontSize: '0.7rem'
          }}>{name}</span>
        </div>
        <span style={{ fontSize: '0.75rem', color: '#555' }}>
          {level >= 10 ? `${xpGesamt} XP` : `${xpImLevel}/100 XP`}
        </span>
      </div>

      {/* XP Balken – dünn */}
      <div style={{ background: '#1a1a1a', borderRadius: '4px', height: '5px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: level >= 10 ? '100%' : `${xpImLevel}%`,
          background: `linear-gradient(to right, ${farbe}, ${farbe}88)`,
          borderRadius: '4px', transition: 'width 0.5s'
        }} />
      </div>
    </div>
  )
}

export default LevelAnzeige