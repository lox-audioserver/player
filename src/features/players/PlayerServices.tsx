import React from 'react';
import {
  fetchMediaFolder,
  fetchRadios,
  fetchServiceFolder,
  fetchServices,
  playLibraryItem,
  playPlaylist,
  playServiceItem,
  playUrl,
  type ContentFolder,
  type ContentFolderItem,
  type ContentServiceEntry,
  type RadioMenuEntry,
} from '../../services/playersApi';
import {
  getContainerAudiopath,
  relabelServiceRoot,
} from '../../services/contentHeuristics';
import BreadcrumbBar from './BreadcrumbBar';
import FolderBrowser from './FolderBrowser';
import PlayerFavorites from './PlayerFavorites';
import ServiceList from './ServiceList';
import {
  FAVORITES_SOURCE,
  LIBRARY_SOURCE,
  RADIO_ROOT_SOURCE,
  providerLabel,
  type Crumb,
  type Source,
  type View,
} from './serviceBrowserTypes';

type Props = {
  /** Active zone to play into. When null, play actions show a hint. */
  zoneId: number | null;
};

const FOLDER_PAGE_SIZE = 200;

type Overlay = 'favorites' | 'radio-root' | null;

/**
 * Orchestrator for the service-browsing surface. Owns the navigation state
 * and the network calls; delegates the rendering of each surface (top-level
 * list, favorites, radio root, folder browser) to dedicated components.
 */
export default function PlayerServices({ zoneId }: Props): JSX.Element {
  const [sources, setSources] = React.useState<Source[] | null>(null);
  const [radioChildren, setRadioChildren] = React.useState<Source[]>([]);
  const [rootError, setRootError] = React.useState<string | null>(null);
  const [view, setView] = React.useState<View | null>(null);
  const [overlay, setOverlay] = React.useState<Overlay>(null);
  const [busyItem, setBusyItem] = React.useState<string | null>(null);
  const [containerBusy, setContainerBusy] = React.useState(false);
  const [noZoneHint, setNoZoneHint] = React.useState(false);

  React.useEffect(() => {
    if (zoneId != null && noZoneHint) setNoZoneHint(false);
  }, [zoneId, noZoneHint]);

  const loadSources = React.useCallback(async () => {
    setRootError(null);
    try {
      const [radios, services] = await Promise.all([
        fetchRadios().catch(() => [] as RadioMenuEntry[]),
        fetchServices().catch(() => [] as ContentServiceEntry[]),
      ]);

      const radioSources: Source[] = radios.map((r) => ({
        key: `radio:${r.cmd}`,
        kind: 'radio',
        name: r.name,
        icon: r.icon,
        radio: r,
      }));
      setRadioChildren(radioSources);

      const serviceSources: Source[] = services.map((svc) => {
        const provider = providerLabel(svc.provider || svc.cmd);
        // Real Spotify accounts: name = "Spotify", user = "rudy@spotify.com".
        // Bridges (Apple Music, YouTube …): name is empty, user holds the bridge label.
        const headline = svc.user?.trim() || svc.name?.trim() || provider;
        const isBridge = svc.fake === true || !svc.name?.trim();
        return {
          key: `service:${svc.cmd}:${svc.id || svc.user}`,
          kind: 'service',
          name: headline,
          detail: isBridge ? provider : provider !== headline ? provider : undefined,
          icon: svc.icon,
          service: svc,
          serviceUser: svc.id || svc.user,
        };
      });

      const roots: Source[] = [FAVORITES_SOURCE, LIBRARY_SOURCE];
      if (radioSources.length > 0) roots.push(RADIO_ROOT_SOURCE);
      roots.push(...serviceSources);
      setSources(roots);
    } catch (err) {
      setRootError(err instanceof Error ? err.message : 'Failed to load sources');
    }
  }, []);

  React.useEffect(() => {
    void loadSources();
  }, [loadSources]);

  const openSource = React.useCallback(async (source: Source) => {
    if (source.kind === 'favorites') {
      setOverlay('favorites');
      setView(null);
      return;
    }
    if (source.kind === 'radio-root') {
      setOverlay('radio-root');
      setView(null);
      return;
    }
    setOverlay(null);
    const rootLoader = async (): Promise<ContentFolder | null> => {
      if (source.kind === 'library') {
        return fetchMediaFolder('root', 0, FOLDER_PAGE_SIZE);
      }
      if (source.kind === 'radio' && source.radio) {
        return fetchServiceFolder(source.radio.cmd, 'nouser', source.radio.root, 0, FOLDER_PAGE_SIZE);
      }
      if (source.kind === 'service' && source.service) {
        const folder = await fetchServiceFolder(
          source.service.cmd,
          source.serviceUser ?? 'nouser',
          'root',
          0,
          FOLDER_PAGE_SIZE,
        );
        return relabelServiceRoot(source.service, folder);
      }
      return null;
    };
    const baseCrumb: Crumb = { label: source.name, load: rootLoader };
    setView({ source, folder: null, loading: true, error: null, crumbs: [baseCrumb], playableContainer: null });
    try {
      const folder = await rootLoader();
      setView({ source, folder, loading: false, error: null, crumbs: [baseCrumb], playableContainer: null });
    } catch (err) {
      setView({
        source,
        folder: null,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load source',
        crumbs: [baseCrumb],
        playableContainer: null,
      });
    }
  }, []);

  const openFolder = React.useCallback(async (item: ContentFolderItem) => {
    if (!view) return;
    const source = view.source;
    const loader = async (): Promise<ContentFolder | null> => {
      if (source.kind === 'library') {
        return fetchMediaFolder(item.id, 0, FOLDER_PAGE_SIZE);
      }
      if (source.kind === 'radio' && source.radio) {
        return fetchServiceFolder(source.radio.cmd, 'nouser', item.id, 0, FOLDER_PAGE_SIZE);
      }
      if (source.kind === 'service' && source.service) {
        return fetchServiceFolder(source.service.cmd, source.serviceUser ?? 'nouser', item.id, 0, FOLDER_PAGE_SIZE);
      }
      return null;
    };
    // Remember the audiopath of playable containers (albums, playlists, …) so
    // we can render a "Play whole album" action while the user browses tracks.
    const containerPath = source.kind === 'service' ? getContainerAudiopath(item) : null;
    const playableContainer = containerPath ? { audiopath: containerPath, name: item.name } : null;
    setView({
      ...view,
      folder: null,
      loading: true,
      error: null,
      crumbs: [...view.crumbs, { label: item.name, load: loader }],
      playableContainer,
    });
    try {
      const folder = await loader();
      setView((prev) => (prev ? { ...prev, folder, loading: false, error: null } : prev));
    } catch (err) {
      setView((prev) =>
        prev
          ? { ...prev, folder: null, loading: false, error: err instanceof Error ? err.message : 'Failed to load folder' }
          : prev,
      );
    }
  }, [view]);

  const jumpToCrumb = React.useCallback(async (index: number) => {
    if (!view) return;
    const target = view.crumbs[index];
    if (!target) return;
    const trimmedCrumbs = view.crumbs.slice(0, index + 1);
    // Going up exits the current container, so the Play-whole-album action
    // disappears. Re-entering the container restores it.
    setView({ ...view, folder: null, loading: true, error: null, crumbs: trimmedCrumbs, playableContainer: null });
    try {
      const folder = await target.load();
      setView((prev) => (prev ? { ...prev, folder, loading: false, error: null } : prev));
    } catch (err) {
      setView((prev) =>
        prev
          ? { ...prev, folder: null, loading: false, error: err instanceof Error ? err.message : 'Failed to load folder' }
          : prev,
      );
    }
  }, [view]);

  const closeAll = React.useCallback(() => {
    setView(null);
    setOverlay(null);
  }, []);

  const playContainer = React.useCallback(async () => {
    if (!view?.playableContainer) return;
    if (zoneId == null) {
      setNoZoneHint(true);
      return;
    }
    const source = view.source;
    if (source.kind !== 'service' || !source.service) return;
    const user = source.serviceUser ?? 'nouser';
    const path = view.playableContainer.audiopath;
    setContainerBusy(true);
    try {
      if (path.includes('playlist:')) {
        await playPlaylist(zoneId, path);
      } else {
        await playServiceItem(zoneId, source.service.cmd, user, path);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[PlayerServices] play container failed', err);
    } finally {
      setContainerBusy(false);
    }
  }, [view, zoneId]);

  const playItem = React.useCallback(async (item: ContentFolderItem) => {
    if (!view) return;
    if (zoneId == null) {
      setNoZoneHint(true);
      return;
    }
    const source = view.source;
    setBusyItem(item.id);
    try {
      if (source.kind === 'library') {
        const target = item.audiopath ?? item.id;
        if (target) await playLibraryItem(zoneId, target);
      } else if (source.kind === 'radio' && source.radio) {
        if (item.audiopath?.startsWith('http')) {
          await playUrl(zoneId, item.audiopath);
        } else {
          await playServiceItem(zoneId, source.radio.cmd, 'nouser', item.audiopath ?? item.id);
        }
      } else if (source.kind === 'service' && source.service) {
        const user = source.serviceUser ?? 'nouser';
        const path = item.audiopath ?? item.id;
        if (path?.includes('playlist:')) {
          await playPlaylist(zoneId, path);
        } else {
          await playServiceItem(zoneId, source.service.cmd, user, path);
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[PlayerServices] play failed', err);
    } finally {
      setBusyItem(null);
    }
  }, [view, zoneId]);

  // ---------------------------------------------------------------- Render

  if (!view && !overlay) {
    if (rootError) {
      return (
        <div className="player-services__status player-services__status--error">
          <p>{rootError}</p>
          <button
            type="button"
            className="player-services__retry"
            onClick={() => void loadSources()}
          >
            Retry
          </button>
        </div>
      );
    }
    if (!sources) {
      return <div className="player-services__status"><p>Loading sources…</p></div>;
    }
    return (
      <ServiceList
        sources={sources}
        hint={noZoneHint ? 'Pick a player at the top to play any track from these sources.' : null}
        onPick={(source) => void openSource(source)}
      />
    );
  }

  if (overlay === 'favorites') {
    return (
      <div className="player-services">
        <BreadcrumbBar onBack={closeAll} crumbs={[{ label: 'Favorites' }]} />
        <PlayerFavorites zoneId={zoneId} />
      </div>
    );
  }

  if (overlay === 'radio-root') {
    return (
      <div className="player-services">
        <BreadcrumbBar onBack={closeAll} crumbs={[{ label: 'Radio' }]} />
        {radioChildren.length === 0 ? (
          <div className="player-services__status"><p>No radio sources configured.</p></div>
        ) : (
          <ServiceList sources={radioChildren} onPick={(source) => void openSource(source)} />
        )}
      </div>
    );
  }

  if (!view) return <></>;

  return (
    <FolderBrowser
      view={view}
      busyItem={busyItem}
      containerBusy={containerBusy}
      onBack={closeAll}
      onCrumb={(idx) => void jumpToCrumb(idx)}
      onOpenFolder={(item) => void openFolder(item)}
      onPlayItem={(item) => void playItem(item)}
      onPlayContainer={() => void playContainer()}
      parentCrumb={view.source.kind === 'radio' ? {
        label: 'Radio',
        onClick: () => {
          setOverlay('radio-root');
          setView(null);
        },
      } : null}
    />
  );
}
