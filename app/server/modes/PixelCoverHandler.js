// ============================================
// PIXEL COVER HANDLER
// Pochette d'album floue qui se dévoile
// ============================================

const { BaseHandler } = require('./BaseHandler');
const { MongoClient } = require('mongodb');
const { normalizeName } = require('../../lib/nameValidator');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rapbattle';

class PixelCoverHandler extends BaseHandler {
  constructor(room) {
    super(room);
    this.blurLevel = 100;
    this.answered = false;
    this.winner = null;
  }

  async generateQuestion() {
    const client = await MongoClient.connect(MONGODB_URI);
    const db = client.db();
    const albumsCol = db.collection('albums');

    try {
      // Sélectionner un album avec cover
      const albums = await albumsCol
        .find({ coverUrl: { $ne: null, $exists: true } })
        .toArray();

      // Filtrer albums populaires
      const popularAlbums = albums.filter(a => a.year >= 2010); // Albums récents

      const selected = popularAlbums[Math.floor(Math.random() * popularAlbums.length)];

      this.blurLevel = 100;
      this.answered = false;
      this.winner = null;

      await client.close();

      return {
        albumId: selected.spotifyId,
        coverUrl: selected.coverUrl,
        correctTitle: selected.title,
        correctArtist: selected.artistName,
        year: selected.year,
        blurLevel: this.blurLevel,
      };
    } catch (error) {
      console.error('Erreur PixelCover:', error);
      await client.close();
      throw error;
    }
  }

  getTimeLimit() {
    return 20000; // 20s
  }

  async handleAnswer(socket, player, data) {
    if (this.answered) return;

    const { answer } = data;

    // Normaliser et comparer avec le titre de l'album
    const normalizedAnswer = normalizeName(answer);
    const normalizedTitle = normalizeName(this.currentQuestion.correctTitle);
    const normalizedArtist = normalizeName(this.currentQuestion.correctArtist);

    // Vérifier si le titre OU l'artiste est correct
    const titleMatch = normalizedAnswer === normalizedTitle ||
                       normalizedTitle.includes(normalizedAnswer) ||
                       normalizedAnswer.includes(normalizedTitle);

    const artistMatch = normalizedAnswer === normalizedArtist ||
                        normalizedArtist.includes(normalizedAnswer);

    const isCorrect = titleMatch || artistMatch;

    if (isCorrect) {
      // ✅ Bonne réponse!
      this.answered = true;
      this.winner = player.team;

      // Broadcast succès
      this.room.broadcast('answer_correct', {
        team: player.team,
        answer: this.currentQuestion.correctTitle,
        artist: this.currentQuestion.correctArtist,
        blurLevel: this.blurLevel,
      });

      // Terminer le round immédiatement
      this.room.gameState.stopTimer();
      this.room.gameState.setState('round_end');
    } else {
      // ❌ Mauvaise réponse
      this.room.emitTo(socket.id, 'answer_wrong', {
        reason: 'Mauvaise réponse',
      });
    }
  }

  // Appelé toutes les 250ms par le timer
  onTimerTick(timeLeft, totalTime) {
    // Réduire le blur progressivement
    const progress = 1 - (timeLeft / totalTime);
    this.blurLevel = Math.max(0, 100 - (progress * 100));

    // Broadcast update du blur
    this.room.broadcast('blur_update', {
      blurLevel: Math.round(this.blurLevel),
    });
  }

  onTimeOut() {
    // Temps écoulé sans bonne réponse
    this.room.broadcast('timeout', {
      message: 'Temps écoulé!',
      correctTitle: this.currentQuestion.correctTitle,
      correctArtist: this.currentQuestion.correctArtist,
    });
  }

  calculateResults() {
    if (!this.winner) {
      // Personne n'a trouvé
      return { winner: null, damage: 0 };
    }

    // Scoring basé sur le temps restant (blur level)
    // Plus c'est trouvé tôt (blur élevé), plus les points
    const damage = Math.round(this.blurLevel / 100 * 30); // Max 30 HP

    return {
      winner: this.winner,
      damage,
      blurLevel: this.blurLevel,
      correctTitle: this.currentQuestion.correctTitle,
      correctArtist: this.currentQuestion.correctArtist,
    };
  }

  reset() {
    super.reset();
    this.blurLevel = 100;
    this.answered = false;
    this.winner = null;
  }
}

module.exports = { PixelCoverHandler };
