# 📋 TODO pour 100% Opérationnel

## État actuel: 85%
## Objectif: 100%

---

## 🔴 CRITIQUE - Backend Handlers (15%)

### 1. RolandGamosHandler.js
**Temps:** 2-3h

**À implémenter:**
```javascript
async generateQuestion() {
  // 1. Sélectionner un artiste de départ (populaire)
  const startArtist = await selectRandomArtistWeighted();

  // 2. Récupérer ses collaborations
  const collabs = await db.collection('collaborations')
    .find({ artistAId: startArtist.spotifyId })
    .toArray();

  return {
    currentArtist: startArtist,
    validAnswers: collabs.map(c => c.artistBId),
  };
}

handleAnswer(socket, player, data) {
  // Vérifier si l'artiste a un featuring avec currentArtist
  // Si oui: changer currentArtist et continuer
  // Si non: tour suivant
}

calculateResults() {
  // Compter le nombre de chaînes par team
  // La plus longue chaîne gagne
}
```

**Difficulté:** 🟢 Facile

---

### 2. EncheresHandler.js
**Temps:** 3-4h

**À implémenter:**
```javascript
// Phase 1: Révéler le thème
async generateQuestion() {
  const theme = selectRandomTheme('medium');
  const validArtists = await getArtistsForTheme(theme);

  return {
    themeId: theme.id,
    themeTitle: theme.title,
    totalPossible: validArtists.length,
  };
}

// Phase 2: Mise secrète (10s)
handleBet(socket, player, data) {
  this.bets[player.team] = data.bet; // Nombre d'artistes
}

// Phase 3: Le plus offrant doit prouver (45s)
handleProof(socket, player, data) {
  // Valider les réponses comme Le Thème
  // Compter si atteint la mise
}

calculateResults() {
  // Si preuve réussie: winner = team qui a misé
  // Si échoué: winner = team adverse
}
```

**Difficulté:** 🟡 Moyen

---

### 3. PixelCoverHandler.js
**Temps:** 2h

**À implémenter:**
```javascript
async generateQuestion() {
  // 1. Sélectionner un album populaire
  const album = await db.collection('albums')
    .find({ coverUrl: { $ne: null } })
    .sort({ popularity: -1 })
    .limit(100)
    .toArray();

  const selected = album[Math.floor(Math.random() * album.length)];

  return {
    albumId: selected.spotifyId,
    coverUrl: selected.coverUrl,
    correctTitle: selected.title,
    correctArtist: selected.artistName,
    blurLevel: 100, // Commence très flouté
  };
}

handleAnswer(socket, player, data) {
  // Vérifier si le titre de l'album est correct
  // Fuzzy matching
}

onTimerTick() {
  // Réduire le blur progressivement
  this.currentQuestion.blurLevel -= 5;
  this.room.broadcast('blur_update', { blurLevel });
}
```

**Difficulté:** 🟢 Facile

---

### 4. DevineQuiHandler.js
**Temps:** 4-5h

**À implémenter:**
```javascript
async generateQuestion() {
  // 1. Sélectionner un artiste populaire AVEC localisation
  const artist = await db.collection('artists')
    .findOne({
      isTopArtist: true,
      'location.department': { $exists: true, $ne: null },
    });

  return {
    targetArtist: {
      name: artist.name,
      clues: {
        albums: artist.totalAlbums,
        streams: Math.floor(artist.monthlyListeners / 1000000), // En millions
        letters: artist.name.length,
        yearDebut: artist.firstReleaseYear,
        origin: artist.location.department || artist.location.country,
      }
    },
    maxAttempts: 5,
    attempts: [],
  };
}

handleAnswer(socket, player, data) {
  // 1. Récupérer l'artiste tapé
  const guessedArtist = await findArtistByName(data.answer);

  // 2. Comparer chaque indice
  const cluesStatus = {
    albums: compareValue(guessed.totalAlbums, target.albums),
    streams: compareValue(...),
    letters: compareValue(...),
    yearDebut: compareValue(...),
    origin: guessed.location === target.location ? 'correct' : 'wrong',
  };

  // 3. Ajouter à attempts
  this.attempts.push({ artistName, cluesStatus });

  // 4. Vérifier si correct
  if (guessed.name === target.name) {
    this.foundBy = player.team;
  }
}

compareValue(guess, target) {
  if (guess === target) return 'correct';
  if (Math.abs(guess - target) <= 2) return 'close';
  return 'wrong';
}
```

**Difficulté:** 🟡 Moyen

---

## 🟡 IMPORTANT - Intégration Frontend ↔ Backend (10%)

### 5. Connecter le Lobby
**Temps:** 1h

**Fichier:** `app/lobby/[roomCode]/page.tsx`

```typescript
'use client';

import { useGameSocket } from '../../hooks/useGameSocket';
import { useParams } from 'next/navigation';

export default function LobbyPage() {
  const { roomCode } = useParams();
  const [playerName, setPlayerName] = useState('');

  const {
    connected,
    roomState,
    createRoom,
    joinRoom,
    changeTeam,
    toggleReady,
    updateConfig,
    startGame,
  } = useGameSocket();

  // Rejoindre automatiquement
  useEffect(() => {
    if (connected && playerName) {
      joinRoom(roomCode as string, playerName);
    }
  }, [connected, playerName]);

  // Render avec roomState au lieu de mock data
  return (
    <div>
      {roomState?.players.map(player => (
        <div key={player.id}>
          {player.name} - Team {player.team}
          {player.ready && '✅'}
        </div>
      ))}

      <button onClick={() => changeTeam('A')}>Team A</button>
      <button onClick={() => changeTeam('B')}>Team B</button>
      <button onClick={toggleReady}>Ready</button>

      {roomState?.hostId === socket?.id && (
        <button onClick={startGame}>Démarrer</button>
      )}
    </div>
  );
}
```

---

### 6. Créer page de jeu
**Temps:** 3h

**Fichier:** `app/game/[roomCode]/page.tsx` (NOUVEAU)

```typescript
'use client';

import { useGameSocket } from '../../hooks/useGameSocket';
import { LeThemeMode } from '../modes/LeThemeMode';
import { MythoPasMythoMode } from '../modes/MythoPasMythoMode';
// ... autres modes

export default function GamePage() {
  const { roomState, submitAnswer, buzz, on } = useGameSocket();

  const gameState = roomState?.gameState;

  // Écrans par état
  if (gameState?.state === 'vs_screen') {
    return <VsScreen teamA={...} teamB={...} />;
  }

  if (gameState?.state === 'mode_selection') {
    return <ModeRoulette selectedMode={...} />;
  }

  if (gameState?.state === 'round_active') {
    // Afficher le mode actuel
    const mode = gameState.currentMode;

    if (mode === 'le_theme') {
      return (
        <LeThemeMode
          data={gameState.currentQuestion}
          onSubmit={submitAnswer}
          timeLeft={gameState.timeLeft}
          isMyTurn={...}
        />
      );
    }

    if (mode === 'blind_test') {
      return (
        <BlindTestMode
          data={gameState.currentQuestion}
          onBuzz={buzz}
          onSubmit={submitAnswer}
        />
      );
    }

    // ... autres modes
  }

  if (gameState?.state === 'round_end') {
    return <RoundResult results={...} />;
  }

  if (gameState?.state === 'game_over') {
    return <GameOver winner={...} />;
  }
}
```

---

### 7. Créer écrans de transition
**Temps:** 2h

**Fichiers à créer:**

**`app/game/screens/VsScreen.tsx`**
```typescript
export function VsScreen({ teamA, teamB }) {
  return (
    <motion.div animate={{ scale: [0.8, 1.2, 1] }}>
      <div>Team A vs Team B</div>
      <div>{teamA.map(p => p.name).join(', ')}</div>
      <div>VS</div>
      <div>{teamB.map(p => p.name).join(', ')}</div>
    </motion.div>
  );
}
```

**`app/game/screens/ModeRoulette.tsx`**
```typescript
export function ModeRoulette({ selectedMode, modesQueue }) {
  return (
    <div className="roulette">
      <motion.div animate={{ rotate: 360 * 5 }}>
        {MODE_ICONS[selectedMode]}
      </motion.div>
      <h2>{GAME_MODE_NAMES[selectedMode]}</h2>
    </div>
  );
}
```

**`app/game/screens/RoundResult.tsx`**
```typescript
export function RoundResult({ results, teamHP, combos }) {
  return (
    <div>
      <h2>Round terminé!</h2>
      {results.winner && (
        <div>Team {results.winner} gagne!</div>
      )}
      <div>
        Team A: {teamHP.A} HP {combos.A > 0 && `🔥 x${combos.A}`}
      </div>
      <div>
        Team B: {teamHP.B} HP {combos.B > 0 && `🔥 x${combos.B}`}
      </div>
    </div>
  );
}
```

**`app/game/screens/GameOver.tsx`**
```typescript
export function GameOver({ winner, finalHP, stats }) {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="game-over"
    >
      <h1>🎉 Team {winner} gagne!</h1>
      <div>HP final: A: {finalHP.A} - B: {finalHP.B}</div>
      {/* Stats de la partie */}
    </motion.div>
  );
}
```

---

## 🟢 BONUS - Polish (5%)

### 8. Power-ups effects
**Temps:** 2h

**Fichier:** `app/server/PowerUpManager.js` (NOUVEAU)

```javascript
class PowerUpManager {
  applyEffect(powerUp, gameState) {
    switch (powerUp) {
      case 'time_boost':
        gameState.timeLeft += 5000;
        break;

      case 'hint':
        // Révéler 3 artistes valides
        const hints = await getThemeHints(theme, 3);
        return { hints };

      case 'block':
        // Bloquer l'équipe adverse 1 tour
        gameState.blockedTeam = opponent;
        break;

      case 'double_damage':
        gameState.damageMultiplier = 2;
        break;

      case 'shield':
        gameState.shieldedTeam = team;
        break;

      case 'steal_turn':
        gameState.currentTurn = team;
        break;
    }
  }
}
```

---

### 9. Animations synchronisées
**Temps:** 1h

```typescript
// Dans les composants de mode
useEffect(() => {
  const cleanup = on('answer_correct', ({ team, answer }) => {
    // Animation de succès
    playSound('correct');
    showConfetti();
    addToList(answer);
  });

  return cleanup;
}, [on]);
```

---

### 10. Reconnexion
**Temps:** 1h

```javascript
// Dans GameStateMachine
handleReconnect(socket, playerId) {
  const player = Array.from(this.room.players.values())
    .find(p => p.id === playerId);

  if (player) {
    player.connected = true;

    // Envoyer l'état actuel au joueur
    this.room.emitTo(socket.id, 'game_state', this.getPublicState());

    // Reprendre le jeu si en pause
    if (this.pauseReason === 'Joueur déconnecté') {
      this.resume();
    }
  }
}
```

---

## 📊 Récapitulatif

### Backend (15% manquant)
| Tâche | Temps | Difficulté |
|-------|-------|------------|
| RolandGamosHandler | 2-3h | 🟢 |
| EncheresHandler | 3-4h | 🟡 |
| PixelCoverHandler | 2h | 🟢 |
| DevineQuiHandler | 4-5h | 🟡 |
| **Total** | **11-14h** | |

### Frontend (10% manquant)
| Tâche | Temps | Difficulté |
|-------|-------|------------|
| Connecter Lobby | 1h | 🟢 |
| Page de jeu | 3h | 🟡 |
| Écrans transition | 2h | 🟢 |
| **Total** | **6h** | |

### Polish (5% manquant)
| Tâche | Temps | Difficulté |
|-------|-------|------------|
| Power-ups effects | 2h | 🟢 |
| Animations | 1h | 🟢 |
| Reconnexion | 1h | 🟢 |
| **Total** | **4h** | |

---

## 🎯 Plan d'action

### Option 1: Version minimale (1 jour)
**Pour jouer avec 3 modes immédiatement**

1. Connecter Lobby (1h)
2. Créer page de jeu basique (2h)
3. Connecter 3 modes existants (1h)

**Résultat:** Jeu jouable avec Le Thème, Mytho, Blind Test

---

### Option 2: Version complète (3 jours)
**Pour avoir tous les modes**

**Jour 1:**
- Implémenter 4 handlers (12h)

**Jour 2:**
- Intégration Frontend (6h)
- Écrans de transition (2h)

**Jour 3:**
- Power-ups (2h)
- Tests (2h)
- Polish (2h)

**Résultat:** Jeu 100% fonctionnel avec 7 modes

---

## 🚀 Je te conseille

**Pendant le crawler (10-15h):**
- Faire l'Option 1 (1 jour de dev)
- Tester avec 3 modes

**Après les tests:**
- Faire le reste (2 jours)
- Finaliser à 100%

**Total:** 3 jours de dev pendant/après le crawler = **Jeu complet!** 🎮

---

## 📋 Checklist finale

Avant de dire "100% opérationnel", vérifier:

**Backend:**
- [ ] Les 7 handlers sont implémentés
- [ ] State machine gère tous les états
- [ ] Timers fonctionnent
- [ ] Scoring est correct
- [ ] Power-ups ont des effets

**Frontend:**
- [ ] Lobby connecté au WebSocket
- [ ] Page de jeu affiche le bon mode
- [ ] Écrans VS/Roulette/Results/GameOver existent
- [ ] Animations sont smooth
- [ ] Sons fonctionnent

**Intégration:**
- [ ] Réponses sont validées côté serveur
- [ ] Timers sont synchronisés
- [ ] HP updates en temps réel
- [ ] Reconnexion fonctionne
- [ ] Pas de bugs de déconnexion

**Tests:**
- [ ] Partie complète 2v2 fonctionne
- [ ] Les 7 modes sont jouables
- [ ] Power-ups s'appliquent correctement
- [ ] Game over affiche le bon gagnant

---

## 💡 Mon conseil

**NE PAS essayer de faire 100% avant de lancer le crawler.**

**À LA PLACE:**
1. Lance le crawler dans 4h
2. Pendant qu'il tourne (10-15h), dev l'Option 1
3. Teste avec 3 modes dès que le crawler finit
4. Si ça marche, continue avec les 4 handlers restants
5. Dans 3 jours total = **Jeu complet!**

Ça te va? Tu veux que je commence à implémenter les 4 handlers maintenant?
