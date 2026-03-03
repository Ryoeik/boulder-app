import { levelBerechnen, levelAnzeige } from '../utils/xpSystem'

function LevelAnzeige({ xp, titel = 'Climber Level', kompakt = false }) {
  const { level, xpImLevel, xpGesamt } = levelBerechnen(xp)
  const { farbe, name } = levelAnzeige(level)

  const icon = level >= 10 ? '🏆' : level >= 7 ? '💎' : level >= 4 ? '⭐' : '🌱'
  const fortschritt = level >= 10 ? 100 : xpImLevel

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
    <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem' }}>

      {/* Titel-Zeile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '1rem' }}>{icon}</span>
        <span style={{ fontSize: '0.8rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {titel}
        </span>
      </div>

      {/* Level + Badge + XP rechts */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: farbe, lineHeight: 1 }}>
            {level}
          </span>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#555', lineHeight: 1 }}>Level</div>
            <div style={{
              marginTop: '2px',
              display: 'inline-block',
              background: `${farbe}18`, border: `1px solid ${farbe}55`,
              color: farbe, padding: '0.05rem 0.45rem',
              borderRadius: '20px', fontSize: '0.7rem', fontWeight: '600'
            }}>{name}</div>
          </div>
        </div>
        <span style={{ fontSize: '0.75rem', color: '#444', fontVariantNumeric: 'tabular-nums' }}>
          {level >= 10 ? `${xpGesamt} XP` : `${xpImLevel} / 100 XP`}
        </span>
      </div>

      {/* XP Balken */}
      <div style={{ background: '#1a1a1a', borderRadius: '6px', height: '6px', overflow: 'hidden', position: 'relative' }}>
        <div style={{
          height: '100%',
          width: `${fortschritt}%`,
          background: `linear-gradient(to right, #ff6b00cc, #ff6b00)`,
          borderRadius: '6px',
          transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: `0 0 8px #ff6b0055`
        }} />
      </div>

    </div>
  )
}

export default LevelAnzeige