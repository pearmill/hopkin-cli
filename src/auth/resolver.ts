import { AuthError } from "../errors.js";
import { readCredentials } from "./credentials.js";

export function resolveAuth(options?: {
  apiKeyFlag?: string;
  configDir?: string;
}): string {
  // 1. Flag takes highest precedence
  if (options?.apiKeyFlag) {
    return options.apiKeyFlag;
  }

  // 2. Environment variable
  const envKey = process.env.HOPKIN_API_KEY;
  if (envKey) {
    return envKey;
  }

  // 3. File-based credentials
  const creds = readCredentials(options?.configDir);

  // API key in file takes precedence over OAuth
  if (creds.api_key) {
    return creds.api_key;
  }

  // OAuth token (must not be expired)
  if (creds.oauth) {
    if (creds.oauth.expires_at > Date.now()) {
      return creds.oauth.access_token;
    }
    // Expired OAuth
    throw new AuthError(
      "OAuth token has expired.",
      'Run "hopkin auth login" to re-login.',
    );
  }

  // 4. Nothing found
  throw new AuthError(
    "No authentication credentials found.",
    'Set HOPKIN_API_KEY or run "hopkin auth login".',
  );
}
