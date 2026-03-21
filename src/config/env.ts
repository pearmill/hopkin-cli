import type { HopkinConfig, OutputFormat } from "../types.js";

interface EnvConfig extends Partial<HopkinConfig> {
  api_key?: string;
  default_account?: string;
  no_color?: boolean;
}

export function getEnvValue(key: string): string | undefined {
  return process.env[key] || undefined;
}

export function getEnvConfig(): EnvConfig {
  const config: EnvConfig = {};

  const apiKey = getEnvValue("HOPKIN_API_KEY");
  if (apiKey) config.api_key = apiKey;

  const defaultAccount = getEnvValue("HOPKIN_DEFAULT_ACCOUNT");
  if (defaultAccount) config.default_account = defaultAccount;

  const defaultPlatform = getEnvValue("HOPKIN_DEFAULT_PLATFORM");
  if (defaultPlatform) config.default_platform = defaultPlatform;

  const outputFormat = getEnvValue("HOPKIN_OUTPUT_FORMAT");
  if (outputFormat) config.output_format = outputFormat as OutputFormat;

  const noColor = getEnvValue("HOPKIN_NO_COLOR");
  if (noColor) config.no_color = true;

  return config;
}
