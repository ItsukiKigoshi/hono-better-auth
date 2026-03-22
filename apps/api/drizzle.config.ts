import {defineConfig} from 'drizzle-kit';

export default defineConfig({
    schema: './src/db/schema.ts',
    out: './migrations',
    dialect: 'sqlite',
    /*driver: 'd1-http',*/
    dbCredentials: {
        url: '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/local.sqlite',
        /*accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
        databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
        token: process.env.CLOUDFLARE_D1_TOKEN!,*/
    },
});