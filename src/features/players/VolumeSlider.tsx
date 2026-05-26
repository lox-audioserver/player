import React from 'react';
import { SpeakerIcon } from '../../components/icons';
import { clamp } from '../../services/timeFormat';

type Props = {
  /** Authoritative volume value from server state (0-100). */
  value: number;
  /** Called with the final value when the user releases the slider. */
  onCommit: (value: number) => void | Promise<void>;
};

/**
 * Volume slider with optimistic local dragging: while the user holds the
 * thumb the displayed value follows the input, then `onCommit` fires once
 * on release so the server only sees one write per gesture.
 */
export default function VolumeSlider({ value, onCommit }: Props): JSX.Element {
  const [draft, setDraft] = React.useState<number | null>(null);
  const current = draft ?? clamp(value, 0, 100);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setDraft(Number(event.target.value));
  };

  const handleCommit = (): void => {
    if (draft == null) return;
    const target = draft;
    setDraft(null);
    void onCommit(target);
  };

  return (
    <div className="player-bar__volume">
      <span className="player-bar__volume-icon" aria-hidden="true">
        <SpeakerIcon />
      </span>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={current}
        onChange={handleChange}
        onMouseUp={handleCommit}
        onTouchEnd={handleCommit}
        onKeyUp={handleCommit}
        aria-label="Volume"
      />
      <span className="player-bar__volume-value">{current}</span>
    </div>
  );
}
