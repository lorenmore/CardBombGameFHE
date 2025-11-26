"use client";

import { useCallback, useMemo, useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useFHEVM, useFHEVMSignature, useFHEDecrypt, useInMemoryStorage, logger } from "@fhevm/sdk/react";
import { ethers } from "ethers";
import { getContractConfig } from "~~/contracts";

export interface GameMeta {
  gameId: bigint;
  creator: string;
  rewardPerSafeCell: bigint;
  active: boolean;
}

export interface PlayerGameState {
  guessCount: number;
  hasLastResult: boolean;
  guessedCells: boolean[];
}

export interface DecryptedPlayerState {
  isSafe: boolean | null;
  score: bigint | null;
}

export function useCardBombGame() {
  const { isConnected, chain, address } = useAccount();
  const chainId = chain?.id;

  const cardBombConfig = getContractConfig('CardBombGameFHE');

  // Public RPC - no API key required
  const fhevmConfig = useMemo(() => ({
    rpcUrl: chainId === 31337 
      ? "http://localhost:8545" 
      : "https://ethereum-sepolia-rpc.publicnode.com",
    chainId: chainId || 11155111,
    mockChains: { 31337: "http://localhost:8545" }
  }), [chainId]);

  const { instance, isInitialized: isReady, status, error: fhevmError } = useFHEVM(fhevmConfig);
  const fhevmDecryptionSignatureStorage = useFHEVMSignature();

  const ethersSigner = useMemo(() => {
    if (!isConnected || !address) return undefined;
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      return new ethers.JsonRpcSigner(provider, address);
    } catch (error) {
      logger.error('Failed to create ethers signer', error);
      return undefined;
    }
  }, [isConnected, address]);

  const { data: nextGameId, refetch: refetchNextGameId } = useReadContract({
    address: cardBombConfig.address as `0x${string}`,
    abi: cardBombConfig.abi as any,
    functionName: "nextGameId",
    query: { enabled: Boolean(cardBombConfig.address && isReady), refetchOnWindowFocus: false },
  });

  const { writeContract, data: txHash, isPending: isWritePending, error: writeError } = useWriteContract();
  const { isLoading: isWaitingForTx, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Decrypt state
  const [decryptHandles, setDecryptHandles] = useState<{ lastResult: string | null; score: string | null }>({ lastResult: null, score: null });

  // Build requests for useFHEDecrypt
  const requests = useMemo(() => {
    if (!cardBombConfig.address) return undefined;
    const requestList: { handle: string; contractAddress: `0x${string}` }[] = [];
    
    const zeroHandle = "0x0000000000000000000000000000000000000000000000000000000000000000";
    if (decryptHandles.lastResult && decryptHandles.lastResult !== zeroHandle) {
      requestList.push({ 
        handle: decryptHandles.lastResult, 
        contractAddress: cardBombConfig.address as `0x${string}` 
      });
    }
    if (decryptHandles.score && decryptHandles.score !== zeroHandle) {
      requestList.push({ 
        handle: decryptHandles.score, 
        contractAddress: cardBombConfig.address as `0x${string}` 
      });
    }
    
    return requestList.length > 0 ? requestList : undefined;
  }, [cardBombConfig.address, decryptHandles]);

  const { decrypt: performDecrypt, results: decryptResults, canDecrypt, isDecrypting } = useFHEDecrypt({
    instance,
    ethersSigner,
    fhevmDecryptionSignatureStorage: fhevmDecryptionSignatureStorage.storage,
    requests
  });

  // Load all games
  const loadGames = useCallback(async (): Promise<GameMeta[]> => {
    if (!cardBombConfig.address || nextGameId === undefined) return [];
    
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const contract = new ethers.Contract(cardBombConfig.address, cardBombConfig.abi, provider);
    
    const games: GameMeta[] = [];
    const total = Number(nextGameId);
    
    for (let i = 0; i < total; i++) {
      try {
        const [creator, rewardPerSafeCell, active] = await contract.getGameMeta(BigInt(i));
        games.push({ gameId: BigInt(i), creator, rewardPerSafeCell: BigInt(rewardPerSafeCell), active });
      } catch (error) {
        console.error(`Failed to load game ${i}:`, error);
      }
    }
    return games;
  }, [cardBombConfig.address, cardBombConfig.abi, nextGameId]);

  // Get single game meta
  const getGameMeta = useCallback(async (gameId: bigint): Promise<GameMeta | null> => {
    if (!cardBombConfig.address) return null;
    
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const contract = new ethers.Contract(cardBombConfig.address, cardBombConfig.abi, provider);
    
    try {
      const [creator, rewardPerSafeCell, active] = await contract.getGameMeta(gameId);
      return { gameId, creator, rewardPerSafeCell: BigInt(rewardPerSafeCell), active };
    } catch (error) {
      console.error(`Failed to get game ${gameId}:`, error);
      return null;
    }
  }, [cardBombConfig.address, cardBombConfig.abi]);

  // Get player state
  const getPlayerState = useCallback(async (gameId: bigint, player: string): Promise<PlayerGameState | null> => {
    if (!cardBombConfig.address) return null;
    
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const contract = new ethers.Contract(cardBombConfig.address, cardBombConfig.abi, provider);
    
    try {
      const [guessCount, hasLastResult, guessedCells] = await contract.getPlayerState(gameId, player);
      return { guessCount: Number(guessCount), hasLastResult, guessedCells: Array.from(guessedCells) };
    } catch (error) {
      console.error(`Failed to get player state:`, error);
      return null;
    }
  }, [cardBombConfig.address, cardBombConfig.abi]);

  // Create game
  const createGame = useCallback(async (rewardPerSafeCell: bigint, bombPosition: number): Promise<void> => {
    if (!instance || !cardBombConfig.address || !address) {
      throw new Error("FHEVM instance or contract not ready");
    }
    
    // Validate bomb position
    if (bombPosition < 0 || bombPosition > 8) {
      throw new Error("Bomb position must be 0-8");
    }

    console.log("Creating game with bomb position:", bombPosition);
    const input = instance.createEncryptedInput(cardBombConfig.address, address);
    input.add8(bombPosition);
    console.log("Encrypting...");
    const encrypted = await input.encrypt();
    console.log("Encrypted:", encrypted);

    const handle = '0x' + Array.from(encrypted.handles[0] as Uint8Array).map((b: number) => b.toString(16).padStart(2, '0')).join('');
    const proof = '0x' + Array.from(encrypted.inputProof as Uint8Array).map((b: number) => b.toString(16).padStart(2, '0')).join('');

    writeContract({
      address: cardBombConfig.address as `0x${string}`,
      abi: cardBombConfig.abi as any,
      functionName: "createGame",
      args: [rewardPerSafeCell, bombPosition, handle, proof], // Added plaintext bombPosition
    });
  }, [instance, cardBombConfig.address, cardBombConfig.abi, address, writeContract]);

  // Guess cell - simplified, no encryption needed for guess
  const guessCell = useCallback(async (gameId: bigint, cellIndex: number): Promise<void> => {
    if (!cardBombConfig.address) {
      throw new Error("Contract not ready");
    }
    
    // Validate cell index
    if (cellIndex < 0 || cellIndex > 8) {
      throw new Error("Cell index must be 0-8");
    }

    console.log("Guessing cell:", cellIndex, "for game:", gameId.toString());

    writeContract({
      address: cardBombConfig.address as `0x${string}`,
      abi: cardBombConfig.abi as any,
      functionName: "guessCell",
      args: [gameId, cellIndex],
    });
  }, [cardBombConfig.address, cardBombConfig.abi, writeContract]);

  // Make game public
  const makeGamePublic = useCallback(async (gameId: bigint): Promise<void> => {
    if (!cardBombConfig.address) throw new Error("Contract not ready");
    writeContract({
      address: cardBombConfig.address as `0x${string}`,
      abi: cardBombConfig.abi as any,
      functionName: "makeGamePublic",
      args: [gameId],
    });
  }, [cardBombConfig.address, cardBombConfig.abi, writeContract]);

  // Get plaintext result (for debugging/simplified flow)
  const getLastResultPlaintext = useCallback(async (gameId: bigint): Promise<{ isBomb: boolean; exists: boolean }> => {
    if (!cardBombConfig.address) throw new Error("Contract not ready");

    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(cardBombConfig.address, cardBombConfig.abi, signer);

    const [isBomb, exists] = await contract.getLastResultPlaintext(gameId);
    console.log("getLastResultPlaintext:", { isBomb, exists });
    return { isBomb, exists };
  }, [cardBombConfig.address, cardBombConfig.abi]);

  // Fetch decrypt handles
  const fetchDecryptHandles = useCallback(async (gameId: bigint): Promise<void> => {
    if (!cardBombConfig.address || !address) throw new Error("Contract or address not ready");

    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(cardBombConfig.address, cardBombConfig.abi, signer);

    const [lastResultHandle, exists] = await contract.getLastResult(gameId);
    const scoreHandle = await contract.getEncryptedScore(address);

    setDecryptHandles({ lastResult: exists ? lastResultHandle : null, score: scoreHandle });
  }, [cardBombConfig.address, cardBombConfig.abi, address]);

  // Decrypt player state
  const decryptPlayerState = useCallback(async (): Promise<DecryptedPlayerState> => {
    if (!canDecrypt) throw new Error("Cannot decrypt - call fetchDecryptHandles first");

    await performDecrypt();
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log("=== DECRYPT DEBUG ===");
    console.log("decryptHandles:", decryptHandles);
    console.log("decryptResults:", decryptResults);

    let isSafe: boolean | null = null;
    if (decryptHandles.lastResult && decryptResults?.[decryptHandles.lastResult] !== undefined) {
      const rawValue = decryptResults[decryptHandles.lastResult];
      console.log("lastResult raw value:", rawValue, "type:", typeof rawValue);
      // NEW: rawValue = isBomb (true/1 = hit bomb, false/0 = safe)
      let hitBomb: boolean;
      if (typeof rawValue === 'bigint') hitBomb = rawValue !== 0n;
      else if (typeof rawValue === 'boolean') hitBomb = rawValue;
      else hitBomb = Number(rawValue) !== 0;
      isSafe = !hitBomb;
      console.log("hitBomb:", hitBomb, "isSafe:", isSafe);
    }

    const score = decryptHandles.score && decryptResults?.[decryptHandles.score] !== undefined
      ? BigInt(decryptResults[decryptHandles.score] as bigint | number)
      : null;

    console.log("Final result - isSafe:", isSafe, "score:", score);
    return { isSafe, score };
  }, [canDecrypt, performDecrypt, decryptHandles, decryptResults]);

  // Public decrypt bomb
  const publicDecryptBomb = useCallback(async (gameId: bigint): Promise<number | null> => {
    if (!instance || !cardBombConfig.address) throw new Error("FHEVM instance or contract not ready");

    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const contract = new ethers.Contract(cardBombConfig.address, cardBombConfig.abi, provider);

    console.log("=== PUBLIC DECRYPT BOMB ===");
    const handle = await contract.getBombHandle(gameId);
    console.log("Bomb handle:", handle);

    const results = await instance.publicDecrypt([handle]);
    console.log("publicDecrypt results:", results);

    const value = results.clearValues?.[handle] ?? results[handle] ?? results[0];
    console.log("Bomb value:", value);
    
    return value !== undefined ? Number(value) : null;
  }, [instance, cardBombConfig.address, cardBombConfig.abi]);

  // Get plaintext bomb position for debugging
  const getBombPlaintext = useCallback(async (gameId: bigint): Promise<number> => {
    if (!cardBombConfig.address) throw new Error("Contract not ready");

    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const contract = new ethers.Contract(cardBombConfig.address, cardBombConfig.abi, provider);

    const bombPos = await contract.getBombPlaintext(gameId);
    console.log("Bomb plaintext position for game", gameId.toString(), ":", Number(bombPos));
    return Number(bombPos);
  }, [cardBombConfig.address, cardBombConfig.abi]);

  return {
    status, isReady, isConnected, address, chainId, fhevmError,
    txHash, isWritePending, isWaitingForTx, isTxSuccess, writeError,
    nextGameId, refetchNextGameId, loadGames, createGame, guessCell,
    makeGamePublic, getGameMeta, getPlayerState, fetchDecryptHandles,
    decryptPlayerState, performDecrypt, publicDecryptBomb, canDecrypt, isDecrypting,
    decryptResults, decryptHandles, getLastResultPlaintext, getBombPlaintext,
  };
}

export default useCardBombGame;
