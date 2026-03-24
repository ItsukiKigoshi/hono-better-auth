# Hono-Better-Auth

This is an example full-stack monorepo app for authentication with Email OTP + Passkey (Password-less).

## Spec
- API: Hono + Zod
  - DB: Drizzle-ORM
  - Auth: Better-Auth + Resend
- App: Vite + React

## TODO
Step-by-Step!
- [ ] Email + Password with Better-Auth
- [ ] Passkey with Better-Auth
- [ ] Conditional Rendering with Better-Auth

## Done

### API
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
```
