# Deploying to Vercel

The site and the AI service are two Vercel projects made from this same
GitHub repository. Deploy the AI service first, because the site needs its
address.

## 1. AI service (Express)

1. vercel.com → **Add New… → Project** → import `waliuhammad/Pdf_Converter`.
2. **Root Directory:** `ai-service`. Vercel detects Express from
   `src/app.ts`; leave the build settings at their defaults.
3. **Environment Variables:**

   | Name | Value |
   |---|---|
   | `GOOGLE_API_KEY` | your Gemini key from aistudio.google.com/apikey |
   | `GEMINI_MODEL` | `gemini-3.5-flash` (optional; see `ai-service/.env.example`) |

4. Deploy, then open `https://<ai-project>.vercel.app/` — it should answer
   `{"status":"OK","service":"AI Service",…}`. Copy that address.

## 2. Site (Next.js)

1. **Add New… → Project** → import the same repository again.
2. **Root Directory:** leave as the repository root. Framework: Next.js.
3. **Environment Variables** (Production, and Preview if you use previews):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_FIREBASE_API_KEY` | from `.env.local` |
   | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | from `.env.local` |
   | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | from `.env.local` |
   | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | from `.env.local` |
   | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | from `.env.local` |
   | `NEXT_PUBLIC_FIREBASE_APP_ID` | from `.env.local` |
   | `FIREBASE_PROJECT_ID` | from `.env.local` |
   | `FIREBASE_CLIENT_EMAIL` | from `.env.local` |
   | `FIREBASE_PRIVATE_KEY` | from `.env.local` — paste the whole key, `-----BEGIN PRIVATE KEY-----` to `-----END PRIVATE KEY-----` |
   | `AI_SERVICE_URL` | the AI service address from step 1, no trailing slash |
   | `NEXT_PUBLIC_MAX_UPLOAD_MB` | `4` |
   | `NEXT_PUBLIC_SITE_URL` | the site's final address, e.g. `https://<site>.vercel.app` (or your domain) |

   `PAYONEER_PAYMENT_URL` is optional (see `.env.example`).

4. Deploy.

## 3. Firebase: allow the new address

Firebase Console → **Authentication → Settings → Authorized domains → Add
domain** → `<site>.vercel.app` (and your custom domain, if any). Without
this, sign-in on the live site fails with `auth/unauthorized-domain`.

## What is different on Vercel

- **Uploads are limited to 4 MB per file.** Vercel functions accept request
  bodies up to 4.5 MB; `NEXT_PUBLIC_MAX_UPLOAD_MB=4` makes the upload box
  refuse larger files with a clear message instead of a failed request.
- **Word / Excel / PowerPoint → PDF** use the built-in fallback converter
  (`lib/office-to-pdf-fallback.ts`), because LibreOffice cannot be installed
  on Vercel. Layouts are simpler than with LibreOffice (Railway / Docker).
- **Fonts for Urdu / Arabic / Hindi PDFs** ship in `assets/fonts` and are
  bundled with the routes that need them (`next.config.ts`).
- **OCR of scanned pages** (PDF to Word) downloads its English language data
  on first use after each cold start, so the first scan can take longer.
- Functions may run up to 300 s on Hobby (route `maxDuration`s are ≤ 120 s).
