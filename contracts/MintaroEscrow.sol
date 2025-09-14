// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MintaroEscrow {
    // --- Safety: simple reentrancy guard ---
    uint256 private _locked = 1;
    modifier nonReentrant() {
        require(_locked == 1, "REENTRANCY");
        _locked = 2;
        _;
        _locked = 1;
    }

    struct Job {
        uint256 id;
        address client;
        address freelancer;
        string title;
        uint256 budget;          // total ETH funded at create
        uint256 fundsRemaining;  // decremented on release
        uint256[] milestoneIds;
        bool exists;
    }

    struct Milestone {
        uint256 id;
        uint256 jobId;
        string title;
        uint256 amount;     // must be <= job.fundsRemaining when created
        bool approved;      // set by client
        bool released;      // set when payment released
    }

    uint256 public nextJobId = 1;
    uint256 public nextMilestoneId = 1;

    mapping(uint256 => Job) public jobs;               // jobId -> Job
    mapping(uint256 => Milestone) public milestones;   // milestoneId -> Milestone
    mapping(address => uint256) public balances;       // freelancer -> ETH to withdraw

    // --- Events ---
    event JobCreated(uint256 indexed jobId, address indexed client, address indexed freelancer, uint256 budget, string title);
    event MilestoneCreated(uint256 indexed milestoneId, uint256 indexed jobId, string title, uint256 amount);
    event MilestoneApproved(uint256 indexed milestoneId, uint256 indexed jobId);
    event PaymentReleased(uint256 indexed milestoneId, uint256 indexed jobId, address indexed freelancer, uint256 amount);
    event Withdrawn(address indexed freelancer, uint256 amount);

    // --- Create a job and fund it with ETH ---
    function createJob(address freelancer, string calldata title) external payable returns (uint256 jobId) {
        require(freelancer != address(0), "BAD_FREELANCER");
        require(msg.value > 0, "BUDGET_REQUIRED");

        jobId = nextJobId++;
        Job storage j = jobs[jobId];
        j.id = jobId;
        j.client = msg.sender;
        j.freelancer = freelancer;
        j.title = title;
        j.budget = msg.value;
        j.fundsRemaining = msg.value;
        j.exists = true;

        emit JobCreated(jobId, msg.sender, freelancer, msg.value, title);
    }

    // --- Create milestone (client only) ---
    function createMilestone(uint256 jobId, string calldata title, uint256 amount) external returns (uint256 milestoneId) {
        Job storage j = jobs[jobId];
        require(j.exists, "JOB_NOT_FOUND");
        require(msg.sender == j.client, "ONLY_CLIENT");
        require(amount > 0 && amount <= j.fundsRemaining, "BAD_AMOUNT");

        milestoneId = nextMilestoneId++;
        Milestone storage m = milestones[milestoneId];
        m.id = milestoneId;
        m.jobId = jobId;
        m.title = title;
        m.amount = amount;

        j.milestoneIds.push(milestoneId);

        emit MilestoneCreated(milestoneId, jobId, title, amount);
    }

    // --- Approve milestone (client only) ---
    function approveMilestone(uint256 milestoneId) external {
        Milestone storage m = milestones[milestoneId];
        Job storage j = jobs[m.jobId];
        require(j.exists, "JOB_NOT_FOUND");
        require(msg.sender == j.client, "ONLY_CLIENT");
        require(!m.approved, "ALREADY_APPROVED");
        require(!m.released, "ALREADY_RELEASED");

        m.approved = true;
        emit MilestoneApproved(milestoneId, m.jobId);
    }

    // --- Release payment (client only, after approval) ---
    function releasePayment(uint256 milestoneId) external nonReentrant {
        Milestone storage m = milestones[milestoneId];
        Job storage j = jobs[m.jobId];
        require(j.exists, "JOB_NOT_FOUND");
        require(msg.sender == j.client, "ONLY_CLIENT");
        require(m.approved, "NOT_APPROVED");
        require(!m.released, "ALREADY_RELEASED");
        require(j.fundsRemaining >= m.amount, "INSUFFICIENT_JOB_FUNDS");

        m.released = true;
        j.fundsRemaining -= m.amount;
        balances[j.freelancer] += m.amount;

        emit PaymentReleased(milestoneId, m.jobId, j.freelancer, m.amount);
    }

    // --- Withdraw available funds (freelancer only) ---
    function withdraw() external nonReentrant {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "NO_FUNDS");
        balances[msg.sender] = 0;

        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "WITHDRAW_FAIL");
        emit Withdrawn(msg.sender, amount);
    }

    // --- Read helpers for UI ---
    function getJob(uint256 jobId) external view returns (Job memory) {
        return jobs[jobId];
    }

    function getMilestone(uint256 milestoneId) external view returns (Milestone memory) {
        return milestones[milestoneId];
    }

    function getJobMilestones(uint256 jobId) external view returns (uint256[] memory) {
        return jobs[jobId].milestoneIds;
    }
}
