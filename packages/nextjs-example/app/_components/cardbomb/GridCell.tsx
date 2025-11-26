"use client";

import React from "react";

interface GridCellProps {
  index: number;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  revealed?: boolean;
  isBomb?: boolean;
  isGuess?: boolean;
  isGuessed?: boolean;
}

export function GridCell({ index, selected, onClick, disabled, revealed, isBomb, isGuess, isGuessed }: GridCellProps) {
  // Base styles - Compact, Cyber feel
  const baseStyles = "relative w-14 h-14 md:w-16 md:h-16 flex items-center justify-center transition-all duration-200 group";
  
  // Clip path for cyber corners
  const clipPathStyle = {
    clipPath: "polygon(0 0, 100% 0, 100% 85%, 85% 100%, 0 100%)"
  };

  // Determine state and content
  let bgStyles = "";
  let borderStyles = "";
  let content: React.ReactNode = "";
  let glowEffect = "";
  
  if (revealed && isBomb) {
    // Bomb exploded - RED ALERT
    bgStyles = "bg-red-900/80";
    borderStyles = "border border-red-500";
    glowEffect = "shadow-[0_0_20px_rgba(239,68,68,0.6)] animate-pulse";
    content = <span className="text-2xl drop-shadow-[0_0_8px_rgba(239,68,68,1)]">💣</span>;
  } else if (isGuessed) {
    // Safe cell found - NEON GREEN
    bgStyles = "bg-emerald-900/60";
    borderStyles = "border border-emerald-400";
    glowEffect = "shadow-[0_0_10px_rgba(52,211,153,0.4)]";
    content = <span className="text-xl text-emerald-400 font-bold">✓</span>;
  } else if (selected) {
    // Currently selected - CYAN/PURPLE
    if (isGuess) {
      // Guess mode - PURPLE
      bgStyles = "bg-purple-900/60";
      borderStyles = "border border-purple-500";
      glowEffect = "shadow-[0_0_15px_rgba(168,85,247,0.5)] scale-105 z-10";
      content = <span className="text-2xl text-purple-400 font-bold animate-pulse">?</span>;
    } else {
      // Bomb placement mode
      bgStyles = "bg-cyan-900/60";
      borderStyles = "border border-cyan-400";
      glowEffect = "shadow-[0_0_15px_rgba(34,211,238,0.5)] scale-105 z-10";
      content = <span className="text-2xl">💣</span>;
    }
  } else {
    // Default unselected - DARK METALLIC
    bgStyles = "bg-slate-800/40 hover:bg-slate-700/60";
    borderStyles = "border border-slate-700 hover:border-cyan-500/50";
    content = (
      <span className="text-sm font-mono text-slate-600 group-hover:text-cyan-400 transition-colors">
        {String(index + 1).padStart(2, '0')}
      </span>
    );
  }
  
  const cursorStyle = disabled || isGuessed ? "cursor-not-allowed opacity-60" : "cursor-pointer";
  
  return (
    <button
      onClick={onClick}
      disabled={disabled || isGuessed}
      className={`${baseStyles} ${cursorStyle}`}
      style={!revealed && !selected && !isGuessed ? clipPathStyle : undefined}
    >
      {/* Inner Background & Border Container */}
      <div 
        className={`absolute inset-0 ${bgStyles} ${borderStyles} ${glowEffect} transition-all duration-200`}
        style={!revealed && !selected && !isGuessed ? clipPathStyle : { borderRadius: '4px' }}
      />
      
      {/* Content Layer */}
      <div className="relative z-10">
        {content}
      </div>
      
      {/* Decorative Corner (only for unselected/unrevealed) */}
      {!selected && !revealed && !isGuessed && (
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-slate-600/30 group-hover:bg-cyan-400/50 transition-colors" 
             style={{ clipPath: "polygon(100% 0, 0 100%, 100% 100%)" }} />
      )}
    </button>
  );
}
