"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { timingSafeEqual } from "node:crypto";
import { APP_PASSWORD } from "./env";
import {
  AUTH_COOKIE_NAME,
  COOKIE_MAX_AGE_SECONDS,
  signCookieValue,
} from "./cookie";

function constantTimeStringEquals(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export async function loginAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const password = String(formData.get("password") ?? "");
  if (!constantTimeStringEquals(password, APP_PASSWORD)) {
    return { error: "Senha incorreta." };
  }
  const jar = await cookies();
  jar.set(AUTH_COOKIE_NAME, signCookieValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
  const next = String(formData.get("next") ?? "/");
  redirect(next.startsWith("/") ? next : "/");
}

export async function logoutAction() {
  const jar = await cookies();
  jar.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  redirect("/login");
}
