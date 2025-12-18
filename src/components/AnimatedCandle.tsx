import { cn } from "@/lib/utils";

interface AnimatedCandleProps {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
}

const AnimatedCandle = ({ className, size = "lg" }: AnimatedCandleProps) => {
  const sizeConfig = {
    xs: {
      container: "w-10 h-14",
      glow1: "w-6 h-6",
      glow2: "w-4 h-4",
      glow3: "w-5 h-5",
      flame: "w-4 h-6",
      wick: "w-0.5 h-1",
      waxPool: "w-4 h-1",
      candleBody: "w-4 h-6",
      drip1: "w-0.5 h-1.5 left-0.5 top-1",
      drip2: "w-0.5 h-1 right-0.5 top-1.5",
      particles: "top-2",
    },
    sm: {
      container: "w-16 h-24",
      glow1: "w-12 h-12",
      glow2: "w-8 h-8",
      glow3: "w-10 h-10",
      flame: "w-8 h-12",
      wick: "w-0.5 h-2",
      waxPool: "w-8 h-2",
      candleBody: "w-8 h-14",
      drip1: "w-1 h-3 left-0.5 top-2",
      drip2: "w-1 h-2 right-1 top-3",
      particles: "top-4",
    },
    md: {
      container: "w-24 h-36",
      glow1: "w-16 h-16",
      glow2: "w-10 h-10",
      glow3: "w-14 h-14",
      flame: "w-10 h-16",
      wick: "w-1 h-2",
      waxPool: "w-12 h-2.5",
      candleBody: "w-12 h-20",
      drip1: "w-1.5 h-5 left-1 top-3",
      drip2: "w-1 h-3 right-1.5 top-5",
      particles: "top-6",
    },
    lg: {
      container: "w-32 h-48",
      glow1: "w-20 h-20",
      glow2: "w-12 h-12",
      glow3: "w-16 h-16",
      flame: "w-12 h-20",
      wick: "w-1 h-3",
      waxPool: "w-14 h-3",
      candleBody: "w-14 h-24",
      drip1: "w-2 h-6 left-1 top-4",
      drip2: "w-1.5 h-4 right-2 top-6",
      particles: "top-8",
    },
  };

  const s = sizeConfig[size];

  return (
    <div className={cn("relative flex flex-col items-center", s.container, className)}>
      {/* Ambient glow behind flame - enhanced for dark mode */}
      <div className={cn("absolute top-0 left-1/2 -translate-x-1/2 bg-accent/30 dark:bg-amber-500/40 rounded-full blur-2xl animate-candle-glow", s.glow1)} />
      <div className={cn("absolute top-1 left-1/2 -translate-x-1/2 bg-yellow-400/40 dark:bg-yellow-300/50 rounded-full blur-xl animate-candle-glow-inner", s.glow2)} />
      <div className={cn("absolute top-2 left-1/2 -translate-x-1/2 bg-orange-400/0 dark:bg-orange-400/30 rounded-full blur-2xl animate-candle-glow", s.glow3)} />

      {/* Flame container */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Outer flame (orange/red) */}
        <div className="relative">
          <svg
            viewBox="0 0 60 100"
            className={cn("animate-flame-sway", s.flame)}
            style={{ filter: "drop-shadow(0 0 8px rgba(255, 180, 50, 0.6))" }}
          >
            {/* Outer flame - warm orange */}
            <defs>
              <linearGradient id="outerFlame" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#ff6b35" stopOpacity="0.9" />
                <stop offset="40%" stopColor="#ff9500" stopOpacity="0.95" />
                <stop offset="70%" stopColor="#ffcc00" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#fff5cc" stopOpacity="0.7" />
              </linearGradient>
              <linearGradient id="innerFlame" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#ff9500" />
                <stop offset="50%" stopColor="#ffdd00" />
                <stop offset="100%" stopColor="#fffef0" />
              </linearGradient>
              <filter id="flameBlur">
                <feGaussianBlur in="SourceGraphic" stdDeviation="1" />
              </filter>
            </defs>

            {/* Outer flame shape */}
            <path
              d="M30 5 
                 Q45 25, 48 45 
                 Q50 65, 45 80 
                 Q40 92, 30 95 
                 Q20 92, 15 80 
                 Q10 65, 12 45 
                 Q15 25, 30 5"
              fill="url(#outerFlame)"
              className="animate-flame-flicker"
            />

            {/* Inner flame shape (brighter core) */}
            <path
              d="M30 20 
                 Q38 35, 40 50 
                 Q41 65, 37 75 
                 Q34 85, 30 88 
                 Q26 85, 23 75 
                 Q19 65, 20 50 
                 Q22 35, 30 20"
              fill="url(#innerFlame)"
              filter="url(#flameBlur)"
              className="animate-flame-flicker-inner"
            />

            {/* Bright core */}
            <ellipse cx="30" cy="70" rx="6" ry="10" fill="#fff8e7" opacity="0.9" className="animate-flame-core" />
          </svg>
        </div>

        {/* Wick */}
        <div className={cn("bg-stone-800 rounded-t-sm -mt-0.5", s.wick)} />
      </div>

      {/* Candle body */}
      <div className="relative z-0 -mt-0.5">
        {/* Wax pool (melted top) */}
        <div className={cn("bg-gradient-to-b from-amber-100 to-amber-200 rounded-t-full shadow-inner", s.waxPool)} />
        {/* Candle stick */}
        <div className={cn("bg-gradient-to-b from-amber-100 via-amber-50 to-amber-100 rounded-b-lg shadow-lg relative", s.candleBody)}>
          {/* Subtle wax drips */}
          <div className={cn("absolute bg-amber-50/60 rounded-full", s.drip1)} />
          <div className={cn("absolute bg-amber-50/50 rounded-full", s.drip2)} />
        </div>
      </div>

      {/* Floating light particles - brighter in dark mode */}
      <div className={cn("absolute left-1/2 -translate-x-1/2", s.particles)}>
        <div className="absolute w-1 h-1 bg-yellow-200/60 dark:bg-yellow-200/80 rounded-full animate-particle-1" />
        <div className="absolute w-0.5 h-0.5 bg-yellow-100/50 dark:bg-yellow-100/70 rounded-full animate-particle-2" />
        <div className="absolute w-0.5 h-0.5 bg-orange-200/40 dark:bg-orange-300/60 rounded-full animate-particle-3" />
      </div>
    </div>
  );
};

export default AnimatedCandle;
