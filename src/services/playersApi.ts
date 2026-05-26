// Standard Loxone transport routes exposed on the main HTTP port. We hit them
// directly instead of going through `/admin/api/...` so we share the exact
// command surface the Loxone webclient uses (audio/<zoneId>/<command>).

async function sendCommand(zoneId: number, command: string, value?: string | number): Promise<void> {
  const segments = [`audio`, String(zoneId), command];
  if (value !== undefined && value !== null && value !== '') {
    segments.push(String(value));
  }
  const url = `/${segments.join('/')}`;
  const res = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`Transport command failed (${res.status}): ${command}`);
  }
}

export function play(zoneId: number): Promise<void> {
  return sendCommand(zoneId, 'play');
}

export function pause(zoneId: number): Promise<void> {
  return sendCommand(zoneId, 'pause');
}

export function resume(zoneId: number): Promise<void> {
  return sendCommand(zoneId, 'resume');
}

export function stop(zoneId: number): Promise<void> {
  return sendCommand(zoneId, 'on');
}

export function powerOff(zoneId: number): Promise<void> {
  return sendCommand(zoneId, 'off');
}

export function next(zoneId: number): Promise<void> {
  return sendCommand(zoneId, 'queueplus');
}

export function previous(zoneId: number): Promise<void> {
  return sendCommand(zoneId, 'queueminus');
}

export function setVolume(zoneId: number, volume: number): Promise<void> {
  const clamped = Math.max(0, Math.min(100, Math.round(volume)));
  return sendCommand(zoneId, 'volume', clamped);
}

export function seek(zoneId: number, seconds: number): Promise<void> {
  const safe = Math.max(0, Math.round(seconds));
  return sendCommand(zoneId, 'position', safe);
}

export function shuffle(zoneId: number, enabled: boolean): Promise<void> {
  return sendCommand(zoneId, 'shuffle', enabled ? 'on' : 'off');
}

type RepeatMode = 'off' | 'all' | 'one';

export function setRepeat(zoneId: number, mode: RepeatMode): Promise<void> {
  return sendCommand(zoneId, 'repeat', mode);
}

export type QueueItem = {
  album: string;
  artist: string;
  audiopath: string;
  audiotype: number;
  coverurl: string;
  duration: number;
  qindex: number;
  station: string;
  title: string;
  unique_id: string;
  user: string;
};

export type QueueResponse = {
  id: number;
  items: QueueItem[];
  shuffle: boolean;
  start: number;
  totalitems: number;
};

async function fetchLoxone<T>(url: string, resultKey: string): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    throw new Error(`Loxone request failed (${res.status}): ${url}`);
  }
  const text = await res.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`Loxone response was not valid JSON: ${url}`);
  }
  const envelope = (payload as Record<string, unknown> | null) ?? {};
  return envelope[`${resultKey}_result`] as T;
}

export async function fetchQueue(
  zoneId: number,
  start = 0,
  count = 200,
): Promise<QueueResponse> {
  const result = await fetchLoxone<unknown>(`/audio/${zoneId}/getqueue/${start}/${count}`, 'getqueue');
  const first = Array.isArray(result) ? result[0] : null;
  if (!first || typeof first !== 'object') {
    return { id: zoneId, items: [], shuffle: false, start: 0, totalitems: 0 };
  }
  const entry = first as Partial<QueueResponse>;
  return {
    id: typeof entry.id === 'number' ? entry.id : zoneId,
    items: Array.isArray(entry.items) ? (entry.items as QueueItem[]) : [],
    shuffle: Boolean(entry.shuffle),
    start: typeof entry.start === 'number' ? entry.start : 0,
    totalitems: typeof entry.totalitems === 'number' ? entry.totalitems : 0,
  };
}

// ---------------------------------------------------------------------------
// Content browsing — radios, services, library, favorites
// ---------------------------------------------------------------------------

export type RadioMenuEntry = {
  cmd: string;
  name: string;
  icon: string;
  root: string;
  description?: string;
  editable?: boolean;
};

// getservices returns a flat list of accounts/bridges. There is no nesting —
// each entry maps to one playable identity (e.g. "Spotify · rudy", "Apple
// Music bridge").
export type ContentServiceEntry = {
  cmd: string;
  /** Optional service display name. Empty for bridges. */
  name: string;
  icon: string;
  /** Unique id used in serviceplay URLs (account id or bridge id). */
  id: string;
  /** Friendly user/account label shown in lists. */
  user: string;
  email?: string;
  product?: string;
  /** Provider kind: spotify | applemusic | ytmusic | youtube | deezer | tidal | musicassistant. */
  provider: string;
  fake?: boolean;
};

export type ContentFolderItem = {
  id: string;
  name: string;
  type: number;
  audiopath?: string;
  coverurl?: string;
  thumbnail?: string;
  items?: number;
  artist?: string;
  album?: string;
  duration?: number;
  station?: string;
};

export type ContentFolder = {
  id: string;
  name: string;
  items: ContentFolderItem[];
  totalitems: number;
  start: number;
  service?: string;
};

export async function fetchRadios(): Promise<RadioMenuEntry[]> {
  const result = await fetchLoxone<RadioMenuEntry[]>(`/audio/cfg/getradios`, 'getradios');
  return Array.isArray(result) ? result : [];
}

export async function fetchServices(): Promise<ContentServiceEntry[]> {
  const result = await fetchLoxone<ContentServiceEntry[]>(`/audio/cfg/getservices`, 'getservices');
  return Array.isArray(result) ? result : [];
}

export async function fetchMediaFolder(
  folderId: string,
  start = 0,
  limit = 100,
): Promise<ContentFolder | null> {
  const encoded = encodeURIComponent(folderId);
  const result = await fetchLoxone<unknown>(
    `/audio/cfg/getmediafolder/${encoded}/${start}/${limit}`,
    'getmediafolder',
  );
  const first = Array.isArray(result) ? result[0] : null;
  return (first as ContentFolder) ?? null;
}

export async function fetchServiceFolder(
  service: string,
  user: string,
  folderId: string,
  start = 0,
  limit = 100,
): Promise<ContentFolder | null> {
  // service folder ids can contain '/' (e.g. nested TuneIn paths). The server
  // joins parts.slice(5, -2), so we send the raw id but URL-encode the segments.
  const encodedService = encodeURIComponent(service);
  const encodedUser = encodeURIComponent(user || 'nouser');
  const encodedFolder = folderId
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
  // Service bridges (notably Apple Music) silently return an empty page when
  // limit > 100, because the upstream API caps page size there. The Loxone
  // client never asks for more, so we mirror that ceiling here.
  const safeLimit = Math.min(Math.max(1, limit), 100);
  const result = await fetchLoxone<unknown>(
    `/audio/cfg/getservicefolder/${encodedService}/${encodedUser}/${encodedFolder}/${start}/${safeLimit}`,
    'getservicefolder',
  );
  const first = Array.isArray(result) ? result[0] : null;
  return (first as ContentFolder) ?? null;
}

// ---------------------------------------------------------------------------
// Play actions
// ---------------------------------------------------------------------------

export async function playLibraryItem(zoneId: number, audiopath: string): Promise<void> {
  const encoded = encodeURIComponent(audiopath);
  const res = await fetch(`/audio/${zoneId}/library/play/${encoded}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`library play failed (${res.status})`);
}

export async function playServiceItem(
  zoneId: number,
  service: string,
  user: string,
  audiopath: string,
): Promise<void> {
  const encodedService = encodeURIComponent(service);
  const encodedUser = encodeURIComponent(user || 'nouser');
  const encodedPath = encodeURIComponent(audiopath);
  const res = await fetch(
    `/audio/${zoneId}/serviceplay/${encodedService}/${encodedUser}/${encodedPath}`,
    { credentials: 'include' },
  );
  if (!res.ok) throw new Error(`service play failed (${res.status})`);
}

export async function playUrl(zoneId: number, url: string): Promise<void> {
  const encoded = encodeURIComponent(url);
  const res = await fetch(`/audio/${zoneId}/playurl/${encoded}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`url play failed (${res.status})`);
}

export async function playPlaylist(zoneId: number, audiopath: string): Promise<void> {
  const encoded = encodeURIComponent(audiopath);
  const res = await fetch(`/audio/${zoneId}/playlist/play/${encoded}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`playlist play failed (${res.status})`);
}

// ---------------------------------------------------------------------------
// Room favorites — per-zone presets
// ---------------------------------------------------------------------------

export type RoomFavorite = {
  id: number;
  slot: number;
  name: string;
  audiopath: string;
  type: number | string;
  coverurl?: string;
  title?: string;
  artist?: string;
  album?: string;
};

export type RoomFavoritesResponse = {
  id: number;
  totalitems: number;
  start: number;
  items: RoomFavorite[];
};

export async function fetchRoomFavorites(
  zoneId: number,
  start = 0,
  limit = 50,
): Promise<RoomFavoritesResponse> {
  const result = await fetchLoxone<unknown>(
    `/audio/cfg/getroomfavs/${zoneId}/${start}/${limit}`,
    'getroomfavs',
  );
  const first = Array.isArray(result) ? result[0] : null;
  if (!first || typeof first !== 'object') {
    return { id: zoneId, totalitems: 0, start: 0, items: [] };
  }
  const entry = first as Partial<RoomFavoritesResponse>;
  return {
    id: typeof entry.id === 'number' ? entry.id : zoneId,
    totalitems: typeof entry.totalitems === 'number' ? entry.totalitems : 0,
    start: typeof entry.start === 'number' ? entry.start : 0,
    items: Array.isArray(entry.items) ? (entry.items as RoomFavorite[]) : [],
  };
}

export async function playRoomFavorite(zoneId: number, favoriteId: number): Promise<void> {
  const res = await fetch(`/audio/${zoneId}/roomfav/play/${favoriteId}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`favorite play failed (${res.status})`);
}

export async function playNextRoomFavorite(zoneId: number): Promise<void> {
  const res = await fetch(`/audio/${zoneId}/roomfav/plus`, { credentials: 'include' });
  if (!res.ok) throw new Error(`favorite-plus failed (${res.status})`);
}

// ---------------------------------------------------------------------------
// Dynamic grouping — mirrors the Loxone app's "link zones" behaviour
// ---------------------------------------------------------------------------

/**
 * Create or replace a dynamic group. The first id is the leader, the rest are
 * followers. Returns the server-assigned group id (externalId).
 */
export async function setGroup(zoneIds: number[]): Promise<string> {
  if (zoneIds.length < 2) {
    throw new Error('setGroup requires at least 2 zones');
  }
  const csv = zoneIds.join(',');
  const result = await fetchLoxone<{ id?: string } | null>(
    `/audio/cfg/dgroup/update/new/${csv}`,
    'dgroup_update',
  );
  return typeof result?.id === 'string' ? result.id : '';
}

/**
 * Dissolve a group identified by its leader zone. The audio_event payload
 * doesn't expose the server-assigned externalId, so we send a synthetic id
 * matching the `grp-<leaderId>-...` pattern. The server's dgroup handler
 * falls back to `getGroupByLeader(leaderId)` when the externalId isn't found,
 * which is exactly the path we hit here.
 */
export async function dissolveGroup(leaderId: number): Promise<void> {
  await fetchLoxone<unknown>(
    `/audio/cfg/dgroup/update/grp-${leaderId}-leaderlookup`,
    'dgroup_update',
  );
}

export function setMasterVolume(zoneId: number, volume: number): Promise<void> {
  const clamped = Math.max(0, Math.min(100, Math.round(volume)));
  return sendCommand(zoneId, 'mastervolume', clamped);
}
