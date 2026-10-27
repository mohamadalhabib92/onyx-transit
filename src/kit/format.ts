// Formatage FR sans dépendre d'Intl (compatibilité Hermes / web).
const NBSP = '\u202F';

export function fmtNumber(n: number, decimals = 0): string {
  const neg = n < 0;
  const fixed = Math.abs(n).toFixed(decimals);
  const [int, dec] = fixed.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return (neg ? '−' : '') + grouped + (dec ? ',' + dec : '');
}

export function fmtMoney(n: number, currency = 'EUR', decimals = 2): string {
  const sym = currency === 'EUR' ? '€' : currency;
  return `${fmtNumber(n, decimals)}${NBSP}${sym}`;
}

export function fmtCompactEUR(n: number): string {
  if (Math.abs(n) >= 1e6) return `${fmtNumber(n / 1e6, 2)}${NBSP}M€`;
  if (Math.abs(n) >= 1e3) return `${fmtNumber(n / 1e3, 1)}${NBSP}k€`;
  return fmtMoney(n);
}

export const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const MONTHS_FR_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
export const DAYS_FR = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
export const DAYS_FR_SHORT = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

const p2 = (n: number) => String(n).padStart(2, '0');

export function fmtDate(d: Date | number | string, withYear = true): string {
  const x = new Date(d);
  return `${x.getDate()} ${MONTHS_FR[x.getMonth()]}${withYear ? ' ' + x.getFullYear() : ''}`;
}
export function fmtTime(d: Date | number | string): string {
  const x = new Date(d);
  return `${p2(x.getHours())}:${p2(x.getMinutes())}`;
}
export function fmtDateTime(d: Date | number | string): string {
  return `${fmtDate(d)} · ${fmtTime(d)}`;
}
export function isoDay(d: Date): string {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}
