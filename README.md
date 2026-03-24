# Hono-Better-Auth

This is an example full-stack monorepo app for authentication with Email OTP + Passkey (Password-less).

## Spec
- Runtime/Package Manager: Bun
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
    "dev:api": "bun --filter hono-better-auth-api dev",
    "dev:app": "bun --filter hono-better-auth-app dev",
    "dev": "bun --filter \"*\" dev"
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
bun create hono@latest apps/api
# create-hono version 0.19.4
# ✔ Using target directory … apps/api
# ✔ Which template do you want to use? cloudflare-workers
# ✔ Do you want to install project dependencies? Yes
# ✔ Which package manager do you want to use? bun
# ✔ Cloning the template
# ✔ Installing project dependencies
# 🎉 Copied project files
# Get started with: cd apps/api
cd apps/api
```

#### Create Database with wrangler
```bash
bun x wrangler d1 create hono-better-auth-db
bun x wrangler d1 execute hono-better-auth-db --local --command "SELECT 1;" # This dummy command creates D1 Database locally
```


#### Add Drizzle
Database is required for user management by BetterAuth.

https://orm.drizzle.team/docs/get-started/d1-new

```bash
bun add drizzle-orm wrangler
bun add -D drizzle-kit
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
  driver: 'd1-http',
  dbCredentials: {
    url: process.env.LOCAL_DB_PATH ?? '', // Use Local Database if LOCAL_DB_PATH is provided in .env
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
    token: process.env.CLOUDFLARE_D1_TOKEN!,
  },
});
```

```env:apps/api/.env
LOCAL_DB_PATH= # Generated above with echo command

# Add 3 lines below manually from Cloudflare Dashboard
# Refer to: https://orm.drizzle.team/docs/guides/d1-http-with-drizzle-kit
CLOUDFLARE_ACCOUNT_ID={Workers & Pages -> Overview -> copy Account ID from the right sidebar.}
CLOUDFLARE_DATABASE_ID={also indicated in wrangler.jsonc}
CLOUDFLARE_D1_TOKEN={My profile -> API Tokens and create token with D1 edit permissions}
```

Update Database based on schema
```bash
bun x drizzle-kit push
```

Generate Types
```bash
bun x wrangler types
```

To confirm the table generation, run:
```bash
bun x drizzle-kit studio
```
You can see a table named "users_table".

#### Initialise Bette-Auth

Follow the steps indicated here:
https://better-auth.com/docs/installation

```bash
bun add better-auth
```

```ts:apps/api/src/lib/auth.ts
// apps/api/src/lib/auth.ts
 
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";

export const authConfig = (d1: D1Database) => ({
  database: drizzleAdapter(drizzle(d1), {
    provider: "sqlite",
  }),
} as const);

export const auth = betterAuth(authConfig({} as D1Database));
```

```bash
bun x auth@latest generate --output src/db/auth-schema.ts
```

```ts:apps/api/drizzle.config.ts
// apps/api/drizzle.config.ts

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  // ...
  // Update the line below for BetterAuth schema
  schema: ['./src/db/schema.ts', './src/db/auth-schema.ts'],
  // ...
});
```

Update Database based on new auth schema
```bash
bun x drizzle-kit push
```

To confirm the table generation, run:
```bash
bun x drizzle-kit studio
```
You can see tables like "account", "session", etc.

#### Add emailAndPassword Option in BetterAuth

```ts:apps/api/src/lib/auth.ts
// apps/api/src/lib/auth.ts

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";

export const authConfig = (d1: D1Database) => ({
  database: drizzleAdapter(drizzle(d1), {
    provider: "sqlite",
  }),
  // Add emailAndPassword Option Here
  emailAndPassword: {
    enabled: true,
  },
});

export const auth = betterAuth(authConfig({} as D1Database));
```

```ts:apps/api/src/index.ts
// apps/api/src/index.ts

import { Hono } from 'hono'
import { auth } from "./lib/auth"; 

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

export default app
```

### App
```bash
cd ../.. # cd to project root if applicable
```

```bash
bun x create-react-router@latest apps/app
 #        create-react-router v7.13.2
 #     ◼  Directory: Using apps/app as project directory
 #     ◼  Using default template See https://github.com/remix-run/react-router-templates for more
 #     ✔  Template copied
 #  git   Initialize a new git repository?
 #        No
 # deps   Install dependencies with bun?
 #        Yes
 #     ✔  Dependencies installed
 # done   That's it!
 #        Enter your project directory using cd ./apps/app
```

Update Package.json for each project to match package.json in project root
```jsonc:apps/api/package.json
{
  "name": "hono-better-auth-api",
// ...
```
```jsonc:apps/app/package.json
{
  "name": "hono-better-auth-app",
// ...
```


### Rabbit Holes (引っかかったポイントたち)
- dotenv package is not compatible with　wrangler
  - https://developers.cloudflare.com/workers/configuration/environment-variables/#local-development-with-secrets