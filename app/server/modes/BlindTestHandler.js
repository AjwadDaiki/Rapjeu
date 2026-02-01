// ============================================
// BLIND TEST HANDLER
// Buzzer + deviner le titre
// ============================================

const { BaseHandler } = require('./BaseHandler');
const { selectBlindTestTrack } = require('../../lib/blindTestSelection');

class BlindTestHandler extends BaseHandler {
  constructor(room) {
    super(room);
    this.buzzedPlayer = null;
    this.usedTrackIds = [];
  }

  async generateQuestion() {
    // Sélectionner une track avec preview
    const track = await selectBlindTestTrack({
      minPopularity: 60,
      excludeTrackIds: this.usedTrackIds,
    });

    this.usedTrackIds.push(track.spotifyId);

    this.currentQuestion = {
      trackId: track.spotifyId,
      previewUrl: track.previewUrl,
      correctTitle: track.title,
      correctArtist: track.artistName,
      albumName: track.albumName,
      year: track.year,
    };

    this.buzzedPlayer = null;

    return {
      previewUrl: track.previewUrl,
      // On ne révèle pas le titre/artiste
    };
  }

  getTimeLimit() {
    return 30000; // 30s pour buzzer
  }

  handleBuzz(socket, player) {
    if (this.buzzedPlayer) return; // Déjà buzzé

    this.buzzedPlayer = player;

    // Broadcast qui a buzzé
    this.room.broadcast('player_buzzed', {
      player: player.name,
      team: player.team,
    });

    // Donner 5s pour répondre
    this.room.broadcast('answer_time', {
      team: player.team,
      timeLimit: 5000,
    });
  }

  handleAnswer(socket, player, data) {
    if (!this.buzzedPlayer || player.id !== this.buzzedPlayer.id) {
      return; // Seul celui qui a buzzé peut répondre
    }

    const { answer } = data;

    // Normaliser et comparer
    const normalizedAnswer = answer.toLowerCase().trim();
    const normalizedTitle = this.currentQuestion.correctTitle.toLowerCase().trim();

    const isCorrect = normalizedAnswer === normalizedTitle ||
                      normalizedTitle.includes(normalizedAnswer) ||
                      normalizedAnswer.includes(normalizedTitle);

    this.buzzedPlayer.answeredCorrectly = isCorrect;

    this.room.broadcast('answer_submitted', {
      team: player.team,
      answer,
      correct: isCorrect,
    });
  }

  calculateResults() {
    let winner = null;
    let damage = 20;

    if (this.buzzedPlayer?.answeredCorrectly) {
      winner = this.buzzedPlayer.team;
    }

    return {
      winner,
      damage,
      correctTitle: this.currentQuestion.correctTitle,
      correctArtist: this.currentQuestion.correctArtist,
      buzzedPlayer: this.buzzedPlayer?.name,
    };
  }

  reset() {
    super.reset();
    this.buzzedPlayer = null;
  }
}

module.exports = { BlindTestHandler };
