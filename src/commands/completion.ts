import { defineCommand } from "citty";
import { CLI_NAME } from "../constants.js";

const TOP_LEVEL_COMMANDS = [
  "auth",
  "config",
  "tools",
  "apikeys",
  "completion",
  "meta",
  "google",
  "linkedin",
  "reddit",
];

const SUBCOMMANDS: Record<string, string[]> = {
  auth: ["login", "logout", "status", "whoami", "set-key"],
  config: ["set", "get", "unset"],
  tools: ["list", "refresh"],
  apikeys: ["list", "create", "delete"],
};

const GLOBAL_FLAGS = ["--json", "--format", "--output", "--api-key", "--debug", "--help", "--version"];

const VALID_SHELLS = ["bash", "zsh", "fish"] as const;
type Shell = (typeof VALID_SHELLS)[number];

function generateBashCompletion(): string {
  const subcommandCases = Object.entries(SUBCOMMANDS)
    .map(
      ([cmd, subs]) =>
        `        ${cmd})\n            COMPREPLY=($(compgen -W "${subs.join(" ")}" -- "\${cur}"))\n            return 0\n            ;;`,
    )
    .join("\n");

  return `# Bash completion for ${CLI_NAME}
# Add to ~/.bashrc or ~/.bash_profile:
#   eval "$(${CLI_NAME} completion bash)"

_${CLI_NAME}_completions() {
    local cur prev commands
    COMPREPLY=()
    cur="\${COMP_WORDS[COMP_CWORD]}"
    prev="\${COMP_WORDS[COMP_CWORD-1]}"

    commands="${TOP_LEVEL_COMMANDS.join(" ")}"

    if [[ \${COMP_CWORD} -eq 1 ]]; then
        COMPREPLY=($(compgen -W "\${commands}" -- "\${cur}"))
        return 0
    fi

    case "\${COMP_WORDS[1]}" in
${subcommandCases}
    esac

    if [[ "\${cur}" == -* ]]; then
        COMPREPLY=($(compgen -W "${GLOBAL_FLAGS.join(" ")}" -- "\${cur}"))
        return 0
    fi
}

complete -F _${CLI_NAME}_completions ${CLI_NAME}
`;
}

function generateZshCompletion(): string {
  const subcommandCases = Object.entries(SUBCOMMANDS)
    .map(([cmd, subs]) => {
      const subList = subs.map((s) => `'${s}:${s} command'`).join(" ");
      return `        ${cmd})\n            local -a ${cmd}_cmds\n            ${cmd}_cmds=(${subList})\n            _describe -t ${cmd}-commands '${cmd} commands' ${cmd}_cmds\n            ;;`;
    })
    .join("\n");

  const commandList = TOP_LEVEL_COMMANDS.map((c) => `'${c}:${c} command'`).join(" ");

  return `#compdef ${CLI_NAME}
# Zsh completion for ${CLI_NAME}
# Add to ~/.zshrc:
#   eval "$(${CLI_NAME} completion zsh)"

_${CLI_NAME}() {
    local -a commands
    commands=(${commandList})

    _arguments -C \\
        '1:command:->command' \\
        '*::arg:->args'

    case "$state" in
    command)
        _describe -t commands '${CLI_NAME} commands' commands
        ;;
    args)
        case "\${words[1]}" in
${subcommandCases}
        esac
        ;;
    esac
}

compdef _${CLI_NAME} ${CLI_NAME}
`;
}

function generateFishCompletion(): string {
  const lines = [
    `# Fish completion for ${CLI_NAME}`,
    `# Add to ~/.config/fish/completions/${CLI_NAME}.fish`,
    ``,
    `# Disable file completions by default`,
    `complete -c ${CLI_NAME} -f`,
    ``,
    `# Top-level commands`,
  ];

  for (const cmd of TOP_LEVEL_COMMANDS) {
    lines.push(
      `complete -c ${CLI_NAME} -n "__fish_use_subcommand" -a "${cmd}" -d "${cmd} command"`,
    );
  }

  lines.push("");
  lines.push("# Subcommands");

  for (const [cmd, subs] of Object.entries(SUBCOMMANDS)) {
    for (const sub of subs) {
      lines.push(
        `complete -c ${CLI_NAME} -n "__fish_seen_subcommand_from ${cmd}" -a "${sub}" -d "${sub}"`,
      );
    }
  }

  lines.push("");
  lines.push("# Global flags");
  for (const flag of GLOBAL_FLAGS) {
    const flagName = flag.replace(/^--/, "");
    lines.push(
      `complete -c ${CLI_NAME} -l "${flagName}" -d "${flagName} option"`,
    );
  }

  lines.push("");
  return lines.join("\n");
}

export function generateCompletion(shell: string): string {
  switch (shell) {
    case "bash":
      return generateBashCompletion();
    case "zsh":
      return generateZshCompletion();
    case "fish":
      return generateFishCompletion();
    default:
      throw new Error(
        `Unsupported shell: ${shell}. Supported shells: ${VALID_SHELLS.join(", ")}`,
      );
  }
}

export default defineCommand({
  meta: { name: "completion", description: "Generate shell completion scripts" },
  args: {
    shell: {
      type: "positional",
      description: "Shell type (bash, zsh, fish)",
      required: true,
    },
  },
  run({ args }) {
    const shell = args.shell as string | undefined;

    if (!shell) {
      process.stderr.write(
        `Error: Missing shell argument.\nUsage: ${CLI_NAME} completion <bash|zsh|fish>\n`,
      );
      process.exitCode = 1;
      return;
    }

    if (!VALID_SHELLS.includes(shell as Shell)) {
      process.stderr.write(
        `Error: Unsupported shell "${shell}". Supported shells: ${VALID_SHELLS.join(", ")}\n`,
      );
      process.exitCode = 1;
      return;
    }

    const script = generateCompletion(shell);
    process.stdout.write(script);
  },
});
