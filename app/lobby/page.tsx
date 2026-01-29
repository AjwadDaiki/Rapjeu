'use client';

// ============================================
// PAGE LOBBY - Création et gestion des rooms
// ============================================

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useSocket } from '../hooks/useSocket';
import { TeamSlot } from '../components/TeamSlot';

export default function LobbyPage() {
  const router = useRouter();
  const { 
    state, 
    room, 
    currentPlayer,
    socket,
    createRoom, 
    joinRoom, 
    leaveRoom,
    movePlayer,
    setReady,
    startGame,
  } = useSocket();

  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');

  // Charger le nom depuis sessionStorage (par onglet)
  useEffect(() => {
    const savedName = sessionStorage.getItem('playerName');
    if (savedName) {
      setPlayerName(savedName);
    }
  }, []);

  // Sauvegarder le nom dans sessionStorage (par onglet)
  useEffect(() => {
    if (playerName) {
      sessionStorage.setItem('playerName', playerName);
    }
  }, [playerName]);

  // Sauvegarder le roomCode quand on a une room (dans les deux storages)
  useEffect(() => {
    if (room) {
      localStorage.setItem('currentRoomCode', room.code);
      sessionStorage.setItem('currentRoomCode', room.code);
      console.log('💾 Room code sauvegardé:', room.code);
    }
  }, [room]);

  // État pour savoir si la partie a démarré
  const [gameStarted, setGameStarted] = useState(false);

  // Détection du démarrage de partie
  useEffect(() => {
    if (!socket) return;
    
    const handleGameStarted = () => {
      console.log('🎮 Partie démarrée!');
      setGameStarted(true);
    };
    
    socket.on('game:started', handleGameStarted);
    return () => {
      socket.off('game:started', handleGameStarted);
    };
  }, [socket]);

  const handleCreateRoom = async () => {
    if (!playerName.trim()) return;
    const code = await createRoom();
    if (code) {
      await joinRoom(code, playerName);
    }
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim() || !roomCode.trim()) return;
    await joinRoom(roomCode.toUpperCase(), playerName);
  };

  // Redirection vers /game quand la partie démarre
  useEffect(() => {
    if (gameStarted && room) {
      console.log('🔄 Redirection vers /game');
      router.push('/game');
    }
  }, [gameStarted, room, router]);

  // Si déjà dans une room
  if (room) {
    console.log('🏠 Render lobby - currentPlayer:', currentPlayer?.name, 'role:', currentPlayer?.role, 'id:', currentPlayer?.id);
    console.log('🏠 room.hostId:', room.hostId);
    
    const teamAPlayers = room.players.filter(p => p.team === 'A');
    const teamBPlayers = room.players.filter(p => p.team === 'B');
    const spectators = room.players.filter(p => p.team === null);
    
    const isHost = currentPlayer?.role === 'host' || room.hostId === currentPlayer?.id;
    console.log('👑 isHost:', isHost);
    
    const allReady = room.players.filter(p => p.team !== null).every(p => p.isReady);
    const canStart = allReady && teamAPlayers.length > 0 && teamBPlayers.length > 0;

    return (
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-yellow-400 bg-clip-text text-transparent">
                RAP BATTLE ONLINE
              </h1>
              <p className="text-gray-400">
                Room: <span className="font-mono text-xl">{room.code}</span>
                {isHost && (
                  <span className="ml-3 px-2 py-1 bg-yellow-600 rounded text-xs font-bold">HÔTE</span>
                )}
              </p>
            </div>
            <button
              onClick={leaveRoom}
              className="px-4 py-2 bg-red-600 rounded-lg hover:bg-red-500 transition-colors"
            >
              Quitter
            </button>
          </div>

          {/* Teams Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <TeamSlot
              team="A"
              players={teamAPlayers}
              isHost={isHost}
              currentPlayerId={currentPlayer?.id || ''}
              onMovePlayer={(playerId, team) => movePlayer(playerId, team, 'player')}
            />

            {/* Center Info */}
            <div className="flex flex-col items-center justify-center p-6 bg-gray-800/50 rounded-xl">
              <div className="text-6xl mb-4">VS</div>
              <div className="text-center">
                <p className="text-gray-400 mb-2">{room.players.length} joueurs</p>
                <p className="text-sm text-gray-500">
                  {teamAPlayers.length} vs {teamBPlayers.length}
                </p>
                <p className="text-xs text-green-500 mt-2">
                  1v1 possible !
                </p>
              </div>
            </div>

            <TeamSlot
              team="B"
              players={teamBPlayers}
              isHost={isHost}
              currentPlayerId={currentPlayer?.id || ''}
              onMovePlayer={(playerId, team) => movePlayer(playerId, team, 'player')}
            />
          </div>

          {/* Spectateurs */}
          <div className="mb-8">
            <TeamSlot
              team={null}
              players={spectators}
              maxPlayers={8}
              isHost={isHost}
              currentPlayerId={currentPlayer?.id || ''}
              onMovePlayer={(playerId, team) => movePlayer(playerId, team, team ? 'player' : 'spectator')}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-center gap-4">
            <motion.button
              onClick={() => setReady(!currentPlayer?.isReady)}
              className={`px-8 py-4 rounded-xl font-bold text-lg transition-colors ${
                currentPlayer?.isReady
                  ? 'bg-green-600 hover:bg-green-500'
                  : 'bg-red-600 hover:bg-red-500'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {currentPlayer?.isReady ? '✓ Prêt' : 'Pas prêt'}
            </motion.button>

            {/* Bouton Démarrer */}
            <motion.button
              onClick={startGame}
              disabled={!canStart || !isHost}
              className={`px-8 py-4 rounded-xl font-bold text-lg transition-colors ${
                !isHost 
                  ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                  : canStart 
                    ? 'bg-blue-600 hover:bg-blue-500' 
                    : 'bg-gray-700 cursor-not-allowed'
              }`}
              whileHover={canStart && isHost ? { scale: 1.05 } : {}}
              whileTap={canStart && isHost ? { scale: 0.95 } : {}}
              title={!isHost ? 'Seul l\'hôte peut démarrer' : ''}
            >
              {!isHost 
                ? '👑 En attente de l\'hôte...'
                : teamAPlayers.length === 0 || teamBPlayers.length === 0
                  ? '1v1 minimum requis'
                  : !allReady
                    ? 'En attente joueurs...'
                    : '🔥 Démarrer la partie'}
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  // Écran de connexion
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-gray-900/90 backdrop-blur-lg rounded-2xl p-8 border border-gray-700"
      >
        <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-yellow-400 bg-clip-text text-transparent">
          RAP BATTLE
        </h1>
        <p className="text-center text-gray-400 mb-8">Le quiz rap multijoueur en temps réel</p>

        {/* Tabs */}
        <div className="flex mb-6 bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'create' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Créer
          </button>
          <button
            onClick={() => setActiveTab('join')}
            className={`flex-1 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'join' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Rejoindre
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Votre nom
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value.slice(0, 20))}
              placeholder="Entrez votre blaze..."
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-white"
            />
          </div>

          {activeTab === 'join' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Code de la room
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 4))}
                placeholder="ABCD"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-white font-mono text-center text-xl tracking-widest"
              />
            </motion.div>
          )}

          <motion.button
            onClick={activeTab === 'create' ? handleCreateRoom : handleJoinRoom}
            disabled={!playerName.trim() || (activeTab === 'join' && roomCode.length !== 4)}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg font-bold text-lg hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {state.connecting ? 'Connexion...' : activeTab === 'create' ? 'Créer une partie' : 'Rejoindre'}
          </motion.button>
        </div>

        {state.error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-center"
          >
            {state.error}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
