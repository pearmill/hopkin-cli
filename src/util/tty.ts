export function isTTY(): boolean {
  return !!process.stdout.isTTY;
}

export function isColorEnabled(): boolean {
  if (process.env.FORCE_COLOR) {
    return true;
  }
  if (process.env.NO_COLOR || process.env.HOPKIN_NO_COLOR) {
    return false;
  }
  return isTTY();
}

export function getTerminalWidth(): number {
  return process.stdout.columns ?? 80;
}
