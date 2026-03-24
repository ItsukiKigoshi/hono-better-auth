import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../db/auth-schema"; 


export const getAuth = (d1: D1Database) => {
  if (!d1) {
    throw new Error("D1 database binding is missing. Check wrangler.jsonc or environment.");
  }
  const db = drizzle(d1, { schema });
  
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: schema,
    }),
    emailAndPassword: {
      enabled: true,
    },
    baseURL: "http://localhost:8787/api/auth",
    trustedOrigins: ["http://localhost:5173"]
  });
};