export const GRADE = ['?','4A','4B','4C','5A','5B','5C','6A','6A+','6B','6B+','6C','6C+','7A','7A+','7B','7B+','7C','7C+','8A']

// XP pro Route berechnen basierend auf Schwierigkeitsgrad
export function routeXP(grade) {
  const idx = GRADE.indexOf(grade)
  if (idx <= 0) return 1 // Unbekannt oder ?
  if (idx >= GRADE.indexOf('7B+')) return 1 + 3  // 7B+ und höher
  if (idx >= GRADE.indexOf('6B')) return 1 + 2   // 6B bis 7B
  if (idx >= GRADE.indexOf('4A')) return 1 + 1   // 4A bis 6A+
  return 1
}

// Climber XP berechnen (nur Ticks, hallenübergreifend)
export function climberXPBerechnen(ticks, routenMap) {
  let xp = 0
  ticks.forEach(tick => {
    const route = routenMap[tick.route_id]
    if (!route) return
    xp += routeXP(route.setter_grade)
  })
  return xp
}

// Hallen XP berechnen (Ticks + Kommentare + Videos)
export function hallenXPBerechnen(ticks, routenMap, kommentare = [], videos = []) {
  let xp = 0

  // Tick XP
  ticks.forEach(tick => {
    const route = routenMap[tick.route_id]
    if (!route) return
    xp += routeXP(route.setter_grade)
  })

  // Kommentar XP (max 2 pro Route)
  const kommentarProRoute = {}
  kommentare.forEach(k => {
    kommentarProRoute[k.route_id] = (kommentarProRoute[k.route_id] || 0) + 1
  })
  Object.values(kommentarProRoute).forEach(anzahl => {
    xp += Math.min(anzahl, 2)
  })

  // Video XP (max 10 pro Route)
  const videoProRoute = {}
  videos.forEach(v => {
    videoProRoute[v.route_id] = (videoProRoute[v.route_id] || 0) + 10
  })
  Object.values(videoProRoute).forEach(xpBetrag => {
    xp += Math.min(xpBetrag, 10)
  })

  return xp
}

// Level aus XP berechnen
export function levelBerechnen(xp) {
  const level = Math.min(10, Math.floor(xp / 100) + 1)
  const xpImLevel = level >= 10 ? 100 : xp % 100
  const xpFuerNaechstesLevel = 100
  return { level, xpImLevel, xpFuerNaechstesLevel, xpGesamt: xp }
}

// Level Anzeige Komponente Daten
export function levelAnzeige(level) {
  const farben = {
    1:  { farbe: '#888',    name: 'Anfänger' },
    2:  { farbe: '#66aa66', name: 'Einsteiger' },
    3:  { farbe: '#44bb88', name: 'Fortgeschritten' },
    4:  { farbe: '#33aacc', name: 'Erfahren' },
    5:  { farbe: '#2299dd', name: 'Könner' },
    6:  { farbe: '#5566ff', name: 'Experte' },
    7:  { farbe: '#8844ff', name: 'Meister' },
    8:  { farbe: '#cc33cc', name: 'Elite' },
    9:  { farbe: '#ff4488', name: 'Legende' },
    10: { farbe: '#ff6b00', name: 'Magnus Meatball' },
  }
  return farben[level] || farben[1]
}