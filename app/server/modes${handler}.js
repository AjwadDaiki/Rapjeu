// ============================================
// DevineQuiHandler - À IMPLÉMENTER
// ============================================

const { BaseHandler } = require('./BaseHandler');

class DevineQuiHandler extends BaseHandler {
  async generateQuestion() {
    // TODO: Implémenter
    return { placeholder: 'À implémenter' };
  }

  handleAnswer(socket, player, data) {
    // TODO: Implémenter
  }

  calculateResults() {
    // TODO: Implémenter
    return { winner: null, damage: 0 };
  }
}

module.exports = { DevineQuiHandler };
