import type { PromptPort, Presenter } from "./types.js";

export function createConsolePresenter(prompt: PromptPort): Presenter {
  return {
    info: (message) => console.log(message),
    warn: (message) => console.warn(message),
    async confirmAccount(input) {
      console.log(`\nAWS account: ${input.accountId}`);
      console.log(`AWS region: ${input.region}`);
      console.log(`Mode: ${input.mode === "live" ? "Live" : "Practice"}\n`);
      return prompt.confirm({
        message: "Is this your account?",
        initial: false,
      });
    },
    summary(result) {
      console.log("\nYour BUCC foundation is ready.\n");
      console.log(`AWS account: ${result.accountId}`);
      console.log(`AWS region: ${result.region}`);
      console.log(`Pulumi state: ${result.foundation.backendRef}`);
      console.log(`Database: ${result.foundation.databaseRef}`);
      console.log(
        "The API, review agent, and monitoring are deferred until their AWS components are available.",
      );
      console.log(
        "The full health check is unavailable until GitHub issue #21 is implemented.",
      );
    },
  };
}
