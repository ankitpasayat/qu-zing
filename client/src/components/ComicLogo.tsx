interface ComicLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ComicLogo({ size = 'lg', className = '' }: ComicLogoProps) {
  const sizeClasses = {
    sm: 'h-12',
    md: 'h-20',
    lg: 'h-28',
  };

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <svg
        className={sizeClasses[size]}
        viewBox="0 0 400 120"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="textGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#FFEB3B' }} />
            <stop offset="100%" style={{ stopColor: '#FFC107' }} />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Comic Burst Background */}
        <path
          fill="#EF4444"
          stroke="#000"
          strokeWidth="3"
          d="M200,5 L230,30 L270,15 L260,45 L300,50 L270,75 L295,105 L250,95 L200,115 L150,95 L105,105 L130,75 L100,50 L140,45 L130,15 L170,30 Z"
          transform="scale(1.35 1.0) translate(-70 2)"
        />

        {/* Main Text with stroke */}
        <text
          x="200"
          y="78"
          fontFamily="Arial Black, Arial, sans-serif"
          fontWeight="900"
          fontSize="65"
          fill="url(#textGrad)"
          stroke="#000"
          strokeWidth="5"
          textAnchor="middle"
          style={{ paintOrder: 'stroke fill' }}
          filter="url(#glow)"
        >
          Qu-Zing!
        </text>

        {/* Lightning Bolt Right */}
        <path
          d="M355,20 L345,45 L360,45 L350,70 L380,40 L365,40 Z"
          fill="#FFEB3B"
          stroke="#000"
          strokeWidth="2"
          transform="rotate(10 360 45)"
        />

        {/* Lightning Bolt Left */}
        <path
          d="M45,50 L35,75 L50,75 L40,100 L70,70 L55,70 Z"
          fill="#FFEB3B"
          stroke="#000"
          strokeWidth="2"
          transform="rotate(-10 50 75)"
        />
      </svg>
    </div>
  );
}

export default ComicLogo;
