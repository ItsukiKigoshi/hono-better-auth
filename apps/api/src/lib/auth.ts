import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { passkey } from "@better-auth/passkey";
import { emailOTP } from "better-auth/plugins"
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../db/schema";

export const getAuth = (db: D1Database, env: any) => betterAuth({
    database: drizzleAdapter(drizzle(db, { schema }), {
        provider: "sqlite",
        schema: { ...schema }
    }),
    plugins: [
        passkey(),
        emailOTP({
            async sendVerificationOTP({ email, otp, type }) {
                if (type === "sign-in") {
                    // Send the OTP for sign in
                    console.log(`Sending OTP ${otp} to ${email}`);
                } else if (type === "email-verification") {
                    // Send the OTP for email verification
                    console.log(`Sending OTP ${otp} to ${email}`);
                } else {
                    // Send the OTP for password reset
                    console.log(`Sending OTP ${otp} to ${email}`);
                }
            },
        }) ],
    user: {
        additionalFields: {
            hasOnboarded: {
                type: "boolean",
                default: false,
                input: false
            },
            username: {
                type: "string",
                unique: true,
                input: true
            }
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
}});