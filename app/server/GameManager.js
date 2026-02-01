// ============================================
// GAME MANAGER - Gère toutes les rooms
// ============================================

const { Room } = require('./Room');

class GameManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map(); // roomCode -> Room instance
  }

  createRoom(socket, data) {
    const { roomCode, playerName } = data;

    // Vérifier si la room existe déjà
    if (this.rooms.has(roomCode)) {
      return { success: false, error: 'Room déjà existante' };
    }

    // Créer la room
    const room = new Room(roomCode, this.io);
    this.rooms.set(roomCode, room);

    // Ajouter le joueur (hôte)
    const result = room.addPlayer(socket, playerName, true);

    if (result.success) {
      console.log(`✅ Room ${roomCode} créée par ${playerName}`);
      return { success: true, roomCode, isHost: true };
    }

    return result;
  }

  joinRoom(socket, data) {
    const { roomCode, playerName, playerId } = data;

    // Vérifier si la room existe
    const room = this.rooms.get(roomCode);
    if (!room) {
      return { success: false, error: 'Room introuvable' };
    }

    // Ajouter le joueur
    const result = room.addPlayer(socket, playerName, false, playerId);

    if (result.success) {
      console.log(`✅ ${playerName} a rejoint ${roomCode}`);
      return { success: true, roomCode, isHost: false };
    }

    return result;
  }

  leaveRoom(socket) {
    const room = this.findRoomBySocket(socket);
    if (room) {
      room.removePlayer(socket);

      // Supprimer la room si vide
      if (room.players.size === 0) {
        console.log(`🗑️ Room ${room.code} supprimée (vide)`);
        this.rooms.delete(room.code);
      }
    }
  }

  changeTeam(socket, team) {
    const room = this.findRoomBySocket(socket);
    if (room) {
      room.changeTeam(socket, team);
    }
  }

  toggleReady(socket) {
    const room = this.findRoomBySocket(socket);
    if (room) {
      room.toggleReady(socket);
    }
  }

  updateConfig(socket, config) {
    const room = this.findRoomBySocket(socket);
    if (room) {
      room.updateConfig(socket, config);
    }
  }

  startGame(socket) {
    const room = this.findRoomBySocket(socket);
    if (room) {
      room.startGame(socket);
    }
  }

  submitAnswer(socket, data) {
    const room = this.findRoomBySocket(socket);
    if (room) {
      room.handleAnswer(socket, data);
    }
  }

  usePowerUp(socket, data) {
    const room = this.findRoomBySocket(socket);
    if (room) {
      room.usePowerUp(socket, data);
    }
  }

  selectPowerUp(socket, data) {
    const room = this.findRoomBySocket(socket);
    if (room) {
      room.selectPowerUp(socket, data);
    }
  }

  handleBuzz(socket) {
    const room = this.findRoomBySocket(socket);
    if (room) {
      room.handleBuzz(socket);
    }
  }

  handleDisconnect(socket) {
    const room = this.findRoomBySocket(socket);
    if (room) {
      room.handleDisconnect(socket);

      // Supprimer la room si vide
      if (room.players.size === 0) {
        console.log(`🗑️ Room ${room.code} supprimée (tous déconnectés)`);
        this.rooms.delete(room.code);
      }
    }
  }

  findRoomBySocket(socket) {
    for (const room of this.rooms.values()) {
      if (room.socketToPlayer?.has(socket.id)) {
        return room;
      }
    }
    return null;
  }
}

module.exports = { GameManager };
