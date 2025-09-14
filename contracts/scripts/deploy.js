const hre = require("hardhat");

async function main() {
  const Escrow = await hre.ethers.getContractFactory("MintaroEscrow");
  const escrow = await Escrow.deploy();            // ethers v6 plugin
  await escrow.waitForDeployment();
  const addr = await escrow.getAddress();
  console.log("MintaroEscrow deployed to:", addr);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
