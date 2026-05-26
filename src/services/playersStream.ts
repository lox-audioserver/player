// Live zone-state stream from the audioserver. Subscribes to the WS endpoint
// that mirrors the standard Loxone `audio_event` broadcast, so the player UI
// updates the instant the server's state changes — same surface as the real
// Loxone webclient.

export type LoxoneZoneState = {
  album: string;
  artist: string;
  audiopath: string;
  audiotype: number;
  clientState: 'on' | 'off';
  coverurl: string;
  duration: number;
  equalizerSettings: string;
  icontype?: number;
  mode: 'play' | 'pause' | 'stop';
  name: string;
  parent: unknown;
  playerid: number;
  plrepeat: number;
  plshuffle: number;
  power: 'on' | 'off';
  powerState?: 'on' | 'off';
  qindex: number;
  queueAuthority?: string;
  sourceName: string;
  station: string;
  time: number;
  title: string;
  qid?: string;
  type: number;
  volume: number;
  syncedzones?: number[];
  mastervolume?: number;
};

type Listener = (states: LoxoneZoneState[]) => void;
type QueueEvent = { playerid: number; queuesize: number; restrictions?: number };
type QueueListener = (events: QueueEvent[]) => void;
type FavoritesEvent = { playerid: number; count: number };
type FavoritesListener = (events: FavoritesEvent[]) => void;
type OpenListener = () => void;

const RECONNECT_DELAY_MS = 1500;

function resolveWsUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/audio/events`;
}

export class PlayersStream {
  private socket: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private queueListeners = new Set<QueueListener>();
  private favoritesListeners = new Set<FavoritesListener>();
  private openListeners = new Set<OpenListener>();
  private connected = false;
  private reconnectTimer: number | null = null;
  private closedByUser = false;

  private hasListeners(): boolean {
    return this.listeners.size > 0 || this.queueListeners.size > 0 || this.favoritesListeners.size > 0;
  }

  // Notify when the WS handshake completes. Used by the UI to leave the
  // "subscribing…" state even before any zone snapshot arrives — the server
  // sends nothing when there are zero zones registered yet.
  public onOpen(listener: OpenListener): () => void {
    this.openListeners.add(listener);
    if (this.connected) {
      try { listener(); } catch { /* ignore */ }
    }
    return () => { this.openListeners.delete(listener); };
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    if (!this.socket && !this.reconnectTimer) {
      this.connect();
    }
    return () => {
      this.listeners.delete(listener);
      if (!this.hasListeners()) this.disconnect();
    };
  }

  public subscribeQueue(listener: QueueListener): () => void {
    this.queueListeners.add(listener);
    if (!this.socket && !this.reconnectTimer) {
      this.connect();
    }
    return () => {
      this.queueListeners.delete(listener);
      if (!this.hasListeners()) this.disconnect();
    };
  }

  public subscribeFavorites(listener: FavoritesListener): () => void {
    this.favoritesListeners.add(listener);
    if (!this.socket && !this.reconnectTimer) {
      this.connect();
    }
    return () => {
      this.favoritesListeners.delete(listener);
      if (!this.hasListeners()) this.disconnect();
    };
  }

  private connect(): void {
    if (this.socket) return;
    if (typeof window === 'undefined') return;
    this.closedByUser = false;
    try {
      const url = resolveWsUrl();
      const ws = new WebSocket(url);
      this.socket = ws;
      ws.addEventListener('open', () => {
        this.connected = true;
        this.openListeners.forEach((listener) => {
          try { listener(); } catch { /* ignore */ }
        });
      });
      ws.addEventListener('message', (event) => this.handleMessage(event));
      ws.addEventListener('close', () => this.handleClose());
      ws.addEventListener('error', () => this.handleClose());
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[playersStream] failed to open ws', err);
      this.scheduleReconnect();
    }
  }

  private disconnect(): void {
    this.closedByUser = true;
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      try {
        this.socket.close();
      } catch {
        // ignore
      }
      this.socket = null;
    }
  }

  private handleMessage(event: MessageEvent): void {
    let payload: unknown;
    try {
      payload = JSON.parse(typeof event.data === 'string' ? event.data : '');
    } catch {
      return;
    }
    if (!payload || typeof payload !== 'object') return;
    const envelope = payload as {
      audio_event?: unknown;
      audio_queue_event?: unknown;
      roomfavchanged_event?: unknown;
    };

    if (Array.isArray(envelope.audio_event) && envelope.audio_event.length > 0) {
      const states = envelope.audio_event.filter((e): e is LoxoneZoneState => {
        return Boolean(e) && typeof e === 'object' && 'playerid' in (e as Record<string, unknown>);
      });
      if (states.length > 0) {
        this.listeners.forEach((listener) => {
          try {
            listener(states);
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('[playersStream] state listener threw', err);
          }
        });
      }
    }

    if (Array.isArray(envelope.audio_queue_event) && envelope.audio_queue_event.length > 0) {
      const events = envelope.audio_queue_event.filter((e): e is QueueEvent => {
        return Boolean(e) && typeof e === 'object' && 'playerid' in (e as Record<string, unknown>);
      });
      if (events.length > 0) {
        this.queueListeners.forEach((listener) => {
          try {
            listener(events);
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('[playersStream] queue listener threw', err);
          }
        });
      }
    }

    if (Array.isArray(envelope.roomfavchanged_event) && envelope.roomfavchanged_event.length > 0) {
      const events = envelope.roomfavchanged_event.filter((e): e is FavoritesEvent => {
        return Boolean(e) && typeof e === 'object' && 'playerid' in (e as Record<string, unknown>);
      });
      if (events.length > 0) {
        this.favoritesListeners.forEach((listener) => {
          try {
            listener(events);
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('[playersStream] favorites listener threw', err);
          }
        });
      }
    }
  }

  private handleClose(): void {
    this.socket = null;
    this.connected = false;
    if (this.closedByUser || this.listeners.size === 0) return;
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      if (this.listeners.size > 0) {
        this.connect();
      }
    }, RECONNECT_DELAY_MS);
  }
}

let singleton: PlayersStream | null = null;

export function getPlayersStream(): PlayersStream {
  if (!singleton) singleton = new PlayersStream();
  return singleton;
}
