export const COLORS = {
  primary: "#EA580C",
  success: "#22C55E",
  warning: "#EAB308",
  error: "#EF4444",
  info: "#3B82F6",
  muted: "#6B7280",
} as const;

let chalkInstance: typeof import("chalk").default | null = null;

async function getChalk() {
  if (!chalkInstance) {
    const { default: chalk } = await import("chalk");
    chalkInstance = chalk;
  }
  return chalkInstance;
}

export async function colorize(
  text: string,
  color: keyof typeof COLORS,
): Promise<string> {
  if (!supportsColor()) {
    return text;
  }
  const chalk = await getChalk();
  return chalk.hex(COLORS[color])(text);
}

export function supportsColor(): boolean {
  if ("NO_COLOR" in process.env) {
    return false;
  }
  if (process.env.FORCE_COLOR) {
    return true;
  }
  return process.stdout?.isTTY ?? false;
}
