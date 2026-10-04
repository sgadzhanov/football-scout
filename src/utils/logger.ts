import { getEnvironment } from "../config/env.js";
const levels = { debug: 0, info: 1, warn: 2, error: 3 };
export function log(level: keyof typeof levels, message: string): void {
  if (levels[level] < levels[getEnvironment().LOG_LEVEL ?? "info"]) return;
  if (level === "warn" || level === "error") console.error(message);
  else console.log(message);
}
