'use client';

// ============================================
// NEON BUTTON - Fighting Game Style Buttons
// Street Fighter inspired buttons with neon effects
// ============================================

import { motion } from 'framer-motion';
import { ButtonHTMLAttributes, ReactNode } from 'react';

interface NeonButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onAnimationStart' | 'onDrag' | 'onDragEnd' | 'onDragStart'> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'cyan' | 'magenta';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  glow?: boolean;
  children: ReactNode;
}

export function NeonButton({
  variant = 'primary',
  size = 'md',
  glow = true,
  disabled = false,
  className = '',
  children,
  ...props
}: NeonButtonProps) {

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
    xl: 'px-10 py-5 text-xl',
  };

  const variantStyles = {
    primary: {
      background: 'linear-gradient(135deg, var(--rj-primary) 0%, var(--rj-primary-dark) 100%)',
      border: '1px solid rgba(247, 251, 255, 0.25)',
      shadow: glow ? '0 16px 32px rgba(7, 12, 20, 0.35)' : 'none',
      hoverShadow: '0 22px 40px rgba(7, 12, 20, 0.4)',
    },
    secondary: {
      background: 'linear-gradient(135deg, var(--rj-secondary) 0%, var(--rj-secondary-dark) 100%)',
      border: '1px solid rgba(247, 251, 255, 0.2)',
      shadow: glow ? '0 16px 32px rgba(7, 12, 20, 0.35)' : 'none',
      hoverShadow: '0 20px 36px rgba(7, 12, 20, 0.4)',
    },
    success: {
      background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
      border: '1px solid rgba(246, 242, 234, 0.2)',
      shadow: glow ? '0 16px 32px rgba(6, 8, 12, 0.35)' : 'none',
      hoverShadow: '0 22px 40px rgba(6, 8, 12, 0.4)',
    },
    danger: {
      background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
      border: '1px solid rgba(246, 242, 234, 0.2)',
      shadow: glow ? '0 16px 32px rgba(6, 8, 12, 0.35)' : 'none',
      hoverShadow: '0 22px 40px rgba(6, 8, 12, 0.4)',
    },
    cyan: {
      background: 'linear-gradient(135deg, var(--rj-primary) 0%, var(--rj-primary-dark) 100%)',
      border: '1px solid rgba(247, 251, 255, 0.22)',
      shadow: glow ? '0 16px 32px rgba(7, 12, 20, 0.35)' : 'none',
      hoverShadow: '0 22px 40px rgba(7, 12, 20, 0.4)',
    },
    magenta: {
      background: 'linear-gradient(135deg, var(--rj-secondary) 0%, var(--rj-secondary-dark) 100%)',
      border: '1px solid rgba(247, 251, 255, 0.22)',
      shadow: glow ? '0 16px 32px rgba(7, 12, 20, 0.35)' : 'none',
      hoverShadow: '0 22px 40px rgba(7, 12, 20, 0.4)',
    },
  };

  const textColors = {
    primary: '#F7FBFF',
    secondary: '#0B1220',
    success: '#0f1115',
    danger: '#ffffff',
    cyan: '#F7FBFF',
    magenta: '#0B1220',
  };

  const style = variantStyles[variant];

  return (
    <motion.button
      className={`
        relative font-black uppercase tracking-[0.12em] rounded-2xl
        ${sizeClasses[size]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      style={{
        fontFamily: 'var(--font-display)',
        background: style.background,
        border: style.border,
        boxShadow: style.shadow,
        color: textColors[variant],
        textShadow: 'none',
      }}
      whileHover={!disabled ? {
        scale: 1.04,
        boxShadow: style.hoverShadow,
      } : {}}
      whileTap={!disabled ? {
        scale: 0.95,
      } : {}}
      transition={{
        duration: 0.2,
        ease: 'easeOut',
      }}
      disabled={disabled}
      {...props}
    >
      {/* Inner glow */}
      <div
        className="absolute inset-0 rounded-2xl opacity-60 pointer-events-none"
        style={{
        background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.2) 0%, transparent 60%)',
        }}
      />

      {/* Content */}
      <span className="relative z-10">{children}</span>

      {/* Bottom shine */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full opacity-50"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.7) 50%, transparent 100%)',
        }}
      />
    </motion.button>
  );
}

// ============================================
// NEON INPUT - Fighting Game Style Text Input
// ============================================

interface NeonInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'cyan' | 'magenta' | 'default';
  label?: string;
  error?: string;
}

export function NeonInput({
  variant = 'default',
  label,
  error,
  className = '',
  ...props
}: NeonInputProps) {

  const variantStyles = {
    default: {
      border: 'rgba(247, 251, 255, 0.2)',
      focus: 'var(--rj-primary)',
      glow: '0 0 0 3px rgba(47, 128, 237, 0.2)',
    },
    cyan: {
      border: 'rgba(47, 128, 237, 0.35)',
      focus: '#2F80ED',
      glow: '0 0 0 3px rgba(47, 128, 237, 0.2)',
    },
    magenta: {
      border: 'rgba(242, 201, 76, 0.4)',
      focus: '#F2C94C',
      glow: '0 0 0 3px rgba(242, 201, 76, 0.25)',
    },
  };

  const style = variantStyles[variant];

  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-[0.16em]">
          {label}
        </label>
      )}
      <input
        className={`
          w-full px-4 py-3 rounded-2xl
          bg-[#111b2c]/85 backdrop-blur-xl
          text-[#f7fbff] font-semibold
          outline-none transition-all duration-200
          ${error ? 'border-2 border-red-500' : 'border-2'}
          ${className}
        `}
        style={{
          borderColor: error ? '#EF4444' : style.border,
          boxShadow: error ? '0 0 0 3px rgba(239, 68, 68, 0.2)' : 'none',
          fontFamily: 'var(--font-sans)',
        }}
        onFocus={(e) => {
          if (!error) {
            e.target.style.borderColor = style.focus;
            e.target.style.boxShadow = style.glow;
          }
        }}
        onBlur={(e) => {
          if (!error) {
            e.target.style.borderColor = style.border;
            e.target.style.boxShadow = 'none';
          }
        }}
        {...props}
      />
      {error && (
        <motion.p
          className="text-red-400 text-sm mt-1"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}

// ============================================
// BUZZ BUTTON - Special button for Blind Test
// ============================================

interface BuzzButtonProps {
  onBuzz: () => void;
  disabled?: boolean;
  team: 'A' | 'B';
}

export function BuzzButton({ onBuzz, disabled = false, team }: BuzzButtonProps) {
  const teamColor = team === 'A' ? 'var(--team-a-primary)' : 'var(--team-b-primary)';
  const teamAlt = team === 'A' ? 'var(--team-a-secondary)' : 'var(--team-b-secondary)';
  const teamShadow = disabled ? 'none' : '0 16px 32px rgba(6, 8, 12, 0.35)';

  return (
    <motion.button
      onClick={onBuzz}
      disabled={disabled}
      className="relative w-32 h-32 rounded-full font-bold text-2xl uppercase"
      style={{
        fontFamily: 'var(--font-display)',
        background: `radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.35) 0%, transparent 45%), linear-gradient(135deg, ${teamColor} 0%, ${teamAlt} 100%)`,
        border: `3px solid ${teamColor}`,
        boxShadow: disabled ? 'none' : teamShadow,
        color: '#0f1115',
        textShadow: '0 2px 6px rgba(6, 8, 12, 0.35)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
      whileHover={!disabled ? {
        scale: 1.06,
        boxShadow: '0 20px 40px rgba(6, 8, 12, 0.4)',
      } : {}}
      whileTap={!disabled ? {
        scale: 0.9,
      } : {}}
      transition={{
        scale: { duration: 0.1 },
      }}
    >
      BUZZ
    </motion.button>
  );
}
