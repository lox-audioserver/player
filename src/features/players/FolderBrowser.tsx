import { PlayIcon } from '../../components/icons';
import { isContainerItem } from '../../services/contentHeuristics';
import type { ContentFolderItem } from '../../services/playersApi';
import BreadcrumbBar, { type Crumb as BreadcrumbCrumb } from './BreadcrumbBar';
import { ItemTypeIcon } from './SourceIcon';
import type { View } from './serviceBrowserTypes';

type Props = {
  view: View;
  busyItem: string | null;
  /** True while a "play whole album/playlist" request is in flight. */
  containerBusy: boolean;
  onBack: () => void;
  onCrumb: (index: number) => void;
  onOpenFolder: (item: ContentFolderItem) => void;
  onPlayItem: (item: ContentFolderItem) => void;
  onPlayContainer: () => void;
  /** Optional intermediate crumb (e.g. "Radio" when inside a radio service). */
  parentCrumb?: { label: string; onClick: () => void } | null;
};

/**
 * Renders the folder browser surface: breadcrumbs, status, optional
 * "Play whole album/playlist" action, and the items list. Strictly
 * presentational — navigation and play actions are handled by the parent.
 */
export default function FolderBrowser({
  view,
  busyItem,
  containerBusy,
  onBack,
  onCrumb,
  onOpenFolder,
  onPlayItem,
  onPlayContainer,
  parentCrumb,
}: Props): JSX.Element {
  const lastCrumbIdx = view.crumbs.length - 1;
  const crumbs: BreadcrumbCrumb[] = [
    ...(parentCrumb ? [parentCrumb] : []),
    ...view.crumbs.map((crumb, idx) => ({
      label: crumb.label,
      onClick: idx === lastCrumbIdx ? undefined : () => onCrumb(idx),
    })),
  ];
  return (
    <div className="player-services">
      <BreadcrumbBar onBack={onBack} crumbs={crumbs} />

      {view.loading && <div className="player-services__status"><p>Loading…</p></div>}
      {view.error && (
        <div className="player-services__status player-services__status--error">
          <p>{view.error}</p>
        </div>
      )}

      {!view.loading && !view.error && view.folder && view.folder.items.length === 0 && (
        <div className="player-services__status"><p>This folder is empty.</p></div>
      )}

      {!view.loading && !view.error && view.folder === null && (
        <div className="player-services__status">
          <p>No content returned for this source.</p>
          <p className="player-services__status-hint">
            The source may not be configured yet, or its API returned no items.
          </p>
        </div>
      )}

      {view.folder && view.playableContainer && (
        <div className="player-services__play-all">
          <button
            type="button"
            className="player-services__play-all-btn"
            onClick={onPlayContainer}
            disabled={containerBusy}
          >
            <PlayIcon size={16} />
            <span>Play {view.playableContainer.name}</span>
          </button>
        </div>
      )}

      {view.folder && view.folder.items.length > 0 && (
        <ul className="player-services__items">
          {view.folder.items.map((item) => {
            const isFolder = isContainerItem(item);
            const cover = item.coverurl ?? item.thumbnail;
            return (
              <li key={`${item.id}-${item.name}`}>
                <button
                  type="button"
                  className={`player-services__item ${busyItem === item.id ? 'is-busy' : ''}`}
                  onClick={() => (isFolder ? onOpenFolder(item) : onPlayItem(item))}
                >
                  {cover ? (
                    <img className="player-services__item-cover" src={cover} alt="" loading="lazy" />
                  ) : (
                    <div className="player-services__item-cover player-services__item-cover--placeholder" aria-hidden="true">
                      <ItemTypeIcon type={item.type} isFolder={isFolder} />
                    </div>
                  )}
                  <div className="player-services__item-meta">
                    <p className="player-services__item-name" title={item.name}>{item.name}</p>
                    {(item.artist || item.album) && (
                      <p className="player-services__item-sub">
                        {[item.artist, item.album].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  {isFolder && <span className="player-services__chevron" aria-hidden="true">›</span>}
                  {!isFolder && busyItem === item.id && (
                    <span className="player-services__item-busy" aria-hidden="true">…</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
