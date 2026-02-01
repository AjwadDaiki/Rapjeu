// ============================================
// DESIGN SYSTEM - Rapjeu Street Arena
// Warm dark surfaces, bold typography, restrained accents
// ============================================

export const colors = {
  // Modern blue / yellow identity
  sunset: {
    primary: '#2F80ED', // Blue
    secondary: '#F2C94C', // Yellow
    tertiary: '#1F6CD2', // Deep blue
    accent: '#F7FBFF', // Soft white
  },

  // Accent slots (kept for compatibility)
  neon: {
    cyan: '#2F80ED',
    magenta: '#F2C94C',
    yellow: '#F2C94C',
    green: '#22C55E',
    orange: '#F2C94C',
    pink: '#F6D66B',
  },

  // Team Colors
  teamA: {
    primary: '#2F80ED',
    secondary: '#1F6CD2',
    glow: 'rgba(47, 128, 237, 0.2)',
    shadow: 'rgba(47, 128, 237, 0.35)',
  },

  teamB: {
    primary: '#F2C94C',
    secondary: '#E1B83E',
    glow: 'rgba(242, 201, 76, 0.2)',
    shadow: 'rgba(242, 201, 76, 0.35)',
  },

  // UI Base
  background: {
    dark: '#0B1220',
    darker: '#080E1A',
    grid: 'rgba(247, 251, 255, 0.06)',
  },

  // Accents
  street: {
    spray: '#2F80ED',
    tag: '#F2C94C',
    wall: '#111B2C',
  },
};

export const gradients = {
  // Brand gradient accents
  sunset: 'linear-gradient(180deg, #2F80ED 0%, #1F6CD2 55%, #0B1220 100%)',
  sunsetHorizontal: 'linear-gradient(90deg, #2F80ED 0%, #1F6CD2 55%, #F2C94C 100%)',

  // Team gradients
  neonCyan: 'linear-gradient(135deg, #2F80ED 0%, #1F6CD2 100%)',
  neonMagenta: 'linear-gradient(135deg, #F2C94C 0%, #E1B83E 100%)',
  neonYellow: 'linear-gradient(135deg, #F2C94C 0%, #F6D66B 100%)',

  // Fighting Game HP
  hpTeamA: 'linear-gradient(90deg, #2F80ED 0%, #1F6CD2 100%)',
  hpTeamB: 'linear-gradient(90deg, #F2C94C 0%, #E1B83E 100%)',

  // Background Grid
  gridPerspective: `
    linear-gradient(0deg, transparent 24%, rgba(246, 242, 234, .08) 25%, rgba(246, 242, 234, .08) 26%, transparent 27%, transparent 74%, rgba(246, 242, 234, .08) 75%, rgba(246, 242, 234, .08) 76%, transparent 77%, transparent),
    linear-gradient(90deg, transparent 24%, rgba(246, 242, 234, .08) 25%, rgba(246, 242, 234, .08) 26%, transparent 27%, transparent 74%, rgba(246, 242, 234, .08) 75%, rgba(246, 242, 234, .08) 76%, transparent 77%, transparent)
  `,
};

export const shadows = {
  // Soft color shadows
  neonCyan: '0 10px 24px rgba(47, 128, 237, 0.24)',
  neonMagenta: '0 10px 24px rgba(242, 201, 76, 0.24)',
  neonYellow: '0 10px 24px rgba(242, 201, 76, 0.24)',
  neonGreen: '0 10px 24px rgba(34, 197, 94, 0.2)',

  // Text shadows
  textCyan: '0 6px 16px rgba(6, 8, 12, 0.5)',
  textMagenta: '0 6px 16px rgba(6, 8, 12, 0.5)',

  // Fighting Game Damage
  damageCritical: '0 12px 28px rgba(239, 68, 68, 0.35)',
  damageNormal: '0 10px 22px rgba(47, 128, 237, 0.25)',

  // Depth
  depth: '0 18px 50px rgba(6, 8, 12, 0.6)',
};

export const animations = {
  // Fighting Game
  hit: {
    duration: 0.15,
    shake: { x: [-10, 10, -10, 10, 0], y: [-5, 5, -5, 5, 0] },
  },

  combo: {
    scale: [1, 1.2, 1],
    duration: 0.3,
  },

  knockout: {
    opacity: [1, 0],
    scale: [1, 1.5],
    rotate: [0, 360],
    duration: 0.8,
  },

  // Retrowave
  scanline: {
    duration: 2,
    ease: 'linear',
    repeat: Infinity,
  },

  glitch: {
    duration: 0.1,
    repeat: 3,
    repeatDelay: 0.5,
  },

  // Street Graffiti
  spray: {
    scale: [0, 1.2, 1],
    opacity: [0, 1],
    duration: 0.4,
  },

  tag: {
    pathLength: [0, 1],
    duration: 1,
  },
};

export const typography = {
  // Graffiti Headers (use Google Fonts later)
  fontFamily: {
    graffiti: 'var(--font-display), system-ui, sans-serif',
    neon: 'var(--font-display), system-ui, sans-serif',
    street: 'var(--font-display), system-ui, sans-serif',
    body: 'var(--font-sans), system-ui, sans-serif',
  },

  // Text Effects
  textStroke: {
    thin: '1px',
    medium: '2px',
    thick: '3px',
  },
};

export const effects = {
  // Subtle texture
  scanlines: `
    repeating-linear-gradient(
      0deg,
      rgba(255, 255, 255, 0.02),
      rgba(255, 255, 255, 0.02) 1px,
      transparent 1px,
      transparent 3px
    )
  `,

  // Glitch (kept minimal)
  glitchText: `
    text-shadow:
      1px 1px 0px rgba(47, 128, 237, 0.35),
      -1px -1px 0px rgba(242, 201, 76, 0.35)
  `,

  // Graffiti Spray
  sprayPaint: `
    filter: url('#spray-filter');
  `,
};

// Fighting Game Presets
export const fightingGame = {
  hpBar: {
    height: '40px',
    borderRadius: '4px',
    border: '3px solid',
    glowIntensity: '0 0 15px',
  },

  damageFlash: {
    duration: 0.1,
    color: '#FFFFFF',
  },

  comboText: {
    scale: 1.5,
    rotation: -5,
    duration: 0.5,
  },

  roundAnnounce: {
    scale: [0.5, 1.2, 1],
    opacity: [0, 1, 1],
    duration: 0.8,
  },
};

// Retrowave Presets
export const retrowave = {
  grid: {
    size: '50px',
    color: colors.neon.magenta,
    opacity: 0.2,
    perspective: '500px',
  },

  sunsetGradient: {
    colors: ['#2F80ED', '#1F6CD2', '#F2C94C', '#0B1220'],
    angle: 180,
  },

  chrome: {
    gradient: 'linear-gradient(180deg, #E0E0E0 0%, #707070 50%, #E0E0E0 100%)',
    reflection: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 100%)',
  },
};

// Export utility functions
export const getTeamColor = (team: 'A' | 'B', variant: 'primary' | 'secondary' | 'glow' = 'primary') => {
  return team === 'A' ? colors.teamA[variant] : colors.teamB[variant];
};

export const getTeamGradient = (team: 'A' | 'B') => {
  return team === 'A' ? gradients.neonCyan : gradients.neonMagenta;
};

export const getTeamShadow = (team: 'A' | 'B') => {
  return team === 'A' ? shadows.neonCyan : shadows.neonMagenta;
};
