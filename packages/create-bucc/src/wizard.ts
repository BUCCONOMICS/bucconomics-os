import type {
  PromptPort,
  ProviderAnswer,
  RpcAnswer,
  WizardAnswers,
} from "./types.js";

export const PRACTICE_DEFAULTS = {
  name: "my-community",
  region: "eu-west-2",
  mode: "practice",
  rpcEndpoint: "https://sepolia.base.org",
  reviewCadenceHours: 168,
  budgetThreshold: 100,
} as const;

export async function runWizard(prompt: PromptPort): Promise<WizardAnswers> {
  const name = await prompt.input({
    message: "What should this BUCC be called?",
    initial: PRACTICE_DEFAULTS.name,
  });
  const region = await prompt.input({
    message: "Which AWS region should hold your BUCC?",
    initial: PRACTICE_DEFAULTS.region,
  });
  const contactEmail = await prompt.input({
    message: "Which email should receive operator notifications?",
  });
  const mode = await prompt.select({
    message: "Start in practice mode or deliberately go live?",
    choices: [
      { value: "practice", label: "Practice (recommended)" },
      { value: "live", label: "Live" },
    ],
  });
  if (
    mode === "live" &&
    !(await prompt.confirm({
      message: "Live mode creates production resources and costs. Continue?",
      initial: false,
    }))
  ) {
    throw new Error("Live installation cancelled");
  }
  const kycProvider = await collectProvider(prompt, "KYC", "mock-kyc", mode);
  const financialProvider = await collectProvider(
    prompt,
    "financial",
    "mock-fiat",
    mode,
  );
  const rpc = await collectRpc(prompt, mode);
  const reviewCadenceHours = parsePositiveNumber(
    await prompt.input({
      message: "How many hours between activity reviews?",
      initial: String(PRACTICE_DEFAULTS.reviewCadenceHours),
    }),
    "review cadence",
  );
  const budgetThreshold = parsePositiveNumber(
    await prompt.input({
      message: "At what monthly cost should we alert you?",
      initial: String(PRACTICE_DEFAULTS.budgetThreshold),
    }),
    "budget threshold",
  );

  return {
    name,
    region,
    contactEmail,
    mode,
    kycProvider,
    financialProvider,
    rpc,
    reviewCadenceHours,
    budgetThreshold,
  };
}

async function collectProvider(
  prompt: PromptPort,
  label: string,
  practiceProvider: string,
  installationMode: WizardAnswers["mode"],
): Promise<ProviderAnswer> {
  const provider = requireValue(
    await prompt.input({
      message: `Which ${label} provider will you use?`,
      initial: installationMode === "practice" ? practiceProvider : undefined,
    }),
    `${label} provider`,
  );
  const mode =
    installationMode === "live"
      ? "credentials"
      : await prompt.select({
          message: `Use the ${label} sandbox or provider credentials?`,
          choices: [
            { value: "sandbox", label: "Sandbox" },
            { value: "credentials", label: "Provider credentials" },
          ],
        });
  if (mode === "sandbox") {
    return { provider, mode };
  }
  const credential = requireValue(
    await prompt.password({
      message: `Enter the ${label} provider credential`,
      mask: "*",
    }),
    `${label} provider credential`,
  );
  return { provider, mode, credential };
}

async function collectRpc(
  prompt: PromptPort,
  installationMode: WizardAnswers["mode"],
): Promise<RpcAnswer> {
  const mode =
    installationMode === "live"
      ? "credentials"
      : await prompt.select({
          message: "Use the public Base Sepolia RPC or a provider credential?",
          choices: [
            { value: "public", label: "Public Base Sepolia RPC" },
            { value: "credentials", label: "RPC provider credential" },
          ],
        });
  if (mode === "public") {
    return {
      mode,
      endpoint: await prompt.input({
        message: "Public RPC endpoint",
        initial: PRACTICE_DEFAULTS.rpcEndpoint,
      }),
    };
  }
  const provider = requireValue(
    await prompt.input({ message: "RPC provider name" }),
    "RPC provider",
  );
  const credential = requireValue(
    await prompt.password({
      message: "Enter the RPC provider credential",
      mask: "*",
    }),
    "RPC provider credential",
  );
  return { mode, provider, credential };
}

function requireValue(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${field} is required`);
  return trimmed;
}

function parsePositiveNumber(value: string, field: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${field} must be a positive number`);
  }
  return parsed;
}
