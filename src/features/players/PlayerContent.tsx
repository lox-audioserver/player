import type { LoxoneZoneState } from '../../services/playersStream';
import PlayerServices from './PlayerServices';

type Props = {
  /** Active zone to play into. When null, the browser still works but play actions show a hint. */
  state: LoxoneZoneState | null;
};

/**
 * Main content of the player app: a content browser (services / library /
 * radio / spotify / favorites). Now-playing detail and queue live in the
 * PlayerSheet overlay that opens from the bottom bar.
 */
export default function PlayerContent({ state }: Props): JSX.Element {
  return (
    <div className="player-content">
      <PlayerServices zoneId={state?.playerid ?? null} />
    </div>
  );
}
