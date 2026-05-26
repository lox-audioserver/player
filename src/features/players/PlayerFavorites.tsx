import React from 'react';
import {
  fetchRoomFavorites,
  playRoomFavorite,
  type RoomFavorite,
} from '../../services/playersApi';
import { getPlayersStream } from '../../services/playersStream';

type Props = {
  /** When null, favorites are unavailable (no active zone). */
  zoneId: number | null;
};

type LoadState = {
  loading: boolean;
  error: string | null;
  items: RoomFavorite[];
  total: number;
};

export default function PlayerFavorites({ zoneId }: Props): JSX.Element {
  const [state, setState] = React.useState<LoadState>({
    loading: true,
    error: null,
    items: [],
    total: 0,
  });
  const [busy, setBusy] = React.useState<number | null>(null);

  const load = React.useCallback(async () => {
    if (zoneId == null) {
      setState({ loading: false, error: null, items: [], total: 0 });
      return;
    }
    try {
      const res = await fetchRoomFavorites(zoneId, 0, 50);
      setState({ loading: false, error: null, items: res.items, total: res.totalitems });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load favorites',
      }));
    }
  }, [zoneId]);

  React.useEffect(() => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    void load();
  }, [load]);

  React.useEffect(() => {
    if (zoneId == null) return undefined;
    const stream = getPlayersStream();
    const unsubscribe = stream.subscribeFavorites((events) => {
      if (events.some((e) => e.playerid === zoneId)) {
        void load();
      }
    });
    return unsubscribe;
  }, [zoneId, load]);

  const handlePlay = async (favorite: RoomFavorite): Promise<void> => {
    if (zoneId == null) return;
    setBusy(favorite.id);
    try {
      await playRoomFavorite(zoneId, favorite.id);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[PlayerFavorites] play failed', err);
    } finally {
      setBusy(null);
    }
  };

  if (zoneId == null) {
    return (
      <div className="player-favorites__status">
        <p>Select a player to load its favorites.</p>
      </div>
    );
  }

  if (state.loading) {
    return <div className="player-favorites__status"><p>Loading favorites…</p></div>;
  }

  if (state.error) {
    return (
      <div className="player-favorites__status player-favorites__status--error">
        <p>{state.error}</p>
        <button type="button" className="player-favorites__retry" onClick={() => void load()}>
          Retry
        </button>
      </div>
    );
  }

  if (state.items.length === 0) {
    return (
      <div className="player-favorites__status">
        <p>No room favorites set yet.</p>
        <p className="player-favorites__hint">
          Add presets from the Loxone app — they'll appear here automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="player-favorites">
      <div className="player-favorites__head">
        <p className="player-favorites__count">
          {state.total} preset{state.total === 1 ? '' : 's'}
        </p>
      </div>
      <ul className="player-favorites__grid">
        {state.items.map((favorite) => {
          const cover = favorite.coverurl?.trim();
          const subline = [favorite.artist, favorite.album].filter(Boolean).join(' · ');
          const isBusy = busy === favorite.id;
          return (
            <li key={`${favorite.id}-${favorite.slot}`}>
              <button
                type="button"
                className={`player-favorites__card ${isBusy ? 'is-busy' : ''}`}
                onClick={() => void handlePlay(favorite)}
                disabled={isBusy}
                aria-label={`Play favorite ${favorite.name}`}
              >
                {cover ? (
                  <img className="player-favorites__cover" src={cover} alt="" loading="lazy" />
                ) : (
                  <div className="player-favorites__cover player-favorites__cover--placeholder" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.4">
                      <path d="M9 18V5l12-2v13" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                  </div>
                )}
                <div className="player-favorites__overlay" aria-hidden="true">
                  <span className="player-favorites__slot">{favorite.slot}</span>
                  <span className="player-favorites__play">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                </div>
                <div className="player-favorites__meta">
                  <p className="player-favorites__name" title={favorite.name}>{favorite.name}</p>
                  {subline && (
                    <p className="player-favorites__sub" title={subline}>{subline}</p>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
