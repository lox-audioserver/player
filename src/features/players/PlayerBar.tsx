import { CloseIcon, LinkIcon, MusicNoteIcon } from '../../components/icons';
import { useLiveElapsed } from '../../hooks/useLiveElapsed';
import {
  next as nextTrack,
  pause as pausePlayback,
  play as playPlayback,
  previous as previousTrack,
  seek,
  setMasterVolume,
  setVolume,
} from '../../services/playersApi';
import type { LoxoneZoneState } from '../../services/playersStream';
import { clamp } from '../../services/timeFormat';
import SeekBar from './SeekBar';
import TransportControls from './TransportControls';
import VolumeSlider from './VolumeSlider';

type Props = {
  state: LoxoneZoneState;
  /** Optional close button; omit for a persistent bar tied to the active zone. */
  onClose?: () => void;
  /** Click on the bar (outside controls) expands into the full PlayerSheet. */
  onExpand?: () => void;
  /** Open the group picker dialog. */
  onLink?: () => void;
  /** All known zones; used to resolve names of grouped followers. */
  allZones?: LoxoneZoneState[];
};

type GroupInfo = {
  isInGroup: boolean;
  isLeader: boolean;
  memberNames: string[];
};

function deriveGroupInfo(state: LoxoneZoneState, allZones?: LoxoneZoneState[]): GroupInfo {
  const members = (state.syncedzones ?? []).filter((id) => id !== state.playerid);
  const isInGroup = members.length > 0;
  const isLeader = isInGroup && state.syncedzones?.[0] === state.playerid;
  const memberNames = isInGroup && allZones
    ? members
        .map((id) => allZones.find((z) => z.playerid === id)?.name)
        .filter((n): n is string => Boolean(n))
    : [];
  return { isInGroup, isLeader: Boolean(isLeader), memberNames };
}

function groupBadgeText(memberNames: string[]): string | null {
  if (memberNames.length === 0) return null;
  if (memberNames.length === 1) return memberNames[0] ?? null;
  return `${memberNames.length} zones`;
}

export default function PlayerBar({ state, onClose, onExpand, onLink, allZones }: Props): JSX.Element {
  const playing = state.mode === 'play';
  const coverUrl = state.coverurl?.trim() ?? '';

  const baseTime = Number.isFinite(state.time) ? state.time : 0;
  const durationSec = Number.isFinite(state.duration) && state.duration > 0 ? state.duration : 0;
  const elapsedSec = useLiveElapsed({ baseTime, durationSec, playing, audiopath: state.audiopath });
  const progressPct = durationSec > 0 ? clamp((elapsedSec / durationSec) * 100, 0, 100) : 0;

  const group = deriveGroupInfo(state, allZones);
  const badgeText = groupBadgeText(group.memberNames);

  // When this zone leads a group, both the slider value and the commit target
  // are the group-wide master volume so all followers track in lockstep.
  const liveVolume = group.isLeader && typeof state.mastervolume === 'number'
    ? state.mastervolume
    : state.volume ?? 0;
  const commitVolume = (target: number): Promise<void> =>
    group.isLeader ? setMasterVolume(state.playerid, target) : setVolume(state.playerid, target);

  const trackTitle = state.title?.trim() || state.station?.trim() || '—';
  const trackArtist = state.artist?.trim() ?? '';
  const trackAlbum = state.album?.trim() ?? '';
  const subline = [trackArtist, trackAlbum].filter(Boolean).join(' · ');

  return (
    <div className={`player-bar ${playing ? 'is-playing' : ''}`} role="region" aria-label={`Player for ${state.name}`}>
      <div className="player-bar__progress-track" aria-hidden="true">
        <div className="player-bar__progress-fill" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="player-bar__row">
        <button
          type="button"
          className={`player-bar__left ${onExpand ? 'is-clickable' : ''}`}
          onClick={onExpand}
          aria-label={onExpand ? `Open full player for ${state.name}` : undefined}
          disabled={!onExpand}
        >
          <div className="player-bar__cover">
            {coverUrl ? (
              <img src={coverUrl} alt="" loading="lazy" />
            ) : (
              <div className="player-bar__cover-placeholder" aria-hidden="true">
                <MusicNoteIcon />
              </div>
            )}
          </div>
          <div className="player-bar__meta">
            <p className="player-bar__zone">
              {state.name}
              {badgeText && (
                <span className="player-bar__zone-link" title={`Linked: ${group.memberNames.join(', ')}`}>
                  {' '}+ {badgeText}
                </span>
              )}
            </p>
            <p className="player-bar__title" title={trackTitle}>{trackTitle}</p>
            {subline && <p className="player-bar__subline" title={subline}>{subline}</p>}
          </div>
        </button>

        <div className="player-bar__center">
          <TransportControls
            playing={playing}
            onPrev={() => void previousTrack(state.playerid)}
            onToggle={() => void (playing ? pausePlayback(state.playerid) : playPlayback(state.playerid))}
            onNext={() => void nextTrack(state.playerid)}
          />
          <SeekBar
            elapsedSec={elapsedSec}
            durationSec={durationSec}
            onSeek={(target) => seek(state.playerid, target)}
          />
        </div>

        <div className="player-bar__right">
          {onLink && (
            <button
              type="button"
              className={`player-bar__btn player-bar__btn--link ${group.isInGroup ? 'is-linked' : ''}`}
              onClick={onLink}
              aria-label={group.isInGroup ? 'Manage linked zones' : 'Link zones'}
              title={group.isInGroup ? 'Linked zones' : 'Link zones'}
            >
              <LinkIcon />
            </button>
          )}
          <VolumeSlider value={liveVolume} onCommit={commitVolume} />
          {onClose && (
            <button
              type="button"
              className="player-bar__close"
              onClick={onClose}
              aria-label="Close player"
            >
              <CloseIcon />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
