/**
 * Règles pures de la Passe 1 (prix plafond, documents, dispatch, contraste).
 * Aucune valeur légale inventée : les seuils OTR 2 absents restent « à valider ».
 */

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

/** Rapport WCAG (1 = identique). */
export function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

export function meetsAA(foreground: string, background: string, large = false): boolean {
  return contrastRatio(foreground, background) >= (large ? 3 : 4.5);
}

export type DocReason = 'missing' | 'pending' | 'expired' | 'expiring';
export type DocIssue = { id: string; label: string; reason: DocReason; days?: number };
export type DocDef = { id: string; label: string; required: boolean };

const VALIDATED = new Set(['validated_demo']);

/** AAAA-MM-JJ valide, interprétée en date locale. */
export function parseIsoDate(raw: string): string | null {
  const s = raw.trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return s;
}

export function daysUntil(iso: string, today: Date): number | null {
  const parsed = parseIsoDate(iso);
  if (!parsed) return null;
  const [y, mo, d] = parsed.split('-').map(Number);
  const target = new Date(y, mo - 1, d);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}

export function assessDocs(
  defs: DocDef[],
  docs: Record<string, string | undefined>,
  expiry: Record<string, string | null | undefined>,
  today: Date,
): { blockers: DocIssue[]; warnings: DocIssue[] } {
  const blockers: DocIssue[] = [];
  const warnings: DocIssue[] = [];
  for (const def of defs) {
    const status = docs[def.id] ?? 'missing';
    const exp = expiry[def.id];
    if (def.required && !VALIDATED.has(status)) {
      blockers.push({ id: def.id, label: def.label, reason: status === 'uploaded_placeholder' ? 'pending' : 'missing' });
      continue;
    }
    if (!exp) continue;
    const days = daysUntil(exp, today);
    if (days == null) continue;
    if (days < 0) {
      if (def.required) blockers.push({ id: def.id, label: def.label, reason: 'expired', days });
    } else if (days <= 30) {
      warnings.push({ id: def.id, label: def.label, reason: 'expiring', days });
    }
  }
  return { blockers, warnings };
}

/** YOUR_OTR2_LIMITS = minutes de conduite max, ou placeholder. Aucun seuil par défaut. */
export function parseOtrMaxMinutes(raw: string | undefined | null): number | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s || s.startsWith('YOUR_')) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function capToMaximum(maximum: number, requested: number): { value: number; capped: boolean } {
  if (!Number.isFinite(requested) || !Number.isFinite(maximum)) return { value: maximum, capped: false };
  if (requested > maximum) return { value: maximum, capped: true };
  return { value: requested, capped: false };
}

export type AssignInput = {
  docBlockers: DocIssue[];
  vehicleCategory: string | null;
  rideCategory: string;
  vehicleSeats: number | null;
  neededSeats: number;
  online: boolean;
  busy: boolean;
  otrMaxMinutes: number | null;
  drivingMinutes: number;
};

export function canAssign(input: AssignInput): { ok: boolean; reasons: string[]; notes: string[] } {
  const reasons: string[] = [];
  const notes: string[] = [];
  if (input.docBlockers.length) {
    reasons.push(
      'Documents incomplets, non validés ou expirés : ' + input.docBlockers.map((b) => b.label).join(', '),
    );
  }
  if (!input.vehicleCategory) reasons.push('Catégorie du véhicule non renseignée');
  else if (input.vehicleCategory !== input.rideCategory) reasons.push('Véhicule d’une autre catégorie que la réservation');
  if (input.vehicleSeats == null || input.vehicleSeats < input.neededSeats) {
    reasons.push('Capacité du véhicule insuffisante ou non renseignée');
  }
  if (!input.online) reasons.push('Chauffeur indisponible (hors ligne)');
  if (input.busy) reasons.push('Chauffeur déjà en course');
  if (input.otrMaxMinutes == null) {
    notes.push('OTR 2 : seuils YOUR_OTR2_LIMITS non renseignés — à valider. Aucun seuil légal n’est appliqué.');
  } else if (input.drivingMinutes >= input.otrMaxMinutes) {
    reasons.push('Repos OTR 2 insuffisant au regard du seuil configuré (à valider)');
  }
  return { ok: reasons.length === 0, reasons, notes };
}
