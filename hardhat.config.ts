import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-deploy";
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      { version: "0.8.18" },
      { version: "0.4.19" },
      { version: "0.6.12" },
    ],
  },
  networks: {
    hardhat: {
      chainId: 31337,
      forking: {
        url: process.env.MAINNET_RPC_URL || "",
      },
    },
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
};

export default config;
