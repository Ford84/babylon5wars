import React from 'react';
import {MAP_PRESETS} from '../shared/battle-setup.mjs';
import {VORCHAN_MODELS} from '../shared/vorchan-models.mjs';

export default function BattleSetupPanel({
  game,
  user,
  mapPreset,
  onMapPresetChange,
  mapMode,
  onMapModeChange,
  modelId,
  onModelChange,
  busy = false,
  hasLocalModel = false,
  onLocalModel,
  onClearLocalModel,
}) {
  const gameSetup = game?.status === 'setup';
  const hostCanEdit = !gameSetup || game.host_id === user?.id;

  return <section className="panel battle-setup-panel" aria-labelledby="battle-setup-title">
    <h2 id="battle-setup-title">Battlefield setup</h2>
    <p>{gameSetup
      ? (hostCanEdit ? 'Choose the shared board size and ship model before the host starts the battle.' : 'The host sets the shared board size and ship model. You can choose your own 2D or 3D view.')
      : 'Set defaults for your next battle. The host can adjust its shared board and model before starting.'}</p>
    <div className="battle-setup-grid">
      <label>Map size
        <select value={mapPreset} onChange={event => onMapPresetChange(event.target.value)} disabled={busy || !hostCanEdit}>
          {Object.entries(MAP_PRESETS).map(([id, preset]) => <option key={id} value={id}>{preset.label}</option>)}
        </select>
      </label>
      <label>Ship model
        <select value={modelId} onChange={event => onModelChange(event.target.value)} disabled={busy || !hostCanEdit}>
          {VORCHAN_MODELS.map(model => <option key={model.id} value={model.id}>{model.label}</option>)}
        </select>
      </label>
      <label>Battlefield view
        <select value={mapMode} onChange={event => onMapModeChange(event.target.value)}>
          <option value="3d">3D tactical board</option>
          <option value="2d">Classic 2D board</option>
        </select>
      </label>
    </div>
    <div className="battle-setup-local-model">
      <label>Optional local STL override
        <input type="file" accept=".stl" onChange={event => onLocalModel(event.target.files?.[0] || null)} />
      </label>
      <p className="hint">The selected public model is shared with the battle. A local STL override is visible only in this browser.</p>
      {hasLocalModel && <button type="button" className="secondary" onClick={onClearLocalModel}>Use selected public model</button>}
    </div>
  </section>;
}
