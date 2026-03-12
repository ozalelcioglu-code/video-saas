import { betterAuth } from "better-auth";
import { Pool } from "pg";

let authInstance: any = null;

export function getAuth() {
  if (authInstance) {
    return authInstance;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  authInstance = betterAuth({
    database: new Pool({
      connectionString: databaseUrl,
    }),
    emailAndPassword: {
      enabled: true,
    },
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  });

  return authInstance;
}

export const auth: any = new Proxy(
  {},
  {
    get(_target, prop) {
      const instance = getAuth();
      return instance[prop as keyof typeof instance];
    },
  }
);