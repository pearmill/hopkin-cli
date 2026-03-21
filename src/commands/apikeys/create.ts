import { defineCommand } from "citty";
import { resolveAuth } from "../../auth/resolver.js";
import { renderJSON } from "../../output/json.js";

const NOT_AVAILABLE_MESSAGE =
  "API key creation is not yet available via CLI. Visit https://app.hopkin.ai to manage API keys.";

export default defineCommand({
  meta: { name: "create", description: "Create an API key" },
  args: {
    json: {
      type: "boolean",
      description: "Output as JSON",
      default: false,
    },
    "api-key": {
      type: "string",
      description: "API key to use for authentication",
    },
  },
  run({ args }) {
    // Validate that the user is authenticated
    resolveAuth({ apiKeyFlag: args["api-key"] as string | undefined });

    if (args.json) {
      const output = renderJSON(
        { error: "not_available", message: NOT_AVAILABLE_MESSAGE },
        { pretty: true },
      );
      process.stdout.write(output + "\n");
    } else {
      process.stderr.write(NOT_AVAILABLE_MESSAGE + "\n");
    }
  },
});
