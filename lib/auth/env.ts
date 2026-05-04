function required(name: string): string {
  const v = process.env[name];
  if (!v || v.length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

export const APP_PASSWORD = required("APP_PASSWORD");
export const AUTH_SECRET = required("AUTH_SECRET");
