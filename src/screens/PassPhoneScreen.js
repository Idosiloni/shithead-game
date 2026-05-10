import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useGameStore } from '../store/gameStore';

// The "pass the phone" interstitial screen.
// Shown between every turn so players can't see each other's cards.
// Also used between the card-selection rounds at the start of the game.
export default function PassPhoneScreen() {
  const { players, currentPlayerIndex, message, confirmPassPhone, selectionPlayerIndex } = useGameStore(s => s);

  // During the selection phase (selectionPlayerIndex is not null),
  // the phone is being passed to the NEXT person who needs to pick their face-up cards.
  // During normal gameplay, it's passed to whoever's turn is next.
  const isSelectionPhase = selectionPlayerIndex !== null;
  const targetIdx = isSelectionPhase ? selectionPlayerIndex : currentPlayerIndex;
  const nextPlayer = players[targetIdx];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Icon changes depending on whether this is a selection pass or a turn pass */}
        <Text style={styles.icon}>{isSelectionPhase ? '🙈' : '📱'}</Text>

        <Text style={styles.heading}>Pass the phone to</Text>
        <Text style={styles.name}>{nextPlayer?.name}</Text>

        {/* Context message — e.g. "Player 2's turn" or "Player 2, choose your face-up cards" */}
        <Text style={styles.message}>{message}</Text>

        {/* The ready button — label changes based on what the next player will do */}
        <TouchableOpacity style={styles.btn} onPress={confirmPassPhone}>
          <Text style={styles.btnText}>
            I'm {nextPlayer?.name} —{' '}
            {isSelectionPhase ? 'Show My Cards' : 'Ready!'}
          </Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0d1117' }, // near-black so the screen is clearly "off"
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },

  icon:    { fontSize: 72, marginBottom: 20 },
  heading: { fontSize: 18, color: 'rgba(255,255,255,0.45)', fontWeight: '600', letterSpacing: 0.5 },
  name: {
    fontSize: 44, color: '#f4c430', fontWeight: 'bold',
    marginTop: 8, textAlign: 'center',
  },
  message: {
    fontSize: 15, color: 'rgba(255,255,255,0.4)',
    marginTop: 20, textAlign: 'center', lineHeight: 22, maxWidth: 300,
  },
  btn: {
    marginTop: 44, backgroundColor: '#1a7a3f',
    paddingVertical: 16, paddingHorizontal: 32,
    borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: 'bold', textAlign: 'center' },
});
