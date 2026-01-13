import { motion } from "framer-motion";
import splashImage from "@/assets/splash-screen.png";

interface SplashScreenProps {
  isExiting?: boolean;
}

const SplashScreen = ({ isExiting = false }: SplashScreenProps) => {
  return (
    <motion.div 
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-primary"
      initial={{ opacity: 1 }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Background image */}
      <img
        src={splashImage}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
      
      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/40 to-transparent" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6">
        {/* App title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: isExiting ? 0 : 1, y: isExiting ? -10 : 0 }}
          transition={{ duration: isExiting ? 0.3 : 0.6, ease: "easeOut" }}
          className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg"
        >
          Pași de Pelerin
        </motion.h1>
        
        {/* Loading indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isExiting ? 0 : 1 }}
          transition={{ duration: isExiting ? 0.2 : 0.4, delay: isExiting ? 0 : 0.3 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <p className="text-white/80 text-sm">Se încarcă...</p>
        </motion.div>
      </div>
      
      {/* Decorative warm glow at bottom corners */}
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-candle-glow/30 blur-2xl rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-32 h-32 bg-candle-glow/30 blur-2xl rounded-full pointer-events-none" />
    </motion.div>
  );
};

export default SplashScreen;
