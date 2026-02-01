// ============================================
// ROLAND GAMOS HANDLER
// Chaîne de featurings
// ============================================

const { BaseHandler } = require('./BaseHandler');
const { selectRandomArtistWeighted } = require('../../lib/artistSelection');
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rapbattle';

class RolandGamosHandler extends BaseHandler {
  constructor(room) {
    super(room);
    this.currentArtist = null;
    this.chain = [];
    this.currentTurn = 'A';
    this.usedArtistIds = new Set();
  }

  async generateQuestion() {
    // Sélectionner un artiste de départ (populaire)
    const startArtist = await selectRandomArtistWeighted();

    this.currentArtist = startArtist;
    this.chain = [startArtist];
    this.usedArtistIds.clear();
    this.usedArtistIds.add(startArtist.spotifyId);
    this.currentTurn = 'A';

    return {
      currentArtist: {
        name: startArtist.name,
        spotifyId: startArtist.spotifyId,
        imageUrl: startArtist.imageUrl,
      },
      chain: this.chain.map(a => a.name),
    };
  }

  getTimeLimit() {
    return 15000; // 15s par tour
  }

  async handleAnswer(socket, player, data) {
    // Vérifier que c'est le tour de cette team
    if (player.team !== this.currentTurn) {
      this.room.emitTo(socket.id, 'error', { message: 'Pas votre tour!' });
      return;
    }

    const { answer } = data;

    // Chercher l'artiste dans la BDD avec normalisation
    const client = await MongoClient.connect(MONGODB_URI);
    const db = client.db();
    const artistsCol = db.collection('artists');

    try {
      const { findArtistByName } = require('../../lib/nameValidator');
      const allArtists = await artistsCol.find({}).toArray();
      const result = findArtistByName(answer, allArtists);

      if (!result.found) {
        this.room.emitTo(socket.id, 'answer_wrong', {
          reason: 'Artiste introuvable',
        });
        await client.close();
        return;
      }

      const guessedArtist = result.artist;

      // Vérifier si déjà utilisé
      if (this.usedArtistIds.has(guessedArtist.spotifyId)) {
        this.room.emitTo(socket.id, 'answer_wrong', {
          reason: 'Artiste déjà utilisé dans la chaîne',
        });
        await client.close();
        return;
      }

      // Vérifier s'il y a une collaboration
      const collabsCol = db.collection('collaborations');
      const collab = await collabsCol.findOne({
        $or: [
          { artistAId: this.currentArtist.spotifyId, artistBId: guessedArtist.spotifyId },
          { artistAId: guessedArtist.spotifyId, artistBId: this.currentArtist.spotifyId },
        ]
      });

      if (!collab) {
        this.room.emitTo(socket.id, 'answer_wrong', {
          reason: `${guessedArtist.name} n'a pas de featuring avec ${this.currentArtist.name}`,
        });
        await client.close();
        return;
      }

      // ✅ Bonne réponse!
      this.currentArtist = guessedArtist;
      this.chain.push(guessedArtist);
      this.usedArtistIds.add(guessedArtist.spotifyId);

      // Broadcast succès
      this.room.broadcast('answer_correct', {
        team: player.team,
        artist: {
          name: guessedArtist.name,
          imageUrl: guessedArtist.imageUrl,
        },
        trackTitle: collab.trackTitle,
        chain: this.chain.map(a => a.name),
      });

      // Changer de tour
      this.currentTurn = this.currentTurn === 'A' ? 'B' : 'A';

      await client.close();

    } catch (error) {
      console.error('Erreur RolandGamos:', error);
      this.room.emitTo(socket.id, 'error', { message: 'Erreur serveur' });
      await client.close();
    }
  }

  calculateResults() {
    // Compter la longueur de la chaîne par team
    const teamALength = this.chain.filter((_, i) => i % 2 === 0).length;
    const teamBLength = this.chain.filter((_, i) => i % 2 === 1).length;

    let winner = null;
    let damage = 0;

    if (teamALength > teamBLength) {
      winner = 'A';
      damage = (teamALength - teamBLength) * 10;
    } else if (teamBLength > teamALength) {
      winner = 'B';
      damage = (teamBLength - teamALength) * 10;
    }

    return {
      winner,
      damage,
      teamALength,
      teamBLength,
      chain: this.chain.map(a => a.name),
    };
  }

  reset() {
    super.reset();
    this.currentArtist = null;
    this.chain = [];
    this.usedArtistIds.clear();
    this.currentTurn = 'A';
  }
}

module.exports = { RolandGamosHandler };
