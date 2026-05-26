import React from 'react';
import type { LoxoneZoneState } from '../services/playersStream';

const STORAGE_KEY = 'lox.player.activeZoneId';

function readStored(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function writeStored(value: number | null): void {
  if (typeof window === 'undefined') return;
  if (value == null) {
    window.localStorage.removeItem(STORAGE_KEY);
  } else {
    window.localStorage.setItem(STORAGE_KEY, String(value));
  }
}

/**
 * Tracks which zone is "active" — every play/seek/volume action in the player
 * app targets this zone. Persisted in localStorage so refreshing the tab keeps
 * the choice. Automatically clears the selection when the chosen zone leaves
 * the live state map.
 */
export function useActiveZone(zones: Map<number, LoxoneZoneState>): {
  activeZoneId: number | null;
  activeZone: LoxoneZoneState | null;
  setActiveZoneId: (id: number | null) => void;
} {
  const [activeZoneId, setActiveZoneIdRaw] = React.useState<number | null>(() => readStored());

  const setActiveZoneId = React.useCallback((id: number | null) => {
    setActiveZoneIdRaw(id);
    writeStored(id);
  }, []);

  React.useEffect(() => {
    if (activeZoneId == null) return;
    // If the zone disappeared (server config change, browser zone GC'd), drop it.
    // We wait a beat after mount before clearing so the live state has time to
    // populate from the WS feed.
    if (zones.size > 0 && !zones.has(activeZoneId)) {
      setActiveZoneId(null);
    }
  }, [zones, activeZoneId, setActiveZoneId]);

  const activeZone = activeZoneId != null ? zones.get(activeZoneId) ?? null : null;

  return { activeZoneId, activeZone, setActiveZoneId };
}
