import React from 'react';
import type { LoxoneZoneState } from '../../services/playersStream';
import PlayerQueue from './PlayerQueue';
import {
  next as nextTrack,
  pause as pausePlayback,
  play as playPlayback,
  previous as previousTrack,
  seek,
  setVolume,
} from '../../services/playersApi';

type Props = {
  state: LoxoneZoneState;
  onClose: () => void;
};

type Tab = 'nowplaying' | 'queue';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function PlayerSheet({ state, onClose }: Props): JSX.Element {
  const [tab, setTab] = React.useState<Tab>('nowplaying');
  const playing = state.mode === 'play';
  const coverUrl = state.coverurl?.trim() ?? '';
  const trackTitle = state.title?.trim() || state.station?.trim() || '—';
  const trackArtist = state.artist?.trim() ?? '';
  const trackAlbum = state.album?.trim() ?? '';
  const sourceLabel = state.sourceName?.trim() || state.station?.trim() || '—';

  // Local-tick smoothing for seek bar
  const baseTime = Number.isFinite(state.time) ? state.time : 0;
  const durationSec = Number.isFinite(state.duration) && state.duration > 0 ? state.duration : 0;
  const baselineRef = React.useRef<{ elapsed: number; receivedAt: number }>({
    elapsed: baseTime,
    receivedAt: Date.now(),
  });
  const [, setTick] = React.useState(0);

  React.useEffect(() => {
    baselineRef.current = { elapsed: baseTime, receivedAt: Date.now() };
  }, [baseTime, state.audiopath]);

  React.useEffect(() => {
    if (!playing || durationSec <= 0) return undefined;
    const id = window.setInterval(() => setTick((t) => t + 1), 500);
    return () => window.clearInterval(id);
  }, [playing, durationSec]);

  // Close on Escape
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const liveElapsedSec = (() => {
    if (!playing) return baseTime;
    const drift = (Date.now() - baselineRef.current.receivedAt) / 1000;
    const candidate = baselineRef.current.elapsed + drift;
    if (durationSec > 0) return clamp(candidate, 0, durationSec);
    return candidate;
  })();
  const progressPct = durationSec > 0 ? clamp((liveElapsedSec / durationSec) * 100, 0, 100) : 0;

  const [volumeDraft, setVolumeDraft] = React.useState<number | null>(null);
  const currentVolume = volumeDraft ?? clamp(state.volume ?? 0, 0, 100);

  const handlePlayPause = async (): Promise<void> => {
    if (playing) await pausePlayback(state.playerid);
    else await playPlayback(state.playerid);
  };

  const handleSeek = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    if (durationSec <= 0) return;
    const ratio = Number(event.target.value) / 100;
    await seek(state.playerid, ratio * durationSec);
  };

  const handleVolumeCommit = async (): Promise<void> => {
    if (volumeDraft == null) return;
    const target = volumeDraft;
    setVolumeDraft(null);
    try {
      await setVolume(state.playerid, target);
    } catch {
      // server push will reconcile
    }
  };

  return (
    <div className="player-sheet" role="dialog" aria-modal="true" aria-label={`Player: ${state.name}`}>
      <div className="player-sheet__backdrop" onClick={onClose} aria-hidden="true" />
      <div className="player-sheet__panel">
        <header className="player-sheet__header">
          <button
            type="button"
            className="player-sheet__close"
            onClick={onClose}
            aria-label="Close player"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          <div className="player-sheet__zone">
            <p className="player-sheet__eyebrow">Playing on</p>
            <p className="player-sheet__zone-name">{state.name}</p>
          </div>
          <div className="player-sheet__header-spacer" aria-hidden="true" />
        </header>

        <nav className="player-sheet__tabs" aria-label="Player sections">
          <button
            type="button"
            className={`player-sheet__tab ${tab === 'nowplaying' ? 'is-active' : ''}`}
            onClick={() => setTab('nowplaying')}
          >
            Now playing
          </button>
          <button
            type="button"
            className={`player-sheet__tab ${tab === 'queue' ? 'is-active' : ''}`}
            onClick={() => setTab('queue')}
          >
            Queue
          </button>
        </nav>

        <div className="player-sheet__body">
          {tab === 'nowplaying' && (
            <div className="player-sheet__nowplaying">
              <div className="player-sheet__cover">
                {coverUrl ? (
                  <img src={coverUrl} alt="" />
                ) : (
                  <div className="player-sheet__cover-placeholder" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="96" height="96" fill="none" stroke="currentColor" strokeWidth="1.3">
                      <path d="M9 18V5l12-2v13" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                  </div>
                )}
              </div>

              <div className="player-sheet__meta">
                <p className="player-sheet__source">{sourceLabel}</p>
                <h2 className="player-sheet__title">{trackTitle}</h2>
                {trackArtist && <p className="player-sheet__artist">{trackArtist}</p>}
                {trackAlbum && <p className="player-sheet__album">{trackAlbum}</p>}
              </div>

              <div className="player-sheet__seek">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={0.1}
                  value={progressPct}
                  onChange={handleSeek}
                  disabled={durationSec <= 0}
                  aria-label="Seek"
                />
                <div className="player-sheet__times">
                  <span>{formatTime(liveElapsedSec)}</span>
                  <span>{durationSec > 0 ? formatTime(durationSec) : '∞'}</span>
                </div>
              </div>

              <div className="player-sheet__controls">
                <button
                  type="button"
                  className="player-sheet__btn"
                  onClick={() => void previousTrack(state.playerid)}
                  aria-label="Previous track"
                >
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true">
                    <path d="M6 5h2v14H6zM20 5v14L9 12z" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="player-sheet__btn player-sheet__btn--primary"
                  onClick={handlePlayPause}
                  aria-label={playing ? 'Pause' : 'Play'}
                >
                  {playing ? (
                    <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor" aria-hidden="true">
                      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor" aria-hidden="true">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  className="player-sheet__btn"
                  onClick={() => void nextTrack(state.playerid)}
                  aria-label="Next track"
                >
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true">
                    <path d="M16 5h2v14h-2zM4 5v14l11-7z" />
                  </svg>
                </button>
              </div>

              <div className="player-sheet__volume">
                <span className="player-sheet__volume-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M5 9v6h4l5 4V5L9 9H5z" strokeLinejoin="round" />
                    <path d="M17 8a5 5 0 0 1 0 8" strokeLinecap="round" />
                  </svg>
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={currentVolume}
                  onChange={(event) => setVolumeDraft(Number(event.target.value))}
                  onMouseUp={handleVolumeCommit}
                  onTouchEnd={handleVolumeCommit}
                  onKeyUp={handleVolumeCommit}
                  aria-label="Volume"
                />
                <span className="player-sheet__volume-value">{currentVolume}</span>
              </div>
            </div>
          )}

          {tab === 'queue' && (
            <div className="player-sheet__queue">
              <PlayerQueue zoneId={state.playerid} currentQindex={state.qindex ?? 0} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
