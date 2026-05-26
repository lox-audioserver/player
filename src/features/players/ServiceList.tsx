import { ChevronRightIcon } from '../../components/icons';
import { SourceIcon } from './SourceIcon';
import type { Source } from './serviceBrowserTypes';

type Props = {
  sources: Source[];
  /** Optional inline hint shown above the list (e.g. "pick a zone first"). */
  hint?: string | null;
  onPick: (source: Source) => void;
};

/**
 * Top-level "Sources" list: Favorites, Library, Radio group, and per-service
 * accounts/bridges. Strictly presentational — the parent owns the source list
 * and the click handler.
 */
export default function ServiceList({ sources, hint, onPick }: Props): JSX.Element {
  return (
    <div className="player-services">
      {hint && (
        <p className="player-services__zone-hint" role="alert">{hint}</p>
      )}
      <ul className="player-services__sources">
        {sources.map((source) => (
          <li key={source.key}>
            <button
              type="button"
              className="player-services__source"
              onClick={() => onPick(source)}
            >
              <span
                className={`player-services__source-icon ${source.icon ? 'has-image' : ''}`}
                aria-hidden="true"
              >
                {source.icon ? <img src={source.icon} alt="" /> : <SourceIcon kind={source.kind} />}
              </span>
              <span className="player-services__source-text">
                <span className="player-services__source-name">{source.name}</span>
                {source.detail && <span className="player-services__source-detail">{source.detail}</span>}
              </span>
              <span className="player-services__chevron" aria-hidden="true">
                <ChevronRightIcon />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
