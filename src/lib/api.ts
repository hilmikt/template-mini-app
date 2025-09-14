import { writeContract, readContract } from "wagmi/actions";
import { config } from "~/components/providers/WagmiProvider";
import { mintaroEscrowAbi } from "./abi/mintaroEscrow";

const CONTRACT = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;
const USE_WALLET = process.env.NEXT_PUBLIC_USE_WALLET === "true";

function assertAddr() {
  if (!CONTRACT) throw new Error("Contract address missing");
}

/** Onchain calls (no-ops if USE_WALLET=false) */
export async function onchainCreateJob(
  freelancer: `0x${string}`,
  title: string,
  valueWei: bigint
) {
  if (!USE_WALLET) return undefined;
  assertAddr();
  return writeContract(config, {
    address: CONTRACT,
    abi: mintaroEscrowAbi,
    functionName: "createJob",
    args: [freelancer, title],
    value: valueWei,
  });
}

export async function onchainCreateMilestone(jobId: bigint, title: string, amountWei: bigint) {
  if (!USE_WALLET) return undefined;
  assertAddr();
  return writeContract(config, {
    address: CONTRACT, abi: mintaroEscrowAbi,
    functionName: "createMilestone",
    args: [jobId, title, amountWei],
  });
}

export async function onchainApprove(milestoneId: bigint) {
  if (!USE_WALLET) return undefined;
  assertAddr();
  return writeContract(config, {
    address: CONTRACT, abi: mintaroEscrowAbi,
    functionName: "approveMilestone",
    args: [milestoneId],
  });
}

export async function onchainRelease(milestoneId: bigint) {
  if (!USE_WALLET) return undefined;
  assertAddr();
  return writeContract(config, {
    address: CONTRACT, abi: mintaroEscrowAbi,
    functionName: "releasePayment",
    args: [milestoneId],
  });
}

export async function onchainWithdraw() {
  if (!USE_WALLET) return undefined;
  assertAddr();
  return writeContract(config, {
    address: CONTRACT, abi: mintaroEscrowAbi,
    functionName: "withdraw",
    args: [],
  });
}

export async function onchainBalance(freelancer: `0x${string}`) {
  assertAddr();
  return readContract(config, {
    address: CONTRACT, abi: mintaroEscrowAbi,
    functionName: "balances",
    args: [freelancer],
  });
}
