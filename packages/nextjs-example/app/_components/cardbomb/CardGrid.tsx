"use client";

import React from "react";
import { GridCell } from "./GridCell";

interface CardGridProps {
  selectedIndices: number[];
  onCellClick: (index: number) => void;
  disabled?: boolean;
  maxSelections?: number;
  revealedBombs?: number[];
  guessedCells?: boolean[];
  isGuessMode?: boolean;
  title?: string;
}

export function CardGrid({ 
  selectedIndices, 
  onCellClick, 
  disabled, 
  maxSelections = 1, 
  revealedBombs,
  guessedCells,
  isGuessMode = false,
  title 
}: CardGridProps) {
  const handleClick = (index: number) => {
    if (disabled) return;
    if (guessedCells?.[index]) return; // Can't click already guessed cells
    
    // Always allow clicking any cell - parent will handle the logic
    // This allows: selecting new cell, changing selection, or deselecting
    onCellClick(index);
  };

  return (
    <div className="flex flex-col items-center">
      {title && (
        <p className="text-[10px] font-bold text-primary/70 tracking-[0.15em] uppercase mb-3">
          {title}
        </p>
      )}
      
      <div className="relative p-3">
        {/* Cyber border corners */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary/50"></div>
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary/50"></div>
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-primary/50"></div>
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-primary/50"></div>
        
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => (
            <GridCell
              key={index}
              index={index}
              selected={selectedIndices.includes(index)}
              onClick={() => handleClick(index)}
              disabled={disabled || guessedCells?.[index]}
              revealed={revealedBombs !== undefined}
              isBomb={revealedBombs?.includes(index)}
              isGuess={isGuessMode}
              isGuessed={guessedCells?.[index]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
