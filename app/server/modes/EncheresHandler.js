// ============================================
// ENCHÈRES HANDLER
// Miser puis prouver
// ============================================

const { BaseHandler } = require('./BaseHandler');
const { selectRandomTheme } = require('../../lib/themes');
const { validateAnswer, getArtistsForTheme } = require('../../lib/themeQueries');

class EncheresHandler extends BaseHandler {
  constructor(room) {
    super(room);
    this.phase = 'betting'; // 'betting', 'proving'
    this.bets = { A: 0, B: 0 };
    this.proofs = [];
    this.highestBidder = null;
    this.theme = null;
  }

  async generateQuestion() {
    // Phase 1: Révéler le thème
    this.theme = selectRandomTheme('medium');
    const validArtists = await getArtistsForTheme(this.theme);

    this.phase = 'betting';
    this.bets = { A: 0, B: 0 };
    this.proofs = [];
    this.highestBidder = null;

    return {
      phase: 'betting',
      themeId: this.theme.id,
      themeTitle: this.theme.title,
      themeDescription: this.theme.description,
      totalPossible: validArtists.length,
    };
  }

  getTimeLimit() {
    if (this.phase === 'betting') {
      return 10000; // 10s pour miser
    } else {
      return this.room.room.config.encheresTime * 1000 || 45000; // 45s pour prouver
    }
  }

  handleBet(socket, player, bet) {
    if (this.phase !== 'betting') return;

    this.bets[player.team] = bet;

    // Broadcast que la team a misé (sans révéler le montant)
    this.room.broadcast('team_bet', { team: player.team });
  }

  onBettingPhaseEnd() {
    // Déterminer le plus offrant
    if (this.bets.A > this.bets.B) {
      this.highestBidder = 'A';
    } else if (this.bets.B > this.bets.A) {
      this.highestBidder = 'B';
    } else {
      // Égalité: choisir aléatoirement
      this.highestBidder = Math.random() > 0.5 ? 'A' : 'B';
    }

    // Révéler les mises
    this.room.broadcast('bets_revealed', {
      bets: this.bets,
      highestBidder: this.highestBidder,
      targetCount: this.bets[this.highestBidder],
    });

    // Passer en phase de preuve
    this.phase = 'proving';

    // Redémarrer le timer
    this.room.gameState.startTimer(this.getTimeLimit());
  }

  async handleAnswer(socket, player, data) {
    if (this.phase !== 'proving') return;

    // Seul le plus offrant peut répondre
    if (player.team !== this.highestBidder) return;

    const { answer } = data;

    // Valider comme Le Thème
    const result = await validateAnswer(
      this.theme,
      answer,
      this.proofs.map(p => p.answer)
    );

    if (result.valid) {
      this.proofs.push({
        answer: result.normalizedName,
        artist: result.artist,
      });

      // Broadcast succès
      this.room.broadcast('proof_added', {
        answer: result.normalizedName,
        count: this.proofs.length,
        target: this.bets[this.highestBidder],
      });

      // Vérifier si objectif atteint
      if (this.proofs.length >= this.bets[this.highestBidder]) {
        // Objectif atteint! Passer au round_end
        this.room.gameState.stopTimer();
        this.room.gameState.setState('round_end');
      }
    } else {
      // Mauvaise réponse
      this.room.emitTo(socket.id, 'answer_wrong', {
        reason: result.reason,
        suggestion: result.suggestion,
      });
    }
  }

  onTimeOut() {
    // Temps écoulé pendant la phase de preuve
    if (this.phase === 'betting') {
      this.onBettingPhaseEnd();
    }
  }

  calculateResults() {
    const target = this.bets[this.highestBidder];
    const achieved = this.proofs.length;

    let winner = null;
    let damage = 25; // Dégâts de base

    if (achieved >= target) {
      // Preuve réussie
      winner = this.highestBidder;
      damage = target * 5; // 5 HP par artiste
    } else {
      // Échec
      winner = this.highestBidder === 'A' ? 'B' : 'A';
      damage = (target - achieved) * 10; // Pénalité
    }

    return {
      winner,
      damage,
      highestBidder: this.highestBidder,
      bets: this.bets,
      target,
      achieved,
      proofs: this.proofs.map(p => p.answer),
    };
  }

  reset() {
    super.reset();
    this.phase = 'betting';
    this.bets = { A: 0, B: 0 };
    this.proofs = [];
    this.highestBidder = null;
    this.theme = null;
  }
}

module.exports = { EncheresHandler };
