export const MAP_PRESETS = Object.freeze({
  standard: Object.freeze({columns: 20, rows: 32, label: 'Standard tactical sheet (20 × 32)'}),
  outer: Object.freeze({columns: 40, rows: 64, label: 'Outer Sphere (40 × 64)'}),
  inner: Object.freeze({columns: 80, rows: 128, label: 'Inner Sphere (80 × 128)'}),
});

export const DEFAULT_MAP_PRESET = 'standard';

export function isMapPreset(value) {
  return Object.hasOwn(MAP_PRESETS, value);
}
