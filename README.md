# Card Bomb Game - FHE Encrypted

A fun card game built with Fully Homomorphic Encryption (FHE) using [Zama's FHEVM](https://www.zama.ai/fhevm).

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

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Start development
pnpm dev
```

## 🔧 Configuration

### Environment Variables

```bash
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_key
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_CARDBOMB_CONTRACT_ADDRESS=0xe486bD5C93054CAa4765e2772F62cAAe28Bdc88D
```

## 📦 Project Structure

```
packages/
├── hardhat/             # Smart contracts
│   └── contracts/       # CardBombGameFHE.sol
├── nextjs-example/      # Next.js frontend
│   ├── app/             # App router
│   ├── components/      # UI components
│   └── hooks/           # React hooks
└── fhevm-sdk/           # FHEVM SDK utilities
```

## 🛠️ Available Commands

```bash
# Development
pnpm dev              # Start Next.js dev server
pnpm hardhat:compile  # Compile smart contracts

# Deployment
pnpm hardhat:deploy:sepolia    # Deploy to Sepolia
pnpm hardhat:verify:cardbomb   # Verify contract on Etherscan

# Building
pnpm next:build       # Build Next.js for production
```

## 🔗 Links

- [Smart Contract on Etherscan](https://sepolia.etherscan.io/address/0xe486bD5C93054CAa4765e2772F62cAAe28Bdc88D#code)
- [Zama FHEVM Documentation](https://docs.zama.ai/fhevm)
- [Zama Website](https://www.zama.ai/)

## 📄 License

BSD-3-Clause-Clear License 