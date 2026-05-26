import React from 'react';
import { fetchQueue, type QueueItem } from '../../services/playersApi';
import { getPlayersStream } from '../../services/playersStream';

type Props = {
  zoneId: number;
  /** Current playing queue index — used to highlight the active track. */
  currentQindex: number;
};

type LoadState = {
  loading: boolean;
  error: string | null;
  items: QueueItem[];
  total: number;
  shuffle: boolean;
};

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '';
  const seconds = Math.floor(ms / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function PlayerQueue({ zoneId, currentQindex }: Props): JSX.Element {
  const [state, setState] = React.useState<LoadState>({
    loading: true,
    error: null,
    items: [],
    total: 0,
    shuffle: false,
  });

  const load = React.useCallback(async () => {
    try {
      const res = await fetchQueue(zoneId, 0, 200);
      setState({
        loading: false,
        error: null,
        items: res.items,
        total: res.totalitems,
        shuffle: res.shuffle,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load queue',
      }));
    }
  }, [zoneId]);

  React.useEffect(() => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    void load();
  }, [load]);

  // Subscribe to audio_queue_event for this zone — refetch when queue changes.
  React.useEffect(() => {
    const stream = getPlayersStream();
    const unsubscribe = stream.subscribeQueue((events) => {
      if (events.some((e) => e.playerid === zoneId)) {
        void load();
      }
    });
    return unsubscribe;
  }, [zoneId, load]);

  if (state.loading) {
    return (
      <div className="player-queue__status">
        <p>Loading queue…</p>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="player-queue__status player-queue__status--error">
        <p>{state.error}</p>
        <button type="button" className="player-queue__retry" onClick={() => void load()}>
          Retry
        </button>
      </div>
    );
  }

  if (state.items.length === 0) {
    return (
      <div className="player-queue__status">
        <p>Queue is empty.</p>
        <p className="player-queue__hint">Pick a source or favorite to start playback.</p>
      </div>
    );
  }

  return (
    <div className="player-queue">
      <div className="player-queue__head">
        <p className="player-queue__count">
          {state.total} track{state.total === 1 ? '' : 's'}
          {state.shuffle ? ' · shuffled' : ''}
        </p>
      </div>
      <ul className="player-queue__list">
        {state.items.map((item, idx) => {
          const isCurrent = item.qindex === currentQindex;
          const number = idx + 1;
          return (
            <li
              key={`${item.unique_id || item.audiopath}-${item.qindex}-${idx}`}
              className={`player-queue__row ${isCurrent ? 'is-current' : ''}`}
            >
              <span className="player-queue__index" aria-hidden="true">
                {isCurrent ? (
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                ) : (
                  number
                )}
              </span>
              {item.coverurl ? (
                <img className="player-queue__cover" src={item.coverurl} alt="" loading="lazy" />
              ) : (
                <div className="player-queue__cover player-queue__cover--placeholder" aria-hidden="true" />
              )}
              <div className="player-queue__meta">
                <p className="player-queue__title" title={item.title}>
                  {item.title || item.station || 'Untitled'}
                </p>
                <p className="player-queue__sub" title={[item.artist, item.album].filter(Boolean).join(' · ')}>
                  {[item.artist, item.album].filter(Boolean).join(' · ') || item.station || '—'}
                </p>
              </div>
              <span className="player-queue__duration">{formatDuration(item.duration)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
