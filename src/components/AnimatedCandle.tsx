import { cn } from "@/lib/utils";

interface AnimatedCandleProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const AnimatedCandle = ({ className, size = "lg" }: AnimatedCandleProps) => {
  const sizeClasses = {
    sm: "w-16 h-24",
    md: "w-24 h-36",
    lg: "w-32 h-48",
  };

  return (
    <div className={cn("relative flex flex-col items-center", sizeClasses[size], className)}>
      {/* Ambient glow behind flame */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-20 bg-accent/30 rounded-full blur-2xl animate-candle-glow" />
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-12 bg-yellow-400/40 rounded-full blur-xl animate-candle-glow-inner" />
      
      {/* Flame container */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Outer flame (orange/red) */}
        <div className="relative">
          <svg
            viewBox="0 0 60 100"
            className="w-12 h-20 animate-flame-sway"
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
            <ellipse
              cx="30"
              cy="70"
              rx="6"
              ry="10"
              fill="#fff8e7"
              opacity="0.9"
              className="animate-flame-core"
            />
          </svg>
        </div>
        
        {/* Wick */}
        <div className="w-1 h-3 bg-stone-800 rounded-t-sm -mt-1" />
      </div>
      
      {/* Candle body */}
      <div className="relative z-0 -mt-1">
        {/* Wax pool (melted top) */}
        <div className="w-14 h-3 bg-gradient-to-b from-amber-100 to-amber-200 rounded-t-full shadow-inner" />
        
        {/* Candle stick */}
        <div className="w-14 h-24 bg-gradient-to-b from-amber-100 via-amber-50 to-amber-100 rounded-b-lg shadow-lg">
          {/* Subtle wax drips */}
          <div className="absolute left-1 top-4 w-2 h-6 bg-amber-50/60 rounded-full" />
          <div className="absolute right-2 top-6 w-1.5 h-4 bg-amber-50/50 rounded-full" />
        </div>
        
        {/* Base/holder */}
        <div className="w-16 h-2 bg-gradient-to-b from-amber-700 to-amber-800 rounded-sm -mx-1 shadow-md" />
        <div className="w-20 h-3 bg-gradient-to-b from-amber-800 to-amber-900 rounded-b-lg -mx-3 shadow-lg" />
      </div>
      
      {/* Floating light particles */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2">
        <div className="absolute w-1 h-1 bg-yellow-200/60 rounded-full animate-particle-1" />
        <div className="absolute w-0.5 h-0.5 bg-yellow-100/50 rounded-full animate-particle-2" />
        <div className="absolute w-0.5 h-0.5 bg-orange-200/40 rounded-full animate-particle-3" />
      </div>
    </div>
  );
};

export default AnimatedCandle;
