import {task} from "hardhat/config";

task("addProposal")
    .addParam("contract")
    .addParam("description")
    .addParam("recipient")
    .addParam("calldata")
    .setAction(async (taskArgs, hre) => {
        const contract = await hre.ethers.getContractAt(
            "DAO",
            taskArgs.contract
        );
        console.log(await contract.addProposal(taskArgs.calldata, taskArgs.recipient, taskArgs.description));
    });