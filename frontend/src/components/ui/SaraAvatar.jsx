import React from 'react';
import { motion } from 'framer-motion';

/**
 * SaraAvatar — High-fidelity 3D Glossy Purple Orb with a smile
 * Replaces old 2D emojis to match the premium, modern aesthetic of the UI.
 */
export default function SaraAvatar({ emotion = 'happy', size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-20 h-20',
    lg: 'w-28 h-28',
  }[size] || 'w-20 h-20';

  // Highlight circle size and position based on avatar size
  const highlightSize = {
    sm: 'w-2 h-2 top-1.5 left-1.5',
    md: 'w-4 h-4 top-3.5 left-3.5',
    lg: 'w-6 h-6 top-5 left-5',
  }[size] || 'w-4 h-4 top-3.5 left-3.5';

  // Smile size based on avatar size
  const smileStyle = {
    sm: 'w-3 h-1.5 bottom-2 border-b-2 border-white/90 rounded-b-full',
    md: 'w-6 h-3 bottom-4 border-b-[3px] border-white/90 rounded-b-full',
    lg: 'w-9 h-4.5 bottom-6 border-b-[4px] border-white/90 rounded-b-full',
  }[size] || 'w-6 h-3 bottom-4 border-b-[3px] border-white/90 rounded-b-full';

  // Pulse opacity for background glow
  const pulseOpacity = emotion === 'thinking' ? [0.4, 0.7, 0.4] : [0.15, 0.25, 0.15];

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Outer Pulse Ring */}
      <motion.div
        animate={{
          scale: emotion === 'thinking' ? [1, 1.15, 1] : [1, 1.05, 1],
          opacity: pulseOpacity,
        }}
        transition={{ repeat: Infinity, duration: emotion === 'thinking' ? 1.5 : 3.5, ease: 'easeInOut' }}
        className="absolute inset-0 rounded-full bg-primary blur-md"
      />

      {/* Main 3D Sphere */}
      <motion.div
        animate={emotion === 'thinking' ? {
          scale: [1, 1.04, 1],
          transition: { repeat: Infinity, duration: 1.8, ease: 'easeInOut' }
        } : {
          y: [0, -2, 0],
          transition: { repeat: Infinity, duration: 4, ease: 'easeInOut' }
        }}
        className={`${sizeClasses} rounded-full relative overflow-hidden shadow-md flex items-center justify-center`}
        style={{
          background: 'radial-gradient(circle at 35% 35%, #C4B5FD 0%, #8B5CF6 45%, #6D28D9 80%, #4C1D95 100%)',
          boxShadow: 'inset -6px -6px 15px rgba(0,0,0,0.35), inset 6px 6px 15px rgba(255,255,255,0.45), 0 10px 25px rgba(139, 92, 246, 0.2)',
        }}
      >
        {/* Glossy Reflection Highlight */}
        <div className={`absolute ${highlightSize} bg-white rounded-full opacity-80 blur-[0.5px]`} />

        {/* Smile Line */}
        <div className={`absolute ${smileStyle}`} />
      </motion.div>
    </div>
  );
}
