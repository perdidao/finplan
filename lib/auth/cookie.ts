import { createHmac, timingSafeEqual } from "node:crypto";
import { AUTH_SECRET } from "./env";

const COOKIE_NAME = "finplan_auth";
const COOKIE_PAYLOAD = "authenticated";
export const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export function signCookieValue(): string {
  return createHmac("sha256", AUTH_SECRET).update(COOKIE_PAYLOAD).digest("hex");
}

export function verifyCookieValue(value: string | undefined | null): boolean {
  if (!value || typeof value !== "string") return false;
  const expected = Buffer.from(signCookieValue(), "utf8");
  const provided = Buffer.from(value, "utf8");
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}

export const AUTH_COOKIE_NAME = COOKIE_NAME;
