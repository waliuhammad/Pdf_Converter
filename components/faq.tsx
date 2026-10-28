"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FAQItem {
    category: string;
    question: string;
    answer: string;
}

const faqs: FAQItem[] = [
    {
        category: "General",
        question: "What is PDF AI?",
        answer:
            "PDF AI is an all-in-one platform for converting, editing and analysing PDF documents.",
    },
    {
        category: "AI",
        question: "How does AI PDF Summary work?",
        answer:
            "The text of your PDF is sent to Google's Gemini model, which writes a summary of its main points. It works on the document's text, so a scanned PDF needs OCR first. Treat the summary as a starting point and check anything important against the original.",
    },
    {
        category: "Security",
        question: "Are my files secure?",
        answer:
            "Files travel to our servers over an encrypted HTTPS connection and are used only to produce your result — PDFAI does not store them afterwards. Image to PDF runs entirely in your browser, so those images never leave your device. AI features send the document's text to Google's Gemini API. The Security page has the details.",
    },
    {
        category: "Pricing",
        question: "Can I use PDF AI for free?",
        answer:
            "Yes. Create a free account and you can use the tools within a daily allowance. Pro and Business raise that allowance — the pricing section compares the plans.",
    },
];

export default function FAQ() {
    const [open, setOpen] = useState<number | null>(0);

    return (
      <section id="faq" className="px-4 sm:px-6 py-10 sm:py-16 bg-[var(--background-secondary)]">
            <div className="mx-auto max-w-3xl">
                <div className="text-center mb-6 sm:mb-10">
                    <span className="inline-flex rounded-full bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
                        Frequently Asked Questions
                    </span>

                    <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-fg">
                        Everything you need to know
                    </h2>

                    <p className="mt-2 text-sm text-muted">
                        Can&apos;t find your answer? Contact our support team anytime.
                    </p>
                </div>

                <div className="space-y-3 sm:space-y-3.5">
                    {faqs.map((faq: FAQItem, index: number) => (
                        <div
                            key={faq.question}
                            className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm"
                        >
                            <button
                                onClick={() => setOpen(open === index ? null : index)}
                                className="flex w-full items-center justify-between p-4 sm:p-5 text-left"
                            >
                                <div>
                                    <span className="text-[11px] font-semibold tracking-wide text-primary uppercase">
                                        {faq.category}
                                    </span>

                                    <h3 className="mt-1 text-sm sm:text-base font-semibold text-fg">
                                        {faq.question}
                                    </h3>
                                </div>

                                <div
                                    className={`text-muted shrink-0 ml-4 transition-transform duration-200 ${open === index ? "rotate-180" : ""
                                        }`}
                                >
                                    <ChevronDown size={18} />
                                </div>
                            </button>

                            {/* grid-template-rows 0fr -> 1fr animates to the content's
                                own height without measuring it, which is what
                                AnimatePresence and height:auto were doing in JS. */}
                            <div
                                className={`grid transition-all duration-200 ease-out ${open === index ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                                    }`}
                            >
                                <div className="overflow-hidden">
                                    <div className="border-t border-border px-4 sm:px-5 pb-4 sm:pb-5 pt-3 text-sm leading-relaxed text-muted">
                                        {faq.answer}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
