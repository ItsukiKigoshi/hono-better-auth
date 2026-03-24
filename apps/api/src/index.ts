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