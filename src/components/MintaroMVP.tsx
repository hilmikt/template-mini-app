"use client";

import { useEffect, useMemo, useState } from "react";
import { parseEther, type Address, isAddress } from "viem";
import {
  snapshot,
  onchainCreateJob,
  onchainCreateMilestone,
  onchainApprove,
  onchainRelease,
  onchainWithdraw,
  onchainBalance,
} from "../lib/mintaroEscrowClient";

// --- UI helpers ---
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6 p-5 bg-white/90 border rounded-xl shadow-md">
      <h2 className="text-lg font-semibold mb-3 text-gray-900">{title}</h2>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-3 flex-wrap">{children}</div>;
}
function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-xs font-medium text-gray-700">{label}</span>
      <input
        className="border rounded-lg px-3 py-2 text-sm text-gray-900 
             focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
      />
    </label>
  );
}
function Btn({
  children,
  onClick,
  disabled,
  kind = "primary",
}: {
  children: React.ReactNode;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  kind?: "primary" | "ghost";
}) {
  const base =
    "px-4 py-2 rounded-lg text-sm font-medium transition focus:outline-none focus:ring-2";
  const styles =
    kind === "primary"
      ? "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 disabled:opacity-50"
      : "bg-gray-100 text-gray-800 hover:bg-gray-200 focus:ring-gray-400 disabled:opacity-50";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles}`}
    >
      {children}
    </button>
  );
}

// --- main ---
export default function MintaroMVP() {
  const [snap, setSnap] = useState(() => snapshot());
  const [logs, setLogs] = useState<string[]>([]);

  // job
  const [freelancer, setFreelancer] = useState(
    "0x000000000000000000000000000000000000dEaD"
  );
  const [jobTitle, setJobTitle] = useState("Landing Page v1");
  const [jobValueEth, setJobValueEth] = useState("0");

  // milestone
  const [msJobId, setMsJobId] = useState("1");
  const [msTitle, setMsTitle] = useState("Design draft");
  const [msAmountEth, setMsAmountEth] = useState("0.05");

  // approve
  const [apprJobId, setApprJobId] = useState("1");
  const [apprMsId, setApprMsId] = useState("1");

  // release
  const [relJobId, setRelJobId] = useState("1");
  const [relMsId, setRelMsId] = useState("1");

  // withdraw + balance
  const [who, setWho] = useState(freelancer);
  const [balAddr, setBalAddr] = useState(freelancer);
  const [balance, setBalance] = useState<bigint | null>(null);

  const refresh = () => setSnap(snapshot());
  const log = (m: string) => setLogs((p) => [m, ...p].slice(0, 200));

  // actions
  const doCreateJob = async () => {
    if (!isAddress(freelancer)) return log("❌ Invalid freelancer");
    await onchainCreateJob(
      freelancer as Address,
      jobTitle,
      toWeiSafe(jobValueEth)
    );
    log("✅ Job created");
    refresh();
  };
  const doCreateMs = async () => {
    await onchainCreateMilestone(
      BigInt(msJobId),
      msTitle,
      toWeiSafe(msAmountEth)
    );
    log("✅ Milestone created");
    refresh();
  };
  const doApprove = async () => {
    await onchainApprove(BigInt(apprJobId), BigInt(apprMsId));
    log("✅ Milestone approved");
    refresh();
  };
  const doRelease = async () => {
    await onchainRelease(BigInt(relJobId), BigInt(relMsId));
    log("✅ Payment released");
    refresh();
  };
  const doWithdraw = async () => {
    await onchainWithdraw(who as Address);
    log("💸 Withdraw done");
    refresh();
  };
  const doCheckBalance = async () => {
    const b = await onchainBalance(balAddr as Address);
    setBalance(b);
    log(`ℹ️ Balance = ${b.toString()} wei`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-6">
      <div className="grid md:grid-cols-[1.1fr_1fr] gap-6">
        {/* left */}
        <div>
          <h1 className="text-3xl font-bold mb-6 text-white drop-shadow">
            Mintaro MVP{" "}
            <span className="text-sm bg-white/20 px-2 py-1 rounded">
              escrow demo
            </span>
          </h1>

          <Section title="1) Create Job">
            <Row>
              <Field
                label="Freelancer"
                value={freelancer}
                onChange={setFreelancer}
              />
              <Field label="UI Title" value={jobTitle} onChange={setJobTitle} />
              <Field
                label="Value ETH (ignored)"
                value={jobValueEth}
                onChange={setJobValueEth}
              />
              <Btn onClick={doCreateJob}>Create</Btn>
            </Row>
          </Section>

          <Section title="2) Create Milestone">
            <Row>
              <Field label="Job ID" value={msJobId} onChange={setMsJobId} />
              <Field label="UI Title" value={msTitle} onChange={setMsTitle} />
              <Field
                label="Amount (ETH)"
                value={msAmountEth}
                onChange={setMsAmountEth}
              />
              <Btn onClick={doCreateMs}>Create & Fund</Btn>
            </Row>
          </Section>

          <Section title="3) Approve Milestone">
            <Row>
              <Field label="Job ID" value={apprJobId} onChange={setApprJobId} />
              <Field
                label="Milestone ID"
                value={apprMsId}
                onChange={setApprMsId}
              />
              <Btn onClick={doApprove}>Approve</Btn>
            </Row>
          </Section>

          <Section title="4) Release Payment">
            <Row>
              <Field label="Job ID" value={relJobId} onChange={setRelJobId} />
              <Field
                label="Milestone ID"
                value={relMsId}
                onChange={setRelMsId}
              />
              <Btn onClick={doRelease}>Release</Btn>
            </Row>
          </Section>

          <Section title="5) Withdraw">
            <Row>
              <Field label="Withdraw As" value={who} onChange={setWho} />
              <Btn onClick={doWithdraw}>Withdraw</Btn>
            </Row>
          </Section>

          <Section title="6) Check Balance">
            <Row>
              <Field
                label="Freelancer Address"
                value={balAddr}
                onChange={setBalAddr}
              />
              <Btn onClick={doCheckBalance}>Check</Btn>
              {balance !== null && (
                <span className="text-sm font-mono text-gray-700">
                  {balance.toString()} wei
                </span>
              )}
            </Row>
          </Section>

          <Section title="Logs">
            <div className="p-3 rounded-lg bg-gray-900 text-green-400 font-mono text-xs max-h-48 overflow-auto">
              {logs.length === 0 ? "No logs yet" : logs.join("\n")}
            </div>
          </Section>
        </div>

        {/* right */}
        <div>
          <Section title="State Snapshot">
            <pre className="text-xs p-3 rounded-lg bg-gray-100 border max-h-[80vh] overflow-auto">
              {JSON.stringify(snap, null, 2)}
            </pre>
            <Btn kind="ghost" onClick={refresh}>
              Refresh
            </Btn>
          </Section>
        </div>
      </div>
    </div>
  );
}

// helpers
function toWeiSafe(v: string): bigint {
  try {
    return parseEther(v || "0");
  } catch {
    return 0n;
  }
}
