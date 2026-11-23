import React from 'react';
import {VORCHAN_LIBRARY_RECORD as VORCHAN} from '../shared/vorchan-trial-library.mjs';

function applicableReason(step, ships) {
  const fleet = ships || [];
  const onlyKnownVorchan = fleet.length > 0 && fleet.every(ship => ship.public_state?.libraryId === VORCHAN.id);
  if (/fighter/i.test(step) && onlyKnownVorchan) return 'No fighter flights or fighter hangars are present in this battle.';
  if (/ballistic/i.test(step) && onlyKnownVorchan) return 'The current Vorchan trial has no ballistic weapons.';
  if (/marine/i.test(step) && onlyKnownVorchan) return 'Marine units are not present in the current Vorchan trial.';
  if (/tractor|cargo|pod attachment/i.test(step) && onlyKnownVorchan) return 'This Vorchan trial has no linked cargo, tractor or pod units.';
  return null;
}

export default function ProcedurePanel({detail, procedureSelections, setProcedureSelections, order, setOrder, confirmed, setConfirmed, onSubmit, orderBusy, procedureLinked}) {
  if (!detail) return <section className="panel" id="phase-submit"><h2>Complete current phase</h2><p>Players will see who needs to act and which submissions remain outstanding.</p></section>;
  const phaseKey = detail.game.turn + ':' + detail.game.phase_id;
  const procedures = detail.phase.procedures || [];
  const ships = detail.ships || [];
  const reasons = procedures.map(step => applicableReason(step, ships));
  const linked = procedures.map((_, index) => procedureLinked?.(detail.game.phase_id, index) || false);
  const records = procedures.map((_, index) => {
    if (reasons[index]) return {status: 'not_applicable', note: reasons[index]};
    if (linked[index]) return {status: 'resolved', note: ''};
    return procedureSelections[phaseKey + ':' + index] || detail.myOrder?.procedureRecords?.[index] || {status: '', note: ''};
  });
  const ready = records.every(record => record.status && ((record.status !== 'manual' && record.status !== 'not_applicable') || record.note.trim().length >= 12));
  const update = (index, patch) => setProcedureSelections(previous => ({
    ...previous,
    [phaseKey + ':' + index]: {...(previous[phaseKey + ':' + index] || {}), ...patch}
  }));
  const submissionRecords = records.map(record => ({status: record.status, note: record.note || ''}));

  return <section className="panel" id="phase-submit">
    <h2>Complete current phase</h2>
    <p>{detail.phase.label}</p>
    <p><strong>Turn procedure</strong></p>
    <div className="procedure-checklist">
      {procedures.map((step, index) => {
        const record = records[index], notApplicable = !!reasons[index], isLinked = linked[index];
        if (notApplicable) return <div className="procedure-item procedure-na" key={index}>
          <p><strong>{index + 1}. {step}</strong></p>
          <p className="hint">Not applicable — {reasons[index]}</p>
        </div>;
        const answer = record.status === 'not_applicable' ? 'no' : record.status ? 'yes' : '';
        return <div className="procedure-item" key={index}>
          <p><strong>{index + 1}. {step}</strong></p>
          {isLinked ? <p className="success">✓ The linked ship action is committed on the server.</p> : <>
            <fieldset className="question-prompt"><legend>Did you resolve this procedure?</legend><div className="yes-no-options">
              <button type="button" className={answer === 'yes' ? 'selected' : 'secondary'} aria-pressed={answer === 'yes'} disabled={!detail.needsAction} onClick={() => update(index, {status: 'resolved', note: ''})}>Yes</button>
              <button type="button" className={answer === 'no' ? 'selected' : 'secondary'} aria-pressed={answer === 'no'} disabled={!detail.needsAction} onClick={() => update(index, {status: 'not_applicable', note: record.status === 'not_applicable' ? record.note : ''})}>No</button>
            </div></fieldset>
            {answer === 'yes' && <label>How was it resolved?
              <select aria-label={'Procedure ' + (index + 1) + ': ' + step} value={record.status === 'manual' ? 'manual' : 'resolved'} disabled={!detail.needsAction} onChange={event => update(index, {status: event.target.value, note: event.target.value === 'resolved' ? '' : record.note})}>
                <option value="resolved">Resolved / checked</option><option value="manual">Manual ruling recorded</option>
              </select>
            </label>}
            {record.status === 'manual' && <label className="procedure-note">Manual ruling
              <textarea value={record.note} maxLength={1000} disabled={!detail.needsAction} onChange={event => update(index, {note: event.target.value})} placeholder="Record the rule decision and result (at least 12 characters)." />
            </label>}
            {answer === 'no' && <label className="procedure-note">Why did this procedure not apply?
              <textarea value={record.note} maxLength={1000} disabled={!detail.needsAction} onChange={event => update(index, {note: event.target.value})} placeholder="Give a short reason (at least 12 characters)." />
            </label>}
          </>}
        </div>;
      })}
    </div>
    <p className="hint">A Yes answer reveals the outcome field. If a rule is not implemented by the prototype, record it as a manual ruling so both players can review the result in the battle log.</p>
    {detail.readiness.map(player => <p key={player.id}>{player.submitted ? '✓' : '◷'} {player.name} — {player.submitted ? 'Submitted' : player.required ? 'Action required' : 'Waiting for turn'}</p>)}
    {detail.needsAction && <>
      <label>Additional phase notes <textarea value={order} onChange={event => setOrder(event.target.value)} maxLength={2000} placeholder="Optional notes for this order" /></label>
      <label className="phase-confirm"><input type="checkbox" checked={confirmed === phaseKey} onChange={event => setConfirmed(event.target.checked ? phaseKey : '')} /> I have reviewed the procedures that apply to my fleet</label>
      <button onClick={() => onSubmit(submissionRecords)} disabled={orderBusy || !ready || confirmed !== phaseKey}>{orderBusy ? 'Saving order…' : 'Lock my order'}</button>
    </>}
  </section>;
}
