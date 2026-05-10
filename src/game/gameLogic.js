import { SPECIAL } from './constants';

// Finds the "real" top card of the pile by skipping past any 3s.
// 3s are transparent — they don't count as the value to beat.
// Example: pile = [7, 3, 3] → effective top is 7, not 3.
export function getEffectiveTop(pile) {
  for (let i = pile.length - 1; i >= 0; i--) {
    if (pile[i].value !== SPECIAL.TRANSLUCENT) return pile[i];
  }
  return null; // pile is empty or all 3s — treated as empty
}

// Decides whether a given card is legally allowed to be played right now.
export function canPlay(card, pile, forceLower) {
  // These cards bypass ALL normal rules — they can always be played:
  //   2  — resets pile
  //   3  — transparent (always OK, and next player plays vs. card below it)
  //   10 — burns pile (can be played on anything, even a higher card)
  //   Joker — wild
  if (card.value === SPECIAL.RESET)       return true;
  if (card.value === SPECIAL.TRANSLUCENT) return true;
  if (card.value === SPECIAL.BURN)        return true; // 10 always playable
  if (card.value === SPECIAL.JOKER)       return true;

  const top = getEffectiveTop(pile);
  if (!top) return true; // pile is empty (or all 3s) — any card can start it

  // A 7 was played — next player must play 7 or lower.
  // Note: 4 is ≤7 so it satisfies this rule naturally.
  if (forceLower) return card.value <= 7;

  // Normal rule: must match or beat the top card's value
  return card.value >= top.value;
}

// Returns true if the player has at least one card they're allowed to play.
// Used to decide whether the "Pick Up Pile" button should be enabled.
export function canPlayAny(cards, pile, forceLower) {
  return cards.some(c => canPlay(c, pile, forceLower));
}

// Returns true if the last 4 cards on the pile are all the same rank.
// Four of a kind burns the pile and lets the same player go again.
export function checkFourOfAKind(pile) {
  if (pile.length < 4) return false;
  const last4 = pile.slice(-4);
  return last4.every(c => c.value === last4[0].value);
}

// Returns which set of cards the player should currently be playing from.
// The hierarchy is: hand (known cards) → face-up (visible to all) → face-down (blind).
export function getPlayerActiveCards(player) {
  if (player.hand.length > 0)   return { cards: player.hand,    source: 'hand' };
  if (player.faceUp.length > 0) return { cards: player.faceUp,  source: 'faceUp' };
  return                               { cards: player.faceDown, source: 'faceDown' };
}

// A player has finished (won) when they have no cards left anywhere.
export function isPlayerFinished(player) {
  return (
    player.hand.length     === 0 &&
    player.faceUp.length   === 0 &&
    player.faceDown.length === 0
  );
}

// Returns the index of the next player who hasn't finished yet.
// direction is 1 (clockwise) or -1 (counter-clockwise).
export function nextPlayerIndex(current, direction, playerCount, finished) {
  let idx = current;
  for (let i = 0; i < playerCount; i++) {
    // Double-modulo ensures we never get a negative index when going counter-clockwise
    idx = ((idx + direction) % playerCount + playerCount) % playerCount;
    if (!finished[idx]) return idx;
  }
  return -1; // all players finished — shouldn't happen during normal gameplay
}

// Finds which player should take the very first turn.
// The player with a 4 in their (3-card) hand goes first.
// If multiple have one, the lowest player index wins. If no one has a 4, pick randomly.
export function whoStartsFirst(players) {
  for (const p of players) {
    if (p.hand.some(c => c.value === SPECIAL.OUT_OF_TURN)) return p.id;
  }
  return Math.floor(Math.random() * players.length);
}
