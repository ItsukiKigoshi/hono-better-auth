# Hono-Better-Auth

This is an example full-stack monorepo app for authentication with Email OTP + Passkey (Password-less).

## Spec
- Runtime/Package Manager: Bun
- API: Hono
- ORM: Drizzle-ORM
- DB: Cloudflare D1 (SQLite on Local Environment)
- Auth: Better-Auth
- App: Vite + React Router

## TODO
Step-by-Step!
- [x] Email + Password with Better-Auth
  - [ ] Conditional Rendering (Show content only after Login)
- [ ] Passkey with Better-Auth
- [ ] Conditional Rendering with Better-Auth
- [ ] Share Drizzle Schema across frontend & backend (e.g. packages/db)

---

## What's Done
### Rabbit Holes (引っかかったポイントたち)
  - dotenv package is not compatible with　wrangler
    - https://developers.cloudflare.com/workers/configuration/environment-variables/#local-development-with-secrets

### Configure package.json in project root for monorepo
```jsonc:package.json
// package.json
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
Also, configure ``bun dev`` to run locally by default
```jsonc:apps/api/package.json
// apps/api/package.json
{
  "name": "hono-better-auth-api",
  "type": "module",
  "scripts": {
    "dev": "wrangler dev --local",
    "dev:remote": "wrangler dev --remote",
```

#### Create Database with wrangler
```bash
bun x wrangler d1 create hono-better-auth-db --local
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

import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema"; // add for later

export const favoritesTable = sqliteTable("favorites", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  airlineName: text("airline_name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
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

const isLocal = !!process.env.LOCAL_DB_PATH;

export default defineConfig({
  out: './drizzle',
  schema: ['./src/db/schema.ts', './src/db/auth-schema.ts'],
  dialect: 'sqlite',
  driver: isLocal ? undefined : 'd1-http', 
  dbCredentials: isLocal 
    ? {
        url: process.env.LOCAL_DB_PATH,
      }
    : {
        accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
        databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
        token: process.env.CLOUDFLARE_D1_TOKEN!,
      },
});
```

Configure .env for remote database
Refer to: https://orm.drizzle.team/docs/guides/d1-http-with-drizzle-kit
```env:apps/api/.env
LOCAL_DB_PATH= # Generated above with echo command

# Add 3 lines below manually from Cloudflare Dashboard
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_DATABASE_ID=
CLOUDFLARE_D1_TOKEN=
```

Add migrations_dir in wrangler.jsonc
```jsonc:apps/api/wrangler.jsonc
// apps/api/wrangler.jsonc

{
// ...
	"d1_databases": [
		{
		  // Add the line below
			"migrations_dir": "drizzle"
		}
	]
```


Update Database based on schema
```bash
# Use these 2 commands instead of drizzle-kit push for 
bunx drizzle-kit generate
bunx wrangler d1 migrations apply hono-better-auth-db --local
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

#### Initialise Better-Auth

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
  return betterAuth({
    database: drizzleAdapter(drizzle(d1, { schema }), {
      provider: "sqlite",
      schema: schema,
    }),
    },
    baseURL: "http://localhost:8787/api/auth",
    trustedOrigins: ["http://localhost:5173"]
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
bunx drizzle-kit generate
bunx wrangler d1 migrations apply hono-better-auth-db --local
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
  return betterAuth({
    database: drizzleAdapter(drizzle(d1, { schema }), {
      provider: "sqlite",
      schema: schema,
    }),
    // Add the line beow
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

const app = new Hono<{ Bindings: { hono_better_auth_db: D1Database } }>()

app.get('/', (c) => c.text('Hono-Better-Auth-API'))

app.use("/api/auth/*", cors({
  origin: "http://localhost:5173",
  credentials: true,
}))

app.on(["POST", "GET"], "/api/auth/*", (c) => {
  const auth = getAuth(c.env.hono_better_auth_db);
  return auth.handler(c.req.raw);
});

export default app;
```

Add Node.js compatability flag (did not work w/o this option)
```jsonc:apps/api/wrangler.jsonc
// apps/api/wrangler.jsonc
{
  // ...
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
// apps/app/package.json
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

```ts:apps/app/app/lib/auth.ts
// apps/app/app/lib/auth.ts

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    baseURL: "http://localhost:8787/api/auth" // Set Backend URL
});
```

```ts:apps/app/app/routes/signin.tsx
// apps/app/app/routes/signin.tsx

import { Form } from "react-router"
import { useState } from "react"
import { authClient } from "~/lib/auth"

export default function SignIn() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [isNewUser, setIsNewUser] = useState(false)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isNewUser) {
      await authClient.signUp.email({
        email,
        password,
        name,
      }, {
        onSuccess: () => alert("Account created successfully!"),
        onError: (ctx) => alert(ctx.error.message),
      })
    } else {
      await authClient.signIn.email({
        email,
        password,
      }, {
        onError: (ctx) => {
          if (ctx.error.status === 401 || ctx.error.code === "USER_NOT_FOUND") {
            setIsNewUser(true)
            alert("Account not found. Please enter your name to sign up.")
          } else {
            alert(ctx.error.message)
          }
        },
      })
    }
  }

  return (
    <div>
      <h2>{isNewUser ? "Sign Up" : "Sign In"}</h2>
      
      <Form onSubmit={handleAuth}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        
        {isNewUser && (
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Username"
            required
          />
        )}

        <button type="submit" style={{ display: "block", marginTop: "10px" }}>
          {isNewUser ? "Create Account" : "Sign In"}
        </button>
      </Form>

      <div style={{ marginTop: "15px", fontSize: "0.9em" }}>
        {isNewUser ? (
          <p>
            Already have an account?{" "}
            <button 
              type="button"
              onClick={() => setIsNewUser(false)} 
              style={{ background: "none", border: "none", color: "blue", cursor: "pointer", textDecoration: "underline" }}
            >
              Sign In here
            </button>
          </p>
        ) : (
          <p>
            Don't have an account?{" "}
            <button 
              type="button"
              onClick={() => setIsNewUser(true)} 
              style={{ background: "none", border: "none", color: "blue", cursor: "pointer", textDecoration: "underline" }}
            >
              Sign Up here
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
```

```tsx:apps/app/app/welcome/welcome.tsx
// apps/app/app/welcome/welcome.tsx

import SignIn from "~/routes/signin";
import { authClient } from "~/lib/auth";

export function Welcome() {
  const { data: session, isPending } = authClient.useSession();

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
        },
      },
    });
  };

  if (isPending) return <div style={{ maxWidth: "300px", margin: "20px auto" }}>Loading...</div>;

  return (
    <main style={{ maxWidth: "300px", margin: "20px auto" }}>
      {session ? (
        <div>
          <p>Hi {session.user.name}! You're logged in.</p>
          <button onClick={handleSignOut}>Sign Out</button>
        </div>
      ) : (
        <div>
          <SignIn />
        </div>
      )}
    </main>
  );
}
```

```bash
bunx drizzle-kit generate
bunx wrangler d1 migrations apply hono-better-auth-db --local
```

### Optimise for production

Add the lines
```jsonc:apps/api/wrangler.jsonc
// apps/api/wrangler.jsonc

  "vars": {
    // For all environment
    // For Production, add API_URL and APP_URL in Workers Setting
     "API_URL": "http://localhost:8787",
     "APP_URL": "http://localhost:5173"
   },
```

Generate types again
```bash
cd apps/api && bunx wrangler types
```

```ts:apps/api/src/lib/auth.ts
// apps/api/src/lib/auth.ts

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
    emailAndPassword: {
      enabled: true,
    },
    // Rewrite for Production
    baseURL: `${env.API_URL}/api/auth`,
    trustedOrigins: [env.APP_URL],
  });
};
```

```ts:apps/api/src/index.ts
// apps/api/src/index.ts

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/d1"
import { getAuth } from "./lib/auth"
import { favoritesTable } from "./db/schema"

const app = new Hono<{ Bindings: Required<Env> }>() 

app.use('*', async (c, next) => {
  const corsMiddleware = cors({
    origin: c.env.APP_URL,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
  return corsMiddleware(c, next)
})

app.get('/', (c) => c.text('Hono-Better-Auth-API'))

app.on(["POST", "GET"], "/api/auth/*", (c) => {
  const auth = getAuth(c.env);
  return auth.handler(c.req.raw);
});

app.get("/favorites", async (c) => {
  const db = drizzle(c.env.hono_better_auth_db);
  const auth = getAuth(c.env);
  
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const list = await db.select()
    .from(favoritesTable)
    .where(eq(favoritesTable.userId, session.user.id));
    
  return c.json(list);
});

app.post("/favorites", async (c) => {
  const db = drizzle(c.env.hono_better_auth_db);
  const auth = getAuth(c.env);
  
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const { airlineName } = await c.req.json();
  
  const result = await db.insert(favoritesTable).values({
    userId: session.user.id,
    airlineName: airlineName,
  }).returning();　
  
  return c.json({ success: true, data: result[0] });
});

export default app;
```

```ts:apps/app/app/lib/auth.ts
// apps/app/app/lib/auth.ts

import { createAuthClient } from "better-auth/react";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8787";

export const authClient = createAuthClient({
    baseURL: `${baseURL}/api/auth`
});
```

```tsx:apps/app/app/welcome/welcome.tsx
// apps/app/app/welcome/welcome.tsx

import { useState, useEffect } from "react";
import { authClient } from "~/lib/auth";
import SignIn from "~/routes/signin";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8787";

export function Welcome() {
  const { data: session } = authClient.useSession();
  const [favorites, setFavorites] = useState<{id: number, airlineName: string}[]>([]);
  const [input, setInput] = useState("");

  const fetchFavorites = async () => {
    const res = await fetch(`${baseURL}/favorites`, {
      headers: { Authorization: `Bearer ${session?.session.token}` },
      credentials: "include", 
    });
    const data = await res.json();
    setFavorites(data);
  };


  const addFavorite = async () => {
    if (!input) return;
    await fetch(`${baseURL}/favorites`, {
      method: "POST",
      body: JSON.stringify({ airlineName: input }),
      headers: { "Content-Type": "application/json" },
      credentials: "include", 
    });
    setInput("");
    fetchFavorites();
  };

  useEffect(() => { if (session) fetchFavorites(); }, [session]);

  return (
    <main style={{ maxWidth: "300px", margin: "20px auto" }}>
      {session ? (
        <div>
          <h3>My Favorite Aviations</h3>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="CPA, AFR, etc." />
          <button onClick={addFavorite}>Add</button>

          <ul>
            {favorites?.map(f => (
              <li key={f.id}>{f.airlineName}</li>
            ))}
          </ul>
          
          <button onClick={() => authClient.signOut()}>Sign Out</button>
        </div>
      ) : (
        <SignIn/>
      )}
    </main>
  );
}
```

Did work well Locally, but the 10ms late limit became the bottleneck with password matching (hashing)
---
# Decided to Limit to Passkey and MagicLink
https://better-auth.com/docs/plugins/magic-link
https://better-auth.com/docs/plugins/passkey


```bash
bun add resend
bun add @better-auth/passkey
```

```ts
// apps/api/src/lib/auth.ts

import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import { Resend } from "resend";
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
    plugins: [
      passkey(),
      magicLink({
        sendMagicLink: async ({ email, url }, ctx) => {
          const resend = new Resend(env.RESEND_API_KEY);
          const { error } = await resend.emails.send({
            from: "Itsuki Kigoshi <itsukikigoshi@gmail.com>",
            to: [email],
            subject: "Login Link [hono_better_auth]",
            html: `<p>Click the Link below to Login：</p><a href="${url}">${url}</a>`,
          });

          if (error) {
            console.error("Failed to Send Magic Link:", error);
            throw new Error("Failed to Send Email ﾐｱﾈﾖ;)");
          }
        },
      }),
    ],
    baseURL: process.env.API_URL ? `${process.env.API_URL}/api/auth` : "http://localhost:8787/api/auth",
    trustedOrigins: [env.APP_URL, "https://hono-better-auth.pages.dev"],
  });
};
```


```bash
bun x auth@latest generate --config src/lib/auth-cli.ts --output src/db/auth-schema.ts
```

```bash
bunx drizzle-kit generate
bunx wrangler d1 migrations apply hono-better-auth-db --local
```