import * as dotenv from "dotenv";

import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-web3";
import "@typechain/hardhat";
import "solidity-coverage";
import "./tasks/deposit.ts";
import "./tasks/addProposal.ts";
import "./tasks/finish.ts";
import "./tasks/vote.ts";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.4",
  networks: {
    rinkeby: {
      url: process.env.RENKEBY_URL || "",
      accounts:
          process.env.MNEMONIC !== undefined
              ? { mnemonic: process.env.MNEMONIC }
              : [],
    },
  },
};

export default config;
