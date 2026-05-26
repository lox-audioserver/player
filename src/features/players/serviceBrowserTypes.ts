import type {
  ContentFolder,
  ContentServiceEntry,
  RadioMenuEntry,
} from '../../services/playersApi';

export type SourceKind = 'favorites' | 'library' | 'radio-root' | 'radio' | 'service';

/** A picked entry in the top-level service list. */
export type Source = {
  key: string;
  kind: SourceKind;
  name: string;
  /** Optional secondary line shown beneath the name (e.g. provider tag). */
  detail?: string;
  icon?: string;
  /** Populated when kind === 'radio'. */
  radio?: RadioMenuEntry;
  /** Populated when kind === 'service'. */
  service?: ContentServiceEntry;
  serviceUser?: string;
};

/** Lazy loader for a single breadcrumb level. */
export type Crumb = {
  label: string;
  load: () => Promise<ContentFolder | null>;
};

/** Active folder-browser state for one open source. */
export type View = {
  source: Source;
  folder: ContentFolder | null;
  loading: boolean;
  error: string | null;
  crumbs: Crumb[];
  /** Container we just opened that can also be played as a whole. */
  playableContainer: { audiopath: string; name: string } | null;
};

export const FAVORITES_SOURCE: Source = {
  key: 'favorites',
  kind: 'favorites',
  name: 'Favorites',
};

export const LIBRARY_SOURCE: Source = {
  key: 'library',
  kind: 'library',
  name: 'Library',
};

export const RADIO_ROOT_SOURCE: Source = {
  key: 'radio-root',
  kind: 'radio-root',
  name: 'Radio',
};

export function providerLabel(provider: string): string {
  switch ((provider ?? '').toLowerCase()) {
    case 'spotify': return 'Spotify';
    case 'applemusic': return 'Apple Music';
    case 'ytmusic': return 'YouTube Music';
    case 'youtube': return 'YouTube';
    case 'deezer': return 'Deezer';
    case 'tidal': return 'Tidal';
    case 'musicassistant': return 'Music Assistant';
    default: return provider || 'Service';
  }
}
