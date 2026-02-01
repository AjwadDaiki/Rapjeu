'use client';

// ============================================
// TEAM SLOT - Emplacement d'équipe avec drag & drop
// ============================================

import { motion } from 'framer-motion';
import type { Player, Team } from '../types';
import { getTeamColor } from '../lib/utils';

interface TeamSlotProps {
  team: Team | null;
  players: Player[];
  maxPlayers?: number;
  isHost: boolean;
  currentPlayerId: string;
  label?: string;
  onMovePlayer: (playerId: string, team: Team | null) => void;
  onKickPlayer?: (playerId: string) => void;
}

export function TeamSlot({ 
  team, 
  players, 
  maxPlayers = 4, 
  isHost, 
  currentPlayerId,
  label,
  onMovePlayer,
}: TeamSlotProps) {
  const isFull = players.length >= maxPlayers;
  const teamColor = team ? getTeamColor(team) : '#6B7280';
  const teamName = team === 'A'
    ? (label || 'ÉQUIPE A')
    : team === 'B'
      ? (label || 'ÉQUIPE B')
      : 'SPECTATEURS';

  return (
    <div 
      className={`relative p-5 rounded-2xl border hud-panel ${
        team === 'A' ? 'team-panel-a' :
        team === 'B' ? 'team-panel-b' :
        'team-panel-neutral'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl md:text-2xl font-display font-extrabold uppercase tracking-[0.22em] leading-none" style={{ color: teamColor }}>
          {teamName}
        </h3>
        <span className="chip text-gray-200">
          {players.length}/{maxPlayers}
        </span>
      </div>

      {/* Slots */}
      <div className="space-y-2">
        {Array.from({ length: maxPlayers }).map((_, index) => {
          const player = players[index];
          
          return (
            <motion.div
              key={player?.id || `empty-${index}`}
              className={`relative h-12 rounded-xl border flex items-center px-4 ${
                player 
                  ? 'slot-panel cursor-pointer' 
                  : 'border-dashed border-white/10 bg-black/20'
              } ${isFull && !player ? 'opacity-50' : ''}`}
              onClick={() => {
                // Permettre à un joueur de cliquer sur un slot vide pour rejoindre
                if (!player && !isFull && currentPlayerId) {
                  onMovePlayer(currentPlayerId, team);
                }
              }}
              whileHover={player ? { scale: 1.02 } : {}}
              whileTap={player ? { scale: 0.98 } : {}}
            >
              {player ? (
                <>
                  {/* Avatar placeholder */}
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3 shadow-lg"
                    style={{ backgroundColor: teamColor }}
                  >
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  
                  {/* Name */}
                  <span className="font-medium flex-1 truncate">
                    {player.name}
                    {player.id === currentPlayerId && (
                      <span className="text-xs text-gray-400 ml-2">(Vous)</span>
                    )}
                    {player.role === 'host' && (
                      <span className="text-xs ml-2" style={{ color: 'var(--rj-accent)' }}>👑 Host</span>
                    )}
                  </span>

                  {/* Ready indicator */}
                  {player.isReady && (
                    <motion.span 
                      className="text-green-400 text-xl drop-shadow"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    >
                      ✓
                    </motion.span>
                  )}

                  {/* Move buttons for host */}
                  {isHost && player.id !== currentPlayerId && (
                    <div className="flex gap-1 ml-2">
                      {team !== 'A' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMovePlayer(player.id, 'A');
                          }}
                          className="w-6 h-6 rounded text-xs text-[#0f1115]" style={{ background: 'var(--rj-secondary)' }}
                        >
                          A
                        </button>
                      )}
                      {team !== 'B' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMovePlayer(player.id, 'B');
                          }}
                          className="w-6 h-6 rounded text-xs text-[#0f1115]" style={{ background: 'var(--rj-primary)' }}
                        >
                          B
                        </button>
                      )}
                      {team !== null && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMovePlayer(player.id, null);
                          }}
                          className="w-6 h-6 rounded bg-white/10 text-xs hover:bg-white/20"
                        >
                          S
                        </button>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <span className="text-gray-600 text-sm w-full text-center">
                  {isFull ? 'Plein' : 'Libre'}
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
