'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface EncheresUIProps {
  roundData: any;
  currentPlayer: any;
  teamHP: { A: number; B: number };
  combos: { A: number; B: number };
  onSubmitAnswer: (answer: string) => void;
}

export function EncheresUI({ roundData, currentPlayer, teamHP, combos, onSubmitAnswer }: EncheresUIProps) {
  const [bet, setBet] = useState('');
  const [answer, setAnswer] = useState('');

  const handleBetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bet) {
      onSubmitAnswer(`bet:${bet}`);
      setBet('');
    }
  };

  const handleAnswerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answer.trim()) {
      onSubmitAnswer(answer.trim());
      setAnswer('');
    }
  };

  const phase = roundData?.phase || 'betting';
  const isBetting = phase === 'betting';
  const isProving = phase === 'proving';
  const canProve = isProving && roundData?.highestBidder === currentPlayer?.team;

  return (
    <div className="rj-container" style={{ padding: '40px', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="rj-card"
        style={{ maxWidth: '800px', width: '100%' }}
      >
        <div className="rj-card-header" style={{ textAlign: 'center' }}>
          <h2 className="rj-card-title" style={{ fontSize: '32px' }}>
            💰 Les Enchères
          </h2>
          <p className="rj-card-description" style={{ fontSize: '20px', fontWeight: '600', color: 'var(--rj-primary)', marginTop: '16px' }}>
            {roundData?.themeTitle || 'Chargement...'}
          </p>
        </div>

        {/* Betting Phase */}
        {isBetting && (
          <div style={{ padding: '24px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div className="rj-text-sm" style={{ color: 'var(--rj-text-muted)' }}>
                Combien de rappeurs peux-tu nommer?
              </div>
              <div className="rj-text" style={{ fontSize: '18px', marginTop: '8px' }}>
                Total possible: {roundData?.totalPossible || '???'}
              </div>
            </div>

            <form onSubmit={handleBetSubmit}>
              <input
                type="number"
                min="1"
                max={roundData?.totalPossible || 100}
                value={bet}
                onChange={(e) => setBet(e.target.value)}
                placeholder="Ta mise..."
                className="rj-input"
                style={{ width: '100%', marginBottom: '16px', fontSize: '24px', padding: '16px', textAlign: 'center' }}
                autoFocus
              />
              <button
                type="submit"
                className="rj-btn rj-btn-lg"
                disabled={!bet}
                style={{ width: '100%' }}
              >
                💰 Miser {bet || '...'}
              </button>
            </form>

            <div className="rj-text-sm" style={{ textAlign: 'center', marginTop: '16px', color: 'var(--rj-text-muted)' }}>
              {roundData?.timeLeft}s restantes
            </div>
          </div>
        )}

        {/* Proving Phase */}
        {isProving && (
          <div style={{ padding: '24px' }}>
            {/* Revealed Bets */}
            {roundData?.bets && (
              <div style={{ marginBottom: '24px', padding: '16px', background: 'var(--rj-bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                <div className="rj-text-sm" style={{ color: 'var(--rj-text-muted)', marginBottom: '12px' }}>
                  Mises révélées:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="rj-text">Team A: <strong>{roundData.bets.A || 0}</strong></div>
                  <div className="rj-text">Team B: <strong>{roundData.bets.B || 0}</strong></div>
                </div>
              </div>
            )}

            {canProve ? (
              <div>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div className="rj-badge rj-badge-primary" style={{ padding: '12px 24px', fontSize: '18px' }}>
                    🎯 Prouve ta mise: {roundData?.bets?.[currentPlayer.team]} rappeurs!
                  </div>
                </div>

                <form onSubmit={handleAnswerSubmit}>
                  <input
                    type="text"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Nomme un rappeur..."
                    className="rj-input"
                    style={{ width: '100%', marginBottom: '16px', fontSize: '18px', padding: '16px' }}
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="rj-btn rj-btn-lg"
                    disabled={!answer.trim()}
                    style={{ width: '100%' }}
                  >
                    Valider
                  </button>
                </form>

                {/* Proofs */}
                {roundData?.proofs && roundData.proofs.length > 0 && (
                  <div style={{ marginTop: '24px' }}>
                    <div className="rj-text-sm" style={{ color: 'var(--rj-text-muted)', marginBottom: '8px' }}>
                      Trouvés: {roundData.proofs.length}/{roundData.bets[currentPlayer.team]}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {roundData.proofs.map((artist: string, i: number) => (
                        <div key={i} className="rj-badge rj-badge-success">{artist}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div className="rj-badge" style={{ padding: '16px 32px', fontSize: '18px' }}>
                  ⏳ Team {roundData?.highestBidder} prouve sa mise...
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
