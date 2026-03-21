import chalk from "chalk";
import { COLORS } from "./colors.js";

const STATUS_COLOR_MAP: Record<string, string> = {
  ACTIVE: COLORS.success,
  ENABLED: COLORS.success,
  PAUSED: COLORS.warning,
  REMOVED: COLORS.error,
  DELETED: COLORS.error,
  ARCHIVED: COLORS.error,
  DRAFT: COLORS.muted,
};

export function formatStatus(status: string): string {
  const hex = STATUS_COLOR_MAP[status];
  if (!hex) {
    return status;
  }
  return chalk.hex(hex)(status);
}
