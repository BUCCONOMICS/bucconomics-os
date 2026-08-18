import { assembleConfigs } from "./config.js";
import type {
  AwsIdentityPort,
  FoundationProvisioner,
  HealthChecker,
  InstallerResult,
  Presenter,
  ProviderSecretStore,
  PulumiCliPort,
  RuntimeCompleter,
  PromptPort,
} from "./types.js";
import { runWizard } from "./wizard.js";

export interface InstallerDependencies {
  readonly pulumi: PulumiCliPort;
  readonly identity: AwsIdentityPort;
  readonly prompt: PromptPort;
  readonly secrets: ProviderSecretStore;
  readonly provisioner: FoundationProvisioner;
  readonly runtime: RuntimeCompleter;
  readonly health: HealthChecker;
  readonly presenter: Presenter;
}

export async function runInstaller(
  dependencies: InstallerDependencies,
): Promise<InstallerResult> {
  const command = await dependencies.pulumi.ensureSupported();
  const initialIdentity = await dependencies.identity.getIdentity();
  const answers = await runWizard(dependencies.prompt);
  const confirmedIdentity = await dependencies.identity.getIdentity(
    answers.region,
  );

  if (initialIdentity.accountId !== confirmedIdentity.accountId) {
    throw new Error(
      "AWS account changed during setup; no resources were created",
    );
  }
  const confirmed = await dependencies.presenter.confirmAccount({
    accountId: confirmedIdentity.accountId,
    region: answers.region,
    mode: answers.mode,
  });
  if (!confirmed) {
    throw new Error("Installation cancelled; no resources were created");
  }

  const config = await assembleConfigs({
    answers,
    identity: confirmedIdentity,
    secrets: dependencies.secrets,
  });
  let foundation;
  try {
    foundation = await dependencies.provisioner.provision({
      config: config.aws,
      command,
    });
  } catch (error) {
    await Promise.allSettled(
      config.createdSecretRefs.map((arn) =>
        dependencies.secrets.deleteSecret(arn, config.aws.region),
      ),
    );
    throw error;
  }
  const runtime = await dependencies.runtime.complete({
    config: config.bucc,
    foundation,
  });
  const health = await dependencies.health.run({ foundation });
  const result: InstallerResult = {
    accountId: confirmedIdentity.accountId,
    region: answers.region,
    mode: answers.mode,
    config,
    foundation,
    runtime,
    health,
  };
  dependencies.presenter.summary(result);
  return result;
}
