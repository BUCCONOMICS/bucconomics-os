"use client";

import { useCallback, useEffect, useState } from "react";

import { SuitabilityQuiz, type Answers } from "../compliance/SuitabilityQuiz";
import { computeRiskBand } from "../../lib/onboarding";
import { useSmartAccount } from "../../store/walletStore";
import {
  getUserStatus,
  mintUid,
  recordKyc,
  type UserStatus,
} from "../../lib/api";

type Step = "quiz" | "wallet" | "uid" | "tranche" | "done";

const POLL_INTERVAL_MS = 10_000;

export function OnboardingFlow() {
  const [step, setStep] = useState<Step>("quiz");
  const { address, connect } = useSmartAccount();
  const [answers, setAnswers] = useState<Answers | null>(null);
  const [uidTokenId, setUidTokenId] = useState<bigint | null>(null);
  const [seniorAmount, setSeniorAmount] = useState("");
  const [juniorAmount, setJuniorAmount] = useState("");
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [kycError, setKycError] = useState<string | null>(null);
  const [kycRecording, setKycRecording] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  const [minting, setMinting] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const riskBand = answers ? computeRiskBand(answers) : null;
  const canMint = Boolean(userStatus?.can_mint);

  const handleQuizSubmit = useCallback((submitted: Answers) => {
    setAnswers(submitted);
    setStep("wallet");
  }, []);

  const syncKyc = useCallback(
    async (address: string, isCancelled: () => boolean = () => false) => {
      setKycError(null);
      try {
        let status = await getUserStatus(address);
        if (isCancelled()) return;
        if (!status) {
          setKycRecording(true);
          await recordKyc(address, riskBand ?? "MEDIUM");
          if (isCancelled()) return;
          setKycRecording(false);
          status = await getUserStatus(address);
          if (isCancelled()) return;
        }
        setUserStatus(status);
      } catch (error) {
        if (isCancelled()) return;
        setKycRecording(false);
        setKycError(
          error instanceof Error ? error.message : "Failed to sync KYC",
        );
      }
    },
    [riskBand],
  );

  useEffect(() => {
    if (step !== "uid" || !address) return;
    let cancelled = false;
    void syncKyc(address, () => cancelled);
    const interval = setInterval(() => {
      void getUserStatus(address)
        .then((status) => {
          if (!cancelled) setUserStatus(status);
        })
        .catch(() => {});
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [step, address, syncKyc]);

  useEffect(() => {
    if (step !== "uid" || !userStatus || userStatus.can_mint) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [step, userStatus]);

  const handleConnect = useCallback(async () => {
    await connect();
    setStep("uid");
  }, [connect]);

  const handleMintUid = useCallback(async () => {
    if (!address || minting) return;
    setMinting(true);
    setMintError(null);
    try {
      const { uid_token_id } = await mintUid(address);
      setUidTokenId(BigInt(uid_token_id));
      setStep("tranche");
    } catch (error) {
      setMintError(
        error instanceof Error ? error.message : "Failed to mint UID",
      );
    } finally {
      setMinting(false);
    }
  }, [address, minting]);

  const handleDeposit = useCallback(() => {
    setStep("done");
  }, []);

  const reset = useCallback(() => {
    setStep("quiz");
    setAnswers(null);
    setUidTokenId(null);
    setSeniorAmount("");
    setJuniorAmount("");
    setUserStatus(null);
    setKycError(null);
    setKycRecording(false);
    setMintError(null);
    setMinting(false);
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
          account <code className="text-sm">{address}</code>
        </p>
        {kycError && (
          <div
            role="alert"
            className="mb-4 p-3 bg-red-50 text-red-800 rounded-lg"
          >
            <p className="mb-2">KYC sync failed: {kycError}</p>
            <Button onClick={() => address && void syncKyc(address)}>
              Retry
            </Button>
          </div>
        )}
        {!kycError && kycRecording && (
          <p role="status" className="mb-4 text-gray-600">
            Recording your KYC certification…
          </p>
        )}
        {!kycError && !kycRecording && userStatus && !canMint && (
          <div
            role="status"
            className="mb-4 p-4 bg-amber-50 text-amber-900 rounded-lg"
          >
            <p className="font-semibold">Regulatory cooling-off in progress</p>
            <p className="mt-1">
              Your certification is recorded. Minting unlocks when the
              cooling-off period ends.
            </p>
            <p className="mt-2 font-mono text-2xl">
              {formatRemaining(userStatus.cooling_off_ends_at, now)}
            </p>
          </div>
        )}
        {mintError && (
          <div
            role="alert"
            className="mb-4 p-3 bg-red-50 text-red-800 rounded-lg"
          >
            <p>UID mint failed: {mintError}</p>
          </div>
        )}
        <Button
          onClick={() => void handleMintUid()}
          disabled={!canMint || minting}
        >
          {minting ? "Minting…" : "Mint BUCC_UID"}
        </Button>
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
            <code className="text-sm">{address}</code>
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
        <Button onClick={reset}>Start over</Button>
      </Card>
    );
  }

  return (
    <Card>
      <SuitabilityQuiz onSubmit={handleQuizSubmit} />
    </Card>
  );
}

function formatRemaining(endsAt: string | null, now: number): string {
  if (!endsAt) return "00:00:00";
  const remainingMs = Math.max(0, new Date(endsAt).getTime() - now);
  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(
    2,
    "0",
  );
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
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
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
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
