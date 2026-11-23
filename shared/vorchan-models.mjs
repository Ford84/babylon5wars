export const VORCHAN_MODELS = Object.freeze([
  Object.freeze({id: 'attack-cruiser-rc2', label: 'Attack Cruiser · RC2', url: '/models/vorchan/centauri-vorchan-rc2.stl'}),
  Object.freeze({id: 'attack-cruiser-cl-hole', label: 'Attack Cruiser · CL Hole', url: '/models/vorchan/centauri-vorchan-cl-hole.stl'}),
  Object.freeze({id: 'vorchan-redux-rc2', label: 'Vorchan Redux · RC2', url: '/models/vorchan/centauri-vorchan-redux-rc2.stl'}),
]);

export const DEFAULT_VORCHAN_MODEL_ID = VORCHAN_MODELS[0].id;

export function isVorchanModelId(value) {
  return VORCHAN_MODELS.some(model => model.id === value);
}

export function vorchanModelById(value) {
  return VORCHAN_MODELS.find(model => model.id === value) || VORCHAN_MODELS[0];
}
