'use client'

import { useAurora } from '@/contexts/AuroraContext'

const orbPositions = {
  home: {
    orb1: { top: '-10%', left: '-10%', width: '60%', height: '60%' },
    orb2: { top: '10%', right: '-5%', width: '50%', height: '50%' },
    orb3: { bottom: '-10%', left: '10%', width: '50%', height: '50%' },
  },
  browse: {
    orb1: { top: '-20%', left: '20%', width: '50%', height: '50%' },
    orb2: { top: '30%', right: '-15%', width: '60%', height: '60%' },
    orb3: { bottom: '0%', left: '-10%', width: '45%', height: '45%' },
  },
  new: {
    orb1: { top: '10%', left: '-20%', width: '55%', height: '55%' },
    orb2: { top: '-15%', right: '10%', width: '45%', height: '45%' },
    orb3: { bottom: '-20%', left: '30%', width: '60%', height: '60%' },
  },
  topic: {
    orb1: { top: '0%', left: '10%', width: '40%', height: '40%' },
    orb2: { top: '20%', right: '-10%', width: '55%', height: '55%' },
    orb3: { bottom: '-5%', left: '-15%', width: '50%', height: '50%' },
  },
}

export function AuroraBackground() {
  const { variant } = useAurora()
  const positions = orbPositions[variant]
  
  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      {/* Gradient Orb 1 */}
      <div
        className="absolute rounded-full bg-blue-700/45 blur-[100px] mix-blend-screen transition-all duration-1000 ease-out"
        style={{
          top: positions.orb1.top,
          left: positions.orb1.left,
          width: positions.orb1.width,
          height: positions.orb1.height,
        }}
      />

      {/* Gradient Orb 2 */}
      <div
        className="absolute rounded-full bg-cyan-600/45 blur-[100px] mix-blend-screen transition-all duration-1000 ease-out"
        style={{
          top: positions.orb2.top,
          right: positions.orb2.right,
          width: positions.orb2.width,
          height: positions.orb2.height,
        }}
      />

      {/* Gradient Orb 3 */}
      <div
        className="absolute rounded-full bg-indigo-700/45 blur-[100px] mix-blend-screen transition-all duration-1000 ease-out"
        style={{
          bottom: positions.orb3.bottom,
          left: positions.orb3.left,
          width: positions.orb3.width,
          height: positions.orb3.height,
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

