This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

You need **Node 20 to 24** (`node -v` — 25 is not supported yet) and git.
Nothing else: no Python, no Docker, no database. Every PDF tool runs inside this
server.

```bash
git clone https://github.com/waliuhammad/PDF_AI.git
cd PDF_AI
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). All 21 PDF tools — merge,
split, compress, rotate, watermark, sign, and every conversion — already work at
this point, with `.env.local` still empty.

Two things need filling in before everything works:

**Accounts, the dashboard, saved documents and chat history** need the six
`NEXT_PUBLIC_FIREBASE_*` values, from Firebase Console → Project settings →
General → Your apps. They are safe to share within the team.

Signing in also needs a service account key, which is *not* safe to share — it
can read and write every user's data. Each person downloads their own from
Firebase Console → Project settings → Service accounts → Generate new private
key, then runs:

```bash
node scripts/import-service-account.mjs
```

No argument needed — it finds the file the console just put in your Downloads,
fills in the three `FIREBASE_*` variables, prints nothing sensitive, and deletes
the JSON afterwards.

Do not copy the key by hand, and do not send the file or its contents to anyone.
It holds both `private_key` and `private_key_id` on adjacent lines, so the wrong
one is easy to grab — that produces a sign-in which appears to work and then
bounces straight back to `/login`. More importantly, the key can read and write
every user's data and mint a login token for any account, so a copy in a chat,
an issue or a screenshot means generating a new one.

**Summary, translate, grammar, OCR and chat** need the service in `ai-service/`
running alongside, in a second terminal:

```bash
cd ai-service
npm install
cp .env.example .env      # then add GOOGLE_API_KEY
npm run dev
```

The key is free from [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
It defaults to port 8001, which is where the app looks, so no other config is
needed. Chat also wants a Chroma server on port 8000; the other four AI tools
do not.

Skip `ai-service` entirely and the site still runs — those five tools return an
error, the other 21 are unaffected.

## Environment variables

Put these in `.env.local`. Most tools run without any of them; each entry says
what stops working when it is missing.

| Variable | Needed for | Without it |
| --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_*` | Accounts, saved documents, chats | Sign-in and the whole signed-in area fail |
| `AI_SERVICE_URL` | Summary, translate, grammar, OCR, chat | Falls back to `http://localhost:8001` |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Verifying the session cookie in `proxy.ts` | The signed-in area redirects everyone to /login, including signed-in users |
| `NEXT_PUBLIC_SITE_URL` | `sitemap.xml`, canonical URLs, OG tags | Falls back to the Railway or Vercel host, then `http://localhost:3000`. Set it whenever there is a custom domain |

Every conversion tool runs on this server. Nothing is sent to a third-party
conversion service, so none of them need an API key.

### The Firebase Admin credentials

These three come from a service account key: Firebase Console → Project Settings
→ Service Accounts → Generate new private key. The downloaded JSON maps to:

| JSON field | Variable |
| --- | --- |
| `project_id` | `FIREBASE_PROJECT_ID` |
| `client_email` | `FIREBASE_CLIENT_EMAIL` |
| `private_key` | `FIREBASE_PRIVATE_KEY` |

Keep the private key on one line with its `\n` escapes intact — that is the form
Railway and Vercel store, and the code turns them back into real newlines.

This key is a full admin credential: it can read and write every document and
mint a token for any user. It belongs in `.env.local` or the host's environment
settings, never in the repository and never pasted into a chat or an issue. If
one is ever exposed, delete it under Project Settings → Service Accounts →
Manage service account keys and generate a replacement.



`NEXT_PUBLIC_*` values are baked in at build time, so changing one means
rebuilding, not just restarting.

The AI tools also need the separate service in `ai-service/` running, with its
own `.env` holding `GOOGLE_API_KEY`. Chat additionally needs a Chroma server on
`CHROMA_PORT`; summary, translate and grammar do not.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
