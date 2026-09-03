"use client";

import {
  Cloud,
  ShieldCheck,
  FolderLock,
  Lock,
  Key,
  Trash2,
  CheckCircle2
} from "lucide-react";
import { ContentPage, Section } from "@/components/marketing/content-page";

/* -------------------------------------------------------------------------- */
/* MAIN SECURITY PAGE                                                         */
/*                                                                            */
/* Every claim on this page must stay true of the running product. It is     */
/* better to promise less here than to promise controls we don't have.       */
/* -------------------------------------------------------------------------- */

const productSecurityFeatures = [
  {
    icon: Cloud,
    title: "Trusted infrastructure",
    description: "PDFAI runs on established cloud platforms. Accounts and saved data live in Google Firebase, which operates on Google Cloud's certified, globally audited infrastructure.",
  },
  {
    icon: ShieldCheck,
    title: "Encrypted connections",
    description: "Every connection to PDFAI — your browser, our servers, and the AI services we call — travels over HTTPS/TLS, so documents and credentials can't be read in transit.",
  },
  {
    icon: FolderLock,
    title: "Minimal retention",
    description: "Files sent to our one-off tools are processed and then discarded. We keep a document only when you deliberately save it to your account, and you can delete it at any time.",
  },
];

export default function SecurityPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-800 dark:bg-[#13131d] dark:text-purple-100">
      <main className="flex-1">
        <ContentPage title="Security">

          {/* Product Security Feature Overview (Visual Cards) */}
          <div className="my-10">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">Product Security</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-purple-200/80">
                How we protect your account, your documents, and their processing
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {productSecurityFeatures.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className="flex flex-col items-start p-6 rounded-2xl border border-slate-200 bg-white dark:border-purple-900/30 dark:bg-[#181824]"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300 mb-5">
                      <Icon size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                      {item.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-purple-200/70">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 1: Where files are processed */}
          <Section heading="Where files are processed">
            <div className="space-y-4 text-sm leading-relaxed text-slate-700 dark:text-purple-200">
              <p>
                Different tools process your documents in different places, and we always use the
                most private option the task allows:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-slate-600 dark:text-purple-200/80">
                <li>
                  <strong className="text-slate-900 dark:text-white">In your browser:</strong> lightweight
                  operations run directly on your device where possible, so the document never
                  leaves your machine at all.
                </li>
                <li>
                  <strong className="text-slate-900 dark:text-white">On our servers:</strong> heavier
                  operations — format conversion, OCR, and AI features such as summaries and
                  OCR — are processed on our servers over an encrypted connection.
                  Working copies exist only for the duration of the operation.
                </li>
                <li>
                  <strong className="text-slate-900 dark:text-white">AI processing:</strong> when you use an
                  AI feature, the relevant document text is sent to the AI provider (Google&apos;s
                  Gemini API) over TLS, solely to produce the result you requested. Standard PDF
                  tools never involve AI providers.
                </li>
              </ul>
            </div>
          </Section>

          {/* Section 2: Encryption */}
          <Section heading="Encryption">
            <div className="space-y-4 text-sm leading-relaxed text-slate-700 dark:text-purple-200">
              <div className="flex items-start gap-3">
                <Lock className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white">In transit</h4>
                  <p className="mt-1 text-slate-600 dark:text-purple-200/80">
                    All traffic between your browser and PDFAI, and between PDFAI and the services
                    it uses, is encrypted with <strong>HTTPS/TLS</strong>. We never accept
                    unencrypted connections.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-2">
                <Key className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white">At rest</h4>
                  <p className="mt-1 text-slate-600 dark:text-purple-200/80">
                    Account data and saved documents are stored in Google Firebase, where
                    Google encrypts all data at rest by default using <strong>AES-256</strong>.
                    Payment card details are never stored by PDFAI at all — billing is handled
                    entirely by our payment provider.
                  </p>
                </div>
              </div>
            </div>
          </Section>

          {/* Section 3: Account security */}
          <Section heading="Account security">
            <div className="space-y-4 text-sm leading-relaxed text-slate-700 dark:text-purple-200">
              <p>
                Sign-in is handled by <strong>Firebase Authentication</strong>, Google&apos;s
                identity platform used by hundreds of thousands of applications:
              </p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <li className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-white dark:border-purple-900/30 dark:bg-[#181824]">
                  <CheckCircle2 className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                  <span><strong>Google Sign-In:</strong> OAuth-based social login — no password is ever created or stored for these accounts.</span>
                </li>
                <li className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-white dark:border-purple-900/30 dark:bg-[#181824]">
                  <CheckCircle2 className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                  <span><strong>Hashed passwords:</strong> passwords are never stored in plain text — Firebase hashes them with a hardened, salted algorithm before they touch storage.</span>
                </li>
                <li className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-white dark:border-purple-900/30 dark:bg-[#181824]">
                  <CheckCircle2 className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                  <span><strong>Secure resets:</strong> password reset links are time-limited, single-use, and delivered only to the account&apos;s verified email.</span>
                </li>
                <li className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-white dark:border-purple-900/30 dark:bg-[#181824]">
                  <CheckCircle2 className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                  <span><strong>Server-side session checks:</strong> pages and APIs that touch your data verify your identity on the server, not just in the browser.</span>
                </li>
              </ul>
            </div>
          </Section>

          {/* Section 4: Retention and deletion */}
          <Section heading="Retention and deletion">
            <div className="space-y-4 text-sm leading-relaxed text-slate-700 dark:text-purple-200">
              <div className="flex items-start gap-3">
                <Trash2 className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white">Nothing kept without a reason</h4>
                  <p className="mt-1 text-slate-600 dark:text-purple-200/80">
                    Files sent to one-off tools are discarded after processing completes. Content
                    is retained only when you deliberately save a document to your
                    account — and those you can delete yourself, individually or entirely, from
                    your dashboard at any time.
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-purple-300/60 pl-8">
                Found a security issue? Please report it to us via the contact page — we take
                every report seriously and will respond as quickly as we can.
              </p>
            </div>
          </Section>
        </ContentPage>
      </main>
    </div>
  );
}