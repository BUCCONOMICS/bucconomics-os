import type { HealthChecker, RuntimeCompleter } from "./types.js";

export function createDeferredRuntimeCompleter(): RuntimeCompleter {
  return {
    async complete() {
      return {
        status: "deferred",
        missingComponents: ["BuccApi", "BuccReviewAgent", "BuccMonitoring"],
      };
    },
  };
}

export function createUnavailableHealthChecker(): HealthChecker {
  return {
    async run() {
      return { status: "unavailable", issue: 21 };
    },
  };
}
