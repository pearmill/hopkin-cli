import * as fs from "node:fs";
import * as path from "node:path";

export interface WriteOptions {
  output?: string; // file path, or undefined for stdout
  append?: boolean;
}

export function writeOutput(content: string, options?: WriteOptions): void {
  if (!options?.output) {
    process.stdout.write(content);
    return;
  }

  const filePath = options.output;
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (options.append) {
    fs.appendFileSync(filePath, content, "utf-8");
  } else {
    fs.writeFileSync(filePath, content, "utf-8");
  }
}
