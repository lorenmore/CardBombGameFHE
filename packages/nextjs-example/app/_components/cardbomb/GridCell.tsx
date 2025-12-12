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
    bgStyles = "bg-error/30";
    borderStyles = "border border-error";
    glowEffect = "shadow-[0_0_20px_rgba(239,68,68,0.6)] animate-pulse";
    content = <span className="text-2xl drop-shadow-[0_0_8px_rgba(239,68,68,1)]">💣</span>;
  } else if (isGuessed) {
    // Safe cell found - NEON GREEN
    bgStyles = "bg-success/20";
    borderStyles = "border border-success";
    glowEffect = "shadow-[0_0_10px_rgba(52,211,153,0.4)]";
    content = <span className="text-xl text-success font-bold">✓</span>;
  } else if (selected) {
    // Currently selected - PRIMARY/SECONDARY
    if (isGuess) {
      // Guess mode - SECONDARY
      bgStyles = "bg-secondary/20";
      borderStyles = "border border-secondary";
      glowEffect = "shadow-[0_0_15px_rgba(168,85,247,0.5)] scale-105 z-10";
      content = <span className="text-2xl text-secondary font-bold animate-pulse">?</span>;
    } else {
      // Bomb placement mode
      bgStyles = "bg-primary/20";
      borderStyles = "border border-primary";
      glowEffect = "shadow-[0_0_15px_rgba(34,211,238,0.5)] scale-105 z-10";
      content = <span className="text-2xl">💣</span>;
    }
  } else {
    // Default unselected
    bgStyles = "bg-base-200 hover:bg-base-300/80";
    borderStyles = "border-2 border-base-300 hover:border-primary/60";
    glowEffect = "shadow-sm hover:shadow-md";
    content = (
      <span className="text-sm font-mono text-base-content/50 group-hover:text-primary transition-colors">
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
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-base-content/10 group-hover:bg-primary/50 transition-colors" 
             style={{ clipPath: "polygon(100% 0, 0 100%, 100% 100%)" }} />
      )}
    </button>
  );
}
