const common = { width: 19, height: 19, viewBox: '0 0 20 20' }

export function IconAgenda() {
  return (
    <svg {...common}>
      <rect x="2.5" y="3.5" width="15" height="14" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <line x1="2.5" y1="8" x2="17.5" y2="8" stroke="currentColor" strokeWidth="1.5" />
      <line x1="6.5" y1="1.5" x2="6.5" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="13.5" y1="1.5" x2="13.5" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function IconClientas() {
  return (
    <svg {...common}>
      <circle cx="10" cy="7" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.5 17c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function IconServicios() {
  return (
    <svg {...common}>
      <path d="M11 2.5l6.5 6.5-8 8-6.5-6.5V4.5a2 2 0 012-2H11z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="7" cy="6.5" r="1.1" fill="currentColor" />
    </svg>
  )
}

export function IconFinanzas() {
  return (
    <svg {...common}>
      <rect x="2.5" y="10" width="3.6" height="7.5" rx="1" fill="currentColor" />
      <rect x="8.2" y="5.5" width="3.6" height="12" rx="1" fill="currentColor" />
      <rect x="13.9" y="2.5" width="3.6" height="15" rx="1" fill="currentColor" />
    </svg>
  )
}

export function IconCompras() {
  return (
    <svg {...common}>
      <path d="M5 6.5V5a5 5 0 0110 0v1.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="3" y="6.5" width="14" height="11" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function IconGaleria() {
  return (
    <svg {...common}>
      <rect x="2.5" y="3.5" width="15" height="13" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="7" cy="8" r="1.4" fill="currentColor" />
      <path d="M3.5 15l4-4 3 3 3.5-4.5 4.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

export function IconReservar() {
  return (
    <svg {...common}>
      <rect x="2.5" y="3.5" width="15" height="14" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <line x1="2.5" y1="8" x2="17.5" y2="8" stroke="currentColor" strokeWidth="1.5" />
      <line x1="10" y1="11" x2="10" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="8" y1="13" x2="12" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function IconMisCitas() {
  return (
    <svg {...common}>
      <circle cx="10" cy="10" r="7.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.5 10.2l2.3 2.3 4.7-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
