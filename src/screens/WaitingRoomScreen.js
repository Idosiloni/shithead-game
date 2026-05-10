import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView,
} from 'react-native';
import { useGameStore } from '../store/gameStore';
import { socket } from '../socket';

// Shown after creating or joining a room, while waiting for everyone to join.
// The host sees a "Start Game" button; others see a waiting message.
// The big room code is displayed so it's easy to share with family.
export default function WaitingRoomScreen() {
  const { roomCode, players, hostId, myId } = useGameStore(s => s);
  const isHost = myId === hostId;

  const handleStart = () => {
    socket.emit('start_game');
  };

  const handleLeave = () => {
    // Disconnect and reset — the server will clean up
    socket.disconnect();
    socket.connect(); // reconnect for a fresh session
    useGameStore.getState().reset();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Room code — the big number everyone needs to type */}
        <Text style={styles.codeLabel}>ROOM CODE</Text>
        <Text style={styles.code}>{roomCode}</Text>
        <Text style={styles.codeHint}>Other players open the app and enter this code</Text>

        <View style={styles.divider} />

        {/* Player list */}
        <Text style={styles.playersLabel}>
          PLAYERS ({players.length}/6)
        </Text>
        <ScrollView style={styles.playerList} contentContainerStyle={styles.playerListContent}>
          {players.map((p, i) => (
            <View key={p.id} style={styles.playerRow}>
              <View style={styles.playerAvatar}>
                <Text style={styles.playerAvatarText}>{p.name.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.playerName}>{p.name}</Text>
              {p.id === hostId && (
                <View style={styles.hostBadge}>
                  <Text style={styles.hostBadgeText}>HOST</Text>
                </View>
              )}
              {p.id === myId && (
                <Text style={styles.youLabel}>(you)</Text>
              )}
              {isHost && p.id !== myId && p.id !== hostId && (
                <TouchableOpacity
                  style={styles.kickBtn}
                  onPress={() => socket.emit('kick_player', { targetId: p.id })}
                >
                  <Text style={styles.kickBtnText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>

        {/* Action area */}
        {isHost ? (
          <View style={styles.hostActions}>
            <Text style={styles.minPlayers}>Minimum 2 players to start</Text>
            <TouchableOpacity
              style={[styles.startBtn, players.length < 2 && styles.startBtnDisabled]}
              onPress={handleStart}
              disabled={players.length < 2}
            >
              <Text style={styles.startBtnText}>
                {players.length < 2 ? 'Waiting for players...' : `Start Game (${players.length} players)`}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.waitingArea}>
            <Text style={styles.waitingDots}>· · ·</Text>
            <Text style={styles.waitingText}>Waiting for the host to start</Text>
          </View>
        )}

        {/* Leave room */}
        <TouchableOpacity onPress={handleLeave} style={styles.leaveBtn}>
          <Text style={styles.leaveBtnText}>Leave Room</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#0f3d20' },
  container: { flex: 1, padding: 24, alignItems: 'center' },

  // Room code display
  codeLabel: {
    color: 'rgba(255,255,255,0.45)', fontSize: 12,
    fontWeight: '700', letterSpacing: 2, marginTop: 24,
  },
  code: {
    fontSize: 64, fontWeight: 'bold', color: '#f4c430',
    letterSpacing: 12, marginTop: 4,
  },
  codeHint: {
    color: 'rgba(255,255,255,0.4)', fontSize: 13,
    textAlign: 'center', marginTop: 6,
  },

  divider: {
    width: '100%', height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 24,
  },

  // Player list
  playersLabel: {
    color: '#f4c430', fontSize: 11, fontWeight: '700',
    letterSpacing: 1.5, alignSelf: 'flex-start', marginBottom: 12,
  },
  playerList:        { width: '100%', maxHeight: 240 },
  playerListContent: { gap: 8 },
  playerRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  playerAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#1a7a3f',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  playerAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  playerName:  { color: '#fff', fontSize: 16, fontWeight: '600', flex: 1 },
  hostBadge: {
    backgroundColor: '#f4c430', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  hostBadgeText: { color: '#1a1a1a', fontSize: 11, fontWeight: 'bold' },
  youLabel:  { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginLeft: 8 },

  // Host start button
  hostActions:  { width: '100%', marginTop: 24, alignItems: 'center' },
  minPlayers:   { color: 'rgba(255,255,255,0.35)', fontSize: 12, marginBottom: 12 },
  startBtn: {
    width: '100%', backgroundColor: '#f4c430',
    borderRadius: 16, paddingVertical: 18, alignItems: 'center',
    shadowColor: '#f4c430', shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  startBtnDisabled: { opacity: 0.35 },
  startBtnText: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },

  // Non-host waiting state
  waitingArea: { marginTop: 32, alignItems: 'center' },
  waitingDots: { fontSize: 32, color: '#f4c430', letterSpacing: 4 },
  waitingText: { color: 'rgba(255,255,255,0.5)', fontSize: 15, marginTop: 8 },

  // Kick button (host only)
  kickBtn: {
    marginLeft: 8, width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(220,50,50,0.25)',
    borderWidth: 1, borderColor: 'rgba(220,50,50,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  kickBtnText: { color: '#ff6b6b', fontSize: 13, fontWeight: 'bold' },

  // Leave
  leaveBtn: { marginTop: 'auto', paddingVertical: 12 },
  leaveBtnText: { color: 'rgba(255,255,255,0.3)', fontSize: 14 },
});
