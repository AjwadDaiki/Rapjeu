'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const GAME_MODES = [
  { icon: '🔗', name: 'ROLAND GAMOS', desc: 'Chaine de featurings entre rappeurs', color: '#2ec4b6' },
  { icon: '🎯', name: 'LE THEME', desc: "Nomme les artistes d'un theme", color: '#f2c14e' },
  { icon: '❓', name: 'MYTHO / PAS MYTHO', desc: 'Info vraie ou fausse?', color: '#f08c3a' },
  { icon: '💰', name: 'LES ENCHERES', desc: 'Parie puis prouve tes reponses', color: '#6c7aa1' },
  { icon: '🎵', name: 'BLIND TEST', desc: 'Devine artiste + titre', color: '#c6712b' },
  { icon: '🖼️', name: 'PIXEL COVER', desc: "Pochette d'album pixelisee", color: '#9aa4b2' },
  { icon: '🕵️', name: 'DEVINE QUI', desc: "Identifie l'artiste mystere", color: '#249e92' },
  { icon: '📝', name: 'CONTINUE LES PAROLES', desc: 'Continue les paroles du morceau', color: '#9e5a21' },
];

export default function Home() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');
  const [nameSubmitted, setNameSubmitted] = useState(false);
  const [mode, setMode] = useState<'home' | 'join'>('home');
  const [roomCode, setRoomCode] = useState('');

  useEffect(() => {
    const saved = sessionStorage.getItem('playerName') || localStorage.getItem('rapjeu_player_name');
    if (saved) {
      setPlayerName(saved);
      setNameSubmitted(true);
    }
  }, []);

  const handleCreateRoom = () => {
    router.push('/lobby?create=1');
  };

  const handleJoinRoom = () => {
    if (roomCode.trim().length >= 4) {
      router.push(`/lobby?code=${roomCode.toUpperCase().trim()}`);
    }
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim().length < 3) return;
    const cleanName = playerName.trim().slice(0, 20);
    sessionStorage.setItem('playerName', cleanName);
    localStorage.setItem('rapjeu_player_name', cleanName);
    setPlayerName(cleanName);
    setNameSubmitted(true);
  };

  if (!nameSubmitted) {
    return (
      <div className="relative min-h-screen">
        <div className="sa-background" />
        <div className="sa-scanlines" />

        <div className="sa-page flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="sa-card w-full max-w-[520px] p-10 text-center"
          >
            <div className="sa-logo sa-logo-lg mb-4">
              <span className="sa-logo-rap">RAP</span>
              <span className="sa-logo-jeu">JEU</span>
              <span className="sa-logo-tag">MULTI</span>
            </div>
            <div className="sa-subtitle text-lg mb-6">ENTRE TON BLAZE</div>
            <form onSubmit={handleNameSubmit}>
              <div className="mb-6 text-left">
                <label className="sa-section-label block mb-3">PSEUDO (3-20 CAR.)</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Mike33..."
                  autoFocus
                  maxLength={20}
                  className="sa-input w-full"
                />
              </div>
              <button
                type="submit"
                disabled={playerName.trim().length < 3}
                className="sa-btn sa-btn-start w-full"
              >
                CONTINUER
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Sunset background + overlays */}
      <div className="sa-background" />
      <div className="sa-scanlines" />

      <div className="sa-page" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* Header - Logo */}
        <motion.header
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          style={{ padding: '40px 32px 24px', textAlign: 'center' }}
        >
          <motion.div
            className="sa-logo sa-logo-xl"
            style={{ margin: 0, justifyContent: 'center', cursor: 'pointer' }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="sa-logo-rap">RAP</span>
            <span className="sa-logo-jeu">JEU</span>
            <span className="sa-logo-tag">MULTI</span>
          </motion.div>
        </motion.header>

        {/* Main content */}
        <div style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '28px',
          padding: '0 32px 40px',
          maxWidth: '1400px',
          margin: '0 auto',
          width: '100%',
          alignItems: 'start',
        }}>

          {/* Left - Actions */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
          >
            <AnimatePresence mode="wait">
              {mode === 'home' ? (
                <motion.div
                  key="home"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="sa-card"
                  style={{ padding: '40px' }}
                >
                  <h2 className="sa-title sa-title-md" style={{ textAlign: 'center', marginBottom: '32px' }}>
                    JOUER MAINTENANT
                  </h2>

                  {/* Create button */}
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleCreateRoom}
                    className="sa-btn sa-btn-start"
                    style={{ width: '100%', marginBottom: '16px', fontSize: '22px' }}
                  >
                    CREER UNE PARTIE
                  </motion.button>

                  {/* Join button */}
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setMode('join')}
                    className="sa-btn sa-btn-secondary"
                    style={{ width: '100%', fontSize: '18px', padding: '20px 32px' }}
                  >
                    REJOINDRE UNE PARTIE
                  </motion.button>

                  {/* Stats box */}
                  <div className="sa-info-box" style={{ marginTop: '32px', textAlign: 'center' }}>
                    <p className="sa-section-label" style={{ marginBottom: '16px', color: 'rgba(255,255,255,0.7)' }}>
                      INFOS PARTIE
                    </p>
                    <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                      {[
                        { value: '8', label: 'MODES' },
                        { value: '2-8', label: 'JOUEURS' },
                        { value: 'VARIABLE', label: 'DUREE' },
                      ].map((stat) => (
                        <motion.div
                          key={stat.label}
                          whileHover={{ scale: 1.08, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                          style={{
                            background: 'rgba(0,0,0,0.4)',
                            padding: '14px 18px',
                            borderRadius: '12px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            cursor: 'default',
                          }}
                        >
                          <div style={{
                            fontFamily: 'var(--sa-font-title)',
                            fontSize: '28px',
                            color: 'var(--sa-orange)',
                            textShadow: 'none',
                          }}>
                            {stat.value}
                          </div>
                          <div style={{
                            fontFamily: 'var(--sa-font-title)',
                            fontSize: '9px',
                            color: 'rgba(255,255,255,0.6)',
                            letterSpacing: '1px',
                            marginTop: '4px',
                          }}>
                            {stat.label}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Beta notice */}
                  <div style={{
                    marginTop: '24px',
                    padding: '16px 20px',
                    background: 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: '16px',
                    textAlign: 'center',
                  }}>
                    <div style={{
                      fontFamily: 'var(--sa-font-title)',
                      fontSize: '11px',
                      letterSpacing: '2px',
                      color: '#3B82F6',
                      marginBottom: '8px',
                      fontWeight: 700,
                    }}>
                      BETA
                    </div>
                    <p style={{
                      fontSize: '13px',
                      color: 'rgba(255,255,255,0.55)',
                      lineHeight: '1.6',
                      margin: 0,
                    }}>
                      Le site est en beta et s&apos;am{'\u00e9'}liore chaque jour. De nouveaux rappeurs, feats, questions et modes sont ajout{'\u00e9'}s r{'\u00e9'}guli{'\u00e8'}rement.
                    </p>
                    <p style={{
                      fontSize: '13px',
                      color: 'rgba(255,255,255,0.55)',
                      lineHeight: '1.6',
                      marginTop: '8px',
                    }}>
                      Questions, id{'\u00e9'}es ou bugs ? Contactez-moi sur Discord :
                    </p>
                    <div style={{
                      marginTop: '10px',
                      padding: '8px 20px',
                      background: 'rgba(88, 101, 242, 0.15)',
                      border: '1px solid rgba(88, 101, 242, 0.3)',
                      borderRadius: '10px',
                      color: '#7289DA',
                      fontSize: '13px',
                      fontWeight: 700,
                      letterSpacing: '0.5px',
                      display: 'inline-block',
                    }}>
                      Mon Discord : daikigui
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="join"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="sa-card"
                  style={{ padding: '40px' }}
                >
                  <motion.button
                    whileHover={{ x: -4 }}
                    onClick={() => setMode('home')}
                    className="sa-btn sa-btn-secondary"
                    style={{ marginBottom: '24px', padding: '10px 20px', fontSize: '14px' }}
                  >
                    &larr; RETOUR
                  </motion.button>

                  <h2 className="sa-title sa-title-md" style={{ textAlign: 'center', marginBottom: '24px' }}>
                    REJOINDRE
                  </h2>

                  <p style={{
                    textAlign: 'center',
                    marginBottom: '24px',
                    color: 'var(--sa-ui-text-muted)',
                    fontFamily: 'var(--sa-font-body)',
                    fontSize: '15px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                  }}>
                    Entre le code de la partie
                  </p>

                  <div style={{ position: 'relative', marginBottom: '24px' }}>
                    <input
                      type="text"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                      placeholder="CODE"
                      maxLength={4}
                      autoFocus
                      className="sa-input sa-input-code"
                      style={{ width: '100%' }}
                    />
                    {roomCode.length > 0 && (
                      <div className="sa-badge sa-badge-orange" style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '16px',
                      }}>
                        {roomCode.length}/4
                      </div>
                    )}
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleJoinRoom}
                    disabled={roomCode.trim().length < 4}
                    className="sa-btn sa-btn-start"
                    style={{
                      width: '100%',
                      opacity: roomCode.trim().length >= 4 ? 1 : 0.4,
                      cursor: roomCode.trim().length >= 4 ? 'pointer' : 'not-allowed',
                    }}
                  >
                    C&apos;EST PARTI!
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Right - Modes */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="sa-card"
            style={{
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: 'calc(100vh - 200px)',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px',
            }}>
              <div className="sa-mode-icon sa-mode-icon-orange" style={{ width: '44px', height: '44px', fontSize: '20px' }}>
                📖
              </div>
              <h3 className="sa-title sa-title-sm" style={{ margin: 0 }}>
                LES 8 MODES
              </h3>
            </div>

            {/* Mode list */}
            <div className="sa-scroll" style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              overflowY: 'auto',
              flex: 1,
              paddingRight: '8px',
            }}>
              {GAME_MODES.map((gm, i) => (
                <motion.div
                  key={i}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ delay: 0.4 + i * 0.06 }}
                  className="sa-mode-card"
                  style={{ cursor: 'pointer' }}
                >
                  <div
                    className="sa-mode-icon"
                    style={{
                      background: gm.color,
                      boxShadow: '0 10px 18px rgba(6, 8, 12, 0.35)',
                    }}
                  >
                    {gm.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontFamily: 'var(--sa-font-title)',
                      fontSize: '13px',
                      color: 'white',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '4px',
                      textShadow: 'var(--sa-shadow-medium)',
                    }}>
                      {gm.name}
                    </div>
                    <div style={{
                      fontFamily: 'var(--sa-font-body)',
                      fontSize: '12px',
                      color: 'var(--sa-ui-text-muted)',
                      fontWeight: 500,
                    }}>
                      {gm.desc}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* How to play */}
            <div className="sa-info-box" style={{ marginTop: '20px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px',
              }}>
                <div className="sa-mode-icon sa-mode-icon-orange" style={{ width: '36px', height: '36px', fontSize: '16px' }}>
                  💡
                </div>
                <span className="sa-section-label" style={{ margin: 0 }}>COMMENT JOUER</span>
              </div>
              <ul style={{
                margin: 0,
                paddingLeft: '20px',
                fontFamily: 'var(--sa-font-body)',
                fontSize: '13px',
                color: 'rgba(255,255,255,0.8)',
                fontWeight: 600,
                lineHeight: 2,
              }}>
                <li>Rejoins une equipe (A ou B)</li>
                <li>Affronte l&apos;autre team</li>
                <li>Reponds aux questions rap</li>
                <li>L&apos;equipe gagnante triomphe!</li>
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
