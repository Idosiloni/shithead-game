import { StatusBar } from 'expo-status-bar';
import { useGameStore } from './src/store/gameStore';

import LobbyScreen       from './src/screens/LobbyScreen';
import WaitingRoomScreen from './src/screens/WaitingRoomScreen';
import SelectionScreen   from './src/screens/SelectionScreen';
import GameScreen        from './src/screens/GameScreen';
import GameOverScreen    from './src/screens/GameOverScreen';

// App renders the correct screen based on the current phase in the store.
// Phase is updated by the server — no local navigation logic needed.
//
// Phase flow:
//   lobby → waiting_room → selecting → playing → game_over → lobby
export default function App() {
  const phase = useGameStore(s => s.phase);

  return (
    <>
      <StatusBar style="light" />
      {phase === 'lobby'        && <LobbyScreen />}
      {phase === 'waiting_room' && <WaitingRoomScreen />}
      {phase === 'selecting'    && <SelectionScreen />}
      {phase === 'playing'      && <GameScreen />}
      {phase === 'game_over'    && <GameOverScreen />}
    </>
  );
}
