import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, Section } from "@/components/marketing/content-page";
import { getContactEmail } from "@/lib/contact";

export const metadata: Metadata = {
    title: "Privacy Policy",
    description:
        "How PDFAI handles the files you process, the account information it keeps, the cookies it uses and the choices you have.",
    alternates: { canonical: "/privacy" },
};

/**
 * Every statement here has to stay true of the running code. When a feature
 * starts storing, sharing or tracking something new, update this page in the
 * same change and move the "Last updated" date.
 */

const link = "text-[var(--primary)] hover:underline";

function External({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={link}>
            {children}
        </a>
    );
}

export default function PrivacyPage() {
    const email = getContactEmail();

    return (
        <ContentPage
            title="Privacy Policy"
            intro="This page explains what happens to the files you process with PDFAI, what information we keep about your account, which outside services are involved, and the choices you have."
        >
            <p className="text-sm text-muted">Last updated: October 28, 2026</p>

            <div className="rounded-lg border border-primary/30 bg-primary/5 p-6">
                <h2 className="mb-2 text-lg font-semibold text-fg">The short version</h2>
                <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-fg/80">
                    <li>We do not keep the files you process. They are used to produce your result and are not saved.</li>
                    <li>Image to PDF works entirely in your browser, so those images never reach our servers.</li>
                    <li>AI features send the text needed for your request to Google&apos;s Gemini API.</li>
                    <li>We do not sell your personal information.</li>
                </ul>
            </div>

            <Section heading="Files you process">
                <p>
                    Using the tools requires a free account, so that daily limits can be applied.
                    What happens to a file depends on the tool:
                </p>
                <ul className="list-disc space-y-2 pl-6">
                    <li>
                        <strong className="text-fg">Image to PDF</strong> runs in your browser:
                        the images are turned into a PDF on your own device and never uploaded.
                    </li>
                    <li>
                        <strong className="text-fg">All other tools</strong> — such as merging,
                        compression, conversions between PDF and Office formats, and protecting or
                        unlocking a PDF — receive the file over an encrypted (HTTPS) connection,
                        process it to create your result, and send the result back. Any temporary
                        working copy is deleted when the job finishes; we do not save the uploaded
                        file or the result.
                    </li>
                    <li>
                        <strong className="text-fg">AI features</strong>{" "}— summary, OCR,
                        translation and grammar checking — send the document&apos;s text to
                        Google&apos;s Gemini API to generate the result. For OCR the PDF itself is
                        uploaded to Gemini, and we ask Google to delete it as soon as the text is
                        returned (Google otherwise deletes such files after 48 hours). Choosing a
                        translation language in PDF to Word sends the document&apos;s text to
                        Gemini in the same way.
                    </li>
                </ul>
                <p>
                    Only upload documents you have the right to process.
                </p>
            </Section>

            <Section heading="Information we keep">
                <ul className="list-disc space-y-2 pl-6">
                    <li>
                        <strong className="text-fg">Account details:</strong> when you
                        register, your name, email address and, if you give it, your phone
                        number. Sign-in is handled by Google Firebase Authentication; if you sign
                        in with Google we receive your name, email address and profile picture
                        from Google. Passwords are handled by Firebase and never stored by us.
                    </li>
                    <li>
                        <strong className="text-fg">Plan and usage:</strong> your current plan
                        and a count of how many times you have used metered features (such as AI
                        summaries) in the current period, so plan limits can be applied.
                    </li>
                    <li>
                        <strong className="text-fg">Document list:</strong> for signed-in
                        users, your dashboard can hold a list of documents — the file name, size
                        and date only, not the file itself.
                    </li>
                    <li>
                        <strong className="text-fg">Payments:</strong> when you buy a plan we
                        record the plan, amount, currency, payment reference, status and the
                        email on your account. Payment is made through Payoneer; we never receive
                        your card or bank details.
                    </li>
                    <li>
                        <strong className="text-fg">Messages to us:</strong> what you send
                        through the contact form — your name, email address, subject and message.
                    </li>
                    <li>
                        <strong className="text-fg">Technical data:</strong> like most
                        websites, our hosting provider records requests in server logs, including
                        IP address, browser type and the page requested. We use these to keep the
                        service running, investigate errors and prevent abuse.
                    </li>
                </ul>
            </Section>

            <Section heading="How we use it">
                <p>
                    To provide the tools and your account, apply plan limits, process payments,
                    answer your messages, keep the service secure and fix problems. We do not use
                    the contents of your documents for advertising, and we do not use them to
                    train AI models.
                </p>
            </Section>

            <Section heading="Services we rely on">
                <p>
                    We do not sell your personal information. These providers process data on our
                    behalf, each under its own terms and privacy policy:
                </p>
                <ul className="list-disc space-y-2 pl-6">
                    <li>
                        <strong className="text-fg">Google Firebase</strong> — sign-in and the
                        database holding account, usage, payment and contact-form records.{" "}
                        <External href="https://firebase.google.com/support/privacy">Firebase privacy</External>
                    </li>
                    <li>
                        <strong className="text-fg">Google Gemini API</strong> — the AI
                        features, only when you use one.{" "}
                        <External href="https://ai.google.dev/gemini-api/terms">Gemini API terms</External>
                    </li>
                    <li>
                        <strong className="text-fg">Vercel</strong> — hosting for the website
                        and the servers that process files.{" "}
                        <External href="https://vercel.com/legal/privacy-policy">Vercel privacy policy</External>
                    </li>
                    <li>
                        <strong className="text-fg">Payoneer</strong> — payment for paid
                        plans.{" "}
                        <External href="https://www.payoneer.com/legal/privacy-policy/">Payoneer privacy policy</External>
                    </li>
                </ul>
                <p>
                    We may also disclose information where the law requires it, or where it is
                    reasonably necessary to protect the safety and security of PDFAI, its users or
                    others. These providers, and so your information, may be located in countries
                    other than your own.
                </p>
            </Section>

            <section id="cookies" className="scroll-mt-24">
                <h2 className="text-xl font-semibold text-fg mb-3">Cookies and local storage</h2>
                <div className="text-muted leading-7 space-y-3">
                    <p>PDFAI itself uses only what the site needs to work:</p>
                    <ul className="list-disc space-y-2 pl-6">
                        <li>
                            <strong className="text-fg">Session cookie</strong>{" "}
                            (<code>pdfai_session</code>) — keeps you signed in. It is set only when
                            you sign in and cannot be read by scripts on the page.
                        </li>
                        <li>
                            <strong className="text-fg">Firebase Authentication</strong>{" "}stores
                            sign-in state in your browser&apos;s storage while you are signed in.
                        </li>
                        <li>
                            <strong className="text-fg">Preferences</strong>{" "}— your light or dark
                            theme and language are remembered in your browser&apos;s local storage.
                        </li>
                    </ul>
                    <p>
                        We do not use analytics or tracking cookies. If advertising is shown, the
                        advertising cookies described below apply as well.
                    </p>
                </div>
            </section>

            <Section heading="Advertising">
                <p>
                    PDFAI may show ads served by Google AdSense to help fund the free tools. When
                    ads are shown:
                </p>
                <ul className="list-disc space-y-2 pl-6">
                    <li>
                        Third-party vendors, including Google, use cookies to serve ads based on
                        your prior visits to this website or other websites.
                    </li>
                    <li>
                        Google&apos;s use of advertising cookies enables it and its partners to
                        serve ads to you based on your visits to this site and/or other sites on
                        the internet.{" "}
                        <External href="https://policies.google.com/technologies/partner-sites">
                            How Google uses information from sites that use its services
                        </External>
                        .
                    </li>
                    <li>
                        You can opt out of personalised advertising in{" "}
                        <External href="https://adssettings.google.com">Google Ads Settings</External>
                        , and opt out of some third-party vendors&apos; use of cookies for
                        personalised advertising at{" "}
                        <External href="https://www.aboutads.info/choices/">www.aboutads.info</External>
                        .
                    </li>
                    <li>
                        Where the law requires it — for example for visitors in the European
                        Economic Area, the UK and Switzerland — you will be asked for consent
                        before personalised ads or advertising cookies are used, and you can
                        change that choice later.
                    </li>
                </ul>
                <p>
                    Ads are never based on the contents of the documents you process.
                </p>
            </Section>

            <Section heading="How long we keep information">
                <ul className="list-disc space-y-2 pl-6">
                    <li>Processed files: not kept once your result has been returned.</li>
                    <li>Account, plan, usage and document-list records: while your account exists.</li>
                    <li>
                        Payment records: as long as needed for accounting, tax and dispute
                        purposes, which can be after an account is closed.
                    </li>
                    <li>Contact messages: as long as needed to deal with what you asked.</li>
                    <li>Server logs: kept by our hosting provider for a limited period under its own policy.</li>
                </ul>
            </Section>

            <Section heading="Your choices and rights">
                <p>
                    Depending on where you live, you may have the right to access, correct or
                    delete your personal information, to object to or restrict some processing,
                    and to receive a copy of your data. To make a request,{" "}
                    <Link href="/contact" className={link}>contact us</Link> from the email
                    address on your account so we can confirm it is you. You can also change your
                    name yourself in{" "}
                    <Link href="/settings" className={link}>Settings</Link>.
                </p>
                <p>
                    If you believe your information has been handled unlawfully, you may also have
                    the right to complain to your local data-protection authority.
                </p>
            </Section>

            <Section heading="Security">
                <p>
                    Connections to PDFAI use HTTPS, and stored data is protected by Firebase&apos;s
                    security rules so each account can reach only its own records. No online
                    service can be completely secure; the{" "}
                    <Link href="/security" className={link}>Security page</Link> describes our
                    measures in more detail.
                </p>
            </Section>

            <Section heading="Children">
                <p>
                    PDFAI is not directed at children, and accounts are for people aged 13 or over
                    (or the minimum age where you live, if higher). If you believe a child has
                    given us personal information, please contact us and we will delete it.
                </p>
            </Section>

            <Section heading="Changes to this policy">
                <p>
                    When our practices change we will update this page and the date at the top.
                    For significant changes we will also tell signed-in users on the site or by
                    email.
                </p>
            </Section>

            <Section heading="Contact">
                <p>
                    Questions about privacy, or a request about your data: use the{" "}
                    <Link href="/contact" className={link}>contact form</Link>
                    {email && (
                        <>
                            {" "}or email{" "}
                            <a href={`mailto:${email}`} className={link}>{email}</a>
                        </>
                    )}
                    .
                </p>
            </Section>
        </ContentPage>
    );
}
