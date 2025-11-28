import { useEffect, useRef, useState } from 'react';

interface ConfettiPiece {
  id: number;
  x: number;
  delay: number;
  color: string;
  size: number;
  borderRadius: string;
  duration: number;
}

const CONFETTI_COLORS = [
  '#FFD700', // Gold
  '#FF6B6B', // Coral
  '#4ECDC4', // Teal
  '#A78BFA', // Purple
  '#FBBF24', // Yellow
  '#34D399', // Green
  '#F472B6', // Pink
  '#60A5FA', // Blue
];

// Generate confetti pieces outside of component to keep render pure
function generateConfettiPieces(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    size: Math.random() * 8 + 6,
    borderRadius: Math.random() > 0.5 ? '50%' : '2px',
    duration: 2 + Math.random() * 2,
  }));
}

interface ConfettiProps {
  active: boolean;
  duration?: number;
  pieces?: number;
}

export function Confetti({ active, duration = 3000, pieces = 50 }: ConfettiProps) {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const activeRef = useRef(active);

  useEffect(() => {
    const wasActive = activeRef.current;
    activeRef.current = active;

    // Only generate new confetti when transitioning from inactive to active
    if (active && !wasActive) {
      const generated = generateConfettiPieces(pieces);
      // Use requestAnimationFrame to avoid synchronous setState in effect
      requestAnimationFrame(() => {
        setConfetti(generated);
      });

      const timer = setTimeout(() => {
        setConfetti([]);
      }, duration);

      return () => clearTimeout(timer);
    }

    // When becoming inactive, clear confetti
    if (!active && wasActive) {
      requestAnimationFrame(() => {
        setConfetti([]);
      });
    }
  }, [active, duration, pieces]);

  if (confetti.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {confetti.map((piece) => (
        <div
          key={piece.id}
          className="absolute animate-confetti"
          style={{
            left: `${piece.x}%`,
            top: '-20px',
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            backgroundColor: piece.color,
            borderRadius: piece.borderRadius,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

// Floating score indicator component
interface FloatingScoreProps {
  score: number;
  x?: number;
  y?: number;
}

export function FloatingScore({ score, x = 50, y = 50 }: FloatingScoreProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed pointer-events-none z-40 font-bold text-2xl animate-float-up"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translateX(-50%)',
        color: score > 0 ? '#4ade80' : '#fb7185',
        textShadow: '0 2px 4px rgba(0,0,0,0.3)',
      }}
    >
      {score > 0 ? `+${score}` : score}
    </div>
  );
}

// Pre-generated sparkle positions (deterministic, no Math.random during render)
const SPARKLE_POSITIONS = [
  { id: 0, x: 20, y: 35, delay: 0, size: 12 },
  { id: 1, x: 32, y: 55, delay: 0.2, size: 10 },
  { id: 2, x: 44, y: 25, delay: 0.4, size: 14 },
  { id: 3, x: 56, y: 65, delay: 0.6, size: 9 },
  { id: 4, x: 68, y: 40, delay: 0.8, size: 11 },
  { id: 5, x: 80, y: 50, delay: 1.0, size: 13 },
];

// Sparkle effect for special moments
export function Sparkles({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {SPARKLE_POSITIONS.map((sparkle) => (
        <div
          key={sparkle.id}
          className="absolute animate-sparkle"
          style={{
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
            width: `${sparkle.size}px`,
            height: `${sparkle.size}px`,
            animationDelay: `${sparkle.delay}s`,
          }}
        >
          ✨
        </div>
      ))}
    </div>
  );
}
