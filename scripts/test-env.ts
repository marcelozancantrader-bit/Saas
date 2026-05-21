import * as dotenv from "dotenv";
import { resolve } from "path";

const result = dotenv.config({ path: resolve(process.cwd(), ".env.local"), override: true });
console.log(
  "Before override, in process.env?",
  process.env.ANTHROPIC_API_KEY === undefined
    ? "undefined"
    : process.env.ANTHROPIC_API_KEY === ""
      ? "EMPTY STRING"
      : "set",
);
console.log("In result.parsed?", result.parsed?.ANTHROPIC_API_KEY?.slice(0, 12));
console.log(
  "dotenv parse:",
  result.error
    ? `ERROR: ${result.error.message}`
    : `OK, ${Object.keys(result.parsed ?? {}).length} vars`,
);
console.log("CWD:", process.cwd());
console.log(
  "ANTHROPIC_API_KEY first 12:",
  (process.env.ANTHROPIC_API_KEY ?? "MISSING").slice(0, 12),
);
console.log(
  "NEXT_PUBLIC_SUPABASE_URL:",
  (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "MISSING").slice(0, 30),
);
