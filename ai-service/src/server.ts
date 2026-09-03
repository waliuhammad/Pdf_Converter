import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { env } from "./config/env";

// Read through config/env so there is one default rather than two that can
// drift apart — this file used to say 8000 while the app looked for 8001.
//
// Bound to :: rather than the default. Railway's private network is IPv6-only,
// so a service listening on 0.0.0.0 is unreachable at
// <service>.railway.internal — the web app's five AI tools would fail with a
// bare connection error while this service looked perfectly healthy. On Linux
// a :: socket is dual-stack, so IPv4 callers (including local development)
// still work.
app.listen(Number(env.PORT), "::", () => {
  console.log(`🚀 AI Service listening on port ${env.PORT} (IPv6 + IPv4)`);
});