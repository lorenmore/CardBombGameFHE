# @fhevm/sdk/node

Node.js utilities for FHEVM - Card Bomb Game

## Overview

The `@fhevm/sdk/node` package provides Node.js-specific utilities for working with FHEVM (Fully Homomorphic Encryption Virtual Machine).

## Features

- **FHEVM Client for Node.js** - Easy-to-use client with Node.js-appropriate defaults
- **Batch Operations** - Efficient batch encryption and decryption
- **CLI Tool** - Command-line interface for FHEVM operations

## Installation

```bash
pnpm add @fhevm/sdk
```

## Quick Start

### Programmatic Usage

```typescript
import { 
  createFHEVMClientForNode, 
  encryptValue,
  decryptValue,
  type FHEVMConfig 
} from "@fhevm/sdk/node";

// Configure FHEVM client
const config: FHEVMConfig = {
  rpcUrl: "https://sepolia.infura.io/v3/YOUR_API_KEY",
  chainId: 11155111, // Sepolia
  mockChains: {
    31337: "http://localhost:8545" // Local development
  }
};

// Encrypt a value
const encrypted = await encryptValue(42, "0x...", config);

// Decrypt a value
const decrypted = await decryptValue(
  "0x...", // handle
  "0x...", // contract address
  config,
  { usePublicDecrypt: true }
);
```

## API Reference

### Core Functions

#### `createFHEVMClientForNode(config, events?)`

Creates a FHEVM client optimized for Node.js environments.

#### `encryptValue(value, publicKey, config)`

Encrypt a numeric value using FHEVM.

#### `decryptValue(handle, contractAddress, config, options?)`

Decrypt a handle using FHEVM.

### Batch Functions

#### `batchEncrypt(values, publicKey, config)`

Encrypt multiple values efficiently.

#### `batchDecrypt(handles, contractAddress, config, options?)`

Decrypt multiple handles efficiently.

## CLI Commands

```bash
# Encrypt a value
pnpm fhevm-cli:encrypt --value <number> --public-key <string>

# Decrypt a handle
pnpm fhevm-cli:decrypt --handle <string> --contract <address> --public

# Check status
pnpm fhevm-cli:status

# Test operations
pnpm fhevm-cli:test
```

## Configuration

### FHEVMConfig

```typescript
interface FHEVMConfig {
  rpcUrl: string;
  chainId: number;
  mockChains?: Record<number, string>;
}
```

## License

BSD-3-Clause-Clear
