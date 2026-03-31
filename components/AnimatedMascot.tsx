"use client";

import { motion, AnimatePresence } from "framer-motion";

export type MascotMood = "idle" | "typing" | "hiding" | "success" | "error";

const MOOD_EMOJIS: Record<MascotMood, string> = {
  idle: "😊",
  typing: "👀",
  hiding: "🙈",
  success: "🎉",
  error: "😬",
};

const MOOD_BUBBLES: Record<MascotMood, string> = {
  idle: "👋 Welcome back, boss!",
  typing: "📝 I see you typing...",
  hiding: "🙈 I won't peek, I promise!",
  success: "🎉 Let's cook — access granted!",
  error: "😬 Hmm, that doesn't look right...",
};

interface AnimatedMascotProps {
  mood: MascotMood;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function AnimatedMascot({ mood, className, size = "md" }: AnimatedMascotProps) {
  const sizeClasses = {
    sm: { container: "w-24 h-24", emoji: "text-5xl", bubble: "text-[9px] px-3 py-1.5" },
    md: { container: "w-40 h-40", emoji: "text-8xl", bubble: "text-[11px] px-5 py-3" },
    lg: { container: "w-56 h-56", emoji: "text-9xl", bubble: "text-[13px] px-7 py-4" },
  }[size];

  return (
    <div className={`flex flex-col items-center gap-4 select-none w-full ${className}`}>
      {/* Speech bubble */}
      <AnimatePresence mode="wait">
        <motion.div
          key={mood}
          initial={{ opacity: 0, y: 12, scale: 0.88 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.92 }}
          className={`relative bg-white/10 border border-white/15 backdrop-blur-md rounded-2xl text-center ${sizeClasses.bubble}`}
        >
          <p className="font-black text-white/80 uppercase tracking-widest leading-relaxed">
            {MOOD_BUBBLES[mood]}
          </p>
          <div className="absolute -bottom-[9px] left-1/2 -translate-x-1/2 w-4 h-4 bg-white/10 border-r border-b border-white/15 rotate-45" />
        </motion.div>
      </AnimatePresence>

      {/* Animated emoji mascot */}
      <motion.div 
        className={`relative flex items-center justify-center ${sizeClasses.container}`}
        animate={
          mood === "success" 
            ? { rotate: [0, -10, 10, -10, 0], scale: [1, 1.1, 1] }
            : mood === "error"
            ? { x: [0, -6, 6, -6, 6, 0] }
            : mood === "hiding"
            ? { scale: [1, 0.9, 1] }
            : {}
        }
        transition={{ duration: 0.6, ease: "easeInOut" }}
      >
        {/* Pulsing glow behind mascot */}
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.25, 0.1],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 bg-red-500/20 rounded-full blur-[40px]"
        />
        
        {/* Orbiting ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full border border-white/5 border-t-red-500/30"
        />

        <AnimatePresence mode="wait">
          <motion.span
            key={mood}
            initial={{ scale: 0.5, opacity: 0, rotate: -30 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.5, opacity: 0, rotate: 30 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={`${sizeClasses.emoji} relative z-10 drop-shadow-2xl`}
          >
            {MOOD_EMOJIS[mood]}
          </motion.span>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
