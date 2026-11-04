import React from 'react';

interface MascotProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCrown?: boolean;
}

export const WhitmanLionMascot: React.FC<MascotProps> = ({
  className = '',
  size = 'md',
  showCrown = true,
}) => {
  const pixelMap = {
    sm: 32,
    md: 48,
    lg: 80,
    xl: 112,
  };

  const px = pixelMap[size] || 48;

  const dimensionsClass = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-20 h-20',
    xl: 'w-28 h-28',
  }[size] || 'w-12 h-12';

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${dimensionsClass} ${className}`}
      style={{
        width: `${px}px`,
        height: `${px}px`,
        minWidth: `${px}px`,
        minHeight: `${px}px`,
        maxWidth: `${px}px`,
        maxHeight: `${px}px`,
      }}
    >
      {/* Escudo de fondo en Vino Borgoña con borde dorado */}
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full filter drop-shadow-md"
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      >
        <defs>
          <linearGradient id="burgundyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9e233d" />
            <stop offset="60%" stopColor="#800020" />
            <stop offset="100%" stopColor="#450812" />
          </linearGradient>
          <linearGradient id="lionGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FCD34D" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
          <radialGradient id="lionFur" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="100%" stopColor="#D97706" />
          </radialGradient>
        </defs>

        {/* Escudo Heráldico Borgoña */}
        <path
          d="M50 4 C72 4 88 12 88 28 C88 64 50 96 50 96 C50 96 12 64 12 28 C12 12 28 4 50 4 Z"
          fill="url(#burgundyGrad)"
          stroke="url(#lionGoldGrad)"
          strokeWidth="3.5"
        />

        {/* Corona del León si está habilitada */}
        {showCrown && (
          <path
            d="M36 24 L42 30 L50 18 L58 30 L64 24 L62 34 L38 34 Z"
            fill="url(#lionGoldGrad)"
            stroke="#92400E"
            strokeWidth="1"
          />
        )}

        {/* Melena del León Whitman */}
        <circle cx="50" cy="52" r="23" fill="url(#lionGoldGrad)" opacity="0.95" />

        {/* Puntas de melena estilizadas */}
        <path
          d="M50 27 L54 34 L62 30 L62 39 L71 39 L68 47 L75 51 L68 57 L72 65 L64 66 L64 74 L56 71 L50 76 L44 71 L36 74 L36 66 L28 65 L32 57 L25 51 L32 47 L29 39 L38 39 L38 30 L46 34 Z"
          fill="#B45309"
        />

        {/* Rostro del León */}
        <circle cx="50" cy="53" r="15" fill="url(#lionFur)" />

        {/* Orejas */}
        <circle cx="40" cy="40" r="4" fill="#92400E" />
        <circle cx="40" cy="40" r="2.5" fill="#FCD34D" />
        <circle cx="60" cy="40" r="4" fill="#92400E" />
        <circle cx="60" cy="40" r="2.5" fill="#FCD34D" />

        {/* Ojos de determinación */}
        <ellipse cx="44" cy="50" rx="2.4" ry="1.8" fill="#3B020C" />
        <circle cx="44.8" cy="49.5" r="0.7" fill="#FFF" />
        <ellipse cx="56" cy="50" rx="2.4" ry="1.8" fill="#3B020C" />
        <circle cx="56.8" cy="49.5" r="0.7" fill="#FFF" />

        {/* Nariz */}
        <polygon points="50,56 46.5,53 53.5,53" fill="#3B020C" />

        {/* Hocico y Rugido / Bigotes */}
        <path
          d="M47 57 C48 59 50 59 50 59 C50 59 52 59 53 57"
          stroke="#3B020C"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* Mandíbula fuerte */}
        <path
          d="M48 60 Q50 63 52 60"
          stroke="#800020"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};
