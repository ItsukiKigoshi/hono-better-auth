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
