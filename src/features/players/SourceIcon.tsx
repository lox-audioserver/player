import {
  FolderIcon,
  HeartIcon,
  LibraryIcon,
  MusicNoteIcon,
  RadioIcon,
  ServiceIcon,
} from '../../components/icons';

export type SourceIconKind = 'favorites' | 'library' | 'radio-root' | 'radio' | 'service';

export function SourceIcon({ kind }: { kind: SourceIconKind }): JSX.Element {
  if (kind === 'favorites') return <HeartIcon />;
  if (kind === 'library') return <LibraryIcon />;
  if (kind === 'radio-root' || kind === 'radio') return <RadioIcon />;
  return <ServiceIcon />;
}

export function ItemTypeIcon({ isFolder }: { type: number; isFolder: boolean }): JSX.Element {
  return isFolder ? <FolderIcon /> : <MusicNoteIcon size={18} />;
}
