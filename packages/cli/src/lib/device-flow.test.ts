import { describe, expect, test } from "bun:test";
import { interpretPollResponse } from "./device-flow.js";

describe("interpretPollResponse", () => {
  test("returns a token set when the grant succeeds", () => {
    const outcome = interpretPollResponse(
      { access_token: "at", refresh_token: "rt", expires_in: 3600 },
      5,
      1_000,
    );

    expect(outcome).toEqual({
      kind: "token",
      token: { accessToken: "at", refreshToken: "rt", expiresAt: 1_000 + 3_600_000 },
    });
  });

  test("keeps waiting at the same interval while authorization is pending", () => {
    expect(interpretPollResponse({ error: "authorization_pending" }, 5)).toEqual({
      kind: "wait",
      intervalSeconds: 5,
    });
  });

  test("slow_down raises the interval by five seconds", () => {
    expect(interpretPollResponse({ error: "slow_down" }, 5)).toEqual({
      kind: "wait",
      intervalSeconds: 10,
    });
  });

  test("slow_down compounds — the increase is permanent, not a one-off pause", () => {
    // RFC 8628 §3.5: each slow_down adds to the interval the client keeps using.
    let interval = 5;
    for (const _ of [1, 2, 3]) {
      const outcome = interpretPollResponse({ error: "slow_down" }, interval);
      if (outcome.kind !== "wait") throw new Error("expected wait");
      interval = outcome.intervalSeconds;
    }
    expect(interval).toBe(20);
  });

  test("a denial is terminal", () => {
    expect(interpretPollResponse({ error: "access_denied" }, 5)).toEqual({
      kind: "error",
      message: "Authorization was denied",
    });
  });

  test("an expired code is terminal", () => {
    const outcome = interpretPollResponse({ error: "expired_token" }, 5);
    expect(outcome.kind).toBe("error");
  });

  test("an unknown error prefers the server's description", () => {
    expect(
      interpretPollResponse({ error: "boom", error_description: "Client disabled" }, 5),
    ).toEqual({ kind: "error", message: "Client disabled" });
  });

  test("a token with no expires_in falls back to an hour", () => {
    const outcome = interpretPollResponse({ access_token: "at" }, 5, 0);
    if (outcome.kind !== "token") throw new Error("expected token");
    expect(outcome.token.expiresAt).toBe(3_600_000);
    expect(outcome.token.refreshToken).toBeNull();
  });
});
