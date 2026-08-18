import { spawn } from "node:child_process";

export interface ProcessRunInput {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string;
  readonly env: NodeJS.ProcessEnv;
  readonly stdin?: string;
}

export interface ProcessRunner {
  run(input: ProcessRunInput): Promise<void>;
}

export function createProcessRunner(): ProcessRunner {
  return {
    run(input) {
      return new Promise((resolve, reject) => {
        const child = spawn(input.command, input.args, {
          cwd: input.cwd,
          env: input.env,
          shell: false,
          stdio: ["pipe", "ignore", "ignore"],
        });
        child.once("error", () => reject(new Error("Pulumi command failed")));
        child.once("close", (code) => {
          if (code === 0) resolve();
          else reject(new Error("Pulumi command failed"));
        });
        child.stdin.end(input.stdin);
      });
    },
  };
}
