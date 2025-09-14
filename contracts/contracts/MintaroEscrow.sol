// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MintaroEscrow {
    uint256 public jobCount;
    mapping(uint256 => Job) private jobs;
    mapping(address => uint256) public available; // freelancer withdrawable

    struct Milestone {
        uint256 amount;
        bool approved;
        bool released;
    }

    struct Job {
        address client;
        address freelancer;
        uint256 locked; // total funded but not yet released
        uint256 milestonesCount;
        mapping(uint256 => Milestone) milestones;
    }

    event JobCreated(uint256 indexed jobId, address indexed client, address indexed freelancer);
    event MilestoneCreated(uint256 indexed jobId, uint256 indexed milestoneId, uint256 amount);
    event MilestoneApproved(uint256 indexed jobId, uint256 indexed milestoneId);
    event PaymentReleased(uint256 indexed jobId, uint256 indexed milestoneId, uint256 amount);
    event Withdrawn(address indexed freelancer, uint256 amount);

    // 1) createJob
    function createJob(address freelancer) external returns (uint256 jobId) {
        require(freelancer != address(0), "bad freelancer");
        jobId = ++jobCount;
        Job storage j = jobs[jobId];
        j.client = msg.sender;
        j.freelancer = freelancer;
        emit JobCreated(jobId, msg.sender, freelancer);
    }

    // 2) createMilestone (fund on creation)
    function createMilestone(uint256 jobId, uint256 amount) external payable returns (uint256 milestoneId) {
        Job storage j = jobs[jobId];
        require(j.client == msg.sender, "only client");
        require(amount > 0, "bad amount");
        require(msg.value == amount, "fund = amount");

        milestoneId = j.milestonesCount++;
        j.milestones[milestoneId] = Milestone({ amount: amount, approved: false, released: false });
        j.locked += amount;

        emit MilestoneCreated(jobId, milestoneId, amount);
    }

    // 3) approveMilestone
    function approveMilestone(uint256 jobId, uint256 milestoneId) external {
        Job storage j = jobs[jobId];
        require(j.client == msg.sender, "only client");
        Milestone storage m = j.milestones[milestoneId];
        require(!m.approved, "already approved");
        require(!m.released, "already released");
        m.approved = true;
        emit MilestoneApproved(jobId, milestoneId);
    }

    // 4) releasePayment (credits freelancer balance; withdraw happens separately)
    function releasePayment(uint256 jobId, uint256 milestoneId) external {
        Job storage j = jobs[jobId];
        require(j.client == msg.sender, "only client");
        Milestone storage m = j.milestones[milestoneId];
        require(m.approved, "not approved");
        require(!m.released, "already released");

        m.released = true;
        j.locked -= m.amount;
        available[j.freelancer] += m.amount;

        emit PaymentReleased(jobId, milestoneId, m.amount);
    }

    // 5) withdraw
    function withdraw() external {
        uint256 amt = available[msg.sender];
        require(amt > 0, "nothing to withdraw");
        available[msg.sender] = 0;

        (bool ok, ) = msg.sender.call{value: amt}("");
        require(ok, "transfer failed");

        emit Withdrawn(msg.sender, amt);
    }

    // Helpers for frontends / debugging
    function getJob(uint256 jobId) external view returns (address client, address freelancer, uint256 locked, uint256 milestonesCount) {
        Job storage j = jobs[jobId];
        return (j.client, j.freelancer, j.locked, j.milestonesCount);
    }

    function getMilestone(uint256 jobId, uint256 milestoneId) external view returns (uint256 amount, bool approved, bool released) {
        Milestone storage m = jobs[jobId].milestones[milestoneId];
        return (m.amount, m.approved, m.released);
    }

    receive() external payable {}
}
