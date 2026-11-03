/** Avis indépendant du store : une course saisie pendant le chargement a été abandonnée. */
export type LostRide = { id: string; label: string };

let lostRides: LostRide[] = [];
const listeners = new Set<() => void>();

export function publishLostRides(next: LostRide[]) {
  lostRides = next;
  listeners.forEach((l) => l());
}

export function subscribeLostRides(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getLostRides(): LostRide[] {
  return lostRides;
}

export function dismissLostRides() {
  lostRides = [];
  listeners.forEach((l) => l());
}
