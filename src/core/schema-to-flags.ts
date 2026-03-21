import type { FlagDefinition, JSONSchema } from "../types.js";

/** Fields handled internally by pagination, not exposed as CLI flags. */
const INTERNAL_FIELDS = new Set(["cursor", "limit"]);

/**
 * Convert a JSON Schema (from MCP inputSchema) into CLI flag definitions.
 */
export function schemaToFlags(schema: JSONSchema): FlagDefinition[] {
  const { properties, required = [] } = schema;
  if (!properties) return [];

  const requiredSet = new Set(required);
  const flags: FlagDefinition[] = [];

  for (const [name, prop] of Object.entries(properties)) {
    if (INTERNAL_FIELDS.has(name)) continue;

    const flagName = name.replace(/_/g, "-");
    const flagType = normalizeType(prop.type);

    const flag: FlagDefinition = {
      name: flagName,
      type: flagType,
      required: requiredSet.has(name),
    };

    if (prop.description) flag.description = prop.description;
    if (prop.enum) flag.choices = prop.enum;
    if (prop.default !== undefined) flag.default = prop.default;

    flags.push(flag);
  }

  return flags;
}

function normalizeType(type: string): "string" | "number" | "boolean" {
  if (type === "number" || type === "integer") return "number";
  if (type === "boolean") return "boolean";
  return "string";
}
