// mintaroEscrowClient.ts

import { writeContract, readContract } from "wagmi/actions";
import { config } from "~/components/providers/WagmiProvider";
import { mintaroEscrowAbi } from "./abi/mintaroEscrow";
import type { Address } from "viem";

// ---------- Types for local simulation ----------
export type Job = {
  id: string; // stringified bigint (jobId)
  client: Address;
  freelancer: Address;
  locked: bigint;
  milestonesCount: number;
  // local-only metadata
  title?: string;
};

export type Milestone = {
  id: string; // `${jobId}:${milestoneId}`
  jobId: string;
  milestoneId: string; // stringified bigint
  amount: bigint;
  approved: boolean;
  released: boolean;
  // local-only metadata
  title?: string;
};

// ---------- REQUIRED: Keep EXACT export shape ----------
export const db = {
  jobs: new Map<string, Job>(),
  milestones: new Map<string, Milestone>(),
  balances: {} as Record<Address, bigint>,
};

// small helper for the debug panel
export function snapshot() {
  return {
    jobs: Array.from(db.jobs.values()),
    milestones: Array.from(db.milestones.values()),
    balances: db.balances,
  };
}

// ---------- Config ----------
const CONTRACT = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;
const USE_WALLET = process.env.NEXT_PUBLIC_USE_WALLET === "true";

function assertAddr() {
  if (!CONTRACT) throw new Error("Contract address missing");
}

// ---------- Local ID helpers ----------
let localJobSeq = 0n;
const nextJobId = () => ++localJobSeq;

const localMilestoneSeq: Record<string, bigint> = {};
const nextMilestoneId = (jobId: bigint) => {
  const key = jobId.toString();
  localMilestoneSeq[key] = (localMilestoneSeq[key] ?? 0n) + 1n;
  return localMilestoneSeq[key];
};

// ---------- Local state helpers ----------
function addToBalance(addr: Address, delta: bigint) {
  db.balances[addr] = (db.balances[addr] ?? 0n) + delta;
}

function subFromLocked(jobId: string, delta: bigint) {
  const j = db.jobs.get(jobId);
  if (!j) return;
  j.locked = j.locked - delta;
  db.jobs.set(jobId, j);
}

// ---------- Onchain + Local API ----------

/**
 * Create a job.
 * ABI: createJob(address freelancer) returns (uint256 jobId)
 * Notes:
 * - The ABI does not accept a title. We store it locally for UI only.
 * - No ETH is sent on job creation. Funding happens at milestone creation.
 */
export async function onchainCreateJob(
  freelancer: `0x${string}`,
  title: string, // UI-only
  _valueWei: bigint // ignored (kept for backward compatibility)
) {
  if (USE_WALLET) {
    assertAddr();
    const txHash = await writeContract(config, {
      address: CONTRACT,
      abi: mintaroEscrowAbi,
      functionName: "createJob",
      args: [freelancer],
    });
    return txHash;
  }

  // Local fallback
  const jobId = nextJobId();
  const client = "0x0000000000000000000000000000000000000001" as Address; // mock client
  db.jobs.set(jobId.toString(), {
    id: jobId.toString(),
    client,
    freelancer,
    locked: 0n,
    milestonesCount: 0,
    title,
  });
  return { local: true, jobId };
}

/**
 * Create a milestone and fund it.
 * ABI: createMilestone(uint256 jobId, uint256 amount) payable returns (uint256 milestoneId)
 * We send value = amount on-chain. Locally, we increase job.locked and store milestone.
 */
export async function onchainCreateMilestone(
  jobId: bigint,
  title: string, // UI-only
  amountWei: bigint
) {
  if (USE_WALLET) {
    assertAddr();
    const txHash = await writeContract(config, {
      address: CONTRACT,
      abi: mintaroEscrowAbi,
      functionName: "createMilestone",
