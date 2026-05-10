import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView, Modal, Animated,
} from 'react-native';
import { useGameStore } from '../store/gameStore';
import { socket } from '../socket';
import Card from '../components/Card';
import { canPlay, canPlayAny } from '../game/gameLogic';
import { SPECIAL } from '../game/constants';

// The main gameplay screen.
// Each player sees this on their own phone:
//   • Top: other players' public table cards
//   • Middle: the pile + status badges
//   • Bottom: MY hand (private) — only interactive when it's my turn
export default function GameScreen() {
  const {
    myHand, myFaceUp, myFaceDown,
    players, pile, deckCount,
    currentPlayerId, myId,
    direction, forceLower,
    message, jokerPending,
  } = useGameStore(s => s);

  const [selected,   setSelected]   = useState([]);
  const [showRules,  setShowRules]  = useState(false);
  const [revealCard, setRevealCard] = useState(null);
  const [handWidth,  setHandWidth]  = useState(320);

  const isMyTurn = currentPlayerId === myId;

  // ── Animation values ───────────────────────────────────────────────────────
  const burnFlash  = useRef(new Animated.Value(0)).current;
  const turnBounce = useRef(new Animated.Value(1)).current;
  const playFly    = useRef(new Animated.Value(1)).current;

  const prevPileLen = useRef(0);
  const prevMyTurn  = useRef(false);

  // Flash orange when the pile burns (empties)
  useEffect(() => {
    if (prevPileLen.current > 0 && pile.length === 0) {
      burnFlash.setValue(1);
      Animated.timing(burnFlash, { toValue: 0, duration: 650, useNativeDriver: false }).start();
    }
    prevPileLen.current = pile.length;
  }, [pile.length]);

  // Pop the YOUR TURN badge when the turn arrives
  useEffect(() => {
    if (isMyTurn && !prevMyTurn.current) {
      turnBounce.setValue(0.6);
      Animated.sequence([
        Animated.timing(turnBounce, { toValue: 1.2,  duration: 120, useNativeDriver: false }),
        Animated.spring(turnBounce,  { toValue: 1.0, friction: 3, tension: 180, useNativeDriver: false }),
      ]).start();
    }
    prevMyTurn.current = isMyTurn;
  }, [isMyTurn]);

  // Interpolate fly-up for played cards
  const playTranslateY = playFly.interpolate({ inputRange: [0, 1], outputRange: [-90, 0] });

  // Which pile of MY cards am I playing from right now?
  let source, activeCards;
  if (myHand.length > 0)        { source = 'hand';     activeCards = myHand; }
  else if (myFaceUp.length > 0) { source = 'faceUp';   activeCards = myFaceUp; }
  else                          { source = 'faceDown';  activeCards = myFaceDown; }

  const canIPlayAny = canPlayAny(activeCards, pile, forceLower);

  // ── Speed interrupt detection ─────────────────────────────────────────────
  // 1. Can I slap a 4 on an empty pile?
  const interruptFour = source !== 'faceDown' && pile.length === 0
    ? activeCards.find(c => c.value === SPECIAL.OUT_OF_TURN) ?? null
    : null;

  // 2. Can I complete four-of-a-kind right now?
  let burnCardIds = null;
  if (!jokerPending && source !== 'faceDown' && pile.length > 0) {
    const topVal = pile[pile.length - 1].value;
    let topCount = 0;
    for (let i = pile.length - 1; i >= 0; i--) {
      if (pile[i].value === topVal) topCount++;
      else break;
    }
    const needed = 4 - topCount;
    if (needed > 0 && needed <= 3) {
      const matching = activeCards.filter(c => c.value === topVal);
      if (matching.length >= needed)
        burnCardIds = matching.slice(0, needed).map(c => c.id);
    }
  }

  // Sort cards low → high for display
  const sortedActive = [...activeCards].sort((a, b) => a.value - b.value);

  // Fan layout: compute how much of each card is visible given container width
  const CARD_W = 74; // card width (68) + margins (6)
  const n = sortedActive.length;
  const step = n <= 1 ? CARD_W : Math.max(32, Math.floor((handWidth - CARD_W) / (n - 1)));
  const fanMargin = step - CARD_W; // negative when cards overlap

  const toggleSelect = (card) => {
    if (!isMyTurn) return;
    if (!canPlay(card, pile, forceLower) && !selected.includes(card.id)) return;
    setSelected(prev =>
      prev.includes(card.id) ? prev.filter(id => id !== card.id) : [...prev, card.id]
    );
  };

  // Tap a face-down card: reveal it for 1.5 s then play it
  const handleFaceDownTap = (card) => {
    if (!isMyTurn || revealCard) return;
    setRevealCard(card);
    setTimeout(() => {
      socket.emit('play_cards', { cardIds: [card.id] });
      setRevealCard(null);
    }, 1500);
  };

  const handlePlay = () => {
    if (selected.length === 0 || !isMyTurn) return;
    const toPlay = [...selected];
    playFly.setValue(1);
    Animated.timing(playFly, { toValue: 0, duration: 260, useNativeDriver: false }).start(() => {
      socket.emit('play_cards', { cardIds: toPlay });
      setSelected([]);
      playFly.setValue(1);
    });
  };

  const handlePickUp = () => {
    if (!isMyTurn) return;
    socket.emit('pick_up_pile');
    setSelected([]);
  };

  const handleInterrupt = (cardIds) => {
    socket.emit('interrupt_play', { cardIds });
  };

  const handleResolveJoker = (targetId) => {
    socket.emit('resolve_joker', { targetId });
  };

  const handleLeave = () => {
    socket.disconnect();
    socket.connect();
    useGameStore.getState().reset();
  };

  const currentPlayerName = players.find(p => p.id === currentPlayerId)?.name ?? '';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.deckBadge}>
            <Text style={styles.deckCount}>🂠 {deckCount}</Text>
          </View>
          <View style={styles.messageArea}>
            <Text style={styles.message} numberOfLines={2}>{message}</Text>
            {!isMyTurn && (
              <Text style={styles.waitingLabel}>Waiting for {currentPlayerName}...</Text>
            )}
          </View>
          <TouchableOpacity onPress={() => setShowRules(true)} style={styles.rulesBtn}>
            <Text style={styles.rulesText}>?</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLeave} style={styles.leaveBtn}>
            <Text style={styles.leaveText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* ── Other players' table cards ───────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.othersScroll}
          contentContainerStyle={styles.othersContent}
        >
          {players.map(p => {
            if (p.id === myId || p.finished) return null;
            const isActive = p.id === currentPlayerId;
            return (
              <View key={p.id} style={[styles.otherPlayer, isActive && styles.otherPlayerActive]}>
                {isActive && <View style={styles.activeDot} />}
                <Text style={[styles.otherName, isActive && styles.otherNameActive]}>{p.name}</Text>
                <Text style={styles.otherHandCount}>✋ {p.handCount}</Text>
                <View style={styles.cardRow}>
                  {p.faceUp.map(c => <Card key={c.id} card={c} small />)}
                  {Array.from({ length: p.faceDownCount }).map((_, i) => (
                    <Card key={i} faceDown small />
                  ))}
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* ── Pile ─────────────────────────────────────────────────────────── */}
        <View style={styles.pileArea}>
          <View style={styles.pileSlot}>
            {pile.length === 0 ? (
              <Text style={styles.emptyPile}>Empty</Text>
            ) : (
              <View style={styles.pileStack}>
                {pile.slice(-3).map((c, i) => (
                  <View key={c.id} style={[styles.pileCard, { top: i * -5, left: i * 2 }]}>
                    <Card card={c} />
                  </View>
                ))}
              </View>
            )}
            {/* Burn flash — orange overlay that fades out when pile empties */}
            <Animated.View
              pointerEvents="none"
              style={[StyleSheet.absoluteFillObject, styles.burnOverlay, { opacity: burnFlash }]}
            />
          </View>

          {/* Status badges */}
          <View style={styles.badges}>
            {forceLower  && <View style={styles.badge}><Text style={styles.badgeText}>⬇ Play ≤ 7</Text></View>}
            {direction === -1 && <View style={[styles.badge, styles.badgeBlue]}><Text style={styles.badgeText}>↺ Reversed</Text></View>}
            {pile.length > 0 && <View style={styles.badgeMuted}><Text style={styles.badgeTextMuted}>{pile.length} cards</Text></View>}
          </View>
        </View>

        {/* ── My hand area ──────────────────────────────────────────────────── */}
        <View style={[styles.handArea, isMyTurn && styles.handAreaActive]}>

          {/* Label + turn indicator */}
          <View style={styles.handHeader}>
            <View>
              <Text style={styles.handName}>You</Text>
              <Text style={styles.handSource}>
                {source === 'faceDown' ? '⚠ Blind play — tap to flip'
                  : source === 'faceUp'  ? 'Playing face-up cards'
                  : 'Hand'}
              </Text>
            </View>
            {isMyTurn ? (
              <Animated.View style={[styles.yourTurnBadge, { transform: [{ scale: turnBounce }] }]}>
                <Text style={styles.yourTurnText}>YOUR TURN</Text>
              </Animated.View>
            ) : (
              <View style={styles.notYourTurnBadge}>
                <Text style={styles.notYourTurnText}>WAIT</Text>
              </View>
            )}
          </View>

          {/* My table cards shown as reference while playing from hand */}
          {source === 'hand' && (myFaceUp.length > 0 || myFaceDown.length > 0) && (
            <View style={styles.myTableRow}>
              <Text style={styles.myTableLabel}>Table:</Text>
              {myFaceUp.map(c => <Card key={c.id} card={c} small />)}
              {myFaceDown.map((_, i) => <Card key={i} faceDown small />)}
            </View>
          )}

          {/* My playable cards — fan layout, low→high left→right */}
          <View
            style={styles.handFan}
            onLayout={e => setHandWidth(e.nativeEvent.layout.width)}
          >
            {source === 'faceDown'
              ? sortedActive.map((c, i) => (
                  <View key={i} style={{ marginLeft: i === 0 ? 0 : fanMargin }}>
                    <Card faceDown onPress={isMyTurn ? () => handleFaceDownTap(c) : undefined} />
                  </View>
                ))
              : sortedActive.map((c, i) => {
                  const isSel = selected.includes(c.id);
                  return (
                    <Animated.View
                      key={c.id}
                      style={[
                        { marginLeft: i === 0 ? 0 : fanMargin, zIndex: isSel ? 50 : i },
                        isSel && { transform: [{ translateY: playTranslateY }], opacity: playFly },
                      ]}
                    >
                      <Card
                        card={c}
                        selected={isSel}
                        onPress={() => toggleSelect(c)}
                      />
                    </Animated.View>
                  );
                })
            }
          </View>

          {/* Face-down reveal overlay */}
          {revealCard && (
            <View style={styles.revealOverlay}>
              <Text style={styles.revealLabel}>You flipped...</Text>
              <Card card={revealCard} />
            </View>
          )}

          {/* ── Speed interrupt buttons (any player, any time) ── */}
          {interruptFour && !isMyTurn && (
            <TouchableOpacity
              style={styles.interruptBtn}
              onPress={() => handleInterrupt([interruptFour.id])}
            >
              <Text style={styles.interruptText}>⚡ Slap a 4! (steal turn)</Text>
            </TouchableOpacity>
          )}
          {burnCardIds && !isMyTurn && (
            <TouchableOpacity
              style={[styles.interruptBtn, styles.burnBtn]}
              onPress={() => handleInterrupt(burnCardIds)}
            >
              <Text style={styles.interruptText}>🔥 Complete 4-of-a-kind!</Text>
            </TouchableOpacity>
          )}

          {/* Action buttons — only active on your turn */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.playBtn, (!isMyTurn || selected.length === 0) && styles.btnDisabled]}
              onPress={handlePlay}
              disabled={!isMyTurn || selected.length === 0}
            >
              <Text style={styles.playBtnText}>
                {selected.length > 0 ? `Play (${selected.length})` : 'Select cards'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pickUpBtn, (!isMyTurn || pile.length === 0 || canIPlayAny) && styles.btnDisabled]}
              onPress={handlePickUp}
              disabled={!isMyTurn || pile.length === 0 || canIPlayAny}
            >
              <Text style={styles.pickUpBtnText}>Pick Up</Text>
            </TouchableOpacity>
          </View>

        </View>

        {/* ── Joker target modal ────────────────────────────────────────────── */}
        <Modal visible={jokerPending && isMyTurn} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>🃏 Joker!</Text>
              <Text style={styles.modalSubtitle}>
                Choose who receives the pile ({pile.length} card{pile.length !== 1 ? 's' : ''})
              </Text>
              {players.map(p => {
                if (p.id === myId || p.finished) return null;
                const total = p.handCount + p.faceUp.length + p.faceDownCount;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.targetBtn}
                    onPress={() => handleResolveJoker(p.id)}
                  >
                    <Text style={styles.targetName}>{p.name}</Text>
                    <Text style={styles.targetCount}>{total} cards</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Modal>

        {/* Joker waiting — shown to non-joker players */}
        {jokerPending && !isMyTurn && (
          <View style={styles.jokerWaiting}>
            <Text style={styles.jokerWaitingText}>
              🃏 {currentPlayerName} is choosing who gets the pile...
            </Text>
          </View>
        )}

        {/* ── Rules modal ───────────────────────────────────────────────────── */}
        <Modal visible={showRules} transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalBox, styles.rulesBox]}>
              <Text style={styles.modalTitle}>📖 Rules</Text>
              <ScrollView style={styles.rulesScroll} showsVerticalScrollIndicator={false}>
                {[
                  ['2', 'Reset — play on anything, resets pile'],
                  ['3', 'Transparent — pile "looks through" it (7 effect persists)'],
                  ['4', 'Steal turn — play on empty pile any time'],
                  ['5', 'Reverse direction'],
                  ['7', 'Next player must play ≤ 7'],
                  ['8', 'Skip next player'],
                  ['10', 'Burn — clear pile, play again'],
                  ['🃏', 'Joker — send pile to any player (Joker is burned)'],
                  ['4 of a kind', 'Any player can jump in to complete it — pile burns, they play again'],
                ].map(([card, rule]) => (
                  <View key={card} style={styles.ruleRow}>
                    <Text style={styles.ruleCard}>{card}</Text>
                    <Text style={styles.ruleText}>{rule}</Text>
                  </View>
                ))}
                <Text style={styles.ruleNote}>
                  Goal: empty your hand, face-up, then face-down cards.{'\n'}
                  Last player with cards is the Shithead 💩
                </Text>
              </ScrollView>
              <TouchableOpacity style={styles.targetBtn} onPress={() => setShowRules(false)}>
                <Text style={[styles.targetName, { textAlign: 'center' }]}>Got it!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#1a5e33' },
  container: { flex: 1 },

  // ── Header ───────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  deckBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
  },
  deckCount:    { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  messageArea:  { flex: 1, paddingHorizontal: 10 },
  message:      { color: '#e8f5e9', fontSize: 12, textAlign: 'center', lineHeight: 17 },
  waitingLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 10, textAlign: 'center', marginTop: 2 },
  rulesBtn:  { padding: 6, marginRight: 2 },
  rulesText: { color: 'rgba(255,255,255,0.5)', fontSize: 18, fontWeight: 'bold' },
  leaveBtn:  { padding: 6 },
  leaveText: { color: 'rgba(255,255,255,0.4)', fontSize: 20 },

  // ── Other players ─────────────────────────────────────────────────────────
  othersScroll:  { maxHeight: 150, backgroundColor: 'rgba(0,0,0,0.2)' },
  othersContent: { paddingHorizontal: 10, paddingVertical: 8, gap: 8 },
  otherPlayer: {
    alignItems: 'center', minWidth: 85,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14, padding: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    position: 'relative',
  },
  otherPlayerActive: {
    borderColor: '#f4c430',
    backgroundColor: 'rgba(244,196,48,0.08)',
  },
  activeDot: {
    position: 'absolute', top: 6, right: 6,
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: '#f4c430',
  },
  otherName:       { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: 'bold' },
  otherNameActive: { color: '#f4c430' },
  otherHandCount:  { color: 'rgba(255,255,255,0.4)', fontSize: 10, marginBottom: 5 },
  cardRow:         { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  fourBtn: {
    marginTop: 4, backgroundColor: '#f4c430',
    paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8,
  },
  fourBtnText: { fontSize: 10, fontWeight: 'bold', color: '#111' },

  // ── Pile ──────────────────────────────────────────────────────────────────
  pileArea: { alignItems: 'center', paddingVertical: 10 },
  pileSlot: {
    width: 90, height: 120,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    borderStyle: 'dashed',
  },
  pileStack: { width: 90, height: 120, position: 'relative' },
  pileCard:  { position: 'absolute' },
  emptyPile: { color: 'rgba(255,255,255,0.25)', fontSize: 13 },
  burnOverlay: { backgroundColor: '#ff6a00', borderRadius: 10 },

  badges: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' },
  badge: {
    backgroundColor: '#e67e22',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  badgeBlue: { backgroundColor: '#2980b9' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  badgeMuted: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  badgeTextMuted: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },

  // ── Hand area ─────────────────────────────────────────────────────────────
  handArea: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.35)',
    borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 14,
    borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  handAreaActive: {
    borderTopColor: '#f4c430',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },

  handHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 10,
  },
  handName:   { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  handSource: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 },

  yourTurnBadge: {
    backgroundColor: '#f4c430', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  yourTurnText: { color: '#1a1a1a', fontSize: 11, fontWeight: 'bold', letterSpacing: 0.5 },
  notYourTurnBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  notYourTurnText: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 'bold' },

  myTableRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  myTableLabel:{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginRight: 6 },

  // Fan card layout — no scroll, cards overlap each other
  handFan: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    minHeight: 116,
    marginBottom: 10,
    position: 'relative',
  },

  // Face-down reveal overlay
  revealOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.82)',
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 200,
  },
  revealLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 15, marginBottom: 14,
  },

  // ── Buttons ───────────────────────────────────────────────────────────────
  actions:  { flexDirection: 'row', gap: 10 },
  playBtn: {
    flex: 2, backgroundColor: '#f4c430',
    paddingVertical: 14, borderRadius: 18, alignItems: 'center',
    shadowColor: '#f4c430', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  playBtnText:  { fontSize: 15, fontWeight: 'bold', color: '#1a1a1a' },
  pickUpBtn: {
    flex: 1, backgroundColor: '#c0392b',
    paddingVertical: 14, borderRadius: 18, alignItems: 'center',
  },
  pickUpBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  btnDisabled:   { opacity: 0.3 },

  // ── Joker modal ───────────────────────────────────────────────────────────
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  modalBox: {
    backgroundColor: '#1a1030', borderRadius: 22,
    padding: 24, width: '100%',
    borderWidth: 2, borderColor: '#9b59b6',
  },
  modalTitle:    { fontSize: 30, color: '#f4c430', fontWeight: 'bold', textAlign: 'center' },
  modalSubtitle: {
    fontSize: 14, color: 'rgba(255,255,255,0.55)',
    textAlign: 'center', marginTop: 6, marginBottom: 22,
  },
  targetBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14, padding: 16, marginBottom: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(155,89,182,0.4)',
  },
  targetName:  { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  targetCount: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },

  // Joker waiting banner (for other players)
  jokerWaiting: {
    position: 'absolute', bottom: 120, left: 16, right: 16,
    backgroundColor: 'rgba(155,89,182,0.85)',
    borderRadius: 14, padding: 14, alignItems: 'center',
  },
  jokerWaitingText: { color: '#fff', fontSize: 14, fontWeight: '600', textAlign: 'center' },

  // ── Speed interrupt buttons ───────────────────────────────────────────────
  interruptBtn: {
    backgroundColor: '#e74c3c', borderRadius: 14,
    paddingVertical: 10, alignItems: 'center', marginBottom: 6,
  },
  burnBtn:       { backgroundColor: '#e67e22' },
  interruptText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  // ── Rules modal ───────────────────────────────────────────────────────────
  rulesBox:    { backgroundColor: '#0d1f12', borderColor: '#2ecc71', maxHeight: '85%' },
  rulesScroll: { marginVertical: 16 },
  ruleRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginBottom: 12, gap: 10,
  },
  ruleCard: {
    color: '#f4c430', fontWeight: 'bold', fontSize: 13,
    minWidth: 72, textAlign: 'right',
  },
  ruleText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, flex: 1, lineHeight: 18 },
  ruleNote: {
    color: 'rgba(255,255,255,0.4)', fontSize: 12,
    textAlign: 'center', marginTop: 8, lineHeight: 18,
  },
});
