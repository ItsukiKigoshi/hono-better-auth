import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/d1"
import { getAuth } from "./lib/auth"
import { favoritesTable } from "./db/schema"

type Variables = {
  db: ReturnType<typeof drizzle>;
  auth: ReturnType<typeof getAuth>;
};

const app = new Hono<{ Bindings: Required<Env>; Variables: Variables }>();

app.use('*', async (c, next) => {  
  const corsMiddleware = cors({
    origin: c.env.APP_URL,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
  return corsMiddleware(c, next)
})

app.use('*', async (c, next) => {
  const db = drizzle(c.env.hono_better_auth_db);
  const auth = getAuth(c.env);
  
  c.set('db', db);
  c.set('auth', auth);
  
  await next();
});


app.get('/', (c) => c.text('Hono-Better-Auth-API v0.0.0'))

app.on(["POST", "GET"], "/api/auth/*", (c) => {
  const auth = c.get('auth');
  return auth.handler(c.req.raw);
});

app.get("/favorites", async (c) => {
  const db = c.get('db');
  const auth = c.get('auth');
  
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const list = await db.select()
    .from(favoritesTable)
    .where(eq(favoritesTable.userId, session.user.id));
    
  return c.json(list);
});

app.post("/favorites", async (c) => {
  const db = c.get('db');
  const auth = c.get('auth');
  
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