// Client for the admin-api endpoints that allocate ephemeral "browser" zones
// on the audioserver. Each call to `registerBrowserZone` claims one zoneId in
// the 9000-9999 range; on tab close (or explicit detach) we call
// `unregisterBrowserZone` so the server tears it down.

import { emitAuthReset } from './auth';

export type BrowserZoneRegistration = {
  zoneId: number;
  name: string;
};

const API_BASE = '/admin/api';

function handleAuthFailure(status: number): void {
  if (status === 401) emitAuthReset();
}

export async function registerBrowserZone(input: {
  name?: string;
  serial?: string;
}): Promise<BrowserZoneRegistration> {
  const res = await fetch(`${API_BASE}/zones/browser`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    handleAuthFailure(res.status);
    const text = await res.text().catch(() => '');
    throw new Error(`register-browser-zone failed (${res.status}): ${text}`);
  }
  return (await res.json()) as BrowserZoneRegistration;
}

export async function unregisterBrowserZone(zoneId: number): Promise<void> {
  // `keepalive: true` lets the request survive a tab/page unload — important
  // for the unmount/beforeunload cleanup path.
  const res = await fetch(`${API_BASE}/zones/browser/${zoneId}`, {
    method: 'DELETE',
    credentials: 'include',
    keepalive: true,
  });
  if (!res.ok && res.status !== 404) {
    handleAuthFailure(res.status);
    throw new Error(`unregister-browser-zone failed (${res.status})`);
  }
}
