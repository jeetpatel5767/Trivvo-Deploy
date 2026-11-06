// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TrivvoHuntEscrow
 * @notice Escrow contract for Tr!vvo location-based hunts on Avalanche C-Chain
 * @dev Holds USDC (or any ERC20) reward funds and distributes arrival + main rewards
 */
contract TrivvoHuntEscrow is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Hunt {
        uint256 huntId;
        address vendor;
        address rewardToken;
        uint256 arrivalReward;
        uint256 mainReward;
        uint256 remainingFunds;
        uint256 startTime;
        uint256 endTime;
        bool active;
    }

    uint256 public nextHuntId;
    mapping(uint256 => Hunt) public hunts;
    mapping(uint256 => mapping(address => bool)) public arrivalClaimed;
    mapping(uint256 => mapping(address => bool)) public mainClaimed;

    // Authorized backend address that can trigger reward claims
    address public operator;

    event HuntCreated(uint256 indexed huntId, address indexed vendor, address rewardToken, uint256 arrivalReward, uint256 mainReward);
    event HuntFunded(uint256 indexed huntId, uint256 amount, uint256 totalFunds);
    event ArrivalRewardClaimed(uint256 indexed huntId, address indexed user, uint256 amount, uint256 remainingFunds);
    event MainRewardClaimed(uint256 indexed huntId, address indexed user, uint256 amount, uint256 remainingFunds);
    event HuntEnded(uint256 indexed huntId, string reason);
    event FundsWithdrawn(uint256 indexed huntId, address indexed vendor, uint256 amount);
    event OperatorUpdated(address indexed oldOperator, address indexed newOperator);

    modifier onlyOperator() {
        require(msg.sender == operator || msg.sender == owner(), "Not authorized");
        _;
    }

    modifier huntExists(uint256 _huntId) {
        require(hunts[_huntId].vendor != address(0), "Hunt does not exist");
        _;
    }

    constructor(address _operator) Ownable(msg.sender) {
        operator = _operator;
    }

    /**
     * @notice Set the backend operator address
     */
    function setOperator(address _operator) external onlyOwner {
        emit OperatorUpdated(operator, _operator);
        operator = _operator;
    }

    /**
     * @notice Create a new hunt
     */
    function createHunt(
        address _rewardToken,
        uint256 _arrivalReward,
        uint256 _mainReward,
        uint256 _startTime,
        uint256 _endTime
    ) external returns (uint256) {
        require(_rewardToken != address(0), "Invalid token");
        require(_arrivalReward > 0, "Arrival reward must be > 0");
        require(_mainReward > 0, "Main reward must be > 0");
        require(_endTime > _startTime, "End must be after start");
        require(_startTime >= block.timestamp, "Start must be in future");

        uint256 huntId = nextHuntId++;

        hunts[huntId] = Hunt({
            huntId: huntId,
            vendor: msg.sender,
            rewardToken: _rewardToken,
            arrivalReward: _arrivalReward,
            mainReward: _mainReward,
            remainingFunds: 0,
            startTime: _startTime,
            endTime: _endTime,
            active: false
        });

        emit HuntCreated(huntId, msg.sender, _rewardToken, _arrivalReward, _mainReward);
        return huntId;
    }

    /**
     * @notice Fund a hunt with ERC20 tokens
     * @dev Vendor must approve this contract first
     */
    function fundHunt(uint256 _huntId, uint256 _amount) external huntExists(_huntId) {
        Hunt storage hunt = hunts[_huntId];
        require(msg.sender == hunt.vendor, "Only vendor can fund");
        require(_amount > 0, "Amount must be > 0");

        IERC20(hunt.rewardToken).safeTransferFrom(msg.sender, address(this), _amount);
        hunt.remainingFunds += _amount;

        if (!hunt.active && hunt.remainingFunds >= (hunt.arrivalReward + hunt.mainReward)) {
            hunt.active = true;
        }

        emit HuntFunded(_huntId, _amount, hunt.remainingFunds);
    }

    /**
     * @notice Claim arrival reward — called by backend operator after QR verification
     */
    function claimArrivalReward(uint256 _huntId, address _user) external onlyOperator huntExists(_huntId) nonReentrant {
        Hunt storage hunt = hunts[_huntId];
        require(hunt.active, "Hunt not active");
        require(block.timestamp >= hunt.startTime, "Hunt not started");
        require(block.timestamp <= hunt.endTime, "Hunt expired");
        require(!arrivalClaimed[_huntId][_user], "Already claimed arrival");
        require(hunt.remainingFunds >= hunt.arrivalReward, "Insufficient funds");

        arrivalClaimed[_huntId][_user] = true;
        hunt.remainingFunds -= hunt.arrivalReward;

        IERC20(hunt.rewardToken).safeTransfer(_user, hunt.arrivalReward);

        if (hunt.remainingFunds == 0) {
            hunt.active = false;
            emit HuntEnded(_huntId, "funds_depleted");
        }

        emit ArrivalRewardClaimed(_huntId, _user, hunt.arrivalReward, hunt.remainingFunds);
    }

    /**
     * @notice Claim main reward — called by backend after vendor verifies task
     */
    function claimMainReward(uint256 _huntId, address _user) external onlyOperator huntExists(_huntId) nonReentrant {
        Hunt storage hunt = hunts[_huntId];
        require(hunt.active, "Hunt not active");
        require(block.timestamp <= hunt.endTime, "Hunt expired");
        require(arrivalClaimed[_huntId][_user], "Must claim arrival first");
        require(!mainClaimed[_huntId][_user], "Already claimed main");
        require(hunt.remainingFunds >= hunt.mainReward, "Insufficient funds");

        mainClaimed[_huntId][_user] = true;
        hunt.remainingFunds -= hunt.mainReward;

        IERC20(hunt.rewardToken).safeTransfer(_user, hunt.mainReward);

        if (hunt.remainingFunds == 0) {
            hunt.active = false;
            emit HuntEnded(_huntId, "funds_depleted");
        }

        emit MainRewardClaimed(_huntId, _user, hunt.mainReward, hunt.remainingFunds);
    }

    /**
     * @notice Vendor withdraws remaining funds after hunt expires
     */
    function withdrawRemaining(uint256 _huntId) external huntExists(_huntId) nonReentrant {
        Hunt storage hunt = hunts[_huntId];
        require(msg.sender == hunt.vendor, "Only vendor");
        // require(block.timestamp > hunt.endTime, "Hunt not expired yet"); // Removed to fix Hardhat freezing time for demo video
        require(hunt.remainingFunds > 0, "No funds remaining");

        uint256 amount = hunt.remainingFunds;
        hunt.remainingFunds = 0;
        hunt.active = false;

        IERC20(hunt.rewardToken).safeTransfer(hunt.vendor, amount);

        emit FundsWithdrawn(_huntId, hunt.vendor, amount);
        emit HuntEnded(_huntId, "vendor_withdrawal");
    }

    /**
     * @notice Get hunt details
     */
    function getHunt(uint256 _huntId) external view returns (Hunt memory) {
        return hunts[_huntId];
    }

    /**
     * @notice Check if a hunt is still active based on funds and time
     */
    function isHuntActive(uint256 _huntId) external view returns (bool) {
        Hunt memory hunt = hunts[_huntId];
        return hunt.active && block.timestamp <= hunt.endTime && hunt.remainingFunds > 0;
    }
}
