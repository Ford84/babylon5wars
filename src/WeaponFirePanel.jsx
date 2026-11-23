import React, {useMemo, useState} from 'react';
import {VORCHAN_LIBRARY_RECORD as VORCHAN} from '../shared/vorchan-trial-library.mjs';
import {checkMountArc, facingDirections, targetFireControlIndex, weaponRangePenalty} from '../shared/weapon-targeting.mjs';
import {hexDistance} from '../shared/phases.mjs';
import {weaponReadiness} from '../shared/weapon-readiness.mjs';
import {attackId} from '../shared/weapon-resolution.mjs';
import {vorchanHitToken} from '../shared/vorchan-damage.mjs';
import DiceRoller from './DiceRoller.jsx';

const mounts = VORCHAN.weaponMounts;
const displayName = mountId => mounts.find(mount => mount.id === mountId)?.id.replaceAll('_', ' ') || mountId;
const diceCount = shot => shot.mountId === 'plasma_forward' ? (shot.chargeTurns === 3 ? 4 : shot.chargeTurns) : 1;

function diceFor(shot) {
  return [
    {id: 'hit', label: 'Attack', sides: 20},
    {id: 'location', label: 'Location', sides: 20},
    {id: 'chart', label: 'Primary chart', sides: 20},
    ...Array.from({length: diceCount(shot)}, (_, index) => ({id: 'damage-' + index, label: 'Damage ' + (index + 1), sides: 10}))
  ];
}

function ArcPlot({ship, ships, mount, targetId, onTarget}) {
  const range = 10, facing = -60 + ship.facing * 60, half = mount.arc.coverageDegrees / 2;
  const points = Array.from({length: 61}, (_, index) => {
    const angle = (facing - half + index * 2 * half / 60) * Math.PI / 180;
    return [100 + range * 7 * Math.cos(angle), 100 + range * 7 * Math.sin(angle)];
  });
  const path = 'M100 100 L' + points.map(point => point.join(' ')).join(' L') + ' Z';
  const xy = point => ({x: Math.sqrt(3) * (point.q + point.r / 2), y: 1.5 * point.r});
  return <svg className="weapon-arc-map" viewBox="0 0 200 200" role="img" aria-label={mount.arc.coverageDegrees + ' degree ' + displayName(mount.id) + ' firing arc'}>
    <circle cx="100" cy="100" r="70" fill="none" stroke="#43637b" strokeDasharray="3 5"/>
    <path d={path} fill="#59a8db" fillOpacity=".17" stroke="#8bcdf2" strokeWidth="1"/>
    <line x1="100" y1="100" x2={100 + 75 * Math.cos(facing * Math.PI / 180)} y2={100 + 75 * Math.sin(facing * Math.PI / 180)} stroke="#f1d39b" strokeWidth="1.5"/>
    <circle cx="100" cy="100" r="5" fill="#f1d39b"/>
    {ships.filter(other => other.id !== ship.id).map(other => {
      const point = xy(other), origin = xy(ship), dx = point.x - origin.x, dy = point.y - origin.y;
      const distance = Math.hypot(dx, dy) || 1, scale = Math.min(65 / distance, 7), x = 100 + dx * scale, y = 100 + dy * scale;
      const legal = checkMountArc({shooter: ship, target: other, arc: mount.arc}).allowed;
      return <g key={other.id} onClick={() => onTarget(other.id)} style={{cursor: 'pointer'}}>
        <circle cx={x} cy={y} r="7" fill={legal ? '#66bfb5' : '#a25d63'} stroke={targetId === other.id ? 'white' : '#a8c4d8'} strokeWidth={targetId === other.id ? 2 : 1}/>
        <text x={x} y={y - 11} fill="#eaf5ff" fontSize="8" textAnchor="middle">{other.label || other.id.slice(0, 7)}</text>
      </g>;
    })}
  </svg>;
}

function WeaponCard({mount, target, shooter, turn, targetDefensiveEW, selectedGuns, onToggleGun, chargeTurns, onChargeTurns, reservedKeys = [], fire}) {
  const weapon = VORCHAN.weapons.find(item => item.id === mount.weaponId);
  const arc = target ? checkMountArc({shooter, target, arc: mount.arc}) : null;
  const distance = target ? hexDistance(shooter, target) : null;
  const baseRangePenalty = target ? weaponRangePenalty({range: distance, penaltyPerStep: weapon.rangePenaltyPerHex}) : null;
  const ewAllocation = shooter.private_state?.trial?.ewAllocation;
  const offensiveEW = target && ewAllocation?.turn === turn ? ewAllocation.offensive?.[target.id] || 0 : null;
  const rangePenalty = target && offensiveEW !== null ? baseRangePenalty * (offensiveEW > 0 ? 1 : 2) : null;
  const incoming = target ? facingDirections(shooter, target) : null;
  const verifiedVorchanTarget = target?.public_state?.libraryId === VORCHAN.id;
  const targetHullClass = verifiedVorchanTarget ? VORCHAN.class : target?.public_state?.hullClass || null;
  const targetDefence = verifiedVorchanTarget && target && !incoming.requiresChoice ? VORCHAN.defence[incoming.direction] : null;
  let fireControl = null;
  try { if (targetHullClass) fireControl = weapon.fireControl[targetFireControlIndex(targetHullClass)]; } catch {}
  const ewKnown = Number.isInteger(offensiveEW) && Number.isInteger(targetDefensiveEW);
  const targetNumber = targetDefence === null || fireControl === null || !ewKnown || rangePenalty === null ? null : targetDefence + fireControl + offensiveEW - targetDefensiveEW + rangePenalty;
  const keys = Array.from({length: mount.weaponId === 'twin-array' ? 2 : 1}, (_, index) => mount.id + ':' + (index + 1));
  const chargeOptions = weapon.firingOptions || [];
  const selectedCharge = chargeOptions.find(option => option.turns === chargeTurns);
  const damageText = mount.weaponId === 'plasma-accelerator' && selectedCharge
    ? `${selectedCharge.damageDice.count}d${selectedCharge.damageDice.sides}+${selectedCharge.damageDice.bonus} ${selectedCharge.damageDice.perHex < 0 ? `− ${Math.abs(selectedCharge.damageDice.perHex)} per hex` : ''}`.trim()
    : weapon.damage;
  const fireControlLabels = ['Capital / heavy', 'Medium / light', 'Fighter / shuttle'];
  return <article className="weapon-datacard">
    <header><h4>{weapon.name}</h4><span>{mount.arc.coverageDegrees}° arc</span></header>
    <dl className="weapon-specs">
      <dt>Class</dt><dd>{weapon.class}</dd>
      <dt>Power</dt><dd>{weapon.powerRequired}</dd>
      <dt>Range to target</dt><dd>{target ? `${distance} hexes` : 'Choose a target'}</dd>
      <dt>Range modifier</dt><dd>{target ? rangePenalty === null ? 'Pending EW allocation' : `${rangePenalty} to hit (${offensiveEW > 0 ? 'lock-on' : 'no lock-on; doubled from ' + baseRangePenalty})` : 'Shown after target selection'}</dd>
      {target && <><dt>Target defence EW</dt><dd>{Number.isInteger(targetDefensiveEW) ? `${targetDefensiveEW} (revealed allocation)` : 'Pending EW reveal'}</dd><dt>Hit number</dt><dd>{targetNumber === null ? incoming?.requiresChoice ? 'Pending boundary choice' : verifiedVorchanTarget ? 'Pending verified EW allocation' : 'Target SCS profile not supported' : `${targetNumber} or less on d20, before interception`}</dd></>}
      <dt>Damage at selected charge</dt><dd>{damageText}</dd>
      <dt>Fire control</dt><dd>{weapon.fireControl.map((value, index) => `${fireControlLabels[index]} ${value >= 0 ? '+' : ''}${value}`).join(' · ')}</dd>
      <dt>Rate</dt><dd>{weapon.rateOfFire}</dd>
    </dl>
    {target && targetNumber !== null && <p className="hint">Calculation: defence {targetDefence} + fire control {fireControl} + offensive EW {offensiveEW} − defensive EW {targetDefensiveEW} + range {rangePenalty} = {targetNumber}. Interception modifiers are applied after defensive assignments.</p>}
    {target && <p className={arc?.allowed && verifiedVorchanTarget && ewKnown ? 'success' : 'error'}>{!verifiedVorchanTarget ? 'Unavailable: target SCS defence profile is not supported by this weapon resolver.' : !ewKnown ? 'Unavailable: EW commitments have not been verified for this turn.' : arc?.allowed ? 'Target is in this weapon’s arc.' : 'Unavailable: ' + (arc?.reason || 'outside arc')} {arc?.allowed && rangePenalty !== null && `Distance penalty: ${rangePenalty}${rangePenalty < 0 ? ' to hit' : ''}.`}</p>}
    {mount.weaponId === 'plasma-accelerator' && <label>Charge interval <select value={chargeTurns} onChange={event => onChargeTurns(Number(event.target.value))}>{chargeOptions.map(option => <option key={option.turns} value={option.turns}>{option.turns} turn{option.turns === 1 ? '' : 's'} — {option.damageDice.count}d{option.damageDice.sides}+{option.damageDice.bonus}</option>)}</select></label>}
    <fieldset><legend>Guns for this target</legend>{keys.map(key => {
      const gun = Number(key.split(':').at(-1));
      let readiness;
      try { readiness = weaponReadiness({mountId: mount.id, turn, trial: shooter.private_state?.trial, gun, chargeTurns: mount.weaponId === 'plasma-accelerator' ? chargeTurns : null}); }
      catch (error) { readiness = {ready: false, reasons: [error.message]}; }
      const alreadyDeclared = fire.some(shot => shot.shipId === shooter.id && shot.mountId === mount.id && shot.gun === gun);
      const reserved = reservedKeys.includes(key);
      const usable = !!target && verifiedVorchanTarget && ewKnown && arc?.allowed && readiness.ready && !alreadyDeclared && !reserved;
      const checked = selectedGuns.includes(key);
      return <label className="check-row" key={key}>
        <input type="checkbox" checked={checked} disabled={!usable && !checked} onChange={() => onToggleGun(key)}/>
        Gun {gun} {alreadyDeclared ? '— already assigned' : reserved ? '— selected as defensive reserve' : target && !verifiedVorchanTarget ? '— target SCS not supported' : target && !ewKnown ? '— waiting for EW reveal' : !arc?.allowed && target ? '— outside arc' : !readiness.ready ? '— ' + readiness.reasons.join(', ') : '— ready'}
      </label>;
    })}</fieldset>
  </article>;
}

export default function WeaponFirePanel({phase, turn, ships = [], userId, events = [], fireView, preflight, fireDraft, onFireDraft, defenceDraft, onDefenceDraft, onCombatAction, isHost = false}) {
  const own = ships.filter(ship => ship.owner_id === userId && ship.public_state?.libraryId === VORCHAN.id);
  const enemy = ships.filter(ship => ship.owner_id !== userId);
  const [shipId, setShipId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [chargeTurns, setChargeTurns] = useState(1);
  const [priority, setPriority] = useState(1);
  const [selectedGuns, setSelectedGuns] = useState([]);
  const [reserveAnswer, setReserveAnswer] = useState(null);
  const [selectedReserves, setSelectedReserves] = useState([]);
  const [choiceError, setChoiceError] = useState('');
  const [terrainText, setTerrainText] = useState('[]');
  const [combatChoices, setCombatChoices] = useState({});
  const [combatBusy, setCombatBusy] = useState(false);
  const ship = own.find(candidate => candidate.id === shipId) || own[0];
  const target = enemy.find(candidate => candidate.id === targetId);
  const fire = useMemo(() => { try { const value = JSON.parse(fireDraft); return Array.isArray(value.shots) ? value.shots : []; } catch { return []; } }, [fireDraft]);
  const defence = useMemo(() => { try { const value = JSON.parse(defenceDraft); return Array.isArray(value.assignments) ? value.assignments : []; } catch { return []; } }, [defenceDraft]);
  const declarations = fireView?.declarations || [];
  const incoming = declarations.flatMap(declaration => (declaration.fire?.shots || []).filter(shot => shot.role === 'offensive' && own.some(candidate => candidate.id === shot.targetId)).map(shot => ({...shot, id: attackId(shot)})));
  const reserves = declarations.find(declaration => declaration.playerId === userId)?.fire?.shots.filter(shot => shot.role === 'defensive') || [];
  const ownRolls = preflight?.myRolls || [];
  const ewReveal = events.find(event => event.event_type === 'ew_allocations_revealed' && event.turn === turn)?.public?.allocations || [];
  const targetDefensiveEW = target => {
    const allocation = ewReveal.find(item => item.shipId === target?.id);
    return allocation && Number.isInteger(allocation.defensive) ? allocation.defensive : null;
  };
  const shooterEWForTarget = (shooter, target, currentTurn) => {
    const allocation = shooter?.private_state?.trial?.ewAllocation;
    if (allocation?.turn !== currentTurn) return null;
    const points = allocation.offensive?.[target?.id] ?? 0;
    return Number.isInteger(points) ? points : null;
  };

  async function combatAction(route, body) {
    setCombatBusy(true); setChoiceError('');
    try { await onCombatAction(route, body); }
    catch (error) { setChoiceError(error.message); }
    finally { setCombatBusy(false); }
  }

  function setShots(shots) { onFireDraft(JSON.stringify({shots})); setChoiceError(''); }
  function toggleGun(key) { setSelectedGuns(previous => previous.includes(key) ? previous.filter(item => item !== key) : [...previous, key]); }
  function toggleReserve(key) { setSelectedReserves(previous => previous.includes(key) ? previous.filter(item => item !== key) : [...previous, key]); }

  function addTargetWeapons() {
    if (!ship || !target) { setChoiceError('Choose an enemy target first.'); return; }
    if (target.public_state?.libraryId !== VORCHAN.id) { setChoiceError('This prototype can only resolve fire against a target with a verified Vorchan SCS.'); return; }
    if (!Number.isInteger(shooterEWForTarget(ship, target, detailTurn())) || !Number.isInteger(targetDefensiveEW(target))) { setChoiceError('EW commitments are not verified for this turn yet.'); return; }
    if (!selectedGuns.length && !(reserveAnswer && selectedReserves.length)) { setChoiceError('Select at least one ready gun for this target or a defensive reserve.'); return; }
    if (selectedGuns.some(key => selectedReserves.includes(key))) { setChoiceError('A gun cannot be assigned to an attack and held in reserve at the same time.'); return; }
    const newShots = [];
    const selectedSet = new Set(selectedGuns);
    const shots = fire.filter(shot => !(shot.shipId === ship.id && selectedSet.has(shot.mountId + ':' + shot.gun)));
    const existingOrders = shots.filter(shot => shot.role === 'offensive' && shot.shipId === ship.id && shot.targetId === target.id).map(shot => shot.order);
    let order = Math.max(priority, existingOrders.length ? Math.max(...existingOrders) + 1 : priority);
    for (const key of selectedGuns) {
      const [mountId, gunText] = key.split(':');
      const mount = mounts.find(item => item.id === mountId);
      const readiness = weaponReadiness({mountId, turn: detailTurn(), trial: ship.private_state?.trial, gun: Number(gunText), chargeTurns: mountId === 'plasma_forward' ? chargeTurns : null});
      const arc = checkMountArc({shooter: ship, target, arc: mount.arc});
      if (!readiness.ready || !arc.allowed) { setChoiceError('A selected gun is no longer ready or is outside this target’s arc. Refresh and review its status.'); return; }
      const shot = {shipId: ship.id, mountId, gun: Number(gunText), role: 'offensive', targetId: target.id, order: order++};
      if (mountId === 'plasma_forward') shot.chargeTurns = chargeTurns;
      newShots.push(shot);
    }
    const reserveKeys = new Set(reserveAnswer ? selectedReserves : []);
    const updated = shots.filter(shot => !(shot.shipId === ship.id && shot.role === 'defensive' && reserveKeys.has(shot.mountId + ':' + shot.gun)));
    for (const key of reserveKeys) {
      const [mountId, gunText] = key.split(':');
      updated.push({shipId: ship.id, mountId, gun: Number(gunText), role: 'defensive'});
    }
    setShots([...updated, ...newShots]);
    setSelectedGuns([]); setSelectedReserves([]); setReserveAnswer(null);
  }

  function detailTurn() { return preflight?.turn || fireView?.turn || turn || 1; }
  function allocate(reserve, attack) {
    const key = attackId(reserve);
    onDefenceDraft(JSON.stringify({assignments: [...defence.filter(item => attackId(item) !== key), {shipId: reserve.shipId, mountId: reserve.mountId, gun: reserve.gun, attackId: attack}]}));
  }

  const allOffensive = declarations.flatMap(declaration => (declaration.fire?.shots || []).filter(shot => shot.role === 'offensive').map(shot => ({...shot, attackId: attackId(shot)})));
  const unrolled = allOffensive.filter(shot => !ownRolls.some(roll => roll.attackId === shot.attackId) && shot.shipId && ships.find(candidate => candidate.id === shot.shipId)?.owner_id === userId);

  return <section className="panel weapon-fire-ui" id="weapon-fire">
    <h2>{phase === 'fire_commit' ? 'Choose target and weapons' : 'Fire reveal and resolution'}</h2>
    {phase === 'fire_commit' ? <>
      <p>Choose a target first. The weapon cards then show which of your guns can legally fire at it, along with arc, distance, range penalty, damage and fire control.</p>
      {ship ? <>
        <label>Firing ship <select aria-label="Firing ship" value={ship.id} onChange={event => {setShipId(event.target.value); setSelectedGuns([]); setSelectedReserves([]);}}>{own.map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.label}</option>)}</select></label>
        <label>1. Select an enemy target <select aria-label="Enemy target" value={target?.id || ''} onChange={event => {setTargetId(event.target.value); setSelectedGuns([]);}}><option value="">Choose target…</option>{enemy.map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.label} · ({candidate.q}, {candidate.r})</option>)}</select></label>
        {target && <div className="target-summary"><h3>{target.label}</h3><p>Distance: <strong>{hexDistance(ship, target)} hexes</strong> · facing {target.facing * 60}° · target class: {target.public_state?.libraryId === VORCHAN.id ? 'heavy combat (verified Vorchan SCS)' : 'unverified SCS'}.</p>
          {target.public_state?.libraryId !== VORCHAN.id && <p className="error">Weapons are disabled because this prototype has no verified firing and defence data for the selected target.</p>}
          {(() => { const approach = facingDirections(ship, target); const facingDegrees = ((-60 + target.facing * 60) % 360 + 360) % 360; return <p>Incoming aspect: {approach.requiresChoice ? 'Defender will choose ' + (approach.choices || []).join(' or ') + ' on the boundary.' : target.public_state?.libraryId === VORCHAN.id ? approach.direction + ' · target defence ' + VORCHAN.defence[approach.direction] + ' · fire-control row ' + VORCHAN.weapons.map(weapon => weapon.fireControl[0]).join(' / ') + '.' : approach.direction + ' · target defence profile unverified.'} Heading: {facingDegrees}°.</p>; })()}
          <label>Firing priority for the next gun <input type="number" min="1" max="100" value={priority} onChange={event => setPriority(Math.max(1, Math.min(100, Math.floor(Number(event.target.value) || 1))))}/></label>
          <div className="weapon-grid">{mounts.map(mount => <WeaponCard key={mount.id} mount={mount} target={target} shooter={ship} turn={detailTurn()} targetDefensiveEW={targetDefensiveEW(target)} selectedGuns={selectedGuns} onToggleGun={toggleGun} chargeTurns={chargeTurns} onChargeTurns={setChargeTurns} reservedKeys={selectedReserves} fire={fire}/>)}</div>
          {selectedGuns.length > 0 && (() => {
            const distance = hexDistance(ship, target);
            const total = selectedGuns.reduce((sum, key) => {
              const [mountId] = key.split(':');
              const mount = mounts.find(item => item.id === mountId), weapon = VORCHAN.weapons.find(item => item.id === mount.weaponId);
              const damage = mount.weaponId === 'plasma-accelerator' ? weapon.firingOptions.find(option => option.turns === chargeTurns).damageDice : weapon.damageDice;
              return {count: sum.count + damage.count, bonus: sum.bonus + damage.bonus, perHex: sum.perHex + damage.perHex};
            }, {count: 0, bonus: 0, perHex: 0});
            const adjustment = total.perHex * distance;
            return <aside className="volley-summary"><strong>Selected volley, if every gun hits</strong><p>{total.count}d10 + {total.bonus}{adjustment ? ` ${adjustment < 0 ? '−' : '+'} ${Math.abs(adjustment)} range damage` : ''} raw damage before armour; each hit resolves as a separate attack. {selectedGuns.length} gun(s) selected against {target.label} at {distance} hexes.</p></aside>;
          })()}
          <div className="arc-preview"><ArcPlot ship={ship} ships={ships} mount={mounts[0]} targetId={target.id} onTarget={setTargetId}/><p className="hint">The green/red markers show the Plasma Accelerator’s arc to each ship. Weapon cards above show the arc status for all three mounts.</p></div>
          <fieldset className="question-prompt"><legend>Do you want to reserve any Twin Array guns for defensive fire?</legend><div className="yes-no-options"><button type="button" className={reserveAnswer === true ? 'selected' : 'secondary'} aria-pressed={reserveAnswer === true} onClick={() => setReserveAnswer(true)}>Yes</button><button type="button" className={reserveAnswer === false ? 'selected' : 'secondary'} aria-pressed={reserveAnswer === false} onClick={() => {setReserveAnswer(false); setSelectedReserves([]);}}>No</button></div></fieldset>
          {reserveAnswer && <fieldset><legend>Reserve ready Twin Array guns</legend>{mounts.filter(mount => mount.weaponId === 'twin-array').flatMap(mount => [1, 2].map(gun => {
            const key = mount.id + ':' + gun, already = fire.some(shot => shot.shipId === ship.id && shot.mountId === mount.id && shot.gun === gun);
            let ready = false; let reason = 'Weapon unavailable';
            try { const check = weaponReadiness({mountId: mount.id, turn: detailTurn(), trial: ship.private_state?.trial, gun}); ready = check.ready; reason = check.reasons.join(', '); } catch (error) { reason = error.message; }
            return <label className="check-row" key={key}><input type="checkbox" checked={selectedReserves.includes(key)} disabled={already || !ready || selectedGuns.includes(key)} onChange={() => toggleReserve(key)}/>{displayName(mount.id)} gun {gun} — {already ? 'already assigned' : selectedGuns.includes(key) ? 'selected to fire at the target' : ready ? 'ready' : reason}</label>;
          }))}</fieldset>}
          <button type="button" onClick={addTargetWeapons}>Add selected weapons to {target.label}</button>
        </div>}
        {choiceError && <p className="error" role="alert">{choiceError}</p>}
        <h3>Prepared declarations ({fire.length})</h3>{fire.length ? <table><thead><tr><th>Ship / weapon</th><th>Gun</th><th>Target / assignment</th><th>Priority</th><th>Damage</th><th>Action</th></tr></thead><tbody>{fire.map(shot => {
          const mount = mounts.find(item => item.id === shot.mountId), weapon = VORCHAN.weapons.find(item => item.id === mount?.weaponId);
          return <tr key={attackId(shot)}><td>{ships.find(item => item.id === shot.shipId)?.label || shot.shipId} · {weapon?.name}</td><td>{shot.gun}</td><td>{shot.role === 'defensive' ? 'Defensive reserve' : ships.find(item => item.id === shot.targetId)?.label || shot.targetId}</td><td>{shot.role === 'defensive' ? '—' : '#' + shot.order}</td><td>{shot.role === 'defensive' ? 'Intercept' : shot.mountId === 'plasma_forward' ? weapon.firingOptions.find(option => option.turns === shot.chargeTurns)?.damageDice.count + 'd10+' + weapon.firingOptions.find(option => option.turns === shot.chargeTurns)?.damageDice.bonus : weapon.damage}</td><td><button type="button" onClick={() => setShots(fire.filter(item => attackId(item) !== attackId(shot)))}>Remove</button></td></tr>;
        })}</tbody></table> : <p>All guns are holding fire until you select them.</p>}
        <p>Declarations remain secret until both players lock their orders. The server checks ownership, arc, target and declaration format when you lock the phase.</p>
      </> : <p>You do not currently control a Vorchan with a verified weapon library.</p>}
    </> : <>
      {!fireView?.revealed ? <p>Waiting for both players to lock their fire declarations.</p> : <>
        <p>Fire is declared simultaneously. Defensive assignments are locked before dice are rolled. Each player rolls for their own declared attacks; the results are saved so a refresh cannot reroll them.</p>
        {declarations.map(declaration => <div key={declaration.playerId}><h3>{declaration.playerId === userId ? 'Your declared fire' : 'Opponent declared fire'}</h3>{declaration.fire?.shots?.length ? <table><thead><tr><th>Weapon</th><th>Gun</th><th>Target / assignment</th><th>Priority</th></tr></thead><tbody>{declaration.fire.shots.map(shot => <tr key={attackId(shot)}><td>{VORCHAN.weapons.find(weapon => weapon.id === mounts.find(mount => mount.id === shot.mountId)?.weaponId)?.name || shot.mountId} ({ships.find(item => item.id === shot.shipId)?.label || shot.shipId})</td><td>{shot.gun}</td><td>{shot.role === 'defensive' ? 'Reserved' : ships.find(item => item.id === shot.targetId)?.label || shot.targetId}</td><td>{shot.order ?? '—'}</td></tr>)}</tbody></table> : <p>Holding fire.</p>}</div>)}
        <h3>Defensive interception</h3>{reserves.length ? reserves.map(reserve => {
          const reserveId = attackId(reserve), shooter = ships.find(item => item.id === reserve.shipId);
          const eligible = incoming.filter(attack => attack.targetId === reserve.shipId && checkMountArc({shooter, target: ships.find(item => item.id === attack.shipId), arc: mounts.find(item => item.id === reserve.mountId).arc}).allowed);
          const selected = defence.find(item => attackId(item) === reserveId)?.attackId || '';
          return <label key={reserveId} className="weapon-defence-row">{displayName(reserve.mountId)} gun {reserve.gun} <select aria-label={'Defensive target for ' + reserveId} value={selected} onChange={event => {if (event.target.value) allocate(reserve, event.target.value); else onDefenceDraft(JSON.stringify({assignments: defence.filter(item => attackId(item) !== reserveId)}));}}><option value="">Do not intercept</option>{eligible.map(attack => <option key={attack.id} value={attack.id}>{ships.find(item => item.id === attack.shipId)?.label || attack.shipId} · {displayName(attack.mountId)} gun {attack.gun}</option>)}</select></label>;
        }) : <p>No defensive guns were reserved.</p>}
        {isHost && !preflight?.terrainVerified && <div><h3>Verify terrain</h3><p>Confirm blocking terrain before players roll hit dice. Enter the blocking hex coordinates as a JSON array. Use an empty array to confirm a clear field.</p><label>Blocking terrain hexes <textarea value={terrainText} onChange={event => setTerrainText(event.target.value)} rows={3}/></label><button disabled={combatBusy} onClick={() => {try {combatAction('combat-terrain', {confirmed: true, blockingHexes: JSON.parse(terrainText)});} catch {setChoiceError('Invalid terrain JSON');}}}>Confirm battlefield terrain</button></div>}
        {preflight?.terrainVerified && unrolled.map(shot => <div className="player-roll-row" key={shot.attackId}>
          <h3>Roll {ships.find(item => item.id === shot.shipId)?.label} — {displayName(shot.mountId)} gun {shot.gun}</h3>
          <p>Attack test, hit location, primary chart and listed damage dice. Review the weapon datacard and target modifiers above before rolling.</p>
          <DiceRoller dice={diceFor(shot)} disabled={combatBusy} label="Roll attack and damage dice" onRoll={async results => {
            const values = Object.fromEntries(results.map(result => [result.id, result.value]));
            await combatAction('combat-roll', {attackId: shot.attackId, rolls: {roll: values.hit, locationRoll: values.location, primaryRoll: values.chart, damageDice: results.filter(result => result.id.startsWith('damage-')).map(result => result.value)}});
          }}/>
        </div>)}
        {ownRolls.length > 0 && <div><h3>Your recorded rolls</h3>{ownRolls.map(roll => <p key={roll.attackId}>{roll.attackId}: attack d20 {roll.roll}, location {roll.locationRoll}, primary chart {roll.primaryRoll}; damage {roll.damageDice.join(', ')}</p>)}</div>}
        {preflight?.rollsCommitted ? <>
          <h3>Recorded dice</h3><table><thead><tr><th>Attack</th><th>Attacker</th><th>Hit d20</th><th>Location d20</th><th>Primary d20</th><th>Damage d10</th></tr></thead><tbody>{(preflight.rollJournal || []).map(roll => <tr key={roll.attackId}><td>{roll.attackId}</td><td>{roll.playerId === userId ? 'You' : 'Opponent'}</td><td>{roll.roll}</td><td>{roll.locationRoll}</td><td>{roll.primaryRoll}</td><td>{roll.damageDice.join(', ')}</td></tr>)}</tbody></table>
          {preflight.terrainVerified && <p>{preflight.damageApplied ? 'Damage committed.' : 'All attacks are rolled. Defenders may now allocate confirmed hits before damage is committed.'}</p>}
          {(preflight.attacks || []).filter(attack => own.some(candidate => candidate.id === attack.targetId) && (attack.hit === true && !preflight.defenderChoices?.[attack.id]?.systemChoice || attack.hit === null && attack.blockers?.some(blocker => /boundary direction/i.test(blocker)))).map(attack => {
            const source = ships.find(item => item.id === attack.shipId), defender = ships.find(item => item.id === attack.targetId);
            const direction = source && defender ? facingDirections(source, defender) : null;
            const choice = combatChoices[attack.id] || {incoming: preflight.defenderChoices?.[attack.id]?.incoming || (direction?.requiresChoice ? '' : direction?.direction || 'forward'), sideChoice: '', systemChoice: ''};
            const dice = preflight.rollJournal?.find(roll => roll.attackId === attack.id);
            let hit = null; try { if (dice && choice.incoming) hit = vorchanHitToken({incoming: choice.incoming, locationRoll: dice.locationRoll, primaryRoll: dice.primaryRoll, sideChoice: choice.sideChoice || null}); } catch {}
            const update = (key, value) => setCombatChoices(previous => ({...previous, [attack.id]: {...choice, [key]: value}}));
            return <div key={attack.id} className="weapon-defence-row"><strong>Allocate hit: {attack.id}</strong>
              <label>Incoming direction <select value={choice.incoming} onChange={event => update('incoming', event.target.value)}><option value="">Choose…</option>{(direction?.requiresChoice ? direction.choices : [direction?.direction]).filter(Boolean).map(value => <option key={value} value={value}>{value}</option>)}</select></label>
              {['port', 'starboard'].includes(choice.incoming) && <label>Side hit chart <select value={choice.sideChoice} onChange={event => update('sideChoice', event.target.value)}><option value="">Choose…</option><option value="forward">Forward hull</option><option value="aft">Aft hull</option></select></label>}
              {hit && !hit.requiresChoice && hit.candidates.length > 1 && <label>Damaged system <select value={choice.systemChoice} onChange={event => update('systemChoice', event.target.value)}><option value="">Choose…</option>{hit.candidates.map(value => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label>}
              <button disabled={combatBusy || !choice.incoming || attack.hit === true && (['port', 'starboard'].includes(choice.incoming) && !choice.sideChoice || hit?.candidates?.length > 1 && !choice.systemChoice)} onClick={() => combatAction('combat-choice', {attackId: attack.id, choice: {incoming: choice.incoming, ...(attack.hit === true && choice.sideChoice ? {sideChoice: choice.sideChoice} : {}), ...(attack.hit === true && choice.systemChoice ? {systemChoice: choice.systemChoice} : {})}})}>Lock defender choice</button>
            </div>;
          })}
          {isHost && preflight.terrainVerified && !preflight.damageApplied && <button disabled={combatBusy || !preflight.attacks?.every(attack => !attack.blockers.length)} onClick={() => combatAction('combat-resolve', {})}>Resolve verified combat and advance</button>}
        </> : <p>{preflight?.terrainVerified ? `Your attacks are rolled. Waiting for ${Math.max(0, allOffensive.length - (preflight?.rollCount || 0))} remaining attack roll(s).` : 'Terrain must be confirmed before the players roll.'}</p>}
      </>}
      {choiceError && <p className="error" role="alert">{choiceError}</p>}
      <h3>Authoritative firing preflight</h3>{preflight?.attacks?.length ? preflight.attacks.map(attack => <p key={attack.id}>{attack.id} → {attack.targetId}: {attack.blockers.length ? attack.blockers.join('; ') : `d20 ${attack.roll} vs ${attack.targetNumber}: ${attack.hit ? 'hit' : 'miss'}`}</p>) : <p>No attacks available for resolution.</p>}
    </>}
  </section>;
}
