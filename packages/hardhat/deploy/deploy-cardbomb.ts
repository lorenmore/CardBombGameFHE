import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("Deploying CardBombGameFHE contract...");
  console.log("Deployer:", deployer);

  const deployedCardBombGame = await deploy("CardBombGameFHE", {
    from: deployer,
    log: true,
  });

  console.log(`CardBombGameFHE contract deployed at: ${deployedCardBombGame.address}`);
  console.log("CardBombGameFHE deployed successfully!");
  console.log("Note: Verification will be handled manually later");
};

export default func;
func.id = "deploy_card_bomb_game";
func.tags = ["CardBombGameFHE"];
