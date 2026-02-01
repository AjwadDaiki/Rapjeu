// ============================================
// SERVEUR NEXT.JS + SOCKET.IO
// Gère le jeu multijoueur temps réel
// ============================================

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

// Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Import game logic
const { GameManager } = require('./app/server/GameManager');

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Socket.io server
  const io = new Server(httpServer, {
    cors: {
      origin: dev ? 'http://localhost:3000' : false,
      methods: ['GET', 'POST'],
    },
  });

  // Game manager (gère toutes les rooms)
  const gameManager = new GameManager(io);

  // Socket.io events
  io.on('connection', (socket) => {
    console.log('🔌 Nouvelle connexion:', socket.id);

    // Créer une room
    socket.on('create_room', (data, callback) => {
      console.log('📦 Création room:', data);
      const result = gameManager.createRoom(socket, data);
      callback(result);
    });

    // Rejoindre une room
    socket.on('join_room', (data, callback) => {
      console.log('🚪 Rejoindre room:', data);
      const result = gameManager.joinRoom(socket, data);
      callback(result);
    });

    // Quitter une room
    socket.on('leave_room', () => {
      console.log('👋 Quitter room:', socket.id);
      gameManager.leaveRoom(socket);
    });

    // Changer de team
    socket.on('change_team', (data) => {
      console.log('🔄 Changement team:', data);
      gameManager.changeTeam(socket, data.team);
    });

    // Toggle ready
    socket.on('toggle_ready', () => {
      console.log('✋ Toggle ready:', socket.id);
      gameManager.toggleReady(socket);
    });

    // Mettre à jour la config
    socket.on('update_config', (config) => {
      console.log('⚙️ Mise à jour config:', config);
      gameManager.updateConfig(socket, config);
    });

    // Démarrer la partie
    socket.on('start_game', () => {
      console.log('🎮 Démarrage partie:', socket.id);
      gameManager.startGame(socket);
    });

    // Soumettre une réponse
    socket.on('submit_answer', (data) => {
      console.log('📝 Réponse soumise:', data);
      gameManager.submitAnswer(socket, data);
    });

    // Utiliser un power-up
    socket.on('use_powerup', (data) => {
      console.log('⚡ Power-up utilisé:', data);
      gameManager.usePowerUp(socket, data);
    });

    // Sélectionner un power-up
    socket.on('select_powerup', (data) => {
      console.log('💡 Power-up sélectionné:', data);
      gameManager.selectPowerUp(socket, data);
    });

    // Buzzer (pour Blind Test)
    socket.on('buzz', () => {
      console.log('🔔 Buzz:', socket.id);
      gameManager.handleBuzz(socket);
    });

    // Déconnexion
    socket.on('disconnect', () => {
      console.log('❌ Déconnexion:', socket.id);
      gameManager.handleDisconnect(socket);
    });
  });

  // Démarrer le serveur
  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`✅ Serveur prêt sur http://${hostname}:${port}`);
      console.log(`🎮 Socket.io activé`);
    });
});
