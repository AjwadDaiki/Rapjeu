// ============================================
// DEVINE QUI HANDLER
// 5 indices Wordle-style
// ============================================

const { BaseHandler } = require('./BaseHandler');
const { MongoClient } = require('mongodb');
const { findArtistByName } = require('../../lib/nameValidator');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rapbattle';

class DevineQuiHandler extends BaseHandler {
  constructor(room) {
    super(room);
    this.attempts = [];
    this.maxAttempts = 5;
    this.currentTurn = 'A';
    this.foundBy = null;
  }

  async generateQuestion() {
    const client = await MongoClient.connect(MONGODB_URI);
    const db = client.db();
    const artistsCol = db.collection('artists');

    try {
      // Sélectionner un artiste populaire AVEC localisation
      const artists = await artistsCol
        .find({
          isTopArtist: true,
          'location.department': { $exists: true, $ne: null },
          firstReleaseYear: { $ne: null },
          totalAlbums: { $gte: 1 },
        })
        .toArray();

      if (artists.length === 0) {
        throw new Error('Aucun artiste valide pour Devine Qui');
      }

      const selected = artists[Math.floor(Math.random() * artists.length)];

      this.attempts = [];
      this.currentTurn = 'A';
      this.foundBy = null;

      await client.close();

      return {
        targetArtist: {
          spotifyId: selected.spotifyId,
          name: selected.name,
          imageUrl: selected.imageUrl,
          clues: {
            albums: selected.totalAlbums,
            streams: Math.floor(selected.monthlyListeners / 1000000), // En millions
            letters: selected.name.length,
            yearDebut: selected.firstReleaseYear,
            origin: selected.location.department || selected.location.city || selected.location.country,
          }
        },
        maxAttempts: this.maxAttempts,
        attempts: [],
      };
    } catch (error) {
      console.error('Erreur DevineQui:', error);
      await client.close();
      throw error;
    }
  }

  getTimeLimit() {
    return 20000; // 20s par tentative
  }

  async handleAnswer(socket, player, data) {
    // Vérifier que c'est le tour de cette team
    if (player.team !== this.currentTurn) {
      this.room.emitTo(socket.id, 'error', { message: 'Pas votre tour!' });
      return;
    }

    // Vérifier limite de tentatives
    if (this.attempts.length >= this.maxAttempts) {
      return;
    }

    const { answer } = data;

    const client = await MongoClient.connect(MONGODB_URI);
    const db = client.db();
    const artistsCol = db.collection('artists');

    try {
      // Chercher l'artiste deviné
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
      const targetArtist = this.currentQuestion.targetArtist;

      // Comparer chaque indice
      const cluesStatus = {
        albums: this.compareValue(guessedArtist.totalAlbums, targetArtist.clues.albums),
        streams: this.compareValue(
          Math.floor(guessedArtist.monthlyListeners / 1000000),
          targetArtist.clues.streams
        ),
        letters: this.compareValue(guessedArtist.name.length, targetArtist.clues.letters),
        yearDebut: this.compareValue(guessedArtist.firstReleaseYear, targetArtist.clues.yearDebut),
        origin: this.compareOrigin(guessedArtist.location, targetArtist.clues.origin),
      };

      // Créer l'attempt
      const attempt = {
        artistName: guessedArtist.name,
        artistImage: guessedArtist.imageUrl,
        cluesStatus,
        actualValues: {
          albums: guessedArtist.totalAlbums,
          streams: Math.floor(guessedArtist.monthlyListeners / 1000000),
          letters: guessedArtist.name.length,
          yearDebut: guessedArtist.firstReleaseYear,
          origin: guessedArtist.location?.department || guessedArtist.location?.city || '?',
        }
      };

      this.attempts.push(attempt);

      // Vérifier si correct
      const isCorrect = guessedArtist.spotifyId === targetArtist.spotifyId;

      if (isCorrect) {
        // ✅ Trouvé!
        this.foundBy = player.team;

        this.room.broadcast('answer_correct', {
          team: player.team,
          attempt,
          found: true,
          targetArtist: targetArtist.name,
        });

        // Terminer le round
        this.room.gameState.stopTimer();
        this.room.gameState.setState('round_end');

      } else {
        // ❌ Pas encore trouvé
        this.room.broadcast('attempt_added', {
          team: player.team,
          attempt,
          attemptsLeft: this.maxAttempts - this.attempts.length,
        });

        // Changer de tour
        this.currentTurn = this.currentTurn === 'A' ? 'B' : 'A';
      }

      await client.close();

    } catch (error) {
      console.error('Erreur DevineQui handleAnswer:', error);
      await client.close();
      this.room.emitTo(socket.id, 'error', { message: 'Erreur serveur' });
    }
  }

  compareValue(guess, target) {
    if (guess === target) return 'correct';
    if (Math.abs(guess - target) <= 2) return 'close'; // ±2 tolérance
    return 'wrong';
  }

  compareOrigin(guessLocation, targetOrigin) {
    const guessOrigin = guessLocation?.department || guessLocation?.city || guessLocation?.country || '';

    if (guessOrigin === targetOrigin) return 'correct';

    // Vérifier si même pays
    if (guessLocation?.country === 'FR' && targetOrigin.length === 2) {
      // Même département? (close)
      if (guessLocation?.department && guessLocation.department === targetOrigin) {
        return 'correct';
      }
    }

    return 'wrong';
  }

  onTimeOut() {
    // Temps écoulé, passer au tour suivant
    this.currentTurn = this.currentTurn === 'A' ? 'B' : 'A';

    this.room.broadcast('timeout', {
      team: this.currentTurn === 'A' ? 'B' : 'A',
      message: 'Temps écoulé! Tour suivant',
    });
  }

  calculateResults() {
    if (!this.foundBy) {
      // Personne n'a trouvé - égalité ou petits dégâts
      return {
        winner: null,
        damage: 10,
        targetArtist: this.currentQuestion.targetArtist.name,
        attempts: this.attempts.length,
      };
    }

    // Scoring basé sur le nombre de tentatives
    let damage = 30; // 1ère tentative
    if (this.attempts.length === 2) damage = 20;
    else if (this.attempts.length >= 3) damage = 15;

    return {
      winner: this.foundBy,
      damage,
      targetArtist: this.currentQuestion.targetArtist.name,
      attempts: this.attempts.length,
      allAttempts: this.attempts.map(a => a.artistName),
    };
  }

  reset() {
    super.reset();
    this.attempts = [];
    this.currentTurn = 'A';
    this.foundBy = null;
  }
}

module.exports = { DevineQuiHandler };
