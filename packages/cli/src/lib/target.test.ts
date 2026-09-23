import { describe, expect, test } from "bun:test";
import { pickAppSource } from "./target.js";

describe("pickAppSource", () => {
  test("the --app flag wins over everything", () => {
    expect(pickAppSource({ flag: "a", env: "b", linked: "c" })).toEqual({
      kind: "value",
      appId: "a",
      from: "flag",
    });
  });

  test("the environment beats the link file", () => {
    expect(pickAppSource({ env: "b", linked: "c" })).toEqual({
      kind: "value",
      appId: "b",
      from: "env",
    });
  });

  test("the link file is used when nothing was passed", () => {
    expect(pickAppSource({ linked: "c" })).toEqual({
      kind: "value",
      appId: "c",
      from: "link",
    });
  });

  test("with no source at all, the caller must prompt", () => {
    expect(pickAppSource({})).toEqual({ kind: "prompt" });
  });

  test("an empty string is not a source", () => {
    expect(pickAppSource({ flag: "", env: "", linked: "c" })).toEqual({
      kind: "value",
      appId: "c",
      from: "link",
    });
  });
});
