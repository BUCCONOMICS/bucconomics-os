"use client";

import { useCallback, useRef, useState } from "react";
import type { SmartAccount } from "@repo/interfaces";
import { MockWalletProvider } from "@repo/wallet";

import { SuitabilityQuiz, type Answers } from "../compliance/SuitabilityQuiz";
import { computeRiskBand, simulateMintUid } from "../../lib/onboarding";

type Step = "quiz" | "wallet" | "uid" | "tranche" | "done";

export function OnboardingFlow() {
  const [step, setStep] = useState<Step>("quiz");
  const [answers, setAnswers] = useState<Answers | null>(null);
  const [account, setAccount] = useState<SmartAccount | null>(null);
  const [uidTokenId, setUidTokenId] = useState<bigint | null>(null);
  const [seniorAmount, setSeniorAmount] = useState("");
  const [juniorAmount, setJuniorAmount] = useState("");
  const walletRef = useRef<MockWalletProvider>(new MockWalletProvider());

  const riskBand = answers ? computeRiskBand(answers) : null;

  const handleQuizSubmit = useCallback((submitted: Answers) => {
    setAnswers(submitted);
    setStep("wallet");
  }, []);

  const handleConnect = useCallback(async () => {
    const connected = await walletRef.current.connect();
    setAccount(connected);
    setStep("uid");
  }, []);

  const handleMintUid = useCallback(() => {
    if (!account) return;
    setUidTokenId(simulateMintUid(account.address));
    setStep("tranche");
  }, [account]);

  const handleDeposit = useCallback(() => {
    setStep("done");
  }, []);

  if (step === "wallet") {
    return (
      <Card>
        <h2 className="text-2xl font-bold mb-2">Create your smart account</h2>
        <p className="text-gray-600 mb-6">
          We&apos;ll generate a private ERC-4337 smart account for you. You
          never need to hold gas — we handle that for you.
        </p>
        <Button onClick={handleConnect}>Connect smart account</Button>
      </Card>
    );
  }

  if (step === "uid") {
    return (
      <Card>
        <h2 className="text-2xl font-bold mb-2">Minting your identity</h2>
        <p className="text-gray-600 mb-4">
          Your verified status is minted as a soul-bound BUCC_UID token to your
          account <code className="text-sm">{account?.address}</code>
        </p>
        <Button onClick={handleMintUid}>Mint BUCC_UID</Button>
      </Card>
    );
  }

  if (step === "tranche") {
    return (
      <Card>
        <h2 className="text-2xl font-bold mb-2">Choose your tranche</h2>
        <p className="text-gray-600 mb-6">
          Deposit USDC into the tranched pool. Senior earns fixed lower yield;
          Junior earns higher variable yield but is first-loss.
        </p>
        <div className="space-y-4">
          <TrancheInput
            label="Senior tranche"
            value={seniorAmount}
            onChange={setSeniorAmount}
          />
          <TrancheInput
            label="Junior tranche"
            value={juniorAmount}
            onChange={setJuniorAmount}
          />
        </div>
        <Button onClick={handleDeposit}>Deposit</Button>
      </Card>
    );
  }

  if (step === "done") {
    const senior = Number(seniorAmount || 0);
    const junior = Number(juniorAmount || 0);
    return (
      <Card>
        <h2 className="text-2xl font-bold mb-4 text-green-800">
          ✓ Onboarding complete
        </h2>
        <ul className="text-gray-700 space-y-2 mb-6">
          <li>
            <strong className="font-semibold text-gray-900">Identity:</strong>{" "}
            BUCC_UID #{uidTokenId?.toString()} on{" "}
            <code className="text-sm">{account?.address}</code>
          </li>
          <li>
            <strong className="font-semibold text-gray-900">Risk band:</strong>{" "}
            {riskBand}
          </li>
          <li>
            <strong className="font-semibold text-gray-900">
              Senior deposit:
            </strong>{" "}
            {senior.toLocaleString()} USDC → SRN tokens
          </li>
          <li>
            <strong className="font-semibold text-gray-900">
              Junior deposit:
            </strong>{" "}
            {junior.toLocaleString()} USDC → JRN tokens
          </li>
        </ul>
        <Button
          onClick={() => {
            setStep("quiz");
            setAnswers(null);
            setAccount(null);
            setUidTokenId(null);
            setSeniorAmount("");
            setJuniorAmount("");
          }}
        >
          Start over
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <SuitabilityQuiz onSubmit={handleQuizSubmit} />
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-lg rounded-lg">
      {children}
    </div>
  );
}

function Button({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
    >
      {children}
    </button>
  );
}

function TrancheInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </span>
      <input
        type="number"
        min="0"
        placeholder="Amount in USDC"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </label>
  );
}
