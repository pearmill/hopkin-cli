import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  {
    test: {
      name: "unit",
      include: ["src/**/*.test.ts"],
      pool: "threads",
    },
  },
  {
    test: {
      name: "integration",
      include: ["tests/integration/**/*.test.ts"],
      pool: "forks",
    },
  },
  {
    test: {
      name: "regression",
      include: ["tests/regression/**/*.test.ts"],
      pool: "threads",
    },
  },
  {
    test: {
      name: "e2e",
      include: ["tests/e2e/**/*.test.ts"],
      pool: "forks",
      testTimeout: 15000,
    },
  },
]);
