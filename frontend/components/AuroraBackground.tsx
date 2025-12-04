'use client'

import { motion } from 'framer-motion'

export function AuroraBackground() {
  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      {/* Gradient Orb 1 - Zinc/Silver */}
      <motion.div
        className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-zinc-600/30 blur-[100px] mix-blend-screen"
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 50, 0],
          y: [0, 30, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Gradient Orb 2 - Slate/Blue-Grey */}
      <motion.div
        className="absolute top-[10%] right-[-5%] w-[50%] h-[50%] rounded-full bg-slate-600/30 blur-[100px] mix-blend-screen"
        animate={{
          scale: [1, 1.1, 1],
          x: [0, -50, 0],
          y: [0, 40, 0],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1
        }}
      />

      {/* Gradient Orb 3 - Gray/Neutral */}
      <motion.div
        className="absolute bottom-[-10%] left-[10%] w-[50%] h-[50%] rounded-full bg-gray-700/30 blur-[100px] mix-blend-screen"
        animate={{
          scale: [1, 1.3, 1],
          x: [0, 30, 0],
          y: [0, -30, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2
        }}
      />

      {/* Noise texture overlay */}
      <div className="absolute inset-0 z-20 opacity-[0.03] pointer-events-none mix-blend-overlay" 
           style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }} 
      />
      
      {/* Vignette to fade edges to black */}
      <div className="absolute inset-0 z-10 bg-radial-gradient-to-t from-black/80 via-transparent to-transparent" />
    </div>
  )
}

