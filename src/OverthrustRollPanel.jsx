import React from 'react';
import {VORCHAN_LIBRARY_RECORD as VORCHAN} from '../shared/vorchan-trial-library.mjs';
import {overthrustChecksForTurn} from '../shared/thruster-criticals.mjs';
import DiceRoller from './DiceRoller.jsx';

export default function OverthrustRollPanel({detail, userId, rolls, onChange}) {
  if (!detail || detail.game.phase_id !== 'criticals' || !detail.needsAction) return null;
  const checks = (detail.ships || []).filter(ship => ship.owner_id === userId && ship.public_state?.libraryId === VORCHAN.id)
    .flatMap(ship => {
      const trial = ship.private_state?.trial;
      if (!trial?.movement || trial.overthrustResolvedTurn === detail.game.turn) return [];
      return overthrustChecksForTurn(trial.movement.thrusterLedger || {}, trial.thrusterDamageBoxes || {}).map(check => ({ship, check}));
    });
  return <section className="panel overthrust-rolls">
    <h2>End of turn overthrust checks</h2>
    {checks.length ? <>
      <p>Roll one d20 for each thruster that exceeded its printed rating. The modifier is listed beside each die; the server records the result and applies the verified critical table.</p>
      {checks.map(({ship, check}) => {
        const value = rolls?.[ship.id]?.[check.id];
        return <div className="player-roll-row" key={ship.id + ':' + check.id}>
          <h3>{ship.label} · {check.id.replaceAll('_', ' ')}</h3>
          <p>{check.used} thrust used against rating {check.rating} · overthrust modifier +{check.modifier}.</p>
          {Number.isInteger(value) ? <p className="success">Your recorded d20 result: {value}.</p> : <DiceRoller dice={[{id: 'critical', label: 'Overthrust', sides: 20}]} label="Roll overthrust d20" onRoll={async results => onChange(previous => ({...previous, [ship.id]: {...(previous?.[ship.id] || {}), [check.id]: results[0].value}}))}/>}
        </div>;
      })}
    </> : <p>No overthrust checks are due for your ships this turn.</p>}
  </section>;
}
