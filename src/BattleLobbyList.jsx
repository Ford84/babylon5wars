import React from 'react';

export default function BattleLobbyList({games = [], userId, currentGameId, deletingGameId, onOpen, onDelete}) {
  if (!games.length) return <p className="hint">No battles yet. Create a staging room to begin.</p>;

  return <div className="battle-lobby-list">
    {games.map(game => <div className="battle-lobby-row" key={game.id}>
      <button type="button" className="secondary battle-lobby-open" aria-current={currentGameId === game.id ? 'true' : undefined} onClick={() => onOpen(game)}>
        <span>{game.title}</span><small>{game.status === 'setup' ? 'Preparing' : `Turn ${game.turn}`}</small>
      </button>
      {game.host_id === userId && <button type="button" className="danger battle-lobby-delete" disabled={deletingGameId === game.id} onClick={() => onDelete(game)}>
        {deletingGameId === game.id ? 'Deleting…' : 'Delete'}
      </button>}
    </div>)}
  </div>;
}
