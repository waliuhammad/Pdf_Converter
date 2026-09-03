# PDFAI — Handover Notes

## What this application is
A full web application in three services (website, AI service, vector
database). It runs on a VPS via Docker — see DEPLOY.md for the complete
publishing steps. It cannot run on shared web hosting.

## Accounts and ownership
| Piece | Account | Status |
|---|---|---|
| Source code | GitHub: waliuhammad/PDF_AI | Client has collaborator access |
| Firebase (auth, database, Remote Config) | Client's project "PDF Editor" | Fully migrated — client owns it |
| Gemini API key (AI features) | Currently the developer's key | Client should create their own at aistudio.google.com and use it in `.env` |
| Domain + VPS | Client's Hostinger account | Client purchases/owns |
| Payments | Not yet built | Awaiting client's Stripe details |

## Configuration
All settings live in a `.env` file on the server — template:
`.env.production.example`, with a table in DEPLOY.md explaining where
each value comes from. The Firebase values come from the client's own
project; no developer accounts are involved in running the product.

## Operating the site
- Deploy / update: DEPLOY.md (bottom section covers updates)
- Change plan limits, maintenance banner, AI kill-switch: Firebase
  Console → Remote Config (Server template) → edit → Publish
- View users and data: Firebase Console → Authentication / Firestore

## Not included (future work)
- Payment processing (needs client's Stripe account)
- Storing uploaded PDF files for re-download (needs Firebase Blaze plan)