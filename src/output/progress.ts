export function createProgress(): {
  update(current: number, total?: number): void;
  done(): void;
} {
  return {
    update(current: number, total?: number): void {
      if (!process.stderr.isTTY) return;

      const message =
        total !== undefined
          ? `\rFetching page ${current} of ${total}...`
          : `\rFetching page ${current}...`;

      process.stderr.write(message);
    },

    done(): void {
      if (!process.stderr.isTTY) return;

      // Clear the progress line
      process.stderr.write("\r\x1b[K");
    },
  };
}
