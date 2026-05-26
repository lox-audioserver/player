import React from 'react';
import type { LoxoneZoneState } from '../../services/playersStream';

type Props = {
  zones: LoxoneZoneState[];
  activeZoneId: number | null;
  onSelect: (zoneId: number) => void;
  /** Optional id of the local browser zone — gets a distinct visual treatment. */
  localBrowserZoneId?: number | null;
};

function isPlaying(mode: LoxoneZoneState['mode']): boolean {
  return mode === 'play';
}

function isPaused(mode: LoxoneZoneState['mode']): boolean {
  return mode === 'pause';
}

export default function ZoneSwitcher({ zones, activeZoneId, onSelect, localBrowserZoneId }: Props): JSX.Element {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return undefined;
    const handler = (event: MouseEvent): void => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  const sortedZones = React.useMemo(() => {
    return [...zones].sort((a, b) => {
      const aLocal = a.playerid === localBrowserZoneId ? 0 : 1;
      const bLocal = b.playerid === localBrowserZoneId ? 0 : 1;
      if (aLocal !== bLocal) return aLocal - bLocal;
      const aActive = isPlaying(a.mode) ? 0 : isPaused(a.mode) ? 1 : 2;
      const bActive = isPlaying(b.mode) ? 0 : isPaused(b.mode) ? 1 : 2;
      if (aActive !== bActive) return aActive - bActive;
      return (a.name ?? '').localeCompare(b.name ?? '');
    });
  }, [zones, localBrowserZoneId]);

  const activeZone = activeZoneId != null ? zones.find((z) => z.playerid === activeZoneId) ?? null : null;

  const buttonLabel = activeZone ? activeZone.name : 'Select a player';
  const buttonSubline = activeZone
    ? isPlaying(activeZone.mode)
      ? activeZone.title?.trim() || activeZone.station?.trim() || 'Playing'
      : isPaused(activeZone.mode)
        ? 'Paused'
        : 'Idle'
    : zones.length > 0
      ? 'Pick a zone to start playing'
      : 'No zones available';

  return (
    <div className={`zone-switcher ${open ? 'is-open' : ''}`} ref={rootRef}>
      <button
        type="button"
        className={`zone-switcher__trigger ${activeZone && isPlaying(activeZone.mode) ? 'is-playing' : ''}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="zone-switcher__trigger-meta">
          <span className="zone-switcher__eyebrow">Playing on</span>
          <span className="zone-switcher__label">{buttonLabel}</span>
          <span className="zone-switcher__subline">{buttonSubline}</span>
        </span>
        <span className="zone-switcher__chevron" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="zone-switcher__popover" role="listbox" aria-label="Choose player">
          {sortedZones.length === 0 ? (
            <p className="zone-switcher__empty">No zones available yet.</p>
          ) : (
            <ul className="zone-switcher__list">
              {sortedZones.map((zone) => {
                const playing = isPlaying(zone.mode);
                const paused = isPaused(zone.mode);
                const isActive = zone.playerid === activeZoneId;
                const isLocal = zone.playerid === localBrowserZoneId;
                const subline = playing
                  ? zone.title?.trim() || zone.station?.trim() || 'Playing'
                  : paused
                    ? 'Paused'
                    : 'Idle';
                return (
                  <li key={zone.playerid}>
                    <button
                      type="button"
                      className={`zone-switcher__option ${isActive ? 'is-active' : ''}`}
                      role="option"
                      aria-selected={isActive}
                      onClick={() => {
                        onSelect(zone.playerid);
                        setOpen(false);
                      }}
                    >
                      <span
                        className={`zone-switcher__state-dot ${playing ? 'is-playing' : ''} ${paused ? 'is-paused' : ''}`}
                        aria-hidden="true"
                      />
                      <span className="zone-switcher__option-meta">
                        <span className="zone-switcher__option-name">
                          {zone.name}
                          {isLocal && <span className="zone-switcher__option-tag">This browser</span>}
                        </span>
                        <span className="zone-switcher__option-sub">{subline}</span>
                      </span>
                      {isActive && (
                        <span className="zone-switcher__check" aria-hidden="true">
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12l5 5 9-11" />
                          </svg>
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
