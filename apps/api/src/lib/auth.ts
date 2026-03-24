import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../db/auth-schema"; 


export const getAuth = (d1: D1Database) => {
  
  return betterAuth({
    database: drizzleAdapter(drizzle(d1, { schema }), {
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