import React from 'react';
import { SendspinPlayer } from '@sendspin/sendspin-js';
import {
  registerBrowserZone,
  unregisterBrowserZone,
  type BrowserZoneRegistration,
} from '../services/browserZoneApi';

const STORAGE_KEY = 'lox.player.localZone';
const SERIAL_KEY = 'lox.player.localSerial';

function readStored(): BrowserZoneRegistration | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BrowserZoneRegistration) : null;
  } catch {
    return null;
  }
}

function writeStored(zone: BrowserZoneRegistration | null): void {
  if (typeof window === 'undefined') return;
  if (zone) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(zone));
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

function getOrCreateSerial(): string {
  if (typeof window === 'undefined') return 'browser-local';
  const existing = window.localStorage.getItem(SERIAL_KEY);
  if (existing) return existing;
  const fresh = `browser-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(SERIAL_KEY, fresh);
  return fresh;
}

function defaultZoneName(): string {
  if (typeof navigator === 'undefined') return 'Browser';
  const ua = navigator.userAgent ?? '';
  if (/iPhone|iPad/i.test(ua)) return 'Browser · iOS';
  if (/Android/i.test(ua)) return 'Browser · Android';
  if (/Macintosh|Mac OS/i.test(ua)) return 'Browser · Mac';
  if (/Windows/i.test(ua)) return 'Browser · Windows';
  if (/Linux/i.test(ua)) return 'Browser · Linux';
  return 'Browser';
}

function buildSendspinBaseUrl(): string {
  if (typeof window === 'undefined') return 'http://127.0.0.1:7090';
  return `${window.location.protocol}//${window.location.host}`;
}

export type BrowserZoneHook = {
  registration: BrowserZoneRegistration | null;
  error: string | null;
};

/**
 * Auto-registers the browser as an ephemeral audioserver zone on first mount
 * and connects to the audioserver's Sendspin endpoint so audio chunks routed
 * to our `clientId` (sticky serial) are played in this tab.
 */
export function useBrowserZone(enabled: boolean): BrowserZoneHook {
  // Optimistically restore last-known registration so the UI doesn't flash an
  // empty switcher on reload. The server is the source of truth — the effect
  // below re-registers idempotently and writes the authoritative value back.
  const [registration, setRegistration] = React.useState<BrowserZoneRegistration | null>(readStored);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void (async () => {
      try {
        const result = await registerBrowserZone({
          name: defaultZoneName(),
          serial: getOrCreateSerial(),
        });
        if (cancelled) return;
        setRegistration(result);
        writeStored(result);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to register browser zone');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  React.useEffect(() => {
    if (!registration) return undefined;
    const player = new SendspinPlayer({
      playerId: getOrCreateSerial(),
      baseUrl: buildSendspinBaseUrl(),
      clientName: defaultZoneName(),
      // PCM only — Opus decode in the browser is ~250KB of WASM and causes
      // audible stutter under load. PCM goes straight to the AudioContext.
      codecs: ['pcm'],
    });
    player.connect().catch((err) => {
      setError(err instanceof Error ? err.message : 'Sendspin connect failed');
    });
    return () => {
      try {
        player.disconnect('user_request');
      } catch {
        /* ignore */
      }
    };
  }, [registration]);

  // Best-effort cleanup on tab close so the server-side slot is freed; the
  // server also garbage-collects stale browser zones on shutdown.
  React.useEffect(() => {
    if (!registration) return undefined;
    const handler = (): void => {
      void unregisterBrowserZone(registration.zoneId);
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [registration]);

  return { registration, error };
}
