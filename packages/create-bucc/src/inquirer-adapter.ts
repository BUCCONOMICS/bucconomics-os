import { confirm, input, password, select } from "@inquirer/prompts";

import type { PromptPort } from "./types.js";

export function createInquirerPrompt(): PromptPort {
  return {
    confirm: (request) =>
      confirm({ message: request.message, default: request.initial }),
    input: (request) =>
      input({ message: request.message, default: request.initial }),
    password: (request) =>
      password({ message: request.message, mask: request.mask }),
    select: (request) =>
      select({ message: request.message, choices: [...request.choices] }),
  };
}
