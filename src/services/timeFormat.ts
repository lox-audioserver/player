export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** `m:ss` formatter used by the player UI for seek positions and durations. */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
