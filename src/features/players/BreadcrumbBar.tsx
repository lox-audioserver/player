import React from 'react';
import { ChevronLeftIcon } from '../../components/icons';

export type Crumb = {
  label: string;
  /** Omit `onClick` to render the crumb disabled (current location). */
  onClick?: () => void;
};

type Props = {
  /** "Sources" back action (top-level home). */
  onBack: () => void;
  crumbs: Crumb[];
};

/** Shared breadcrumb chrome used by every service-browser surface. */
export default function BreadcrumbBar({ onBack, crumbs }: Props): JSX.Element {
  return (
    <div className="player-services__breadcrumb">
      <button
        type="button"
        className="player-services__back"
        onClick={onBack}
        aria-label="Back to sources"
      >
        <ChevronLeftIcon />
        <span>Sources</span>
      </button>
      {crumbs.map((crumb, idx) => (
        <React.Fragment key={`${crumb.label}-${idx}`}>
          <span className="player-services__crumb-sep">/</span>
          <button
            type="button"
            className="player-services__crumb"
            onClick={crumb.onClick}
            disabled={!crumb.onClick}
          >
            {crumb.label}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}
