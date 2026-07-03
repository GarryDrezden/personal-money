import type { CSSProperties, ReactNode } from 'react';

interface CozyIconFrameProps {
  box: number;
  tint: string;
  className?: string;
  children: ReactNode;
}

export function CozyIconFrame({ box, tint, className = '', children }: CozyIconFrameProps) {
  const badgeStyle = {
    width: box,
    height: box,
    backgroundColor: `${tint}22`,
    color: tint,
    '--cozy-tint': tint,
  } as CSSProperties;

  return (
    <span
      className={`cozy-icon-wrap inline-flex shrink-0 ${className}`.trim()}
      style={{ '--cozy-icon-box': `${box}px`, '--cozy-tint': tint } as CSSProperties}
    >
      <span
        className="cozy-icon-badge inline-flex items-center justify-center rounded-lg"
        style={badgeStyle}
      >
        {children}
      </span>
    </span>
  );
}
