export const GRADE = ['?', '4A', '4B', '4C', '5A', '5B', '5C', '6A', '6A+', '6B', '6B+', '6C', '6C+', '7A', '7A+', '7B', '7B+', '7C', '7C+', '8A']

// Berechnet den gewichteten Durchschnittsgrad:
// - Setter-Grad zählt als 0.5 Stimmen (grobe Einschätzung)
// - Jede Kletterer-Bewertung zählt als 1.0 Stimme
export function berechneKommunityGrad(grades, setterGrade) {
  const gueltig = grades.filter(g => g && GRADE.includes(g) && g !== '?')
  if (gueltig.length === 0 && !setterGrade) return null

  let summe = 0
  let gewicht = 0

  if (setterGrade && GRADE.includes(setterGrade) && setterGrade !== '?') {
    summe   += GRADE.indexOf(setterGrade) * 0.5
    gewicht += 0.5
  }

  gueltig.forEach(g => {
    summe   += GRADE.indexOf(g)
    gewicht += 1
  })

  if (gewicht === 0) return null
  return GRADE[Math.round(summe / gewicht)] || null
}