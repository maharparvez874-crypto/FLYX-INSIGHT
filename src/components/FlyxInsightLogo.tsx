import React from 'react';

export interface FlyxInsightLogoProps {
  /** Size preset or pixel number for the circular emblem icon */
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  /** Whether to render the 'FLYX INSIGHT' wordmark alongside the emblem */
  showText?: boolean;
  /** Current theme: 'dark' | 'light' */
  theme?: 'dark' | 'light';
  /** Whether dynamic CSS animation is enabled (default true) */
  animated?: boolean;
  /** Optional container className */
  className?: string;
  /** Responsive text visibility override */
  responsiveText?: boolean;
}

export const FlyxInsightLogo: React.FC<FlyxInsightLogoProps> = ({
  size = 'md',
  showText = true,
  theme = 'dark',
  animated = true,
  className = '',
  responsiveText = true,
}) => {
  const isDark = theme === 'dark';

  // Resolve pixel diameter
  const pixelSize =
    typeof size === 'number'
      ? size
      : size === 'sm'
      ? 32
      : size === 'md'
      ? 38
      : size === 'lg'
      ? 48
      : 64;

  return (
    <div className={`inline-flex items-center gap-2.5 sm:gap-3 shrink-0 select-none ${className}`}>
      {/* ===================================================================
          1. CIRCULAR EMBLEM ICON (Vector Scalable with Dynamic Web3 Animation)
      ==================================================================== */}
      <div
        className={`relative rounded-full transition-transform duration-300 hover:scale-105 ${
          animated ? 'animate-flyx-logo-pulse' : ''
        }`}
        style={{ width: pixelSize, height: pixelSize }}
      >
        <svg
          viewBox="0 0 512 512"
          width={pixelSize}
          height={pixelSize}
          className="w-full h-full block overflow-visible drop-shadow-md"
          role="img"
          aria-label="FLYX INSIGHT Official Circular Emblem"
        >
          <defs>
            {/* Master Disc Background */}
            <radialGradient id="flyx-emblem-bg" cx="50%" cy="36%" r="64%">
              <stop offset="0%" stop-color={isDark ? '#16233F' : '#1E293B'} />
              <stop offset="45%" stop-color={isDark ? '#0D1629' : '#0F172A'} />
              <stop offset="85%" stop-color={isDark ? '#070C18' : '#020617'} />
              <stop offset="100%" stop-color="#03060C" />
            </radialGradient>

            {/* Imperial Gold Ring */}
            <linearGradient id="flyx-gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#FFF2B2" />
              <stop offset="25%" stop-color="#FFC727" />
              <stop offset="55%" stop-color="#E5A100" />
              <stop offset="85%" stop-color="#B87333" />
              <stop offset="100%" stop-color="#FFD54F" />
            </linearGradient>

            {/* Electric Cyan Neon */}
            <linearGradient id="flyx-cyan-grad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#00F2FE" />
              <stop offset="45%" stop-color="#38BDF8" />
              <stop offset="85%" stop-color="#2563EB" />
              <stop offset="100%" stop-color="#1D4ED8" />
            </linearGradient>

            {/* Wing Gold Highlight */}
            <linearGradient id="flyx-wing-gold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#FFFBEB" />
              <stop offset="25%" stop-color="#FBBF24" />
              <stop offset="65%" stop-color="#D97706" />
              <stop offset="100%" stop-color="#92400E" />
            </linearGradient>

            {/* Glass Specular Dome */}
            <linearGradient id="flyx-specular" x1="25%" y1="0%" x2="75%" y2="100%">
              <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.32" />
              <stop offset="35%" stop-color="#FFFFFF" stop-opacity="0.06" />
              <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0" />
            </linearGradient>

            {/* Core Glow Filter */}
            <filter id="flyx-subtle-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 1. Base Circular Disc */}
          <circle cx="256" cy="256" r="248" fill="url(#flyx-emblem-bg)" />

          {/* 2. Outer Solid Gold Ring */}
          <circle
            cx="256"
            cy="256"
            r="244"
            fill="none"
            stroke="url(#flyx-gold-grad)"
            strokeWidth="5"
            strokeOpacity={isDark ? '0.92' : '1'}
          />

          {/* 3. Concentric Orbit Rings (With Subtle Rotation if Animated) */}
          <g className={animated ? 'animate-flyx-orbit' : ''}>
            <circle
              cx="256"
              cy="256"
              r="236"
              fill="none"
              stroke="#38BDF8"
              strokeWidth="2"
              strokeDasharray="14 8"
              strokeOpacity="0.75"
            />
            <circle
              cx="256"
              cy="256"
              r="218"
              fill="none"
              stroke="#FFB800"
              strokeWidth="1.2"
              strokeOpacity="0.4"
            />

            {/* Cardinal Orbital Nodes */}
            <circle cx="256" cy="12" r="5" fill="#FFE082" />
            <circle cx="500" cy="256" r="5" fill="#00F2FE" />
            <circle cx="256" cy="500" r="5" fill="#FFE082" />
            <circle cx="12" cy="256" r="5" fill="#00F2FE" />

            {/* Orbit Diagonals */}
            <circle cx="83" cy="83" r="3" fill="#38BDF8" opacity="0.6" />
            <circle cx="429" cy="83" r="3" fill="#FFB800" opacity="0.6" />
            <circle cx="429" cy="429" r="3" fill="#38BDF8" opacity="0.6" />
            <circle cx="83" cy="429" r="3" fill="#FFB800" opacity="0.6" />
          </g>

          {/* 4. Top Dome Glassmorphism Arc (With Subtle Light Sweep) */}
          <path
            d="M 28 256 A 228 228 0 0 1 484 256 A 228 170 0 0 0 28 256 Z"
            fill="url(#flyx-specular)"
            className={animated ? 'animate-flyx-light-sweep' : ''}
          />

          {/* 5. Inner Geometric Hexagonal Shield */}
          <polygon
            points="256,68 412,158 412,338 256,428 100,338 100,158"
            fill={isDark ? '#0A1324' : '#0B1528'}
            fillOpacity="0.7"
            stroke="url(#flyx-gold-grad)"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />

          {/* 6. Signature FLYX Emblem Crest */}
          <g filter="url(#flyx-subtle-glow)">
            {/* Top Wing Apex */}
            <path
              d="M 256 108 L 368 172 L 340 188 L 256 140 L 172 188 L 144 172 Z"
              fill="url(#flyx-wing-gold)"
            />

            {/* Left Chevron Upper */}
            <path
              d="M 144 186 L 232 236 L 204 252 L 144 218 L 144 186 Z"
              fill="url(#flyx-wing-gold)"
            />

            {/* Right Chevron Upper */}
            <path
              d="M 368 186 L 368 218 L 308 252 L 280 236 L 368 186 Z"
              fill="url(#flyx-cyan-grad)"
            />

            {/* Central Diamond Core (Insight Aperture) */}
            <polygon points="256,214 298,256 256,298 214,256" fill="url(#flyx-gold-grad)" />
            <polygon points="256,226 286,256 256,286 226,256" fill="#0B1329" />
            <circle cx="256" cy="256" r="10" fill="#00F2FE" />
            <circle cx="256" cy="256" r="4.5" fill="#FFFFFF" />

            {/* Lower Blades ("X" Legs) */}
            <path
              d="M 144 326 L 144 294 L 224 268 L 244 286 L 180 346 Z"
              fill="url(#flyx-cyan-grad)"
            />
            <path
              d="M 368 326 L 332 346 L 268 286 L 288 268 L 368 294 Z"
              fill="url(#flyx-wing-gold)"
            />

            {/* Bottom Chevron Apex */}
            <path
              d="M 256 404 L 172 356 L 194 340 L 256 374 L 318 340 L 340 356 Z"
              fill="url(#flyx-cyan-grad)"
            />
          </g>

          {/* 7. Cardinal Spark Highlights */}
          <polygon
            points="256,58 259,68 269,68 261,74 264,84 256,78 248,84 251,74 243,68 253,68"
            fill="#FFFFFF"
            opacity="0.9"
          />
          <polygon
            points="412,158 414,164 420,164 415,168 417,174 412,170 407,174 409,168 404,164 410,164"
            fill="#00F2FE"
            opacity="0.85"
          />
        </svg>
      </div>

      {/* ===================================================================
          2. BRAND WORDMARK: FLYX INSIGHT
      ==================================================================== */}
      {showText && (
        <div
          className={`flex flex-col leading-none tracking-tight whitespace-nowrap ${
            responsiveText ? '' : ''
          }`}
        >
          <div className="font-display font-extrabold text-base sm:text-lg tracking-wide flex items-center gap-1.5">
            <span className="text-[#FFB800] drop-shadow-sm font-black">FLYX</span>
            <span
              className={`font-black ${
                isDark ? 'text-[#38BDF8]' : 'text-[#2563EB]'
              }`}
            >
              INSIGHT
            </span>
          </div>
          <span
            className={`text-[9px] sm:text-[10px] tracking-wider uppercase font-semibold font-mono mt-0.5 ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            Transparency Portal
          </span>
        </div>
      )}
    </div>
  );
};
