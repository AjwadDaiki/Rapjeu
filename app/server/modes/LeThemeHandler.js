// ============================================
// LE THÈME HANDLER
// Tour par tour, nommer des artistes d'un thème
// ============================================

const { BaseHandler } = require('./BaseHandler');
const { selectRandomTheme } = require('../../lib/themes');
const { validateAnswer } = require('../../lib/themeQueries');

class LeThemeHandler extends BaseHandler {
  constructor(room) {
    super(room);
    this.usedAnswers = [];
    this.currentTurn = 'A';
    this.consecutiveFails = 0;
  }

  async generateQuestion() {
    // Sélectionner un thème aléatoire
    const theme = selectRandomTheme('medium');

    this.currentQuestion = {
      themeId: theme.id,
      themeTitle: theme.title,
      themeDescription: theme.description,
      difficulty: theme.difficulty,
    };

    this.usedAnswers = [];
    this.currentTurn = 'A';
    this.consecutiveFails = 0;

    return this.currentQuestion;
  }

  getTimeLimit() {
    return this.room.room.config.challengeTime * 1000 || 10000;
  }

  async handleAnswer(socket, player, data) {
    // Vérifier que c'est le tour de cette team
    if (player.team !== this.currentTurn) {
      this.room.emitTo(socket.id, 'error', { message: 'Pas votre tour!' });
      return;
    }

    const { answer } = data;

    // Valider la réponse
    const theme = { id: this.currentQuestion.themeId };
    const result = await validateAnswer(theme, answer, this.usedAnswers);

    if (result.valid) {
      // ✅ Bonne réponse
      this.usedAnswers.push(result.normalizedName);
      this.consecutiveFails = 0;

      // Broadcast succès
      this.room.broadcast('answer_correct', {
        team: player.team,
        answer: result.normalizedName,
        artist: result.artist,
        matchType: result.matchType,
      });

      // Changer de tour
      this.currentTurn = this.currentTurn === 'A' ? 'B' : 'A';

    } else {
      // ❌ Mauvaise réponse
      this.consecutiveFails++;

      // Broadcast échec
      this.room.emitTo(socket.id, 'answer_wrong', {
        reason: result.reason,
        suggestion: result.suggestion,
      });

      // Si 2 échecs consécutifs de la même team, passer son tour
      if (this.consecutiveFails >= 2) {
        this.consecutiveFails = 0;
        this.currentTurn = this.currentTurn === 'A' ? 'B' : 'A';

        this.room.broadcast('turn_skipped', {
          team: player.team,
          reason: '2 réponses invalides',
        });
      }
    }
  }

  onTimeOut() {
    // La team qui jouait perd son tour
    this.room.broadcast('timeout', {
      team: this.currentTurn,
      message: 'Temps écoulé!',
    });
  }

  calculateResults() {
    // La team avec le plus de bonnes réponses gagne
    const teamAAnswers = this.usedAnswers.filter((_, i) => i % 2 === 0).length;
    const teamBAnswers = this.usedAnswers.filter((_, i) => i % 2 === 1).length;

    let winner = null;
    let damage = 0;

    if (teamAAnswers > teamBAnswers) {
      winner = 'A';
      damage = (teamAAnswers - teamBAnswers) * 5; // 5 HP par réponse
    } else if (teamBAnswers > teamAAnswers) {
      winner = 'B';
      damage = (teamBAnswers - teamAAnswers) * 5;
    }

    return {
      winner,
      damage,
      teamAAnswers,
      teamBAnswers,
      usedAnswers: this.usedAnswers,
    };
  }

  reset() {
    super.reset();
    this.usedAnswers = [];
    this.currentTurn = 'A';
    this.consecutiveFails = 0;
  }
}

module.exports = { LeThemeHandler };
