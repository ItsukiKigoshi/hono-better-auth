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
    },
    baseURL: `${env.API_URL?.replace(/\/$/, "")}/api/auth`,
    trustedOrigins: [env.APP_URL],
  });
};