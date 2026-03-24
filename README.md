# Hono-Better-Auth

This is an example full-stack monorepo app for authentication with Email OTP + Passkey (Password-less).

## Spec
- Package Manager: Bun
- API: Hono
  - ORM: Drizzle-ORM
  - DB: Cloudflare D1 (SQLite on Local Environment)
  - Auth: Better-Auth
- App: Vite + React

## TODO
Step-by-Step!
- [ ] Email + Password with Better-Auth
- [ ] Passkey with Better-Auth
- [ ] Conditional Rendering with Better-Auth

---

## What's Done
### Configure package.json in project root for monorepo
```jsonc:package.json
{
  "name": "hono-better-auth",
  "version": "1.0.0",
  "description": "",
  "scripts": {
    "dev:api": "pnpm--filter hono-better-auth-api dev",
    "dev:app": "pnpm--filter hono-better-auth-app dev",
    "dev": "pnpm--filter \"*\" dev"
  },
  "workspaces": [
    "apps/*"
  ],
  "private": true
}
```


### API
#### Initialisation
```bash
pnpm create hono@latest apps/api
# create-hono version 0.19.4
# ✔ Using target directory … apps/api
# ✔ Which template do you want to use? cloudflare-workers
# ✔ Do you want to install project dependencies? Yes
# ✔ Which package manager do you want to use? pnpm
# ✔ Cloning the template
# ✔ Installing project dependencies
# 🎉 Copied project files
# Get started with: cd apps/api
cd apps/api
```

#### Create Database with wrangler
```bash
pnpm dlx wrangler d1 create hono-better-auth-db
pnpm dlx wrangler d1 execute hono-better-auth-db --local --command "SELECT 1;" # This dummy command creates D1 Database locally
```

#### Add Drizzle
Database is required for user management by BetterAuth.

https://orm.drizzle.team/docs/get-started/d1-new

```bash
pnpm add drizzle-orm wrangler @libsql/client
pnpm add -D drizzle-kit tsx @types/node
```

Create Database Schema.
This time, I will create a table for a platform where puople can share their favorite avation company.

```ts:apps/api/src/db/schema.ts
// apps/api/src/db/schema.ts
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const usersTable = sqliteTable("users_table", {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  favoriteAviation: text().notNull(),
  email: text().notNull().unique(),
});
```
To run drizzle with Local D1 Database,refer to:
https://ygwyg.org/local-d1-drizzle-studio

```bash
# The following command creates .env with LOCAL_DB_PATH 
echo "LOCAL_DB_PATH=$(find .wrangler/state/v3/d1/miniflare-D1DatabaseObject -type f -name '*.sqlite' -print0 | xargs -0 ls -t | head -1)" >> .env
```

```ts:apps/api/drizzle.config.ts
// apps/api/drizzle.config.ts

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'sqlite',
  // Comment out Configulations for remote D1
  // driver: 'd1-http',
  dbCredentials: {
      url: process.env.LOCAL_DB_PATH!,
  //   accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
  //   databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
  //   token: process.env.CLOUDFLARE_D1_TOKEN!,
  },
});
```

Update Database based on schema
```bash
pnpm exec drizzle-kit push
```

To confirm the table generation, run:
```bash
pnpm exec drizzle-kit studio
```
You can see a table named "users_table".

#### Initialise Bette-Auth

Follow the steps indicated here:
https://better-auth.com/docs/installation

```bash
pnpm add better-auth
```


For Local sqlite connection with libsql and drizzle, refer to:
https://orm.drizzle.team/docs/get-started-sqlite#libsql

```ts:apps/api/src/lib/auth.ts
// apps/api/src/lib/auth.ts
 
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";

const client = createClient({
  url: `file:${process.env.LOCAL_DB_PATH!}`,
});

const db = drizzle(client);

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "sqlite",
    }),
});

```

```bash
pnpm dlx auth@latest generate --output src/db/auth-schema.ts
```

```ts:apps/api/drizzle.config.ts
// apps/api/drizzle.config.ts

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  // Update the line below for BetterAuth schema
  schema: ['./src/db/schema.ts', './src/db/auth-schema.ts'],
  dialect: 'sqlite',
  dbCredentials: {
      url: process.env.LOCAL_DB_PATH!,
  },
});
```

Update Database based on new auth schema
```bash
pnpm exec drizzle-kit push
```

To confirm the table generation, run:
```bash
pnpm exec drizzle-kit studio
```
You can see tables like "account", "session", etc.

#### Add emailAndPassword Option in BetterAuth

```ts:apps/api/src/lib/auth.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";

const client = createClient({
  url: `file:${process.env.LOCAL_DB_PATH!}`,
});

const db = drizzle(client);

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "sqlite",
    }),
    // Add emailAndPassword Option Here
    emailAndPassword: {
      enabled: true,
    },
});
```

```ts:apps/api/src/index.ts
import { Hono } from 'hono'
import { auth } from "./lib/auth"; 

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

export default app
```