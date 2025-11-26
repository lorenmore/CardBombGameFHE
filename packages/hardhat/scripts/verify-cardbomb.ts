import { run } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  // Read deployed address from deployments
  const deploymentsPath = path.join(__dirname, "../deployments/sepolia/CardBombGameFHE.json");
  
  if (!fs.existsSync(deploymentsPath)) {
    console.error("Deployment file not found. Make sure contract is deployed to Sepolia first.");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  const contractAddress = deployment.address;

  console.log("Verifying CardBombGameFHE at:", contractAddress);

  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: [],
    });
    console.log("Contract verified successfully!");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("Contract is already verified!");
    } else {
      console.error("Verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
