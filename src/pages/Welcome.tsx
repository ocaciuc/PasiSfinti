import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.png";

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-end pb-24 md:pb-32">
      {/* Background image - centered and covering */}
      <img 
        src={heroBg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-top"
      />
      
      {/* Dark overlay for text readability at bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/60 to-transparent" />
      
      {/* Soft golden glow effect */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-candle-glow/20 blur-3xl animate-gentle-float pointer-events-none" />
      
      {/* Content positioned at bottom */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-md">
        {/* Title */}
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3 drop-shadow-lg"
        >
          Pași de Pelerin
        </motion.h1>
        
        {/* Subtitle */}
        <motion.p 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="text-lg md:text-xl text-white/90 mb-10 drop-shadow-md"
        >
          Bun venit pe drumul tău spiritual
        </motion.p>
        
        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
        >
          <Button 
            onClick={() => navigate("/auth")}
            size="lg"
            className="px-8 py-6 text-lg font-medium rounded-full shadow-xl bg-white hover:bg-white/90 text-primary glow-candle hover:scale-105 transition-transform duration-300"
          >
            Autentificare / Înregistrare
          </Button>
        </motion.div>
      </div>
      
      {/* Decorative warm glow at bottom corners */}
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-candle-glow/30 blur-2xl rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-32 h-32 bg-candle-glow/30 blur-2xl rounded-full pointer-events-none" />
      
      {/* Footer links */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.8 }}
        className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 z-10"
      >
        <a 
          href="/privacy" 
          className="text-white/70 hover:text-white text-sm transition-colors"
        >
          Politica de confidențialitate
        </a>
        <span className="text-white/50">•</span>
        <a 
          href="/terms" 
          className="text-white/70 hover:text-white text-sm transition-colors"
        >
          Termeni și condiții
        </a>
      </motion.div>
    </div>
  );
};

export default Welcome;
