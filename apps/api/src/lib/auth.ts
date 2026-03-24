import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../db/auth-schema";

export const getAuth = (env: Env) => {
  return betterAuth({
    database: drizzleAdapter(drizzle(env.hono_better_auth_db!!, { schema }), {
      provider: "sqlite",
      schema: schema,
    }),
    secret: env.BETTER_AUTH_SECRET, 
     cookie: {
       sameSite: "none", 
       secure: true,
       httpOnly: true,
     },
    emailAndPassword: {
      enabled: true,
    // TODO - Do not use password on the first place
      password: {
              hash: async (password: string) => {
                const encoder = new TextEncoder();
                const salt = crypto.getRandomValues(new Uint8Array(16));
                const keyMaterial = await crypto.subtle.importKey(
                  "raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]
                );
                const hash = await crypto.subtle.deriveBits(
                  { name: "PBKDF2", salt, iterations: 1000, hash: "SHA-256" },
                  keyMaterial, 256
                );
                const s = btoa(String.fromCharCode(...salt));
                const h = btoa(String.fromCharCode(...new Uint8Array(hash)));
                return `${s}:${h}`;
              },
              verify: async ({ hash, password }) => {
                const [saltStr, hashStr] = hash.split(":");
                const salt = Uint8Array.from(atob(saltStr), c => c.charCodeAt(0));
                const encoder = new TextEncoder();
                const keyMaterial = await crypto.subtle.importKey(
                  "raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]
                );
                const newHash = await crypto.subtle.deriveBits(
                  { name: "PBKDF2", salt, iterations: 1000, hash: "SHA-256" },
                  keyMaterial, 256
                );
                return btoa(String.fromCharCode(...new Uint8Array(newHash))) === hashStr;
              }
      }
    },
    baseURL: `${env.API_URL?.replace(/\/$/, "")}/api/auth`,
    trustedOrigins: [env.APP_URL],
  });
};