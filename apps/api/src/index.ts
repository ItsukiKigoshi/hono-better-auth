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