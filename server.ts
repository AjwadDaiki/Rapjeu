// ============================================
// SERVEUR SOCKET.IO - RAP BATTLE GAME
// Timer autoritaire + FSM + 6 modes
// ============================================

import { config } from 'dotenv';
config({ path: '.env.local' });

process.env.NEXT_TELEMETRY_DISABLED = '1';

import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import next from 'next';
import { RoomManager } from './app/lib/roomManager';
import { 
  ClientToServerEvents, 
  ServerToClientEvents,
  Player,
  Team,
  PlayerRole,
  RoomConfig,
  GamePhase,
  TimerSync,
  EncheresData,
} from './app/types';
import { generateRoomCode, generateId } from './app/lib/utils';
import { TIMING } from './app/lib/constants';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ 
  dev, 
  hostname, 
  port,
  turbopack: false 
});
const handler = app.getRequestHandler();

// Store des rooms en mémoire
const roomManager = new RoomManager();

// Tickers de timer par room
const roomTickers = new Map<string, NodeJS.Timeout>();

// Event pollers par room (pour les événements générés par le RoomManager)
const roomEventPollers = new Map<string, NodeJS.Timeout>();
// Suivi de phase pour broadcast automatique
const roomLastPhase = new Map<string, GamePhase>();

// Préchargement des données API
import { preloadGameData } from './app/lib/gameDataService';
import { connectDB } from './app/lib/db';

app.prepare().then(async () => {
  // Connexion MongoDB (optionnel)
  await connectDB();
  
  // Précharger les tracks et albums
  await preloadGameData().catch(err => {
    console.warn('⚠️ Impossible de précharger les données API:', err.message);
  });
  
  const httpServer = createServer(handler);
  
  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Client connecté: ${socket.id}`);
    
    let currentPlayer: Player | null = null;
    let currentRoomCode: string | null = null;

    // ==========================================
    // ROOM MANAGEMENT
    // ==========================================

    socket.on('room:create', (config: Partial<RoomConfig>, callback) => {
      try {
        const roomCode = generateRoomCode();
        const room = roomManager.createRoom(roomCode, config);
        console.log(`🏠 Room créée: ${roomCode}`);
        callback(roomCode);
      } catch (error) {
        console.error('Erreur création room:', error);
        callback('');
      }
    });

    socket.on('room:join', (roomCode: string, playerName: string, callback) => {
      try {
        console.log(`📥 [${roomCode}] Tentative de join par ${playerName}`);
        
        const room = roomManager.getRoom(roomCode);
        if (!room) {
          console.log(`❌ [${roomCode}] Room introuvable`);
          callback(false, 'Room introuvable');
          return;
        }
        
        // Vérifier si ce joueur existe déjà (reconnexion)
        let existingPlayer: Player | undefined;
        for (const p of room.players.values()) {
          if (p.name === playerName && !p.isConnected) {
            existingPlayer = p;
            break;
          }
        }
        
        if (existingPlayer) {
          // Reconnexion
          console.log(`🔄 [${roomCode}] Reconnexion de ${playerName}`);
          existingPlayer.socketId = socket.id;
          existingPlayer.isConnected = true;
          existingPlayer.disconnectedAt = undefined;
          
          currentPlayer = existingPlayer;
          currentRoomCode = roomCode;
          
          socket.join(roomCode);
          socket.emit('room:joined', roomManager.serializeRoom(room), existingPlayer);
          socket.to(roomCode).emit('player:reconnected', existingPlayer);
          socket.to(roomCode).emit('room:updated', roomManager.serializeRoom(room));
          
          callback(true);
          return;
        }
        
        if (room.players.size >= room.config.maxPlayers) {
          callback(false, 'Room pleine');
          return;
        }
        
        const isFirstPlayer = room.players.size === 0;
        console.log(`📊 [${roomCode}] room.players.size = ${room.players.size}, isFirstPlayer = ${isFirstPlayer}`);
        
        const player: Player = {
          id: generateId(),
          socketId: socket.id,
          name: playerName.slice(0, 20),
          team: null,
          role: isFirstPlayer ? 'host' : 'player',
          isReady: false,
          isConnected: true,
        };
        
        room.players.set(player.id, player);
        
        // Si premier joueur, définir comme host de la room
        if (isFirstPlayer) {
          room.hostId = player.id;
          console.log(`👑 [${roomCode}] ${playerName} défini comme HOST (id: ${player.id})`);
        } else {
          console.log(`👤 [${roomCode}] ${playerName} défini comme PLAYER (id: ${player.id})`);
        }
        
        currentPlayer = player;
        currentRoomCode = roomCode;
        
        socket.join(roomCode);
        socket.emit('room:joined', roomManager.serializeRoom(room), player);
        socket.to(roomCode).emit('room:updated', roomManager.serializeRoom(room));
        
        console.log(`✅ [${roomCode}] ${playerName} a rejoint avec role: ${player.role}`);
        callback(true);
      } catch (error) {
        console.error('Erreur join room:', error);
        callback(false, 'Erreur serveur');
      }
    });

    socket.on('room:leave', () => {
      if (!currentPlayer || !currentRoomCode) return;
      
      const room = roomManager.getRoom(currentRoomCode);
      if (room) {
        // Marquer comme déconnecté plutôt que supprimer immédiatement
        const player = room.players.get(currentPlayer.id);
        if (player) {
          player.isConnected = false;
          player.disconnectedAt = Date.now();
        }
        
        // Si game en cours, garder le joueur pour reconnexion
        if (room.gameState.phase === 'playing') {
          socket.to(currentRoomCode).emit('player:disconnected', currentPlayer.id);
        } else {
          // Sinon supprimer
          room.players.delete(currentPlayer.id);
          if (room.players.size === 0) {
            stopRoomTicker(currentRoomCode);
            stopEventPoller(currentRoomCode);
            roomManager.deleteRoom(currentRoomCode);
          } else if (currentPlayer.role === 'host') {
            const newHost = room.players.values().next().value;
            if (newHost) {
              newHost.role = 'host';
              room.hostId = newHost.id;
            }
          }
        }
        
        socket.to(currentRoomCode).emit('room:updated', roomManager.serializeRoom(room));
      }
      
      socket.leave(currentRoomCode);
      currentRoomCode = null;
      currentPlayer = null;
    });

    socket.on('room:move_player', (playerId: string, team: Team | null, role: PlayerRole) => {
      if (!currentRoomCode) return;
      const room = roomManager.getRoom(currentRoomCode);
      if (!room) return;
      if (currentPlayer?.role !== 'host' && currentPlayer?.id !== playerId) return;
      
      const player = room.players.get(playerId);
      if (!player) return;
      
      if (team !== undefined) player.team = team;
      // Ne pas changer le rôle si c'est l'host (sauf si c'est l'host lui-même qui change)
      if (role && player.role !== 'host') {
        player.role = role;
      }
      
      io.to(currentRoomCode).emit('player:moved', playerId, team, role);
      io.to(currentRoomCode).emit('room:updated', roomManager.serializeRoom(room));
    });

    socket.on('room:set_ready', (ready: boolean) => {
      if (!currentPlayer || !currentRoomCode) return;
      const room = roomManager.getRoom(currentRoomCode);
      if (!room) return;
      
      roomManager.setPlayerReady(currentRoomCode, currentPlayer.id, ready);
      io.to(currentRoomCode).emit('room:updated', roomManager.serializeRoom(room));
    });

    // ==========================================
    // GAME FLOW
    // ==========================================

    socket.on('game:start', () => {
      console.log(`🎮 [${currentRoomCode}] Tentative de démarrage par ${currentPlayer?.name} (role: ${currentPlayer?.role})`);
      
      if (!currentPlayer || !currentRoomCode) {
        console.log('❌ Pas de joueur ou pas de room');
        return;
      }
      
      if (currentPlayer.role !== 'host') {
        console.log(`❌ ${currentPlayer.name} n'est pas host (role: ${currentPlayer.role})`);
        socket.emit('error', 'Seul l\'hôte peut démarrer la partie');
        return;
      }
      
      const room = roomManager.getRoom(currentRoomCode);
      if (!room) {
        console.log('❌ Room introuvable');
        return;
      }
      
      // Vérifier que tous les joueurs sont assignés à une équipe
      const teamPlayers = Array.from(room.players.values()).filter(p => p.team !== null);
      const teamAPlayers = teamPlayers.filter(p => p.team === 'A');
      const teamBPlayers = teamPlayers.filter(p => p.team === 'B');
      
      console.log(`📊 Team A: ${teamAPlayers.length}, Team B: ${teamBPlayers.length}, Total: ${teamPlayers.length}`);
      
      if (teamAPlayers.length === 0 || teamBPlayers.length === 0) {
        console.log('❌ Pas assez de joueurs dans les équipes');
        socket.emit('error', 'Il faut au moins 1 joueur dans chaque équipe (1v1 minimum)');
        return;
      }
      
      // Vérifier que tous les joueurs sont prêts
      const notReady = teamPlayers.filter(p => !p.isReady);
      console.log(`⏳ Joueurs pas prêts: ${notReady.map(p => p.name).join(', ') || 'aucun'}`);
      
      if (notReady.length > 0) {
        socket.emit('error', `Tous les joueurs doivent être prêts (${notReady.map(p => p.name).join(', ')})`);
        return;
      }
      
      console.log(`✅ Démarrage de la partie dans ${currentRoomCode}!`);
      
      roomManager.startMatch(room);
      io.to(currentRoomCode).emit('game:started');
      
      // Démarrer le poller d'événements
      startEventPoller(currentRoomCode);
      
      // Broadcast phase change
      broadcastPhaseChange(currentRoomCode, room);
    });

    socket.on('game:request_revanche', () => {
      if (!currentPlayer || !currentRoomCode) return;
      const room = roomManager.getRoom(currentRoomCode);
      if (!room) return;
      
      // Reset et restart
      roomManager.startMatch(room);
      io.to(currentRoomCode).emit('game:started');
      broadcastPhaseChange(currentRoomCode, room);
    });

    // ==========================================
    // GAMEPLAY - ANSWERS
    // ==========================================

    socket.on('game:submit_answer', (answer: string) => {
      if (!currentPlayer || !currentRoomCode || !currentPlayer.team) return;
      
      const room = roomManager.getRoom(currentRoomCode);
      if (!room) return;
      
      const result = roomManager.submitAnswer(currentRoomCode, currentPlayer.team, answer, currentPlayer.id);
      if (!result) return;
      
      io.to(currentRoomCode).emit('game:answer_result', result);
      
      // Traiter les événements en attente
      processPendingEvents(currentRoomCode);
      
      // Send updated timer
      broadcastTimerSync(currentRoomCode, room);
      
      // Check for KO
      if (result.newScore <= 0 || result.opponentScore <= 0) {
        handleKO(currentRoomCode, room);
      }
    });

    socket.on('game:submit_bet', (bet: number) => {
      if (!currentPlayer || !currentRoomCode || !currentPlayer.team) return;
      
      const success = roomManager.submitBet(currentRoomCode, currentPlayer.team, bet);
      if (!success) return;
      
      const room = roomManager.getRoom(currentRoomCode);
      if (!room) return;
      
      const data = room.gameState.currentData as EncheresData;
      if (data?.betState?.revealed) {
        io.to(currentRoomCode).emit('game:bet_revealed', 
          { A: data.betState.teamABet || 0, B: data.betState.teamBBet || 0 },
          data.betState.winner!,
          data.betState.targetCount
        );
        // Start proof phase timer
        startRoomTicker(currentRoomCode, room);
      }
    });

    socket.on('game:submit_mytho', (isTrue: boolean) => {
      if (!currentPlayer || !currentRoomCode || !currentPlayer.team) return;
      
      roomManager.submitMythoAnswer(currentRoomCode, currentPlayer.team, isTrue);
      
      // Traiter les événements en attente (mytho_result)
      processPendingEvents(currentRoomCode);
    });

    socket.on('game:buzz', () => {
      if (!currentPlayer || !currentRoomCode || !currentPlayer.team) return;
      
      const result = roomManager.handleBuzz(currentRoomCode, currentPlayer.team);
      if (!result) return;
      
      io.to(currentRoomCode).emit('game:buzz_result', result.buzzedTeam, result.timeLeft);
      
      // Restart le ticker avec le nouveau timer
      const room = roomManager.getRoom(currentRoomCode);
      if (room) {
        startRoomTicker(currentRoomCode, room);
      }
    });

    // ==========================================
    // INPUT SYNC
    // ==========================================

    socket.on('input:typing', (value: string) => {
      if (!currentPlayer || !currentRoomCode || !currentPlayer.team) return;
      
      const room = roomManager.getRoom(currentRoomCode);
      if (!room) return;
      
      const teamState = currentPlayer.team === 'A' ? room.teamA : room.teamB;
      if (teamState.isInputLocked) return;
      
      socket.to(currentRoomCode).emit('input:sync', currentPlayer.team, value);
    });

    // ==========================================
    // DISPUTE (VETO)
    // ==========================================

    socket.on('game:request_dispute', (answerId: string) => {
      if (!currentPlayer || !currentRoomCode || !currentPlayer.team) return;
      
      const room = roomManager.getRoom(currentRoomCode);
      if (!room) return;
      
      const dispute = roomManager.startDispute(currentRoomCode, answerId, currentPlayer.team);
      if (dispute) {
        io.to(currentRoomCode).emit('game:dispute_started', dispute);
      }
    });

    socket.on('game:vote_dispute', (accept: boolean) => {
      if (!currentPlayer || !currentRoomCode || !currentPlayer.team) return;
      
      const dispute = roomManager.voteDispute(currentRoomCode, accept);
      if (dispute) {
        // Le résultat sera envoyé via processPendingEvents
        processPendingEvents(currentRoomCode);
      }
    });

    // ==========================================
    // DISCONNECTION
    // ==========================================

    socket.on('disconnect', () => {
      console.log(`🔌 Client déconnecté: ${socket.id}`);
      
      if (currentPlayer && currentRoomCode) {
        const room = roomManager.getRoom(currentRoomCode);
        if (room) {
          const player = room.players.get(currentPlayer.id);
          if (player) {
            player.isConnected = false;
            player.disconnectedAt = Date.now();
            socket.to(currentRoomCode).emit('player:disconnected', currentPlayer.id);
            socket.to(currentRoomCode).emit('room:updated', roomManager.serializeRoom(room));
          }
        }
      }
    });
  });

  // ==========================================
  // TIMER AUTHORITATIVE
  // ==========================================

  function startRoomTicker(roomCode: string, room: ReturnType<RoomManager['getRoom']>): void {
    if (!room) return;
    
    stopRoomTicker(roomCode);
    
    const ticker = setInterval(() => {
      if (!room.gameState.isTimerRunning || !room.gameState.timerEndsAt) return;
      
      const remaining = room.gameState.timerEndsAt - Date.now();
      
      if (remaining <= 0) {
        // Timer expired - handled by roomManager
        stopRoomTicker(roomCode);
      } else {
        // Broadcast tick
        io.to(roomCode).emit('game:timer_tick', Math.max(0, remaining));
      }
    }, TIMING.TIMER_TICK_RATE);
    
    roomTickers.set(roomCode, ticker);
  }

  function stopRoomTicker(roomCode: string): void {
    const ticker = roomTickers.get(roomCode);
    if (ticker) {
      clearInterval(ticker);
      roomTickers.delete(roomCode);
    }
  }

  // ==========================================
  // EVENT POLLER (pour les événements RoomManager)
  // ==========================================

  function startEventPoller(roomCode: string): void {
    stopEventPoller(roomCode);
    
    const poller = setInterval(() => {
      processPendingEvents(roomCode);
      checkPhaseChange(roomCode);
    }, 100); // Check every 100ms
    
    roomEventPollers.set(roomCode, poller);
  }

  function stopEventPoller(roomCode: string): void {
    const poller = roomEventPollers.get(roomCode);
    if (poller) {
      clearInterval(poller);
      roomEventPollers.delete(roomCode);
    }
    roomLastPhase.delete(roomCode);
  }

  function processPendingEvents(roomCode: string): void {
    const events = roomManager.getAndClearPendingEvents(roomCode);
    
    for (const event of events) {
      switch (event.type) {
        case 'mytho_result':
          io.to(roomCode).emit('game:mytho_result', 
            event.isTrue, 
            event.explanation, 
            event.teamAScore, 
            event.teamBScore
          );
          break;
          
        case 'dispute_started':
          io.to(roomCode).emit('game:dispute_started', event.dispute);
          break;
          
        case 'dispute_resolved':
          io.to(roomCode).emit('game:dispute_resolved', event.dispute, event.accepted);
          if (event.answerResult) {
            io.to(roomCode).emit('game:answer_result', event.answerResult);
          }
          break;
          
        case 'pixel_blur_update':
          io.to(roomCode).emit('game:pixel_blur_update', event.blur, event.progress);
          break;
          
        case 'encheres_failed':
          io.to(roomCode).emit('shake', 0.8);
          io.to(roomCode).emit('error', `Équipe ${event.team} a échoué les enchères !`);
          break;
          
        case 'chain_update':
          io.to(roomCode).emit('game:chain_update', event.chain);
          break;
          
        case 'combo_update':
          io.to(roomCode).emit('game:combo_update', event.team, event.combo, event.multiplier);
          break;

        case 'room_update': {
          const room = roomManager.getRoom(roomCode);
          if (room) {
            io.to(roomCode).emit('room:updated', roomManager.serializeRoom(room));
            broadcastTimerSync(roomCode, room);
          }
          break;
        }
      }
    }
  }

  function checkPhaseChange(roomCode: string): void {
    const room = roomManager.getRoom(roomCode);
    if (!room) {
      roomLastPhase.delete(roomCode);
      return;
    }
    const currentPhase = room.gameState.phase;
    const lastPhase = roomLastPhase.get(roomCode);
    if (lastPhase !== currentPhase) {
      broadcastPhaseChange(roomCode, room);
    }
  }

  function broadcastTimerSync(roomCode: string, room: ReturnType<RoomManager['getRoom']>): void {
    if (!room) return;
    
    const sync: TimerSync = {
      endsAt: room.gameState.timerEndsAt || 0,
      duration: room.gameState.timerDuration,
      remaining: room.gameState.timerEndsAt ? Math.max(0, room.gameState.timerEndsAt - Date.now()) : 0,
      isRunning: room.gameState.isTimerRunning,
    };
    
    io.to(roomCode).emit('game:timer_sync', sync);
  }

  function broadcastPhaseChange(roomCode: string, room: ReturnType<RoomManager['getRoom']>): void {
    if (!room) {
      console.log(`❌ broadcastPhaseChange: room ${roomCode} introuvable`);
      return;
    }
    roomLastPhase.set(roomCode, room.gameState.phase);
    
    const phase = room.gameState.phase;
    const mode = room.gameState.currentMode;
    const data = room.gameState.currentData;
    
    console.log(`📡 [${roomCode}] Phase change: ${phase}, mode: ${mode}`);
    
    io.to(roomCode).emit('game:phase_changed', phase, { mode, data });
    
    // Phase-specific broadcasts
    switch (phase) {
      case 'vs_intro':
        const teamAPlayers = Array.from(room.players.values()).filter(p => p.team === 'A');
        const teamBPlayers = Array.from(room.players.values()).filter(p => p.team === 'B');
        io.to(roomCode).emit('game:vs_intro', teamAPlayers, teamBPlayers);
        break;
        
      case 'mode_roulette':
        if (mode) {
          io.to(roomCode).emit('game:mode_roulette', room.config.modes, mode, TIMING.MODE_ROULETTE_DURATION);
        }
        break;
        
      case 'mode_intro':
        if (mode && data) {
          io.to(roomCode).emit('game:mode_selected', mode, data);
        }
        break;
        
      case 'playing':
        if (mode && data) {
          io.to(roomCode).emit('game:round_started', room.gameState.currentRound, mode, data);
          startRoomTicker(roomCode, room);
        }
        break;
        
      case 'round_result':
        const result = room.gameState.roundResults[room.gameState.roundResults.length - 1];
        if (result) {
          io.to(roomCode).emit('game:round_ended', result);
        }
        break;
        
      case 'final_score':
        if (room.gameState.winner) {
          io.to(roomCode).emit('game:ended', room.gameState.winner, 
            { A: room.teamA.score, B: room.teamB.score },
            room.gameState.roundResults
          );
        }
        break;
    }
    
    // Mettre à jour l'état de la room pour tous
    io.to(roomCode).emit('room:updated', roomManager.serializeRoom(room));
  }

  function handleKO(roomCode: string, room: ReturnType<RoomManager['getRoom']>): void {
    if (!room) return;
    
    // Shake effect
    io.to(roomCode).emit('shake', 1.0);
    
    // Check for actual KO
    if (room.teamA.score <= 0 || room.teamB.score <= 0) {
      // End game
      room.gameState.winner = room.teamA.score > room.teamB.score ? 'A' : 'B';
      room.gameState.phase = 'final_score';
      io.to(roomCode).emit('game:ended', room.gameState.winner,
        { A: room.teamA.score, B: room.teamB.score },
        room.gameState.roundResults
      );
    }
  }

  httpServer.listen(port, () => {
    console.log(`🚀 Serveur prêt sur http://${hostname}:${port}`);
  });
});
