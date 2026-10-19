# Maya Web

A separate Next.js + TypeScript frontend for the Maya FastAPI backend. It implements Supabase email/password sign-up and sign-in, access-token authenticated chat requests, health status, conversation IDs, and a frontend voice-mode toggle.

## 1. Requirements

- Node.js 20.9+ and npm
- Your Supabase project URL and publishable (or legacy anon) key
- Maya backend deployed and reachable

## 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and set:

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Supabase publishable key (legacy anon key is also accepted)
- `NEXT_PUBLIC_MAYA_API_URL`: `https://maya-95qi.onrender.com` unless your backend URL changes

Only use the Supabase publishable/anon key in the frontend. **Never put `SUPABASE_SECRET_KEY`, a service-role key, or other backend secrets in `NEXT_PUBLIC_*` variables.**

## 3. Supabase setup

1. Open Supabase Dashboard → Authentication → Providers → Email and enable email/password auth.
2. For easiest local testing, decide whether email confirmation is required under Authentication settings. If it is enabled, signup asks the user to confirm their email before they can sign in.
3. Maya's backend auth dependency also expects the signed-in user to have a row in `profiles` with an allowed `role` (`owner`, `trusted_user`, or `guest`) and checks `tool_permissions` as configured in your backend. Creating a Supabase Auth user alone may not grant access to `/chat`; provision the corresponding profile/permissions using your existing secure admin workflow.
4. Add your local URL (usually `http://localhost:3000`) to Supabase Authentication → URL Configuration / Redirect URLs if your project settings require it.

## 4. Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## 5. API contract implemented

- `GET /health` — used to display whether the backend is reachable.
- `POST /chat` — sends `{ "message": "...", "session_id": "<uuid>", "voice_mode": false }` and the header `Authorization: Bearer <supabase access token>`.

The UI only sends the `voice_mode` boolean. It does **not** capture microphone audio or play TTS in the browser yet; those require a separate voice pipeline / response contract. Web research and memory navigation are marked as placeholders until matching backend endpoints are available.

## 6. CORS

If browser requests fail with a CORS error, configure the FastAPI app to allow your frontend origin, for example `http://localhost:3000` for local development and your deployed frontend domain for production. Do not use a wildcard with credentials. The frontend currently calls the backend directly from the browser.

## 7. Build / deploy

```bash
npm run build
```

Deploy this folder as its own Vercel project (or any Next.js host). Add the same three environment variables in the host's project settings. Set the correct production frontend origin in FastAPI CORS and Supabase URL configuration.
