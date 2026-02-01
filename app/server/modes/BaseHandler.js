// ============================================
// BASE HANDLER - Classe de base pour tous les modes
// ============================================

class BaseHandler {
  constructor(room) {
    this.room = room;
    this.currentQuestion = null;
    this.roundData = {};
  }

  /**
   * Génère une question pour le mode
   * À implémenter par chaque mode
   */
  async generateQuestion() {
    throw new Error('generateQuestion() doit être implémenté');
  }

  /**
   * Temps limite pour ce mode (en ms)
   */
  getTimeLimit() {
    return 15000; // 15s par défaut
  }

  /**
   * Gère une réponse d'un joueur
   */
  handleAnswer(socket, player, data) {
    throw new Error('handleAnswer() doit être implémenté');
  }

  /**
   * Appelé quand le temps est écoulé
   */
  onTimeOut() {
    // Par défaut, rien
  }

  /**
   * Calcule les résultats du round
   */
  calculateResults() {
    throw new Error('calculateResults() doit être implémenté');
  }

  /**
   * Reset pour le prochain round
   */
  reset() {
    this.currentQuestion = null;
    this.roundData = {};
  }
}

module.exports = { BaseHandler };
