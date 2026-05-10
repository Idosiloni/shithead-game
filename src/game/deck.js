import { SUITS, VALUES, SPECIAL } from './constants';

// Builds a full 54-card deck (52 standard + 2 Jokers) and shuffles it.
export function createDeck() {
  const deck = [];

  // Add all 52 standard cards: every combination of 4 suits × 13 values
  for (const suit of SUITS) {
    for (const value of VALUES) {
      // Each card is an object with suit, numeric value, and a unique id string
      deck.push({ suit, value, id: `${value}-${suit}` });
    }
  }

  // Add 2 Jokers — they use value 15 (above Ace=14) and a special 'joker' suit
  deck.push({ suit: 'joker', value: SPECIAL.JOKER, id: 'joker-1' });
  deck.push({ suit: 'joker', value: SPECIAL.JOKER, id: 'joker-2' });

  return shuffle(deck);
}

// Fisher-Yates shuffle — walks backward through the array, swapping each
// element with a randomly chosen earlier element. Produces a perfectly random order.
function shuffle(arr) {
  const a = [...arr]; // copy so we don't modify the original array
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]; // swap the two elements
  }
  return a;
}

// Deals starting cards to all players.
// Each player receives:
//   • 3 face-down cards (they won't see these until played blind)
//   • 6 hand cards (they will pick 3 of these to place face-up on the table)
// The remaining cards become the draw pile used during gameplay.
export function dealCards(playerCount) {
  const deck = createDeck();
  const players = [];

  for (let i = 0; i < playerCount; i++) {
    players.push({
      id: i,
      name: `Player ${i + 1}`, // placeholder — overwritten with real names in startGame
      faceDown: deck.splice(0, 3), // remove 3 cards from the top of the deck → face-down pile
      faceUp:   [],                // empty for now — filled during the SELECTING phase
      hand:     deck.splice(0, 6), // remove 6 cards → player picks 3 of these for face-up
      finished: false,
    });
  }

  // Whatever cards are left form the draw pile players refill from during the game
  return { players, deck };
}
