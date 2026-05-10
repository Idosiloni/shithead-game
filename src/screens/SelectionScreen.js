import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView,
} from 'react-native';
import { useGameStore } from '../store/gameStore';
import { socket } from '../socket';
import Card from '../components/Card';

// Shown at the start of the game (before the first turn).
// Each player sees their OWN 6 hand cards on their OWN phone and picks 3 to place face-up.
// Once confirmed, a "waiting for others" view appears until everyone is done.
export default function SelectionScreen() {
  const { myHand, myFaceDown, players, myId } = useGameStore(s => s);

  // IDs of the cards the player has tapped to mark as face-up
  const [chosen, setChosen] = useState([]);
  // True once the player has confirmed — switches to the waiting view
  const [confirmed, setConfirmed] = useState(false);

  // Toggle a card in/out of chosen.
  // If 3 are already chosen and the player taps a 4th, swap it for the last one.
  const toggleCard = (card) => {
    setChosen(prev => {
      if (prev.includes(card.id)) return prev.filter(id => id !== card.id);
      if (prev.length >= 3) return [...prev.slice(0, 2), card.id];
      return [...prev, card.id];
    });
  };

  const handleConfirm = () => {
    if (chosen.length !== 3) return;
    socket.emit('confirm_selection', { faceUpIds: chosen });
    setConfirmed(true);
  };

  // ── Waiting view — shown after the player has confirmed ──────────────────
  if (confirmed) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.waitingContainer}>
          <Text style={styles.waitingIcon}>✓</Text>
          <Text style={styles.waitingTitle}>Cards chosen!</Text>
          <Text style={styles.waitingSubtitle}>Waiting for other players...</Text>

          {/* Show who has confirmed and who hasn't yet */}
          <View style={styles.playerStatuses}>
            {players.map(p => (
              <View key={p.id} style={styles.statusRow}>
                <Text style={[styles.statusDot, p.selectionDone && styles.statusDotDone]}>
                  {p.selectionDone ? '✓' : '·'}
                </Text>
                <Text style={styles.statusName}>
                  {p.name} {p.id === myId ? '(you)' : ''}
                </Text>
                <Text style={p.selectionDone ? styles.statusReady : styles.statusPending}>
                  {p.selectionDone ? 'Ready' : 'Choosing...'}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Card selection view ───────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>

        <Text style={styles.title}>Choose Your Cards</Text>
        <View style={styles.divider} />
        <Text style={styles.subtitle}>
          Pick <Text style={styles.highlight}>3 cards</Text> to place face-up on the table
        </Text>
        <Text style={styles.hint}>
          These are visible to everyone. Pick your strongest cards!
        </Text>

        {/* The 6 hand cards to choose from */}
        <Text style={styles.sectionLabel}>YOUR 6 CARDS — tap to select</Text>
        <View style={styles.cardGrid}>
          {myHand.map(card => (
            <Card
              key={card.id}
              card={card}
              selected={chosen.includes(card.id)}
              onPress={() => toggleCard(card)}
            />
          ))}
        </View>

        {/* Dot counter */}
        <View style={styles.counterRow}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[styles.dot, chosen.length > i && styles.dotFilled]} />
          ))}
          <Text style={styles.counterText}>{chosen.length} / 3 selected</Text>
        </View>

        {/* Face-down cards shown as a reminder */}
        <Text style={styles.sectionLabel}>YOUR 3 BLIND CARDS (you won't see these)</Text>
        <View style={styles.cardRow}>
          {myFaceDown.map((_, i) => <Card key={i} faceDown />)}
        </View>

        {/* Confirm button */}
        <TouchableOpacity
          style={[styles.confirmBtn, chosen.length !== 3 && styles.confirmDisabled]}
          onPress={handleConfirm}
          disabled={chosen.length !== 3}
        >
          <Text style={styles.confirmBtnText}>
            {chosen.length === 3
              ? 'Confirm — Place Face-Up ✓'
              : `Choose ${3 - chosen.length} more`}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f3d20' },

  // ── Selection view ──────────────────────────────────────────────────────
  container: { alignItems: 'center', padding: 20, paddingBottom: 48 },

  title:    { fontSize: 28, color: '#fff', fontWeight: 'bold', marginTop: 20 },
  divider:  { width: 40, height: 2, backgroundColor: '#f4c430', borderRadius: 2, marginVertical: 14 },
  subtitle: { fontSize: 16, color: '#fff', textAlign: 'center' },
  highlight:{ color: '#f4c430', fontWeight: 'bold' },
  hint: {
    fontSize: 13, color: 'rgba(255,255,255,0.5)',
    textAlign: 'center', lineHeight: 20, marginTop: 6, paddingHorizontal: 12,
  },

  sectionLabel: {
    color: '#f4c430', fontSize: 10, fontWeight: '700',
    letterSpacing: 1.5, marginTop: 28, marginBottom: 12, alignSelf: 'flex-start',
  },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  cardRow:  { flexDirection: 'row', gap: 8 },

  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20 },
  dot:       { width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.2)' },
  dotFilled: { backgroundColor: '#f4c430' },
  counterText: { color: '#fff', fontSize: 14, fontWeight: '600', marginLeft: 4 },

  confirmBtn: {
    marginTop: 28, backgroundColor: '#f4c430',
    paddingVertical: 16, paddingHorizontal: 44, borderRadius: 32,
    shadowColor: '#f4c430', shadowOpacity: 0.5, shadowRadius: 12, elevation: 6,
  },
  confirmDisabled: { opacity: 0.3 },
  confirmBtnText:  { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a' },

  // ── Waiting view ────────────────────────────────────────────────────────
  waitingContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  waitingIcon:     { fontSize: 64, color: '#f4c430', marginBottom: 16 },
  waitingTitle:    { fontSize: 28, color: '#fff', fontWeight: 'bold' },
  waitingSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.5)', marginTop: 8, marginBottom: 32 },

  playerStatuses: { width: '100%', gap: 10 },
  statusRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12, padding: 12, gap: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  statusDot:     { fontSize: 18, color: 'rgba(255,255,255,0.3)', width: 24, textAlign: 'center' },
  statusDotDone: { color: '#2ecc71' },
  statusName:    { color: '#fff', fontSize: 15, flex: 1 },
  statusReady:   { color: '#2ecc71', fontSize: 13, fontWeight: '600' },
  statusPending: { color: 'rgba(255,255,255,0.35)', fontSize: 13 },
});
