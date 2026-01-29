'use client';

// ============================================
// DISPUTE MODAL - Système de litige (Veto)
// ============================================

import { motion, AnimatePresence } from 'framer-motion';
import { useGameContext } from '../hooks/useGameContext';
import { useSocket } from '../hooks/useSocket';

export function DisputeModal() {
  const { showDisputeModal, currentDispute, hideDispute } = useGameContext();
  const { currentPlayer, voteDispute } = useSocket();

  if (!showDisputeModal || !currentDispute) return null;

  const isVotingTeam = currentPlayer?.team === currentDispute.votingTeam;
  const proposingTeamName = currentDispute.proposingTeam === 'A' ? 'Équipe A' : 'Équipe B';
  const votingTeamName = currentDispute.votingTeam === 'A' ? 'Équipe A' : 'Équipe B';

  const handleVote = (accept: boolean) => {
    voteDispute(accept);
    hideDispute();
  };

  return (
    <AnimatePresence>
      {showDisputeModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={hideDispute}
        >
          <motion.div
            initial={{ scale: 0.5, y: 100 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.5, y: 100 }}
            className="relative w-full max-w-lg p-8 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border-2 border-yellow-500 shadow-2xl shadow-yellow-500/20"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="inline-block px-6 py-2 bg-yellow-500 rounded-full text-black font-bold text-lg mb-4"
              >
                ⚠️ LITIGE !
              </motion.div>
              <h2 className="text-2xl font-bold text-white">
                La {proposingTeamName} conteste une réponse
              </h2>
            </div>

            {/* Answer in dispute */}
            <div className="bg-gray-800 rounded-xl p-6 mb-6 text-center">
              <p className="text-gray-400 text-sm mb-2">Réponse proposée:</p>
              <p className="text-3xl font-bold text-yellow-400">
                &quot;{currentDispute.answer.value}&quot;
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Similarité: {Math.round(currentDispute.answer.similarityScore * 100)}%
              </p>
            </div>

            {/* Voting section */}
            {isVotingTeam ? (
              <div className="space-y-4">
                <p className="text-center text-gray-300">
                  {votingTeamName}, acceptez-vous cette réponse ?
                </p>
                <div className="flex gap-4">
                  <motion.button
                    onClick={() => handleVote(true)}
                    className="flex-1 py-4 bg-green-600 rounded-xl font-bold text-lg hover:bg-green-500 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    ✅ OUI
                  </motion.button>
                  <motion.button
                    onClick={() => handleVote(false)}
                    className="flex-1 py-4 bg-red-600 rounded-xl font-bold text-lg hover:bg-red-500 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    ❌ NON
                  </motion.button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-gray-400">
                  En attente du vote de la {votingTeamName}...
                </p>
                <motion.div
                  className="mt-4 w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full mx-auto"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
              </div>
            )}

            {/* Close button for non-participants */}
            {!isVotingTeam && currentPlayer?.team !== currentDispute.proposingTeam && (
              <button
                onClick={hideDispute}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-500 hover:text-white"
              >
                ✕
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
