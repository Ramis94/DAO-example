import {expect} from "chai";
import {ethers} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {DAO, DAO__factory, VoiceToken, VoiceToken__factory} from "../typechain";
import {BigNumberish} from "ethers";

describe("DAO", function () {
    let voiceToken: VoiceToken;
    let dao: DAO;
    let owner: SignerWithAddress;
    let addr1: SignerWithAddress;
    let addr2: SignerWithAddress;

    const debatingPeriondDuration = 3 * (60 * 60 * 24);

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();

        const VoiceTokenFactory = (await ethers.getContractFactory(
            "VoiceToken",
            owner
        )) as VoiceToken__factory;
        voiceToken = await VoiceTokenFactory.deploy("VoiceToken", "VT");
        await voiceToken.deployed();

        const daoFactory = (await ethers.getContractFactory(
            "DAO",
            owner
        )) as DAO__factory;
        dao = await daoFactory.deploy(
            owner.address, voiceToken.address, 40, debatingPeriondDuration
        );
        await dao.deployed;

        Promise.all([
            voiceToken.mint(owner.address, 0),
            voiceToken.mint(addr1.address, 10),
            voiceToken.mint(addr2.address, 10),
        ]);
    });

    it('should create voting and finish with INVALID status & then repeat finish', async function () {
        await startVote(1, 2);
        await stopThread();
        await expect(dao.connect(addr2).finish(1)).to.emit(dao, "VotingFinished").withArgs(1, 3, 3);
        await expect(dao.connect(addr2).finish(1)).to.revertedWith("DAO: Voting already finished");
    });

    it('should create voting and finish with REJECTED status', async function () {
        await startVote(10, 5);
        await stopThread();
        await expect(dao.connect(addr2).finish(1)).to.emit(dao, "VotingFinished").withArgs(1, 15, 2);
    });

    it('should create voting and finish with ACCEPTED status & withdraw', async function () {
        await startVote(5, 10);
        await stopThread();
        await expect(dao.connect(addr2).finish(1)).to.emit(dao, "VotingFinished").withArgs(1, 15, 1);
        await expect(dao.connect(addr2).withdraw()).to.be.ok;
    });

    it('should voting is not finished & withdraw is blocked', async function () {
        await startVote(5, 10);
        await expect(dao.connect(addr2).withdraw()).to.revertedWith("DAO: tokens is block");
        await expect(dao.connect(addr2).finish(1)).to.revertedWith("DAO: vote is not finished");
    });

    it('should vote after finish', async function () {
        await startVote(5, 10);
        await stopThread();
        await expect(dao.connect(addr2).finish(1)).to.emit(dao, "VotingFinished").withArgs(1, 15, 1);
        await expect(dao.vote(1, 1)).to.revertedWith("DAO: dao is finished");
    });

    it('should balance is zero', async function () {
        await startVote(1, 1);
        await expect(dao.vote(1, 0)).to.revertedWith("DAO: balance is zero");
    });

    it('should voting error finished', async function () {
        const ABI = [
            "function aApprove(address spender, uint256 amount)"
        ];
        const iface = new ethers.utils.Interface(ABI);
        await expect(dao.connect(owner).addProposal(
            iface.encodeFunctionData("aApprove", [owner.address, 100]),
            voiceToken.address,
            "first vote")
        ).to.emit(dao, "CreateVoting").withArgs(1, "first vote");

        let firstVoteCount = 5;
        let secondVoteCount = 10;

        await expect(await voiceToken.connect(addr1).approve(dao.address, firstVoteCount)).to.be.ok;
        await expect(dao.connect(addr1).deposit(firstVoteCount)).to.be.ok;
        await expect(voiceToken.connect(addr2).approve(dao.address, secondVoteCount)).to.be.ok;

        await expect(dao.connect(addr2).deposit(secondVoteCount)).to.be.ok;
        await expect(dao.connect(addr1).vote(1, 1)).to.emit(dao, "Vote").withArgs(1, firstVoteCount, addr1.address, 1);
        await expect(dao.connect(addr2).vote(1, 0)).to.emit(dao, "Vote").withArgs(1, secondVoteCount, addr2.address, 0);

        stopThread();

        await expect(dao.finish(1))
            .to.be.revertedWith("DAO: Voting error finished");
    });

    async function startVote(firstVoteCount: BigNumberish, secondVoteCount: BigNumberish) {
        //создание голосование
        const ABI = [
            "function approve(address spender, uint256 amount)"
        ];
        const iface = new ethers.utils.Interface(ABI);

        await expect(dao.connect(owner).addProposal(
            iface.encodeFunctionData("approve", [owner.address, 100]),
            voiceToken.address,
            "first vote")
        ).to.emit(dao, "CreateVoting").withArgs(1, "first vote");

        //левый пользователь создает голосование
        await expect(dao.connect(addr1).addProposal(
            iface.encodeFunctionData("approve", [owner.address, 100]),
            voiceToken.address,
            "first vote")
        ).to.revertedWith("DAO: sender not equal chair person");

        await expect(await voiceToken.connect(addr1).approve(dao.address, firstVoteCount)).to.be.ok;
        await expect(dao.connect(addr1).deposit(firstVoteCount)).to.be.ok;

        await expect(voiceToken.connect(addr2).approve(dao.address, secondVoteCount)).to.be.ok;
        await expect(dao.connect(addr2).deposit(secondVoteCount)).to.be.ok;

        await expect(dao.connect(addr1).vote(1, 1)).to.emit(dao, "Vote").withArgs(1, firstVoteCount, addr1.address, 1);
        await expect(dao.connect(addr2).vote(1, 0)).to.emit(dao, "Vote").withArgs(1, secondVoteCount, addr2.address, 0);
    }

    it('should vote not found', async function () {
        await expect(dao.vote(2, 1)).to.revertedWith("Voting not found");
    });

    it('should finish vote if not found', async function () {
        await expect(dao.finish(2)).to.revertedWith("Voting not found");
    });

    async function stopThread() {
        await ethers.provider.send("evm_increaseTime", [debatingPeriondDuration]);
    }
});
