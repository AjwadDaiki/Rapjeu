'use client';

// ============================================
// BACKGROUNDS - Rapjeu Split Identity
// Blue / Yellow split with lightning seam
// ============================================

import { motion } from 'framer-motion';
import { effects } from '../lib/designSystem';

interface RetrowaveBackgroundProps {
  variant?: 'full' | 'minimal' | 'combat';
  showGrid?: boolean;
  showSunset?: boolean;
  showScanlines?: boolean;
  animated?: boolean;
}

export function RetrowaveBackground({
  variant = 'full',
  showGrid = true,
  showSunset = true,
  showScanlines = true,
  animated = true,
}: RetrowaveBackgroundProps) {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="rj-split-bg" />
      <div className="rj-split-bolt" />

      {showGrid && (
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(247,251,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(247,251,255,0.08) 1px, transparent 1px)',
            backgroundSize: '120px 120px',
          }}
        />
      )}

      {showScanlines && (
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: effects.scanlines,
          }}
        />
      )}

      <div className="rj-split-noise" />

      {variant === 'combat' && (
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 0%, rgba(5, 8, 15, 0.45) 100%)',
          }}
        />
      )}
    </div>
  );
}

// ============================================
// PRESET VARIANTS
// ============================================

export function LobbyBackground() {
  return <ModernBackground />;
}

export function GameBackground() {
  return <RetrowaveBackground variant="combat" animated={true} />;
}

export function MinimalBackground() {
  return (
    <RetrowaveBackground
      variant="minimal"
      showGrid={false}
      showSunset={true}
      showScanlines={true}
      animated={false}
    />
  );
}

// ============================================
// MODERN LOBBY BACKGROUND
// ============================================

export function ModernBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="rj-split-bg" />
      <div className="rj-split-bolt" />
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(247,251,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(247,251,255,0.08) 1px, transparent 1px)',
          backgroundSize: '140px 140px',
        }}
      />
      <div className="rj-split-noise" />
    </div>
  );
}
