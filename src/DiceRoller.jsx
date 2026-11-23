import React, {useEffect, useRef, useState} from 'react';

function secureDie(sides) {
  const limit = Math.floor(0x100000000 / sides) * sides;
  const buffer = new Uint32Array(1);
  let value;
  do {
    crypto.getRandomValues(buffer);
    value = buffer[0];
  } while (value >= limit);
  return value % sides + 1;
}

export default function DiceRoller({dice, onRoll, disabled = false, label = 'Roll dice'}) {
  const [faces, setFaces] = useState(() => dice.map(die => ({...die, value: null})));
  const [rolling, setRolling] = useState(false);
  const [error, setError] = useState('');
  const timer = useRef(null);
  const ticker = useRef(null);
  const diceKey = JSON.stringify(dice);

  useEffect(() => {
    setFaces(dice.map(die => ({...die, value: null})));
  }, [diceKey]);

  useEffect(() => () => {
    window.clearTimeout(timer.current);
    window.clearInterval(ticker.current);
  }, []);

  async function roll() {
    if (rolling || disabled) return;
    setError('');
    setRolling(true);
    const results = dice.map(die => ({...die, value: secureDie(die.sides)}));
    ticker.current = window.setInterval(() => {
      setFaces(dice.map(die => ({...die, value: secureDie(die.sides)})));
    }, 85);
    timer.current = window.setTimeout(async () => {
      window.clearInterval(ticker.current);
      setFaces(results);
      try {
        await onRoll(results);
      } catch (caught) {
        setError(caught?.message || 'Roll could not be recorded.');
      } finally {
        setRolling(false);
      }
    }, 1150);
  }

  return <div className="dice-roll-group">
    <div className="dice-tray" aria-live="polite" aria-label={rolling ? 'Dice rolling' : 'Dice results'}>
      {faces.map((die, index) => <div className={'die-face' + (rolling ? ' rolling' : '')} key={die.id || index}>
        <small>{die.label}</small><strong>{die.value ?? '—'}</strong><small>d{die.sides}</small>
      </div>)}
    </div>
    <button type="button" onClick={roll} disabled={rolling || disabled}>{rolling ? 'Rolling…' : label}</button>
    {error && <p className="error" role="alert">{error}</p>}
  </div>;
}
