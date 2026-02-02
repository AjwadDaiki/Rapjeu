// ============================================
// GAME STATE MACHINE
// Gère les états et transitions du jeu
// ============================================

const { GAME_MODES } = require('../lib/constants');
const { getActiveModes } = require('../lib/gameConfig');

// Import handlers pour chaque mode
const { RolandGamosHandler } = require('./modes/RolandGamosHandler');
const { LeThemeHandler } = require('./modes/LeThemeHandler');
const { MythoPasMythoHandler } = require('./modes/MythoPasMythoHandler');
const { EncheresHandler } = require('./modes/EncheresHandler');
const { BlindTestHandler } = require('./modes/BlindTestHandler');
const { PixelCoverHandler } = require('./modes/PixelCoverHandler');
const { DevineQuiHandler } = require('./modes/DevineQuiHandler');

class GameStateMachine {
  constructor(room) {
    this.room = room;

    // État actuel
    this.state = 'lobby';

    // Données de jeu
    this.modesQueue = [];      // Modes sélectionnés pour cette partie
    this.currentModeIndex = 0; // Index du mode actuel
    this.currentRound = 0;     // Round actuel du mode
    this.currentTurn = 'A';    // Team qui joue ('A' ou 'B')

    // HP des teams
    this.teamHP = {
      A: 100,
      B: 100,
    };

    // Combo counter
    this.combos = {
      A: 0,
      B: 0,
    };

    // Power-ups en attente
    this.pendingPowerUps = {
      A: null,
      B: null,
    };

    // Données de la question actuelle
    this.currentQuestion = null;
    this.currentHandler = null;

    // Timer
    this.timer = null;
    this.timeLeft = 0;

    // Handlers pour chaque mode
    this.handlers = {
      roland_gamos: new RolandGamosHandler(this.room),
      le_theme: new LeThemeHandler(this.room),
      mytho_pas_mytho: new MythoPasMythoHandler(this.room),
      encheres: new EncheresHandler(this.room),
      blind_test: new BlindTestHandler(this.room),
      pixel_cover: new PixelCoverHandler(this.room),
      devine_qui: new DevineQuiHandler(this.room),
    };
  }

  // ==========================================
  // LIFECYCLE
  // ==========================================

  start() {
    console.log(`🎮 Démarrage du jeu dans room ${this.room.code}`);

    // Sélectionner les modes pour cette partie
    this.selectModes();

    // Transition vers l'écran VS
    this.setState('vs_screen');

    // Après 3s, passer à la sélection de mode
    setTimeout(() => {
      this.setState('mode_selection');
    }, 3000);
  }

  selectModes() {
    // Récupérer les modes actifs
    const activeModes = getActiveModes(this.room.config);

    // Mélanger si randomModeOrder
    if (this.room.config.randomModeOrder) {
      activeModes.sort(() => Math.random() - 0.5);
    }

    // Prendre modesPerGame premiers
    this.modesQueue = activeModes.slice(0, this.room.config.modesPerGame);

    console.log(`📋 Modes sélectionnés:`, this.modesQueue);
  }

  setState(newState) {
    console.log(`🔄 Transition: ${this.state} → ${newState}`);

    this.state = newState;
    this.room.broadcastState();

    // Handlers par état
    switch (newState) {
      case 'vs_screen':
        this.handleVsScreen();
        break;

      case 'mode_selection':
        this.handleModeSelection();
        break;

      case 'round_start':
        this.handleRoundStart();
        break;

      case 'round_active':
        this.handleRoundActive();
        break;

      case 'round_end':
        this.handleRoundEnd();
        break;

      case 'power_up_selection':
        this.handlePowerUpSelection();
        break;

      case 'mode_end':
        this.handleModeEnd();
        break;

      case 'game_over':
        this.handleGameOver();
        break;
    }
  }

  // ==========================================
  // STATE HANDLERS
  // ==========================================

  handleVsScreen() {
    this.room.broadcast('vs_screen', {
      teamA: Array.from(this.room.players.values()).filter(p => p.team === 'A'),
      teamB: Array.from(this.room.players.values()).filter(p => p.team === 'B'),
    });
  }

  handleModeSelection() {
    const currentMode = this.modesQueue[this.currentModeIndex];

    this.room.broadcast('mode_roulette', {
      selectedMode: currentMode,
      modesQueue: this.modesQueue,
      currentIndex: this.currentModeIndex,
    });

    // Après 2s, démarrer le mode
    setTimeout(() => {
      this.setState('round_start');
    }, 2000);
  }

  async handleRoundStart() {
    const currentMode = this.modesQueue[this.currentModeIndex];
    this.currentHandler = this.handlers[currentMode];

    // Générer une question
    this.currentQuestion = await this.currentHandler.generateQuestion();

    // Broadcast la question
    this.room.broadcast('round_start', {
      mode: currentMode,
      round: this.currentRound + 1,
      totalRounds: this.room.config.roundsPerMode,
      question: this.currentQuestion,
    });

    // Après 1s, activer le round
    setTimeout(() => {
      this.setState('round_active');
    }, 1000);
  }

  handleRoundActive() {
    // Démarrer le timer
    const timeLimit = this.currentHandler.getTimeLimit();
    this.startTimer(timeLimit);
  }

  handleRoundEnd() {
    // Stopper le timer
    this.stopTimer();

    // Calculer les résultats
    const results = this.currentHandler.calculateResults();

    // Appliquer les dégâts
    if (results.winner) {
      const loser = results.winner === 'A' ? 'B' : 'A';
      this.teamHP[loser] = Math.max(0, this.teamHP[loser] - results.damage);

      // Combo
      this.combos[results.winner]++;
      this.combos[loser] = 0;
    }

    // Broadcast résultats
    this.room.broadcast('round_end', {
      results,
      teamHP: this.teamHP,
      combos: this.combos,
    });

    // Vérifier game over
    if (this.teamHP.A <= 0 || this.teamHP.B <= 0) {
      setTimeout(() => this.setState('game_over'), 3000);
      return;
    }

    // Prochain round ou power-up selection
    this.currentRound++;

    if (this.currentRound >= this.room.config.roundsPerMode) {
      // Mode terminé
      setTimeout(() => this.setState('mode_end'), 3000);
    } else {
      // Power-up selection si enabled
      if (this.room.config.enablePowerUps && this.currentRound % 2 === 0) {
        setTimeout(() => this.setState('power_up_selection'), 3000);
      } else {
        setTimeout(() => this.setState('round_start'), 3000);
      }
    }
  }

  handlePowerUpSelection() {
    // Chaque team choisit un power-up
    this.room.broadcast('power_up_selection', {
      availablePowerUps: ['time_boost', 'hint', 'block', 'double_damage', 'shield', 'steal_turn'],
    });

    // Attendre 10s ou que les 2 teams choisissent
    setTimeout(() => {
      this.setState('round_start');
    }, 10000);
  }

  handleModeEnd() {
    this.currentModeIndex++;
    this.currentRound = 0;

    if (this.currentModeIndex >= this.modesQueue.length) {
      // Tous les modes terminés
      this.setState('game_over');
    } else {
      // Prochain mode
      this.setState('mode_selection');
    }
  }

  handleGameOver() {
    const winner = this.teamHP.A > this.teamHP.B ? 'A' : 'B';

    this.room.broadcast('game_over', {
      winner,
      finalHP: this.teamHP,
      stats: {
        // Stats de la partie...
      },
    });
  }

  // ==========================================
  // GAMEPLAY HANDLERS
  // ==========================================

  handleAnswer(socket, data) {
    if (this.state !== 'round_active') return;

    const player = this.room.getPlayerBySocket(socket.id);
    if (!player) return;

    // Déléguer au handler du mode
    this.currentHandler.handleAnswer(socket, player, data);
  }

  usePowerUp(socket, data) {
    const player = this.room.getPlayerBySocket(socket.id);
    if (!player) return;

    // TODO: Implémenter logique power-ups
  }

  selectPowerUp(socket, data) {
    const player = this.room.getPlayerBySocket(socket.id);
    if (!player) return;

    this.pendingPowerUps[player.team] = data.powerUp;

    // Vérifier si les 2 teams ont choisi
    if (this.pendingPowerUps.A && this.pendingPowerUps.B) {
      // Donner les power-ups
      Array.from(this.room.players.values()).forEach(p => {
        p.powerUps.push(this.pendingPowerUps[p.team]);
      });

      this.pendingPowerUps = { A: null, B: null };

      // Continuer le jeu
      this.setState('round_start');
    }
  }

  handleBuzz(socket) {
    if (this.state !== 'round_active') return;

    const player = this.room.getPlayerBySocket(socket.id);
    if (!player) return;

    // Déléguer au handler (pour Blind Test)
    if (this.currentHandler.handleBuzz) {
      this.currentHandler.handleBuzz(socket, player);
    }
  }

  // ==========================================
  // TIMER
  // ==========================================

  startTimer(duration) {
    this.timeLeft = duration;

    this.timer = setInterval(() => {
      this.timeLeft -= 100;

      if (this.timeLeft <= 0) {
        this.onTimeOut();
      } else {
        // Broadcast timer update
        this.room.broadcast('timer_update', { timeLeft: this.timeLeft });
      }
    }, 100);
  }

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  onTimeOut() {
    this.stopTimer();

    // Déléguer au handler
    this.currentHandler.onTimeOut();

    // Passer au round end
    this.setState('round_end');
  }

  // ==========================================
  // UTILITY
  // ==========================================

  pause(reason) {
    this.stopTimer();
    this.room.broadcast('game_paused', { reason });
  }

  getPublicState() {
    return {
      state: this.state,
      currentMode: this.modesQueue[this.currentModeIndex],
      currentRound: this.currentRound,
      currentTurn: this.currentTurn,
      teamHP: this.teamHP,
      combos: this.combos,
      timeLeft: this.timeLeft,
      currentQuestion: this.currentQuestion,
    };
  }
}

module.exports = { GameStateMachine };
