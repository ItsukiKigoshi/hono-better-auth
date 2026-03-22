import { createAuthClient } from "better-auth/client";
import { passkeyClient } from "@better-auth/passkey/client"
import {emailOTPClient, inferAdditionalFields} from "better-auth/client/plugins";
import type { getAuth } from "hono-better-auth-api/auth"

export const authClient = createAuthClient({
    baseURL: "http://localhost:8787", // Hono URL
    plugins: [
        passkeyClient(),
        emailOTPClient(),
        inferAdditionalFields < typeof getAuth > ()
    ] ,
});