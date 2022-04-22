import {ethers} from "hardhat";

async function main() {
    const DAO = await ethers.getContractFactory("DAO");
    const dao = await DAO.deploy("0x83eb3dE6fa6A2f1dF638bC873096A957638da60b", "0x4E0135662390e9B411A192F914798a07A8074Cc9", 40, 3 * (60 * 60 * 24));

    await dao.deployed();

    console.log("DAO deployed to:", dao.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
