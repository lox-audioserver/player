// Content normalisation helpers shared across the service browser. These exist
// because Loxone's getservicefolder responses don't reliably distinguish
// playable items from browseable containers, and individual providers (e.g.
// the Apple Music bridge) mix catalog and library entries under the same root.

import type { ContentFolder, ContentFolderItem, ContentServiceEntry } from './playersApi';

/**
 * Matches container URIs that can either be navigated into or played as a
 * whole — albums, playlists, artists, podcasts. Covers both catalog (`:album:`)
 * and library (`:library-album:`) variants used by the Apple Music bridge.
 */
const CONTAINER_URI_PATTERN = /(?:^|[:\-])(?:library-)?(album|playlist|artist|show):/i;

/**
 * Loxone's getservicefolder doesn't consistently set `type === 1` or
 * `items > 0` on albums/playlists/artists — they often look like leaves. We
 * detect their URI shape so the player can open them (and offer a Play-as-a-
 * whole action) instead of immediately playing them on click.
 */
export function isContainerItem(item: ContentFolderItem): boolean {
  if (item.type === 1) return true;
  if ((item.items ?? 0) > 0) return true;
  const path = item.audiopath ?? item.id ?? '';
  return CONTAINER_URI_PATTERN.test(path);
}

/**
 * Returns the audiopath to send when the user picks "play whole album/playlist",
 * or null when the item isn't actually a playable container.
 */
export function getContainerAudiopath(item: ContentFolderItem): string | null {
  const path = item.audiopath ?? item.id ?? '';
  return CONTAINER_URI_PATTERN.test(path) ? path : null;
}

/**
 * Apple Music bridge roots mix catalog folders ("New Releases", "Recommended
 * Playlists") with library ones using the same descriptive ids ("playlists",
 * "albums", "artists"). Relabel the library entries so users don't pick
 * "Playlists" and wonder why their catalog suggestions are missing.
 */
export function relabelServiceRoot(
  service: ContentServiceEntry,
  folder: ContentFolder | null,
): ContentFolder | null {
  if (!folder || !Array.isArray(folder.items) || folder.items.length === 0) {
    return folder;
  }
  const provider = service.provider?.toLowerCase();
  if (provider !== 'applemusic') return folder;
  const labels: Record<string, string> = {
    playlists: 'Library Playlists',
    albums: 'Library Albums',
    artists: 'Library Artists',
  };
  return {
    ...folder,
    items: folder.items.map((item) =>
      labels[item.id] ? { ...item, name: labels[item.id] } : item,
    ),
  };
}
