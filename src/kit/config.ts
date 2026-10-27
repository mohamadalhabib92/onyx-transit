/**
 * Configuration publique (EXPO_PUBLIC_*). Les valeurs par défaut sont des
 * placeholders YOUR_* : aucune vraie clé n'est jamais embarquée dans le code.
 * Les secrets serveur (Stripe secret, OpenAI, Twilio auth token…) ne doivent
 * JAMAIS être exposés via EXPO_PUBLIC_*.
 */
export function isConfigured(value: string | undefined | null): boolean {
  return !!value && value.trim() !== '' && !value.startsWith('YOUR_');
}

export type ConfigEntry = { name: string; value: string; secret?: boolean; phase?: string; note?: string };

export function maskValue(e: ConfigEntry): string {
  if (!isConfigured(e.value)) return e.value || '(vide)';
  if (e.secret) return '••••••••';
  return e.value.length > 32 ? e.value.slice(0, 29) + '…' : e.value;
}
