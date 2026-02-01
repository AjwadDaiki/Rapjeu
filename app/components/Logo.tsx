'use client';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Logo({ size = 'md', className = '' }: LogoProps) {
  const sizes = {
    sm: '32px',
    md: '48px',
    lg: '56px',
    xl: '72px',
  };

  return (
    <div className={className} style={{ display: 'inline-flex', alignItems: 'baseline' }}>
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: sizes[size],
          fontWeight: 900,
          letterSpacing: '-0.02em',
          color: 'var(--rj-rap)',
          textShadow: '0 6px 16px rgba(6, 8, 12, 0.35)',
        }}
      >
        RAP
      </span>
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: sizes[size],
          fontWeight: 900,
          letterSpacing: '-0.02em',
          color: 'var(--rj-secondary)',
          textShadow: '0 6px 16px rgba(6, 8, 12, 0.35)',
        }}
      >
        JEU
      </span>
    </div>
  );
}
