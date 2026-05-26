import { NextTrackIcon, PauseIcon, PlayIcon, PrevTrackIcon } from '../../components/icons';

type Props = {
  playing: boolean;
  onPrev: () => void;
  onToggle: () => void;
  onNext: () => void;
};

export default function TransportControls({ playing, onPrev, onToggle, onNext }: Props): JSX.Element {
  return (
    <div className="player-bar__controls">
      <button type="button" className="player-bar__btn" onClick={onPrev} aria-label="Previous track">
        <PrevTrackIcon size={20} />
      </button>
      <button
        type="button"
        className="player-bar__btn player-bar__btn--primary"
        onClick={onToggle}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? <PauseIcon size={24} /> : <PlayIcon size={24} />}
      </button>
      <button type="button" className="player-bar__btn" onClick={onNext} aria-label="Next track">
        <NextTrackIcon size={20} />
      </button>
    </div>
  );
}
