"use client";

import { LayoutGrid, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  withSparkle?: boolean;
}

const sizes = {
  sm: { box: "w-8 h-8 rounded-lg", icon: "w-5 h-5", sparkle: "w-4 h-4", offset: "-top-1 -right-1" },
  md: { box: "w-10 h-10 rounded-xl", icon: "w-6 h-6", sparkle: "w-5 h-5", offset: "-top-1.5 -right-1.5" },
  lg: { box: "w-14 h-14 rounded-2xl", icon: "w-8 h-8", sparkle: "w-6 h-6", offset: "-top-2 -right-2" },
  xl: { box: "w-28 h-28 rounded-[2.5rem]", icon: "w-14 h-14", sparkle: "w-10 h-10", offset: "-top-3 -right-3" },
};

export default function BrandLogo({ size = "md", className, withSparkle = true }: BrandLogoProps) {
  const currentSize = sizes[size];

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <motion.div 
        layoutId="brand-logo"
        whileHover={{ scale: 1.05 }}
        className={cn(
          "bg-crispy-gradient flex items-center justify-center shadow-lg border border-white/20 transform -rotate-6",
          currentSize.box
        )}
      >
        <LayoutGrid className={cn("text-white", currentSize.icon)} />
        
        {withSparkle && (
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1], 
              opacity: [0.7, 1, 0.7],
              rotate: [0, 10, -10, 0]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className={cn("absolute text-yellow-400 drop-shadow-md", currentSize.sparkle, currentSize.offset)}
          >
            <Sparkles className="w-full h-full fill-yellow-400/20" />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
