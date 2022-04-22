import { task } from "hardhat/config";

task("deposit")
    .addParam("contract", "The contract address")
    .addParam("amount", "amount")
    .setAction(async (taskArgs, hre) => {
        const amount = hre.ethers.utils.parseEther(taskArgs.amount);
        const contract = await hre.ethers.getContractAt(
            "DAO",
            taskArgs.contract
        );
        console.log(await contract.deposit(amount));
    });
