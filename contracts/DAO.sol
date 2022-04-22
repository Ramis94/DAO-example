pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "hardhat/console.sol";

contract DAO {

    using Counters for Counters.Counter;
    Counters.Counter private _votingIds;

    address private chairPerson;
    IERC20 private voiceToken;
    uint256 private minimumQuorum;
    uint256 private debatingPeriondDuration;

    modifier onlyChairPerson() {
        require(msg.sender == chairPerson, "DAO: sender not equal chair person");
        _;
    }

    mapping(address => Balance) balances;
    mapping(uint256 => Voting) votings;

    struct Balance {
        uint256 balance;
        uint256 unlockTime;
    }

    struct Voting {
        string description;
        VotingResult result;
        address recipient;
        bytes callData;
        uint256 finishTime;
        uint256 positive;
        uint256 negative;
        mapping(address => VoteOption) addressOption;
    }

    enum VoteOption {
        POSITIVE,
        NEGATIVE
    }

    enum VotingResult {
        NONE,
        ACCEPTED,
        REJECTED,
        INVALID
    }

    event CreateVoting(
        uint256 indexed id,
        string description
    );

    event Vote(
        uint256 indexed id,
        uint256 balance,
        address sender,
        VoteOption option
    );

    event VotingFinished(
        uint256 indexed votingId,
        uint256 totalVoted,
        VotingResult result
    );

    constructor(address _chairPerson, address _voiceToken, uint256 _minimumQuorum, uint256 _debatingPeriondDuration) {
        chairPerson = _chairPerson;
        voiceToken = IERC20(_voiceToken);
        minimumQuorum = _minimumQuorum;
        debatingPeriondDuration = _debatingPeriondDuration;
    }

    function deposit(uint256 amount) public returns (bool) {
        Balance storage balanceInfo = balances[msg.sender];
        balanceInfo.balance += amount;
        return voiceToken.transferFrom(msg.sender, address(this), amount);
    }

    //вывод токенов, если длительность голосования 3 дня, то я могу вывести все токены после всех голосований
    function withdraw() public {
        Balance storage balance = balances[msg.sender];
        require(balance.unlockTime < block.timestamp, "DAO: tokens is block");
        voiceToken.transfer(msg.sender, balance.balance);
    }

    //может вызывать только председатель, он будет указывать параметры
    function addProposal(bytes memory callData, address _recipient, string memory description) external onlyChairPerson {
        _votingIds.increment();
        Voting storage voting = votings[_votingIds.current()];
        voting.callData = callData;
        voting.recipient = _recipient;
        voting.description = description;
        voting.result = VotingResult.NONE;
        voting.finishTime = block.timestamp + debatingPeriondDuration;
        emit CreateVoting(_votingIds.current(), description);
    }

    //указываем id голосования и за или против
    function vote(uint256 id, VoteOption option) public {
        require(votings[id].finishTime > 0, "Voting not found");
        Voting storage voting = votings[id];
        Balance storage balanceInfo = balances[msg.sender];
        require(voting.result == VotingResult.NONE, "DAO: dao is finished");
        uint256 balance = balanceInfo.balance;
        require(balance > 0, "DAO: balance is zero");
        if (option == VoteOption.POSITIVE) {
            voting.positive += balance;
        } else {
            voting.negative += balance;
        }
        balanceInfo.unlockTime = voting.finishTime;
        emit Vote(id, balance, msg.sender, option);
    }

    //должно проголосовать 40% от totalSupply, отрабатывает через определенный период, отрабатывает метод call и улетает на другой контракт
    function finish(uint256 id) public {
        require(votings[id].finishTime > 0, "DAO: Voting not found");
        Voting storage voting = votings[id];
        require(voting.finishTime < block.timestamp, "DAO: vote is not finished");
        require(voting.result == VotingResult.NONE, "DAO: Voting already finished");
        uint256 totalVotedResult = voting.positive + voting.negative;
        uint256 voiceMinimumQuorum = voiceToken.totalSupply() * minimumQuorum / 100;
        if (totalVotedResult >= voiceMinimumQuorum) {
            if (voting.positive > voting.negative) {
                voting.result = VotingResult.ACCEPTED;
                (bool success,) = voting.recipient.call(voting.callData);
                require(success, "DAO: Voting error finished");
            } else {
                voting.result = VotingResult.REJECTED;
            }
        } else {
            voting.result = VotingResult.INVALID;
        }
        emit VotingFinished(id, totalVotedResult, voting.result);
    }
}
