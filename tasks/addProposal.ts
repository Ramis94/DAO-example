import { task } from "hardhat/config";

task("deposit")
    .addParam("contract", "The contract address")
    .addParam("callData")
    .addParam("recipient")
    .addParam("description")
    .setAction(async (taskArgs, hre) => {
        const contract = await hre.ethers.getContractAt(
            "DAO",
            taskArgs.contract
        );
        console.log(await contract.addProposal(taskArgs.callData, taskArgs.recipient, taskArgs.description));
    });
