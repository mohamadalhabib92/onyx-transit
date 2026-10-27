/**
 * Lieux publics de Genève (coordonnées approximatives, domaine public / OpenStreetMap-like).
 * Servent de raccourcis de saisie ; aucune donnée commerciale.
 */
export type Place = { id: string; name: string; sub: string; lat: number; lon: number };

export const GENEVA_PLACES: Place[] = [
  { id: 'gva', name: 'Aéroport de Genève (GVA)', sub: 'Route de l’Aéroport, Le Grand-Saconnex', lat: 46.2381, lon: 6.1090 },
  { id: 'cornavin', name: 'Gare de Cornavin', sub: 'Place de Cornavin, 1201 Genève', lat: 46.2102, lon: 6.1424 },
  { id: 'nations', name: 'Palais des Nations', sub: 'Avenue de la Paix, 1211 Genève', lat: 46.2266, lon: 6.1405 },
  { id: 'jetdeau', name: 'Jet d’eau / Quai Gustave-Ador', sub: 'Eaux-Vives', lat: 46.2073, lon: 6.1559 },
  { id: 'plainpalais', name: 'Plainpalais', sub: 'Plaine de Plainpalais', lat: 46.1984, lon: 6.1421 },
  { id: 'carouge', name: 'Carouge — Place du Marché', sub: '1227 Carouge', lat: 46.1846, lon: 6.1396 },
  { id: 'palexpo', name: 'Palexpo', sub: 'Route François-Peyrot, Le Grand-Saconnex', lat: 46.2346, lon: 6.1175 },
  { id: 'cern', name: 'CERN — Globe', sub: 'Esplanade des Particules, Meyrin', lat: 46.2338, lon: 6.0557 },
  { id: 'bourgdefour', name: 'Vieille-Ville — Bourg-de-Four', sub: '1204 Genève', lat: 46.2005, lon: 6.1496 },
  { id: 'hug', name: 'Hôpitaux universitaires (HUG)', sub: 'Rue Gabrielle-Perret-Gentil', lat: 46.1934, lon: 6.1490 },
  { id: 'coligny', name: 'Cologny — Quai', sub: 'Rive gauche, 1223 Cologny', lat: 46.2170, lon: 6.1820 },
  { id: 'versoix', name: 'Versoix — Gare', sub: '1290 Versoix', lat: 46.2836, lon: 6.1621 },
];

export type City = { id: 'geneve' | 'paris' | 'casablanca'; name: string; country: string; currency: string; center: { lat: number; lon: number } };
export const CITIES: City[] = [
  { id: 'geneve', name: 'Genève', country: 'Suisse', currency: 'CHF', center: { lat: 46.2044, lon: 6.1432 } },
  { id: 'paris', name: 'Paris', country: 'France', currency: 'EUR', center: { lat: 48.8566, lon: 2.3522 } },
  { id: 'casablanca', name: 'Casablanca', country: 'Maroc', currency: 'MAD', center: { lat: 33.5731, lon: -7.5898 } },
];
