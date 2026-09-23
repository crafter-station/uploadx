import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { type Config, DEFAULT_PROFILE, resolveProfileName } from "./config.js";

const config = (over: Partial<Config> = {}): Config => ({
  version: 1,
  defaultProfile: DEFAULT_PROFILE,
  profiles: {},
  ...over,
});

describe("resolveProfileName", () => {
  const saved = process.env.UPLOADX_PROFILE;

  beforeEach(() => {
    process.env.UPLOADX_PROFILE = "";
  });

  afterEach(() => {
    process.env.UPLOADX_PROFILE = saved ?? "";
  });

  test("the flag wins", () => {
    process.env.UPLOADX_PROFILE = "from-env";
    expect(resolveProfileName("from-flag", config({ defaultProfile: "from-config" }))).toBe(
      "from-flag",
    );
  });

  test("the environment beats the config default", () => {
    process.env.UPLOADX_PROFILE = "from-env";
    expect(resolveProfileName(undefined, config({ defaultProfile: "from-config" }))).toBe(
      "from-env",
    );
  });

  test("the config default is used last", () => {
    expect(resolveProfileName(undefined, config({ defaultProfile: "staging" }))).toBe("staging");
  });

  test("falls back to `default` when the config names nothing", () => {
    // A hand-edited config may have dropped the field entirely.
    const empty = config() as Config & { defaultProfile?: string };
    empty.defaultProfile = undefined as unknown as string;
    expect(resolveProfileName(undefined, empty)).toBe(DEFAULT_PROFILE);
  });
});
