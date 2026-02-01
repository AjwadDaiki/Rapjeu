// ============================================
// MYTHO / PAS MYTHO HANDLER
// Vrai ou Faux sur des anecdotes
// ============================================

const { BaseHandler } = require('./BaseHandler');
const fs = require('fs');
const path = require('path');

class MythoPasMythoHandler extends BaseHandler {
  constructor(room) {
    super(room);
    this.teamAnswers = { A: null, B: null };
  }

  async generateQuestion() {
    // Charger les anecdotes
    const anecdotesPath = path.join(__dirname, '../../data/mytho-anecdotes.json');
    const anecdotes = JSON.parse(fs.readFileSync(anecdotesPath, 'utf8'));

    // Sélectionner une anecdote aléatoire
    const anecdote = anecdotes[Math.floor(Math.random() * anecdotes.length)];

    this.currentQuestion = {
      text: anecdote.text,
      isTrue: anecdote.isTrue,
      source: anecdote.source,
    };

    this.teamAnswers = { A: null, B: null };

    return {
      text: anecdote.text,
      // On ne révèle pas isTrue avant la fin
    };
  }

  getTimeLimit() {
    return 10000; // 10s
  }

  handleAnswer(socket, player, data) {
    const { answer } = data; // true ou false

    // Enregistrer la réponse de la team
    this.teamAnswers[player.team] = answer;

    // Broadcast que la team a répondu
    this.room.broadcast('team_answered', {
      team: player.team,
    });
  }

  calculateResults() {
    const correctAnswer = this.currentQuestion.isTrue;

    const teamACorrect = this.teamAnswers.A === correctAnswer;
    const teamBCorrect = this.teamAnswers.B === correctAnswer;

    let winner = null;
    let damage = 15; // Dégâts fixes

    if (teamACorrect && !teamBCorrect) {
      winner = 'A';
    } else if (teamBCorrect && !teamACorrect) {
      winner = 'B';
    }

    return {
      winner,
      damage,
      correctAnswer,
      teamAnswers: this.teamAnswers,
      source: this.currentQuestion.source,
    };
  }

  reset() {
    super.reset();
    this.teamAnswers = { A: null, B: null };
  }
}

module.exports = { MythoPasMythoHandler };
