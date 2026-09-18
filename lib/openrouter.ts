import "server-only";

const preferredModel = process.env.NEXT_OPEN_ROUTER_MODEL ?? "google/gemma-4-31b-it:free";

export const OPENROUTER_MODELS = [...new Set([
  preferredModel,
  "google/gemma-4-26b-a4b-it:free",
  "openrouter/free",
])];
