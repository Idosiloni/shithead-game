import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { SUIT_SYMBOLS, SUIT_COLORS, VALUE_LABELS, SPECIAL } from '../game/constants';

// A single playing card.
//
// Props:
//   card      — { suit, value, id }
//   selected  — golden glow + lift effect when true
//   onPress   — tap handler
//   faceDown  — show card back instead of face
//   small     — compact size for other players' cards
export default function Card({ card, selected, onPress, faceDown = false, small = false }) {
  const sz = small ? styles.small : styles.normal;

  // ── Face-down card ──────────────────────────────────────────────────────
  if (faceDown) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={onPress ? 0.75 : 1}
        style={[styles.card, sz, styles.faceDown, selected && styles.selected]}
      >
        {/* Classic hatched diamond inner border */}
        <View style={styles.backBorder}>
          <Text style={[styles.backDiamond, small && styles.backDiamondSmall]}>◆</Text>
        </View>
      </TouchableOpacity>
    );
  }

  // ── Joker card ──────────────────────────────────────────────────────────
  if (card.value === SPECIAL.JOKER) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={[styles.card, sz, styles.joker, selected && styles.selected]}
      >
        <Text style={[styles.jokerEmoji, small && styles.jokerEmojiSm]}>🃏</Text>
        {!small && <Text style={styles.jokerWord}>JOKER</Text>}
        <Text style={[styles.jokerEmoji, small && styles.jokerEmojiSm, { transform: [{ rotate: '180deg' }] }]}>🃏</Text>
      </TouchableOpacity>
    );
  }

  // ── Standard face-up card ───────────────────────────────────────────────
  const label  = VALUE_LABELS[card.value] ?? String(card.value);
  const symbol = SUIT_SYMBOLS[card.suit];
  const color  = SUIT_COLORS[card.suit];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      style={[styles.card, sz, selected && styles.selected]}
    >
      {/* Top-left corner — absolutely pinned so it never overflows */}
      <View style={styles.corner}>
        <Text style={[styles.cornerVal, { color }, small && styles.cornerValSm]}>{label}</Text>
        <Text style={[styles.cornerSuit, { color }, small && styles.cornerSuitSm]}>{symbol}</Text>
      </View>

      {/* Centre suit — absolutely centered */}
      <View style={styles.centerWrapper}>
        <Text style={[styles.center, { color }, small && styles.centerSm]}>{symbol}</Text>
      </View>

      {/* Bottom-right corner — absolutely pinned, rotated 180° */}
      <View style={styles.cornerBottom}>
        <Text style={[styles.cornerVal, { color }, small && styles.cornerValSm]}>{label}</Text>
        <Text style={[styles.cornerSuit, { color }, small && styles.cornerSuitSm]}>{symbol}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // ── Base card ─────────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#FEFCF3',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d8d0ba',
    margin: 3,
    position: 'relative',   // needed so absolute children stay inside
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 6,
  },
  normal: { width: 68, height: 104 },
  small:  { width: 48, height: 72  },

  // ── Selected: golden glow and upward lift ─────────────────────────────────
  selected: {
    borderColor: '#f4c430',
    borderWidth: 2.5,
    marginBottom: -16,
    shadowColor: '#f4c430',
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 14,
  },

  // ── Face-down card ────────────────────────────────────────────────────────
  faceDown: {
    backgroundColor: '#16335c',
    borderColor: '#1e4a8a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBorder: {
    position: 'absolute', top: 5, left: 5, right: 5, bottom: 5,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  backDiamond:    { fontSize: 20, color: 'rgba(255,255,255,0.2)' },
  backDiamondSmall: { fontSize: 14 },

  // ── Joker card ────────────────────────────────────────────────────────────
  joker: {
    backgroundColor: '#2d0a4e',
    borderColor: '#7d3dbd',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
  },
  jokerEmoji:   { fontSize: 24, textAlign: 'center' },
  jokerEmojiSm: { fontSize: 17 },
  jokerWord: {
    fontSize: 9, fontWeight: 'bold',
    color: '#f4c430', letterSpacing: 2, textAlign: 'center',
  },

  // ── Corner labels — absolutely pinned so text never overflows card bounds ──
  corner: {
    position: 'absolute', top: 4, left: 5,
    alignItems: 'flex-start',
  },
  cornerBottom: {
    position: 'absolute', bottom: 4, right: 5,
    alignItems: 'flex-end',
    transform: [{ rotate: '180deg' }],
  },

  cornerVal:    { fontSize: 14, fontWeight: '800', lineHeight: 16 },
  cornerValSm:  { fontSize: 11, lineHeight: 13 },
  cornerSuit:   { fontSize: 12, lineHeight: 14 },
  cornerSuitSm: { fontSize: 9,  lineHeight: 11 },

  // ── Centre symbol — absolutely centered so layout never pushes it out ─────
  centerWrapper: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  center:   { fontSize: 28, textAlign: 'center' },
  centerSm: { fontSize: 20 },
});
