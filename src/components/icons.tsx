// Shared inline SVG icons. All icons inherit color via `currentColor` so they
// take their fill/stroke from the surrounding text colour. Default size mirrors
// the most common use; pass `size` to override.

type IconProps = {
  size?: number;
  className?: string;
};

function fillIcon(d: string) {
  return function FillIcon({ size = 24, className }: IconProps): JSX.Element {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" className={className}>
        <path d={d} />
      </svg>
    );
  };
}

export const PlayIcon = fillIcon('M8 5v14l11-7z');
export const PauseIcon = fillIcon('M6 5h4v14H6zM14 5h4v14h-4z');
export const PrevTrackIcon = fillIcon('M6 5h2v14H6zM20 5v14L9 12z');
export const NextTrackIcon = fillIcon('M16 5h2v14h-2zM4 5v14l11-7z');

export function ChevronRightIcon({ size = 14, className }: IconProps): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function ChevronLeftIcon({ size = 16, className }: IconProps): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export function CloseIcon({ size = 18, className }: IconProps): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className={className}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function LinkIcon({ size = 18, className }: IconProps): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M10 13a5 5 0 0 0 7.07 0l3.93-3.93a5 5 0 0 0-7.07-7.07L12 4.05" />
      <path d="M14 11a5 5 0 0 0-7.07 0L3 14.93a5 5 0 0 0 7.07 7.07L12 19.95" />
    </svg>
  );
}

export function SpeakerIcon({ size = 16, className }: IconProps): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" className={className}>
      <path d="M5 9v6h4l5 4V5L9 9H5z" strokeLinejoin="round" />
      <path d="M17 8a5 5 0 0 1 0 8" strokeLinecap="round" />
    </svg>
  );
}

export function MusicNoteIcon({ size = 22, className }: IconProps): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className={className}>
      <path d="M9 18V5l12-2v13" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

export function FolderIcon({ size = 18, className }: IconProps): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className={className}>
      <path d="M3 7v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-7l-2-2H5a2 2 0 0 0-2 2z" />
    </svg>
  );
}

export function HeartIcon({ size = 22, className }: IconProps): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" className={className}>
      <path d="M12 21s-7-4.5-9.5-9C0.5 8 3 4 7 4c2 0 3.5 1 5 3 1.5-2 3-3 5-3 4 0 6.5 4 4.5 8C19 16.5 12 21 12 21z" strokeLinejoin="round" />
    </svg>
  );
}

export function LibraryIcon({ size = 22, className }: IconProps): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" className={className}>
      <path d="M4 19V5l16-2v14" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6.5" cy="19" r="2.5" />
      <circle cx="17.5" cy="17" r="2.5" />
    </svg>
  );
}

export function RadioIcon({ size = 22, className }: IconProps): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" className={className}>
      <path d="M5 9h14v10H5z" />
      <path d="M5 9l9-4" strokeLinecap="round" />
      <circle cx="9" cy="14" r="2" />
    </svg>
  );
}

export function ServiceIcon({ size = 22, className }: IconProps): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 13v-3a4 4 0 0 1 8 0v3" strokeLinecap="round" />
    </svg>
  );
}
