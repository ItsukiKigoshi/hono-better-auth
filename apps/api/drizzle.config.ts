import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: ['./src/db/schema.ts', './src/db/auth-schema.ts'],
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    url: process.env.LOCAL_DB_PATH ?? '',
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
    token: process.env.CLOUDFLARE_D1_TOKEN!,
  },
});