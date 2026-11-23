import React from 'react';

const phaseLabels = {
  power: 'Ship Power', initiative: 'Initiative', ew_commit: 'EW and Ballistic Orders', ew_reveal: 'EW Reveal', jump: 'Jump Point Formation',
  terrain_pre: 'Pre-Movement Terrain', movement: 'Movement', terrain_post: 'Post-Movement Terrain', weapon_movement: 'Weapon-Based Movement',
  combat_pivot: 'Combat Pivot', recovery: 'Recovery', ccew_commit: 'Close Combat EW', ccew_reveal: 'Close Combat EW Reveal', ramming: 'Ramming',
  fire_commit: 'Fire Determination', fire_resolution: 'Fire Resolution', marine: 'Marine Attack', criticals: 'Critical Hits', vortex: 'Vortex', hangar: 'Hangar Operations', links: 'Link/Unlink', adjust: 'Adjust Ship Systems'
};

function EventTitle({event}) {
  const data = event.public || {};
  if (event.event_type === 'phase_adjudications_revealed') return 'Turn ' + event.turn + ' · ' + (phaseLabels[data.phaseId] || data.phaseId) + ' decisions recorded';
  if (event.event_type === 'manual_combat_resolution') return 'Turn ' + event.turn + ' · Manual weapon adjudication saved';
  if (event.event_type === 'vorchan_damage_committed') return 'Turn ' + event.turn + ' · Automatic Vorchan damage committed';
  if (event.event_type === 'phase_advanced') return 'Turn ' + event.turn + ' · Phase advanced to ' + (phaseLabels[data.to] || data.to);
  if (event.event_type === 'vorchan_trial_created') return 'Two-player Vorchan trial created';
  if (event.event_type === 'trial_movement_stage') return 'Turn ' + event.turn + ' · Ship movement committed';
  if (event.event_type === 'trial_initiative_rolled') return 'Turn ' + event.turn + ' · Initiative rolled';
  if (event.event_type === 'trial_power_committed') return 'Turn ' + event.turn + ' · Power allocation saved';
  if (event.event_type === 'trial_ew_committed') return 'Turn ' + event.turn + ' · EW allocation saved';
  if (event.event_type === 'ew_allocations_revealed') return 'Turn ' + event.turn + ' · EW allocations revealed';
  if (event.event_type === 'player_combat_roll_submitted') return 'Turn ' + event.turn + ' · Player combat dice recorded';
  if (event.event_type === 'vorchan_overthrust_resolved') return 'Turn ' + event.turn + ' · Overthrust checks resolved';
  return 'Turn ' + event.turn + ' · ' + event.event_type.replaceAll('_', ' ');
}

export default function BattleLog({events = [], members = []}) {
  const names = new Map(members.map(member => [member.user_id, member.display_name]));
  return <section className="panel battle-log">
    <h2>Battle log</h2>
    {events.length === 0 ? <p>No saved battle events yet.</p> : <ol>
      {events.map(event => {
        const data = event.public || {};
        return <li key={event.id || [event.turn, event.phase_id, event.event_type, event.created_at].join(':')}>
          <strong><EventTitle event={event} /></strong>
          {event.actor_id && <span className="event-actor"> · {names.get(event.actor_id) || 'Player'}</span>}
          {event.event_type === 'phase_adjudications_revealed' && (data.records || []).map(record => <div className="event-detail" key={record.playerId}>
            <strong>{names.get(record.playerId) || 'Player'}{record.phaseId ? ' · ' + (phaseLabels[record.phaseId] || record.phaseId) : ''}</strong>
            {(record.procedures || []).map((procedure, index) => <p key={index}>{index + 1}. {procedure.step}: {procedure.status.replaceAll('_', ' ')}{procedure.note ? ' — ' + procedure.note : ''}</p>)}
            {record.orderNotes && <p>Additional notes: {record.orderNotes}</p>}
          </div>)}
          {(event.event_type === 'trial_initiative_rolled' || event.event_type === 'ship_rules_applied' && data.action === 'roll-initiative') && <p className="event-detail">d20 {data.roll} + SCS bonus {data.printedBonus} · modifiers {data.modifiers ? Object.entries(data.modifiers).map(([key, value]) => `${key} ${value >= 0 ? '+' : ''}${value}`).join(', ') : 'speed ' + (data.speedPenalty ?? 0)} = {data.total}.</p>}
          {event.event_type === 'trial_power_committed' && <p className="event-detail">Purchased thrust {data.allocation?.purchasedThrust ?? 0} · extra EW purchased {data.allocation?.extraEW ?? 0} · deactivated systems {(data.allocation?.deactivated || []).join(', ') || 'none'} · unspent reactor power {data.allocation?.unusedPower ?? '—'}.</p>}
          {event.event_type === 'ew_allocations_revealed' && <div className="event-detail">{(data.allocations || []).map(allocation => <p key={allocation.shipId}><strong>{names.get(allocation.ownerId) || 'Ship'}{allocation.shipLabel ? ' · ' + allocation.shipLabel : ''}</strong>: defensive {allocation.defensive}, offensive targets {Object.entries(allocation.offensive || {}).map(([target, points]) => `${target} ${points}`).join(', ') || 'none'}.</p>)}</div>}
          {event.event_type === 'player_combat_roll_submitted' && <p className="event-detail">{data.mountId?.replaceAll('_', ' ')} gun {data.gun}: attack d20 {data.rolls?.roll}, location {data.rolls?.locationRoll}, primary chart {data.rolls?.primaryRoll}, damage dice {(data.rolls?.damageDice || []).join(', ')}.</p>}
          {event.event_type === 'vorchan_overthrust_resolved' && <div className="event-detail">{(data.results || []).map(result => <p key={result.id}>{result.id.replaceAll('_', ' ')}: d20 {result.roll} + modifier {result.modifier} = {result.modifiedRoll}; {result.result}.</p>)}</div>}
          {event.event_type === 'manual_combat_resolution' && <div className="event-detail">
            <p>Damage remains a manual SCS entry; the digital damage tracks were not changed.</p>
            {(data.attacks || []).map(attack => <p key={attack.attackId}><strong>{attack.shipLabel || 'Attacking ship'} · {attack.mountId.replaceAll('_', ' ')} gun {attack.gun} → {attack.targetLabel || 'target'}</strong> · attacker roll {attack.playerRoll ?? '—'}, location {attack.locationRoll ?? '—'}, primary chart {attack.primaryRoll ?? '—'}{attack.damageDice?.length ? ', damage dice ' + attack.damageDice.join(', ') : ''}: {attack.resolution}</p>)}
            {(data.interceptions || []).map(assignment => <p key={assignment.interceptionId}><strong>{assignment.shipLabel || 'Defending ship'} · {assignment.mountId.replaceAll('_', ' ')} gun {assignment.gun} against {assignment.attackId}</strong>: {assignment.resolution}</p>)}
          </div>}
          {event.event_type === 'vorchan_damage_committed' && <p className="event-detail">Ship-tier damage was applied automatically. Critical checks remain deferred.</p>}
        </li>;
      })}
    </ol>}
  </section>;
}
