// server/src/index.ts
// Partykit server for CodeQuest multiplayer
// Deploy: npx partykit deploy

export default {

  // Called when a message arrives from any client
  onMessage(message, connection, room) {
    const data = JSON.parse(message);

    switch (data.type) {

      // ── MATCHMAKING ────────────────────────────────────────────────────────
      case 'join': {
        // Store player info on their connection
        connection.setState({ username: data.username, mode: data.mode, ready: false });

        // Broadcast updated player list to everyone in room
        broadcastRoomState(room);

        // If 2 players are in an arena/race room, start the game
        const players = [...room.connections].map(c => c.state);
        if (players.length === 2 && players.every(p => p)) {
          // Send same questions to both players
          const seed = Math.floor(Math.random() * 999999);
          room.broadcast(JSON.stringify({ type: 'start', seed, players: players.map(p => p.username) }));
        }
        break;
      }

      // ── ARENA: player answered ─────────────────────────────────────────────
      case 'arena_answer': {
        // Relay answer result to all players in room (so opponent sees HP update)
        room.broadcast(JSON.stringify({
          type:     'arena_answer',
          username: data.username,
          correct:  data.correct,
          hpLeft:   data.hpLeft,
          damage:   data.damage,
          qIndex:   data.qIndex,
        }));
        break;
      }

      // ── RACE: position update ──────────────────────────────────────────────
      case 'race_pos': {
        room.broadcast(JSON.stringify({
          type:     'race_pos',
          username: data.username,
          pos:      data.pos,
        }));
        break;
      }

      // ── GENERIC RELAY ─────────────────────────────────────────────────────
      default:
        room.broadcast(message);
    }
  },

  onConnect(connection, room) {
    broadcastRoomState(room);
  },

  onClose(connection, room) {
    broadcastRoomState(room);
    // Tell remaining player their opponent left
    room.broadcast(JSON.stringify({
      type: 'opponent_left',
      username: connection.state?.username,
    }));
  },
};

function broadcastRoomState(room) {
  const players = [...room.connections]
    .map(c => c.state?.username)
    .filter(Boolean);
  room.broadcast(JSON.stringify({ type: 'room_state', players }));
}
