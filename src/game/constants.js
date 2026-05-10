// All the fixed values used across the game.
// Changing a number here updates the entire game — nothing is hard-coded elsewhere.

// The four standard suits
export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];

// Card ranks — 2 through 14 (J=11, Q=12, K=13, A=14)
// Jokers use value 15, which is above Ace so they beat everything
export const VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

// Cards that have special effects when played
export const SPECIAL = {
  RESET: 2,        // Always playable — resets the pile as if it were empty
  TRANSLUCENT: 3,  // "See-through" — the pile looks past it to the card below
  OUT_OF_TURN: 4,  // Can be played out of turn when the pile is empty
  REVERSE: 5,      // Reverses the order of play (clockwise ↔ counter-clockwise)
  FORCE_LOWER: 7,  // Next player must play 7 or lower
  SKIP: 8,         // Skips the next player's turn
  BURN: 10,        // Clears the pile; the same player plays again
  JOKER: 15,       // Wild card — player picks who receives the entire pile
};

// Unicode suit symbols shown on cards
export const SUIT_SYMBOLS = {
  hearts:   '♥',
  diamonds: '♦',
  clubs:    '♣',
  spades:   '♠',
};

// Red for hearts/diamonds, dark for clubs/spades
export const SUIT_COLORS = {
  hearts:   '#c0392b',
  diamonds: '#c0392b',
  clubs:    '#1a1a2e',
  spades:   '#1a1a2e',
};

// Labels for face cards — number cards are just shown as their number
export const VALUE_LABELS = {
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
  15: '★', // Joker shown as a star on the corner label
};

// The different screens/stages the game can be in.
// The App renders a different screen depending on which phase is active.
export const PHASES = {
  SETUP:      'setup',      // Home screen — entering player count and names
  SELECTING:  'selecting',  // Each player picks their 3 face-up table cards
  PLAYING:    'playing',    // Main gameplay — playing cards, picking up pile
  PASS_PHONE: 'pass_phone', // Black screen while phone is handed to the next player
  GAME_OVER:  'game_over',  // Game ended — showing the loser (the Shithead)
};
