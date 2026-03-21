import { Writable } from "node:stream";

export function createTTYMock(options: { columns?: number; rows?: number } = {}) {
  const chunks: Buffer[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(Buffer.from(chunk));
      callback();
    },
  }) as Writable & { isTTY: boolean; columns: number; rows: number };

  stream.isTTY = true;
  stream.columns = options.columns ?? 120;
  stream.rows = options.rows ?? 40;

  return {
    stream,
    getOutput: () => Buffer.concat(chunks).toString(),
  };
}
