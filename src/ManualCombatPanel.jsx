import React, {useMemo, useState} from 'react';

export default function ManualCombatPanel({detail, fireView, preflight, isHost, onResolve, busy, error}) {
  const [resolutions, setResolutions] = useState({});
  const attacks = useMemo(() => (fireView?.declarations || []).flatMap(declaration =>
    (declaration.fire?.shots || []).filter(shot => shot.role === 'offensive').map(shot => ({...shot, attackId: [shot.shipId, shot.mountId, shot.gun].join(':')}))
  ), [fireView]);
  const interceptions = useMemo(() => (fireView?.assignments || []).flatMap(declaration =>
    (declaration.defence?.assignments || []).map(assignment => ({...assignment, playerId: declaration.playerId, interceptionId: [assignment.shipId, assignment.mountId, assignment.gun].join(':')}))
  ), [fireView]);
  if (!detail || detail.game.phase_id !== 'fire_resolution' || !isHost || detail.needsAction || !(detail.readiness || []).every(player => player.submitted) || attacks.length === 0 || preflight?.damageApplied) return null;
  const ships = new Map((detail.ships || []).map(ship => [ship.id, ship]));
  const rolls = new Map((preflight?.rollJournal || []).map(roll => [roll.attackId, roll]));
  const ready = attacks.every(attack => (resolutions[attack.attackId] || '').trim().length >= 12) && interceptions.every(assignment => (resolutions[assignment.interceptionId] || '').trim().length >= 12);
  return <section className="panel manual-combat">
    <h2>Manual fire adjudication</h2>
    <p>The Vorchan damage diagram is still incomplete, so the automatic damage path may be blocked. The host can record each declared attack here and continue the turn. These notes are saved for both players; they do not mark damage boxes on the digital SCS.</p>
    {(preflight?.blockers || []).length > 0 && <details><summary>{preflight.blockers.length} automatic-resolution blocker(s)</summary><ul>{preflight.blockers.map((blocker, index) => <li key={index}>{blocker.attackId}: {(blocker.blockers || []).join('; ')}</li>)}</ul></details>}
    {attacks.map(attack => {
      const shooter = ships.get(attack.shipId);
      const target = ships.get(attack.targetId);
      const roll = rolls.get(attack.attackId);
      return <div className="manual-attack" key={attack.attackId}>
        <strong>{shooter?.label || 'Attacking ship'} · {attack.mountId.replaceAll('_', ' ')} gun {attack.gun} → {target?.label || 'target'}</strong>
        <p>Attacker’s recorded rolls: attack {roll?.roll ?? '—'} · hit location {roll?.locationRoll ?? '—'} · primary chart {roll?.primaryRoll ?? '—'}{roll?.damageDice?.length ? ' · damage dice ' + roll.damageDice.join(', ') : ''}</p>
        <label>Manual result, including hit/miss and damage allocation
          <textarea value={resolutions[attack.attackId] || ''} maxLength={1000} onChange={event => setResolutions(old => ({...old, [attack.attackId]: event.target.value}))} placeholder="Record the rule result and where any damage was applied on the printed SCS." />
        </label>
      </div>;
    })}
    {interceptions.length > 0 && <>
      <h3>Defensive interceptions</h3>
      {interceptions.map(assignment => {
        const ship = ships.get(assignment.shipId);
        const attack = attacks.find(item => item.attackId === assignment.attackId);
        return <div className="manual-attack" key={assignment.interceptionId}>
          <strong>{ship?.label || 'Defending ship'} · {assignment.mountId.replaceAll('_', ' ')} gun {assignment.gun} against {attack?.mountId.replaceAll('_', ' ') || 'incoming fire'}</strong>
          <label>Manual interception result
            <textarea value={resolutions[assignment.interceptionId] || ''} maxLength={1000} onChange={event => setResolutions(old => ({...old, [assignment.interceptionId]: event.target.value}))} placeholder="Record the interception roll and its effect on the incoming attack." />
          </label>
        </div>;
      })}
    </>}
    {error && <p className="error">{error}</p>}
    <button disabled={busy || !ready} onClick={() => onResolve({attacks: attacks.map(attack => ({attackId: attack.attackId, resolution: resolutions[attack.attackId]})), interceptions: interceptions.map(assignment => ({interceptionId: assignment.interceptionId, resolution: resolutions[assignment.interceptionId]}))})}>{busy ? 'Saving adjudication…' : 'Save manual results and continue'}</button>
  </section>;
}
