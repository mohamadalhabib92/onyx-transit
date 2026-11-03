import { isConfigured } from './config';

/**
 * Journal de crash local. Sentry n’est contacté que si EXPO_PUBLIC_SENTRY_DSN
 * est une URL Sentry réelle. Placeholder YOUR_SENTRY_DSN = désactivé.
 * Aucun appel réseau au chargement du module.
 */
const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? 'YOUR_SENTRY_DSN';

export type CrashEntry = { at: number; message: string; context?: string };
const log: CrashEntry[] = [];

export function sentryEnabled(): boolean {
  return isConfigured(DSN) && sentryEnvelopeUrl(DSN) != null;
}

export function sentryEnvelopeUrl(dsn: string): string | null {
  try {
    const u = new URL(dsn);
    const key = u.username;
    const project = u.pathname.replace(/\//g, '');
    if (!key || !project || !u.hostname.toLowerCase().includes('sentry')) return null;
    return `${u.protocol}//${u.host}/api/${project}/envelope/?sentry_key=${encodeURIComponent(key)}`;
  } catch {
    return null;
  }
}

export function getCrashLog(): readonly CrashEntry[] {
  return log;
}

export function reportCrash(error: unknown, context?: string): void {
  const message = error instanceof Error ? error.message : String(error);
  const entry: CrashEntry = { at: Date.now(), message, context };
  log.push(entry);
  if (log.length > 30) log.shift();
  console.error('[Onyx]', message, context ?? '');
  const url = sentryEnabled() ? sentryEnvelopeUrl(DSN) : null;
  if (!url || typeof fetch !== 'function') return;
  const eventId = 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const n = (Math.random() * 16) | 0;
    return (c === 'x' ? n : (n & 0x3) | 0x8).toString(16);
  });
  const body = [
    JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString(), dsn: DSN }),
    JSON.stringify({ type: 'event' }),
    JSON.stringify({
      event_id: eventId,
      level: 'error',
      platform: 'javascript',
      message: { formatted: message },
      extra: context ? { context } : undefined,
      timestamp: entry.at / 1000,
    }),
  ].join('\n');
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-sentry-envelope' },
    body,
  }).catch(() => {
    /* réseau indisponible : le journal local suffit */
  });
}
