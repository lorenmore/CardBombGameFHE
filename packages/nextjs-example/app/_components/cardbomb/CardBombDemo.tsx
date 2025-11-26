"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/helper/RainbowKitCustomConnectButton";
import { useCardBombGame, GameMeta } from "~~/hooks/cardbomb";
import { CardGrid } from "./CardGrid";

export function CardBombDemo() {
  const { isConnected, address } = useAccount();
  
  const {
    status, isReady,
    txHash, isTxSuccess, writeError,
    refetchNextGameId, loadGames, createGame, guessCell,
    makeGamePublic, getGameMeta, getPlayerState,
    publicDecryptBomb,
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
        setMessage("Game created successfully!");
        setBombPosition(null);
        setIsProcessing(false);
        setPendingOperation(null);
        handleLoadGames();
        refetchNextGameId();
      } else if (pendingOperation === 'guess' && pendingGuessCell !== null && currentGame) {
        setMessage("Getting result...");
        
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
          setMessage("Could not fetch result. Please refresh.");
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
          setMessage(`BOOM! You hit the bomb at cell ${cellGuessed}! Game Over!`);
        } else {
          console.log("SAFE at cell", cellGuessed);
          const newSafeCount = safeCount + 1;
          setSafeCount(newSafeCount);
          setSelectedCell(null);
          
          if (newSafeCount >= 8) {
            setIsGameOver(true);
            setMessage(`YOU WIN! All 8 safe cells found!`);
          } else {
            setMessage(`SAFE! +${currentGame.rewardPerSafeCell.toString()} pts. (${newSafeCount}/8 safe cells)`);
          }
        }
        
        setPendingGuessCell(null);
        setPendingOperation(null);
        setIsProcessing(false);
      } else if (pendingOperation === 'makePublic' && currentGame) {
        setMessage("Refreshing game state...");
        
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
        
        setMessage("Game ended! Click 'Reveal Bomb' to see position.");
        handleLoadGames(); // Refresh game list
        setPendingOperation(null);
        setIsProcessing(false);
      }
    };

    handleTxSuccess();
  }, [isTxSuccess, txHash, lastTxHash, pendingOperation]);

  useEffect(() => {
    if (writeError) {
      setMessage(`Error: ${writeError.message}`);
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

  // Auto-load games on mount and when ready/connected
  useEffect(() => {
    if (isReady && isConnected) {
      handleLoadGames();
    }
  }, [isReady, isConnected, handleLoadGames]);

  const handleCreateGame = async () => {
    if (bombPosition === null) {
      setMessage("Please select bomb position");
      return;
    }
    setIsProcessing(true);
    setPendingOperation('create');
    setMessage("Creating game...");
    console.log("Creating game with bomb at position:", bombPosition);
    try {
      await createGame(BigInt(reward), bombPosition);
      setMessage("Transaction submitted...");
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
    } catch {
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
      setMessage("Please select a cell to guess");
      return;
    }
    if (guessedCells[selectedCell]) {
      setMessage("Cell already guessed!");
      return;
    }
    if (isGameOver) {
      setMessage("Game is over!");
      return;
    }
    
    const cellToGuess = selectedCell;
    setIsProcessing(true);
    setPendingGuessCell(cellToGuess);
    setPendingOperation('guess');
    setMessage("Submitting guess...");
    console.log("Guessing cell:", cellToGuess, "for game:", currentGame.gameId.toString());
    
    try {
      // Submit guess to blockchain
      await guessCell(currentGame.gameId, cellToGuess);
      setMessage("Transaction submitted... waiting for confirmation...");
      
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
    setMessage("Ending game...");
    try {
      await makeGamePublic(currentGame.gameId);
      setMessage("Transaction submitted... waiting for confirmation...");
    } catch (error) {
      setMessage(`Failed: ${error instanceof Error ? error.message : String(error)}`);
      setPendingOperation(null);
      setIsProcessing(false);
    }
  };

  const handleRevealBomb = async () => {
    if (!currentGame) return;
    setIsProcessing(true);
    setMessage("Decrypting bomb position...");
    try {
      const bombIndex = await publicDecryptBomb(currentGame.gameId);
      if (bombIndex !== null) {
        setRevealedBomb(bombIndex);
        setMessage(`Bomb was at cell ${bombIndex}!`);
      } else {
        setMessage("Could not decrypt bomb position.");
      }
    } catch (error) {
      setMessage(`Failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="bg-gradient-to-br from-white to-slate-50 rounded-3xl shadow-xl p-10 max-w-md mx-auto text-center border border-slate-100">
        <div className="text-6xl mb-6">💣</div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-rose-500 bg-clip-text text-transparent mb-3">
          Card Bomb Game
        </h2>
        <p className="text-slate-500 mb-8">Connect your wallet to start playing</p>
        <RainbowKitCustomConnectButton />
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-white to-slate-50 rounded-3xl shadow-xl p-8 max-w-4xl mx-auto border border-slate-100">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <span className="text-4xl">💣</span>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-rose-500 bg-clip-text text-transparent">
            Card Bomb Game
          </h2>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
          status === 'ready' 
            ? 'bg-emerald-100 text-emerald-700' 
            : 'bg-amber-100 text-amber-700'
        }`}>
          <span className={`w-2 h-2 rounded-full ${status === 'ready' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
          {status === 'ready' ? 'Ready' : 'Loading'}
        </div>
      </div>

      {/* Message Toast */}
      {message && (
        <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 ${
          message.includes('Failed') || message.includes('Error') || message.includes('BOOM') 
            ? 'bg-red-50 text-red-700 border border-red-200' 
            : message.includes('WIN') || message.includes('SAFE') 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
              : 'bg-violet-50 text-violet-700 border border-violet-200'
        }`}>
          <span className="text-xl">
            {message.includes('BOOM') ? '💥' : message.includes('WIN') ? '🎉' : message.includes('SAFE') ? '✅' : 'ℹ️'}
          </span>
          <span className="font-medium">{message}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-8 p-1.5 bg-slate-100 rounded-2xl w-fit">
        {[
          { id: 'list', label: 'Games', icon: '🎮' },
          { id: 'create', label: 'Create', icon: '✨' },
          { id: 'play', label: 'Play', icon: '🎯' }
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => {
              setActiveTab(tab.id as any);
              if (tab.id === 'list') handleLoadGames();
            }}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 ${
              activeTab === tab.id 
                ? 'bg-white text-slate-900 shadow-md' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="min-h-[400px]">
        {/* List Tab */}
        {activeTab === 'list' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Available Games</h3>
              <button 
                onClick={handleLoadGames} 
                disabled={isLoadingGames} 
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 disabled:opacity-50 transition-all duration-200 flex items-center gap-2"
              >
                <span className={isLoadingGames ? 'animate-spin' : ''}>🔄</span>
                {isLoadingGames ? 'Loading...' : 'Refresh'}
              </button>
            </div>
            
            {/* Skeleton Loader */}
            {isLoadingGames && (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-slate-50 rounded-2xl p-5 animate-pulse border border-slate-100">
                    <div className="flex justify-between items-center">
                      <div className="space-y-3">
                        <div className="h-5 w-28 bg-slate-200 rounded-lg"></div>
                        <div className="h-4 w-36 bg-slate-200 rounded-lg"></div>
                        <div className="h-4 w-32 bg-slate-200 rounded-lg"></div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="h-7 w-20 bg-slate-200 rounded-full"></div>
                        <div className="h-11 w-20 bg-slate-200 rounded-xl"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Empty State */}
            {!isLoadingGames && games.length === 0 && (
              <div className="text-center py-16 px-8 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <div className="text-6xl mb-4">🎮</div>
                <p className="text-slate-700 text-xl font-semibold mb-2">No games yet</p>
                <p className="text-slate-500 mb-6">Create your first game to start playing!</p>
                <button 
                  onClick={() => setActiveTab('create')} 
                  className="px-8 py-3 bg-gradient-to-r from-violet-500 to-rose-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-violet-200 transition-all duration-200"
                >
                  Create Game
                </button>
              </div>
            )}
            
            {/* Games List */}
            {!isLoadingGames && games.length > 0 && (
              <div className="space-y-4">
                {games.map(game => (
                  <div 
                    key={game.gameId.toString()} 
                    className="bg-white border border-slate-100 rounded-2xl p-5 flex justify-between items-center hover:border-violet-200 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-violet-100 to-rose-100 rounded-xl flex items-center justify-center text-xl">
                        🎯
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">Game #{game.gameId.toString()}</p>
                        <p className="text-sm text-slate-500">by {game.creator.slice(0, 6)}...{game.creator.slice(-4)}</p>
                        <p className="text-sm text-slate-400">{game.rewardPerSafeCell.toString()} pts/safe cell</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                        game.active 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {game.active ? '● Live' : 'Ended'}
                      </span>
                      <button 
                        onClick={() => handleSelectGame(game.gameId.toString())} 
                        className="px-5 py-2.5 bg-gradient-to-r from-violet-500 to-violet-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-violet-200 transition-all duration-200"
                      >
                        Play
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Tab */}
        {activeTab === 'create' && (
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Create New Game</h3>
              <p className="text-slate-500">Set up your bomb position and reward</p>
            </div>
            
            <div className="space-y-8">
              {/* Reward Input */}
              <div className="bg-slate-50 rounded-2xl p-6">
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  🏆 Reward per Safe Cell
                </label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={reward} 
                    onChange={e => setReward(e.target.value)}
                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-xl text-lg font-medium focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition-all" 
                    min="1" 
                    placeholder="10"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">pts</span>
                </div>
              </div>
              
              {/* Bomb Position */}
              <div className="bg-slate-50 rounded-2xl p-6">
                <label className="block text-sm font-semibold text-slate-700 mb-4">
                  💣 Place Your Bomb
                </label>
                <div className="flex justify-center">
                  <CardGrid 
                    selectedIndices={bombPosition !== null ? [bombPosition] : []} 
                    onCellClick={(idx) => setBombPosition(idx)} 
                    disabled={isProcessing}
                    title="Click a cell to hide the bomb"
                  />
                </div>
              </div>
              
              {/* Create Button */}
              <button 
                onClick={handleCreateGame} 
                disabled={isProcessing || bombPosition === null}
                className={`w-full py-4 rounded-2xl font-bold text-lg transition-all duration-300 ${
                  isProcessing || bombPosition === null
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-violet-500 to-rose-500 text-white hover:shadow-xl hover:shadow-violet-200 hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⏳</span> Creating...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    ✨ Create Game
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Play Tab */}
        {activeTab === 'play' && currentGame && (
          <div>
            {/* Game Header */}
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-violet-100 to-rose-100 rounded-xl flex items-center justify-center text-xl">
                  🎯
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Game #{currentGame.gameId.toString()}</h3>
                  <p className="text-sm text-slate-500">by {currentGame.creator.slice(0, 6)}...{currentGame.creator.slice(-4)}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                  currentGame.active 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {currentGame.active ? '● Live' : 'Ended'}
                </span>
                {isGameOver && (
                  <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                    Game Over
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Panel - Info & Actions */}
              <div className="space-y-6">
                {/* Stats Card */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-6 rounded-2xl">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-xl text-center">
                      <p className="text-3xl font-bold text-violet-600">{currentGame.rewardPerSafeCell.toString()}</p>
                      <p className="text-xs text-slate-500 mt-1">pts/safe cell</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl text-center">
                      <p className="text-3xl font-bold text-emerald-600">{safeCount}<span className="text-slate-300">/8</span></p>
                      <p className="text-xs text-slate-500 mt-1">safe found</p>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
                        style={{ width: `${(safeCount / 8) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {currentGame.active && !isGameOver && (
                    <button 
                      onClick={handleGuessCell} 
                      disabled={isProcessing || selectedCell === null}
                      className={`w-full py-4 rounded-2xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                        isProcessing || selectedCell === null
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-violet-500 to-violet-600 text-white hover:shadow-lg hover:shadow-violet-200'
                      }`}
                    >
                      {isProcessing ? (
                        <>
                          <span className="animate-spin">⏳</span> Processing...
                        </>
                      ) : (
                        <>
                          🎯 Guess Cell {selectedCell !== null ? selectedCell + 1 : '?'}
                        </>
                      )}
                    </button>
                  )}
                  
                  {currentGame.creator.toLowerCase() === address?.toLowerCase() && currentGame.active && (
                    <button 
                      onClick={handleMakePublic} 
                      disabled={isProcessing}
                      className="w-full py-3 rounded-xl font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-all disabled:opacity-50"
                    >
                      🛑 End Game
                    </button>
                  )}
                  
                  {!currentGame.active && (
                    <button 
                      onClick={handleRevealBomb} 
                      disabled={isProcessing}
                      className="w-full py-4 rounded-2xl font-bold bg-gradient-to-r from-rose-500 to-red-500 text-white hover:shadow-lg hover:shadow-rose-200 transition-all disabled:opacity-50"
                    >
                      💣 Reveal Bomb
                    </button>
                  )}
                </div>

                {/* Game Over Banner */}
                {isGameOver && (() => {
                  const hitBomb = revealedBomb !== null && guessedCells[revealedBomb];
                  const clearedAll = safeCount >= 8;
                  
                  return (
                    <div className={`p-6 rounded-2xl text-center ${
                      hitBomb ? 'bg-gradient-to-br from-red-50 to-red-100 border border-red-200' :
                      clearedAll ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200' :
                      'bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200'
                    }`}>
                      <div className="text-5xl mb-3">
                        {hitBomb ? '💥' : clearedAll ? '🎉' : '🛡️'}
                      </div>
                      <p className={`font-bold text-2xl ${
                        hitBomb ? 'text-red-700' : clearedAll ? 'text-emerald-700' : 'text-amber-700'
                      }`}>
                        {hitBomb ? 'GAME OVER' : clearedAll ? 'YOU WIN!' : 'SURVIVED'}
                      </p>
                      <p className={`text-sm mt-1 ${
                        hitBomb ? 'text-red-600' : clearedAll ? 'text-emerald-600' : 'text-amber-600'
                      }`}>
                        {safeCount} safe cells found
                      </p>
                    </div>
                  );
                })()}
              </div>

              {/* Right Panel - Game Grid */}
              <div className="flex flex-col items-center justify-center">
                <p className="text-sm text-slate-500 mb-6 text-center">
                  {isGameOver 
                    ? 'Game finished! Check the results.' 
                    : 'Tap a cell to select, then click Guess'}
                </p>
                <CardGrid 
                  selectedIndices={selectedCell !== null && !guessedCells[selectedCell] ? [selectedCell] : []}
                  onCellClick={(idx) => !isGameOver && !guessedCells[idx] && setSelectedCell(idx)}
                  disabled={!currentGame.active || isGameOver}
                  guessedCells={guessedCells}
                  revealedBombs={revealedBomb !== null ? [revealedBomb] : undefined}
                  isGuessMode
                />
                
                {/* Legend */}
                <div className="flex gap-4 mt-6 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded bg-gradient-to-br from-emerald-400 to-emerald-600"></span>
                    <span>Safe</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded bg-gradient-to-br from-red-400 to-red-600"></span>
                    <span>Bomb</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded bg-gradient-to-br from-violet-400 to-violet-600"></span>
                    <span>Selected</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No Game Selected */}
        {activeTab === 'play' && !currentGame && (
          <div className="text-center py-16 px-8 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            <div className="text-6xl mb-4">🎯</div>
            <p className="text-slate-700 text-xl font-semibold mb-2">No game selected</p>
            <p className="text-slate-500 mb-6">Choose a game from the list to start playing</p>
            <button 
              onClick={() => setActiveTab('list')} 
              className="px-8 py-3 bg-gradient-to-r from-violet-500 to-rose-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-violet-200 transition-all duration-200"
            >
              Browse Games
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
