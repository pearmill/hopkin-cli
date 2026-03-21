import { defineCommand } from "citty";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { supportsColor } from "../../output/colors.js";

const SKILL_FILENAME = "hopkin-cli.skill";

function findSkillSource(): string | null {
  // 1. Bundled in dist/ alongside the binary
  const __filename = typeof __dirname !== "undefined"
    ? path.join(__dirname, SKILL_FILENAME)
    : path.join(path.dirname(fileURLToPath(import.meta.url)), SKILL_FILENAME);
  if (fs.existsSync(__filename)) return __filename;

  // 2. In the package root's dist/
  const fromDist = path.resolve(__dirname ?? ".", "..", SKILL_FILENAME);
  if (fs.existsSync(fromDist)) return fromDist;

  // 3. In skill/ relative to package root (dev mode)
  const fromSkillDir = path.resolve(__dirname ?? ".", "..", "..", "skill", "SKILL.md");
  if (fs.existsSync(fromSkillDir)) return fromSkillDir;

  return null;
}

function resolveTargetDir(projectFlag?: string): string {
  if (projectFlag) {
    return path.resolve(projectFlag, ".claude", "skills");
  }
  // Default: current working directory's .claude/skills/
  return path.resolve(process.cwd(), ".claude", "skills");
}

export default defineCommand({
  meta: {
    name: "install",
    description: "Install the Hopkin skill for Claude Code",
  },
  args: {
    global: {
      type: "boolean",
      description: "Install to ~/.claude/skills/ (user-wide)",
      default: false,
    },
    project: {
      type: "string",
      description: "Project directory to install into (default: current directory)",
    },
  },
  async run({ args }) {
    const useColor = supportsColor();
    const green = useColor ? "\x1b[32m" : "";
    const dim = useColor ? "\x1b[2m" : "";
    const reset = useColor ? "\x1b[0m" : "";

    const source = findSkillSource();
    if (!source) {
      process.stderr.write(
        "Error: Could not find skill file. Try reinstalling: npm install -g @hopkin/cli@latest\n",
      );
      process.exit(1);
    }

    const targetDir = args.global
      ? path.join(process.env.HOME ?? "~", ".claude", "skills")
      : resolveTargetDir(args.project);

    const targetPath = path.join(targetDir, SKILL_FILENAME);

    fs.mkdirSync(targetDir, { recursive: true });
    fs.copyFileSync(source, targetPath);

    process.stdout.write(`${green}Installed${reset} ${targetPath}\n`);
    process.stdout.write(
      `${dim}Claude Code will now use the Hopkin skill when you ask about ad data.${reset}\n`,
    );
  },
});
