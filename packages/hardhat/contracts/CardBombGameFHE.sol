// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint8, euint64, ebool, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title CardBombGameFHE
 * @notice Grid 3x3, 1 bomb, player guesses 8 safe cells to win
 */
contract CardBombGameFHE is ZamaEthereumConfig {
    struct Game {
        address creator;
        uint64 rewardPerSafeCell;
        bool active;
        euint8 bombIndex;
        uint8 bombPlaintext; // For debugging - stores plaintext bomb position
    }

    uint256 public nextGameId;
    mapping(uint256 => Game) internal games;

    mapping(address => euint64) internal encScores;
    mapping(address => bool) internal scoreInitialized;

    struct PlayerState {
        uint8 guessCount;
        bool[9] guessedCells;
        ebool lastResultIsBomb; // encrypted: true = hit bomb, false = safe
        bool lastResultPlaintext; // plaintext: true = hit bomb, false = safe
        bool hasLastResult;
    }

    mapping(uint256 => mapping(address => PlayerState)) internal playerStates;

    event GameCreated(uint256 indexed gameId, address indexed creator, uint64 rewardPerSafeCell);
    event GuessSubmitted(uint256 indexed gameId, address indexed player, uint8 cellIndex);
    event GameMadePublic(uint256 indexed gameId, address indexed creator);

    constructor() {}

    function createGame(
        uint64 rewardPerSafeCell,
        uint8 bombPositionPlaintext, // For debugging
        externalEuint8 bombHandle,
        bytes calldata proof
    ) external returns (uint256 gameId) {
        require(bombPositionPlaintext < 9, "CardBomb: bomb must be 0-8");
        
        gameId = nextGameId++;
        Game storage g = games[gameId];
        g.creator = msg.sender;
        g.rewardPerSafeCell = rewardPerSafeCell;
        g.active = true;
        g.bombPlaintext = bombPositionPlaintext;

        euint8 bomb = FHE.fromExternal(bombHandle, proof);
        g.bombIndex = bomb;
        FHE.allowThis(bomb);
        FHE.allow(bomb, msg.sender);

        emit GameCreated(gameId, msg.sender, rewardPerSafeCell);
    }

    function guessCell(
        uint256 gameId,
        uint8 cellIndex
    ) external {
        require(cellIndex < 9, "CardBomb: cell must be 0-8");
        
        Game storage g = games[gameId];
        require(g.active, "CardBomb: game inactive");

        PlayerState storage st = playerStates[gameId][msg.sender];
        require(!st.guessedCells[cellIndex], "CardBomb: cell already guessed");

        st.guessedCells[cellIndex] = true;
        st.guessCount += 1;

        // Plaintext comparison for debugging
        bool isBombPlaintext = (cellIndex == g.bombPlaintext);
        st.lastResultPlaintext = isBombPlaintext;

        // Convert plaintext guess to encrypted and compare with bomb
        euint8 guess = FHE.asEuint8(cellIndex);
        euint8 bomb = g.bombIndex;

        // isBomb = true means player hit the bomb
        ebool isBomb = FHE.eq(guess, bomb);

        st.lastResultIsBomb = isBomb;
        st.hasLastResult = true;

        // Give reward only if NOT bomb (isBomb = false)
        euint64 rewardClear = FHE.asEuint64(g.rewardPerSafeCell);
        euint64 zero = FHE.asEuint64(0);
        ebool isSafe = FHE.not(isBomb);
        euint64 delta = FHE.select(isSafe, rewardClear, zero);

        if (!scoreInitialized[msg.sender]) {
            euint64 initialScore = FHE.asEuint64(0);
            encScores[msg.sender] = initialScore;
            scoreInitialized[msg.sender] = true;
            FHE.allowThis(initialScore);
            FHE.allow(initialScore, msg.sender);
        }

        euint64 oldScore = encScores[msg.sender];
        euint64 newScore = FHE.add(oldScore, delta);
        encScores[msg.sender] = newScore;
        FHE.allowThis(newScore);
        FHE.allow(newScore, msg.sender);

        FHE.allowThis(isBomb);
        FHE.allow(isBomb, msg.sender);

        emit GuessSubmitted(gameId, msg.sender, cellIndex);
    }

    function makeGamePublic(uint256 gameId) external {
        Game storage g = games[gameId];
        require(msg.sender == g.creator, "CardBomb: not creator");
        require(g.active, "CardBomb: already closed");
        g.active = false;
        FHE.makePubliclyDecryptable(g.bombIndex);
        emit GameMadePublic(gameId, msg.sender);
    }

    function getGameMeta(uint256 gameId) external view returns (address creator, uint64 rewardPerSafeCell, bool active) {
        Game storage g = games[gameId];
        return (g.creator, g.rewardPerSafeCell, g.active);
    }

    function getEncryptedScore(address player) external view returns (euint64) {
        return encScores[player];
    }

    function hasInitializedScore(address player) external view returns (bool) {
        return scoreInitialized[player];
    }

    function getLastResult(uint256 gameId) external view returns (ebool isBombResult, bool exists) {
        PlayerState storage st = playerStates[gameId][msg.sender];
        return (st.lastResultIsBomb, st.hasLastResult);
    }

    // Plaintext result for debugging - returns true if player hit bomb
    function getLastResultPlaintext(uint256 gameId) external view returns (bool isBomb, bool exists) {
        PlayerState storage st = playerStates[gameId][msg.sender];
        return (st.lastResultPlaintext, st.hasLastResult);
    }

    function getPlayerState(uint256 gameId, address player) external view returns (uint8 guessCount, bool hasLastResult, bool[9] memory guessedCells) {
        PlayerState storage st = playerStates[gameId][player];
        return (st.guessCount, st.hasLastResult, st.guessedCells);
    }

    function getBombHandle(uint256 gameId) external view returns (euint8) {
        return games[gameId].bombIndex;
    }

    // Get plaintext bomb position for debugging
    function getBombPlaintext(uint256 gameId) external view returns (uint8) {
        return games[gameId].bombPlaintext;
    }

    function isGameActive(uint256 gameId) external view returns (bool) {
        return games[gameId].active;
    }

    function getGameCreator(uint256 gameId) external view returns (address) {
        return games[gameId].creator;
    }
}
