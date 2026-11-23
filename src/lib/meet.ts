import { GENEVA_PLACES, type Place } from '@/data/places';

export type MeetKind = 'flight' | 'train';

export type MeetPoint = {
  kind: MeetKind;
  place: Place;
  refLabel: string;
  placeholder: string;
};

const KIND: Record<string, MeetKind> = { gva: 'flight', cornavin: 'train' };

/** GVA et Cornavin seulement, reconnus par le libellé exact du lieu public. */
export function meetFor(stop: { label: string } | null | undefined): MeetPoint | null {
  if (!stop?.label) return null;
  const place = GENEVA_PLACES.find((p) => p.name === stop.label && p.id in KIND);
  if (!place) return null;
  const kind = KIND[place.id];
  if (kind === 'flight') return { kind, place, refLabel: 'Numéro de vol', placeholder: 'LX 1234' };
  return { kind, place, refLabel: 'Numéro de train', placeholder: 'IC 712' };
}

/** Texte saisi, raccourci. Vide : rien à enregistrer. Aucun format de vol n’est imposé. */
export function cleanArrivalRef(raw: string): string | undefined {
  const text = raw.trim().replace(/\s+/g, ' ');
  if (!text) return undefined;
  return text.slice(0, 24);
}

/** Enregistré seulement si le départ est GVA ou Cornavin et que le texte n’est pas vide. */
export function arrivalRefForBooking(stop: { label: string } | null, raw: string): string | undefined {
  if (!meetFor(stop)) return undefined;
  return cleanArrivalRef(raw);
}
