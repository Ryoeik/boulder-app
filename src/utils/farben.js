export const FARBEN = [
  { name: 'Gelb',    hex: '#FFD700' },
  { name: 'Rot',     hex: '#FF4444' },
  { name: 'Blau',    hex: '#4488FF' },
  { name: 'Grün',    hex: '#44BB44' },
  { name: 'Schwarz', hex: '#222222' },
  { name: 'Weiß',    hex: '#EEEEEE' },
  { name: 'Orange',  hex: '#FF6B00' },
  { name: 'Lila',    hex: '#9944CC' },
  { name: 'Pink',    hex: '#FF44AA' },
  { name: 'Braun',   hex: '#8B4513' },
]

export function farbName(hex) {
  return FARBEN.find(f => f.hex.toLowerCase() === hex?.toLowerCase())?.name || hex
}