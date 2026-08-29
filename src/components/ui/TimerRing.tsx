import React from 'react';

interface TimerRingProps {
  seconds: number;      // current remaining seconds
  totalSeconds: number; // total duration for the ring arc
  size?: number;        // diameter in px
  strokeWidth?: number;
  urgentAt?: number;    // seconds below which colour turns red
}

/**
 * Circular countdown ring. Purely decorative — the server decides when the
 * phase actually ends; this only displays the remaining time.
 */
export const TimerRing: React.FC<TimerRingProps> = ({
  seconds,
  totalSeconds,
  size = 72,
  strokeWidth = 5,
  urgentAt = 10,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, Math.max(0, seconds / totalSeconds));
  const dashOffset = circumference * (1 - progress);

  const isUrgent = seconds <= urgentAt;
  const trackColor = 'rgba(255,255,255,0.1)';
  const arcColor = isUrgent ? '#ef4444' : '#f59e0b';
  const textColor = isUrgent ? '#ef4444' : '#fbbf24';

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={arcColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s ease' }}
        />
        {/* number in centre — counter-rotate so text reads upright */}
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fill: textColor,
            fontSize: size * 0.3,
            fontWeight: 700,
            fontFamily: 'monospace',
            transform: `rotate(90deg)`,
            transformOrigin: `${size / 2}px ${size / 2}px`,
            transition: 'fill 0.3s ease',
          }}
        >
          {seconds}
        </text>
      </svg>
    </div>
  );
};
