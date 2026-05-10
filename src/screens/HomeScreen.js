import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView,
} from 'react-native';
import { useGameStore } from '../store/gameStore';

// The setup screen — shown before the game starts.
// Players enter how many people are playing and optionally type their names.
export default function HomeScreen() {
  // How many players (2-6)
  const [count, setCount] = useState(2);

  // An array of 6 name strings — we only use the first `count` of them
  const [names, setNames] = useState(['', '', '', '', '', '']);

  // Get the startGame action from the store
  const startGame = useGameStore(s => s.startGame);

  // Update one name in the array without touching the others
  const updateName = (i, val) => {
    const updated = [...names];
    updated[i] = val;
    setNames(updated);
  };

  // Only render inputs for the number of players selected
  const playerSlots = Array.from({ length: count }, (_, i) => i);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* Title */}
        <Text style={styles.emoji}>💩</Text>
        <Text style={styles.title}>SHITHEAD</Text>
        <Text style={styles.subtitle}>Card Game</Text>
        <View style={styles.divider} />

        {/* Player count selector — tapping a number updates `count` */}
        <Text style={styles.sectionLabel}>NUMBER OF PLAYERS</Text>
        <View style={styles.countRow}>
          {[2, 3, 4, 5, 6].map(n => (
            <TouchableOpacity
              key={n}
              style={[styles.countBtn, count === n && styles.countBtnActive]}
              onPress={() => setCount(n)}
            >
              <Text style={[styles.countBtnText, count === n && styles.countBtnTextActive]}>
                {n}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Name input fields — one per player */}
        <Text style={styles.sectionLabel}>PLAYER NAMES</Text>
        {playerSlots.map(i => (
          <TextInput
            key={i}
            style={styles.input}
            placeholder={`Player ${i + 1}`}
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={names[i]}
            onChangeText={v => updateName(i, v)}
            maxLength={12}
            returnKeyType="next"
          />
        ))}

        {/* Start button — passes count and names to the store */}
        <TouchableOpacity
          style={styles.startBtn}
          onPress={() => startGame(count, names)}
        >
          <Text style={styles.startBtnText}>Start Game</Text>
        </TouchableOpacity>

        {/* Quick reference for special cards */}
        <View style={styles.rulesBox}>
          <Text style={styles.rulesTitle}>Special Cards</Text>
          <Text style={styles.rulesRow}>2 — Reset pile (always playable)</Text>
          <Text style={styles.rulesRow}>3 — Transparent (pile looks through it)</Text>
          <Text style={styles.rulesRow}>7 — Next player must play ≤ 7</Text>
          <Text style={styles.rulesRow}>8 — Skip next player</Text>
          <Text style={styles.rulesRow}>10 — Burn pile, play again</Text>
          <Text style={styles.rulesRow}>🃏 Joker — send pile to any player</Text>
          <Text style={styles.rulesRow}>4 of a kind — auto-burn pile</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1a7a3f' },
  container: { alignItems: 'center', padding: 24, paddingBottom: 48 },

  emoji:    { fontSize: 64, marginTop: 24 },
  title:    { fontSize: 36, fontWeight: 'bold', color: '#fff', letterSpacing: 4, marginTop: 6 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.5)', letterSpacing: 3, marginTop: 2 },
  divider:  { width: 50, height: 2, backgroundColor: '#f4c430', borderRadius: 2, marginVertical: 24 },

  sectionLabel: {
    color: '#f4c430', fontSize: 11, fontWeight: '700', letterSpacing: 1.5,
    alignSelf: 'flex-start', marginBottom: 12, marginTop: 4,
  },

  // Circular number buttons for player count
  countRow: { flexDirection: 'row', gap: 10, marginBottom: 8, alignSelf: 'flex-start' },
  countBtn: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  countBtnActive:     { backgroundColor: '#f4c430', borderColor: '#f4c430' },
  countBtnText:       { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  countBtnTextActive: { color: '#1a1a1a' },

  // Name input fields
  input: {
    width: '100%', backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13,
    color: '#fff', fontSize: 16, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },

  // Start button
  startBtn: {
    marginTop: 20, backgroundColor: '#f4c430',
    paddingVertical: 16, paddingHorizontal: 56, borderRadius: 32,
    shadowColor: '#f4c430', shadowOpacity: 0.45, shadowRadius: 12, elevation: 6,
  },
  startBtnText: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a', letterSpacing: 0.5 },

  // Special cards cheat sheet
  rulesBox: {
    marginTop: 28, backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 14, padding: 16, width: '100%',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  rulesTitle: {
    color: '#f4c430', fontWeight: 'bold', fontSize: 12,
    marginBottom: 10, textAlign: 'center', letterSpacing: 1,
  },
  rulesRow: {
    color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 22, textAlign: 'center',
  },
});
