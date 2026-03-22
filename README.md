# Hono-Better-Auth

This is an example full-stack monorepo app for authentication with Email OTP + Passkey (Password-less).

## Spec
- API: Hono + Zod
  - DB: Drizzle-ORM
  - Auth: Better-Auth + Resend
- App: Vite + React

## Done

### API
```bash
$ bun create hono@latest apps/api
#create-hono version 0.19.4
#✔ Using target directory … apps/api
#✔ Which template do you want to use?
#cloudflare-workers
#✔ Do you want to install project dependencies?
#Yes
#✔ Which package manager do you want to use? bun
#✔ Cloning the template
#✔ Installing project dependencies
#🎉 Copied project files
#Get started with: cd apps/api
```

```bash
$ cd apps/api
```

```bash
$ cd apps/api
```

```bash
$ bun add drizzle-orm better-auth @better-auth/passkey @hono/zod-openapi @hono/zod-validator zod
$ bun add -D drizzle-kit wrangler @cloudflare/workers-types
```

Ref. 
- Passkey in Better Auth
  https://better-auth.com/docs/plugins/passkey

- Email OTP
  https://better-auth.com/docs/plugins/email-otp

```ts : apps/api/src/db/schema.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// --- Better-Auth Tables ---
export const user = sqliteTable("user", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: integer("email_verified", { mode: "boolean" }).notNull(),
    image: text("image"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    // Custom field
    username: text("username").unique(),
    hasOnboarded: integer("has_onboarded", { mode: "boolean" }).default(false),
});

export const session = sqliteTable("session", {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id").notNull().references(() => user.id),
});

export const account = sqliteTable("account", {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id").notNull().references(() => user.id),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }),
    updatedAt: integer("updated_at", { mode: "timestamp" }),
});

// Passkey
export const passkey = sqliteTable("passkey", {
    id: text("id").primaryKey(),
    name: text("name"),
    publicKey: text("public_key").notNull(),
    userId: text("user_id").notNull().references(() => user.id),
    credentialId: text("credential_id").notNull(),
    counter: integer("counter").notNull(),
    deviceType: text("device_type").notNull(),
    backedUp: integer("backed_up", { mode: "boolean" }).notNull(),
    transports: text("transports"),
    createdAt: integer("created_at", { mode: "timestamp" }),
});


export const notes = sqliteTable("books", {
    id: integer("id", {mode: "number"}).primaryKey({autoIncrement: true}),
    userId: text("user_id").notNull().references(() => user.id),
    title: text("title").notNull().default("Sans Titre"),
    content: text("content").notNull(),
    isPublic: integer("is_public", {mode: "boolean"}).default(false),
});
```

```bash
$ bunx wrangler d1 create hono-better-auth
```

```ts : apps/api/drizzle.config.ts
import {defineConfig} from 'drizzle-kit';

export default defineConfig({
    schema: './src/schema.ts',
    out: './migrations',
    dialect: 'sqlite',
    /*driver: 'd1-http',*/
    dbCredentials: {
        url: '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/local.sqlite',
        /*accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
        databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
        token: process.env.CLOUDFLARE_D1_TOKEN!,*/
    },
});
```

```bash
$ bunx drizzle-kit generate
$ bunx wrangler d1 migrations apply hono-better-auth --local
```

```ts : apps/api/drizzle.config.ts
import {defineConfig} from 'drizzle-kit';

export default defineConfig({
    schema: './src/schema.ts',
    out: './migrations',
    dialect: 'sqlite',
    /*driver: 'd1-http',*/
    dbCredentials: {
        // Replace the line below with the actual path
        url: '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/433ccbc0f0c054cffcfb9b417f2f80a848d76d363aff12336deb9c37eb6285b8.sqlite',
        /*accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
        databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
        token: process.env.CLOUDFLARE_D1_TOKEN!,*/
    },
});
```

```json5 : apps/api/tsconfig.json
{
  "compilerOptions": {
    // ...
    "types": [
      // Add the line below:
      "@cloudflare/workers-types" // Important to Avoid Type Error!!
    ],
  },
}
```

```ts : apps/api/src/index.ts
import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, or } from 'drizzle-orm';
import { getAuth } from './lib/auth';
import { user, notes } from './db/schema';

type Bindings = {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// 1. Better-Auth Handler
app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return getAuth(c.env.DB, c.env).handler(c.req.raw);
});

// 2. Onboarding API (User Name Registration)
app.post("/api/onboarding", async (c) => {
  const auth = getAuth(c.env.DB, c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const { username } = await c.req.json<{ username: string }>();
  const db = drizzle(c.env.DB);

  await db.update(user)
      .set({ username, hasOnboarded: true })
      .where(eq(user.id, session.user.id));

  return c.json({ success: true });
});

// 3. Public Page API (/u/:username/notes)
app.get("/u/:username/notes", async (c) => {
  const usernameParam = c.req.param("username");
  const auth = getAuth(c.env.DB, c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  const db = drizzle(c.env.DB);

  // Search User
  const targetUser = await db.select().from(user).where(eq(user.username, usernameParam)).get();
  if (!targetUser) return c.json({ error: "User not found" }, 404);

  // Get Data from Public or User's Private
  const results = await db.select().from(notes)
      .where(and(
          eq(notes.userId, targetUser.id),
          or(
              eq(notes.isPublic, true),
              session?.user.id === targetUser.id ? eq(notes.userId, targetUser.id) : undefined
          )
      ));

  return c.json(results);
});

export default app;
```

### App
```bash
$ cd ../.. # Return to project root
$ bun create vite@latest apps/app -- --template react-ts
```

```bash
$ cd apps/app
$ bun add better-auth @better-auth/passkey
```



```ts : apps/app/src/lib/auth-client.ts
import { createAuthClient } from "better-auth/client";
import { passkeyClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: "http://localhost:8787", // Hono URL
  plugins: [
    passkeyClient()
  ]
});
```

Pass Types from api to app by utilising monorepo environment
```json5 : apps/api/package.json
{
"name": "hono-better-auth-api",
"version": "0.0.0",
"type": "module",
"exports": {
".": "./src/index.ts",
"./auth": "./src/lib/auth.ts"
}
}
```

```json5 : apps/app/package.json
// apps/app/package.json
"devDependencies": {
  "hono-better-auth-api": "workspace:*"
}
```

```bash
/apps/app$ bun install
```

```tsx : apps/app/src/App.tsx

```