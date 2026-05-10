// ── Shithead Game Server ─────────────────────────────────────────────────────
// Works locally (node server.js) AND on free cloud hosts like Railway/Render.
// Cloud providers add HTTPS automatically — no self-signed cert needed.
//
// Local:  node server.js  →  http://localhost:3001
// Cloud:  deploy this file + dist/ folder; set start script to "node server.js"

const http    = require('http');
const express = require('express');
const path    = require('path');
const { Server } = require('socket.io');

// Cloud hosts inject PORT; fall back to 3001 locally
const PORT = process.env.PORT || 3001;

// Express serves the built web app files (created by: npx expo export --platform web)
const app = express();
app.use(express.static(path.join(__dirname, 'dist')));
// For any route not found as a static file, serve the app's index.html (single-page app)
app.get('/{*path}', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  // Allow connections from any origin (needed for cross-device play)
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// ── Card & deck constants ────────────────────────────────────────────────────

const SUITS  = ['hearts', 'diamonds', 'clubs', 'spades'];
const VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

// Special card values and their effects
const S = {
  RESET:       2,  // always playable, resets pile
  TRANSLUCENT: 3,  // transparent — pile looks through it
  OUT_OF_TURN: 4,  // can be played out of turn on empty pile
  REVERSE:     5,  // reverses direction
  FORCE_LOWER: 7,  // next player must play ≤ 7
  SKIP:        8,  // skips next player
  BURN:        10, // clears pile, play again
  JOKER:       15, // send pile to any player
};

// ── Deck utilities ───────────────────────────────────────────────────────────

function createDeck() {
  const deck = [];
  for (const suit of SUITS)
    for (const value of VALUES)
      deck.push({ suit, value, id: `${value}-${suit}` });
  deck.push({ suit: 'joker', value: S.JOKER, id: 'joker-1' });
  deck.push({ suit: 'joker', value: S.JOKER, id: 'joker-2' });
  return shuffle(deck);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Game rules ───────────────────────────────────────────────────────────────

// Walk backward through the pile, skipping 3s, to find the card that sets the bar
function getEffectiveTop(pile) {
  for (let i = pile.length - 1; i >= 0; i--)
    if (pile[i].value !== S.TRANSLUCENT) return pile[i];
  return null;
}

function canPlay(card, pile, forceLower) {
  // These cards bypass all normal rules
  if (card.value === S.RESET)       return true;
  if (card.value === S.TRANSLUCENT) return true;
  if (card.value === S.BURN)        return true; // 10 always playable
  if (card.value === S.JOKER)       return true;
  const top = getEffectiveTop(pile);
  if (!top) return true; // empty pile — anything goes
  if (forceLower) return card.value <= 7; // 4 is ≤7 so it works here
  return card.value >= top.value;
}

function canPlayAny(cards, pile, forceLower) {
  return cards.some(c => canPlay(c, pile, forceLower));
}

function checkFourOfAKind(pile) {
  if (pile.length < 4) return false;
  const last4 = pile.slice(-4);
  return last4.every(c => c.value === last4[0].value);
}

// Count consecutive same-value cards from the top of the pile (no 3-skipping)
function countTopSame(pile) {
  if (pile.length === 0) return { count: 0, value: null };
  const topVal = pile[pile.length - 1].value;
  let count = 0;
  for (let i = pile.length - 1; i >= 0; i--) {
    if (pile[i].value === topVal) count++;
    else break;
  }
  return { count, value: topVal };
}

// Returns { cards, source } — which pile the player should play from right now
function getActiveCards(player) {
  if (player.hand.length > 0)   return { cards: player.hand,    source: 'hand'    };
  if (player.faceUp.length > 0) return { cards: player.faceUp,  source: 'faceUp'  };
  return                               { cards: player.faceDown, source: 'faceDown' };
}

function isFinished(player) {
  return player.hand.length === 0 && player.faceUp.length === 0 && player.faceDown.length === 0;
}

// Returns the array index of the next non-finished player
function nextIdx(current, direction, players, finishedIds) {
  const n = players.length;
  let i = current;
  for (let step = 0; step < n; step++) {
    i = ((i + direction) % n + n) % n;
    if (!finishedIds.has(players[i].id)) return i;
  }
  return -1;
}

// The player with a 4 in their hand goes first; else random
function whoStarts(players) {
  for (const p of players)
    if (p.hand.some(c => c.value === S.OUT_OF_TURN)) return p.id;
  return players[Math.floor(Math.random() * players.length)].id;
}

// ── Room management ──────────────────────────────────────────────────────────

// rooms: Map<code, room>
// Each room: { code, hostId, players:[{id,name}], phase, gs }
const rooms = new Map();

function makeCode() {
  let code;
  do { code = Math.random().toString(36).substr(2, 4).toUpperCase(); }
  while (rooms.has(code));
  return code;
}

// Broadcast public waiting-room info to everyone in the room
function broadcastLobby(code) {
  const room = rooms.get(code);
  if (!room) return;
  io.to(code).emit('room_update', {
    code,
    hostId: room.hostId,
    players: room.players.map(p => ({ id: p.id, name: p.name })),
  });
}

// Send each player their personalised game state (private hand, public everything else)
function broadcastGame(room) {
  const gs = room.gs;
  for (const rp of room.players) {
    const gp = gs.players.find(p => p.id === rp.id);
    if (!gp) continue;
    const sock = io.sockets.sockets.get(rp.id);
    if (!sock) continue;

    sock.emit('game_state', {
      phase:           gs.phase,
      // Private — only this player gets their own cards
      myHand:          gp.hand,
      myFaceUp:        gp.faceUp,
      myFaceDown:      gp.faceDown, // values sent but UI shows them face-down
      // Public info for all players
      players: gs.players.map(p => ({
        id:            p.id,
        name:          p.name,
        handCount:     p.hand.length,
        faceUp:        p.faceUp,      // face-up cards are visible to everyone
        faceDownCount: p.faceDown.length,
        finished:      p.finished,
        selectionDone: p.selectionDone,
      })),
      pile:            gs.pile,
      deckCount:       gs.deck.length,
      currentPlayerId: gs.currentPlayerId,
      direction:       gs.direction,
      forceLower:      gs.forceLower,
      jokerPending:    gs.jokerPending,
      message:         gs.message,
      finishedOrder:   gs.finishedOrder,
    });
  }
}

// ── Game flow functions ──────────────────────────────────────────────────────

function startGame(room) {
  const deck = createDeck();

  // Deal 3 face-down + 6 hand cards per player
  const players = room.players.map(p => ({
    id:           p.id,
    name:         p.name,
    faceDown:     deck.splice(0, 3),
    faceUp:       [],                // filled during selection phase
    hand:         deck.splice(0, 6), // player picks 3 of these for face-up
    finished:     false,
    selectionDone: false,
  }));

  room.gs = {
    phase:           'selecting',
    players,
    deck,
    pile:            [],
    currentPlayerId: null,
    direction:       1,
    forceLower:      false,
    jokerPending:    false,
    finishedOrder:   [],
    message:         'Pick your 3 face-up cards',
  };
  room.phase = 'selecting';
  broadcastGame(room);
}

function confirmSelection(room, playerId, faceUpIds) {
  const gs = room.gs;
  const player = gs.players.find(p => p.id === playerId);
  if (!player || player.selectionDone) return;

  const faceUp = player.hand.filter(c =>  faceUpIds.includes(c.id));
  const hand   = player.hand.filter(c => !faceUpIds.includes(c.id));
  if (faceUp.length !== 3) return; // must pick exactly 3

  player.faceUp       = faceUp;
  player.hand         = hand;
  player.selectionDone = true;

  const allDone = gs.players.every(p => p.selectionDone);
  if (allDone) {
    // Everyone's ready — find who goes first and start
    const startId = whoStarts(gs.players);
    gs.phase           = 'playing';
    gs.currentPlayerId = startId;
    gs.message         = `${gs.players.find(p => p.id === startId).name}'s turn — play your 4 to start!`;
    room.phase = 'playing';
  }
  broadcastGame(room);
}

function playCards(room, playerId, cardIds) {
  const gs = room.gs;
  if (gs.currentPlayerId !== playerId) return; // not your turn

  const playerIdx = gs.players.findIndex(p => p.id === playerId);
  const player    = gs.players[playerIdx];
  const { cards: activeCards, source } = getActiveCards(player);

  const played    = activeCards.filter(c => cardIds.includes(c.id));
  if (played.length === 0) return;
  if (!played.every(c => c.value === played[0].value)) return; // must all be same value

  const remaining = activeCards.filter(c => !cardIds.includes(c.id));

  // Face-down blind play: if the card can't be played, pick up pile + that card
  if (source === 'faceDown' && !canPlay(played[0], gs.pile, gs.forceLower)) {
    player.faceDown = remaining;
    player.hand     = [...player.hand, ...gs.pile, ...played];
    gs.pile         = [];
    gs.forceLower   = false;
    const finSet    = new Set(gs.finishedOrder);
    const ni        = nextIdx(playerIdx, gs.direction, gs.players, finSet);
    gs.currentPlayerId = gs.players[ni].id;
    gs.message         = `${player.name} flipped a card they couldn't play — they pick up the pile!`;
    broadcastGame(room);
    return;
  }

  if (source !== 'faceDown' && !canPlay(played[0], gs.pile, gs.forceLower)) return;

  // Remove played cards from the source pile
  player[source] = remaining;

  // Refill hand from deck if playing from hand
  if (source === 'hand') {
    while (player.hand.length < 3 && gs.deck.length > 0)
      player.hand.push(gs.deck.shift());
  }

  let newPile   = [...gs.pile, ...played];
  const cardVal = played[0].value;

  // ── Joker: pause and let the player choose a target ──
  if (cardVal === S.JOKER) {
    gs.pile        = newPile;
    gs.jokerPending = true;
    gs.message     = `${player.name} played a Joker! They choose who gets the pile.`;
    broadcastGame(room);
    return;
  }

  // ── Four of a kind burns the pile ──
  let extraTurn = false;
  let burned    = false;
  if (checkFourOfAKind(newPile)) { newPile = []; burned = true; extraTurn = true; }

  let newDir       = gs.direction;
  let newSkip      = false;
  let newForceLower = false;

  if (!burned) {
    if      (cardVal === S.BURN)        { newPile = []; burned = true; extraTurn = true; }
    else if (cardVal === S.SKIP)        { newSkip = true; }
    else if (cardVal === S.REVERSE)     { newDir = gs.direction * -1; }
    else if (cardVal === S.FORCE_LOWER) { newForceLower = true; }
  }

  gs.pile       = newPile;
  gs.direction  = newDir;
  // 3 is translucent — it doesn't change forceLower (the 7 effect persists through it)
  if (cardVal !== S.TRANSLUCENT) gs.forceLower = newForceLower;

  // Check if this player finished
  if (isFinished(player) && !gs.finishedOrder.includes(playerId)) {
    player.finished = true;
    gs.finishedOrder.push(playerId);
  }

  const finSet      = new Set(gs.finishedOrder);
  const stillActive = gs.players.filter(p => !finSet.has(p.id));

  // ── Game over: only 1 player left ──
  if (stillActive.length <= 1) {
    const loser   = gs.players.find(p => !finSet.has(p.id));
    gs.phase      = 'game_over';
    room.phase    = 'game_over';
    gs.message    = loser ? `${loser.name} is the SHITHEAD! 💩` : 'Game Over!';
    broadcastGame(room);
    return;
  }

  // ── Determine next player ──
  let message = '';
  let nextPlayerId;

  if (extraTurn) {
    nextPlayerId = playerId;
    message      = burned ? `Pile burned! ${player.name} plays again.` : '';
  } else {
    let ni = nextIdx(playerIdx, newDir, gs.players, finSet);
    if (newSkip) {
      message = `${gs.players[ni].name} is skipped!`;
      ni = nextIdx(ni, newDir, gs.players, finSet);
    }
    nextPlayerId = gs.players[ni].id;
  }

  gs.currentPlayerId = nextPlayerId;
  gs.message         = message || `${gs.players.find(p => p.id === nextPlayerId).name}'s turn`;
  broadcastGame(room);
}

// Speed interrupt: any player can jump in to play a 4 on an empty pile
// OR to complete four-of-a-kind — first one to tap wins.
function interruptPlay(room, playerId, cardIds) {
  const gs = room.gs;
  if (gs.phase !== 'playing' || gs.jokerPending) return;

  const playerIdx = gs.players.findIndex(p => p.id === playerId);
  const player    = gs.players[playerIdx];
  if (!player || player.finished) return;

  const { cards: activeCards, source } = getActiveCards(player);
  if (source === 'faceDown') return; // no blind-flip interrupts

  const played = activeCards.filter(c => cardIds.includes(c.id));
  if (played.length === 0) return;
  if (!played.every(c => c.value === played[0].value)) return;

  const cardVal = played[0].value;

  const removeAndRefill = () => {
    player[source] = activeCards.filter(c => !cardIds.includes(c.id));
    if (source === 'hand')
      while (player.hand.length < 3 && gs.deck.length > 0)
        player.hand.push(gs.deck.shift());
  };

  const checkGameOver = () => {
    if (isFinished(player) && !gs.finishedOrder.includes(playerId)) {
      player.finished = true;
      gs.finishedOrder.push(playerId);
    }
    const finSet      = new Set(gs.finishedOrder);
    const stillActive = gs.players.filter(p => !finSet.has(p.id));
    if (stillActive.length <= 1) {
      const loser = gs.players.find(p => !finSet.has(p.id));
      gs.phase = room.phase = 'game_over';
      gs.message = loser ? `${loser.name} is the SHITHEAD! 💩` : 'Game Over!';
      broadcastGame(room);
      return true;
    }
    return false;
  };

  // ── Case 1: 4 on an empty pile (steal the turn) ──────────────────────────
  if (gs.pile.length === 0 && cardVal === S.OUT_OF_TURN) {
    removeAndRefill();
    gs.pile = [...played];
    gs.forceLower = false;
    const finSet = new Set(gs.finishedOrder);
    const ni     = nextIdx(playerIdx, gs.direction, gs.players, finSet);
    gs.currentPlayerId = gs.players[ni].id;
    gs.message = `⚡ ${player.name} slapped a 4! ${gs.players[ni].name}'s turn.`;
    broadcastGame(room);
    return;
  }

  // ── Case 2: completing four-of-a-kind (burn the pile) ────────────────────
  const { count: topCount, value: topVal } = countTopSame(gs.pile);
  if (topCount > 0 && cardVal === topVal && topCount + played.length === 4) {
    removeAndRefill();
    gs.pile = [];
    gs.forceLower = false;
    if (checkGameOver()) return;
    gs.currentPlayerId = playerId; // burner plays again
    gs.message = `🔥 ${player.name} completed four-of-a-kind! Pile burned — they play again!`;
    broadcastGame(room);
  }
}

function pickUpPile(room, playerId) {
  const gs = room.gs;
  if (gs.currentPlayerId !== playerId) return;
  if (gs.pile.length === 0) return;

  const playerIdx = gs.players.findIndex(p => p.id === playerId);
  const player    = gs.players[playerIdx];
  player.hand     = [...player.hand, ...gs.pile];
  gs.pile         = [];
  gs.forceLower   = false;

  const finSet = new Set(gs.finishedOrder);
  const ni     = nextIdx(playerIdx, gs.direction, gs.players, finSet);
  gs.currentPlayerId = gs.players[ni].id;
  gs.message         = `${player.name} picked up the pile. ${gs.players[ni].name}'s turn.`;
  broadcastGame(room);
}

function resolveJoker(room, playerId, targetId) {
  const gs = room.gs;
  if (!gs.jokerPending || gs.currentPlayerId !== playerId) return;

  const target = gs.players.find(p => p.id === targetId);
  if (!target || target.id === playerId) return;

  // The Joker itself is burned (discarded) — only the other pile cards go to the target
  const pileWithoutJoker = gs.pile.filter(c => c.value !== S.JOKER);
  target.hand     = [...target.hand, ...pileWithoutJoker];
  gs.pile         = [];
  gs.jokerPending = false;

  const current = gs.players.find(p => p.id === playerId);
  if (isFinished(current) && !gs.finishedOrder.includes(playerId)) {
    current.finished = true;
    gs.finishedOrder.push(playerId);
  }

  const finSet      = new Set(gs.finishedOrder);
  const stillActive = gs.players.filter(p => !finSet.has(p.id));
  if (stillActive.length <= 1) {
    const loser   = gs.players.find(p => !finSet.has(p.id));
    gs.phase      = 'game_over';
    room.phase    = 'game_over';
    gs.message    = loser ? `${loser.name} is the SHITHEAD! 💩` : 'Game Over!';
    broadcastGame(room);
    return;
  }

  gs.message = `Joker! ${target.name} picks up the pile. ${current.name} plays again.`;
  broadcastGame(room);
}

// ── Socket.io event handlers ─────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`+ Connected: ${socket.id}`);

  socket.on('create_room', ({ name }) => {
    if (!name?.trim()) return;
    const code = makeCode();
    rooms.set(code, {
      code,
      hostId:  socket.id,
      players: [{ id: socket.id, name: name.trim() }],
      phase:   'waiting',
      gs:      null,
    });
    socket.join(code);
    socket.roomCode = code;
    socket.emit('room_created', { code });
    broadcastLobby(code);
    console.log(`Room ${code} created by ${name}`);
  });

  socket.on('join_room', ({ name, code }) => {
    if (!name?.trim() || !code?.trim()) return;
    const upper = code.trim().toUpperCase();
    const room  = rooms.get(upper);
    if (!room)                  { socket.emit('join_error', 'Room not found — check the code'); return; }
    if (room.phase !== 'waiting') { socket.emit('join_error', 'Game already started');            return; }
    if (room.players.length >= 6) { socket.emit('join_error', 'Room is full (max 6 players)');   return; }

    room.players.push({ id: socket.id, name: name.trim() });
    socket.join(upper);
    socket.roomCode = upper;
    socket.emit('room_joined', { code: upper });
    broadcastLobby(upper);
    console.log(`${name} joined room ${upper}`);
  });

  socket.on('start_game', () => {
    const room = rooms.get(socket.roomCode);
    if (!room || socket.id !== room.hostId) return;
    if (room.players.length < 2) { socket.emit('join_error', 'Need at least 2 players'); return; }
    startGame(room);
    console.log(`Game started in room ${socket.roomCode}`);
  });

  socket.on('confirm_selection', ({ faceUpIds }) => {
    const room = rooms.get(socket.roomCode);
    if (room) confirmSelection(room, socket.id, faceUpIds);
  });

  socket.on('play_cards', ({ cardIds }) => {
    const room = rooms.get(socket.roomCode);
    if (room) playCards(room, socket.id, cardIds);
  });

  socket.on('interrupt_play', ({ cardIds }) => {
    const room = rooms.get(socket.roomCode);
    if (room) interruptPlay(room, socket.id, cardIds);
  });

  socket.on('kick_player', ({ targetId }) => {
    const room = rooms.get(socket.roomCode);
    if (!room || socket.id !== room.hostId || room.phase !== 'waiting') return;
    room.players = room.players.filter(p => p.id !== targetId);
    const targetSock = io.sockets.sockets.get(targetId);
    if (targetSock) {
      targetSock.emit('join_error', 'You were removed from the room by the host.');
      targetSock.leave(socket.roomCode);
    }
    broadcastLobby(socket.roomCode);
  });

  socket.on('pick_up_pile', () => {
    const room = rooms.get(socket.roomCode);
    if (room) pickUpPile(room, socket.id);
  });

  socket.on('resolve_joker', ({ targetId }) => {
    const room = rooms.get(socket.roomCode);
    if (room) resolveJoker(room, socket.id, targetId);
  });

  socket.on('disconnect', () => {
    const code = socket.roomCode;
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;

    room.players = room.players.filter(p => p.id !== socket.id);
    console.log(`- Disconnected: ${socket.id} from room ${code}`);

    if (room.players.length === 0) {
      rooms.delete(code);
      console.log(`Room ${code} closed`);
      return;
    }
    // Reassign host if they left
    if (room.hostId === socket.id) room.hostId = room.players[0].id;

    if (room.phase === 'waiting') {
      broadcastLobby(code);
    } else if (room.gs) {
      // Mark the disconnected player as finished so the game can continue
      const gp = room.gs.players.find(p => p.id === socket.id);
      if (gp) { gp.finished = true; room.gs.finishedOrder.push(socket.id); }
      room.gs.message = `${gp?.name || 'A player'} disconnected.`;
      broadcastGame(room);
    }
  });
});

// ── Start the server ─────────────────────────────────────────────────────────

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🂠  Shithead server running on port ${PORT}`);
  console.log(`   Local: http://localhost:${PORT}\n`);
});
