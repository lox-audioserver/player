import React from 'react';
import { clamp } from '../services/timeFormat';

type Args = {
  /** Server-provided elapsed seconds (audio_event `time`). */
  baseTime: number;
  /** Total track length in seconds; 0 means "unknown / live stream". */
  durationSec: number;
  /** Whether the zone is currently playing. */
  playing: boolean;
  /** Track identity — used to reset the baseline when the song changes. */
  audiopath: string;
};

/**
 * Returns the locally-interpolated elapsed seconds for the active track.
 * The server only emits `time` once per second; this hook keeps a 2 Hz tick
 * going while the zone is playing so the seek bar moves smoothly.
 */
export function useLiveElapsed({ baseTime, durationSec, playing, audiopath }: Args): number {
  const baselineRef = React.useRef<{ elapsed: number; receivedAt: number }>({
    elapsed: baseTime,
    receivedAt: Date.now(),
  });
  const [, setTick] = React.useState(0);

  React.useEffect(() => {
    baselineRef.current = { elapsed: baseTime, receivedAt: Date.now() };
  }, [baseTime, audiopath]);

  React.useEffect(() => {
    if (!playing || durationSec <= 0) return undefined;
    const id = window.setInterval(() => setTick((t) => t + 1), 500);
    return () => window.clearInterval(id);
  }, [playing, durationSec]);

  if (!playing) return baseTime;
  const drift = (Date.now() - baselineRef.current.receivedAt) / 1000;
  const candidate = baselineRef.current.elapsed + drift;
  return durationSec > 0 ? clamp(candidate, 0, durationSec) : candidate;
}
