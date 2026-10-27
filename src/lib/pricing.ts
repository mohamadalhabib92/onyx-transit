/** Estimation de prix 100 % locale (aucune API payante). Tarifs indicatifs de démonstration. */
export type CategoryId = 'business' | 'first' | 'van';
export type Category = { id: CategoryId; name: string; desc: string; seats: number; bags: number; base: number; perKm: number; perMin: number; min: number; icon: 'car-sport' | 'diamond' | 'bus' };

export const CATEGORIES: Category[] = [
  { id: 'business', name: 'Business', desc: 'Berline premium, chauffeur en tenue', seats: 3, bags: 2, base: 12, perKm: 3.6, perMin: 0.9, min: 35, icon: 'car-sport' },
  { id: 'first', name: 'First', desc: 'Berline haut de gamme, eau & Wi-Fi', seats: 3, bags: 2, base: 18, perKm: 4.8, perMin: 1.2, min: 55, icon: 'diamond' },
  { id: 'van', name: 'Van VIP', desc: 'Jusqu’à 6 passagers, bagages', seats: 6, bags: 6, base: 15, perKm: 4.2, perMin: 1.0, min: 45, icon: 'bus' },
];

export type LatLon = { lat: number; lon: number };

export function haversineKm(a: LatLon, b: LatLon): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Distance routière ≈ vol d’oiseau × 1,3 ; vitesse urbaine moyenne 30 km/h. */
export function estimate(a: LatLon, b: LatLon, cat: Category) {
  const km = Math.max(0.8, haversineKm(a, b) * 1.3);
  const min = Math.max(4, Math.round((km / 30) * 60));
  const raw = cat.base + km * cat.perKm + min * cat.perMin;
  const price = Math.max(cat.min, Math.round(raw * 2) / 2);
  return { km: Math.round(km * 10) / 10, min, price, low: Math.round(price * 0.92), high: Math.round(price * 1.12) };
}
