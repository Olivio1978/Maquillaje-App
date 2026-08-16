const currencyFormatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

export function fmtMoney(n) {
  return currencyFormatter.format(n ?? 0)
}

export function initials(name) {
  return (name ?? '')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function pad(n) {
  return String(n).padStart(2, '0')
}

export function todayDateString() {
  const date = new Date()
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function toDatetimeLocal(isoString) {
  if (!isoString) return ''
  const date = new Date(isoString)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function toLocalDateString(isoString) {
  const date = new Date(isoString)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function fmtDateLong(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const s = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(d)
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function fmtDateShort(dateStr) {
  if (!dateStr) return 'Sin visitas'
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(new Date(dateStr + 'T00:00:00'))
}

export function fmtDateTime(isoString) {
  return new Date(isoString).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
}

export function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return isoDate(d)
}

export function isoDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function mondayOf(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

export const WEEKDAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export function whatsappLink(telefono, mensaje) {
  const digits = (telefono ?? '').replace(/[^\d]/g, '')
  const params = new URLSearchParams({ text: mensaje })
  return `https://wa.me/${digits}?${params.toString()}`
}
