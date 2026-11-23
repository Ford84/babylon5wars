// Coordinate contract for live damage marks over the original SCS vector page.
// Positions are normalized to the full SVG viewBox (0..1), so responsive
// rendering keeps marks aligned. Add a mark only after its box is audited.
export const SCS_DAMAGE_OVERLAY_SCHEMA = Object.freeze({
  version: 1,
  coordinateSpace: 'normalized-full-page',
  source: '/images/vorchan-v3-schematic.svg',
  status: 'prepared-awaiting-box-audit',
  marks: Object.freeze([]),
});

export function validateDamageMark(mark) {
  return Boolean(mark && typeof mark.componentId === 'string' && mark.componentId &&
    Number.isFinite(mark.x) && mark.x >= 0 && mark.x <= 1 &&
    Number.isFinite(mark.y) && mark.y >= 0 && mark.y <= 1 &&
    Number.isInteger(mark.box) && mark.box >= 1);
}
