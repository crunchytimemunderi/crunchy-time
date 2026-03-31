"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PremiumLoaderProps {
  message?: string;
  className?: string;
  icon?: string;
}

export default function PremiumLoader({ 
  message = "Loading...", 
  className,
  icon
}: PremiumLoaderProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-8", className)}>
      <div className="relative">
        {/* Pulsing glow ring */}
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.15, 0.3, 0.15],
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 bg-red-500/20 rounded-full blur-[60px]"
        />
        
        {/* Spinning outer ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="w-28 h-28 rounded-full border-2 border-white/5 border-t-red-500 border-r-amber-500/50"
        />
        
        {/* Counter-spinning inner ring */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute inset-3 rounded-full border border-white/5 border-b-red-400/40"
        />
        
        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span 
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="text-4xl select-none"
          >
            🍗
          </motion.span>
        </div>
      </div>

      <div className="space-y-3 text-center font-outfit">
        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-black text-white tracking-tighter uppercase italic"
        >
          Crunchy Time
        </motion.h2>
        <div className="flex flex-col items-center gap-1">
          <motion.p 
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="text-[11px] font-black text-red-500 uppercase tracking-[0.5em] pl-[0.5em]"
          >
            {message}
          </motion.p>
          <div className="w-48 h-1 bg-white/5 rounded-full mt-3 overflow-hidden relative">
             <motion.div 
               animate={{ x: ["-100%", "100%"] }}
               transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
               className="absolute inset-0 bg-crispy-gradient w-1/2" 
             />
          </div>
        </div>
      </div>
    </div>
  );
}
