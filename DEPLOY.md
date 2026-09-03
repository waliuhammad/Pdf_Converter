# Deploying PDFAI

PDFAI is a full application — a Next.js website, an AI service, and a
vector database — so it must run on a **VPS** (virtual private server).
It cannot run on shared/regular web hosting.

**Requirements:** a VPS with at least 2 vCPU / 8 GB RAM (e.g. Hostinger
KVM 2) running **Ubuntu 24.04**, a domain name, and the values listed in
`.env.production.example`.

---

## 1. Connect to the server

From PowerShell or any terminal:

    ssh root@YOUR.SERVER.IP

(Enter the root password set when the VPS was created.)

## 2. Install Docker (one time)

    curl -fsSL https://get.docker.com | sh

Verify with `docker --version`.

## 3. Get the code

    git clone https://github.com/waliuhammad/PDF_AI.git
    cd PDF_AI

(For a private repo, GitHub will ask for a username and a personal
access token as the password.)

## 4. Configure

    cp .env.production.example .env
    nano .env

Fill in every value:

| Variable | Where it comes from |
|---|---|
| `NEXT_PUBLIC_FIREBASE_*` (6 values) | Firebase Console → Project settings → General → Your apps → the web app's config |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | The service-account JSON (Project settings → Service accounts → Generate new private key). The private key stays on one line with its `\n` sequences. |
| `GOOGLE_API_KEY` | Google AI Studio (aistudio.google.com) — a Gemini API key |
| `NEXT_PUBLIC_SITE_URL` | `https://yourdomain.com` |

Save (Ctrl+O, Enter) and exit (Ctrl+X). Then put the real domain in the
Caddyfile:

    nano Caddyfile

Replace `yourdomain.com` with the actual domain. Save and exit.

## 5. Point the domain

In the domain's DNS settings, create an **A record**: name `@`, value =
the server's IP. (Optionally a second A record `www` → same IP, and add
`www.yourdomain.com` to the first line of the Caddyfile.)

## 6. Launch

    docker compose up -d --build

The first build takes 10–15 minutes. Check that all four containers are
running:

    docker compose ps

Expected: `caddy`, `web`, `ai-service`, `chroma` — all "running".

## 7. Authorize the domain in Firebase

Firebase Console → Authentication → Settings → Authorized domains →
**Add domain** → `yourdomain.com`. Sign-in fails without this step.

## 8. Verify

Open `https://yourdomain.com` (the SSL certificate is fetched
automatically on first visit once DNS points at the server). Test:
sign-up, a PDF tool (e.g. Merge), an AI tool (e.g. Summarize), and
Chat with PDF.

---

## Updating the site later

    cd PDF_AI
    git pull
    docker compose up -d --build

## Troubleshooting

- **Browser shows an SSL/connection error:** DNS hasn't propagated yet —
  wait up to a few hours and retry. Confirm the A record points at the
  server IP.
- **Sign-in bounces back to the login page:** the domain isn't in
  Firebase's Authorized domains (step 7), or `FIREBASE_PRIVATE_KEY` in
  `.env` was mangled — re-copy it from the JSON, then
  `docker compose up -d --build`.
- **AI tools fail but the rest works:** check `GOOGLE_API_KEY`, then read
  the service logs: `docker compose logs ai-service --tail 50`.
- **See what any container is doing:**
  `docker compose logs web --tail 50` (or `ai-service`, `chroma`,
  `caddy`).
  