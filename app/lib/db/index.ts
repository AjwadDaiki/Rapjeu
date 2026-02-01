// @ts-nocheck
// ============================================
// EXPORTS DATABASE
// ============================================

export { connectDB, isDBConnected } from './config';
export { GameSession, PlayerStats, ActiveRoom } from './models';
export type { IGameSession, IPlayerStats, IActiveRoom } from './models';

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

import { GameSession, PlayerStats, ActiveRoom } from './models';
import { SerializedRoom, RoundResult, Team } from '../../types';

export async function saveGameSession(
  room: SerializedRoom,
  winner: Team | 'draw'
): Promise<void> {
  try {
    const teamAPlayers = room.players.filter(p => p.team === 'A').map(p => p.name);
    const teamBPlayers = room.players.filter(p => p.team === 'B').map(p => p.name);

    const modeStats = {
      roland_gamos: { played: 0, teamAWins: 0, teamBWins: 0 },
      le_theme: { played: 0, teamAWins: 0, teamBWins: 0 },
      mytho_pas_mytho: { played: 0, teamAWins: 0, teamBWins: 0 },
      encheres: { played: 0, teamAWins: 0, teamBWins: 0 },
      blind_test: { played: 0, teamAWins: 0, teamBWins: 0 },
      pixel_cover: { played: 0, teamAWins: 0, teamBWins: 0 },
    };

    // Calculer les stats par mode
    room.gameState.roundResults.forEach((round: RoundResult) => {
      const mode = round.mode;
      if (modeStats[mode]) {
        modeStats[mode].played++;
        if (round.winner === 'A') modeStats[mode].teamAWins++;
        if (round.winner === 'B') modeStats[mode].teamBWins++;
      }
    });

    await GameSession.create({
      roomCode: room.code,
      startedAt: new Date(Date.now() - room.gameState.roundResults.length * 5 * 60 * 1000), // Approximation
      endedAt: new Date(),
      teamAPlayers,
      teamBPlayers,
      winner: winner === null ? 'draw' : winner,
      finalScores: {
        A: room.teamA.score,
        B: room.teamB.score,
      },
      rounds: room.gameState.roundResults.map((r: RoundResult) => ({
        roundNumber: r.roundNumber,
        mode: r.mode,
        winner: r.winner,
        teamADamage: r.teamADamage,
        teamBDamage: r.teamBDamage,
      })),
      modeStats,
    });

    console.log(`📝 Game session saved: ${room.code}`);
  } catch (error) {
    console.error('Failed to save game session:', error);
  }
}

export async function updatePlayerStats(
  playerId: string,
  playerName: string,
  team: Team,
  winner: Team | null,
  correctAnswers: number,
  wrongAnswers: number,
  bestCombo: number
): Promise<void> {
  try {
    const stats = await PlayerStats.findOne({ playerId });
    
    if (stats) {
      stats.totalGames++;
      if (winner === team) stats.wins++;
      else if (winner !== null) stats.losses++;
      stats.totalCorrectAnswers += correctAnswers;
      stats.totalWrongAnswers += wrongAnswers;
      if (bestCombo > stats.bestCombo) stats.bestCombo = bestCombo;
      
      const total = stats.totalCorrectAnswers + stats.totalWrongAnswers;
      stats.accuracy = total > 0 ? stats.totalCorrectAnswers / total : 0;
      
      await stats.save();
    } else {
      await PlayerStats.create({
        playerId,
        name: playerName,
        totalGames: 1,
        wins: winner === team ? 1 : 0,
        losses: winner !== null && winner !== team ? 1 : 0,
        totalCorrectAnswers: correctAnswers,
        totalWrongAnswers: wrongAnswers,
        accuracy: correctAnswers + wrongAnswers > 0 ? correctAnswers / (correctAnswers + wrongAnswers) : 0,
        bestCombo,
      });
    }
  } catch (error) {
    console.error('Failed to update player stats:', error);
  }
}

export async function getLeaderboard(limit = 10): Promise<Array<{
  playerId: string;
  name: string;
  totalGames: number;
  wins: number;
  accuracy: number;
}>> {
  try {
    const players = await PlayerStats.find()
      .sort({ wins: -1, accuracy: -1 })
      .limit(limit)
      .lean();

    return players.map(p => ({
      playerId: p.playerId,
      name: p.name,
      totalGames: p.totalGames,
      wins: p.wins,
      accuracy: Math.round(p.accuracy * 100),
    }));
  } catch (error) {
    console.error('Failed to get leaderboard:', error);
    return [];
  }
}
