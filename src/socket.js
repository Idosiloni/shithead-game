// ── Socket connection ────────────────────────────────────────────────────────
// This file creates ONE socket connection for the whole app and wires up
// all the server → client event handlers.
//
// We use the same hostname the browser used to open the app, so it works
// automatically on any device (localhost on the dev machine, 192.168.x.x on phones).

import { io } from 'socket.io-client';
import { useGameStore } from './store/gameStore';

// Connect back to the same origin that served the web page.
// This works for local Wi-Fi (192.168.x.x:3001) AND ngrok (https://xxx.ngrok.io)
// without any hardcoded addresses.
const SERVER_URL = typeof window !== 'undefined'
  ? window.location.origin
  : 'http://localhost:3001';

// Create the socket but don't connect yet — we call connect() inside setupSocket()
export const socket = io(SERVER_URL, {
  transports: ['websocket', 'polling'], // try websocket first, fall back to polling
  autoConnect: false,
});

// Flag to prevent setting up duplicate event listeners on hot-reload
let initialized = false;

// Call this once at app startup (from App.js).
// Sets up all server → client event handlers and opens the connection.
export function setupSocket() {
  if (initialized) return;
  initialized = true;

  // When we connect, save our socket ID so we know which player "we" are
  socket.on('connect', () => {
    useGameStore.setState({ myId: socket.id });
    console.log('Connected to server as', socket.id);
  });

  // Host created a room — move to the waiting room screen
  socket.on('room_created', (data) => {
    useGameStore.getState().handleRoomCreated(data);
  });

  // We joined someone else's room — move to the waiting room screen
  socket.on('room_joined', (data) => {
    useGameStore.getState().handleRoomJoined(data);
  });

  // Updated list of who's in the lobby (someone joined or left)
  socket.on('room_update', (data) => {
    useGameStore.getState().handleRoomUpdate(data);
  });

  // Server sent a fresh game state — update everything
  socket.on('game_state', (data) => {
    useGameStore.getState().handleGameState(data);
  });

  // An error occurred (bad room code, game started, etc.)
  socket.on('join_error', (message) => {
    useGameStore.setState({ error: message, connecting: false });
  });

  // Lost connection to the server
  socket.on('disconnect', (reason) => {
    console.log('Disconnected:', reason);
    useGameStore.setState({ error: 'Connection lost. Please refresh.' });
  });

  socket.connect();
}
