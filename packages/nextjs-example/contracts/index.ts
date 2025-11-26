// Import ABIs
import CardBombGameFHEABI from './abis/CardBombGameFHE.json'

// Import addresses and types
import { CONTRACT_ADDRESSES } from './addresses'

// Export all contract ABIs and addresses
export { CONTRACT_ADDRESSES } from './addresses'

// Export ABIs
export const CONTRACT_ABIS = {
  CardBombGameFHE: CardBombGameFHEABI,
} as const

// Helper function to get contract config
export function getContractConfig(contractName: keyof typeof CONTRACT_ABIS) {
  const abiData = CONTRACT_ABIS[contractName];
  // Handle both formats: direct array or { abi: [...] } object
  const abi = Array.isArray(abiData) ? abiData : (abiData as any).abi;
  return {
    address: CONTRACT_ADDRESSES[contractName] as string,
    abi,
  }
}

// Helper to get ABI from either format
const getAbi = (abiData: any) => Array.isArray(abiData) ? abiData : abiData.abi;

const createDeployedContractsStructure = () => {
  const chainIds = [31337, 11155111] // hardhat, sepolia
  const contracts: Record<number, Record<string, { address: string; abi: any[]; inheritedFunctions?: Record<string, string>; deployedOnBlock?: number }>> = {}
  
  for (const chainId of chainIds) {
    contracts[chainId] = {
      CardBombGameFHE: {
        address: CONTRACT_ADDRESSES.CardBombGameFHE as string,
        abi: getAbi(CONTRACT_ABIS.CardBombGameFHE),
        inheritedFunctions: {},
      },
    }
  }
  
  return contracts
}

// Export as default for compatibility with existing imports
export default createDeployedContractsStructure()
