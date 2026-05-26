import React from 'react';
import { clamp, formatTime } from '../../services/timeFormat';

type Props = {
  elapsedSec: number;
  durationSec: number;
  /** Called with the new seek target in seconds. */
  onSeek: (targetSec: number) => void | Promise<void>;
};

export default function SeekBar({ elapsedSec, durationSec, onSeek }: Props): JSX.Element {
  const progressPct = durationSec > 0 ? clamp((elapsedSec / durationSec) * 100, 0, 100) : 0;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    if (durationSec <= 0) return;
    const ratio = Number(event.target.value) / 100;
    void onSeek(ratio * durationSec);
  };

  return (
    <div className="player-bar__seek">
      <span className="player-bar__time">{formatTime(elapsedSec)}</span>
      <input
        type="range"
        min={0}
        max={100}
        step={0.1}
        value={progressPct}
        onChange={handleChange}
        disabled={durationSec <= 0}
        aria-label="Seek"
      />
      <span className="player-bar__time">{durationSec > 0 ? formatTime(durationSec) : '∞'}</span>
    </div>
  );
}
