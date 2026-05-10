import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { socket } from '../socket';

export default function GameOverScreen() {
  const { players, finishedOrder } = useGameStore(s => s);

  // finishedOrder is an array of player IDs in the order they finished
  const winners = finishedOrder.map(id => players.find(p => p.id === id)).filter(Boolean);
  // The loser is whoever is NOT in finishedOrder
  const loserPlayer = players.find(p => !finishedOrder.includes(p.id));

  const handlePlayAgain = () => {
    // Disconnect, reconnect fresh — server cleaned up the room already
    socket.disconnect();
    socket.connect();
    useGameStore.getState().reset();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.emoji}>💩</Text>
        <Text style={styles.title}>SHITHEAD</Text>

        {/* Loser callout */}
        <View style={styles.loserBox}>
          <Text style={styles.loserLabel}>THE SHITHEAD IS</Text>
          <Text style={styles.loserName}>{loserPlayer?.name ?? '?'}</Text>
        </View>

        {/* Finishing order */}
        {winners.length > 0 && (
          <View style={styles.orderBox}>
            <Text style={styles.orderTitle}>FINISHING ORDER</Text>
            {winners.map((p, i) => (
              <View key={p.id} style={styles.orderRow}>
                <Text style={styles.orderRank}>
                  {i === 0 ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                </Text>
                <Text style={styles.orderName}>{p.name}</Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.btn} onPress={handlePlayAgain}>
          <Text style={styles.btnText}>Back to Lobby</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#0d1117' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },

  emoji: { fontSize: 80 },
  title: { fontSize: 46, fontWeight: 'bold', color: '#c0392b', marginTop: 6, letterSpacing: 3 },

  loserBox: {
    marginTop: 24, alignItems: 'center',
    backgroundColor: 'rgba(192,57,43,0.12)',
    borderRadius: 18, paddingVertical: 18, paddingHorizontal: 36,
    borderWidth: 1, borderColor: 'rgba(192,57,43,0.35)',
  },
  loserLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  loserName:  { fontSize: 40, color: '#f4c430', fontWeight: 'bold', marginTop: 6 },

  orderBox: {
    marginTop: 28, width: '100%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18, padding: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  orderTitle: {
    color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '700',
    letterSpacing: 2, textAlign: 'center', marginBottom: 14,
  },
  orderRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  orderRank: { fontSize: 22, width: 38, textAlign: 'center' },
  orderName: { color: '#fff', fontSize: 18, fontWeight: '600', marginLeft: 8 },

  btn: {
    marginTop: 36, backgroundColor: '#1a5e33',
    paddingVertical: 16, paddingHorizontal: 48, borderRadius: 32,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
