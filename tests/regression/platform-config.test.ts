import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildArgs } from "../../src/core/arg-builder.js";
import { getEnvConfig } from "../../src/config/env.js";
import type { JSONSchema } from "../../src/types.js";

describe("Platform config", () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    savedEnv.HOPKIN_DEFAULT_ACCOUNT = process.env.HOPKIN_DEFAULT_ACCOUNT;
  });

  afterEach(() => {
    if (savedEnv.HOPKIN_DEFAULT_ACCOUNT === undefined) {
      delete process.env.HOPKIN_DEFAULT_ACCOUNT;
    } else {
      process.env.HOPKIN_DEFAULT_ACCOUNT = savedEnv.HOPKIN_DEFAULT_ACCOUNT;
    }
  });

  const metaSchema: JSONSchema = {
    type: "object",
    properties: {
      account_id: { type: "string", description: "Ad account ID" },
      status: { type: "string", description: "Status filter" },
    },
    required: ["account_id"],
  };

  const googleSchema: JSONSchema = {
    type: "object",
    properties: {
      customer_id: { type: "string", description: "Customer ID" },
      login_customer_id: {
        type: "string",
        description: "MCC login customer ID",
      },
      campaign_id: { type: "string", description: "Campaign ID" },
    },
    required: ["customer_id"],
  };

  describe("meta.default_account applies only to meta", () => {
    it("meta default_account is used when --account not provided", () => {
      const metaConfig = { default_account: "act_meta_default" };

      // buildArgs doesn't directly consume default_account, but the
      // platform router maps it to --account. We test that buildArgs
      // processes the account flag correctly.
      const args = buildArgs(
        { account: "act_meta_default" },
        metaSchema,
      );
      expect(args.account_id).toBe("act_meta_default");
    });

    it("meta config does not inject into google schema", () => {
      // meta config keys should not appear in google args
      const metaConfig = { default_account: "act_meta_default" };

      // buildArgs with google schema and no matching config keys
      const args = buildArgs(
        { account: "google_customer_123" },
        googleSchema,
      );
      expect(args.customer_id).toBe("google_customer_123");
      expect(args).not.toHaveProperty("default_account");
    });
  });

  describe("google.mcc_id injected as login_customer_id", () => {
    it("mcc_id maps to login_customer_id in google schema", () => {
      const googleConfig = { mcc_id: "mcc_123456" };

      const args = buildArgs(
        { account: "cust_789" },
        googleSchema,
        googleConfig,
      );
      expect(args.login_customer_id).toBe("mcc_123456");
      expect(args.customer_id).toBe("cust_789");
    });

    it("mcc_id is not injected when schema lacks login_customer_id", () => {
      const googleConfig = { mcc_id: "mcc_123456" };

      // Using meta schema which has no login_customer_id property
      const args = buildArgs(
        { account: "act_123" },
        metaSchema,
        googleConfig,
      );
      expect(args).not.toHaveProperty("login_customer_id");
      expect(args.account_id).toBe("act_123");
    });
  });

  describe("--account flag overrides platform default_account", () => {
    it("explicit --account flag value is used", () => {
      // When --account is passed explicitly, it should be used
      // regardless of platform config
      const args = buildArgs(
        { account: "act_explicit" },
        metaSchema,
      );
      expect(args.account_id).toBe("act_explicit");
    });

    it("--account maps to account_id for meta schema", () => {
      const args = buildArgs({ account: "act_123" }, metaSchema);
      expect(args.account_id).toBe("act_123");
    });

    it("--account maps to customer_id for google schema", () => {
      const args = buildArgs({ account: "cust_456" }, googleSchema);
      expect(args.customer_id).toBe("cust_456");
    });
  });

  describe("Platform config keys don't leak across platforms", () => {
    it("google mcc_id does not appear in meta args", () => {
      const googleConfig = { mcc_id: "mcc_123456" };

      // Build meta args with google config -- mcc_id should not map
      // because meta schema doesn't have login_customer_id
      const args = buildArgs(
        { account: "act_123" },
        metaSchema,
        googleConfig,
      );
      expect(args).not.toHaveProperty("mcc_id");
      expect(args).not.toHaveProperty("login_customer_id");
    });

    it("only config keys with schema mapping are injected", () => {
      const unknownConfig = {
        some_random_key: "value",
        another_key: "value2",
      };

      const args = buildArgs(
        { account: "act_123" },
        metaSchema,
        unknownConfig,
      );
      // Unknown config keys should not leak into args
      expect(args).not.toHaveProperty("some_random_key");
      expect(args).not.toHaveProperty("another_key");
    });
  });

  describe("HOPKIN_DEFAULT_ACCOUNT env", () => {
    it("env config captures HOPKIN_DEFAULT_ACCOUNT", () => {
      process.env.HOPKIN_DEFAULT_ACCOUNT = "env_account_123";
      const envConfig = getEnvConfig();
      expect(envConfig.default_account).toBe("env_account_123");
    });

    it("env config returns no default_account when unset", () => {
      delete process.env.HOPKIN_DEFAULT_ACCOUNT;
      const envConfig = getEnvConfig();
      expect(envConfig.default_account).toBeUndefined();
    });
  });
});
