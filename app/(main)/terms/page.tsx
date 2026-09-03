
import { ContentPage, Section } from "@/components/marketing/content-page";

/**
 * Terms of Service for PDFAI.
 *
 * Keep these terms consistent with the features, billing flow,
 * privacy practices, and third-party services actually used by PDFAI.
 */

const clauses = [
    {
        heading: "1. Agreement & Eligibility",
        items: [
            [
                "1.1",
                "By accessing or using PDFAI, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these Terms, you must not access or use the service.",
            ],
            [
                "1.2",
                "You must be at least 13 years old, or the minimum age required to use the service under the laws applicable to you, whichever is higher. If you are under the age of majority in your jurisdiction, you may use paid services only with the involvement or consent of a parent or legal guardian where required by applicable law.",
            ],
            [
                "1.3",
                "You are responsible for maintaining the confidentiality of your account credentials and for activity that occurs under your account. You must notify us promptly if you believe your account has been accessed or used without your authorization.",
            ],
            [
                "1.4",
                "You agree to provide accurate information when creating or using an account and to keep your account information reasonably up to date.",
            ],
        ],
    },
    {
        heading: "2. The Service",
        items: [
            [
                "2.1",
                "PDFAI provides online tools for working with PDF documents and related content, including document conversion, merging, splitting, compression, signing, OCR, protection, unlocking, watermarking, and other document-processing features. PDFAI may also provide AI-assisted features such as summarization, translation and grammar checking.",
            ],
            [
                "2.2",
                "Some features use third-party artificial-intelligence or machine-learning services. AI-generated output is produced automatically and may be incomplete, inaccurate, outdated, misleading, or unsuitable for a particular purpose.",
            ],
            [
                "2.3",
                "You are responsible for reviewing and independently verifying AI-generated or automatically processed output before relying on it. PDFAI does not provide legal, medical, financial, tax, professional, or other regulated advice through its AI features.",
            ],
            [
                "2.4",
                "We do not guarantee that any particular feature, processing method, AI model, or output will always be available, accurate, complete, or suitable for your requirements.",
            ],
            [
                "2.5",
                "We may modify, add, suspend, or remove features of the service from time to time. Where reasonably practicable, we will provide notice of material changes affecting paid services.",
            ],
        ],
    },
    {
        heading: "3. Third-Party Services",
        items: [
            [
                "3.1",
                "PDFAI may rely on third-party providers for services such as payment processing, cloud infrastructure, artificial-intelligence processing, authentication, storage, analytics, or other technical functions.",
            ],
            [
                "3.2",
                "Your use of certain third-party services may also be subject to the terms and policies of those providers. We are not responsible for the independent acts, omissions, availability, or policies of third-party services that we do not control.",
            ],
            [
                "3.3",
                "Third-party services may change, become unavailable, or impose technical or usage limitations. Such events may affect the availability or functionality of corresponding PDFAI features.",
            ],
        ],
    },
    {
        heading: "4. Acceptable Use",
        items: [
            [
                "4.1",
                "You must use PDFAI only for lawful purposes and in compliance with applicable laws and regulations. You may not upload, process, generate, store, or share content that is illegal, infringes third-party rights, contains malicious software, or that you do not have the legal right or necessary permissions to process.",
            ],
            [
                "4.2",
                "You may not use PDFAI to facilitate fraud, identity theft, unlawful surveillance, harassment, exploitation, distribution of malware, or other unlawful activity.",
            ],
            [
                "4.3",
                "You may not attempt to disrupt, damage, overload, or interfere with the service; bypass security controls or usage limits; probe or test systems without authorization; scrape or systematically extract service data; resell the service; or access the service through automated means except where we expressly provide or authorize such access.",
            ],
            [
                "4.4",
                "You may not use the service to circumvent technical, subscription, or account restrictions, including by creating accounts for the purpose of evading usage limits or enforcement actions.",
            ],
            [
                "4.5",
                "We may suspend or terminate accounts that violate these Terms, particularly where a violation is serious, repeated, creates a security or legal risk, or is required by applicable law.",
            ],
        ],
    },
    {
        heading: "5. Your Content & Files",
        items: [
            [
                "5.1",
                "You retain ownership of the documents, files, text, and other content that you upload or submit to PDFAI. We do not claim ownership of your content merely because you use our service to process it.",
            ],
            [
                "5.2",
                "You represent and warrant that you have all rights, permissions, consents, and lawful authority necessary for us to receive, store, process, transmit, and otherwise handle the content you submit to PDFAI for the purposes described in these Terms and our Privacy Policy.",
            ],
            [
                "5.3",
                "You grant PDFAI a limited, non-exclusive licence to host, store, reproduce, transmit, modify where technically necessary, and process your content only as reasonably necessary to provide, maintain, secure, and improve the service you request. This may include processing document content through third-party service providers used to deliver requested features.",
            ],
            [
                "5.4",
                "We do not obtain ownership of your content through this licence. The licence ends when the relevant processing or retention period ends, except where continued processing or retention is necessary to comply with law, resolve disputes, enforce these Terms, maintain security, or satisfy legitimate technical requirements described in our Privacy Policy.",
            ],
            [
                "5.5",
                "Files submitted for one-off processing may be retained only for as long as reasonably necessary to complete the requested operation and related technical processing. Documents that you choose to save to your account may be retained according to our service functionality and Privacy Policy until you delete them, close your account, or they are otherwise removed in accordance with these Terms.",
            ],
            [
                "5.6",
                "You are responsible for maintaining your own backup copies of important documents and files. PDFAI is a document-processing service and is not a guaranteed backup or archival service.",
            ],
        ],
    },
    {
        heading: "6. Plans, Billing, Cancellation & Refunds",
        items: [
            [
                "6.1",
                "PDFAI may offer free and paid subscription plans. Current prices, billing periods, usage limits, and plan features are displayed on the pricing or checkout pages at the time of purchase.",
            ],
            [
                "6.2",
                "Paid subscriptions may be billed monthly or yearly and may renew automatically unless cancelled in accordance with the applicable subscription-management process provided by us or our payment provider.",
            ],
            [
                "6.3",
                "Payments for paid plans are processed by our third-party payment provider, which may act as the merchant of record. Your purchase may also be subject to that provider's applicable terms, billing conditions, and refund procedures. We do not receive or store your full payment-card number.",
            ],
            [
                "6.4",
                "If you cancel a subscription, cancellation generally prevents future renewal while allowing access to paid features to continue through the portion of the billing period that has already been paid for, unless otherwise stated at the time of cancellation or required by applicable law.",
            ],
            [
                "6.5",
                "Except where a refund is required by applicable law or provided under the applicable payment provider's refund policy, payments already made are generally non-refundable. Nothing in these Terms limits any mandatory refund or cancellation rights you may have under applicable consumer-protection law.",
            ],
            [
                "6.6",
                "If we permanently discontinue a paid feature or service for which you have already paid and applicable law or our stated refund policy requires a refund, any refund will be handled in accordance with those requirements.",
            ],
            [
                "6.7",
                "We may change subscription prices or plan features from time to time. Where required by applicable law, we will provide advance notice of material price changes. Unless otherwise stated, a new price will apply from the next applicable renewal period.",
            ],
        ],
    },
    {
        heading: "7. Intellectual Property",
        items: [
            [
                "7.1",
                "The PDFAI service, including its software, user interface, design, branding, logos, documentation, features, and content other than your submitted content, is owned by PDFAI or its licensors and is protected by applicable intellectual-property laws.",
            ],
            [
                "7.2",
                "Subject to these Terms and your compliance with them, we grant you a limited, non-exclusive, non-transferable, revocable right to access and use PDFAI for its intended purposes. No ownership rights in the service are transferred to you.",
            ],
            [
                "7.3",
                "You may not copy, modify, distribute, sell, lease, reverse engineer, decompile, or create derivative works of the service except to the extent that applicable law expressly permits such activity or we give you written permission.",
            ],
        ],
    },
    {
        heading: "8. Copyright & Intellectual Property Complaints",
        items: [
            [
                "8.1",
                "If you believe that content made available through PDFAI infringes your copyright or other intellectual-property rights, you may contact us through our Contact page and provide sufficient information for us to investigate the complaint.",
            ],
            [
                "8.2",
                "Where appropriate and permitted by applicable law, we may restrict access to content, investigate reported violations, or take other reasonable action concerning alleged infringement.",
            ],
            [
                "8.3",
                "We may take appropriate action against accounts that repeatedly or materially infringe the intellectual-property rights of others.",
            ],
        ],
    },
    {
        heading: "9. Service Availability & Security",
        items: [
            [
                "9.1",
                "We aim to keep PDFAI available and secure, but we do not guarantee uninterrupted or error-free operation. Service availability may be affected by maintenance, technical failures, internet connectivity, third-party services, security incidents, or circumstances beyond our reasonable control.",
            ],
            [
                "9.2",
                "We may temporarily restrict or suspend access to some or all features when reasonably necessary for maintenance, security, legal compliance, abuse prevention, or protection of the service and its users.",
            ],
            [
                "9.3",
                "You must take reasonable steps to protect your account credentials and devices used to access PDFAI. You should not upload information to the service unless you are comfortable using an online processing service subject to these Terms and our Privacy Policy.",
            ],
        ],
    },
    {
        heading: "10. Disclaimers",
        items: [
            [
                "10.1",
                'To the fullest extent permitted by applicable law, PDFAI is provided "as is" and "as available". We disclaim warranties and representations, whether express, implied, or statutory, except where such warranties cannot lawfully be excluded.',
            ],
            [
                "10.2",
                "To the fullest extent permitted by law, we do not warrant that the service will be uninterrupted, secure, error-free, completely accurate, or available at all times, or that processed documents or AI-generated output will be accurate, complete, or suitable for a particular purpose.",
            ],
            [
                "10.3",
                "You are responsible for determining whether processed documents, AI-generated content, translations, summaries, OCR results, or other outputs are appropriate for your intended use.",
            ],
            [
                "10.4",
                "Nothing in these Terms excludes or limits any warranty, right, or remedy that cannot legally be excluded or limited under applicable law.",
            ],
        ],
    },
    {
        heading: "11. Limitation of Liability",
        items: [
            [
                "11.1",
                "To the fullest extent permitted by applicable law, PDFAI and its owners, affiliates, licensors, service providers, officers, employees, and agents will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for loss of profits, revenue, business opportunities, goodwill, or data arising from or related to your use of the service.",
            ],
            [
                "11.2",
                "To the fullest extent permitted by applicable law, our total aggregate liability for claims arising out of or relating to PDFAI will not exceed the amount you paid to us for the service during the twelve months immediately preceding the event giving rise to the claim.",
            ],
            [
                "11.3",
                "If you have not paid for the service, any limitation of liability will apply to the maximum extent permitted by applicable law and will not exclude liability that cannot lawfully be excluded or limited.",
            ],
            [
                "11.4",
                "Nothing in these Terms excludes or limits liability for matters that cannot legally be excluded or limited under applicable law, including liability that applicable law requires us to retain.",
            ],
        ],
    },
    {
        heading: "12. Indemnification",
        items: [
            [
                "12.1",
                "To the extent permitted by applicable law, you agree to defend, indemnify, and hold harmless PDFAI and its owners, affiliates, officers, employees, and service providers from claims, losses, liabilities, damages, and reasonable costs arising from your unlawful use of the service, your violation of these Terms, or your infringement of another person's rights through content you submit to the service.",
            ],
        ],
    },
    {
        heading: "13. Suspension & Termination",
        items: [
            [
                "13.1",
                "You may stop using PDFAI and request deletion of your account at any time, subject to any applicable billing, legal, or retention requirements.",
            ],
            [
                "13.2",
                "We may suspend or terminate your access to PDFAI if you materially breach these Terms, create a security or legal risk, engage in abusive or fraudulent activity, fail to make required payments, or if suspension or termination is required by law.",
            ],
            [
                "13.3",
                "We may also suspend or discontinue all or part of the service if reasonably necessary for security, maintenance, legal compliance, or business reasons.",
            ],
            [
                "13.4",
                "After termination, your right to use the service ends. Subject to our Privacy Policy and applicable legal or operational retention requirements, stored content associated with your account may be deleted after a reasonable period.",
            ],
            [
                "13.5",
                "Provisions that by their nature should survive termination, including provisions concerning intellectual property, disclaimers, limitations of liability, indemnification, and dispute-related matters, will survive termination.",
            ],
        ],
    },
    {
        heading: "14. Changes to These Terms",
        items: [
            [
                "14.1",
                "We may update these Terms from time to time. The \"Last updated\" date identifies the version currently in effect.",
            ],
            [
                "14.2",
                "For material changes, we will provide reasonable notice through the service, by email, or by another appropriate method where required by applicable law.",
            ],
            [
                "14.3",
                "If you continue to use PDFAI after updated Terms become effective, your continued use will constitute acceptance of the updated Terms to the extent permitted by applicable law. If you do not agree to a material change, you should stop using the service and, where applicable, cancel your subscription.",
            ],
        ],
    },
    {
        heading: "15. Governing Law & Disputes",
        items: [
            [
                "15.1",
                "These Terms are governed by the laws of Pakistan, except to the extent that mandatory consumer-protection or other applicable laws provide otherwise.",
            ],
            [
                "15.2",
                "Any dispute arising from or relating to these Terms or the service will be subject to the courts having jurisdiction under applicable law. Nothing in these Terms is intended to deprive a consumer of mandatory rights or protections available under the laws that apply to that consumer.",
            ],
        ],
    },
    {
        heading: "16. Contact",
        items: [
            [
                "16.1",
                "Questions, complaints, or requests concerning these Terms can be submitted to us through the PDFAI Contact page.",
            ],
        ],
    },
];

export default function TermsPage() {
    return (
        <div className="flex min-h-screen flex-col bg-white text-slate-800 dark:bg-[#13131d] dark:text-purple-100">
            <main className="flex-1">
                <ContentPage title="Terms of Service">
                    <p className="text-sm text-slate-500 dark:text-purple-300/60">
                        Last updated: August 9, 2026
                    </p>

                    {clauses.map((clause) => (
                        <Section key={clause.heading} heading={clause.heading}>
                            <div className="space-y-4 text-sm leading-relaxed text-slate-700 dark:text-purple-200">
                                {clause.items.map(([number, text]) => (
                                    <p key={number}>
                                        <strong className="mr-2 text-slate-900 dark:text-white">
                                            {number}
                                        </strong>
                                        {text}
                                    </p>
                                ))}
                            </div>
                        </Section>
                    ))}
                </ContentPage>
            </main>
        </div>
    );
};