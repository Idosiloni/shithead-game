// ── Game Store ───────────────────────────────────────────────────────────────
// In the multiplayer version, all game LOGIC lives on the server.
// This store is purely a mirror of what the server tells us.
// Components read state from here and send actions via socket.emit().

import { create } from 'zustand';

const initialState = {
  // ── Connection / lobby ──────────────────────────────────────────────────────
  phase:      'lobby',   // lobby | waiting_room | selecting | playing | game_over
  myId:       null,      // our socket.id — tells us which player "we" are
  roomCode:   null,
  hostId:     null,
  error:      null,      // error message to show (bad code, disconnected, etc.)
  connecting: false,     // true while waiting for server to respond

  // ── Game state (received from server each update) ───────────────────────────
  myHand:          [],   // our private hand cards
  myFaceUp:        [],   // our face-up table cards (visible to all)
  myFaceDown:      [],   // our face-down cards (UI shows them as backs)
  players:         [],   // all players' public info: { id, name, handCount, faceUp, faceDownCount, finished, selectionDone }
  pile:            [],   // center pile cards
  deckCount:       0,    // how many cards left in the draw pile
  currentPlayerId: null, // whose turn it is (compare to myId to know if it's our turn)
  direction:       1,    // 1 = clockwise, -1 = counter-clockwise
  forceLower:      false,
  jokerPending:    false,
  message:         '',
  finishedOrder:   [],   // player IDs in the order they finished
};

export const useGameStore = create((set, get) => ({
  ...initialState,

  // ── Lobby actions (called from LobbyScreen) ──────────────────────────────

  setConnecting: (connecting) => set({ connecting }),
  clearError:    ()           => set({ error: null }),

  // Server confirmed we created a room
  handleRoomCreated({ code }) {
    set({ roomCode: code, phase: 'waiting_room', connecting: false, error: null });
  },

  // Server confirmed we joined a room
  handleRoomJoined({ code }) {
    set({ roomCode: code, phase: 'waiting_room', connecting: false, error: null });
  },

  // Server sent updated lobby info (someone joined, left, or host changed)
  handleRoomUpdate({ players, hostId }) {
    set({ players, hostId });
  },

  // ── Game state handler (most important — called on every server update) ───

  handleGameState(state) {
    // Map server phase names to client phase names (same in this version)
    const phaseMap = { selecting: 'selecting', playing: 'playing', game_over: 'game_over' };
    set({
      phase:           phaseMap[state.phase] || state.phase,
      myHand:          state.myHand,
      myFaceUp:        state.myFaceUp,
      myFaceDown:      state.myFaceDown,
      players:         state.players,
      pile:            state.pile,
      deckCount:       state.deckCount,
      currentPlayerId: state.currentPlayerId,
      direction:       state.direction,
      forceLower:      state.forceLower,
      jokerPending:    state.jokerPending,
      message:         state.message,
      finishedOrder:   state.finishedOrder,
    });
  },

  // ── Reset ────────────────────────────────────────────────────────────────

  // Goes back to the lobby screen (doesn't disconnect the socket)
  reset() {
    set(initialState);
  },
}));
