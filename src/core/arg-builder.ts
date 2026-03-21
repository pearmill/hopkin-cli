import type { JSONSchema } from "../types.js";

/** Map of platform config keys to schema property names. */
const CONFIG_TO_SCHEMA: Record<string, string> = {
  mcc_id: "login_customer_id",
};

/** Account flag alias: --account maps to these schema fields. */
const ACCOUNT_FIELDS = ["account_id", "customer_id"];

/**
 * Convert parsed CLI flags back into MCP tool call arguments.
 *
 * - Converts kebab-case flag names to snake_case
 * - Coerces types based on schema
 * - Maps --account to the appropriate account ID field
 * - Injects platform config values
 * - Validates required fields
 */
export function buildArgs(
  flags: Record<string, unknown>,
  schema: JSONSchema,
  platformConfig?: Record<string, string>
): Record<string, unknown> {
  const { properties = {}, required = [] } = schema;
  const result: Record<string, unknown> = {};

  // Inject platform config values
  if (platformConfig) {
    for (const [configKey, configValue] of Object.entries(platformConfig)) {
      const schemaField = CONFIG_TO_SCHEMA[configKey];
      if (schemaField && schemaField in properties) {
        result[schemaField] = configValue;
      }
    }
  }

  // Process each flag
  for (const [flagName, rawValue] of Object.entries(flags)) {
    // Handle --account alias
    if (flagName === "account") {
      const accountField = findAccountField(properties);
      if (accountField) {
        result[accountField] = coerce(rawValue, properties[accountField].type);
      }
      continue;
    }

    // Convert kebab-case to snake_case
    const snakeName = flagName.replace(/-/g, "_");

    // Only include flags that exist in the schema
    if (!(snakeName in properties)) continue;

    result[snakeName] = coerce(rawValue, properties[snakeName].type);
  }

  // Validate required fields
  const missing = required.filter((field) => !(field in result));
  if (missing.length > 0) {
    throw new Error(`Missing required arguments: ${missing.join(", ")}`);
  }

  return result;
}

function findAccountField(
  properties: Record<string, { type: string }>
): string | undefined {
  for (const field of ACCOUNT_FIELDS) {
    if (field in properties) return field;
  }
  return undefined;
}

function coerce(value: unknown, schemaType: string): unknown {
  if (schemaType === "number" || schemaType === "integer") {
    return Number(value);
  }
  if (schemaType === "boolean") {
    if (value === "true" || value === true) return true;
    if (value === "false" || value === false) return false;
    return Boolean(value);
  }
  return value;
}
