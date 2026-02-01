// ============================================
// ROOM - Gère une partie de jeu
// ============================================

const { DEFAULT_CONFIG } = require('../lib/gameConfig');
const { GameStateMachine } = require('./GameStateMachine');

class Room {
  constructor(code, io) {
    this.code = code;
    this.io = io;

    // Joueurs: playerId -> player data
    this.players = new Map();
    this.socketToPlayer = new Map(); // socketId -> playerId

    // Configuration
    this.config = { ...DEFAULT_CONFIG };

    // État du jeu
    this.gameState = new GameStateMachine(this);

    // Hôte (premier joueur)
    this.hostId = null;
  }

  getPlayerBySocket(socketId) {
    const playerId = this.socketToPlayer.get(socketId);
    if (!playerId) return null;
    return this.players.get(playerId) || null;
  }

  // ==========================================
  // GESTION DES JOUEURS
  // ==========================================

  addPlayer(socket, playerName, isHost = false, reconnectId = null) {
    // Vérifier limite de joueurs
    if (this.players.size >= this.config.maxPlayers) {
      return { success: false, error: 'Partie complète' };
    }

    // Vérifier si déjà en jeu
    if (this.gameState.state !== 'lobby') {
      return { success: false, error: 'Partie déjà commencée' };
    }

    const cleanName = String(playerName || '').trim();
    const normalizedName = cleanName.toLowerCase();
    if (!cleanName) {
      return { success: false, error: 'Pseudo invalide' };
    }
    if (cleanName.length < 2) {
      return { success: false, error: 'Pseudo trop court' };
    }

    // Tentative de reconnexion via playerId (stable)
    if (reconnectId && this.players.has(reconnectId)) {
      const existing = this.players.get(reconnectId);
      if (existing && existing.name.toLowerCase() === normalizedName && !existing.connected) {
        if (existing.socketId) {
          this.socketToPlayer.delete(existing.socketId);
        }
        existing.socketId = socket.id;
        existing.connected = true;
        this.socketToPlayer.set(socket.id, existing.id);

        socket.join(this.code);
        this.broadcastState();
        return { success: true, reconnected: true };
      }

      // ID invalide ou déjà connecté
      if (existing && existing.connected) {
        return { success: false, error: 'Déjà connecté' };
      }
    }

    // Tentative de reconnexion via pseudo (fallback safe)
    const existingByName = Array.from(this.players.values()).find(
      (p) => p.name.toLowerCase() === normalizedName
    );
    if (existingByName && existingByName.connected) {
      return { success: false, error: 'Pseudo déjà utilisé' };
    }

    if (!reconnectId && existingByName && !existingByName.connected) {
      if (existingByName.socketId) {
        this.socketToPlayer.delete(existingByName.socketId);
      }
      existingByName.socketId = socket.id;
      existingByName.connected = true;
      this.socketToPlayer.set(socket.id, existingByName.id);

      socket.join(this.code);
      this.broadcastState();
      return { success: true, reconnected: true };
    }

    // Assigner automatiquement à une team
    const teamA = Array.from(this.players.values()).filter(p => p.team === 'A').length;
    const teamB = Array.from(this.players.values()).filter(p => p.team === 'B').length;
    const team = teamA <= teamB ? 'A' : 'B';

    // Créer le joueur
    const playerId = reconnectId && this.players.has(reconnectId) ? reconnectId : socket.id;
    const player = {
      id: playerId,
      socketId: socket.id,
      name: cleanName,
      team: team,
      ready: false,
      connected: true,
      powerUps: [],
      score: 0,
    };

    this.players.set(playerId, player);
    this.socketToPlayer.set(socket.id, playerId);

    // Définir l'hôte
    if (isHost || this.players.size === 1) {
      this.hostId = playerId;
    }

    // Rejoindre la room Socket.io
    socket.join(this.code);

    // Broadcast update
    this.broadcastState();

    return { success: true };
  }

  removePlayer(socket) {
    const player = this.getPlayerBySocket(socket.id);
    if (!player) return;

    this.players.delete(player.id);
    this.socketToPlayer.delete(socket.id);
    socket.leave(this.code);

    // Changer l'hôte si nécessaire
    if (this.hostId === player.id && this.players.size > 0) {
      this.hostId = this.players.keys().next().value;
    }

    // Broadcast update
    this.broadcastState();
  }

  changeTeam(socket, team) {
    const player = this.getPlayerBySocket(socket.id);
    if (!player) return;

    player.team = team;
    player.ready = false; // Reset ready

    this.broadcastState();
  }

  toggleReady(socket) {
    const player = this.getPlayerBySocket(socket.id);
    if (!player) return;

    player.ready = !player.ready;

    this.broadcastState();
  }

  handleDisconnect(socket) {
    const player = this.getPlayerBySocket(socket.id);
    if (!player) return;

    player.connected = false;
    this.socketToPlayer.delete(socket.id);

    // Si en partie, mettre en pause
    if (this.gameState.state !== 'lobby') {
      this.gameState.pause('Joueur déconnecté');
    }

    this.broadcastState();
  }

  // ==========================================
  // CONFIGURATION
  // ==========================================

  updateConfig(socket, config) {
    // Seul l'hôte peut modifier
    const player = this.getPlayerBySocket(socket.id);
    if (!player || player.id !== this.hostId) {
      return { success: false, error: 'Seul l\'hôte peut modifier la config' };
    }

    this.config = { ...this.config, ...config };

    this.broadcastState();
    return { success: true };
  }

  // ==========================================
  // DÉMARRAGE DU JEU
  // ==========================================

  startGame(socket) {
    // Seul l'hôte peut démarrer
    const player = this.getPlayerBySocket(socket.id);
    if (!player || player.id !== this.hostId) {
      return;
    }

    // Vérifier qu'il y a au moins 2 joueurs
    if (this.players.size < 2) {
      this.io.to(socket.id).emit('error', { message: 'Au moins 2 joueurs requis' });
      return;
    }

    // Vérifier que tout le monde est ready
    const allReady = Array.from(this.players.values()).every(p => p.ready);
    if (!allReady) {
      this.io.to(socket.id).emit('error', { message: 'Tous les joueurs doivent être ready' });
      return;
    }

    // Démarrer la state machine
    this.gameState.start();
  }

  // ==========================================
  // GAMEPLAY
  // ==========================================

  handleAnswer(socket, data) {
    this.gameState.handleAnswer(socket, data);
  }

  usePowerUp(socket, data) {
    this.gameState.usePowerUp(socket, data);
  }

  selectPowerUp(socket, data) {
    this.gameState.selectPowerUp(socket, data);
  }

  handleBuzz(socket) {
    this.gameState.handleBuzz(socket);
  }

  // ==========================================
  // BROADCASTING
  // ==========================================

  broadcastState() {
    const state = {
      code: this.code,
      players: Array.from(this.players.values()),
      config: this.config,
      hostId: this.hostId,
      gameState: this.gameState.getPublicState(),
    };

    this.io.to(this.code).emit('room_state', state);
  }

  broadcast(event, data) {
    this.io.to(this.code).emit(event, data);
  }

  emitTo(socketId, event, data) {
    this.io.to(socketId).emit(event, data);
  }
}

module.exports = { Room };
