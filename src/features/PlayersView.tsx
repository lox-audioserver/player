import React from 'react';
import InlineState from '../components/InlineState';
import GroupPicker from './players/GroupPicker';
import PlayerBar from './players/PlayerBar';
import PlayerContent from './players/PlayerContent';
import PlayerSheet from './players/PlayerSheet';
import ZoneSwitcher from './players/ZoneSwitcher';
import { getPlayersStream, type LoxoneZoneState } from '../services/playersStream';
import { useActiveZone } from '../hooks/useActiveZone';
import { useBrowserZone } from '../hooks/useBrowserZone';

type ViewState = {
  ready: boolean;
  states: Map<number, LoxoneZoneState>;
};

export default function PlayersView(): JSX.Element {
  const [view, setView] = React.useState<ViewState>({ ready: false, states: new Map() });
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [groupPickerOpen, setGroupPickerOpen] = React.useState(false);

  React.useEffect(() => {
    const stream = getPlayersStream();
    const unsubscribe = stream.subscribe((states) => {
      setView((prev) => {
        const next = new Map(prev.states);
        for (const state of states) {
          next.set(state.playerid, state);
        }
        return { ready: true, states: next };
      });
    });
    // Server sends no audio_event snapshot when zero zones are registered, so
    // flip "ready" as soon as the WS handshake completes — otherwise the UI
    // hangs on "Subscribing…" forever on a fresh audioserver.
    const unsubscribeOpen = stream.onOpen(() => {
      setView((prev) => (prev.ready ? prev : { ...prev, ready: true }));
    });
    return () => {
      unsubscribe();
      unsubscribeOpen();
    };
  }, []);

  // Silent auto-claim: register the browser as its own zone the first time
  // the player app boots. The id ends up in the WS feed alongside server zones.
  const browser = useBrowserZone(true);

  const orderedZones = React.useMemo(() => {
    return Array.from(view.states.values());
  }, [view.states]);

  const { activeZoneId, activeZone, setActiveZoneId } = useActiveZone(view.states);

  // Auto-select the local browser zone as active the first time it appears,
  // unless the user previously picked something else.
  React.useEffect(() => {
    if (activeZoneId != null) return;
    if (!browser.registration) return;
    if (view.states.has(browser.registration.zoneId)) {
      setActiveZoneId(browser.registration.zoneId);
    }
  }, [activeZoneId, browser.registration, view.states, setActiveZoneId]);

  return (
    <div className="players-shell">
      <header className="players-shell__hero">
        <div className="players-shell__hero-meta">
          <h1 className="players-shell__title">lox-audioserver · player</h1>
        </div>
        <ZoneSwitcher
          zones={orderedZones}
          activeZoneId={activeZoneId}
          onSelect={setActiveZoneId}
          localBrowserZoneId={browser.registration?.zoneId ?? null}
        />
      </header>

      <main className="players-shell__body">
        {!view.ready && (
          <InlineState kind="loading" title="Connecting" message="Subscribing to zone state…" />
        )}
        {view.ready && orderedZones.length === 0 && (
          <InlineState
            kind="empty"
            title="No zones available"
            message="Configure zones in the AudioServer admin to start playing."
          />
        )}
        {view.ready && orderedZones.length > 0 && (
          <PlayerContent state={activeZone} />
        )}
      </main>

      {activeZone && (
        <PlayerBar
          state={activeZone}
          onExpand={() => setSheetOpen(true)}
          onLink={() => setGroupPickerOpen(true)}
          allZones={orderedZones}
        />
      )}

      {activeZone && sheetOpen && (
        <PlayerSheet state={activeZone} onClose={() => setSheetOpen(false)} />
      )}

      {activeZone && groupPickerOpen && (
        <GroupPicker
          leader={activeZone}
          zones={orderedZones}
          onClose={() => setGroupPickerOpen(false)}
        />
      )}
    </div>
  );
}
