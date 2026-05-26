import React from 'react';
import { CloseIcon } from '../../components/icons';
import type { LoxoneZoneState } from '../../services/playersStream';
import { dissolveGroup, setGroup } from '../../services/playersApi';

type Props = {
  /** Zone the group will be built around — becomes the group's leader on save. */
  leader: LoxoneZoneState;
  /** All zones the user can pick from (typically every known zone). */
  zones: LoxoneZoneState[];
  onClose: () => void;
};

function membersOf(state: LoxoneZoneState | undefined): number[] {
  if (!state || !Array.isArray(state.syncedzones)) return [];
  return state.syncedzones.filter((id) => id !== state.playerid);
}

/**
 * Lightweight bottom-sheet style picker for the Loxone "link zones" feature.
 * Initial selection mirrors the current group; "Apply" creates or updates the
 * dynamic group via the standard `dgroup/update` command, "Ungroup" tears the
 * group down through the same endpoint with no member list.
 */
export default function GroupPicker({ leader, zones, onClose }: Props): JSX.Element {
  const initialMembers = React.useMemo(() => new Set(membersOf(leader)), [leader]);
  const [selected, setSelected] = React.useState<Set<number>>(initialMembers);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const otherZones = React.useMemo(
    () => zones.filter((z) => z.playerid !== leader.playerid),
    [zones, leader.playerid],
  );

  const toggle = (zoneId: number): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(zoneId)) next.delete(zoneId);
      else next.add(zoneId);
      return next;
    });
  };

  const handleApply = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      if (selected.size === 0) {
        // No followers selected — interpret as "dissolve" so the leader stays
        // standalone. The server treats a 1-zone group as no group at all.
        if (initialMembers.size > 0) {
          await dissolveGroup(leader.playerid);
        }
      } else {
        const ids = [leader.playerid, ...Array.from(selected)];
        await setGroup(ids);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update group');
    } finally {
      setBusy(false);
    }
  };

  const handleUngroup = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      await dissolveGroup(leader.playerid);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to ungroup');
    } finally {
      setBusy(false);
    }
  };

  const hasExistingGroup = initialMembers.size > 0;

  return (
    <div className="group-picker" role="dialog" aria-label="Group zones">
      <div className="group-picker__backdrop" onClick={onClose} />
      <div className="group-picker__sheet">
        <header className="group-picker__header">
          <div>
            <p className="group-picker__eyebrow">Link zones</p>
            <h2 className="group-picker__title">{leader.name}</h2>
            <p className="group-picker__hint">
              Pick zones to play together with this one. They follow this zone's transport.
            </p>
          </div>
          <button
            type="button"
            className="group-picker__close"
            onClick={onClose}
            aria-label="Close"
          >
            <CloseIcon size={20} />
          </button>
        </header>

        {otherZones.length === 0 ? (
          <p className="group-picker__empty">No other zones available.</p>
        ) : (
          <ul className="group-picker__list">
            {otherZones.map((zone) => {
              const checked = selected.has(zone.playerid);
              return (
                <li key={zone.playerid}>
                  <label className={`group-picker__item ${checked ? 'is-checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(zone.playerid)}
                      disabled={busy}
                    />
                    <div className="group-picker__item-meta">
                      <p className="group-picker__item-name">{zone.name}</p>
                      <p className="group-picker__item-state">
                        {zone.mode === 'play' ? 'Playing' : zone.mode === 'pause' ? 'Paused' : 'Idle'}
                      </p>
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        {error && <p className="group-picker__error" role="alert">{error}</p>}

        <footer className="group-picker__actions">
          {hasExistingGroup && (
            <button
              type="button"
              className="group-picker__btn group-picker__btn--ghost"
              onClick={() => void handleUngroup()}
              disabled={busy}
            >
              Ungroup
            </button>
          )}
          <div className="group-picker__actions-right">
            <button
              type="button"
              className="group-picker__btn"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="group-picker__btn group-picker__btn--primary"
              onClick={() => void handleApply()}
              disabled={busy || otherZones.length === 0}
            >
              {busy ? 'Applying…' : 'Apply'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
