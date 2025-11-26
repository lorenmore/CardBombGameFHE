# Card Bomb Game - FHE Encrypted

A Next.js application demonstrating Fully Homomorphic Encryption (FHE) with a fun card bomb game using [Zama's FHEVM](https://www.zama.ai/fhevm).

## 🎮 Game Overview

**Card Bomb** is a 3x3 grid game where:
- Creator places a hidden bomb in one of 9 cells (encrypted with FHE)
- Players guess cells trying to find 8 safe cells
- Hit the bomb = Game Over
- Find all 8 safe cells = You Win!

## 📜 Smart Contract

**CardBombGameFHE** - Verified on Sepolia Etherscan

- **Contract Address**: [`0xe486bD5C93054CAa4765e2772F62cAAe28Bdc88D`](https://sepolia.etherscan.io/address/0xe486bD5C93054CAa4765e2772F62cAAe28Bdc88D#code)
- **Network**: Sepolia Testnet (Chain ID: 11155111)

### Contract Functions

| Function | Description |
|----------|-------------|
| `createGame()` | Create new game with encrypted bomb position |
| `guessCell()` | Player guesses a cell (0-8) |
| `makeGamePublic()` | End game and reveal bomb position |
| `getGameMeta()` | Get game info (creator, reward, active status) |
| `getPlayerState()` | Get player's guess count and guessed cells |
| `getEncryptedScore()` | Get player's encrypted score |

### Events

| Event | Description |
|-------|-------------|
| `GameCreated` | Emitted when new game is created |
| `GuessSubmitted` | Emitted when player makes a guess |
| `GameMadePublic` | Emitted when game ends and bomb is revealed |

## 🚀 Features

- **FHE Encryption**: Bomb position encrypted using [Zama FHEVM](https://docs.zama.ai/fhevm)
- **Confidential Gameplay**: No one can see the bomb until revealed
- **On-chain Verification**: All game logic runs on smart contract
- **Encrypted Scores**: Player scores are stored encrypted
- **Modern UI**: Beautiful responsive interface with skeleton loaders

## 📦 Installation

```bash
pnpm install
pnpm dev
```

## 🔧 Configuration

### Environment Variables
```bash
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_key
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_CARDBOMB_CONTRACT_ADDRESS=0xe486bD5C93054CAa4765e2772F62cAAe28Bdc88D
```

## 🎯 How to Play

1. **Create Game**: Select bomb position (0-8) and create game
2. **Play Game**: Click cells to guess, avoid the bomb
3. **Win/Lose**: Find 8 safe cells to win, or hit bomb to lose
4. **Reveal**: Creator clicks "End Game" to reveal bomb position

## 🔗 Links

- [Smart Contract on Etherscan](https://sepolia.etherscan.io/address/0xe486bD5C93054CAa4765e2772F62cAAe28Bdc88D#code)
- [Zama FHEVM Documentation](https://docs.zama.ai/fhevm)
- [Zama Website](https://www.zama.ai/)

## 📄 License

BSD-3-Clause-Clear License
