import React, {useState} from 'react';
import {VORCHAN_LIBRARY_RECORD as VORCHAN} from '../shared/vorchan-trial-library.mjs';
import DiceRoller from './DiceRoller.jsx';

function YesNo({question, value, onChange}) {
  return <fieldset className="question-prompt">
    <legend>{question}</legend>
    <div className="yes-no-options">
      <button type="button" className={value === true ? 'selected' : 'secondary'} aria-pressed={value === true} onClick={() => onChange(true)}>Yes</button>
      <button type="button" className={value === false ? 'selected' : 'secondary'} aria-pressed={value === false} onClick={() => onChange(false)}>No</button>
    </div>
  </fieldset>;
}

export default function ShipActionPanel({ship, detail, userId, onAction, onError}) {
  const [busy, setBusy] = useState(false);
  const [purchaseThrust, setPurchaseThrust] = useState(null);
  const [extraEW, setExtraEW] = useState(null);
  const [deactivate, setDeactivate] = useState(null);
  const [defensive, setDefensive] = useState(null);
  const [offensive, setOffensive] = useState(null);
  const [purchased, setPurchased] = useState(0);
  const [ewPurchase, setEwPurchase] = useState(1);
  const [deactivated, setDeactivated] = useState([]);
  const [defensivePoints, setDefensivePoints] = useState(1);
  const [offensivePoints, setOffensivePoints] = useState(1);
  const [targetId, setTargetId] = useState('');
  if (!ship || !detail || ship.owner_id !== userId || !['power', 'initiative', 'ew_commit'].includes(detail.game.phase_id)) return null;

  const phase = detail.game.phase_id;
  const trialShip = ship.public_state?.libraryId === VORCHAN.id;
  const trial = ship.private_state?.trial;
  const already = phase === 'power' ? trial?.powerAllocation?.turn === detail.game.turn
    : phase === 'ew_commit' ? (trial?.ewAllocation?.turn === detail.game.turn || ship.private_state?.scs?.ew?.committedTurn === detail.game.turn)
      : (trial?.initiative?.turn === detail.game.turn || ship.private_state?.scs?.initiative?.turn === detail.game.turn);
  const enemyShips = detail.ships.filter(candidate => candidate.owner_id !== userId);
  const availableEW = VORCHAN.sensorStrength + (trial?.powerAllocation?.turn === detail.game.turn ? trial.powerAllocation.extraEW : 0);
  const selectedTargetId = enemyShips.some(candidate => candidate.id === targetId) ? targetId : enemyShips[0]?.id || '';
  const ewSpend = (defensive ? defensivePoints : 0) + (offensive && selectedTargetId ? offensivePoints : 0);
  const completedPrompt = phase === 'power' ? purchaseThrust !== null && extraEW !== null && deactivate !== null
    : phase === 'ew_commit' ? defensive !== null && offensive !== null : true;

  async function perform(path, body) {
    setBusy(true);
    onError?.('');
    try {
      await onAction(path, {...body, shipId: ship.id, expectedRevision: detail.game.revision});
    } catch (error) {
      onError?.(error.message);
    } finally {
      setBusy(false);
    }
  }

  const commitPower = () => perform('trial-power', {
    purchasedThrust: purchaseThrust ? purchased : 0,
    extraEW: extraEW ? ewPurchase : 0,
    deactivated: deactivate ? deactivated : []
  });

  const commitEW = () => {
    const order = {
      defensive: defensive ? defensivePoints : 0,
      offensive: offensive && selectedTargetId && offensivePoints > 0 ? {[selectedTargetId]: offensivePoints} : {}
    };
    return trialShip
      ? perform('trial-ew', {defensive: order.defensive, offensive: order.offensive})
      : perform('ship-rules', {action: 'allocate-ew', order});
  };

  return <section className="panel ship-action-panel">
    <h2>{ship.label} — {phase === 'power' ? 'Power allocation' : phase === 'initiative' ? 'Initiative roll' : 'Electronic warfare'}</h2>
    {already ? <p className="success">This ship’s {phase === 'ew_commit' ? 'EW allocation' : phase === 'initiative' ? 'initiative roll' : 'power allocation'} is recorded for turn {detail.game.turn}.</p> : !detail.needsAction ? <p className="hint">This ship’s {phase === 'power' ? 'power allocation' : phase === 'initiative' ? 'initiative roll' : 'EW allocation'} is waiting for your turn to act.</p> : <>
      {!trialShip && phase === 'power' && <p>This SCS power budget is not yet executable in the prototype. Record the ruling in the phase notes; the server will not claim to validate an allocation it cannot calculate.</p>}
      {!trialShip && phase === 'ew_commit' && <p>EW points and opposing targets are checked against this ship’s imported SCS on submission.</p>}
      {phase === 'initiative' && <>
        <p>Roll one d20 for this ship. Its SCS initiative bonus and current speed modifier are added by the server after the roll is recorded.</p>
        <DiceRoller dice={[{id: 'initiative', label: 'Initiative', sides: 20}]} label="Roll initiative d20" disabled={busy || !detail.needsAction} onRoll={async results => {
          const route = trialShip ? 'trial-roll' : 'ship-rules';
          await perform(route, {action: 'roll-initiative', roll: results[0].value});
        }}/>
      </>}
      {phase === 'power' && trialShip && <>
        <p>Available: +{VORCHAN.extraPower} reactor power; {VORCHAN.engineEfficiency.power} power per purchased thrust. Deactivated weapon systems return only their printed power cost.</p>
        <YesNo question="Do you want to purchase extra thrust?" value={purchaseThrust} onChange={value => {setPurchaseThrust(value); if (!value) setPurchased(0);}} />
        {purchaseThrust && <label>Extra thrust to purchase <input type="number" min="0" max="20" value={purchased} onChange={event => setPurchased(Math.max(0, Math.floor(Number(event.target.value) || 0)))}/><small>Power cost: {purchased * VORCHAN.engineEfficiency.power}. The server checks the remaining reactor budget.</small></label>}
        <YesNo question="Do you want to purchase additional sensor EW?" value={extraEW} onChange={value => {setExtraEW(value); if (!value) setEwPurchase(0); else setEwPurchase(1);}} />
        {extraEW && <label>Additional EW purchased <input type="number" min="1" max="1" value={ewPurchase} onChange={event => setEwPurchase(Math.max(1, Math.min(1, Number(event.target.value) || 1)))}/><small>The first extra EW point costs {VORCHAN.sensorStrength + 1} power. The Vorchan library currently supports one purchasable point.</small></label>}
        <YesNo question="Do you wish to deactivate weapon systems for power?" value={deactivate} onChange={value => {setDeactivate(value); if (!value) setDeactivated([]);}} />
        {deactivate && <fieldset><legend>Systems to deactivate</legend>{VORCHAN.weaponMounts.map(mount => {
          const weapon = VORCHAN.weapons.find(item => item.id === mount.weaponId);
          const checked = deactivated.includes(mount.id);
          const destroyed = trial?.destroyedSystems?.includes(mount.id);
          return <label key={mount.id} className="check-row"><input type="checkbox" checked={checked} disabled={destroyed} onChange={event => setDeactivated(previous => event.target.checked ? [...previous, mount.id] : previous.filter(id => id !== mount.id))}/>{mount.id.replaceAll('_', ' ')} — {weapon.name}, {weapon.powerRequired} power{destroyed ? ' (destroyed; no power can be released)' : ''}</label>;
        })}</fieldset>}
        <button type="button" disabled={busy || !detail.needsAction || !completedPrompt} onClick={commitPower}>{busy ? 'Saving allocation…' : 'Commit power allocation'}</button>
      </>}
      {phase === 'ew_commit' && <>
        {trialShip && <p>Available EW: {availableEW} ({VORCHAN.sensorStrength} free from the Vorchan sensors{trial?.powerAllocation?.turn === detail.game.turn && trial.powerAllocation.extraEW ? ' + 1 purchased' : ''}). Total allocations cannot exceed this pool.</p>}
        <YesNo question="Do you want to assign defensive EW?" value={defensive} onChange={value => {setDefensive(value); if (!value) setDefensivePoints(0); else setDefensivePoints(1);}} />
        {defensive && <label>Defensive EW points <input type="number" min="0" max={trialShip ? availableEW : undefined} value={defensivePoints} onChange={event => setDefensivePoints(Math.max(0, Math.floor(Number(event.target.value) || 0)))}/></label>}
        <YesNo question="Do you want to assign offensive EW to an enemy?" value={offensive} onChange={value => {setOffensive(value); if (!value) setOffensivePoints(0); else setOffensivePoints(1);}} />
        {offensive && <>
          {enemyShips.length ? <label>Enemy target <select value={selectedTargetId} onChange={event => setTargetId(event.target.value)}>{enemyShips.map(enemy => <option key={enemy.id} value={enemy.id}>{enemy.label}</option>)}</select></label> : <p>No enemy ship is available to target.</p>}
          <label>Offensive EW points <input type="number" min="0" max={trialShip ? availableEW : undefined} value={offensivePoints} onChange={event => setOffensivePoints(Math.max(0, Math.floor(Number(event.target.value) || 0)))}/></label>
        </>}
        {trialShip && <p className={ewSpend > availableEW ? 'error' : ''}>Remaining after these answers: {availableEW - ewSpend} EW.</p>}
        <button type="button" disabled={busy || !detail.needsAction || !completedPrompt || trialShip && ewSpend > availableEW || offensive && !selectedTargetId} onClick={commitEW}>{busy ? 'Saving EW allocation…' : 'Commit EW allocation'}</button>
      </>}
    </>}
  </section>;
}
