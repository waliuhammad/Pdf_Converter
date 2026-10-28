import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, Section } from "@/components/marketing/content-page";
import { ContactForm } from "@/components/marketing/contact-form";
import { getContactEmail } from "@/lib/contact";

export const metadata: Metadata = {
    title: "Contact",
    description: "Get in touch with the PDFAI team about bugs, account questions, billing or privacy requests.",
    alternates: { canonical: "/contact" },
};

export default function ContactPage() {
    const email = getContactEmail();

    return (
        <ContentPage
            title="Contact us"
            intro="Questions, bug reports or feedback — send them here and we'll get back to you."
        >
            <ContactForm />

            {email && (
                <p className="text-sm text-muted">
                    Prefer email? Write to{" "}
                    <a href={`mailto:${email}`} className="text-[var(--primary)] hover:underline">
                        {email}
                    </a>
                    .
                </p>
            )}

            <Section heading="Reporting a problem with a file">
                <p>
                    Tell us which tool you used, what you expected and what happened instead —
                    for example, &quot;PDF to Word: the table columns came out merged&quot;. The
                    browser you were using and the approximate size and page count of the file
                    help us reproduce it.
                </p>
                <p>
                    Please don&apos;t paste confidential document contents into the message. If a
                    sample file would help, we&apos;ll ask, and you can send one with the sensitive
                    parts removed.
                </p>
            </Section>

            <Section heading="Privacy and account requests">
                <p>
                    To access, correct or delete the personal information tied to your account,
                    send the request from the email address you signed up with so we can match
                    it to your account. Saved documents can also be deleted at any time from
                    your{" "}
                    <Link href="/dashboard" className="text-[var(--primary)] hover:underline">
                        dashboard
                    </Link>
                    . The{" "}
                    <Link href="/privacy" className="text-[var(--primary)] hover:underline">
                        privacy policy
                    </Link>{" "}
                    explains what we hold and why.
                </p>
            </Section>
        </ContentPage>
    );
}
