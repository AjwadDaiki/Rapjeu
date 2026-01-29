// ============================================
// MONGOOSE MODELS
// ============================================

import mongoose, { Schema, Document } from 'mongoose';

// ============================================
// GAME SESSION (Partie jouée)
// ============================================

export interface IGameSession extends Document {
  roomCode: string;
  startedAt: Date;
  endedAt?: Date;
  teamAPlayers: string[];
  teamBPlayers: string[];
  winner?: 'A' | 'B' | 'draw';
  finalScores: {
    A: number;
    B: number;
  };
  rounds: {
    roundNumber: number;
    mode: string;
    winner?: 'A' | 'B' | null;
    teamADamage: number;
    teamBDamage: number;
  }[];
  modeStats: {
    roland_gamos: { played: number; teamAWins: number; teamBWins: number };
    le_theme: { played: number; teamAWins: number; teamBWins: number };
    mytho_pas_mytho: { played: number; teamAWins: number; teamBWins: number };
    encheres: { played: number; teamAWins: number; teamBWins: number };
    blind_test: { played: number; teamAWins: number; teamBWins: number };
    pixel_cover: { played: number; teamAWins: number; teamBWins: number };
  };
}

const GameSessionSchema = new Schema<IGameSession>({
  roomCode: { type: String, required: true, index: true },
  startedAt: { type: Date, default: Date.now },
  endedAt: Date,
  teamAPlayers: [String],
  teamBPlayers: [String],
  winner: { type: String, enum: ['A', 'B', 'draw'] },
  finalScores: {
    A: { type: Number, default: 0 },
    B: { type: Number, default: 0 },
  },
  rounds: [{
    roundNumber: Number,
    mode: String,
    winner: { type: String, enum: ['A', 'B', null] },
    teamADamage: Number,
    teamBDamage: Number,
  }],
  modeStats: {
    roland_gamos: { played: { type: Number, default: 0 }, teamAWins: { type: Number, default: 0 }, teamBWins: { type: Number, default: 0 } },
    le_theme: { played: { type: Number, default: 0 }, teamAWins: { type: Number, default: 0 }, teamBWins: { type: Number, default: 0 } },
    mytho_pas_mytho: { played: { type: Number, default: 0 }, teamAWins: { type: Number, default: 0 }, teamBWins: { type: Number, default: 0 } },
    encheres: { played: { type: Number, default: 0 }, teamAWins: { type: Number, default: 0 }, teamBWins: { type: Number, default: 0 } },
    blind_test: { played: { type: Number, default: 0 }, teamAWins: { type: Number, default: 0 }, teamBWins: { type: Number, default: 0 } },
    pixel_cover: { played: { type: Number, default: 0 }, teamAWins: { type: Number, default: 0 }, teamBWins: { type: Number, default: 0 } },
  },
});

export const GameSession = mongoose.models.GameSession || mongoose.model<IGameSession>('GameSession', GameSessionSchema);

// ============================================
// PLAYER STATS
// ============================================

export interface IPlayerStats extends Document {
  playerId: string;
  name: string;
  totalGames: number;
  wins: number;
  losses: number;
  favoriteMode?: string;
  bestCombo: number;
  totalCorrectAnswers: number;
  totalWrongAnswers: number;
  accuracy: number;
}

const PlayerStatsSchema = new Schema<IPlayerStats>({
  playerId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  totalGames: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  favoriteMode: String,
  bestCombo: { type: Number, default: 0 },
  totalCorrectAnswers: { type: Number, default: 0 },
  totalWrongAnswers: { type: Number, default: 0 },
  accuracy: { type: Number, default: 0 },
});

export const PlayerStats = mongoose.models.PlayerStats || mongoose.model<IPlayerStats>('PlayerStats', PlayerStatsSchema);

// ============================================
// ACTIVE ROOM (Persistence temporaire des rooms)
// ============================================

export interface IActiveRoom extends Document {
  code: string;
  createdAt: Date;
  expiresAt: Date;
  data: string; // JSON sérialisé de la room
}

const ActiveRoomSchema = new Schema<IActiveRoom>({
  code: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) }, // 24h
  data: { type: String, required: true },
});

// Index TTL pour auto-suppression après expiration
ActiveRoomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ActiveRoom = mongoose.models.ActiveRoom || mongoose.model<IActiveRoom>('ActiveRoom', ActiveRoomSchema);
