"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/helper/RainbowKitCustomConnectButton";
import { useCardBombGame, GameMeta } from "~~/hooks/cardbomb";
import { CardGrid } from "./CardGrid";

export function CardBombDemo() {
  const { isConnected, address } = useAccount();
  
  const {
    status, isReady, chainId, fhevmError,
    txHash, isWritePending, isWaitingForTx, isTxSuccess, writeError,
    nextGameId, refetchNextGameId, loadGames, createGame, guessCell,
    makeGamePublic, getGameMeta, getPlayerState,
    fetchDecryptHandles, performDecrypt, decryptPlayerState,
    publicDecryptBomb, canDecrypt, isDecrypting, decryptResults, decryptHandles,
    getLastResultPlaintext, getBombPlaintext,
  } = useCardBombGame();

  const [activeTab, setActiveTab] = useState<'create' | 'list' | 'play'>('list');
  const [message, setMessage] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Create Game State
  const [reward, setReward] = useState<string>("10");
  const [bombPosition, setBombPosition] = useState<number | null>(null);
  
  // Game List State
  const [games, setGames] = useState<GameMeta[]>([]);
  const [isLoadingGames, setIsLoadingGames] = useState(true);
  
  // Play Game State
  const [currentGame, setCurrentGame] = useState<GameMeta | null>(null);
  const [guessedCells, setGuessedCells] = useState<boolean[]>(Array(9).fill(false));
  const [safeCount, setSafeCount] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [revealedBomb, setRevealedBomb] = useState<number | null>(null);
  const [pendingGuessCell, setPendingGuessCell] = useState<number | null>(null);
  const [pendingOperation, setPendingOperation] = useState<'create' | 'guess' | 'makePublic' | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  useEffect(() => {
    if (isReady) handleLoadGames();
  }, [isReady]);

  // Track when new tx hash is available
  useEffect(() => {
    if (txHash && txHash !== lastTxHash) {
      setLastTxHash(txHash);
    }
  }, [txHash, lastTxHash]);

  // Handle tx success based on pending operation
  useEffect(() => {
    if (!isTxSuccess || !txHash || txHash !== lastTxHash || !pendingOperation) return;

    const handleTxSuccess = async () => {
      console.log("TX Success! Operation:", pendingOperation, "Hash:", txHash);

      if (pendingOperation === 'create') {
        setMessage("SYSTEM: Game initialized successfully.");
        setBombPosition(null);
        setIsProcessing(false);
        setPendingOperation(null);
        handleLoadGames();
        refetchNextGameId();
      } else if (pendingOperation === 'guess' && pendingGuessCell !== null && currentGame) {
        setMessage("Zama FHE: Decrypting result...");
        
        // Wait a bit for blockchain state to update
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Retry loop to wait for state to be updated on-chain
        let attempts = 0;
        const maxAttempts = 10;
        let isBomb = false;
        let exists = false;
        
        while (attempts < maxAttempts) {
          try {
            const result = await getLastResultPlaintext(currentGame.gameId);
            console.log(`Attempt ${attempts + 1} - Plaintext result:`, result, "cellToGuess:", pendingGuessCell);
            
            // Also check bomb position for debug
            const bombPos = await getBombPlaintext(currentGame.gameId);
            console.log("Bomb position in contract:", bombPos, "Guessed cell:", pendingGuessCell);
            
            if (result.exists) {
              isBomb = result.isBomb;
              exists = result.exists;
              console.log("Result found! isBomb:", isBomb);
              break;
            }
          } catch (e) {
            console.error("Error fetching result:", e);
          }
          
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        if (!exists) {
          setMessage("ERROR: Sync failed. Refresh required.");
          setPendingGuessCell(null);
          setPendingOperation(null);
          setIsProcessing(false);
          return;
        }
        
        // Update UI based on plaintext result
        const cellGuessed = pendingGuessCell;
        const newGuessed = [...guessedCells];
        newGuessed[cellGuessed] = true;
        setGuessedCells(newGuessed);
        
        if (isBomb) {
          console.log("BOMB HIT at cell", cellGuessed);
          setIsGameOver(true);
          setRevealedBomb(cellGuessed);
          setMessage(`CRITICAL FAILURE! Bomb detonated at sector ${cellGuessed}.`);
        } else {
          console.log("SAFE at cell", cellGuessed);
          const newSafeCount = safeCount + 1;
          setSafeCount(newSafeCount);
          setSelectedCell(null);
          
          if (newSafeCount >= 8) {
            setIsGameOver(true);
            setMessage(`MISSION ACCOMPLISHED! All sectors cleared.`);
          } else {
            setMessage(`SAFE! +${currentGame.rewardPerSafeCell.toString()} pts acquired.`);
          }
        }
        
        setPendingGuessCell(null);
        setPendingOperation(null);
        setIsProcessing(false);
      } else if (pendingOperation === 'makePublic' && currentGame) {
        setMessage("Syncing Zama FHEVM state...");
        
        // Wait a bit for blockchain state to update
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Refresh game meta
        const updatedMeta = await getGameMeta(currentGame.gameId);
        if (updatedMeta) {
          setCurrentGame(updatedMeta);
          if (!updatedMeta.active) {
            setIsGameOver(true);
          }
        }
        
        setMessage("Game terminated. Reveal sequence available.");
        setPendingOperation(null);
        setIsProcessing(false);
      }
    };

    handleTxSuccess();
  }, [isTxSuccess, txHash, lastTxHash, pendingOperation]);

  useEffect(() => {
    if (writeError) {
      setMessage(`ERROR: ${writeError.message}`);
      setIsProcessing(false);
      setPendingGuessCell(null);
      setPendingOperation(null);
    }
  }, [writeError]);

  const handleLoadGames = useCallback(async () => {
    if (!isReady) return;
    setIsLoadingGames(true);
    try {
      const loadedGames = await loadGames();
      setGames(loadedGames);
    } catch (error) {
      setMessage(`Failed to load games: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoadingGames(false);
    }
  }, [isReady, loadGames]);

  const handleCreateGame = async () => {
    if (bombPosition === null) {
      setMessage("WARNING: Select bomb coordinates.");
      return;
    }
    setIsProcessing(true);
    setPendingOperation('create');
    setMessage("FHE encrypting bomb position...");
    console.log("Creating game with bomb at position:", bombPosition);
    try {
      await createGame(BigInt(reward), bombPosition);
      setMessage("Broadcasting encrypted tx via Zama FHEVM...");
    } catch (error) {
      setMessage(`Failed: ${error instanceof Error ? error.message : String(error)}`);
      setIsProcessing(false);
      setPendingOperation(null);
    }
  };

  const handleSelectGame = async (gameId: string) => {
    setSelectedCell(null);
    setGuessedCells(Array(9).fill(false));
    setSafeCount(0);
    setIsGameOver(false);
    setRevealedBomb(null);
    
    const meta = await getGameMeta(BigInt(gameId));
    setCurrentGame(meta);
    
    // Get bomb position
    let bombPos: number | null = null;
    try {
      bombPos = await getBombPlaintext(BigInt(gameId));
      console.log("=== DEBUG: Game", gameId, "has bomb at position:", bombPos, "===");
    } catch (e) {
      console.log("Could not get bomb position");
    }
    
    if (address && meta) {
      const playerState = await getPlayerState(BigInt(gameId), address);
      if (playerState) {
        setGuessedCells(playerState.guessedCells);
        
        // Check if player already hit the bomb
        if (bombPos !== null && playerState.guessedCells[bombPos]) {
          // Player has guessed the bomb cell - they hit the bomb!
          setRevealedBomb(bombPos);
          setIsGameOver(true);
          // Count safe cells (guessed cells minus the bomb)
          const safeCellCount = playerState.guessedCells.filter((g, idx) => g && idx !== bombPos).length;
          setSafeCount(safeCellCount);
          console.log("Player already hit bomb at cell", bombPos);
        } else {
          // Count all guessed cells as safe (player hasn't hit bomb yet)
          setSafeCount(playerState.guessCount);
        }
      }
      
      if (!meta.active) {
        setIsGameOver(true);
      }
    }
    
    setActiveTab('play');
  };

  const handleGuessCell = async () => {
    if (!currentGame || selectedCell === null) {
      setMessage("WARNING: Select target sector.");
      return;
    }
    if (guessedCells[selectedCell]) {
      setMessage("WARNING: Sector already cleared.");
      return;
    }
    if (isGameOver) {
      setMessage("STATUS: Mission Terminated.");
      return;
    }
    
    const cellToGuess = selectedCell;
    setIsProcessing(true);
    setPendingGuessCell(cellToGuess);
    setPendingOperation('guess');
    setMessage("Submitting FHE guess to Zama...");
    console.log("Guessing cell:", cellToGuess, "for game:", currentGame.gameId.toString());
    
    try {
      // Submit guess to blockchain
      await guessCell(currentGame.gameId, cellToGuess);
      setMessage("Awaiting Zama FHEVM decryption...");
      
    } catch (error) {
      setMessage(`Failed: ${error instanceof Error ? error.message : String(error)}`);
      setPendingGuessCell(null);
      setPendingOperation(null);
      setIsProcessing(false);
    }
  };

  const handleMakePublic = async () => {
    if (!currentGame) return;
    setIsProcessing(true);
    setPendingOperation('makePublic');
    setMessage("Ending game via Zama FHEVM...");
    try {
      await makeGamePublic(currentGame.gameId);
      setMessage("Broadcasting end signal to Zama...");
    } catch (error) {
      setMessage(`Failed: ${error instanceof Error ? error.message : String(error)}`);
      setPendingOperation(null);
      setIsProcessing(false);
    }
  };

  const handleRevealBomb = async () => {
    if (!currentGame) return;
    setIsProcessing(true);
    setMessage("Requesting FHE decryption from Zama...");
    try {
      const bombIndex = await publicDecryptBomb(currentGame.gameId);
      if (bombIndex !== null) {
        setRevealedBomb(bombIndex);
        setMessage(`Bomb located at sector ${bombIndex}.`);
      } else {
        setMessage("Decryption failed.");
      }
    } catch (error) {
      setMessage(`Failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Render Login Screen
  if (!isConnected) {
    return (
      <div className="glass-panel p-10 max-w-md mx-auto text-center cyber-border">
        <div className="text-6xl mb-6 animate-pulse">💣</div>
        <h2 className="text-4xl font-bold text-white mb-3 tracking-widest text-glow">
          CARD<span className="text-cyan-400">BOMB</span>
        </h2>
        <p className="text-slate-400 mb-8 uppercase tracking-widest text-xs">Secure Connection Required</p>
        <div className="flex justify-center">
          <RainbowKitCustomConnectButton />
        </div>
      </div>
    );
  }

  // Main Interface
  return (
    <div className="glass-panel p-4 md:p-6 max-w-6xl mx-auto relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
      <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50"></div>
      
      {/* Header Row - Compact */}
      <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]">◈</span>
          <h2 className="text-xl font-bold text-white tracking-widest text-glow">
            CARD<span className="text-cyan-400">BOMB</span>
          </h2>
        </div>
        
        {/* Tabs inline with header */}
        <div className="flex gap-0.5 bg-slate-900/50 p-0.5 border border-slate-800">
          {[
            { id: 'list', label: 'MISSIONS', icon: '▤' },
            { id: 'create', label: 'NEW', icon: '✚' },
            { id: 'play', label: 'PLAY', icon: '▶' }
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 font-bold text-xs tracking-wider transition-all duration-200 ${
                activeTab === tab.id 
                  ? 'bg-cyan-900 text-cyan-400 border-b border-cyan-400' 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span className="mr-1 opacity-70">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
        
        <div className={`px-2 py-1 text-[10px] font-bold tracking-wider uppercase ${
          status === 'ready' 
            ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/50' 
            : 'bg-amber-900/30 text-amber-400 border border-amber-500/50'
        }`}>
          <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${status === 'ready' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}></span>
          {status === 'ready' ? 'ONLINE' : 'INIT'}
        </div>
      </div>

      {/* Console Output - More compact */}
      <div className={`mb-4 p-2 border-l-2 font-mono text-xs transition-all duration-300 ${
        !message ? 'hidden' : 
        message.includes('Failed') || message.includes('Error') || message.includes('FAILURE') 
          ? 'bg-red-950/30 border-red-500 text-red-400' 
          : message.includes('WIN') || message.includes('ACCOMPLISHED') || message.includes('SAFE')
            ? 'bg-emerald-950/30 border-emerald-500 text-emerald-400' 
            : 'bg-slate-900/50 border-cyan-500 text-cyan-400'
      }`}>
        <span className="uppercase tracking-wide">{message}</span>
      </div>

      <div className="relative">
        {/* Background grid line effect */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>

        {/* List Tab */}
        {activeTab === 'list' && (
          <div className="animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest border-l-2 border-cyan-500 pl-2">Missions</h3>
              <button 
                onClick={handleLoadGames} 
                disabled={isLoadingGames} 
                className="px-2 py-1 text-xs border border-slate-700 hover:border-cyan-500 text-slate-400 hover:text-cyan-400 bg-transparent"
              >
                <span className={isLoadingGames ? 'animate-spin inline-block mr-1' : 'inline-block mr-1'}>↻</span>
                {isLoadingGames ? 'SYNC' : 'REFRESH'}
              </button>
            </div>
            
            {/* Skeleton Loader */}
            {isLoadingGames && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {[1, 2].map(i => (
                  <div key={i} className="bg-slate-900/60 border border-slate-800 h-24 animate-pulse"></div>
                ))}
              </div>
            )}
            
            {/* Empty State */}
            {!isLoadingGames && games.length === 0 && (
              <div className="bg-slate-900/60 border border-slate-800 text-center py-12">
                <div className="text-4xl mb-3 opacity-30">👾</div>
                <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-4">No Active Operations</p>
                <button 
                  onClick={() => setActiveTab('create')} 
                  className="px-4 py-2 text-xs bg-cyan-600 hover:bg-cyan-500 text-black border-none"
                >
                  NEW OP
                </button>
              </div>
            )}
            
            {/* Games List - 2 Column Grid like Create Tab */}
            {!isLoadingGames && games.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {games.map(game => (
                  <div 
                    key={game.gameId.toString()} 
                    className="group relative bg-slate-900/60 border border-slate-800 p-4 hover:border-cyan-500/50 transition-all duration-200"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-slate-800 group-hover:bg-cyan-500 transition-colors"></div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="text-cyan-400 font-mono text-lg">#{game.gameId.toString().padStart(2, '0')}</span>
                        {game.active && <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>}
                        <span className="text-[10px] text-slate-500 font-mono">{game.creator.slice(0, 6)}...{game.creator.slice(-4)}</span>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <span className="text-xl font-bold text-purple-400 font-mono">{game.rewardPerSafeCell.toString()}<span className="text-xs text-slate-600 ml-1">pts</span></span>
                        <button 
                          onClick={() => handleSelectGame(game.gameId.toString())} 
                          className="px-4 py-2 text-xs bg-transparent border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500 hover:text-black transition-all"
                        >
                          PLAY
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Tab - Equal Width Boxes */}
        {activeTab === 'create' && (
          <div className="animate-in fade-in duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left - Config */}
              <div className="bg-slate-900/60 border border-slate-800 p-4 flex flex-col justify-between">
                <div>
                  <label className="block text-[10px] font-bold text-cyan-500 mb-2 uppercase tracking-widest">
                    Reward / Cell
                  </label>
                  <div className="relative flex items-center">
                    <input 
                      type="number" 
                      value={reward} 
                      onChange={e => setReward(e.target.value)}
                      className="w-full bg-transparent border-b border-slate-700 text-2xl font-mono text-white py-1 focus:outline-none focus:border-cyan-500" 
                      min="1" 
                      placeholder="00"
                    />
                    <span className="absolute right-0 text-slate-500 font-mono text-xs">PTS</span>
                  </div>
                </div>
                
                <div className="mt-4">
                  <button 
                    onClick={handleCreateGame} 
                    disabled={isProcessing || bombPosition === null}
                    className={`w-full py-3 font-bold text-sm tracking-widest uppercase border transition-all ${
                      isProcessing || bombPosition === null
                        ? 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                        : 'bg-cyan-900/20 text-cyan-400 border-cyan-500 hover:bg-cyan-500 hover:text-black'
                    }`}
                  >
                    {isProcessing ? 'PROCESSING...' : 'EXECUTE'}
                  </button>
                  <p className="text-[10px] text-slate-600 text-center mt-2">
                    {bombPosition !== null ? `BOMB: SECTOR ${bombPosition + 1}` : 'SELECT BOMB LOCATION'}
                  </p>
                </div>
              </div>
              
              {/* Right - Grid */}
              <div className="bg-slate-900/60 border border-slate-800 p-4 flex items-center justify-center">
                <CardGrid 
                  selectedIndices={bombPosition !== null ? [bombPosition] : []} 
                  onCellClick={(idx) => setBombPosition(idx)} 
                  disabled={isProcessing}
                  title="BOMB LOCATION"
                />
              </div>
            </div>
          </div>
        )}

        {/* Play Tab - Compact Horizontal */}
        {activeTab === 'play' && currentGame && (
          <div className="animate-in fade-in duration-300">
            {/* Game Header - Inline */}
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="text-cyan-400 font-mono text-lg">#{currentGame.gameId.toString().padStart(2, '0')}</span>
                <div className={`px-2 py-0.5 text-[10px] font-bold uppercase ${
                  currentGame.active 
                    ? 'text-emerald-400 border border-emerald-500/50' 
                    : 'text-slate-500 border border-slate-600'
                }`}>
                  {currentGame.active ? '● LIVE' : '○ END'}
                </div>
              </div>
              <p className="text-[10px] text-slate-500 font-mono">{currentGame.creator.slice(0, 8)}...{currentGame.creator.slice(-4)}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Left - Stats */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-900/50 border border-slate-800 p-3 text-center">
                    <p className="text-[10px] text-slate-500 uppercase">Bounty</p>
                    <p className="text-xl font-mono text-purple-400">{currentGame.rewardPerSafeCell.toString()}</p>
                  </div>
                  <div className="bg-slate-900/50 border border-slate-800 p-3 text-center">
                    <p className="text-[10px] text-slate-500 uppercase">Cleared</p>
                    <p className="text-xl font-mono text-emerald-400">{safeCount}<span className="text-xs text-slate-600">/8</span></p>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="h-1.5 bg-slate-800 w-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${(safeCount / 8) * 100}%` }}
                  />
                </div>

                {/* Action Buttons */}
                {currentGame.active && !isGameOver && (
                  <button 
                    onClick={handleGuessCell} 
                    disabled={isProcessing || selectedCell === null}
                    className={`w-full py-3 font-bold text-sm tracking-widest uppercase border transition-all ${
                      isProcessing || selectedCell === null
                        ? 'bg-slate-900 text-slate-700 border-slate-800 cursor-not-allowed'
                        : 'bg-cyan-600 text-black border-cyan-400 hover:bg-cyan-400'
                    }`}
                  >
                    {isProcessing ? 'WAIT...' : selectedCell !== null ? `SECTOR ${selectedCell + 1}` : 'SELECT'}
                  </button>
                )}
                
                {currentGame.creator.toLowerCase() === address?.toLowerCase() && currentGame.active && (
                  <button 
                    onClick={handleMakePublic} 
                    disabled={isProcessing}
                    className="w-full py-2 text-xs text-amber-500 border border-amber-500/30 hover:bg-amber-900/20 uppercase"
                  >
                    END GAME
                  </button>
                )}
                
                {!currentGame.active && (
                  <button 
                    onClick={handleRevealBomb} 
                    disabled={isProcessing}
                    className="w-full py-2 text-sm text-red-500 border border-red-500/50 hover:bg-red-900/30 uppercase"
                  >
                    REVEAL
                  </button>
                )}

                {/* Game Over */}
                {isGameOver && (
                  <div className={`p-3 border text-center ${
                    safeCount >= 8 ? 'border-emerald-500 bg-emerald-900/20' : 'border-red-500 bg-red-900/20'
                  }`}>
                    <p className={`font-bold text-lg uppercase ${safeCount >= 8 ? 'text-emerald-400' : 'text-red-500'}`}>
                      {safeCount >= 8 ? 'SUCCESS' : 'FAILED'}
                    </p>
                  </div>
                )}
              </div>

              {/* Center & Right - Game Grid (spans 2 cols) */}
              <div className="lg:col-span-2 flex flex-col items-center justify-center bg-slate-900/30 border border-slate-800 p-4">
                <CardGrid 
                  selectedIndices={selectedCell !== null && !guessedCells[selectedCell] ? [selectedCell] : []}
                  onCellClick={(idx) => !isGameOver && !guessedCells[idx] && setSelectedCell(idx)}
                  disabled={!currentGame.active || isGameOver}
                  guessedCells={guessedCells}
                  revealedBombs={revealedBomb !== null ? [revealedBomb] : undefined}
                  isGuessMode
                />
                
                {/* Legend */}
                <div className="flex gap-4 mt-4 text-[9px] uppercase tracking-wider text-slate-500">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 border border-emerald-500 bg-emerald-900/50"></span>
                    <span>Safe</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 border border-red-500 bg-red-900/50"></span>
                    <span>Bomb</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 border border-purple-500 bg-purple-900/50"></span>
                    <span>Selected</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No Game Selected */}
        {activeTab === 'play' && !currentGame && (
          <div className="flex flex-col items-center justify-center py-16 border border-dashed border-slate-800 bg-slate-900/20">
            <div className="text-4xl mb-3 opacity-20">◈</div>
            <p className="text-slate-500 uppercase tracking-widest text-xs font-bold mb-4">No Mission Selected</p>
            <button 
              onClick={() => setActiveTab('list')} 
              className="px-4 py-2 text-xs border border-cyan-500 text-cyan-400 hover:bg-cyan-500 hover:text-black"
            >
              SELECT MISSION
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
