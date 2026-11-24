import React, {useState} from 'react';
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
  positions = [{q:3,r:10,facing:0},{q:15,r:10,facing:3}],
  onPositionsChange = () => {},
}) {
  const gameSetup = game?.status === 'setup';
  const hostCanEdit = !gameSetup || game.host_id === user?.id;

  return <section className="panel battle-setup-panel" aria-labelledby="battle-setup-title">
    <h2 id="battle-setup-title">Battlefield Setup</h2>
    <p>{gameSetup
      ? (hostCanEdit ? 'Choose the shared board size and ship model before the host starts the battle.' : 'The host sets the shared board size and ship model. You can choose your own 2D or 3D view.')
      : 'Set defaults for your next battle. The host can adjust its shared board and model before starting.'}</p>
    <div className="battle-setup-grid">
      <label>Map Size
        <select value={mapPreset} onChange={event => onMapPresetChange(event.target.value)} disabled={busy || !hostCanEdit}>
          {Object.entries(MAP_PRESETS).map(([id, preset]) => <option key={id} value={id}>{preset.label}</option>)}
        </select>
      </label>
      <label>Ship Model
        {VORCHAN_MODELS.length === 1
          ? <span className="setup-fixed-value">{VORCHAN_MODELS[0].label}</span>
          : <select value={modelId} onChange={event => onModelChange(event.target.value)} disabled={busy || !hostCanEdit}>
              {VORCHAN_MODELS.map(model => <option key={model.id} value={model.id}>{model.label}</option>)}
            </select>}
      </label>
      <label>Battlefield View
        <select value={mapMode} onChange={event => onMapModeChange(event.target.value)}>
          <option value="3d">3D Tactical Board</option>
          <option value="2d">Classic 2D Board</option>
        </select>
      </label>
    </div>
    {gameSetup && hostCanEdit && <StartingPositions mapPreset={mapPreset} positions={positions} onChange={onPositionsChange} disabled={busy} />}
    <div className="battle-setup-local-model">
      <label>Optional Local STL Override
        <input type="file" accept=".stl" onChange={event => onLocalModel(event.target.files?.[0] || null)} />
      </label>
      <p className="hint">The selected public model is shared with the battle. A local STL override is visible only in this browser.</p>
      {hasLocalModel && <button type="button" className="secondary" onClick={onClearLocalModel}>Use selected public model</button>}
    </div>
  </section>;
}

function StartingPositions({mapPreset, positions, onChange, disabled}) {
  const [editing,setEditing]=useState(0);
  const {columns,rows}=MAP_PRESETS[mapPreset]||MAP_PRESETS.standard;
  const size=7, dx=Math.sqrt(3)*size, dy=1.5*size, margin=12;
  const xy=(q,r)=>({x:margin+dx*(q+r/2),y:margin+dy*r});
  const width=2*margin+dx*(columns+(rows-1)/2), height=2*margin+dy*(rows-1)+size*2;
  const choose=(i,key,value)=>onChange(positions.map((p,j)=>j===i?{...p,[key]:value}:p));
  const setFacing=(i,value)=>choose(i,'facing',value);
  return <section className="starting-position" aria-labelledby="starting-position-title">
    <h3 id="starting-position-title">Starting Hexes And Facing</h3>
    <p className="hint">Choose each player's starting hex and direction. Click a hex on the preview to set a position. The arrow shows the ship's facing.</p>
    <div className="starting-position-grid">
      <div className="starting-position-controls">{positions.map((p,i)=><fieldset key={i} disabled={disabled}>
        <legend><button type="button" className={editing===i?'':'secondary'} onClick={()=>setEditing(i)} aria-pressed={editing===i}>Edit {i===0?'Host':'Opponent'} — Ship {i+1}</button></legend>
        <p>Starting Hex: ({p.q}, {p.r})</p>
        <label>Facing<select value={p.facing} onChange={e=>setFacing(i,Number(e.target.value))}>{['North-East','East','South-East','South-West','West','North-West'].map((v,n)=><option key={n} value={n}>{v}</option>)}</select></label>
      </fieldset>)}</div>
      <div className="starting-map-scroll"><svg viewBox={`0 0 ${width} ${height}`} className="starting-map" role="img" aria-label={`Starting position map, ${columns} columns by ${rows} rows`}>
        <rect width={width} height={height} rx="8" fill="#071328"/>
        {Array.from({length:columns},(_,q)=>Array.from({length:rows},(_,r)=>{const p=xy(q,r);return <polygon key={`${q}-${r}`} onClick={()=>onChange(positions.map((item,j)=>j===editing?{...item,q,r}:item))} points={Array.from({length:6},(_,k)=>`${p.x+size*Math.cos((60*k-30)*Math.PI/180)},${p.y+size*Math.sin((60*k-30)*Math.PI/180)}`).join(' ')} fill="#0b1b30" stroke="#3d5978" strokeWidth=".7"/>}))}
        {positions.map((p,i)=>{const c=xy(p.q,p.r);return <g key={i} transform={`translate(${c.x} ${c.y})`}><circle r="6" fill={i?'#d8ad77':'#82d3ed'} stroke="white"/><path d="M0 -12 L4 -4 L0 -6 L-4 -4 Z" fill="#fff" transform={`rotate(${p.facing*60+30})`}/><text y="17" textAnchor="middle" fill="white" fontSize="8">{i?'P2':'P1'}</text></g>})}
      </svg></div>
    </div>
  </section>;
}
