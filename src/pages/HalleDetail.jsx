import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabase'
import TickButton from '../components/TickButton'

function HalleDetail() {
  const { gymId: id } = useParams()
  const [halle, setHalle] = useState(null)
  const [routen, setRouten] = useState([])
  const [sektionen, setSektionen] = useState([])
  const [laden, setLaden] = useState(true)
  const [nutzerRolle, setNutzerRolle] = useState(null)

  // Filter
  const [filterSektion, setFilterSektion] = useState('alle')
  const [filterGradVon, setFilterGradVon] = useState('')
  const [filterGradBis, setFilterGradBis] = useState('')
  const [filterSort, setFilterSort] = useState('neu')

  const grade = ['4A', '4B', '4C', '5A', '5B', '5C', '6A', '6A+', '6B', '6B+', '6C', '6C+', '7A', '7A+', '7B', '7B+', '7C', '7C+', '8A']

  useEffect(() => {
    async function datenLaden() {
      const { data: halleData } = await supabase
        .from('gyms').select('*').eq('id', id).single()
      setHalle(halleData)

      const { data: sektionenData } = await supabase
        .from('sections').select('*').eq('gym_id', id)
      setSektionen(sektionenData || [])

      const { data: routenData } = await supabase
        .from('routes').select('*').eq('gym_id', id).eq('is_active', true)
      setRouten(routenData || [])

      // Nutzer-Rolle prüfen
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data: mitglied } = await supabase
          .from('gym_members')
          .select('role')
          .eq('gym_id', id)
          .eq('user_id', session.user.id)
          .single()
        setNutzerRolle(mitglied?.role || null)
      }

      setLaden(false)
    }
    datenLaden()
  }, [id])

  const istAdmin = nutzerRolle === 'admin' || nutzerRolle === 'moderator'

  // Filtern & Sortieren
  const gefilterteRouten = routen
    .filter(r => {
      if (filterSektion !== 'alle' && r.section_id !== filterSektion) return false
      if (filterGradVon && grade.indexOf(r.setter_grade) < grade.indexOf(filterGradVon)) return false
      if (filterGradBis && grade.indexOf(r.setter_grade) > grade.indexOf(filterGradBis)) return false
      return true
    })
    .sort((a, b) => {
      if (filterSort === 'neu') return new Date(b.created_at) - new Date(a.created_at)
      if (filterSort === 'schwer') return grade.indexOf(b.setter_grade) - grade.indexOf(a.setter_grade)
      if (filterSort === 'leicht') return grade.indexOf(a.setter_grade) - grade.indexOf(b.setter_grade)
      return 0
    })

  if (laden) return <div className="container"><p>Lädt...</p></div>
  if (!halle) return <div className="container"><h1>Halle nicht gefunden</h1></div>

  return (
    <div className="container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
        <h1>{halle.name}</h1>
        {halle.is_certified && <span className="badge badge-green">✓ Zertifiziert</span>}
      </div>
      <p>📍 {halle.city}</p>

      {/* Admin Button */}
      {istAdmin && (
        <Link
          to={`/halle/${id}/sektionen`}
          className="btn btn-outline"
          style={{ marginTop: '1rem', display: 'inline-block' }}
        >
          Sektionen & Routen verwalten
        </Link>
      )}

      {/* Filterleiste */}
      <div style={{
        marginTop: '2rem', padding: '1rem',
        background: '#1a1a1a', borderRadius: '12px',
        border: '1px solid #2a2a2a',
        display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end'
      }}>
        {/* Sektion Filter */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.4rem', color: '#aaa', fontSize: '0.85rem' }}>Sektion</label>
          <select value={filterSektion} onChange={e => setFilterSektion(e.target.value)} style={selectStyle}>
            <option value="alle">Alle Sektionen</option>
            {sektionen.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Grad von */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.4rem', color: '#aaa', fontSize: '0.85rem' }}>Grad von</label>
          <select value={filterGradVon} onChange={e => setFilterGradVon(e.target.value)} style={selectStyle}>
            <option value="">Alle</option>
            {grade.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        {/* Grad bis */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.4rem', color: '#aaa', fontSize: '0.85rem' }}>Grad bis</label>
          <select value={filterGradBis} onChange={e => setFilterGradBis(e.target.value)} style={selectStyle}>
            <option value="">Alle</option>
            {grade.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        {/* Sortierung */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.4rem', color: '#aaa', fontSize: '0.85rem' }}>Sortierung</label>
          <select value={filterSort} onChange={e => setFilterSort(e.target.value)} style={selectStyle}>
            <option value="neu">Neueste zuerst</option>
            <option value="schwer">Schwerste zuerst</option>
            <option value="leicht">Leichteste zuerst</option>
          </select>
        </div>

        {/* Reset */}
        <button
          onClick={() => { setFilterSektion('alle'); setFilterGradVon(''); setFilterGradBis(''); setFilterSort('neu') }}
          style={{
            background: 'transparent', border: '1px solid #444',
            color: '#aaa', padding: '0.5rem 1rem',
            borderRadius: '8px', cursor: 'pointer'
          }}
        >
          Zurücksetzen
        </button>
      </div>

      {/* Routen */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1.5rem 0 1rem' }}>
        <h2 style={{ margin: 0 }}>Routen ({gefilterteRouten.length})</h2>
      </div>

      {gefilterteRouten.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ marginBottom: '0.5rem' }}>Keine Routen gefunden.</p>
          {istAdmin && (
            <Link to={`/halle/${id}/sektionen`} style={{ color: '#ff6b00' }}>
              Sektionen & Routen verwalten →
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '3rem' }}>
          {gefilterteRouten.map(route => {
            const sektion = sektionen.find(s => s.id === route.section_id)
            return (
              <div key={route.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '8px', height: '60px', borderRadius: '4px',
                  backgroundColor: route.color, flexShrink: 0
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '1.1rem' }}>{route.name}</strong>
                    <span style={{ color: '#ff6b00', fontWeight: 'bold' }}>{route.setter_grade}</span>
                  </div>
                  <div style={{ marginTop: '0.3rem' }}>
                    {sektion && <span style={{ fontSize: '0.8rem', color: '#666' }}>📍 {sektion.name}</span>}
                  </div>
                </div>
                <TickButton routeId={route.id} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const selectStyle = {
  padding: '0.5rem 0.75rem',
  borderRadius: '8px',
  border: '1px solid #2a2a2a',
  background: '#111',
  color: 'white',
  fontSize: '0.9rem',
  cursor: 'pointer'
}

export default HalleDetail