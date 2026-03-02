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
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1rem', color: '#aaa' }}>{titel}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
            <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: farbe }}>Level {level}</span>
            <span style={{
              background: `${farbe}22`, border: `1px solid ${farbe}`,
              color: farbe, padding: '0.1rem 0.5rem',
              borderRadius: '20px', fontSize: '0.75rem'
            }}>{name}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.5rem' }}>
            {level >= 10 ? '🏆' : level >= 7 ? '💎' : level >= 4 ? '⭐' : '🌱'}
          </div>
        </div>
      </div>

      {/* XP Balken */}
      <div style={{ background: '#111', borderRadius: '8px', height: '10px', overflow: 'hidden', marginBottom: '0.4rem' }}>
        <div style={{
          height: '100%',
          width: level >= 10 ? '100%' : `${xpImLevel}%`,
          background: `linear-gradient(to right, ${farbe}, ${farbe}88)`,
          borderRadius: '8px', transition: 'width 0.5s'
        }} />
      </div>
      <p style={{ color: '#555', fontSize: '0.75rem', margin: 0 }}>
        {level >= 10
          ? `Max Level erreicht · ${xpGesamt} XP gesamt`
          : `${xpImLevel}/100 XP · ${xpGesamt} XP gesamt`}
      </p>
    </div>
  )
}

export default LevelAnzeige