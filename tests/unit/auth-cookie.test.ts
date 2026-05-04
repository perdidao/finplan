import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  process.env.APP_PASSWORD = "test-password";
  process.env.AUTH_SECRET = "dGVzdC1zZWNyZXQtdGVzdC1zZWNyZXQtdGVzdC1zZWNyZXQ=";
});

describe("auth cookie", () => {
  it("signCookieValue produces a deterministic value for the same secret", async () => {
    const { signCookieValue } = await import("@/lib/auth/cookie");
    expect(signCookieValue()).toBe(signCookieValue());
  });

  it("verifyCookieValue accepts a value it produced", async () => {
    const { signCookieValue, verifyCookieValue } = await import("@/lib/auth/cookie");
    expect(verifyCookieValue(signCookieValue())).toBe(true);
  });

  it("verifyCookieValue rejects a tampered value", async () => {
    const { signCookieValue, verifyCookieValue } = await import("@/lib/auth/cookie");
    const tampered = signCookieValue().replace(/.$/, "x");
    expect(verifyCookieValue(tampered)).toBe(false);
  });

  it("verifyCookieValue rejects empty/missing", async () => {
    const { verifyCookieValue } = await import("@/lib/auth/cookie");
    expect(verifyCookieValue("")).toBe(false);
    expect(verifyCookieValue(undefined as unknown as string)).toBe(false);
  });
});
