import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";

export const authConfig = (d1: D1Database) => ({
  database: drizzleAdapter(drizzle(d1), {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
  },
});

export const auth = betterAuth(authConfig({} as D1Database));