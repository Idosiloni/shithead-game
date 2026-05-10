import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useGameStore } from '../store/gameStore';
import { socket, setupSocket } from '../socket';

const VERSION = 'v1.4';

// The entry screen. Players enter their name and either create a new room
// or join an existing one by typing a 4-character room code.
export default function LobbyScreen() {
  const { error, connecting, clearError, setConnecting } = useGameStore(s => s);

  const [name,    setName]    = useState('');
  const [code,    setCode]    = useState('');
  // mode controls which sub-view is shown: null | 'create' | 'join'
  const [mode,    setMode]    = useState(null);

  // Set up the socket connection once when this screen first mounts
  useEffect(() => { setupSocket(); }, []);

  // If the server responds with an error, stop the loading spinner
  useEffect(() => { if (error) setConnecting(false); }, [error]);

  const handleCreate = () => {
    if (!name.trim()) return;
    setConnecting(true);
    socket.emit('create_room', { name: name.trim() });
  };

  const handleJoin = () => {
    if (!name.trim() || code.trim().length !== 4) return;
    setConnecting(true);
    socket.emit('join_room', { name: name.trim(), code: code.trim() });
  };

  const goBack = () => { setMode(null); setCode(''); clearError(); };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

          {/* Logo area */}
          <Text style={styles.logo}>💩</Text>
          <Text style={styles.title}>SHITHEAD</Text>
          <Text style={styles.subtitle}>CARD GAME</Text>
          <View style={styles.divider} />

          {/* Error banner */}
          {error ? (
            <TouchableOpacity style={styles.errorBox} onPress={clearError}>
              <Text style={styles.errorText}>⚠ {error}</Text>
              <Text style={styles.errorDismiss}>tap to dismiss</Text>
            </TouchableOpacity>
          ) : null}

          {/* Name input — always visible */}
          <View style={styles.field}>
            <Text style={styles.label}>YOUR NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              placeholderTextColor="rgba(255,255,255,0.25)"
              value={name}
              onChangeText={setName}
              maxLength={12}
              returnKeyType="done"
            />
          </View>

          {/* Room code input — only shown in join mode */}
          {mode === 'join' && (
            <View style={styles.field}>
              <Text style={styles.label}>ROOM CODE</Text>
              <TextInput
                style={[styles.input, styles.codeInput]}
                placeholder="e.g. AB3X"
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={code}
                onChangeText={t => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                maxLength={4}
                autoCapitalize="characters"
                returnKeyType="go"
                onSubmitEditing={handleJoin}
              />
            </View>
          )}

          {/* Buttons */}
          {connecting ? (
            <ActivityIndicator color="#f4c430" size="large" style={styles.spinner} />
          ) : (
            <View style={styles.btnGroup}>
              {/* Create Game button */}
              {mode !== 'join' && (
                <TouchableOpacity
                  style={[styles.primaryBtn, !name.trim() && styles.btnDisabled]}
                  onPress={mode === 'create' ? handleCreate : () => setMode('create')}
                  disabled={mode === 'create' && !name.trim()}
                >
                  <Text style={styles.primaryBtnText}>
                    {mode === 'create' ? 'Create Room' : 'Create Game'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Join Game button */}
              {mode !== 'create' && (
                <TouchableOpacity
                  style={[
                    mode === 'join' ? styles.primaryBtn : styles.secondaryBtn,
                    mode === 'join' && (!name.trim() || code.length !== 4) && styles.btnDisabled,
                  ]}
                  onPress={mode === 'join' ? handleJoin : () => setMode('join')}
                  disabled={mode === 'join' && (!name.trim() || code.length !== 4)}
                >
                  <Text style={mode === 'join' ? styles.primaryBtnText : styles.secondaryBtnText}>
                    {mode === 'join' ? 'Join Room' : 'Join Game'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Back link */}
              {mode !== null && (
                <TouchableOpacity onPress={goBack} style={styles.backBtn}>
                  <Text style={styles.backBtnText}>← Back</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Rules reference */}
          <View style={styles.rulesBox}>
            <Text style={styles.rulesTitle}>Special Cards</Text>
            {[
              ['2',          'Reset — play on anything, resets pile'],
              ['3',          'Transparent — pile "looks through" it'],
              ['4',          'Steal turn — slap on empty pile any time'],
              ['5',          'Reverse direction'],
              ['7',          'Next player must play ≤ 7'],
              ['8',          'Skip next player'],
              ['10',         'Burn pile, play again'],
              ['🃏',         'Joker — send pile to any player'],
              ['4 of a kind','Any player can jump in to burn it'],
            ].map(([card, rule]) => (
              <View key={card} style={styles.ruleRow}>
                <Text style={styles.ruleCard}>{card}</Text>
                <Text style={styles.ruleText}>{rule}</Text>
              </View>
            ))}
            <Text style={styles.ruleNote}>
              Goal: empty your hand → face-up cards → face-down cards.{'\n'}
              Last player with cards is the Shithead 💩
            </Text>
          </View>

          <Text style={styles.version}>{VERSION}</Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: '#0f3d20' },
  flex:  { flex: 1 },
  container: {
    alignItems: 'center', justifyContent: 'center',
    padding: 28, paddingBottom: 48, minHeight: '100%',
  },

  logo:     { fontSize: 72 },
  title:    { fontSize: 40, fontWeight: 'bold', color: '#fff', letterSpacing: 5, marginTop: 8 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.4)', letterSpacing: 4, marginTop: 2 },
  divider:  { width: 48, height: 2, backgroundColor: '#f4c430', borderRadius: 2, marginVertical: 28 },

  // Error banner
  errorBox: {
    backgroundColor: 'rgba(192,57,43,0.25)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(192,57,43,0.5)',
    padding: 14, marginBottom: 20, width: '100%', alignItems: 'center',
  },
  errorText:    { color: '#e74c3c', fontWeight: 'bold', fontSize: 14 },
  errorDismiss: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 4 },

  // Input fields
  field: { width: '100%', marginBottom: 16 },
  label: {
    color: '#f4c430', fontSize: 11, fontWeight: '700',
    letterSpacing: 1.5, marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14,
    color: '#fff', fontSize: 17,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  codeInput: {
    fontSize: 28, fontWeight: 'bold', textAlign: 'center',
    letterSpacing: 8,
  },

  // Buttons
  btnGroup:  { width: '100%', gap: 12, marginTop: 8 },
  spinner:   { marginTop: 32 },
  primaryBtn: {
    backgroundColor: '#f4c430', borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: '#f4c430', shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  primaryBtnText: { fontSize: 17, fontWeight: 'bold', color: '#1a1a1a' },
  secondaryBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  secondaryBtnText: { fontSize: 17, fontWeight: '600', color: '#fff' },
  btnDisabled: { opacity: 0.35 },
  backBtn:     { alignItems: 'center', paddingVertical: 8 },
  backBtnText: { color: 'rgba(255,255,255,0.45)', fontSize: 15 },

  // Rules reference
  rulesBox: {
    marginTop: 32, width: '100%',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  rulesTitle: {
    color: '#f4c430', fontWeight: 'bold', fontSize: 12,
    letterSpacing: 1.5, textAlign: 'center', marginBottom: 14,
  },
  ruleRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginBottom: 10, gap: 10,
  },
  ruleCard: {
    color: '#f4c430', fontWeight: 'bold', fontSize: 12,
    minWidth: 72, textAlign: 'right',
  },
  ruleText: {
    color: 'rgba(255,255,255,0.65)', fontSize: 12, flex: 1, lineHeight: 17,
  },
  ruleNote: {
    color: 'rgba(255,255,255,0.35)', fontSize: 11,
    textAlign: 'center', marginTop: 10, lineHeight: 17,
  },
  version: {
    color: 'rgba(255,255,255,0.2)', fontSize: 11,
    marginTop: 20, textAlign: 'center', letterSpacing: 1,
  },
});
