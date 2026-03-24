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
- [ ] Share Drizzle Schema across frontend & backend (e.g. packages/db)

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

Update Package.json for each project to match package.json in project root
```jsonc:apps/api/package.json
{
  "name": "hono-better-auth-api",
// ...
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
import * as schema from "../db/auth-schema"; 


export const getAuth = (d1: D1Database) => {
  const db = drizzle(d1, { schema });
  
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: schema,
    }),
  });
};
```

```apps/api/src/lib/auth-cli.ts
import { getAuth } from "./auth";

export const auth = getAuth({} as D1Database);
```

```bash
bun x auth@latest generate --config src/lib/auth-cli.ts --output src/db/auth-schema.ts
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
import * as schema from "../db/auth-schema"; 


export const getAuth = (d1: D1Database) => {
  const db = drizzle(d1, { schema });
  
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: schema,
    }),
    // Add lines below
    emailAndPassword: {
      enabled: true,
    },
    baseURL: "http://localhost:8787/api/auth",
    trustedOrigins: ["http://localhost:5173"]
  });
};
```

```ts:apps/api/src/index.ts
// apps/api/src/index.ts

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { getAuth } from "./lib/auth";  

const app = new Hono<{ Bindings: { DB: D1Database } }>()

app.use("/api/auth/*", cors({
  origin: "http://localhost:5173",
  credentials: true,
}))

app.on(["POST", "GET"], "/api/auth/*", (c) => {
  const auth = getAuth(c.env.DB);
  return auth.handler(c.req.raw);
});

export default app;
```

Add Node.js compatability flag (did not work w/o this option)
```jsonc:apps/api/wrangler.jsonc
{
	"$schema": "node_modules/wrangler/config-schema.json",
	"name": "api",
	"main": "src/index.ts",
 "compatibility_flags": [
    "nodejs_compat"
  ],
  //...
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
cd apps/app
```

Update Package.json for each project to match package.json in project root
```jsonc:apps/app/package.json
{
  "name": "hono-better-auth-app",
// ...
```

For React-Router and BetterAuth Integration, refer to:
https://better-auth.com/docs/integrations/react-router

```bash
bun add better-auth
```

```env:apps/api/.env
# Add Random Strings longer than 32 characters to encrypt
BETTER_AUTH_SECRET=
```


```ts:apps/app/app/routes/api.auth.$.ts
import { auth } from '../lib/auth.server'
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router"

export async function loader({ request }: LoaderFunctionArgs) {
    return auth.handler(request)
}

export async function action({ request }: ActionFunctionArgs) {
    return auth.handler(request)
}
```

```ts:apps/app/app/lib/auth.ts
// apps/app/app/lib/auth.ts

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    baseURL: "http://localhost:8787/api/auth" // Set Backend URL
});
```

```ts:apps/app/app/routes/signup.tsx
import { Form } from "react-router"
import { useState } from "react"
import { authClient } from "~/lib/auth"

export default function SignUp() {
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")

  const signUp = async () => {
    await authClient.signUp.email(
      {
        email,
        password,
        name,
      },
      {
        onRequest: (ctx) => {
          // show loading state
        },
        onSuccess: (ctx) => {
          // redirect to home
        },
        onError: (ctx) => {
          alert(ctx.error)
        },
      },
    )
  }

  return (
    <div>
      <h2>
        Sign Up
      </h2>
      <Form
        onSubmit={signUp}
      >
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />
        <button
          type="submit"
        >
          Sign Up
        </button>
      </Form>
    </div>
  )
}
```

```ts:apps/app/app/routes/signin.tsx
import { Form } from "react-router"
import { useState } from "react"
import { authClient } from "~/lib/auth"

export default function SignIn() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const signIn = async () => {
    await authClient.signIn.email(
      {
        email,
        password,
      },
      {
        onRequest: (ctx) => {
          // show loading state
        },
        onSuccess: (ctx) => {
          // redirect to home
        },
        onError: (ctx) => {
          alert(ctx.error)
        },
      },
    )
  }

  return (
    <div>
      <h2>
        Sign In
      </h2>
      <Form
        onSubmit={signIn}
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />
        <button
          type="submit"
        >
          Sign In
        </button>
      </Form>
    </div>
  )
}
```

```tsx:apps/app/app/welcome/welcome.tsx
import SignIn from "~/routes/signin";
import SignUp from "~/routes/signup";

export function Welcome() {
  return (
    <main>
      <SignUp />
      <SignIn />
    </main>
  );
}
```

### Rabbit Holes (引っかかったポイントたち)
- dotenv package is not compatible with　wrangler
  - https://developers.cloudflare.com/workers/configuration/environment-variables/#local-development-with-secrets
