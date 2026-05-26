import React from 'react';
import type { LoxoneZoneState } from '../../services/playersStream';

type Props = {
  state: LoxoneZoneState;
  selected: boolean;
  onSelect: (playerid: number) => void;
};

export default function PlayerTile({ state, selected, onSelect }: Props): JSX.Element {
  const playing = state.mode === 'play';
  const paused = state.mode === 'pause';
  const coverUrl = state.coverurl?.trim() ?? '';

  const trackTitle = state.title?.trim() || state.station?.trim() || '';
  const trackArtist = state.artist?.trim() ?? '';
  const subline = trackArtist || state.album?.trim() || state.sourceName?.trim() || 'Idle';

  const handleClick = (): void => {
    onSelect(state.playerid);
  };

  return (
    <button
      type="button"
      className={`player-tile ${playing ? 'is-playing' : ''} ${paused ? 'is-paused' : ''} ${selected ? 'is-selected' : ''}`}
      onClick={handleClick}
      aria-pressed={selected}
    >
      <div className="player-tile__cover">
        {coverUrl ? (
          <img src={coverUrl} alt="" loading="lazy" />
        ) : (
          <div className="player-tile__cover-placeholder" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 18V5l12-2v13" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>
        )}
        <span className={`player-tile__state-dot ${playing ? 'is-playing' : ''} ${paused ? 'is-paused' : ''}`} aria-hidden="true" />
      </div>
      <div className="player-tile__meta">
        <p className="player-tile__zone-name">{state.name}</p>
        {trackTitle ? (
          <p className="player-tile__title" title={trackTitle}>{trackTitle}</p>
        ) : (
          <p className="player-tile__title player-tile__title--placeholder">No track</p>
        )}
        <p className="player-tile__subline" title={subline}>{subline}</p>
      </div>
    </button>
  );
}
