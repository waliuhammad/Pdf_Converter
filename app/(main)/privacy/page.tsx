
import type { Metadata } from "next";
import { ContentPage, Section } from "@/components/marketing/content-page";

export const metadata: Metadata = {
    title: "Privacy Policy",
    description:
        "Learn how PDFAI collects, uses, protects, and processes your personal information and documents.",
};

export default function PrivacyPage() {
    return (
        <ContentPage title="Privacy Policy">
            <p className="text-sm text-gray-500 dark:text-purple-300/60">
                Last updated: August 9, 2026
            </p>

            {/* Privacy Commitment */}
            <div className="mb-8 mt-4 rounded-lg border border-purple-200 bg-purple-50/50 p-6 dark:border-purple-900/40 dark:bg-purple-950/20">
                <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-purple-100">
                    Our Privacy Commitment
                </h3>
                <p className="text-sm leading-relaxed text-gray-700 dark:text-purple-200">
                    At PDFAI, we design our service with privacy and responsible
                    data handling in mind. We do not sell your personal
                    information or use the contents of your documents for
                    advertising. We also do not use your private document
                    contents to train our own AI models.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-gray-700 dark:text-purple-200">
                    You retain ownership of the documents and other content you
                    submit to PDFAI. We process that content only as reasonably
                    necessary to provide the features you request, maintain and
                    secure the service, comply with applicable law, and perform
                    the technical operations described in this Privacy Policy.
                </p>
            </div>

            {/* 1. What We Collect */}
            <Section heading="What We Collect">
                <p className="mb-4 text-gray-800 dark:text-purple-100">
                    We collect information that is reasonably necessary to
                    provide the service, manage accounts and subscriptions,
                    maintain security, and operate PDFAI.
                </p>

                <ul className="list-disc space-y-2 pl-6 text-gray-800 dark:text-purple-100">
                    <li>
                        <strong>Account information:</strong> your name, email
                        address, and optional phone number when you provide
                        them. Authentication may be provided through Google
                        Firebase Authentication.
                    </li>

                    <li>
                        <strong>Documents:</strong> files you upload for processing
                        and documents that you choose to save to your account.
                    </li>

                    <li>
                        <strong>Billing information:</strong> information
                        relating to your plan, subscription status,
                        transactions, and payment history. Payment-card
                        information is handled by our payment provider and is
                        not stored by PDFAI as a full card number.
                    </li>

                    <li>
                        <strong>Technical information:</strong> information
                        such as IP address, browser type, device information,
                        application logs, and automated error reports. We use
                        this information for security, abuse prevention,
                        troubleshooting, reliability, and service operation.
                    </li>
                </ul>
            </Section>

            {/* 2. How We Use Information */}
            <Section heading="How We Use Your Information">
                <p className="text-gray-800 dark:text-purple-100">
                    We use personal information for purposes such as creating
                    and managing your account, providing document-processing
                    and AI features, processing subscriptions and payments,
                    responding to support requests, maintaining security,
                    preventing abuse and fraud, diagnosing technical
                    problems, complying with legal obligations, and
                    maintaining and improving the reliability of the service.
                </p>

                <p className="mt-4 text-gray-800 dark:text-purple-100">
                    We do not use private document contents for targeted
                    advertising.
                </p>
            </Section>

            {/* 3. How Files Are Processed */}
            <Section heading="How Your Files Are Processed">
                <ul className="list-disc space-y-3 pl-6 text-gray-800 dark:text-purple-100">
                    <li>
                        <strong>One-off PDF tools:</strong> tools such as
                        conversion, merging, splitting, compression, and
                        similar document-processing operations process the file
                        to produce the output you request. Temporary copies may
                        be created as part of the technical processing and are
                        intended to be deleted or otherwise removed when they
                        are no longer reasonably necessary for the requested
                        operation.
                    </li>

                    <li>
                        <strong>Saved documents:</strong> documents that you
                        choose to save while
                        signed in may be stored in our application
                        infrastructure and associated with your account until
                        you delete them, close your account, or they are
                        otherwise removed in accordance with this Privacy
                        Policy and applicable law.
                    </li>

                    <li>
                        <strong>Your responsibility:</strong> you should only
                        upload information that you have the right and
                        authority to submit for processing.
                    </li>
                </ul>
            </Section>

            {/* 4. AI Features */}
            <Section heading="AI Features & Third-Party Processing">
                <p className="mb-4 text-gray-800 dark:text-purple-100">
                    Some PDFAI features, including summarisation, translation,
                    grammar checking and OCR, may use
                    third-party artificial-intelligence services. Our current
                    AI provider includes Google&apos;s Gemini API.
                </p>

                <ul className="list-disc space-y-3 pl-6 text-gray-800 dark:text-purple-100">
                    <li>
                        When you actively use an AI feature, relevant document
                        content or other information necessary to generate the
                        requested result may be transmitted to the applicable
                        AI provider.
                    </li>

                    <li>
                        We configure our use of paid Gemini API services in
                        accordance with the applicable Google terms. Google
                        states that, for paid Gemini API services, prompts,
                        files, and responses are not used to improve Google&apos;s
                        products.
                    </li>

                    <li>
                        Google may nevertheless retain prompts and responses
                        for limited periods for purposes such as abuse
                        monitoring and required legal or regulatory
                        disclosures. You should review Google&apos;s current
                        terms and privacy documentation for additional
                        information.
                    </li>

                    <li>
                        Files processed using standard PDF tools are not
                        intentionally sent to an AI provider unless an
                        AI-powered feature is required for the particular
                        operation.
                    </li>

                    <li>
                        The processing practices of third-party providers are
                        also governed by their own applicable terms, privacy
                        policies, and data-processing arrangements.
                    </li>
                </ul>
            </Section>

            {/* 5. Service Providers */}
            <Section heading="Who We Share Data With">
                <p className="mb-4 text-gray-800 dark:text-purple-100">
                    We do not sell your personal information. We may share
                    information with service providers that process
                    information on our behalf or provide infrastructure
                    necessary to operate PDFAI. We seek to limit the
                    information shared to what is reasonably necessary for the
                    relevant service.
                </p>

                <ul className="list-disc space-y-3 pl-6 text-gray-800 dark:text-purple-100">
                    <li>
                        <strong>Google Firebase:</strong> used for
                        authentication and application data storage, including
                        saved documents where applicable.
                    </li>

                    <li>
                        <strong>Google Gemini API:</strong> used to provide
                        selected AI-powered features when you actively request
                        them.
                    </li>

                    <li>
                        <strong>Payment provider:</strong> used to process
                        subscriptions, payments, refunds, and related billing
                        operations. The payment provider may act as the
                        merchant of record and handles payment-card information
                        under its own applicable terms and privacy policy.
                    </li>

                    <li>
                        <strong>Hosting and infrastructure providers:</strong>{" "}
                        used to host, operate, secure, and maintain the
                        application and its supporting services.
                    </li>
                </ul>

                <p className="mt-4 text-gray-800 dark:text-purple-100">
                    We may also disclose information where required by law,
                    legal process, or a valid governmental request, or where
                    reasonably necessary to protect the rights, safety,
                    security, property, or integrity of PDFAI, our users, or
                    others.
                </p>
            </Section>

            {/* 6. International Processing */}
            <Section heading="International Data Processing">
                <p className="text-gray-800 dark:text-purple-100">
                    PDFAI and its service providers may process information in
                    countries other than the country where you live. Where
                    applicable privacy laws require safeguards for
                    international transfers, we will use appropriate
                    mechanisms required by those laws.
                </p>
            </Section>

            {/* 7. Data Retention */}
            <Section heading="Data Retention">
                <p className="mb-4 text-gray-800 dark:text-purple-100">
                    We retain personal information only for as long as
                    reasonably necessary for the purposes described in this
                    Privacy Policy, including providing the service,
                    maintaining security, resolving disputes, enforcing
                    agreements, and meeting legal or regulatory obligations.
                </p>

                <ul className="list-disc space-y-3 pl-6 text-gray-800 dark:text-purple-100">
                    <li>
                        <strong>One-off files:</strong> intended to be retained
                        only for the period reasonably necessary to complete
                        the requested processing and related technical
                        operations.
                    </li>

                    <li>
                        <strong>Saved documents:</strong> remain
                        associated with your account until you delete them,
                        close your account, or they are otherwise removed
                        according to our retention practices.
                    </li>

                    <li>
                        <strong>Account and transaction information:</strong>{" "}
                        may need to be retained for longer periods where
                        required for legal, accounting, tax, fraud-prevention,
                        or dispute-resolution purposes.
                    </li>

                    <li>
                        <strong>Technical logs:</strong> may be retained for a
                        limited period appropriate to the relevant operational
                        or security purpose.
                    </li>
                </ul>
            </Section>

            {/* 8. Security */}
            <Section heading="Security">
                <p className="mb-4 text-gray-800 dark:text-purple-100">
                    We use reasonable technical and organisational measures
                    designed to protect personal information against
                    unauthorised access, alteration, disclosure, destruction,
                    and other inappropriate processing.
                </p>

                <p className="text-gray-800 dark:text-purple-100">
                    No online service can guarantee absolute security. You are
                    responsible for protecting your account credentials and
                    for using reasonable care when deciding what information
                    to upload.
                </p>
            </Section>

            {/* 9. Your Rights */}
            <Section heading="Your Rights & Data Control">
                <p className="mb-4 text-gray-800 dark:text-purple-100">
                    Depending on where you live and which privacy laws apply to
                    you, you may have rights concerning your personal
                    information. These may include the right to access your
                    information, request correction, request deletion,
                    restrict or object to certain processing, and request data
                    portability.
                </p>

                <ul className="list-disc space-y-3 pl-6 text-gray-800 dark:text-purple-100">
                    <li>
                        <strong>Access:</strong> you may request information
                        about the personal data we hold about you.
                    </li>

                    <li>
                        <strong>Correction:</strong> you may request correction
                        of inaccurate or incomplete personal information.
                    </li>

                    <li>
                        <strong>Deletion:</strong> you can delete documents
                        through available account controls where those
                        controls are provided. You may also contact us to
                        request deletion of applicable personal information.
                    </li>

                    <li>
                        <strong>Objection or restriction:</strong> where
                        applicable law provides these rights, you may object to
                        or request restriction of certain processing.
                    </li>

                    <li>
                        <strong>Data portability:</strong> where applicable,
                        you may request a copy of certain personal information
                        in a commonly used format.
                    </li>
                </ul>

                <p className="mt-4 text-gray-800 dark:text-purple-100">
                    We may need to verify your identity before fulfilling
                    certain requests. We may also retain information where
                    necessary to comply with applicable law, prevent fraud or
                    abuse, resolve disputes, or protect our legal rights.
                </p>
            </Section>

            {/* 10. Children's Privacy */}
            <Section heading="Children's Privacy">
                <p className="text-gray-800 dark:text-purple-100">
                    PDFAI is not intended to knowingly collect personal
                    information from children below the minimum age permitted
                    under applicable law. If you believe a child has provided
                    personal information to us in circumstances where
                    collection is not permitted, please contact us so that we
                    can investigate and take appropriate action.
                </p>
            </Section>

            {/* 11. Cookies */}
            <Section heading="Cookies & Similar Technologies">
                <p className="mb-4 text-gray-800 dark:text-purple-100">
                    PDFAI may use cookies, local storage, or similar
                    technologies that are necessary to authenticate users,
                    maintain sessions, remember settings, provide security,
                    and operate the service.
                </p>

                <p className="text-gray-800 dark:text-purple-100">
                    Where additional cookies or similar technologies are used
                    for analytics, advertising, or other purposes that require
                    consent under applicable law, we will provide appropriate
                    controls and notices where required.
                </p>
            </Section>

            {/* 12. Changes */}
            <Section heading="Changes to This Privacy Policy">
                <p className="mb-4 text-gray-800 dark:text-purple-100">
                    We may update this Privacy Policy from time to time to
                    reflect changes in our service, technology, legal
                    requirements, or data practices. The &quot;Last
                    updated&quot; date at the top of this page identifies the
                    current version.
                </p>

                <p className="text-gray-800 dark:text-purple-100">
                    Where required by applicable law, we will provide
                    additional notice of material changes before they take
                    effect.
                </p>
            </Section>

            {/* 13. Contact */}
            <Section heading="Contact Us">
                <p className="mb-4 text-gray-800 dark:text-purple-100">
                    If you have questions about privacy, document processing,
                    data handling, or wish to submit a privacy request, please
                    contact us through the PDFAI Contact page or the privacy
                    contact address provided by PDFAI.
                </p>

                <div className="rounded-md border border-gray-200 p-4 text-gray-800 dark:border-purple-900/40 dark:bg-purple-950/10 dark:text-purple-100">
                    <p className="font-semibold">PDFAI — Privacy</p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-purple-300">
                        Email: support@pdfai.com
                    </p>
                </div>
            </Section>
        </ContentPage>
    );
};
