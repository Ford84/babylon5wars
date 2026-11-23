// Durable per-step phase records. A manual ruling and a decision that a rule
// does not apply both require a written reason so an order cannot silently
// acknowledge unsupported rules.
export const PROCEDURE_RECORD_STATUSES = Object.freeze(['resolved', 'manual', 'not_applicable']);

export function validateProcedureRecords(phase, records) {
  if (!phase || !Array.isArray(phase.procedures) || !Array.isArray(records) || records.length !== phase.procedures.length) {
    throw new TypeError('Record an outcome for every procedure in this phase');
  }
  return records.map((record, index) => {
    if (!record || !PROCEDURE_RECORD_STATUSES.includes(record.status)) {
      throw new TypeError('Select a valid outcome for procedure ' + (index + 1));
    }
    const note = typeof record.note === 'string' ? record.note.trim() : '';
    if (note.length > 1000) throw new TypeError('Procedure notes must be 1,000 characters or fewer');
    if ((record.status === 'manual' || record.status === 'not_applicable') && note.length < 12) {
      throw new TypeError('Add at least 12 characters explaining the manual ruling or why the procedure does not apply');
    }
    return {status: record.status, note};
  });
}
