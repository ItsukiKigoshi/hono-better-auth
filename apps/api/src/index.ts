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